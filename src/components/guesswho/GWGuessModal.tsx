import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  X,
  Target,
  Check,
  ChevronLeft,
} from "lucide-react";
import { CricketPlayer } from "../../types";
import { getRarityConfig, getCountryCode } from "../../utils/cricketStats";
import CharacterImage from "../../components/common/CharacterImage";

interface GWGuessModalProps {
  characters: CricketPlayer[];
  candidateLabel?: string;
  eliminatedIds: Set<string>;
  onGuess: (characterId: string) => void;
  onCancel: () => void;
}

export default function GWGuessModal({
  characters,
  candidateLabel,
  eliminatedIds,
  onGuess,
  onCancel,
}: GWGuessModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const availableChars = characters.filter((c) => !eliminatedIds.has(c.id));
  const selectedChar = availableChars.find((c) => c.id === selected);

  const handleConfirm = () => {
    if (!selected) return;
    onGuess(selected);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl max-h-[85vh] cricket-glass rounded-2xl border border-cricket-gold/20 shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="px-5 py-3 border-b border-cricket-gold/10 flex items-center justify-between bg-cricket-dark/40">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cricket-gold" />
              <h3 className="text-lg font-bold text-cricket-cream tracking-wide">
                Make Your Guess
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition text-cricket-gold/60 hover:text-cricket-cream"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mx-4 mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-cricket-red/10 border border-cricket-red/30">
            <AlertTriangle className="w-5 h-5 text-cricket-red flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-cricket-red">
                ⚠️ WRONG GUESS = INSTANT LOSS
              </p>
              <p className="text-[10px] text-cricket-red/70">
                Choose carefully — you only get one shot!
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {candidateLabel && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-cricket-gold/80 mb-1">
                {candidateLabel}
              </p>
            )}
            <p className="text-xs text-cricket-gold/50 mb-3">
              {availableChars.length} players remaining — select who you
              think is your opponent's secret player:
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableChars.map((player) => {
                const isSelected = selected === player.id;
                const config = getRarityConfig(player.rarity);

                return (
                  <motion.button
                    key={player.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(player.id)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 text-left bg-cricket-dark/60 ${
                      isSelected
                        ? "border-cricket-green shadow-lg shadow-cricket-green/30 ring-2 ring-cricket-green/30"
                        : `${config.border} hover:border-cricket-green/60`
                    }`}
                  >
                    <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-cricket-gold/10 bg-cricket-dark/90">
                      <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-cricket-gold">
                        {getCountryCode(player.country)}
                      </span>
                      <span className="text-[9px] leading-none">{player.flag}</span>
                    </div>
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <CharacterImage
                        url={player.image}
                        name={player.name}
                        themeColor={config.color}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="px-1.5 py-1 border-t border-cricket-gold/10 bg-cricket-dark/80">
                      <span className="block text-[8px] sm:text-[10px] font-bold text-cricket-cream/90 truncate">
                        {player.name}
                      </span>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-cricket-green flex items-center justify-center shadow-lg z-10"
                      >
                        <Check className="w-3 h-3 text-cricket-dark" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-cricket-gold/10 bg-cricket-dark/60">
            {selectedChar ? (
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-md overflow-hidden border border-cricket-gold/40 flex-shrink-0 bg-cricket-dark/60">
                    <CharacterImage
                      url={selectedChar.image}
                      name={selectedChar.name}
                      themeColor="#fbbf24"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-cricket-cream truncate">
                      {selectedChar.flag} {selectedChar.name}
                    </p>
                    <p className="text-[10px] text-cricket-gold/60 truncate">
                      {selectedChar.country} • {selectedChar.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-cricket-gold/60 text-sm transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-dark font-bold text-sm shadow-lg shadow-cricket-green/20 transition duration-300 transform hover:scale-105"
                  >
                    <Target className="w-4 h-4" />
                    Confirm Guess
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-cricket-gold/50">
                  Select a player above to make your guess
                </p>
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-cricket-gold/60 text-sm transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}