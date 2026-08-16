import React from "react";
import { Team, Player } from "../../game/turnManager";
import { Users, Award, Flame } from "lucide-react";

interface ScoreBoardProps {
  teams: Team[];
  players: Player[];
  scores: { [id: string]: number };
  activeTeamId: string;
  mode: string;
  consecutiveCorrect: number;
}

export default function ScoreBoard({
  teams,
  players,
  scores,
  activeTeamId,
  mode,
  consecutiveCorrect,
}: ScoreBoardProps) {
  // Helper to get names of players in a team
  const getTeamPlayers = (team: Team) => {
    return team.playerIds
      .map((pid) => players.find((p) => p.id === pid)?.name || "")
      .join(", ");
  };

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {teams.map((team) => {
        const isActive = activeTeamId === team.id;
        const score = scores[team.id] || 0;

        return (
          <div
            key={team.id}
            className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
              isActive
                ? "bg-gradient-to-br from-violet-900/30 to-fuchsia-950/20 border-violet-500/80 shadow-lg shadow-violet-500/10 scale-[1.02]"
                : "bg-slate-950/40 border-white/5"
            }`}
          >
            {/* Active Glow Bar */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 animate-pulse" />
            )}

            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
                  {team.name}
                  {isActive && (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[8px] uppercase tracking-wider font-extrabold border border-violet-500/30">
                      Active
                    </span>
                  )}
                </h4>
                {mode === "team" && (
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                    {getTeamPlayers(team)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block">
                  Score
                </span>
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-sm">
                  {score}
                </span>
              </div>
            </div>

            {/* Streak indicator on active team */}
            {isActive && consecutiveCorrect >= 2 && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-orange-400 font-bold bg-orange-950/40 border border-orange-500/20 px-2 py-0.5 rounded w-max animate-bounce">
                <Flame className="w-3.5 h-3.5 fill-orange-500" />
                Streak Bonus: {consecutiveCorrect}x (+10 pts)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
