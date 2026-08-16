import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CricketPlayer } from "../types";
import { getAllPlayers, getCountries, getPlayersByCountry } from "../utils/cricketData";
import { Play, LogOut, Eye, Trophy, Crown } from "lucide-react";
import { sfx } from "../utils/audio";
import CricketCharacterCard from "../components/common/CricketCharacterCard";

interface CricketPartyGamesProps {
  onExit: () => void;
}

type LocalPhase = "lobby" | "playing-gc" | "playing-imp";

const COUNTRIES = getCountries();
const ALL_PLAYERS = getAllPlayers();

export default function CricketPartyGames({ onExit }: CricketPartyGamesProps) {
  const [phase, setPhase] = useState<LocalPhase>("lobby");

  // ── Lobby state ──
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [selectedMode, setSelectedMode] = useState<"guess-character" | "guess-imposter">("guess-character");
  const [category, setCategory] = useState<"all" | "choose">("all");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // ── Game state (fully local, pass & play) ──
  const [p1Char, setP1Char] = useState<CricketPlayer | null>(null);
  const [p2Char, setP2Char] = useState<CricketPlayer | null>(null);
  const [p1Revealed, setP1Revealed] = useState(false);
  const [p2Revealed, setP2Revealed] = useState(false);
  const [imposterSide, setImposterSide] = useState<"p1" | "p2">("p1");
  const [votes, setVotes] = useState<Record<"p1" | "p2", "p1" | "p2" | null>>({ p1: null, p2: null });
  const [impRevealed, setImpRevealed] = useState(false);

  const resolvePool = () => {
    let pool = [...ALL_PLAYERS];
    if (category === "choose" && selectedCountries.length > 0) {
      pool = pool.filter(c => selectedCountries.includes(c.country));
    }
    return pool;
  };

  const handleStart = () => {
    if (!p1Name.trim() || !p2Name.trim()) {
      setLobbyError("Please enter both player names.");
      return;
    }
    const pool = resolvePool();
    if (pool.length < 2) {
      setLobbyError("Need at least 2 players in the selected pool.");
      return;
    }
    setLobbyError(null);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const [c1, c2] = shuffled;
    setP1Char(c1);
    setP2Char(c2);
    setP1Revealed(false);
    setP2Revealed(false);
    setVotes({ p1: null, p2: null });
    setImpRevealed(false);
    if (selectedMode === "guess-imposter") {
      setImposterSide(Math.random() < 0.5 ? "p1" : "p2");
      setPhase("playing-imp");
    } else {
      setPhase("playing-gc");
    }
    sfx.playSelect();
  };

  const backToLobby = () => {
    setPhase("lobby");
    setP1Char(null);
    setP2Char(null);
    setP1Revealed(false);
    setP2Revealed(false);
    setVotes({ p1: null, p2: null });
    setImpRevealed(false);
  };

  const revealCard = (side: "p1" | "p2") => {
    (side === "p1" ? setP1Revealed : setP2Revealed)(true);
    sfx.playCorrect();
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const impCivChar = p1Char; // everyone sees this character except the imposter
  const impChar = p2Char;
  const p1DisplayChar = imposterSide === "p1" ? impChar : impCivChar;
  const p2DisplayChar = imposterSide === "p2" ? impChar : impCivChar;
  const bothVoted = votes.p1 !== null && votes.p2 !== null;
  const unanimousAccused = votes.p1 === votes.p2 ? votes.p1 : null;

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-start py-6 px-3 bg-cricket-dark text-cricket-cream">
      <AnimatePresence mode="wait">

        {/* ══════════ LOBBY (local 2-player) ══════════ */}
        {phase === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black italic tracking-wider text-cricket-cream cricket-glow-text">🏏 CRICKET PARTY GAMES</h1>
              <p className="text-cricket-gold/70 text-sm">Local 2-player party game — pass &amp; play on one device</p>
            </div>

            <div className="cricket-panel rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-cricket-gold/70 uppercase tracking-wider">Player 1</label>
                  <input
                    type="text"
                    value={p1Name}
                    onChange={e => setP1Name(e.target.value)}
                    placeholder="Player 1 name..."
                    maxLength={16}
                    className="mt-1 w-full bg-cricket-dark border border-cricket-green/40 rounded-xl px-4 py-3 text-cricket-cream focus:outline-none focus:border-cricket-gold transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-cricket-gold/70 uppercase tracking-wider">Player 2</label>
                  <input
                    type="text"
                    value={p2Name}
                    onChange={e => setP2Name(e.target.value)}
                    placeholder="Player 2 name..."
                    maxLength={16}
                    className="mt-1 w-full bg-cricket-dark border border-cricket-red/40 rounded-xl px-4 py-3 text-cricket-cream focus:outline-none focus:border-cricket-gold transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-cricket-gold/70 uppercase tracking-wider">Game Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["guess-character", "guess-imposter"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`p-4 rounded-xl text-left border-2 transition-all text-sm font-bold cursor-pointer ${
                        selectedMode === mode
                          ? mode === "guess-character"
                            ? "bg-cricket-green/20 border-cricket-green text-cricket-gold shadow-[0_0_15px_rgba(26,92,46,0.3)]"
                            : "bg-cricket-red/20 border-cricket-red text-cricket-red shadow-[0_0_15px_rgba(196,30,58,0.3)]"
                          : "bg-cricket-dark border-cricket-gold/10 text-cricket-gold/70 hover:border-cricket-gold/30"
                      }`}
                    >
                      {mode === "guess-character" ? "🏏 Guess Player" : "🕵️ Guess Imposter"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-cricket-gold/5">
                <p className="text-xs font-bold text-cricket-gold/60 uppercase tracking-wider">Player Pool Filter</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setCategory("all"); setSelectedCountries([]); }}
                    className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                      category === "all"
                        ? "border-cricket-green bg-cricket-green/10 text-cricket-gold shadow-[0_0_15px_rgba(26,92,46,0.25)]"
                        : "border-cricket-gold/10 bg-cricket-dark/30 text-cricket-gold/70 hover:border-cricket-gold/30"
                    }`}
                  >
                    🌍 World XI
                  </button>
                  <button
                    onClick={() => setCategory("choose")}
                    className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                      category === "choose"
                        ? "border-cricket-green bg-cricket-green/10 text-cricket-gold shadow-[0_0_15px_rgba(26,92,46,0.25)]"
                        : "border-cricket-gold/10 bg-cricket-dark/30 text-cricket-gold/70 hover:border-cricket-gold/30"
                    }`}
                  >
                    🎯 Choose Countries
                  </button>
                </div>

                {category === "choose" && (
                  <div className="space-y-2 pt-1 relative animate-fadeIn">
                    <input
                      type="text"
                      value={countrySearchQuery}
                      onFocus={() => setIsCountryDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsCountryDropdownOpen(false), 200)}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                      placeholder="Select or search countries…"
                      className="w-full bg-cricket-dark/50 border border-cricket-gold/10 rounded-xl py-2.5 px-3.5 text-xs text-cricket-cream font-mono font-bold focus:border-cricket-gold focus:outline-none cursor-pointer"
                    />
                    {isCountryDropdownOpen && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-cricket-dark border border-cricket-gold/10 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
                        {filteredCountries.map((country) => {
                          const info = {
                            flag: getPlayersByCountry(country)[0]?.flag || "🏏",
                            count: getPlayersByCountry(country).length,
                          };
                          return (
                            <button
                              key={country}
                              onMouseDown={() => {
                                if (!selectedCountries.includes(country)) {
                                  setSelectedCountries((prev) => [...prev, country]);
                                }
                                setCountrySearchQuery("");
                                setIsCountryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-mono hover:bg-cricket-green/15 transition-colors cursor-pointer ${
                                selectedCountries.includes(country) ? "text-cricket-gold bg-cricket-green/10" : "text-cricket-cream"
                              }`}
                            >
                              <span className="text-base">{info.flag}</span> {country} <span className="text-cricket-gold/50">({info.count})</span>
                            </button>
                          );
                        })}
                        {filteredCountries.length === 0 && (
                          <p className="px-3.5 py-2 text-[10px] text-cricket-gold/40 font-mono">No countries found matching "{countrySearchQuery}"</p>
                        )}
                      </div>
                    )}
                    {selectedCountries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedCountries.map((country) => (
                          <span
                            key={country}
                            className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-cricket-gold bg-cricket-green/10 border border-cricket-green/30 px-2.5 py-1 rounded-lg animate-fadeIn"
                          >
                            🌍 {country}
                            <button
                              type="button"
                              onClick={() => setSelectedCountries((prev) => prev.filter((a) => a !== country))}
                              className="hover:text-cricket-red font-bold font-sans cursor-pointer transition-colors"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setSelectedCountries([]); setCountrySearchQuery(""); }}
                          className="text-[9px] font-mono text-cricket-gold/60 hover:text-cricket-red transition-colors cursor-pointer self-center ml-1"
                        >
                          ✕ clear all
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {lobbyError && <p className="text-sm text-cricket-red font-medium">{lobbyError}</p>}

              <button
                onClick={handleStart}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-cream font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-cricket-green/30 transition cursor-pointer active:scale-[0.98]"
              >
                <Play className="w-5 h-5" fill="currentColor" /> START GAME
              </button>
            </div>

            <button onClick={onExit} className="w-full text-cricket-gold/60 hover:text-cricket-cream text-sm flex items-center justify-center gap-2 transition cursor-pointer">
              <LogOut className="w-4 h-4" /> Back to Main Menu
            </button>
          </motion.div>
        )}

        {/* ══════════ GUESS PLAYER (local) ══════════ */}
        {phase === "playing-gc" && p1Char && p2Char && (
          <motion.div
            key="playing-gc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[80vh] space-y-6 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cricket-panel rounded-xl p-4 border border-cricket-gold/10">
                <div>
                  <h2 className="text-2xl font-black italic tracking-wider text-cricket-cream">🏏 GUESS PLAYER</h2>
                  <p className="text-cricket-gold/60 text-sm">Your card is hidden from YOU — the other player reveals it when you guess right!</p>
                </div>
                <button
                  onClick={backToLobby}
                  className="px-4 py-2 rounded-lg bg-cricket-red/20 border border-cricket-red/40 text-cricket-red hover:bg-cricket-red/40 hover:text-cricket-cream transition flex items-center gap-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> End Game
                </button>
              </div>

              <p className="text-center text-[10px] font-mono text-cricket-gold/50 uppercase tracking-widest border border-cricket-gold/10 bg-black/20 rounded-full px-4 py-2 animate-pulse max-w-lg mx-auto">
                🎤 Ask yes / no questions — then let the other player reveal your card
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {[{ name: p1Name, char: p1Char, revealed: p1Revealed, side: "p1" as const },
                  { name: p2Name, char: p2Char, revealed: p2Revealed, side: "p2" as const }].map((p) => (
                  <div key={p.side} className="flex flex-col items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${
                      p.side === "p1"
                        ? "bg-cricket-green/15 border-cricket-green/40 text-cricket-light"
                        : "bg-cricket-red/15 border-cricket-red/40 text-cricket-red"
                    }`}>
                      {p.name}'s card
                    </div>
                    <div className="relative select-none w-full max-w-[280px]">
                      <div className="pointer-events-none">
                        <CricketCharacterCard player={p.char} isFlipped={!p.revealed} />
                      </div>
                      <div className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none">
                        <span className="bg-cricket-dark/90 text-cricket-cream border border-cricket-gold/10 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                          {p.revealed
                            ? <span className="text-cricket-light">✓ Card Revealed — You are {p.char.flag} {p.char.name}!</span>
                            : <span className="text-cricket-gold/40">Card Hidden — don't look!</span>}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => revealCard(p.side)}
                      disabled={p.revealed}
                      className={`w-full max-w-[280px] py-2.5 rounded-xl border text-xs font-black tracking-wider transition-all flex items-center justify-center gap-2 ${
                        p.revealed
                          ? "bg-cricket-light/20 border-cricket-light/20 text-cricket-light opacity-60 cursor-default"
                          : "bg-cricket-green text-cricket-dark border-cricket-green hover:bg-cricket-light shadow-md cursor-pointer active:scale-95"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {p.revealed ? "Revealed" : `Reveal for ${p.name}`}
                    </button>
                    <p className="text-[9px] font-mono text-cricket-gold/40 text-center -mt-1">
                      {p.revealed
                        ? `${p.name} now knows who they are!`
                        : `The other player reveals this once ${p.name} guesses correctly`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════ GUESS IMPOSTER (local) ══════════ */}
        {phase === "playing-imp" && impCivChar && impChar && (
          <motion.div
            key="playing-imp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[80vh] p-4 gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cricket-panel rounded-xl p-4 border border-cricket-gold/10">
                <div>
                  <h2 className="text-2xl font-black italic tracking-wider text-cricket-cream">🕵️ GUESS IMPOSTER</h2>
                  <p className="text-cricket-gold/60 text-sm">One of you has a DIFFERENT character — find out who!</p>
                </div>
                <button
                  onClick={backToLobby}
                  className="px-4 py-2 rounded-lg bg-cricket-red/20 border border-cricket-red/40 text-cricket-red hover:bg-cricket-red/40 hover:text-cricket-cream transition flex items-center gap-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> End Game
                </button>
              </div>

              <AnimatePresence mode="wait">
                {impRevealed ? (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`${unanimousAccused === imposterSide ? "bg-cricket-green/20 border-cricket-green/40" : "bg-cricket-red/30 border-cricket-red/30"} border rounded-2xl p-6 text-center space-y-4 flex-1 animate-pulse`}
                  >
                    <Trophy className={`w-10 h-10 mx-auto ${unanimousAccused === imposterSide ? "text-cricket-gold" : "text-cricket-red"}`} />
                    <h3 className="text-2xl font-black uppercase tracking-wider text-cricket-cream">
                      {unanimousAccused === imposterSide
                        ? `🎉 ${unanimousAccused === "p1" ? p1Name : p2Name} was the Imposter — Civilians win!`
                        : unanimousAccused
                          ? `The Imposter escaped! ${unanimousAccused === "p1" ? p1Name : p2Name} was innocent.`
                          : "Votes were split — the Imposter got away!"}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-8">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-cricket-gold/60 text-xs font-bold uppercase">Everyone had</span>
                        <div className="scale-90 opacity-80">
                          <CricketCharacterCard player={impCivChar} isFlipped={false} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-cricket-green/15 border border-cricket-green/40 text-cricket-light text-[10px] font-black uppercase tracking-widest">
                          Civ: {imposterSide === "p1" ? p2Name : p1Name}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-cricket-red text-xs font-bold uppercase">Imposter had</span>
                        <div className="shadow-[0_0_40px_rgba(196,30,58,0.4)] rounded-2xl">
                          <CricketCharacterCard player={impChar} isFlipped={false} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-cricket-red/15 border border-cricket-red/40 text-cricket-red text-[10px] font-black uppercase tracking-widest">
                          Imp: {imposterSide === "p1" ? p1Name : p2Name}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={backToLobby}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-cream font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cricket-green/30 transition cursor-pointer mx-auto active:scale-95"
                    >
                      <Play className="w-4 h-4" fill="currentColor" /> Next Game
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 flex-1">
                    {/* Two hidden cards — each player reveals their own */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      {[{ name: p1Name, char: p1DisplayChar, revealed: p1Revealed, side: "p1" as const },
                        { name: p2Name, char: p2DisplayChar, revealed: p2Revealed, side: "p2" as const }].map((p) => (
                        <div key={p.side} className="flex flex-col items-center gap-3">
                          <div className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${
                            p.side === "p1"
                              ? "bg-cricket-green/15 border-cricket-green/40 text-cricket-light"
                              : "bg-cricket-red/15 border-cricket-red/40 text-cricket-red"
                          }`}>
                            {p.name}'s card
                          </div>
                          <div className="relative select-none w-full max-w-[280px]">
                            <div className="pointer-events-none">
                              <CricketCharacterCard player={p.char} isFlipped={!p.revealed} />
                            </div>
                            <div className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none">
                              <span className="bg-cricket-dark/90 text-cricket-cream border border-cricket-gold/10 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                                {p.revealed
                                  ? <span className="text-cricket-light">✓ {p.char.flag} {p.char.name}</span>
                                  : <span className="text-cricket-gold/40">Pass device to {p.name} to peek…</span>}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => revealCard(p.side)}
                            disabled={p.revealed}
                            className={`w-full max-w-[280px] py-2.5 rounded-xl border text-xs font-black tracking-wider transition-all flex items-center justify-center gap-2 ${
                              p.revealed
                                ? "bg-cricket-light/20 border-cricket-light/20 text-cricket-light opacity-60 cursor-default"
                                : "bg-cricket-dark border-cricket-gold/40 text-cricket-gold hover:bg-cricket-green/15 hover:border-cricket-green cursor-pointer active:scale-95"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {p.revealed ? "Card Peeked" : `Peek My Card (${p.name})`}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Voting */}
                    <div className="bg-cricket-dark/50 border border-cricket-gold/5 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-cricket-gold/70 uppercase tracking-wider">Vote for the Imposter</h3>
                        <span className="text-xs text-cricket-gold/50 font-bold">
                          {Object.values(votes).filter(v => v !== null).length}/2 voted
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ side: "p1" as const, name: p1Name }, { side: "p2" as const, name: p2Name }].map((p) => {
                          const myVote = votes[p.side];
                          return (
                            <button
                              key={p.side}
                              onClick={() => {
                                if (votes[p.side] !== null) return;
                                sfx.playSelect();
                                setVotes(prev => ({ ...prev, [p.side]: p.side === "p1" ? "p2" : "p1" }));
                              }}
                              disabled={votes[p.side] !== null}
                              className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                myVote !== null
                                  ? "border-cricket-red bg-cricket-red/40 opacity-70"
                                  : "border-cricket-gold/10 bg-cricket-dark hover:border-cricket-red/50 hover:bg-cricket-red/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-cricket-cream">{p.name}</span>
                                {myVote !== null && (
                                  <span className="text-[10px] font-black text-cricket-red uppercase tracking-wider">
                                    Voted {myVote === "p1" ? p1Name : p2Name}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-cricket-gold/50 mt-1 block">
                                {myVote !== null ? "(Vote locked)" : "Tap if you suspect this player"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => { setImpRevealed(true); sfx.playShowdown(); }}
                        disabled={!bothVoted}
                        className={`w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                          bothVoted
                            ? "bg-gradient-to-r from-cricket-red to-orange-600 hover:from-red-600 hover:to-orange-500 text-cricket-cream animate-pulse"
                            : "bg-neutral-700/50 text-neutral-400 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                        {bothVoted ? "REVEAL IMPOSTER" : "Waiting for both players to vote…"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}