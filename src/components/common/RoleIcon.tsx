import { RoleId } from "../../types";
import { Shield, Sparkles, Swords } from "lucide-react";

interface RoleIconProps {
  id: RoleId;
  className?: string;
}

export const RoleIcon = ({ id, className }: RoleIconProps) => {
  switch (id) {
    case "opening_batsman_1":
    case "opening_batsman_2":
    case "batsman_1":
    case "batsman_2":
    case "batsman_3":
      return <Swords className={className} />;
    case "all_rounder_1":
    case "all_rounder_wicketkeeper":
      return <Sparkles className={className} />;
    case "bowler_1":
    case "bowler_2":
    case "bowler_3":
    case "last_bowler":
      return <Shield className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 22V18" />
    <path d="M14 22V18" />
    <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
  </svg>
);

const TraitorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="23" y1="21" x2="17" y2="15" />
    <line x1="17" y1="21" x2="23" y2="15" />
  </svg>
);
