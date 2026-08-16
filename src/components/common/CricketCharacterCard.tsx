import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CricketPlayer } from "../../types";
import { getRarityConfig, getRarityStars, STAT_LABELS, getRoleBadge } from "../../utils/cricketStats";
import { ARCHETYPE_EMOJI } from "../../utils/playerValueModel";
import CharacterImage from "./CharacterImage";

interface CricketCharacterCardProps {
  player: CricketPlayer;
  isFlipped: boolean;
  activePlayerName?: string;
  activeTurn?: "p1" | "p2";
  onFlipComplete?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClickBackSide?: () => void;
  isSelected?: boolean;
  onTapSelect?: () => void;
  isCompact?: boolean;
  onTouchDrop?: (roleId: string) => void;
  sizeClass?: string;
  showFullStats?: boolean;
}

export default function CricketCharacterCard({
  player,
  isFlipped,
  activePlayerName = "Captain",
  activeTurn = "p1",
  onFlipComplete,
  onDragStart,
  onDragEnd,
  onClickBackSide,
  isSelected = false,
  onTapSelect,
  isCompact = false,
  onTouchDrop,
  sizeClass,
  showFullStats = false,
}: CricketCharacterCardProps) {
  
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [hoverX, setHoverX] = React.useState(0);
  const [hoverY, setHoverY] = React.useState(0);
  const [isMobileDevice, setIsMobileDevice] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(
        window.innerWidth < 1024 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    setIsSpinning(false);
  }, [player.id]);

  const handleBackClick = () => {
    if (isSpinning || !isFlipped) return;
    setIsSpinning(true);
    if (onClickBackSide) onClickBackSide();
    setTimeout(() => setIsSpinning(false), 750);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFlipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setHoverX(x);
    setHoverY(y);
  };

  const config = getRarityConfig(player.rarity);
  const rarityStars = getRarityStars(player.rarity);
  const roleBadge = getRoleBadge(player.role);

  const ghostRef = React.useRef<HTMLDivElement | null>(null);
  const isDraggingRef = React.useRef(false);
  const touchStartPos = React.useRef({ x: 0, y: 0 });
  const lastHighlighted = React.useRef<Element | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFlipped || !isMobileDevice || !onTouchDrop) return;
    e.preventDefault();
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isFlipped || !isMobileDevice || !onTouchDrop) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 10) {
      isDraggingRef.current = true;
      const ghost = document.createElement('div');
      ghost.id = 'touch-drag-ghost';
      ghost.style.cssText = `
        position: fixed;
        width: 64px;
        height: 64px;
        border-radius: 12px;
        border: 2px solid #d4a817;
        box-shadow: 0 0 20px rgba(212,168,23,0.6), 0 0 40px rgba(212,168,23,0.3);
        background-size: cover;
        background-position: center top;
        background-image: url(${player.image});
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%) scale(1.1);
        transition: transform 0.1s;
        opacity: 0.95;
      `;
      document.body.appendChild(ghost);
      ghostRef.current = ghost;
    }

    if (isDraggingRef.current && ghostRef.current) {
      e.preventDefault();
      ghostRef.current.style.left = touch.clientX + 'px';
      ghostRef.current.style.top = touch.clientY + 'px';

      ghostRef.current.style.display = 'none';
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      ghostRef.current.style.display = '';

      if (lastHighlighted.current) {
        lastHighlighted.current.classList.remove('touch-drag-hover');
        lastHighlighted.current = null;
      }

      if (el) {
        const slot = el.closest('[data-role-id]');
        if (slot && !slot.getAttribute('data-occupied')) {
          slot.classList.add('touch-drag-hover');
          lastHighlighted.current = slot;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) {
      if (isMobileDevice && !isFlipped && onTapSelect) {
        onTapSelect();
      }
      return;
    }

    isDraggingRef.current = false;

    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }

    if (lastHighlighted.current) {
      lastHighlighted.current.classList.remove('touch-drag-hover');
      lastHighlighted.current = null;
    }

    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const slot = el.closest('[data-role-id]');
      if (slot && !slot.getAttribute('data-occupied') && onTouchDrop) {
        const roleId = slot.getAttribute('data-role-id');
        if (roleId) onTouchDrop(roleId);
      }
    }
  };

  const handleCardTap = () => {
    if (isMobileDevice && !isFlipped && onTapSelect) {
      onTapSelect();
    }
  };

  const starIcon = player.rarity === "Legendary" ? "★" : player.rarity === "Epic" ? "◆" : player.rarity === "Rare" ? "●" : "○";

  const vm = player.valueModel;
  const confidenceColor: Record<string, string> = {
    High: "text-emerald-400 border-emerald-400/40",
    Medium: "text-amber-400 border-amber-400/40",
    Low: "text-slate-400 border-slate-400/40",
  };
  const vmChips = vm
    ? [
        { label: "Q", value: vm.quality, color: "text-amber-400" },
        { label: "I", value: vm.impact, color: "text-cyan-400" },
        { label: "TV", value: vm.teamValue, color: "text-emerald-400" },
        { label: "X", value: vm.xFactor, color: "text-purple-400" },
      ]
    : [];

  const O = player.careerStats?.ODI, T = player.careerStats?.T20I;
  const totMatches = (O?.matches || 0) + (T?.matches || 0);
  const totRuns = (O?.runs || 0) + (T?.runs || 0);
  const totWkts = (O?.wickets || 0) + (T?.wickets || 0);
  const totInnings = (O?.innings || 0) + (T?.innings || 0);
  const careerAvg = totInnings > 0 ? Math.round((totRuns / totInnings) * 100) / 100 : 0;
  const fmtRuns = (r: number) => r >= 1000 ? `${(r / 1000).toFixed(1)}k` : String(r);
  const careerChips = totMatches > 0
    ? [
        { label: "M", value: String(totMatches), color: "text-white" },
        { label: "RUNS", value: fmtRuns(totRuns), color: "text-amber-300" },
        { label: "WKTS", value: String(totWkts), color: "text-red-300" },
        { label: "AVG", value: totInnings > 0 ? careerAvg.toFixed(1) : "—", color: "text-cyan-300" },
      ]
    : [];

  return (
    <div 
      className={`relative ${sizeClass ?? `${isCompact ? 'w-[130px] h-[230px]' : 'w-[160px] h-[286px]'} sm:w-[260px] sm:h-[460px] md:w-[340px] md:h-[600px]`} perspective-1000 z-10 select-none group transition-transform duration-300 ${isSelected ? 'scale-105' : ''}`}
      style={{ touchAction: isMobileDevice && onTouchDrop ? "none" : undefined }}
      onMouseMove={handleMouseMove}
      onClick={handleCardTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isSelected && (
        <div className="absolute -inset-2 rounded-3xl border-2 border-cricket-gold shadow-[0_0_30px_rgba(212,168,23,0.5),inset_0_0_30px_rgba(212,168,23,0.1)] animate-pulse pointer-events-none z-50" />
      )}
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={isSpinning ? { rotateY: [180, 360, 540, 720] } : { rotateY: isFlipped ? 180 : 0 }}
        transition={isSpinning ? { duration: 0.75, ease: "easeInOut" } : { duration: 0.6, ease: "easeOut" }}
        style={{
          rotateX: !isFlipped ? (hoverY - 0.5) * -15 : 0,
          rotateY: !isFlipped ? (hoverX - 0.5) * 15 : (isSpinning ? undefined : 180),
        }}
        onAnimationComplete={() => {
          if (!isFlipped && onFlipComplete) onFlipComplete();
        }}
      >
        {/* FRONT SIDE */}
        <div
          draggable={!isFlipped && !isMobileDevice}
          onDragStart={(e) => {
            if (isFlipped || isMobileDevice) {
              e.preventDefault();
              return;
            }
            if (onDragStart) onDragStart(e);
          }}
          onDragEnd={onDragEnd}
          className={`absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-b ${config.bg} border-2 ${config.border} ${config.glow} backface-hidden overflow-hidden flex flex-col ${isCompact ? 'p-1.5' : 'p-2 sm:p-4'} ${isFlipped ? "pointer-events-none" : isMobileDevice ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
          <div 
            className="absolute inset-0 z-20 pointer-events-none opacity-40 mix-blend-overlay"
            style={{
              background: `radial-gradient(circle at ${hoverX * 100}% ${hoverY * 100}%, ${config.color}33, transparent 60%)`
            }}
          />
          
          <div className="absolute inset-0 opacity-10 pitch-pattern pointer-events-none" />

          <div className={`flex justify-between items-center ${isCompact ? 'mb-1' : 'mb-1.5 sm:mb-2'} z-30`}>
            <div className={`${isCompact ? 'px-1 py-0' : 'px-1.5 py-0.5 sm:px-2 sm:py-1'} rounded-md border ${config.border} bg-black/60 backdrop-blur-md flex items-center gap-1 sm:gap-1.5`}>
              <span className={`${isCompact ? 'w-2 h-2' : 'w-2 h-2 sm:w-2.5 sm:h-2.5'} ${config.text} animate-pulse`}>{starIcon}</span>
              <span className={`${isCompact ? 'text-[6px]' : 'text-[7px] sm:text-[9px]'} font-black tracking-[0.2em] uppercase ${config.text}`}>
                {player.rarity}
              </span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${i < rarityStars ? config.text : 'bg-white/10'} shadow-sm`} />
              ))}
            </div>
          </div>

          <div className={`relative w-full ${isCompact ? 'h-[125px]' : 'h-[168px] sm:h-[260px] md:h-[350px]'} rounded-xl border border-white/10 overflow-hidden bg-black/40 group/portrait z-10 flex items-center justify-center ${isCompact ? 'mb-1' : 'mb-1.5 sm:mb-2'}`}>
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div
                className="w-full h-[2px] opacity-50 absolute animate-cricket-scan"
                style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }}
              />
            </div>

            <CharacterImage 
              url={player.image}
              name={player.name}
              themeColor={config.color}
              layoutId={`cricket-char-image-${player.id}`}
              className="w-full h-full"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
            
            <div className={`absolute ${isCompact ? 'top-1 left-1' : 'top-1.5 left-1.5 sm:top-2 sm:left-2'} bg-black/60 backdrop-blur-md ${isCompact ? 'px-1' : 'px-1.5 py-0.5'} rounded border border-white/10 z-20`}>
              <span className={`${isCompact ? 'text-[6px]' : 'text-[7px] sm:text-[9px]'} font-mono font-bold text-white/70`}>
                {player.flag} {player.country}
              </span>
            </div>

            <div className={`absolute ${isCompact ? 'top-1 right-1' : 'top-1.5 right-1.5 sm:top-2 sm:right-2'} z-20`}>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 ${isCompact ? 'text-[6px]' : 'text-[7px] sm:text-[9px]'} font-mono font-bold text-white/90`}>
                {roleBadge.emoji} {roleBadge.label}
              </span>
            </div>

            {player.countryLogo ? (
              <img
                src={player.countryLogo}
                alt={`${player.country} cricket board logo`}
                loading="lazy"
                className={isCompact ? 'absolute bottom-1 right-1 w-6 h-6 object-contain' : 'absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-10 h-10 sm:w-11 sm:h-11 object-contain'}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}

            <div className={`absolute ${isCompact ? 'bottom-1 left-1 right-1' : 'bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2'} z-20`}>
               <p className={`${isCompact ? 'text-[5px]' : 'text-[6px] sm:text-[7px]'} font-mono font-bold uppercase tracking-[0.3em] ${config.text} opacity-90 mb-0.5`}>
                {player.battingStyle} \u2022 {player.bowlingStyle || "\u2014"}
              </p>
              <h3 className={`${isCompact ? 'text-[10px]' : 'text-xs sm:text-base md:text-xl'} font-black text-white uppercase tracking-tighter leading-none cricket-glow-text`}>
                {player.name}
              </h3>
            </div>
          </div>

          <div className={`grid grid-cols-3 ${isCompact ? 'gap-0.5 mb-1' : 'gap-1 sm:gap-1.5 mb-1.5 sm:mb-2'} z-30`}>
            {STAT_LABELS.slice(0, 3).map((s, idx) => (
              <div key={idx} className={`flex items-center justify-between bg-white/5 border border-white/5 ${isCompact ? 'p-0.5 px-1' : 'p-0.5 sm:p-1'} rounded-lg backdrop-blur-sm group-hover:border-white/10 transition-colors`}>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className={`${isCompact ? 'text-[8px]' : 'text-[10px] sm:text-[12px]'} ${s.color}`}>{s.icon}</span>
                  <span className={`${isCompact ? 'text-[5px]' : 'text-[6px] sm:text-[7px]'} font-mono font-bold text-slate-400`}>{s.label}</span>
                </div>
                <span className={`${isCompact ? 'text-[7px]' : 'text-[8px] sm:text-[10px]'} font-black text-white`}>{player.gameStats[s.key]}</span>
              </div>
            ))}
          </div>

          {showFullStats && !isCompact && (
            <div className={`grid grid-cols-2 ${isCompact ? 'gap-0.5 mb-1' : 'gap-1 sm:gap-1.5 mb-1.5 sm:mb-2'} z-30`}>
              {STAT_LABELS.slice(3).map((s, idx) => (
                <div key={idx} className={`flex items-center justify-between bg-white/5 border border-white/5 ${isCompact ? 'p-0.5 px-1' : 'p-0.5 sm:p-1'} rounded-lg backdrop-blur-sm group-hover:border-white/10 transition-colors`}>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className={`${isCompact ? 'text-[8px]' : 'text-[10px] sm:text-[12px]'} ${s.color}`}>{s.icon}</span>
                    <span className={`${isCompact ? 'text-[5px]' : 'text-[6px] sm:text-[7px]'} font-mono font-bold text-slate-400`}>{s.label}</span>
                  </div>
                  <span className={`${isCompact ? 'text-[7px]' : 'text-[8px] sm:text-[10px]'} font-black text-white`}>{player.gameStats[s.key]}</span>
                </div>
              ))}
            </div>
          )}

          {vm && (
            <div className={`${isCompact ? 'mb-1' : 'mb-1.5 sm:mb-2'} z-30 space-y-1`}>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 backdrop-blur-sm">
                <span className={`text-[6px] sm:text-[8px] font-mono font-black uppercase tracking-[0.2em] ${isCompact ? 'text-[5px]' : ''} text-slate-300 truncate`}>
                  {ARCHETYPE_EMOJI[vm.archetype]} {vm.archetypeLabel}
                </span>
                <span className={`border rounded px-1 text-[6px] sm:text-[8px] font-mono font-black uppercase tracking-widest ${confidenceColor[vm.confidence]}`}>
                  {vm.confidence}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-0.5 sm:gap-1">
                {vmChips.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-1 py-0.5 sm:px-1.5 sm:py-1 backdrop-blur-[2px]">
                    <span className="text-[5px] sm:text-[7px] font-mono font-bold text-slate-500">{c.label}</span>
                    <span className={`text-[7px] sm:text-[10px] font-black ${c.color}`}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {careerChips.length > 0 && (
            <div className={`${isCompact ? 'mb-1' : 'mb-1.5 sm:mb-2'} z-30 grid grid-cols-4 gap-0.5 sm:gap-1`}>
              {careerChips.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-1 py-0.5 sm:px-1.5 sm:py-1 backdrop-blur-[2px]">
                  <span className="text-[5px] sm:text-[7px] font-mono font-bold text-slate-500">{c.label}</span>
                  <span className={`text-[7px] sm:text-[10px] font-black ${c.color}`}>{c.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto relative z-30 bg-black/40 border border-white/5 rounded-xl p-1 sm:p-1.5 md:p-2 backdrop-blur-md overflow-hidden group/lore">
            <div className={`absolute top-0 left-0 w-1 h-full ${config.text}`} style={{ backgroundColor: config.color }} />
            <p className="text-[7px] sm:text-[8px] md:text-[9px] leading-tight sm:leading-relaxed text-slate-300 font-medium italic line-clamp-2">
              {player.quote || player.description}
            </p>
          </div>

          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent opacity-20 rotate-45 translate-x-10 -translate-y-10" />
        </div>

        {/* BACK SIDE */}
        <div 
          onClick={handleBackClick}
          className={`absolute inset-0 w-full h-full rounded-2xl bg-cricket-dark border-2 border-cricket-gold/30 backface-hidden rotate-y-180 shadow-[0_0_30px_rgba(212,168,23,0.2)] flex items-center justify-center overflow-hidden ${isFlipped && !isSpinning ? "cursor-pointer group-hover:border-cricket-gold/50" : "pointer-events-none"}`}
        >
          <div className="absolute inset-0 z-[100]" />

          <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-8">
            <div className="absolute inset-0 opacity-20 pitch-pattern" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 sm:w-64 sm:h-64 border border-cricket-gold/10 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
              <div className="w-28 h-28 sm:w-48 sm:h-48 border border-cricket-red/10 rounded-full animate-pulse" />
            </div>

            <div className="relative z-10 w-full flex justify-between items-center">
              <div className="text-[7.5px] sm:text-[9px] font-mono font-black text-cricket-gold/50 tracking-widest uppercase">Player Card</div>
              <div className="flex gap-1">
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-cricket-gold animate-pulse" />
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-cricket-gold animate-pulse delay-75" />
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-cricket-gold animate-pulse delay-150" />
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-6 md:gap-8">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 md:w-32 rounded-3xl border-2 border-cricket-gold/30 rotate-45 animate-cricket-float flex items-center justify-center bg-cricket-green/5 shadow-[0_0_20px_rgba(212,168,23,0.1)]">
                  <div className="w-13 h-13 sm:w-16 md:w-20 rounded-2xl border border-cricket-red/40 -rotate-45 flex items-center justify-center bg-black/40 backdrop-blur-xl">
                    <span className="w-6 h-6 sm:w-7 md:w-10 text-cricket-gold drop-shadow-[0_0_10px_rgba(212,168,23,0.8)]" style={{fontSize: '1.5rem'}}>🏏</span>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1.5 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-[0.1em] font-serif cricket-glow-text uppercase leading-none">
                  Cricket XI
                </h2>
                <div className="inline-flex items-center gap-1.5 bg-cricket-green/10 border border-cricket-green/20 px-2.5 py-0.5 sm:px-4 sm:py-1 rounded-full">
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cricket-gold animate-ping" />
                  <span className="text-[7.5px] sm:text-[10px] text-cricket-gold font-mono font-black tracking-widest uppercase">Ready to Play</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 w-full cricket-card bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4 text-center">
              <p className="text-[7.5px] sm:text-[10px] text-cricket-gold font-mono uppercase tracking-[0.35em] mb-1 sm:mb-2 font-black">Select Player</p>
              <h4 className="text-xs sm:text-sm font-black text-white tracking-widest uppercase truncate max-w-[120px] sm:max-w-none mx-auto">
                {activePlayerName}
              </h4>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}