import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { RoleId, SlottedTeam } from "../../types";
import { ROLE_CATEGORIES } from "../../data/roles";
import { Zap } from "lucide-react";
import { RoleIcon } from "./RoleIcon";
import CharacterImage from "./CharacterImage";

interface TeamSlotsProps {
  allowedCountries?: string[];
  playerName: string;
  isAI?: boolean;
  slots: SlottedTeam;
  skipUsed: boolean;
  activeTurn: boolean;
  onSlotSelect?: (roleId: RoleId) => void;
  isDraggingActive?: boolean;
  layout?: "standard" | "compact-vertical" | "compact-horizontal" | "compact-horizontal-top";
  isMobile?: boolean;
  selectedCardId?: string | null;
  isLarge?: boolean;
  hideSkipIndicator?: boolean;
  slotClass?: string;
  slotSide?: "p1" | "p2";
  captainRoleId?: RoleId | null;
  viceCaptainRoleId?: RoleId | null;
  wicketkeeperRoleId?: RoleId | null;
  onSetCaptain?: (roleId: RoleId) => void;
  onSetViceCaptain?: (roleId: RoleId) => void;
  onSetWicketkeeper?: (roleId: RoleId) => void;
  onClearCaptain?: () => void;
  onClearViceCaptain?: () => void;
  onClearWicketkeeper?: () => void;
  captaincyInteractive?: boolean;
  awaitingCaptaincy?: boolean;
}

