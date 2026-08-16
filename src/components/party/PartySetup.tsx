import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, UserPlus, Play, Drama, HelpCircle, X } from "lucide-react";
import { sfx } from "../../utils/audio";

export type PartyGameMode = "guess-character" | "guess-imposter";

export interface PartySetupData {
  mode: PartyGameMode;
  players: string[];
}

interface PartySetupProps {
  onStart: (data: PartySetupData) => void;
  onBack: () => void;
}

export default function PartySetup({ onStart, onBack }: PartySetupProps) {
  const [mode, setMode] = useState<PartyGameMode>("guess-character");
  const [players, setPlayers] = useState<string[]>(["Player 1", "Player 2", "Player 3"]);

  const handleAddPlayer = () => {
    if (players.length < 10) {
      sfx.playSelect();
      setPlayers([...players, `Player ${players.length + 1}`]);
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length > 3) {
      sfx.playSelect();
      const next = [...players];
      next.splice(index, 1);
      setPlayers(next);
    }
  };

  const handleNameChange = (index: number, newName: string) => {
    const next = [...players];
    next[index] = newName;
    setPlayers(next);
  };

  const handleStart = () => {
    // Validate empty names
    const validPlayers = players.map((p, i) => p.trim() || `Player ${i + 1}`);
    sfx.playShowdown();
    onStart({
      mode,
      players: validPlayers,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic tracking-wider text-white">PARTY MODE</h2>
          <p className="text-slate-400 text-sm mt-1">Online Multiplayer</p>
        </div>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => { sfx.playSelect(); setMode("guess-character"); }}
          className={`relative p-5 rounded-2xl text-left border-2 transition-all ${
            mode === "guess-character"
              ? "bg-violet-900/30 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              : "bg-slate-900 border-white/10 hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${mode === "guess-character" ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400"}`}>
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className={`font-bold ${mode === "guess-character" ? "text-white" : "text-slate-300"}`}>Guess Character</h3>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            (Headbands Style) You can see everyone's character except your own! Ask yes/no questions to guess who you are.
          </p>
          {mode === "guess-character" && (
            <div className="absolute top-3 right-3 w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={() => { sfx.playSelect(); setMode("guess-imposter"); }}
          className={`relative p-5 rounded-2xl text-left border-2 transition-all ${
            mode === "guess-imposter"
              ? "bg-rose-900/30 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              : "bg-slate-900 border-white/10 hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${mode === "guess-imposter" ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400"}`}>
              <Drama className="w-5 h-5" />
            </div>
            <h3 className={`font-bold ${mode === "guess-imposter" ? "text-white" : "text-slate-300"}`}>Guess Imposter</h3>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            (Undercover Style) Everyone gets the exact same character... except one imposter. Find the odd one out!
          </p>
          {mode === "guess-imposter" && (
            <div className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Player Setup */}
      <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Players ({players.length}/10)
          </h3>
          {players.length < 10 && (
            <button
              onClick={handleAddPlayer}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-bold transition flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" /> ADD
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence>
            {players.map((p, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-white/5"
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                  {idx + 1}
                </div>
                <input
                  type="text"
                  value={p}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className="flex-1 bg-transparent text-white focus:outline-none placeholder-slate-600 font-medium"
                  placeholder={`Player ${idx + 1}`}
                />
                {players.length > 3 && (
                  <button
                     onClick={() => handleRemovePlayer(idx)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-lg flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/30 transition duration-300 transform hover:scale-[1.02]"
      >
        <Play className="w-5 h-5" fill="currentColor" />
        START {mode === "guess-character" ? "GUESS CHARACTER" : "GUESS IMPOSTER"}
      </button>
    </div>
  );
}
