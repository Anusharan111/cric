import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Loader2, UserPlus, Sparkles, AlertCircle,
  Zap, Wand2, X, Sword, Brain, Shield, Star,
} from "lucide-react";
import { Character } from "../types";
import { API_BASE } from "../config";
import CharacterImage from "./common/CharacterImage";

interface MALPortalProps {
  onPoolUpdated: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Derive stats from the character's bio text */
function deriveStats(about: string = "") {
  const t = about.toLowerCase();
  const base = () => 48 + Math.floor(Math.random() * 28);
  let strength = base(), speed = base(), iq = base(), defense = base(), magic = base();

  if (t.includes("strong") || t.includes("strength") || t.includes("punch"))  strength  += 18;
  if (t.includes("fast") || t.includes("speed") || t.includes("flash"))       speed     += 18;
  if (t.includes("intelligen") || t.includes("genius") || t.includes("smart")) iq       += 18;
  if (t.includes("defense") || t.includes("protect") || t.includes("shield")) defense   += 18;
  if (t.includes("magic") || t.includes("chakra") || t.includes("power") ||
      t.includes("jutsu") || t.includes("curse") || t.includes("alchemy"))    magic     += 18;
  if (t.includes("demon") || t.includes("monster"))                           { strength += 10; magic += 10; }
  if (t.includes("sword") || t.includes("blade") || t.includes("swords"))    { strength += 8;  speed += 8;  }
  if (t.includes("heal"))                                                      { defense  += 10; iq    += 8;  }
  if (t.includes("god") || t.includes("divine") || t.includes("legendary"))  {
    strength += 12; speed += 12; iq += 12; defense += 12; magic += 12;
  }

  return {
    strength: Math.min(100, strength),
    speed:    Math.min(100, speed),
    iq:       Math.min(100, iq),
    defense:  Math.min(100, defense),
    magic:    Math.min(100, magic),
  };
}

/** Map favourites count → rarity */
function favToRarity(fav: number): "Legendary" | "Epic" | "Rare" | "Common" {
  if (fav >= 50_000) return "Legendary";
  if (fav >= 15_000) return "Epic";
  if (fav >=  4_000) return "Rare";
  return "Common";
}

/** Map favourites count → theme colour */
function favToColor(fav: number): string {
  if (fav >= 50_000) return "#facc15"; // gold
  if (fav >= 15_000) return "#a855f7"; // purple
  if (fav >=  4_000) return "#38bdf8"; // blue
  return "#94a3b8";                    // slate
}

const RARITY_GRADIENT: Record<string, string> = {
  Legendary: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/40",
  Epic:      "from-purple-500/20 to-purple-600/5 border-purple-500/40",
  Rare:      "from-sky-500/20    to-sky-600/5    border-sky-500/40",
  Common:    "from-white/5       to-white/0      border-white/10",
};

const RARITY_GLOW: Record<string, string> = {
  Legendary: "0 0 25px rgba(234,179,8,0.35)",
  Epic:      "0 0 25px rgba(168,85,247,0.35)",
  Rare:      "0 0 25px rgba(56,189,248,0.25)",
  Common:    "none",
};

const SUMMON_PHASES = [
  "Syncing with MAL database...",
  "Reaching Gemini neural core...",
  "Drafting battle skills & lore...",
  "Activating Imagen 3 visual engine...",
  "Synthesising portrait...",
  "Calibrating combat parameters...",
  "Materialising character matrix...",
];

// ─── component ───────────────────────────────────────────────────────────────

export default function MyAnimeListPortal({ onPoolUpdated }: MALPortalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "ai">("search");

  // Search state
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError]     = useState("");
  const [imported, setImported] = useState<Record<string, boolean>>({});

  // AI / preview state
  const [aiPrompt, setAiPrompt]   = useState("");
  const [summoning, setSummoning] = useState(false);
  const [phase, setPhase]         = useState("");
  const [preview, setPreview]     = useState<Character | null>(null);
  const [recruiting, setRecruiting] = useState(false);

  /* Phase cycling */
  useEffect(() => {
    if (!summoning) { setPhase(""); return; }
    let i = 0;
    setPhase(SUMMON_PHASES[0]);
    const t = setInterval(() => {
      i = (i + 1) % SUMMON_PHASES.length;
      setPhase(SUMMON_PHASES[i]);
    }, 1700);
    return () => clearInterval(t);
  }, [summoning]);

