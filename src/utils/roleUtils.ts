import { Character, CricketPlayer, RoleId } from "../types";

export type CricketFormat = "ODI" | "T20I";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function cricketProfile(character: Character): CricketPlayer | null {
  return character.cricketData ?? null;
}

function experienceScore(stats: CricketPlayer["careerStats"]["ODI"]): number {
  // Reliability rises with matches, innings and balls, but never overwhelms skill.
  const matches = clamp(Math.sqrt(Math.max(0, stats.matches) / 80) * 100);
  const innings = clamp(Math.sqrt(Math.max(0, stats.innings) / 120) * 100);
  const balls = clamp(Math.sqrt(Math.max(0, stats.balls) / 2500) * 100);
  return matches * 0.45 + innings * 0.3 + balls * 0.25;
}

function battingQuality(stats: CricketPlayer["careerStats"]["ODI"]): number {
  const hasEvidence = stats.matches > 0 || stats.innings > 0 || stats.balls > 0;
  if (!hasEvidence) return 35;
  const average = clamp((stats.average / 50) * 100);
  const strikeRate = clamp((stats.strikeRate / 180) * 100);
  const base = average * 0.58 + strikeRate * 0.42;
  const reliability = clamp(experienceScore(stats));
  return clamp(base * (0.72 + reliability / 360));
}

function bowlingQuality(stats: CricketPlayer["careerStats"]["ODI"]): number {
  const hasEvidence = stats.matches > 0 || stats.innings > 0 || stats.balls > 0 || stats.wickets > 0;
  if (!hasEvidence) return 35;
  const wicketsPerMatch = stats.matches > 0 ? stats.wickets / stats.matches : 0;
  const wicketThreat = clamp((wicketsPerMatch / 2.5) * 100);
  const economy = stats.economy > 0 ? clamp(((10 - stats.economy) / 6) * 100) : 35;
  const strikeRate = stats.bowlingAverage > 0 ? clamp(((45 - stats.bowlingAverage) / 35) * 100) : 35;
  const base = wicketThreat * 0.48 + economy * 0.27 + strikeRate * 0.25;
  const reliability = clamp(experienceScore(stats));
  return clamp(base * (0.72 + reliability / 360));
}

function profileMetrics(character: Character, format: CricketFormat) {
  const profile = cricketProfile(character);
  if (!profile) {
    return {
      batting: clamp((character.stats.strength + character.stats.speed) / 2),
      bowling: clamp((character.stats.defense + character.stats.magic) / 2),
      fielding: clamp(character.stats.defense),
      experience: clamp(character.stats.iq),
      keeper: false,
    };
  }

  const selected = profile.careerStats[format];
  const supportFormat = profile.careerStats[format === "ODI" ? "T20I" : "ODI"];
  const batting = battingQuality(selected) * 0.8 + battingQuality(supportFormat) * 0.2;
  const bowling = bowlingQuality(selected) * 0.8 + bowlingQuality(supportFormat) * 0.2;
  const fielding = clamp(profile.gameStats.field);
  const experience = clamp(experienceScore(selected) * 0.8 + experienceScore(supportFormat) * 0.2);
  const keeper = /wicket|keeper|wk/i.test(profile.role);
  return { batting, bowling, fielding, experience, keeper };
}

/**
 * Soft role fit: skill is primary, then reliability and role context provide
 * gentle adjustments. A small-sample outlier cannot dominate a long career.
 */
export const getRoleFitScore = (character: Character, role: RoleId, format: CricketFormat = "ODI"): number => {
  const profile = cricketProfile(character);
  const fav = profile?.favorablePositions || [];
  const sec = profile?.secondaryPositions || [];

  const { batting, bowling, fielding, experience, keeper } = profileMetrics(character, format);
  let base = 50;
  if (role.startsWith("opening_batsman")) base = Math.round(clamp(batting * 0.72 + experience * 0.18 + fielding * 0.1));
  else if (role.startsWith("batsman")) base = Math.round(clamp(batting * 0.84 + experience * 0.1 + fielding * 0.06));
  else if (role === "all_rounder_wicketkeeper") base = Math.round(clamp(batting * 0.42 + bowling * 0.33 + fielding * 0.15 + experience * 0.1 + (keeper ? 7 : 0)));
  else if (role.startsWith("all_rounder")) base = Math.round(clamp(batting * 0.44 + bowling * 0.44 + experience * 0.12));
  else base = Math.round(clamp(bowling * 0.82 + experience * 0.12 + fielding * 0.06));

  if (fav.includes(role)) {
    return Math.max(92, Math.min(100, base + 10));
  }
  if (sec.includes(role)) {
    return Math.max(78, Math.min(88, base + 5));
  }
  return base;
};

export const getCaptainSuitability = (character: Character, format: CricketFormat = "ODI"): number => {
  const { experience, batting, bowling } = profileMetrics(character, format);
  const profile = cricketProfile(character);
  const cap = profile?.captaincy;
  let leadershipBonus = 0;
  if (cap?.is_captain || cap?.isCaptain) {
    leadershipBonus += 12;
    const wins = cap.win_percentage || cap.winPercentage || 0;
    if (wins > 60) leadershipBonus += 6;
    const trophies = cap.icc_trophies || cap.iccTrophies || [];
    if (trophies.length > 0) leadershipBonus += Math.min(8, trophies.length * 3);
  } else if (profile && /captain|leader/i.test(profile.description)) {
    leadershipBonus += 6;
  }
  return Math.round(clamp(experience * 0.58 + ((batting + bowling) / 2) * 0.28 + leadershipBonus));
};

/** Evaluates Wicketkeeper suitability: rewards genuine keepers and penalizes non-keepers. */
export const getWicketkeeperSuitability = (character: Character, format: CricketFormat = "ODI"): { isKeeper: boolean; score: number; adjustment: number } => {
  const { fielding, keeper } = profileMetrics(character, format);
  const profile = cricketProfile(character);
  const roleStr = (profile?.role || "").toLowerCase();
  const descStr = (character.description || profile?.description || "").toLowerCase();
  const keepingData = profile?.keeping;
  const isSpecialistKeeper = keepingData?.is_specialist || keepingData?.isSpecialist;
  const hasStumpings = (keepingData?.stumpings || 0) > 0;
  const isGenuineKeeper = isSpecialistKeeper || hasStumpings || keeper || roleStr.includes("wk") || roleStr.includes("keeper") || descStr.includes("wicketkeeper") || descStr.includes("keeper") || descStr.includes("glove");

  if (isGenuineKeeper) {
    const catchBonus = Math.min(5, Math.floor((keepingData?.catches || 0) / 40));
    const stumpingBonus = Math.min(5, Math.floor((keepingData?.stumpings || 0) / 10));
    const score = Math.round(clamp(15 + (fielding / 100) * 12 + catchBonus + stumpingBonus, 15, 30));
    return { isKeeper: true, score, adjustment: score };
  } else {
    return { isKeeper: false, score: 0, adjustment: -25 };
  }
};

export const getRoleSuitabilityLabel = (fitScore: number): string => {
  if (fitScore >= 86) return "Excellent Fit";
  if (fitScore >= 72) return "Good Fit";
  if (fitScore >= 56) return "Reasonable Fit";
  if (fitScore >= 38) return "Poor Fit";
  return "Unsuitable";
};

// Keep role adjustments deliberately narrow so a useful player is never made useless.
export const getRoleFitMultiplier = (fitScore: number): number => {
  if (fitScore >= 86) return 1.06;
  if (fitScore >= 72) return 1.025;
  if (fitScore >= 56) return 1;
  if (fitScore >= 38) return 0.95;
  return 0.88;
};
