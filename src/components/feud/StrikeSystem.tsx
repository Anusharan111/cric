import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, X } from "lucide-react";

interface StrikeSystemProps {
  strikes: number;
}

export default function StrikeSystem({ strikes }: StrikeSystemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/40 border border-red-500/10 max-w-[200px] mx-auto">
      <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 mb-1.5 flex items-center gap-1">
        <ShieldAlert className="w-3.5 h-3.5" /> Strikes
      </span>
      <div className="flex gap-2">
        {[1, 2, 3].map((num) => {
          const isStruck = strikes >= num;
          return (
            <div
              key={num}
              className="relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden"
            >
              {isStruck ? (
                <motion.div
                  initial={{ scale: 2.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center bg-red-650 text-red-500 shadow-[inset_0_0_12px_rgba(239,68,68,0.5)]"
                >
                  <X className="w-9 h-9 stroke-[3px] filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                </motion.div>
              ) : (
                <span className="text-slate-700 text-xs font-bold font-mono">
                  {num}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
