import React from "react";
import { Stadium } from "../../types";

interface StadiumHUDProps {
  stadium: Stadium | null;
  matchType: "ODI" | "T20I";
  className?: string;
}

export default function StadiumHUD({ stadium, matchType, className = "" }: StadiumHUDProps) {
  if (!stadium) return null;

  const location = [stadium.city, stadium.country].filter(Boolean).join(", ");

  return (
    <div className={`flex items-center gap-2 sm:gap-3 rounded-xl border border-cricket-gold/25 bg-[rgba(7,16,13,0.62)] backdrop-blur-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-[0_4px_24px_rgba(0,0,0,0.45)] w-fit max-w-full ${className}`}>
      <span className="text-sm sm:text-base leading-none" aria-hidden>
        🏟️
      </span>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-cricket-cream truncate">
          {stadium.name}
        </p>
        <p className="text-[7.5px] sm:text-[9px] font-mono font-bold uppercase tracking-widest text-cricket-gold/80 truncate">
          {location} {stadium.flag}
        </p>
      </div>
      <span className="hidden xs:inline-flex sm:flex items-center gap-1 ml-1 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono font-black tracking-widest uppercase text-nexus-cyan">
        {matchType}
      </span>
    </div>
  );
}