import React, { useState } from "react";
import { Stadium, StadiumPitchProfile } from "../../types";
import { getPitchImageUrl, getPitchProfile } from "../../data/stadiums";

interface PitchStageProps {
  stadium: Stadium | null;
  matchType: "ODI" | "T20I";
  isCompact?: boolean;
  className?: string;
}

const PITCH_STATS: { key: keyof StadiumPitchProfile; label: string; dot: string }[] = [
  { key: "grass_level", label: "GRASS", dot: "bg-emerald-400" },
  { key: "dryness", label: "DRYNESS", dot: "bg-amber-400" },
  { key: "hardness", label: "HARDNESS", dot: "bg-slate-300" },
  { key: "bounce", label: "BOUNCE", dot: "bg-sky-400" },
];

export default function PitchStage({ stadium, matchType, isCompact = false, className = "" }: PitchStageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!stadium) return null;

  const profile = getPitchProfile(stadium, matchType);
  const imageUrl = imageFailed ? "" : getPitchImageUrl(stadium, matchType);
  const showPlaceholder = !imageUrl;

  return (
    <div className={`absolute inset-0 flex flex-col ${className}`}>
      {/* Tall vertical pitch surface — the stage, full clarity */}
      <div className="relative flex-1 min-h-0 overflow-hidden [perspective:700px]">
        {/* Dark backdrop so the full photo sits on an even surface */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10" />
        {showPlaceholder ? (
          <div className="absolute inset-0">
            <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-14 sm:w-24 rounded-md border-x border-white/10 bg-gradient-to-b from-stone-700/50 to-stone-900/70" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl" aria-hidden>
              🏏
            </span>
          </div>
        ) : (
          /* Ground-plane tilt: pitch recedes into the distance, anchored at the bottom edge (zoomed out) */
          <div
            className="absolute inset-0"
            style={{ transform: "rotateX(68deg) scale(1.45)", transformOrigin: "50% 100%" }}
          >
            <img
              src={imageUrl}
              alt="Pitch surface"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            />
            {/* far-edge haze so the receding top melts into the backdrop */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#050a07]/90 via-[#050a07]/50 to-transparent" />
          </div>
        )}


        {/* Vertical match conditions rail — mobile only (desktop strip sits above P2) */}
        {isCompact && (
          <div
            className="absolute top-1 right-1 bottom-1 z-20 flex flex-col items-stretch justify-center gap-1 rounded-lg border border-white/10 bg-black/50 backdrop-blur-md px-1 py-1"
          >
            {PITCH_STATS.map(({ key, label, dot }) => {
              const value = Number(profile[key]) || 0;
              return (
                <div key={key} className="flex items-center justify-between gap-1">
                  <span className={`${dot} w-1 h-1 rounded-full flex-shrink-0`} />
                  <span className="text-[6px] font-mono font-black tracking-[0.15em] text-slate-400">{label}</span>
                  <span className="text-[8px] font-black text-cricket-cream">{value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}