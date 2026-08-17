export interface Character {
  id: string;
  name: string;
  anime: string;
  image: string;
  themeColor: string;
  stats: {
    strength: number;
    speed: number;
    iq: number;
    defense: number;
    magic: number;
  };
  overallPower: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  description: string;
  quote?: string;
  signatureEmoji: string;
  skills?: string[];
  malFallbackUrl?: string;
  rating?: number;
  source?: "builtin" | "anilist" | "rating-dataset";
  cricketData?: CricketPlayer;
}

export type Confidence = "Low" | "Medium" | "High";

export type MatchType = "ODI" | "T20I";

export type ArchetypeId =
  | "anchor" | "aggressor" | "finisher"
  | "strike_bowler" | "containment_bowler"
  | "batting_allrounder" | "bowling_allrounder" | "utility_allrounder"
  | "x_factor" | "emerging";

export type RoleType =
  | "top_order" | "middle_order" | "finisher_role"
  | "batting_allrounder_role" | "bowling_allrounder_role"
  | "strike_bowler_role" | "containment_bowler_role"
  | "wicketkeeper" | "unknown";

export interface ProfileDimensions {
  batting: number;
  bowling: number;
  power: number;
  finishing: number;
  consistency: number;
  peak: number;
  clutch: number;
  longevity: number;
  multiSkill: number;
}

export interface ValueBreakdown {
  runDensity: number;
  average: number;
  strikeRate: number;
  boundaryRate: number;
  notOutRate: number;
  duckRate: number;
  wicketDensity: number;
  bowlingAverage: number;
  economy: number;
  bowlingSR: number;
  maidenRate: number;
  bigBatFrequency: number;
  bigBowlFrequency: number;
  peakRatio: number;
}

export interface PlayerValueModel {
  quality: number;
  impact: number;
  teamValue: number;
  xFactor: number;
  confidence: Confidence;
  confidenceScore: number;
  archetype: ArchetypeId;
  archetypeLabel: string;
  roleType: RoleType;
  dimensions: ProfileDimensions;
  breakdown: ValueBreakdown;
  effectiveMatches: number;
  effectiveBowlingBalls: number;
}

export interface ValueDuel {
  metric: string;
  label: string;
  p1Score: number;
  p2Score: number;
  winner: "p1" | "p2" | "draw";
}

export interface CricketPlayer {
  id: string;
  name: string;
  country: string;
  flag: string;
  image: string;
  countryLogo?: string;
  role: string;
  roleEmoji: string;
  battingStyle: string;
  bowlingStyle: string;
  valueModel?: PlayerValueModel;
  careerStats: {
    ODI: {
      matches: number;
      innings: number;
      balls: number;
      runs: number;
      average: number;
      strikeRate: number;
      highest: number;
      fifties: number;
      hundreds: number;
      wickets: number;
      bowlingAverage: number;
      economy: number;
      bestBowling: string;
    };
    T20I: {
      matches: number;
      innings: number;
      balls: number;
      runs: number;
      average: number;
      strikeRate: number;
      highest: number;
      fifties: number;
      hundreds: number;
      wickets: number;
      bowlingAverage: number;
      economy: number;
      bestBowling: string;
    };
  };
  gameStats: {
    bat: number;
    bowl: number;
    field: number;
    con: number;
    clutch: number;
  };
  overallPower: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  description: string;
  quote?: string;
  signatureEmoji: string;
  bowlingCategory?: string;
  favorablePositions?: string[];
  secondaryPositions?: string[];
  captaincy?: {
    is_captain?: boolean;
    isCaptain?: boolean;
    matches_as_captain?: number;
    matchesAsCaptain?: number;
    win_percentage?: number;
    winPercentage?: number;
    icc_trophies?: string[];
    iccTrophies?: string[];
  };
  keeping?: {
    is_specialist?: boolean;
    isSpecialist?: boolean;
    catches?: number;
    stumpings?: number;
  };
  traits?: string[];
  peakRanking?: {
    batting_rank?: number | null;
    battingRank?: number | null;
    bowling_rank?: number | null;
    bowlingRank?: number | null;
  };
  clues?: string[];
}

import { API_BASE } from "./config";

export function getProxyImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("https://cdn.myanimelist.net/")) {
    return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export interface StadiumPitchProfile {
  type: string;
  condition: string;
  description: string;
  grass_level: number;
  dryness: number;
  hardness: number;
  bounce: number;
  spin_assistance: number;
  pace_assistance: number;
  batting_friendly: number;
  image_url?: string;
}

export interface StadiumModifiers {
  max_bonus: number;
  max_penalty: number;
}

export interface StadiumRecommendedAttack {
  spinner: number;
  pace: number;
  medium: number;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  flag: string;
  image_url: string;
  pitch: StadiumPitchProfile;
  recommended_attack: StadiumRecommendedAttack;
  modifiers: StadiumModifiers;
  pitch_profiles?: {
    ODI?: StadiumPitchProfile;
    T20I?: StadiumPitchProfile;
  };
  tags?: string[];
}

export type RoleId =
  | "opening_batsman_1" | "opening_batsman_2"
  | "batsman_1" | "batsman_2" | "batsman_3"
  | "all_rounder_1" | "all_rounder_wicketkeeper"
  | "bowler_1" | "bowler_2" | "bowler_3" | "last_bowler"
  | "captain" | "vice_captain" | "strategist" | "defender" | "healer" | "support_speed" | "support_power" | "traitor";

export interface RoleCategory {
  id: RoleId;
  name: string;
  emoji: string;
  icon: string;
  color: string;
  description: string;
}

export type SlottedTeam = Record<RoleId, Character | null>;

export interface Player {
  name: string;
  team: Character[];
  slots: SlottedTeam;
  skipUsed: boolean;
  score: number;
}

export interface MatchHistory {
  id: string;
  player1Name: string;
  player2Name: string;
  player1Team: Character[];
  player2Team: Character[];
  player1Slots?: SlottedTeam;
  player2Slots?: SlottedTeam;
  player1Power: number;
  player2Power: number;
  winner: string;
  mvp: Character;
  commentary: string;
  createdAt: string;
}

export interface BattleReport {
  p1Stats: { strength: number; speed: number; iq: number; defense: number; magic: number; overall: number };
  p2Stats: { strength: number; speed: number; iq: number; defense: number; magic: number; overall: number };
  p1BattleScore: number;
  p2BattleScore: number;
  p1DuelWins: number;
  p2DuelWins: number;
  drawDuels: number;
  duels: Array<{
    role: string;
    label: string;
    p1Name: string;
    p2Name: string;
    p1Score: number;
    p2Score: number;
    p1FitScore: number;
    p2FitScore: number;
    p1BaseScore: number;
    p2BaseScore: number;
    p1FitMultiplier: number;
    p2FitMultiplier: number;
    p1Suitability: string;
    p2Suitability: string;
    p1FitAdjustment: number;
    p2FitAdjustment: number;
    winner: "p1" | "p2" | "draw";
    detail: string;
    p1IsRating?: boolean;
    p2IsRating?: boolean;
    p1Rating?: number;
    p2Rating?: number;
  }>;
  bonuses: {
    p1: Record<string, number>;
    p2: Record<string, number>;
  };
  rules: string[];
}
