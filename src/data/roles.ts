import { RoleCategory } from "../types";

// Eleven uncomplicated cricket positions. Captaincy is evaluated separately
// from these slots using experience and consistency, so it is not a batting role.
export const ROLE_CATEGORIES: RoleCategory[] = [
  { id: "opening_batsman_1", name: "Opening Batsman", emoji: "🏏", icon: "swords", color: "#fbbf24", description: "Top-order batter who can face the new ball." },
  { id: "opening_batsman_2", name: "Opening Batsman", emoji: "🏏", icon: "swords", color: "#fbbf24", description: "Second opening batter for a stable start." },
  { id: "batsman_1", name: "Batsman", emoji: "🏏", icon: "swords", color: "#c8a955", description: "Reliable specialist run scorer." },
  { id: "batsman_2", name: "Batsman", emoji: "🏏", icon: "swords", color: "#c8a955", description: "Reliable specialist run scorer." },
  { id: "batsman_3", name: "Batsman", emoji: "🏏", icon: "swords", color: "#c8a955", description: "Reliable specialist run scorer." },
  { id: "all_rounder_1", name: "All-Rounder", emoji: "⚡", icon: "sparkles", color: "#72b77b", description: "Contributes with both bat and ball." },
  { id: "all_rounder_wicketkeeper", name: "All-Rounder", emoji: "⚡", icon: "sparkles", color: "#6da4b8", description: "Contributes with both bat and ball." },
  { id: "bowler_1", name: "Bowler", emoji: "🔥", icon: "shield", color: "#5c9eaf", description: "Primary wicket-taking bowler." },
  { id: "bowler_2", name: "Bowler", emoji: "🔥", icon: "shield", color: "#5c9eaf", description: "Primary wicket-taking bowler." },
  { id: "bowler_3", name: "Bowler", emoji: "🔥", icon: "shield", color: "#5c9eaf", description: "Primary wicket-taking bowler." },
  { id: "last_bowler", name: "Last Bowler", emoji: "🔥", icon: "shield", color: "#467e8c", description: "Final bowling option to close the innings." },
];
