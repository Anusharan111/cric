import React from "react";
import { motion } from "motion/react";
import { Shield, Star } from "lucide-react";
import { CricketPlayer } from "../../types";
import { getRarityConfig, getRoleBadge, getCountryCode } from "../../utils/cricketStats";
import CharacterImage from "../../components/common/CharacterImage";

interface GWSecretCardProps {
  character: CricketPlayer;
}

export default function GWSecretCard({ character }: GWSecretCardProps) {
  const config = getRarityConfig(character.rarity);
  const roleBadge = getRoleBadge(character.role);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative"
    >
      <motion.div
        animate={{
          boxShadow: [
            "0 0 15px rgba(212, 168, 23, 0.15), 0 0 30px rgba(212, 168, 23, 0.05)",
            "0 0 25px rgba(212, 168, 23, 0.3), 0 0 50px rgba(212, 168, 23, 0.1)",
            "0 0 15px rgba(212, 168, 23, 0.15), 0 0 30px rgba(212, 168, 23, 0.05)",
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-xl border-2 border-cricket-gold/50 bg-cricket-dark/70 cricket-glass overflow-hidden"
      >
<div className="px-3 py-1.5 bg-cricket-gold/10 border-b border-cricket-gold/20 flex items-center justify-between">
          <span className="text-[11px] font-black tracking-[0.2em] text-cricket-gold">
            {getCountryCode(character.country)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-cricket-gold flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Your Secret Player
          </span>
        </div>

        <div className="flex gap-3 p-3">
          <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border border-cricket-gold/30 flex-shrink-0">
            <CharacterImage
              url={character.image}
              name={character.name}
              themeColor={config.color}
              className="w-full h-full"
            />
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-cricket-cream truncate">
              {character.flag} {character.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-cricket-gold/60 truncate">
              {character.country} • {roleBadge.emoji} {roleBadge.label}
            </p>

            <div className="mt-2 flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${config.text} bg-black/40 border border-white/10`}
              >
                <Star className="w-2.5 h-2.5" />
                {character.rarity}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}