  // ── Jikan search ────────────────────────────────────────────────────────
  // ── AniList GraphQL search ──────────────────────────────────────────────
  const searchAniList = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const graphQLQuery = `
        query ($search: String) {
          Page (perPage: 16) {
            characters (search: $search) {
              id
              name {
                full
              }
              image {
                large
              }
              description
              favourites
              media (perPage: 1, type: ANIME) {
                nodes {
                  title {
                    english
                    romaji
                    userPreferred
                  }
                }
              }
            }
          }
        }
      `;

      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          query: graphQLQuery,
          variables: { search: query }
        })
      });

      if (!res.ok) throw new Error("AniList API returned " + res.status);
      const json = await res.json();
      const rawChars = json.data?.Page?.characters || [];
      const chars = rawChars.filter((c: any) => c.image?.large);
      
      if (chars.length === 0) setError("No characters found. Try: Gojo, Luffy, Goku, Levi…");
      setResults(chars);
    } catch {
      setError("AniList uplink failed — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Build Character from AniList data ─────────────────────────────────────
  const buildCharacter = (aChar: any, overrideImage?: string): Character => {
    const stats       = deriveStats(aChar.description);
    const overallPower = Object.values(stats).reduce((a: number, b: number) => a + b, 0) as number;
    const rarity      = favToRarity(aChar.favourites ?? 0);
    const themeColor  = favToColor(aChar.favourites ?? 0);
    const animeName   = aChar.media?.nodes?.[0]?.title?.english || aChar.media?.nodes?.[0]?.title?.userPreferred || aChar.media?.nodes?.[0]?.title?.romaji || "Unknown Anime";
    const description = aChar.description
      ? aChar.description.replace(/__|_|~|!|<[^>]*>/g, "").replace(/\r?\n|\r/g, " ").slice(0, 180) + "…"
      : "A legendary fighter summoned from the anime multiverse.";

    const aniImage = aChar.image?.large || "";

    return {
      id:            `anilist-${aChar.id}`,
      name:          aChar.name?.full || "Unknown Fighter",
      anime:         animeName,
      image:         overrideImage ?? aniImage, 
      themeColor,
      stats,
      overallPower,
      rarity,
      description,
      signatureEmoji: rarity === "Legendary" ? "⭐" : rarity === "Epic" ? "💫" : rarity === "Rare" ? "✨" : "⚡",
      skills: ["Signature Strike", "Ultimate Technique"],
    };
  };

  // ── Import: show Gemini preview or direct-add ────────────────────────────
  const handleImport = async (aChar: any) => {
    const id = `anilist-${aChar.id}`;
    if (imported[id]) return;

    setSummoning(true);
    setError("");
    try {
      const animeName   = aChar.media?.nodes?.[0]?.title?.english || aChar.media?.nodes?.[0]?.title?.userPreferred || aChar.media?.nodes?.[0]?.title?.romaji || "Unknown Anime";
      const description = aChar.description?.slice(0, 400) ?? "";

      const genRes = await fetch(`${API_BASE}/api/characters/generate-ai`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          malCharacter: {
            name:  aChar.name?.full || "Unknown",
            anime: animeName,
            description,
            image: aChar.image?.large ?? "",
          },
        }),
      });

      if (genRes.ok) {
        const genData = await genRes.json();
        if (genData.character) {
          const finalImage = genData.character.image || buildCharacter(aChar).image;
          const char = buildCharacter(aChar, finalImage);
          char.name        = genData.character.name        || char.name;
          char.description = genData.character.description || char.description;
          char.quote       = genData.character.quote;
          char.skills      = genData.character.skills      || char.skills;
          char.id          = `anilist-${aChar.id}`;
          setSummoning(false);
          setPreview(char);
          return;
        }
      }
    } catch { /* fall through */ }

    // Fallback: use AniList image directly
    const char = buildCharacter(aChar);
    setSummoning(false);
    setPreview(char);
  };

  // ── Custom AI summon ─────────────────────────────────────────────────────
  const handleAISummon = async () => {
    if (!aiPrompt.trim()) return;
    setSummoning(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/characters/generate-ai`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (res.ok && data.character) {
        setPreview(data.character);
        setAiPrompt("");
      } else {
        setError(data.error ?? "AI summoning failed. Make sure GEMINI_API_KEY is in .env");
      }
    } catch {
      setError("Could not reach Gemini API. Check your .env file.");
    } finally {
      setSummoning(false);
    }
  };

  // ── Add to pool ──────────────────────────────────────────────────────────
  const addToPool = async (char: Character) => {
    const res = await fetch(`${API_BASE}/api/characters/import`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character: char }),
    });
    if (res.ok) {
      setImported(prev => ({ ...prev, [char.id]: true }));
      onPoolUpdated();
    }
  };

  const confirmRecruit = async () => {
    if (!preview) return;
    setRecruiting(true);
    await addToPool(preview);
    setPreview(null);
    setRecruiting(false);
  };

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="nexus-glass rounded-3xl border border-nexus-blue/20 overflow-hidden shadow-2xl relative mb-12">

      {/* Accent line */}
      <div className="h-[2px] bg-gradient-to-r from-nexus-blue/50 via-nexus-cyan to-nexus-purple/50" />

      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-widest flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-nexus-cyan animate-pulse" />
            CHARACTER RECRUITMENT BAY
          </h2>
          <p className="text-[10px] md:text-xs font-mono text-neutral-400 mt-1 uppercase tracking-wider">
            Search MyAnimeList database and import fighters into the card pool
          </p>
        </div>

        <div className="flex bg-neutral-950/60 p-1.5 rounded-2xl border border-white/5 self-start md:self-auto gap-1">
          <button
            onClick={() => { setActiveTab("search"); setError(""); }}
            className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 flex items-center gap-2 bg-gradient-to-r from-nexus-blue to-nexus-cyan text-white shadow-lg"
          >
            <Search className="w-3.5 h-3.5" /> Character
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 md:p-8 min-h-[420px] relative">

        {/* Summoning overlay */}
        <AnimatePresence>
          {summoning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-neutral-950/96 backdrop-blur-md p-8 text-center">
              <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }}  transition={{ duration: 7,  repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-nexus-cyan/40 rounded-full" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-3 border-2 border-double border-nexus-purple/40 rounded-full" />
                <motion.div animate={{ rotate: 180 }}  transition={{ duration: 5,  repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-7 border border-pink-500/25 rounded-full" />
                <Wand2 className="w-12 h-12 text-nexus-cyan drop-shadow-[0_0_15px_rgba(0,229,255,0.8)] animate-pulse" />
              </div>
              <motion.p key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm font-black text-white font-mono uppercase tracking-widest max-w-xs leading-relaxed">
                {phase}
              </motion.p>
              <div className="w-52 h-[3px] bg-neutral-900 rounded-full overflow-hidden mt-6 border border-white/5">
                <motion.div className="h-full bg-gradient-to-r from-nexus-cyan to-nexus-purple"
                  animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: "60%" }} />
              </div>
              <p className="text-[9px] text-neutral-600 font-mono mt-4 uppercase tracking-widest">
                Recruiting character - please wait
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto mb-6 bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300/90 font-mono">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TAB: SEARCH ───────────────────────────────────────────────── */}
        {activeTab === "search" && (
          <div className="space-y-8">

            {/* Search bar */}
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-blue group-focus-within:text-nexus-cyan transition-colors" />
                <input type="text" value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchAniList()}
                  placeholder="Search anime character…"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-mono font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/20 transition-all"
                />
              </div>
              <button onClick={searchAniList} disabled={loading || summoning}
                className="px-8 py-3.5 sm:py-0 rounded-2xl bg-nexus-blue hover:bg-nexus-cyan text-white font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(30,144,255,0.3)] active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                SEARCH
              </button>
            </div>

            {/* Quick chips */}
            {results.length === 0 && !loading && (
              <div className="text-center space-y-5 py-12">
                <p className="text-neutral-700 font-mono text-[9px] uppercase tracking-[0.3em]">
                  Powered by AniList via GraphQL API · 100k+ characters
                </p>
              </div>
            )}

            {/* Results grid */}
            {results.length > 0 && (
              <>
                <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest text-center">
                  {results.length} results - click any card to preview and recruit
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  <AnimatePresence>
                    {results.map((char, idx) => {
                      const id      = `anilist-${char.id}`;
                      const isDone  = imported[id];
                      const rarity  = favToRarity(char.favourites ?? 0);
                      const color   = favToColor(char.favourites ?? 0);
                      const animeName = char.media?.nodes?.[0]?.title?.english || char.media?.nodes?.[0]?.title?.userPreferred || char.media?.nodes?.[0]?.title?.romaji || "";

                      return (
                        <motion.div key={char.id}
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          whileHover={!isDone ? { y: -6 } : {}}
                          className="group relative cursor-pointer"
                          onClick={() => !isDone && !summoning && handleImport(char)}>

                          <div className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 bg-gradient-to-b transition-all duration-300 ${RARITY_GRADIENT[rarity]}`}
                            style={{ boxShadow: isDone ? "none" : RARITY_GLOW[rarity] }}>

                            {/* Character image */}
                            <CharacterImage
                              url={char.image?.large ?? ""}
                              name={char.name?.full || "Unknown Fighter"}
                              themeColor={color}
                              disableProxy={true}
                              className={`w-full h-full transition-transform duration-700 ${isDone ? "grayscale opacity-40" : "group-hover:scale-110"}`}
                            />

                            {/* Dark gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                            {/* Top badges */}
                            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
                              <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10"
                                style={{ color }}>
                                {rarity === "Legendary" ? "⭐" : rarity === "Epic" ? "💫" : rarity === "Rare" ? "✨" : "⚡"} {rarity}
                              </span>
                              {(char.favourites ?? 0) > 0 && (
                                <span className="text-[8px] font-mono text-yellow-400 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                                  <Star className="w-2 h-2 fill-yellow-400" />
                                  {char.favourites >= 1000
                                    ? `${(char.favourites / 1000).toFixed(1)}k`
                                    : char.favourites}
                                </span>
                              )}
                            </div>

                            {/* Bottom info */}
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-[11px] font-black text-white uppercase truncate leading-tight drop-shadow-md">
                                {char.name?.full}
                              </p>
                              {animeName && (
                                <p className="text-[8px] font-mono mt-0.5 truncate" style={{ color }}>
                                  {animeName}
                                </p>
                              )}
                            </div>

                            {/* Hover import overlay */}
                            {!isDone && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/65 backdrop-blur-[2px] rounded-2xl">
                                <Wand2 className="w-8 h-8 text-nexus-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] animate-pulse" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest text-center">
                                  Preview<br />&amp; Recruit
                                </span>
                              </div>
                            )}

                            {/* Imported badge */}
                            {isDone && (
                              <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                                <div className="bg-emerald-500/20 border border-emerald-500/40 px-4 py-1.5 rounded-full backdrop-blur-md">
                                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">✓ Recruited</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: ORIGINAL CHARACTER ────────────────────────────────────────────── */}
        {false && activeTab === "ai" && (
          <div className="max-w-2xl mx-auto space-y-8 py-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white tracking-widest uppercase">Summon an Original Champion</h3>
              <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto leading-relaxed uppercase">
                Describe any character concept — Gemini writes their stats, skills &amp; quote, then draws a portrait.
              </p>
            </div>
            <div className="bg-neutral-950/40 border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-nexus-purple/5 to-transparent pointer-events-none" />
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4}
                placeholder="e.g. a vampiric cyborg assassin with shadow-blood blades, extreme speed, and near-infinite intelligence…"
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-xs font-mono font-bold text-white placeholder:text-neutral-700 focus:outline-none focus:border-nexus-purple/50 focus:ring-1 focus:ring-nexus-purple/20 transition-all resize-none leading-relaxed relative z-10" />
              <button onClick={handleAISummon} disabled={!aiPrompt.trim() || summoning}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-nexus-purple via-pink-500 to-nexus-purple disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs tracking-widest uppercase shadow-[0_0_25px_rgba(168,85,247,0.3)] active:scale-[0.98] flex items-center justify-center gap-3 transition-all cursor-pointer relative z-10">
                <Wand2 className="w-4 h-4" /> ENGAGE SUMMON CIRCLE
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[9px] font-mono text-neutral-600 uppercase">Try:</span>
              {["Cosmic Star Weaver", "Blood Rune Samurai", "Lightning Phantom Ninja", "Void Poison Witch"].map(s => (
                <button key={s} onClick={() => setAiPrompt(`A ${s.toLowerCase()} with extreme power and a tragic past.`)}
                  className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 hover:border-nexus-purple/40 hover:bg-nexus-purple/8 text-[9px] font-mono text-neutral-400 hover:text-white uppercase transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── PREVIEW MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-lg overflow-y-auto">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-4xl bg-[#090d22] border-2 rounded-3xl overflow-hidden shadow-2xl relative"
              style={{ borderColor: `${preview.themeColor}55`, boxShadow: `0 0 60px -10px ${preview.themeColor}35` }}>

              {/* Top glow bar */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg,transparent,${preview.themeColor},transparent)` }} />

              {/* Close */}
              <button onClick={() => setPreview(null)}
                className="absolute top-4 right-4 p-2 rounded-full border border-white/10 bg-black/50 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all z-10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

                {/* Portrait */}
                <div className="md:col-span-5 flex flex-col items-center gap-4">
                  <div className="relative aspect-[3/4] w-full max-w-[280px] rounded-2xl overflow-hidden border-2 shadow-2xl"
                    style={{ borderColor: preview.themeColor, boxShadow: `0 0 35px ${preview.themeColor}45` }}>
                    <CharacterImage
                      url={preview.image}
                      name={preview.name}
                      fallbackUrl={preview.malFallbackUrl}
                      themeColor={preview.themeColor}
                      disableProxy={true}
                      className="w-full h-full transition-transform duration-500"
                    />

                    <div className="absolute top-3 left-3 bg-black/60 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
                      <span className="text-[9px] font-bold text-white tracking-widest uppercase flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" style={{ color: preview.themeColor }} />
                        {preview.rarity}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090d22] via-transparent to-transparent opacity-90" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[9px] font-mono uppercase font-bold" style={{ color: preview.themeColor }}>{preview.anime}</p>
                      <h3 className="text-xl font-black text-white uppercase leading-tight">{preview.name}</h3>
                      <div className="h-[2px] w-10 mt-2" style={{ backgroundColor: preview.themeColor }} />
                    </div>
                  </div>

                  {/* Hidden combat profile */}
                  <div className="w-full max-w-[280px] bg-neutral-900/50 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Combat Profile</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">Classified</p>
                  </div>
                </div>

                {/* Details */}
                <div className="md:col-span-7 space-y-5">
                  <div>
                    <span className="text-[9px] font-mono uppercase font-black tracking-widest border px-2.5 py-0.5 rounded-full"
                      style={{ color: preview.themeColor, borderColor: `${preview.themeColor}35`, backgroundColor: `${preview.themeColor}10` }}>
                      Ready to Recruit
                    </span>
                    <h2 className="text-3xl font-black text-white uppercase mt-3 leading-tight">{preview.name}</h2>
                    <p className="text-xs font-mono text-neutral-400 uppercase mt-1">from {preview.anime}</p>
                  </div>

                  {preview.quote && (
                    <blockquote className="border-l-2 pl-4 py-1 italic text-neutral-300 font-serif text-sm rounded-r-xl"
                      style={{ borderColor: `${preview.themeColor}70` }}>
                      "{preview.quote}"
                    </blockquote>
                  )}

                  {/* Stats */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-neutral-500 uppercase tracking-wider">Combat Parameters</h4>
                    {([
                      { label: "Strength", val: preview.stats.strength, icon: <Sword  className="w-3.5 h-3.5" /> },
                      { label: "Speed",    val: preview.stats.speed,    icon: <Zap    className="w-3.5 h-3.5" /> },
                      { label: "Defense",  val: preview.stats.defense,  icon: <Shield className="w-3.5 h-3.5" /> },
                      { label: "Tac. IQ",  val: preview.stats.iq,       icon: <Brain  className="w-3.5 h-3.5" /> },
                      { label: "Magic",    val: preview.stats.magic,     icon: <Sparkles className="w-3.5 h-3.5" /> },
                    ] as { label: string; val: number; icon: React.ReactNode }[]).map(s => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className="w-28 flex items-center gap-2 text-neutral-400 font-bold uppercase text-[10px]">
                          {s.icon}<span>{s.label}</span>
                        </div>
                        <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${s.val}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full rounded-full" style={{ backgroundColor: preview.themeColor }} />
                        </div>
                        <span className="w-8 text-right font-mono font-bold text-xs text-white">{s.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  {preview.skills && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono font-black text-neutral-500 uppercase tracking-wider">Signature Techniques</h4>
                      <div className="flex flex-wrap gap-2">
                        {preview.skills.map(sk => (
                          <span key={sk} className="px-3.5 py-1.5 rounded-xl border font-mono text-[10px] font-bold text-white uppercase"
                            style={{ borderColor: `${preview.themeColor}35`, backgroundColor: `${preview.themeColor}12` }}>
                            ⚔️ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-mono font-black text-neutral-500 uppercase tracking-wider">Profile</h4>
                    <p className="text-[12px] leading-relaxed text-neutral-300">{preview.description}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 bg-neutral-950/50 border-t border-white/5 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button onClick={() => setPreview(null)} disabled={recruiting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50">
                  Dismiss
                </button>
                <button onClick={confirmRecruit} disabled={recruiting}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-white font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  style={{ backgroundColor: preview.themeColor, boxShadow: `0 4px 20px ${preview.themeColor}45` }}>
                  {recruiting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Recruiting…</>
                    : <><UserPlus className="w-4 h-4" /> Confirm Recruitment</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom accent */}
      <div className="h-1 bg-gradient-to-r from-transparent via-nexus-blue/20 to-transparent" />
    </div>
  );
}


