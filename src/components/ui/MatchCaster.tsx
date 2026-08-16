import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Volume2, Sparkles, AlertCircle } from "lucide-react";

interface MatchCasterProps {
  commentary: string;
  p1Name: string;
  p2Name: string;
  winner: string;
}

export default function MatchCaster({ commentary, p1Name, p2Name, winner }: MatchCasterProps) {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"highlights" | "raw">("highlights");

  // Clean the text and format it into beautiful sections
  const paragraphs = commentary
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Typewriter or incremental reveal layout effect
  useEffect(() => {
    // Progressively fade in the caster commentary
    let currentLength = 0;
    const interval = setInterval(() => {
      currentLength += 8;
      if (currentLength >= commentary.length) {
        setDisplayedText(commentary);
        clearInterval(interval);
      } else {
        setDisplayedText(commentary.substring(0, currentLength) + "…");
      }
    }, 15);

    return () => clearInterval(interval);
  }, [commentary]);

  // Check if Gemini commentator generated the text or we used the static
  const isFallback = commentary.includes("Set up your own valid GEMINI_API_KEY");

  // Helper to parse double asterisk bold lines inside paragraphs
  const formatText = (text: string) => {
    // Simple parser for bold tags **word** -> <strong>
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="text-violet-400 font-extrabold tracking-wide drop-shadow-[0_0_4px_rgba(168,85,247,0.3)]">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="rounded-2xl border border-neutral-800 mirror-panel p-5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden">
      {/* Absolute styling backdrops */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-600/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Caster booth header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono tracking-wider text-white uppercase flex items-center gap-1.5">
              🎤 Caster's Arena Booth <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </h3>
            <p className="text-[10px] font-mono text-neutral-400">
              LIVE BROADCAST • MATCH ANALYZER v2.5
            </p>
          </div>
        </div>

        {/* Tab options for styling */}
        <div className="flex bg-neutral-900 border border-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("highlights")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === "highlights"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Stadium View
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === "raw"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Raw Feed
          </button>
        </div>
      </div>

      {isFallback && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Hype Commentary Notice:</span> Running local template breakdown. Connect your personalized <span className="font-bold underline">GEMINI_API_KEY</span> in the Secrets panel for custom, real-time-generated anime stories based on your drafts!
          </div>
        </div>
      )}

      {/* Main Commentating Grid */}
      <div className="min-h-[220px]">
        {activeTab === "highlights" ? (
          <div className="space-y-4">
            {paragraphs.map((p, idx) => {
              // Special treatment for absolute heads
              const isHeadline = p.startsWith("###") || p.startsWith("##");
              const cleanText = p.replace(/^###\s*/, "").replace(/^##\s*/, "");

              if (isHeadline) {
                return (
                  <h4
                    key={idx}
                    className="text-lg font-black font-sans uppercase tracking-wide bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent border-b border-white/5 pb-1 mt-6"
                  >
                    {cleanText}
                  </h4>
                );
              }

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  className="p-3.5 rounded-xl border border-white/5 bg-neutral-900/30 leading-relaxed text-sm text-neutral-300 font-sans"
                >
                  {formatText(p)}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-neutral-900/40 rounded-xl border border-white/5 font-mono text-xs select-text overflow-auto max-h-[300px] text-neutral-400 leading-relaxed whitespace-pre-wrap">
            {displayedText}
          </div>
        )}
      </div>

      {/* Decorative footer caster details */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-neutral-500 gap-2">
        <span>STADIUM CHANNELS: #ANIME-CLASH-1 #GRAND-PRIX</span>
        <span className="text-violet-400 font-black tracking-widest uppercase">
          {winner === "Draw" ? "🤝 RESPECTABLE DRAW BANTER" : `🏆 HAIL TEAM ${winner}!`}
        </span>
      </div>
    </div>
  );
}
