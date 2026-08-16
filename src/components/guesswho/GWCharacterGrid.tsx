import React from "react";
import { motion } from "motion/react";
import { X, Eye } from "lucide-react";
import { CricketPlayer } from "../../types";
import { getRarityConfig } from "../../utils/cricketStats";
import CricketCharacterCard from "../../components/common/CricketCharacterCard";

interface GWCharacterGridProps {
  characters: CricketPlayer[];
  eliminatedIds: Set<string>;
  onEliminate: (id: string) => void;
  onRestore: (id: string) => void;
  disabled: boolean;
}

export default function GWCharacterGrid({
  characters,
  eliminatedIds,
  onEliminate,
  onRestore,
  disabled,
}: GWCharacterGridProps) {
  const remaining = characters.length - eliminatedIds.size;

  const handleClick = (id: string) => {
    if (disabled) return;
    if (eliminatedIds.has(id)) {
      onRestore(id);
    } else {
      onEliminate(id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cricket-gold" />
          <span className="text-xs text-cricket-gold/60">Your Tracking Board</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-bold ${
              remaining <= 5
                ? "text-cricket-red"
                : remaining <= 10
                ? "text-cricket-gold"
                : "text-cricket-light"
            }`}
          >
            {remaining}
          </span>
          <span className="text-xs text-cricket-gold/40">
            / {characters.length} remaining
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {characters.map((player, i) => {
          const isEliminated = eliminatedIds.has(player.id);
          const config = getRarityConfig(player.rarity);

          return (
            <motion.button
              key={player.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              onClick={() => handleClick(player.id)}
              disabled={disabled}
              className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 group ${
                isEliminated
                  ? "opacity-40 scale-95 border-cricket-red/50"
                  : `hover:scale-[1.03] hover:shadow-lg shadow-md ${config.glow}`
              } ${
                disabled
                  ? "cursor-default"
                  : "cursor-pointer"
              } bg-cricket-dark/60`}
            >
              <CricketCharacterCard player={player} isFlipped={false} isCompact={true} showFullStats={false} />
              
              {isEliminated && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-cricket-red/30"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cricket-red/30 flex items-center justify-center backdrop-blur-sm">
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-cricket-red" />
                  </div>
                </motion.div>
              )}

              {!isEliminated && !disabled && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <X className="w-5 h-5 text-cricket-red/80" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}