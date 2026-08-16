import React from "react";
import { motion, AnimatePresence } from "motion/react";
import CharacterImage from "../common/CharacterImage";
import { X } from "lucide-react";

/**
 * CinematicClash component – renders the cinematic overlay during the draft view.
 * All required state and callbacks are passed via props (any) for flexibility.
 */
export default function CinematicClash(props: any) {
  // Destructure needed values – keep original variable names for readability.
  const {
    cinematicStage,
    setCinematicStage,
    resultData,
    p1Slots,
    p2Slots,
    getCinematicDuels,
    findCharacterForDuel,
    clashIndex,
    setClashIndex,
    p1CinematicScore,
    setP1CinematicScore,
    p2CinematicScore,
    setP2CinematicScore,
    scoredClashIndex,
    setScoredClashIndex,
    resetCinematicClash,
    setView,
    gameMode,
    syncGameState,
    sfx,
    channelRef,
    onlineSide,
    player1Name,
    player2Name,
  } = props;

  return (
    <AnimatePresence>
      {cinematicStage !== "hidden" && resultData?.battleReport && (
        (() => {
          const duels = getCinematicDuels(resultData.battleReport.duels);
          const duel = duels[clashIndex];
          const p1Character = duel ? findCharacterForDuel(p1Slots, duel.role, duel.p1Name) : null;
          const p2Character = duel ? findCharacterForDuel(p2Slots, duel.role, duel.p2Name) : null;
          const p1Wins = duel?.winner === "p1";
          const p2Wins = duel?.winner === "p2";
          const isDraw = duel?.winner === "draw";
          const showMath = cinematicStage === "impact" || cinematicStage === "score";

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                x: cinematicStage === "impact" ? [0, -8, 7, -5, 4, 0] : 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: cinematicStage === "impact" ? 0.28 : 0.35 }}
              className="absolute inset-0 z-50 overflow-hidden rounded-3xl border border-white/10 bg-transparent"
            >
              {/* Soft blur behind the clash so text stays readable where the dark overlay was removed */}
              <div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" />
              <div className="absolute top-3 left-3 right-3 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-2 font-mono shadow-2xl sm:top-5 sm:left-8 sm:right-8 sm:p-3">
                <div className={`rounded-xl border px-3 py-2 ${cinematicStage === "score" && p1Wins ? "border-amber-300/50 bg-amber-400/15 text-amber-200" : "border-white/10 text-white"}`}>
                  <p className="truncate text-[9px] uppercase tracking-widest text-slate-400">{player1Name}</p>
                  <motion.p key={`p1-score-${p1CinematicScore}`} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-3xl font-black">{p1CinematicScore}</motion.p>
                  <p className="text-[8px] uppercase tracking-widest text-slate-500">Point Bank</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Role Clash</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-slate-500">{Math.min(clashIndex + 1, duels.length)} / {duels.length}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 text-right ${cinematicStage === "score" && p2Wins ? "border-amber-300/50 bg-amber-400/15 text-amber-200" : "border-white/10 text-white"}`}>
                  <p className="truncate text-[9px] uppercase tracking-widest text-slate-400">{player2Name}</p>
                  <motion.p key={`p2-score-${p2CinematicScore}`} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-3xl font-black">{p2CinematicScore}</motion.p>
                  <p className="text-[8px] uppercase tracking-widest text-slate-500">Point Bank</p>
                </div>
              </div>

              {cinematicStage === "intro" && (
                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                  <motion.h2 initial={{ scale: 0.55, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black uppercase tracking-tighter text-white sm:text-6xl">
                    Battle Commence
                  </motion.h2>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-amber-300">Role matchup analysis engaged</p>
                </div>
              )}

              {duel && cinematicStage !== "intro" && (
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-4 pt-24 text-center">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-white sm:text-3xl">{duel.label} Matchup</h2>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      {duel.p1Suitability ?? "Fit"} x{(duel.p1FitMultiplier ?? 1).toFixed(2)} vs {duel.p2Suitability ?? "Fit"} x{(duel.p2FitMultiplier ?? 1).toFixed(2)}
                    </p>
                  </div>

                  <div className="relative flex w-full max-w-3xl items-center justify-center">
                    {/* Left edge slot rail the card slides out of */}
                    <motion.div
                      initial={{ opacity: 0, x: -70 }}
                      animate={{ opacity: cinematicStage === "launch" || cinematicStage === "impact" ? 1 : 0, x: 0 }}
                      transition={{ duration: 0.5 }}
                      className="pointer-events-none absolute left-0 z-0 h-40 w-10 rounded-r-xl border border-white/10 bg-neutral-950/70 shadow-[inset_0_0_18px_rgba(34,211,238,0.25)]"
                    >
                      <div className="h-full w-full bg-gradient-to-b from-transparent via-nexus-cyan/10 to-transparent" />
                    </motion.div>
                    {/* Right edge slot rail */}
                    <motion.div
                      initial={{ opacity: 0, x: 70 }}
                      animate={{ opacity: cinematicStage === "launch" || cinematicStage === "impact" ? 1 : 0, x: 0 }}
                      transition={{ duration: 0.5 }}
                      className="pointer-events-none absolute right-0 z-0 h-40 w-10 rounded-l-xl border border-white/10 bg-neutral-950/70 shadow-[inset_0_0_18px_rgba(251,113,133,0.25)]"
                    >
                      <div className="h-full w-full bg-gradient-to-b from-transparent via-rose-300/10 to-transparent" />
                    </motion.div>

                    <motion.div
                      key={`p1-${duel.role}-${clashIndex}`}
                      initial={{ x: -560, y: 80, rotate: -14, scale: 0.85 }}
                      animate={{
                        x: cinematicStage === "launch" ? -110 : cinematicStage === "impact" ? -18 : p1Wins ? -210 : isDraw ? -72 : -295,
                        y: cinematicStage === "score" && p1Wins ? -250 : cinematicStage === "score" && !p1Wins ? 90 : 0,
                        rotate: cinematicStage === "impact" ? -2 : p1Wins ? -8 : -16,
                        scale: cinematicStage === "score" && p1Wins ? 0.64 : cinematicStage === "score" ? 0.72 : 1,
                        opacity: cinematicStage === "score" && p2Wins ? 0.25 : 1,
                      }}
                      transition={{ duration: cinematicStage === "launch" ? 0.9 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
                      className={`relative h-56 w-36 overflow-hidden rounded-2xl border bg-neutral-950 shadow-2xl sm:h-64 sm:w-44 ${cinematicStage === "score" && p1Wins ? "border-amber-300 shadow-[0_0_42px_rgba(251,191,36,0.34)]" : "border-white/20"}`}
                    >
                      {p1Character && (
                        <CharacterImage url={p1Character.image} fallbackUrl={p1Character.malfallbackUrl} name={p1Character.name} themeColor={p1Character.themeColor} className="h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-3 text-left">
                        <p className="truncate text-sm font-black uppercase text-white">{duel.p1Name}</p>
                        <p className="font-mono text-[10px] uppercase text-nexus-cyan">{duel.p1Suitability ?? "Fit"} {duel.p1FitScore ?? 0}</p>
                        {showMath && (
                          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-xs font-black text-amber-300">
                            {duel.p1BaseScore ?? duel.p1Score} -&gt; {duel.p1Score}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {cinematicStage === "impact" && (
                        <motion.div
                          initial={{ scale: 0.2, opacity: 0 }}
                          animate={{ scale: 1.35, opacity: 1 }}
                          exit={{ scale: 1.8, opacity: 0 }}
                          className="pointer-events-none absolute z-30 flex h-44 w-44 items-center justify-center rounded-full bg-amber-300/25 shadow-[0_0_90px_rgba(250,204,21,0.65)]"
                        >
                          <div className="h-24 w-1 rotate-45 bg-white shadow-[0_0_24px_white]" />
                          <div className="absolute h-24 w-1 -rotate-45 bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      key={`p2-${duel.role}-${clashIndex}`}
                      initial={{ x: 560, y: -80, rotate: 14, scale: 0.85 }}
                      animate={{
                        x: cinematicStage === "launch" ? 110 : cinematicStage === "impact" ? 18 : p2Wins ? 210 : isDraw ? 72 : 295,
                        y: cinematicStage === "score" && p2Wins ? -250 : cinematicStage === "score" && !p2Wins ? -90 : 0,
                        rotate: cinematicStage === "impact" ? 2 : p2Wins ? 8 : 16,
                        scale: cinematicStage === "score" && p2Wins ? 0.64 : cinematicStage === "score" ? 0.72 : 1,
                        opacity: cinematicStage === "score" && p1Wins ? 0.25 : 1,
                      }}
                      transition={{ duration: cinematicStage === "launch" ? 0.9 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
                      className={`relative h-56 w-36 overflow-hidden rounded-2xl border bg-neutral-950 shadow-2xl sm:h-64 sm:w-44 ${cinematicStage === "score" && p2Wins ? "border-amber-300 shadow-[0_0_42px_rgba(251,191,36,0.34)]" : "border-white/20"}`}
                    >
                      {p2Character && (
                        <CharacterImage url={p2Character.image} fallbackUrl={p2Character.malfallbackUrl} name={p2Character.name} themeColor={p2Character.themeColor} className="h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-3 text-right">
                        <p className="truncate text-sm font-black uppercase text-white">{duel.p2Name}</p>
                        <p className="font-mono text-[10px] uppercase text-nexus-cyan">{duel.p2Suitability ?? "Fit"} {duel.p2FitScore ?? 0}</p>
                        {showMath && (
                          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-xs font-black text-amber-300">
                            {duel.p2BaseScore ?? duel.p2Score} -&gt; {duel.p2Score}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {cinematicStage === "score" && (
                  <motion.div
                    key={`${duel.role}-winner-text`}
                    initial={{ y: 16, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-white/10 bg-black/55 px-5 py-3 shadow-2xl"
                  >
                    <p className="text-xl font-black uppercase text-white">
                      {duel.winner === "draw" ? "Draw" : `${duel.winner === "p1" ? duel.p1Name : duel.p2Name} wins`}
                    </p>
                    <p className="mt-1 max-w-lg text-[10px] font-mono uppercase tracking-widest text-slate-400">{duel.detail}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })()
      )}
      {/* CINEMATIC CLASH OVERLAY SKIP BUTTON */}
      <button
        type="button"
        onClick={() => {
          setCinematicStage("hidden");
          setView("results");
          if (gameMode === "online-2p") {
            syncGameState({ view: "results" });
          }
        }}
        className="absolute bottom-4 right-4 z-30 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-white/25 hover:text-white"
      >
        Skip Cinematic
      </button>
    </AnimatePresence>
  );
}
