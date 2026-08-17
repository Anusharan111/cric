import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Character, CricketPlayer, MatchType } from "../../types";
import { Swords, Shield, Zap, Sparkles, Brain, Trophy } from "lucide-react";
import CharacterImage from "./CharacterImage";

interface CharacterCardProps {
  character: Character;
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
  portraitClass?: string;
  matchType?: MatchType;
}

export default function CharacterCard({
  character,
  isFlipped,
  activePlayerName = "Commander",
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
  portraitClass,
  matchType,
}: CharacterCardProps) {
  
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

  // Reset spinning state when character changes
  React.useEffect(() => {
    setIsSpinning(false);
  }, [character.id]);

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

  const rarityConfig = {
    Legendary: {
      color: "#f59e0b",
      bg: "from-amber-900/40 via-black to-amber-950/40",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.3)]",
      border: "border-amber-500/50",
      text: "text-amber-400",
      foil: "rgba(245,158,11,0.15)"
    },
    Epic: {
      color: "#a855f7",
      bg: "from-purple-900/40 via-black to-indigo-950/40",
      glow: "shadow-[0_0_40px_rgba(168,85,247,0.3)]",
      border: "border-purple-500/50",
      text: "text-purple-400",
      foil: "rgba(168,85,247,0.15)"
    },
    Rare: {
      color: "#3b82f6",
      bg: "from-blue-900/40 via-black to-cyan-950/40",
      glow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]",
      border: "border-blue-500/50",
      text: "text-blue-400",
      foil: "rgba(59,130,246,0.15)"
    },
    Common: {
      color: "#94a3b8",
      bg: "from-slate-800/40 via-black to-slate-900/40",
      glow: "shadow-[0_0_20px_rgba(148,163,184,0.2)]",
      border: "border-slate-500/50",
      text: "text-slate-400",
      foil: "rgba(148,163,184,0.1)"
    }
  };

  const config = rarityConfig[character.rarity] || rarityConfig.Common;
  const rarityStars: Record<Character["rarity"], number> = {
    Common: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 4,
  };



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

    // Start drag after 10px movement
    if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 10) {
      isDraggingRef.current = true;
      // Create ghost
      const ghost = document.createElement('div');
      ghost.id = 'touch-drag-ghost';
      ghost.style.cssText = `
        position: fixed;
        width: 64px;
        height: 64px;
        border-radius: 12px;
        border: 2px solid #00e5ff;
        box-shadow: 0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.3);
        background-size: cover;
        background-position: center top;
        background-image: url(${character.image});
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

      // Highlight slot under finger
      ghostRef.current.style.display = 'none';
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      ghostRef.current.style.display = '';

      // Remove previous highlight
      if (lastHighlighted.current) {
        lastHighlighted.current.classList.remove('touch-drag-hover');
        lastHighlighted.current = null;
      }

      // Find slot
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
      // It was a tap, not a drag
      if (isMobileDevice && !isFlipped && onTapSelect) {
        onTapSelect();
      }
      return;
    }

    isDraggingRef.current = false;

    // Clean up ghost
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }

    // Clean up highlight
    if (lastHighlighted.current) {
      lastHighlighted.current.classList.remove('touch-drag-hover');
      lastHighlighted.current = null;
    }

    // Find slot under finger
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const slot = el.closest('[data-role-id]');
      if (slot && !slot.getAttribute('data-occupied') && onTouchDrop) {
        const roleId = slot.getAttribute('data-role-id');
        if (roleId) {
          onTouchDrop(roleId);
        }
      }
    }
  };

  const handleCardTap = () => {
    if (isMobileDevice && !isFlipped && onTapSelect) {
      onTapSelect();
    }
  };

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
      {/* Selected card glow ring */}
      {isSelected && (
        <div className="absolute -inset-2 rounded-3xl border-2 border-nexus-cyan shadow-[0_0_30px_rgba(0,229,255,0.5),inset_0_0_30px_rgba(0,229,255,0.1)] animate-pulse pointer-events-none z-50" />
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
          style={{
            background: [
              "radial-gradient(circle at 20% 15%, rgba(0,0,0,0.25), transparent 40%)",
              "radial-gradient(circle at 80% 85%, rgba(0,0,0,0.3), transparent 45%)",
              "linear-gradient(155deg, #8a6b48, #6b5138 55%, #4a3826)",
            ].join(", "),
            border: "1px solid rgba(217,169,74,0.35)",
            boxShadow: "0 10px 26px rgba(0,0,0,0.5)",
          }}
          className={`absolute inset-0 w-full h-full rounded-[14px] backface-hidden overflow-hidden flex flex-col p-0 ${isFlipped ? "pointer-events-none" : isMobileDevice ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
          {/* Photo area */}
          <div
            className={`relative w-full overflow-hidden ${isCompact ? 'h-[135px]' : 'h-[175px] sm:h-[260px] md:h-[340px]'}`}
            style={{ background: "linear-gradient(180deg, #7fb8d8, #3f6f8a)" }}
          >
            <CharacterImage
              url={character.image}
              name={character.name}
              fallbackUrl={character.malFallbackUrl}
              themeColor={character.themeColor}
              layoutId={`char-image-${character.id}`}
              className="w-full h-full object-cover object-top"
            />

            {/* Bottom gradient fade for text legibility (no white circle) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.75) 100%)",
              }}
            />

            {/* Rarity badge */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-md border border-[rgba(217,169,74,0.3)] bg-[rgba(12,20,16,0.6)] backdrop-blur-[3px] px-2 py-1">
              <span className="text-[8px] leading-none text-[#d9a94a]" aria-hidden>★</span>
              <span className="text-[8px] font-space-mono font-bold tracking-[0.5px] text-[#d9a94a] uppercase">
                {character.rarity}
              </span>
            </div>

            {/* Country logo / crest */}
            {character.cricketData?.countryLogo ? (
              <img
                src={character.cricketData.countryLogo}
                alt={`${character.cricketData.country} cricket board logo`}
                loading="eager"
                referrerPolicy="no-referrer"
                className={`absolute bottom-2 right-2 ${isCompact ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 sm:h-7'} object-contain z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : character.cricketData?.flag ? (
              <span className={`absolute bottom-2 right-2 ${isCompact ? 'text-sm' : 'text-base sm:text-lg'} leading-none z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]`} aria-hidden>
                {character.cricketData.flag}
              </span>
            ) : (
              <span className="absolute bottom-2 right-2 text-sm z-20" aria-hidden>🏏</span>
            )}

            {/* Player Name */}
            <h3 className={`absolute bottom-1.5 left-2 right-10 z-20 font-teko font-bold text-[#f2ecd9] leading-none uppercase truncate tracking-[0.5px] ${isCompact ? 'text-[17px]' : 'text-xl sm:text-2xl md:text-[28px]'}`}>
              {character.name}
            </h3>
          </div>

          {/* ID block */}
          <div className={`z-30 px-2 sm:px-2.5 ${isCompact ? 'pt-1.5 pb-0.5' : 'pt-2 pb-1'}`}>
            <div className="flex items-baseline justify-between">
              <span className={`${isCompact ? 'text-[6.5px]' : 'text-[7.5px]'} font-space-mono font-bold tracking-[1.5px] text-[#d9a94a] uppercase truncate`}>
                {character.cricketData?.country || character.anime || "INTERNATIONAL"}
              </span>
              <span className={`${isCompact ? 'text-[6px]' : 'text-[7px]'} font-space-mono tracking-[1px] text-[#c9b89a] uppercase flex-shrink-0`}>
                M&nbsp;<span className={`font-teko font-semibold text-[#d9a94a] ${isCompact ? 'text-[13px]' : 'text-[15px]'}`}>{getCardMatches(character, matchType)}</span>
              </span>
            </div>
          </div>

          {/* Stat grid (4 stats: RUNS, WKTS, AVG, SR) */}
          <div className="grid grid-cols-2 gap-1.5 px-2 sm:px-2.5 pb-2 sm:pb-2.5 mt-auto z-30">
            {getCardStats(character, matchType).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-[7px] bg-[rgba(0,0,0,0.25)] px-1.5 sm:px-2 py-1 sm:py-1.5">
                <span className={`${isCompact ? 'text-[6px]' : 'text-[7px]'} font-space-mono tracking-[0.5px] text-[#c9b89a]`}>
                  {s.label}
                </span>
                <span className={`font-teko font-semibold leading-none ${s.dash ? 'text-[#c9b89a] text-[12px]' : s.gold ? 'text-[#d9a94a]' : 'text-[#f2ecd9]'} ${isCompact ? 'text-[12px]' : 'text-[14px] sm:text-[16px]'}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BACK SIDE */}
        <div 
          onClick={handleBackClick}
          className={`absolute inset-0 w-full h-full rounded-[14px] bg-[#0a0a1f] border-2 border-nexus-blue/30 backface-hidden rotate-y-180 shadow-[0_0_30px_rgba(30,144,255,0.2)] flex items-center justify-center overflow-hidden ${isFlipped && !isSpinning ? "cursor-pointer group-hover:border-nexus-cyan/50" : "pointer-events-none"}`}
        >
          {/* Interaction shield */}
          <div className="absolute inset-0 z-[100]" />

          <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-8">
            {/* Digital Grid Background */}
            <div className="absolute inset-0 opacity-20"
                 style={{ backgroundImage: 'radial-gradient(#1e90ff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            {/* Animated scanning rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 sm:w-64 sm:h-64 border border-nexus-blue/10 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
              <div className="w-28 h-28 sm:w-48 sm:h-48 border border-nexus-purple/10 rounded-full animate-pulse" />
            </div>

            <div className="relative z-10 w-full flex justify-between items-center">
              <div className="text-[7.5px] sm:text-[9px] font-mono font-black text-nexus-blue/50 tracking-widest uppercase">Battle Card</div>
              <div className="flex gap-1">
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-nexus-cyan animate-pulse" />
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-nexus-cyan animate-pulse delay-75" />
                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-nexus-cyan animate-pulse delay-150" />
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-6 md:gap-8">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 md:w-32 rounded-3xl border-2 border-nexus-cyan/30 rotate-45 animate-nexus-float flex items-center justify-center bg-nexus-blue/5 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                  <div className="w-13 h-13 sm:w-16 md:w-20 rounded-2xl border border-nexus-purple/40 -rotate-45 flex items-center justify-center bg-black/40 backdrop-blur-xl">
                    <Trophy className="w-6 h-6 sm:w-7 md:w-10 text-nexus-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1.5 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-[0.1em] font-serif nexus-glow-text uppercase leading-none">
                  Cricket Battle
                </h2>
                <div className="inline-flex items-center gap-1.5 bg-nexus-blue/10 border border-nexus-blue/20 px-2.5 py-0.5 sm:px-4 sm:py-1 rounded-full">
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-nexus-cyan animate-ping" />
                  <span className="text-[7.5px] sm:text-[10px] text-nexus-cyan font-mono font-black tracking-widest uppercase">Ready to reveal</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 w-full glassmorphism bg-white/5 border border-white/10 rounded-xl p-2 sm:p-4 text-center">
              <p className="text-[7.5px] sm:text-[10px] text-nexus-cyan font-mono uppercase tracking-[0.35em] mb-1 sm:mb-2 font-black">Pick Card</p>
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

function getCardMatches(character: Character, matchType?: MatchType): number {
  if (character.cricketData?.careerStats) {
    const s = character.cricketData.careerStats[matchType || "T20I"];
    if (s?.matches) return s.matches;
    const odi = character.cricketData.careerStats.ODI?.matches || 0;
    const t20 = character.cricketData.careerStats.T20I?.matches || 0;
    return odi + t20;
  }
  return 20;
}

function getCardStats(character: Character, matchType?: MatchType): Array<{ label: string; value: string; gold?: boolean; dash?: boolean }> {
  if (character.cricketData?.careerStats) {
    const s = character.cricketData.careerStats[matchType || "T20I"] || character.cricketData.careerStats.ODI;
    const runs = s?.runs ?? 0;
    const wkts = s?.wickets ?? 0;
    const innings = s?.innings ?? 0;
    const avg = s && s.average > 0 ? s.average.toFixed(1) : innings > 0 ? (runs / innings).toFixed(1) : "—";
    const sr = s && s.strikeRate > 0 ? s.strikeRate.toFixed(1) : "—";
    const fmt = (r: number) => r >= 1000 ? `${(r / 1000).toFixed(1)}k` : String(r);

    return [
      { label: "RUNS", value: fmt(runs), gold: runs > 0 },
      { label: "WKTS", value: String(wkts), gold: wkts > 0 },
      { label: "AVG", value: avg, dash: avg === "—" },
      { label: "SR", value: sr, dash: sr === "—" },
    ];
  }

  // Fallback to basic character stats
  return [
    { label: "PWR", value: String(character.overallPower), gold: true },
    { label: "STR", value: String(character.stats.strength) },
    { label: "DEF", value: String(character.stats.defense) },
    { label: "SPD", value: String(character.stats.speed) },
  ];
}

