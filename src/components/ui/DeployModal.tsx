import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Character, RoleId, SlottedTeam } from "../../types";
import { ROLE_CATEGORIES } from "../../data/roles";
import { X, Plus } from "lucide-react";
import CharacterImage from "../common/CharacterImage";
import { RoleIcon } from "../common/RoleIcon";
import { getRoleFitScore, getRoleSuitabilityLabel } from "../../utils/roleUtils";

interface DeployModalProps {
  character: Character;
  slots: SlottedTeam;
  onSelect: (roleId: RoleId) => void;
  onClose: () => void;
}

export default function DeployModal({ character, slots, onSelect, onClose }: DeployModalProps) {
  // Prevent clicks from reaching background
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <motion.div
        onClick={handleContentClick}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative w-full max-w-lg overflow-hidden nexus-glass border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6"
      >
        {/* Header / Title */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-nexus-cyan animate-pulse shadow-[0_0_8px_#00e5ff]" />
              Deploy Tactical Asset
            </h3>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              Select position for {character.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/5 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character Quick Info */}
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
            <CharacterImage
              url={character.image}
              name={character.name}
              fallbackUrl={character.malFallbackUrl}
              themeColor={character.themeColor}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[8px] font-mono font-bold text-nexus-cyan uppercase tracking-widest">
              {character.anime}
            </span>
            <h4 className="text-base font-black text-white uppercase truncate tracking-tight">
              {character.name}
            </h4>
            <div className="flex gap-2 items-center mt-1">
              <span className="text-[9px] font-mono font-black text-amber-400 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {character.signatureEmoji} CLASSIFIED
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-400">
                {character.rarity}
              </span>
            </div>
          </div>
        </div>

        {/* Slots Grid */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">
            Available Positions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLE_CATEGORIES.map((role) => {
              const occupant = slots[role.id];
              const isOccupied = !!occupant;
              const fitScore = getRoleFitScore(character, role.id);
              const fitLabel = getRoleSuitabilityLabel(fitScore);

              return (
                <button
                  key={role.id}
                  disabled={isOccupied}
                  onClick={() => onSelect(role.id)}
                  className={`
                    w-full relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 touch-manipulation
                    ${isOccupied
                      ? "border-white/5 bg-white/2 cursor-not-allowed opacity-50"
                      : role.id === "traitor"
                        ? "border-red-500/40 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20 active:scale-98 cursor-pointer group shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : "border-nexus-blue/30 bg-nexus-blue/5 hover:border-nexus-cyan/60 hover:bg-nexus-cyan/10 active:scale-98 cursor-pointer group shadow-[0_0_15px_rgba(30,144,255,0.1)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`
                      p-2 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isOccupied 
                        ? "bg-white/5 border border-white/5 text-slate-500" 
                        : role.id === "traitor"
                          ? "bg-red-500/20 border border-red-500/30 text-red-400 group-hover:text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          : "bg-nexus-blue/15 border border-nexus-blue/20 text-nexus-cyan group-hover:text-nexus-cyan shadow-[0_0_10px_rgba(0,229,255,0.05)]"
                      }
                    `}>
                      <RoleIcon id={role.id} className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className={`text-xs font-black uppercase tracking-wider ${isOccupied ? "text-slate-500" : role.id === "traitor" ? "text-red-300" : "text-white"}`}>
                        {role.name} {role.id === "traitor" && "(Enemy gets pts)"}
                      </p>
                      {isOccupied ? (
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          Filled by {occupant.name}
                        </p>
                      ) : (
                        <p className={`text-[9px] font-mono ${fitScore >= 70 ? "text-emerald-300" : fitScore >= 58 ? "text-amber-300" : "text-red-300"}`}>
                          Fit {fitScore} · {fitLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isOccupied && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all ${
                      role.id === "traitor"
                        ? "bg-red-500/20 border border-red-500/30 text-red-400 group-hover:bg-red-500 group-hover:text-white"
                        : "bg-nexus-cyan/10 border border-nexus-cyan/20 text-nexus-cyan group-hover:bg-nexus-cyan group-hover:text-black"
                    }`}>
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 text-[9px] font-mono text-slate-500 uppercase tracking-widest border-t border-white/5">
          Deploying slots finishes your current turn.
        </div>
      </motion.div>
    </div>
  );
}
