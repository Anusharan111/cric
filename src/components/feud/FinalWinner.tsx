import React, { useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, RefreshCw, LogOut, Award } from "lucide-react";
import { Team } from "../../game/turnManager";

interface FinalWinnerProps {
  teams: Team[];
  scores: { [id: string]: number };
  onRestart: () => void;
  onExit: () => void;
}

export default function FinalWinner({
  teams,
  scores,
  onRestart,
  onExit,
}: FinalWinnerProps) {
  // Sort teams/players by score to determine rankings
  const ranked = [...teams].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const winner = ranked[0];

  return (
    <div className="w-full max-w-xl mx-auto p-8 text-center nexus-glass rounded-2xl border border-violet-500/20 text-white shadow-2xl relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/20 mb-4 animate-bounce">
          <Trophy className="w-12 h-12 text-slate-950 stroke-[2px]" />
        </div>

        <span className="text-xs uppercase font-extrabold tracking-widest text-yellow-400">
          Victory Achieved
        </span>
        <h2 className="text-4xl font-black tracking-tight mt-1 text-white bg-gradient-to-r from-white via-amber-250 to-white bg-clip-text">
          {winner?.name} Wins!
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Final score: {scores[winner?.id] || 0} points
        </p>

        {/* Leaderboard Table */}
        <div className="w-full mt-8 bg-slate-950/60 rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          <div className="px-4 py-2 bg-slate-900/60 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Rank & Contender</span>
            <span>Score</span>
          </div>
          {ranked.map((team, index) => (
            <div
              key={team.id}
              className={`px-4 py-3 flex justify-between items-center ${
                index === 0 ? "bg-violet-950/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? "bg-yellow-400 text-slate-950"
                      : index === 1
                      ? "bg-slate-300 text-slate-900"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="font-extrabold text-sm text-slate-200">
                  {team.name}
                </span>
              </div>
              <span className="font-black text-base text-yellow-400">
                {scores[team.id] || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full mt-8">
          <button
            onClick={onRestart}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-650 to-fuchsia-650 hover:from-violet-550 hover:to-fuchsia-550 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-950/20 transition duration-300 transform hover:scale-103"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
          <button
            onClick={onExit}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Game Hub</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