export default function TeamSlots({
  playerName,
  allowedCountries,
  isAI = false,
  slots,
  skipUsed,
  activeTurn,
  onSlotSelect,
  isDraggingActive = false,
  layout = "standard",
  isMobile = false,
  selectedCardId = null,
  isLarge = false,
  hideSkipIndicator = false,
  slotClass = "h-32",
  slotSide,
  captainRoleId = null,
  viceCaptainRoleId = null,
  wicketkeeperRoleId = null,
  onSetCaptain,
  onSetViceCaptain,
  onSetWicketkeeper,
  onClearCaptain,
  onClearViceCaptain,
  onClearWicketkeeper,
  captaincyInteractive = false,
  awaitingCaptaincy = false,
}: TeamSlotsProps) {
  const handleDragOver = (e: React.DragEvent) => {
    // During awaitingCaptaincy, allow captain badge drags even if not active turn
    if (awaitingCaptaincy && captaincyInteractive) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      return;
    }
    if (!activeTurn || isAI || layout === "compact-horizontal" || layout === "compact-horizontal-top") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, roleId: RoleId) => {
    const isCaptainDrag = e.dataTransfer?.types.includes("application/x-captain");
    const isViceDrag = e.dataTransfer?.types.includes("application/x-vice-captain");
    const isWkDrag = e.dataTransfer?.types.includes("application/x-wicketkeeper");
    
    // During awaitingCaptaincy, allow captain/VC/WK badge drops even if not active turn
    if (awaitingCaptaincy && captaincyInteractive && (isCaptainDrag || isViceDrag || isWkDrag)) {
      e.preventDefault();
      if (!slots[roleId]) return;
      if (isCaptainDrag && !captainRoleId && onSetCaptain) onSetCaptain(roleId);
      if (isViceDrag && !viceCaptainRoleId && onSetViceCaptain) onSetViceCaptain(roleId);
      if (isWkDrag && !wicketkeeperRoleId && onSetWicketkeeper) onSetWicketkeeper(roleId);
      return;
    }
    
    if (!activeTurn || isAI || layout === "compact-horizontal" || layout === "compact-horizontal-top") return;
    e.preventDefault();
    if (isCaptainDrag || isViceDrag || isWkDrag) {
      if (!slots[roleId]) return;
      if (isCaptainDrag && !captainRoleId && onSetCaptain) onSetCaptain(roleId);
      if (isViceDrag && !viceCaptainRoleId && onSetViceCaptain) onSetViceCaptain(roleId);
      if (isWkDrag && !wicketkeeperRoleId && onSetWicketkeeper) onSetWicketkeeper(roleId);
      return;
    }
    if (onSlotSelect) onSlotSelect(roleId);
  };

  const isCompact = layout === "compact-vertical" || layout === "compact-horizontal" || layout === "compact-horizontal-top";
  const showCompactLabels = layout === "compact-vertical" && isMobile && isLarge;
  const filledRoleCount = ROLE_CATEGORIES.filter((role) => Boolean(slots[role.id])).length;

  const CaptainBadge: React.FC<{ roleId: RoleId }> = ({ roleId }) => {
    if (captainRoleId === roleId) {
      return (
        <div
          title="Captain (locked)"
          className="absolute top-0.5 left-0.5 z-30 w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.8)] border border-amber-200"
        >
          C
        </div>
      );
    }
    if (viceCaptainRoleId === roleId) {
      return (
        <div
          title="Vice Captain (locked)"
          className="absolute top-0.5 left-0.5 z-30 w-5 h-5 rounded-full bg-slate-300 text-slate-900 text-[7px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(203,213,225,0.8)] border border-white"
        >
          VC
        </div>
      );
    }
    if (wicketkeeperRoleId === roleId) {
      return (
        <div
          title="Wicketkeeper (locked)"
          className="absolute top-0.5 right-0.5 z-30 w-5 h-5 rounded-full bg-emerald-500 text-black text-[8px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.8)] border border-emerald-200"
        >
          WK
        </div>
      );
    }
    return null;
  };

  return (
    <div data-slot-side={slotSide} className={`flex flex-col gap-2.5 h-full ${activeTurn || awaitingCaptaincy ? 'opacity-100' : 'opacity-60'} transition-all duration-500 ${isMobile && layout === "compact-vertical" ? 'bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl' : ''}`}>
      {/* Player Identity Header */}
      {!isCompact ? (
        <div className="nexus-glass rounded-xl p-4 border-l-4 border-nexus-blue flex flex-col gap-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-nexus-blue/10 to-transparent pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-mono font-black text-nexus-cyan/70 tracking-widest uppercase">
              {isAI ? "Automated Combatant" : "Field Commander"}
            </span>
            {activeTurn && (
              <div className="flex items-center gap-1.5 bg-nexus-blue/20 px-2 py-0.5 rounded border border-nexus-blue/30 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-nexus-cyan shadow-[0_0_8px_#00e5ff]" />
                <span className="text-[8px] font-mono font-black text-nexus-cyan">UPLINK ACTIVE</span>
              </div>
            )}
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight truncate nexus-glow-text">
            {playerName}
          </h3>
            {allowedCountries && allowedCountries.length > 0 && (
              <p className="text-[9px] font-mono text-slate-400 truncate">
                {allowedCountries.join(', ')}
              </p>
            )}
          <div className="flex gap-2 mt-1">
            <div className={`h-1 flex-1 rounded-full bg-white/10 overflow-hidden`}>
               <motion.div 
                 className="h-full bg-nexus-blue" 
                 initial={{ width: 0 }}
                 animate={{ width: `${(filledRoleCount / ROLE_CATEGORIES.length) * 100}%` }}
               />
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-500">{filledRoleCount}/{ROLE_CATEGORIES.length}</span>
          </div>
        </div>
      ) : (
        /* Compact Vertical/Horizontal Title label */
        (layout === "compact-vertical" || layout === "compact-horizontal-top") && (
          <div className={`text-center py-1 bg-black/60 border border-white/10 rounded-lg w-full flex flex-col items-center justify-center gap-0.5 shadow-md overflow-hidden ${layout === "compact-horizontal-top" ? 'max-w-[80px]' : ''}`}>
            <span className="text-[7.5px] font-mono font-black text-slate-300 tracking-wider block truncate max-w-[55px] uppercase">
              {isAI ? "AI" : playerName.split(" ")[0]}
            </span>
            {activeTurn && (
              <span className="text-[6px] font-mono font-black text-nexus-cyan tracking-tighter uppercase animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
        )
      )}

      {/* Deployment Grid / Stack / Row */}
      <div className={`
        ${layout === "compact-horizontal" || layout === "compact-horizontal-top"
          ? "flex flex-row gap-1 justify-center" 
          : layout === "compact-vertical"
            ? `flex flex-col ${showCompactLabels ? "gap-1.5" : "gap-2"} flex-1 justify-center items-center`
            : "grid grid-cols-4 gap-2 flex-1"
        }
      `}>
{ROLE_CATEGORIES.map((role) => {
          const char = slots[role.id];
          const isOccupied = !!char;
          const isInteractive = activeTurn && !isAI && layout !== "compact-horizontal" && layout !== "compact-horizontal-top";
          const canDrop = isInteractive && isDraggingActive && !isOccupied;
          const canTapPlace = isInteractive && !!selectedCardId && !isOccupied;

          if (isCompact) {
            return (
              <div
                key={role.id}
                data-role-id={role.id}
                data-occupied={isOccupied ? 'true' : undefined}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, role.id)}
                onClick={() => isInteractive && onSlotSelect?.(role.id)}
                className={`
                  relative rounded-lg border transition-all duration-300 group touch-manipulation
                  ${layout === "compact-horizontal-top" ? 'w-10 h-10 sm:w-12 sm:h-12' : (isMobile ? (isLarge ? 'w-full h-[10vh] max-h-[68px] min-h-[48px]' : 'w-18 h-18 sm:w-22 sm:h-22') : 'w-11 h-11 sm:w-13 sm:h-13')}
                  ${isOccupied 
                    ? (role.id === "traitor"
                        ? 'border-red-500/50 bg-red-500/15 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                        : 'border-nexus-blue/40 bg-nexus-blue/10 shadow-[0_0_15px_rgba(30,144,255,0.15)]') 
                    : isInteractive 
                      ? (role.id === "traitor"
                          ? 'border-red-500/40 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)] active:scale-95'
                          : 'border-nexus-blue/30 bg-nexus-blue/5 hover:border-nexus-cyan/60 hover:bg-nexus-blue/15 cursor-pointer shadow-lg active:scale-95') 
                      : (role.id === "traitor"
                          ? 'border-red-500/20 bg-red-500/5 opacity-60'
                          : 'border-white/5 bg-white/5 opacity-50')
                  }
                `}
              >
                <AnimatePresence mode="wait">
                  {isOccupied ? (
                    <motion.div
                      key={`filled-compact-${char.id}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 p-0.5 flex flex-col justify-between"
                    >
                      <CaptainBadge roleId={role.id} />
                      <div className="relative flex-1 rounded overflow-hidden border border-white/5">
                        <CharacterImage
                          url={char.image}
                          name={char.name}
                          fallbackUrl={char.malFallbackUrl}
                          themeColor={char.themeColor}
                          layoutId={`slotted-${char.id}`}
                          className="w-full h-full object-cover object-top"
                        />
                        {/* Compact HUD Overlay showing rarity class */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-[1px] flex justify-center items-center">
                          <span className="text-[5.5px] font-mono font-black text-white leading-none">
                            {char.rarity}
                          </span>
                        </div>
                      </div>
                      
                      {/* Tiny Role Icon Badge */}
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded bg-black border flex items-center justify-center shadow-md z-20 ${role.id === "traitor" ? "border-red-500/40" : "border-nexus-blue/30"}`}>
                        <RoleIcon id={role.id} className={`w-1.5 h-1.5 ${role.id === "traitor" ? "text-red-400" : "text-nexus-cyan"}`} />
                      </div>
                      {showCompactLabels && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5 text-center">
                          <span className="block truncate text-[7px] font-mono font-black uppercase tracking-wide text-white">
                            {role.name}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5 text-center">
                      <RoleIcon id={role.id} className={`${layout === "compact-horizontal-top" ? 'w-3 h-3' : 'w-5 h-5'} ${role.id === "traitor" ? "text-red-400" : (canDrop || canTapPlace ? 'text-nexus-cyan' : 'text-slate-600')}`} />
                      {showCompactLabels && (
                        <span className={`mt-1 max-w-full px-1 text-[7px] font-mono font-black uppercase leading-tight ${role.id === "traitor" ? "text-red-400" : (canDrop || canTapPlace ? 'text-nexus-cyan' : 'text-slate-400')}`}>
                          {role.name}
                        </span>
                      )}
                      {canTapPlace && (
                        <span className={`text-[5px] font-mono font-black uppercase tracking-wider mt-0.5 animate-pulse ${role.id === "traitor" ? "text-red-400" : "text-nexus-cyan"}`}>TAP</span>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // Standard Grid slots for Desktop/large screen standard layouts
          return (
            <div
              key={role.id}
              data-role-id={role.id}
              data-occupied={isOccupied ? 'true' : undefined}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, role.id)}
              onClick={() => activeTurn && !isAI && onSlotSelect?.(role.id)}
              className={`
                relative ${slotClass} rounded-xl border-2 transition-all duration-300 group
                ${isOccupied 
                  ? (role.id === "traitor"
                      ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                      : 'border-nexus-blue/40 bg-nexus-blue/5 shadow-inner') 
                  : canDrop 
                    ? (role.id === "traitor"
                        ? 'border-red-500 animate-pulse bg-red-500/20 cursor-pointer scale-105 z-20 shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                        : 'border-nexus-cyan animate-nexus-pulse bg-nexus-cyan/10 cursor-pointer scale-105 z-20') 
                    : activeTurn && !isAI 
                      ? (role.id === "traitor"
                          ? 'border-red-500/30 bg-red-500/10 hover:border-red-500/80 hover:bg-red-500/20 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                          : 'border-nexus-blue/20 bg-nexus-blue/5 hover:border-nexus-cyan/50 hover:bg-nexus-blue/10 cursor-pointer') 
                      : (role.id === "traitor"
                          ? 'border-red-500/20 bg-red-500/5 opacity-60'
                          : 'border-white/5 bg-white/5 opacity-50')
                }
              `}
            >
              <AnimatePresence mode="wait">
                {isOccupied ? (
                  <motion.div
                    key={`filled-${char.id}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 p-1.5 flex flex-col"
                  >
                    <CaptainBadge roleId={role.id} />
                    <div className="relative flex-1 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                      <CharacterImage
                        url={char.image}
                        name={char.name}
                        fallbackUrl={char.malFallbackUrl}
                        themeColor={char.themeColor}
                        layoutId={`slotted-${char.id}`}
                        className="w-full h-full object-cover object-top brightness-90 group-hover:brightness-110 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      {/* Rarity overlay in mini card */}
                      <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                        <Zap className="w-2 h-2 text-nexus-cyan" />
                        <span className="text-[8px] font-mono font-black text-white">{char.rarity}</span>
                      </div>
                    </div>

                    <div className="mt-1 px-1 flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/90 uppercase tracking-tighter truncate max-w-[60px]">
                        {char.name.split(' ')[0]}
                      </span>
                      <div className="w-3 h-3 rounded bg-nexus-blue/20 flex items-center justify-center border border-nexus-blue/30">
                        <RoleIcon id={role.id} className="w-2 h-2 text-nexus-cyan" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                    <div className={`p-2 rounded-lg bg-white/5 border border-white/5 mb-2 transition-transform duration-300 ${canDrop ? 'scale-110' : 'group-hover:scale-110'}`}>
                      <RoleIcon id={role.id} className={`w-6 h-6 ${role.id === "traitor" ? "text-red-400" : (canDrop ? 'text-nexus-cyan' : 'text-slate-500')}`} />
                    </div>
                    <span className={`text-[10px] font-mono font-black uppercase tracking-wide ${role.id === "traitor" ? "text-red-400" : (canDrop ? 'text-nexus-cyan' : 'text-slate-500')}`}>
                      {role.name}
                    </span>
                    {canDrop && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="mt-1 flex flex-col items-center gap-0.5"
                      >
                        <span className="text-[7px] text-nexus-cyan/70 font-mono animate-bounce">
                          DEPLOY UNIT
                        </span>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>

              {/* Decorative Corner Lines */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/10 rounded-tl" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/10 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/10 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/10 rounded-br" />
            </div>
          );
        })}

        {/* Leadership & Roles Panel — fills the 12th grid cell, locked once assigned */}
        {!isCompact && (
          <div className="relative rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 p-1 overflow-hidden">
            <span className="text-[6.5px] font-mono font-black tracking-[0.2em] uppercase text-slate-500">
              Tactical Roles
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex flex-col items-center gap-0.5">
                <div
                  draggable={captaincyInteractive && !captainRoleId}
                  onDragStart={(e) => {
                    if (!captaincyInteractive || captainRoleId) { e.preventDefault(); return; }
                    e.dataTransfer.setData("application/x-captain", "1");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={captainRoleId ? "Captain locked for this team" : "Drag onto a filled player slot to name the CAPTAIN"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${captainRoleId
                    ? 'bg-amber-400 text-black border-amber-200 opacity-40 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                    : captaincyInteractive
                      ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-black border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.6)] cursor-grab active:cursor-grabbing hover:scale-110'
                      : 'bg-black/60 text-slate-500 border-white/10'}`}
                >
                  C
                </div>
                <span className={`max-w-[42px] truncate text-[5.5px] font-mono font-black uppercase leading-tight text-center ${captainRoleId ? 'text-amber-300' : 'text-slate-600'}`}>
                  {captainRoleId ? (slots[captainRoleId]?.name.split(" ")[0] || "?") : "SET"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div
                  draggable={captaincyInteractive && !viceCaptainRoleId}
                  onDragStart={(e) => {
                    if (!captaincyInteractive || viceCaptainRoleId) { e.preventDefault(); return; }
                    e.dataTransfer.setData("application/x-vice-captain", "1");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={viceCaptainRoleId ? "Vice captain locked for this team" : "Drag onto a filled player slot to name the VICE CAPTAIN"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[7.5px] font-black border transition-all ${viceCaptainRoleId
                    ? 'bg-slate-300 text-slate-900 border-white opacity-40 shadow-[0_0_10px_rgba(203,213,225,0.8)]'
                    : captaincyInteractive
                      ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 border-white shadow-[0_0_14px_rgba(203,213,225,0.5)] cursor-grab active:cursor-grabbing hover:scale-110'
                      : 'bg-black/60 text-slate-500 border-white/10'}`}
                >
                  VC
                </div>
                <span className={`max-w-[42px] truncate text-[5.5px] font-mono font-black uppercase leading-tight text-center ${viceCaptainRoleId ? 'text-slate-200' : 'text-slate-600'}`}>
                  {viceCaptainRoleId ? (slots[viceCaptainRoleId]?.name.split(" ")[0] || "?") : "SET"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div
                  draggable={captaincyInteractive && !wicketkeeperRoleId}
                  onDragStart={(e) => {
                    if (!captaincyInteractive || wicketkeeperRoleId) { e.preventDefault(); return; }
                    e.dataTransfer.setData("application/x-wicketkeeper", "1");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={wicketkeeperRoleId ? "Wicketkeeper locked for this team" : "Drag onto a filled player slot to name the WICKETKEEPER"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[7.5px] font-black border transition-all ${wicketkeeperRoleId
                    ? 'bg-emerald-500 text-black border-emerald-200 opacity-40 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                    : captaincyInteractive
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-black border-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.6)] cursor-grab active:cursor-grabbing hover:scale-110'
                      : 'bg-black/60 text-slate-500 border-white/10'}`}
                >
                  WK
                </div>
                <span className={`max-w-[42px] truncate text-[5.5px] font-mono font-black uppercase leading-tight text-center ${wicketkeeperRoleId ? 'text-emerald-300' : 'text-slate-600'}`}>
                  {wicketkeeperRoleId ? (slots[wicketkeeperRoleId]?.name.split(" ")[0] || "?") : "SET"}
                </span>
              </div>
            </div>
            {captaincyInteractive && (!captainRoleId || !viceCaptainRoleId || !wicketkeeperRoleId) && (
              <span className="text-[5px] font-mono font-black uppercase tracking-widest text-nexus-cyan/80 animate-pulse">
                Drag C / VC / WK
              </span>
            )}
            {captainRoleId && viceCaptainRoleId && wicketkeeperRoleId && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 text-[5.5px] font-mono font-black uppercase tracking-widest">
                <Zap className="w-2 h-2" /> LOCKED
              </span>
            )}
          </div>
        )}

      </div>

      {/* Strategic Skip Indicator */}
      {!isCompact && !hideSkipIndicator && (
        <div className={`nexus-glass rounded-xl p-3 border border-white/5 flex items-center justify-between transition-all ${skipUsed ? 'bg-red-500/5' : 'bg-nexus-purple/5 hover:border-nexus-purple/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${skipUsed ? 'bg-red-500/10' : 'bg-nexus-purple/10'}`}>
              <Zap className={`w-4 h-4 ${skipUsed ? 'text-red-400' : 'text-nexus-purple'}`} />
            </div>
            <div>
              <p className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Skip Status</p>
              <p className={`text-[10px] font-bold uppercase ${skipUsed ? 'text-red-400' : 'text-white'}`}>
                {skipUsed ? "Skip Used" : "Skip Available"}
              </p>
            </div>
          </div>
          {!skipUsed && activeTurn && !isAI && (
            <div className="w-1.5 h-1.5 rounded-full bg-nexus-purple animate-ping" />
          )}
        </div>
      )}
    </div>
  );
}
