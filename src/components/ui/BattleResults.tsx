import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Swords, RefreshCw, RotateCcw } from "lucide-react";

/**
 * BattleResults component – renders the results view after a draft completes.
 * All necessary state and callbacks are passed via the `props` object.
 */
export default function BattleResults(props: any) {
  const {
    loadingResult,
    resultData,
    player1Name,
    player2Name,
    startNewGame,
    gameMode,
    onlineSide,
    channelRef,
    resetOnlineLobby,
    setView,
  } = props;

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {loadingResult || !resultData ? (
        <div className="min-h-[500px] flex flex-col items-center justify-center space-y-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-fuchsia-400 animate-ping" />
            <Swords className="w-8 h-8 text-white" />
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="text-base font-black uppercase tracking-[0.2em] text-white">
              EVALUATING TEAM COLLISION...
            </h3>
            <p className="text-xs text-violet-400 font-mono uppercase tracking-widest animate-pulse">
              RESOLVING ROLE DUELS AND TEAM BONUSES
            </p>
            <p className="text-[10px] text-neutral-500 font-mono">
              Querying dimensional caster...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* WINNER BLOCK */}
          <div className="text-center space-y-4 bg-gradient-to-b from-neutral-900/60 to-neutral-950/40 border border-neutral-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-fuchsia-500 to-amber-500" />

            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-400 font-bold">
                FINAL SHOWDOWN RESULT
              </p>
              {resultData.winnerId === "draw" ? (
                <h1 className="text-5xl font-black uppercase tracking-tight text-white">
                  Double-KO Draw!
                </h1>
              ) : (
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500 animate-pulse">
                    {resultData.winner === player1Name ? player1Name : resultData.winner}
                  </span>{" "}VICTORIOUS!
                </h1>
              )}
            </div>

            {resultData.mvp && (
              <div className="flex flex-col items-center mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-sm mx-auto">
                <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest mb-1">Match MVP</span>
                <span className="text-xl font-black text-white">{resultData.mvp.name}</span>
                <span className="text-[9px] font-mono text-amber-400/70 mt-1 uppercase text-center">
                  {resultData.mvpReason ?? resultData.mvpAnalysis?.reason ?? "Best role fit plus highest duel impact."}
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 max-w-md mx-auto items-center py-4 mirror-panel-subtle rounded-2xl border border-white/5 font-mono">
              <div className="text-center">
                <p className="text-[9px] text-neutral-400 leading-none truncate">{player1Name}</p>
                <p className="text-3xl font-black text-white mt-1">{resultData.player1Power}</p>
                <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Battle Score</p>
              </div>
              <div className="text-center text-sm font-black text-neutral-600 border-x border-white/5">
                VS
              </div>
              <div className="text-center">
                <p className="text-[9px] text-neutral-400 leading-none truncate">{player2Name}</p>
                <p className="text-3xl font-black text-white mt-1">{resultData.player2Power}</p>
                <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Battle Score</p>
              </div>
            </div>

            {resultData.battleReport && (
              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-4 text-left">
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-xs font-mono font-black uppercase tracking-widest text-nexus-cyan">
                      Role Matchup Results
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      {resultData.battleReport.p1DuelWins}-{resultData.battleReport.p2DuelWins}
                      {resultData.battleReport.drawDuels > 0 ? `-${resultData.battleReport.drawDuels}` : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {resultData.battleReport.duels.map((duel) => (
                      <div key={duel.role} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                        <div className={`min-w-0 ${duel.winner === "p1" ? "text-amber-300" : "text-slate-400"}`}>
                          <p className="truncate text-[10px] font-bold">{duel.p1Name}</p>
                          <p className="text-sm font-black">{duel.p1IsRating ? `⭐ ${duel.p1Rating}` : duel.p1Score}</p>
                          <p className="text-[8px] font-mono uppercase text-slate-600">
                            {duel.p1IsRating ? "Rating Scale" : `${duel.p1Suitability ?? "Fit"} ${duel.p1FitScore ?? 0} x${(duel.p1FitMultiplier ?? 1).toFixed(2)}`}
                          </p>
                          <p className="text-[8px] font-mono uppercase text-slate-700">
                            {duel.p1IsRating ? "Dataset Rating (0-500)" : `Base ${duel.p1BaseScore ?? duel.p1Score} -> Final ${duel.p1Score}`}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-mono font-black uppercase tracking-widest text-slate-500">{duel.label}</p>
                          {duel.role === "traitor" && (
                            <span className="text-[7px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded uppercase tracking-tighter block mt-0.5">
                              Points Swapped!
                            </span>
                          )}
                          <p className="text-[9px] text-slate-600">VS</p>
                        </div>
                        <div className={`min-w-0 text-right ${duel.winner === "p2" ? "text-amber-300" : "text-slate-400"}`}>
                          <p className="truncate text-[10px] font-bold">{duel.p2Name}</p>
                          <p className="text-sm font-black">{duel.p2IsRating ? `⭐ ${duel.p2Rating}` : duel.p2Score}</p>
                          <p className="text-[8px] font-mono uppercase text-slate-600">
                            {duel.p2IsRating ? "Rating Scale" : `${duel.p2Suitability ?? "Fit"} ${duel.p2FitScore ?? 0} x${(duel.p2FitMultiplier ?? 1).toFixed(2)}`}
                          </p>
                          <p className="text-[8px] font-mono uppercase text-slate-700">
                            {duel.p2IsRating ? "Dataset Rating (0-500)" : `Base ${duel.p2BaseScore ?? duel.p2Score} -> Final ${duel.p2Score}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-mono font-black uppercase tracking-widest text-amber-300">
                      Battle Rules
                    </h3>
                    <div className="mt-3 space-y-2">
                      {resultData.battleReport.rules.map((rule, index) => (
                        <p key={rule} className="text-[10px] text-slate-400 leading-relaxed">
                          <span className="mr-2 font-mono font-black text-slate-600">{index + 1}</span>
                          {rule}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                    {(["p1", "p2"] as const).map((side) => (
                      <div key={side} className="space-y-1.5">
                        <p className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-500">
                          {side === "p1" ? player1Name : player2Name}
                        </p>
                        {Object.entries(resultData.battleReport!.bonuses[side]).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="capitalize text-slate-500">{label.replace(/([A-Z])/g, " $1")}</span>
                            <span className="font-mono font-black text-white">+{value}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-4">
              {gameMode === "online-2p" && onlineSide !== "p1" ? (
                <button
                  id="btn-restart"
                  disabled
                  className="py-3 px-6 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-500 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed opacity-50 font-bold"
                >
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-600" /> Waiting for Host
                </button>
              ) : (
                <button
                  id="btn-restart"
                  onClick={() => startNewGame(gameMode)}
                  className="py-3 px-6 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-white font-bold"
                >
                  <RefreshCw className="w-4 h-4 text-violet-400" /> Revenge Match
                </button>
              )}
              <button
                id="btn-return-landing"
                onClick={() => {
                  if (gameMode === "online-2p") {
                    if (channelRef.current) {
                      channelRef.current.trigger("client-room-cancelled", {});
                    }
                    resetOnlineLobby();
                  } else {
                    setView("landing");
                  }
                }}
                className="py-3 px-6 rounded-xl text-neutral-100 bg-violet-600 hover:bg-violet-500 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] font-bold"
              >
                <RotateCcw className="w-4 h-4" /> Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
