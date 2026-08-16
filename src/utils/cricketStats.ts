import { CricketPlayer } from "../types";

export const RARITY_CONFIG: Record<CricketPlayer["rarity"], { color: string; bg: string; glow: string; border: string; text: string }> = {
  Legendary: {
    color: "#fbbf24",
    bg: "from-amber-900/40 via-emerald-950/40 to-amber-950/40",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.4)]",
    border: "border-yellow-400/60",
    text: "text-yellow-300",
  },
  Epic: {
    color: "#a855f7",
    bg: "from-purple-900/40 via-emerald-950/40 to-indigo-950/40",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.4)]",
    border: "border-purple-500/60",
    text: "text-purple-400",
  },
  Rare: {
    color: "#22c55e",
    bg: "from-green-900/40 via-emerald-950/40 to-teal-950/40",
    glow: "shadow-[0_0_30px_rgba(34,197,94,0.4)]",
    border: "border-green-500/60",
    text: "text-green-400",
  },
  Common: {
    color: "#94a3b8",
    bg: "from-slate-800/40 via-emerald-950/20 to-slate-900/40",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.2)]",
    border: "border-slate-500/50",
    text: "text-slate-400",
  },
};

export const STAT_LABELS = [
  { key: "bat" as const, label: "BAT", icon: "🏏", color: "text-amber-400", desc: "Batting Power" },
  { key: "bowl" as const, label: "BOWL", icon: "🔥", color: "text-red-400", desc: "Bowling Skill" },
  { key: "field" as const, label: "FIELD", icon: "🧤", color: "text-emerald-400", desc: "Fielding" },
  { key: "con" as const, label: "CONS", icon: "📊", color: "text-cyan-400", desc: "Consistency" },
  { key: "clutch" as const, label: "CLUTCH", icon: "⭐", color: "text-purple-400", desc: "Big Match" },
] as const;

export function getRarityConfig(rarity: CricketPlayer["rarity"]) {
  return RARITY_CONFIG[rarity] || RARITY_CONFIG.Common;
}

export function getRarityStars(rarity: CricketPlayer["rarity"]): number {
  return { Common: 1, Rare: 2, Epic: 3, Legendary: 4 }[rarity];
}

export function formatCareerStat(value: number, type: "runs" | "wickets" | "avg" | "sr" | "eco" | "hs"): string {
  switch (type) {
    case "runs":
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
    case "wickets":
      return value.toString();
    case "avg":
      return value.toFixed(2);
    case "sr":
      return value.toFixed(1);
    case "eco":
      return value.toFixed(2);
    case "hs":
      return value.toString();
    default:
      return value.toString();
  }
}

export function getPlayerRoleColor(role: string): string {
  const colors: Record<string, string> = {
    Batter: "#f59e0b",
    Bowler: "#ef4444",
    "Batting Allrounder": "#a855f7",
    "Bowling Allrounder": "#a855f7",
    "WK-Batsman": "#22c55e",
    "WK-Bowler": "#22c55e",
  };
  return colors[role] || "#64748b";
}

export function getRoleBadge(role: string): { label: string; emoji: string; color: string } {
  const badges: Record<string, { label: string; emoji: string; color: string }> = {
    Batter: { label: "Batter", emoji: "🏏", color: "#f59e0b" },
    Bowler: { label: "Bowler", emoji: "🔥", color: "#ef4444" },
    "Batting Allrounder": { label: "All-Rounder", emoji: "⚡", color: "#a855f7" },
    "Bowling Allrounder": { label: "All-Rounder", emoji: "⚡", color: "#a855f7" },
    "WK-Batsman": { label: "Wicketkeeper", emoji: "🧤", color: "#22c55e" },
    "WK-Bowler": { label: "Wicketkeeper", emoji: "🧤", color: "#22c55e" },
  };
  return badges[role] || { label: "Player", emoji: "🏏", color: "#64748b" };
}

export function comparePlayers(p1: CricketPlayer, p2: CricketPlayer, statKey: keyof CricketPlayer["gameStats"]): number {
  return p1.gameStats[statKey] - p2.gameStats[statKey];
}

export function getOverallRating(player: CricketPlayer): number {
  return player.overallPower;
}

export function getPlayerTier(player: CricketPlayer): "S" | "A" | "B" | "C" | "D" {
  const p = player.overallPower;
  if (p >= 85) return "S";
  if (p >= 70) return "A";
  if (p >= 55) return "B";
  if (p >= 40) return "C";
  return "D";
}