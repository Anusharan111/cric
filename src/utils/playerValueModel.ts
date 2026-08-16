import {
  ArchetypeId,
  CricketPlayer,
  Confidence,
  PlayerValueModel,
  RoleType,
  ValueBreakdown,
  ValueDuel,
} from "../types";

/**
 * Cricket Player Value Model
 *
 * Decides "who is better" as a *team-value* question, not a single number.
 *
 * Pipeline:
 *   RAW STATS -> FORMAT NORMALIZATION -> SAMPLE-SIZE SHRINKAGE
 *   -> 9-DIMENSION PROFILE -> ROLE/ARCHETYPE INFERENCE
 *   -> QUALITY / IMPACT / TEAM VALUE / X-FACTOR / CONFIDENCE
 *
 * Nothing here pretends to know match situations that are not in the
 * dataset (score at entry, overs left, results). Everything is inferred
 * from observable career aggregates only.
 */

interface NormalizedFormat {
  batting: Record<string, number | string>;
  bowling: Record<string, number | string>;
}

const FORMAT_WEIGHT_DEFAULT = { t20: 0.6, odi: 0.4 };

function stat(section: Record<string, number | string> | undefined, key: string): number {
  if (!section) return 0;
  const v = section[key];
  if (typeof v === "number") return v;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function shrink(value: number, sample: number, prior: number, lambda: number): number {
  const w = sample / (sample + lambda);
  return value * w + prior * (1 - w);
}

/** Runs-per-innings density -> 0-100 vs a format benchmark. */
function densityScore(value: number, benchmark: number): number {
  return Math.round(clamp01(value / benchmark) * 100);
}

function formatWeights(formats: { ODI?: NormalizedFormat; T20I?: NormalizedFormat }): { t20: number; odi: number } {
  const odiInn = stat(formats.ODI?.batting, "innings");
  const t20Inn = stat(formats.T20I?.batting, "innings");
  const total = odiInn + t20Inn;
  if (total === 0) return { ...FORMAT_WEIGHT_DEFAULT };
  const rawT20 = t20Inn / total;
  // Nepal plays T20I-heavy cricket; smooth participation toward the 60/40 default.
  const t20 = clamp01(rawT20 * 0.75 + 0.6 * 0.25);
  return { t20, odi: 1 - t20 };
}

function parseBBI(bestBowling: string | number | undefined): { wickets: number; runs: number } {
  if (bestBowling === undefined || bestBowling === "-/-") return { wickets: 0, runs: 0 };
  const m = String(bestBowling).match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { wickets: 0, runs: 0 };
  return { wickets: parseInt(m[1], 10), runs: parseInt(m[2], 10) };
}

function ageFromBorn(born: string | undefined): number | null {
  if (!born) return null;
  const m = born.match(/\((\d+)\s+years?\)/);
  if (!m) return null;
  const age = parseInt(m[1], 10);
  return isNaN(age) ? null : age;
}

/**
 * Core entry point. `formats` are normalized per-format sections as produced
 * by cricketData.ts (normalizeFormat), `role` is the bio role string.
 */
export function computePlayerValueModel(
  formats: { ODI?: NormalizedFormat; T20I?: NormalizedFormat },
  role: string = ""
): PlayerValueModel {
  const odi = formats.ODI || { batting: {}, bowling: {} };
  const t20 = formats.T20I || { batting: {}, bowling: {} };
  const { t20: wT20, odi: wOdi } = formatWeights({ ODI: odi, T20I: t20 });

  const odiBat = odi.batting || {};
  const odiBowl = odi.bowling || {};
  const t20Bat = t20.batting || {};
  const t20Bowl = t20.bowling || {};

  // ---- Raw per-format figures ------------------------------------------
  const f = (sec: Record<string, number | string>, k: string) => stat(sec, k);

  const odiInn = f(odiBat, "innings");
  const t20Inn = f(t20Bat, "innings");
  const totalInnings = odiInn + t20Inn;

  const odiBowlInn = f(odiBowl, "innings");
  const t20BowlInn = f(t20Bowl, "innings");
  const totalBowlInnings = odiBowlInn + t20BowlInn;

  const odiBalls = f(odiBat, "balls");
  const t20Balls = f(t20Bat, "balls");
  const totalBalls = odiBalls + t20Balls;

  const odiMatches = f(odiBat, "matches");
  const t20Matches = f(t20Bat, "matches");
  const totalMatches = odiMatches + t20Matches;

  // ---- Batting raw values (shrunk where sample is small) ---------------
  const rpiOdi = odiInn > 0 ? f(odiBat, "runs") / odiInn : 0;
  const rpiT20 = t20Inn > 0 ? f(t20Bat, "runs") / t20Inn : 0;
  const runDensity = Math.max(rpiOdi, rpiT20);

  const avgOdi = shrink(f(odiBat, "average"), odiInn, 28, 15);
  const avgT20 = shrink(f(t20Bat, "average"), t20Inn, 22, 18);
  const average = Math.max(avgOdi, avgT20);

  const srOdi = f(odiBat, "sr");
  const srT20 = f(t20Bat, "sr");
  const strikeRate = Math.max(srOdi, srT20);

  const foursOdi = f(odiBat, "fours");
  const foursT20 = f(t20Bat, "fours");
  const sixesOdi = f(odiBat, "sixes");
  const sixesT20 = f(t20Bat, "sixes");
  const boundariesPerInnOdi = odiInn > 0 ? (foursOdi + sixesOdi) / odiInn : 0;
  const boundariesPerInnT20 = t20Inn > 0 ? (foursT20 + sixesT20) / t20Inn : 0;
  const boundaryRate = Math.max(boundariesPerInnOdi, boundariesPerInnT20);

  const sixPerInnOdi = odiInn > 0 ? sixesOdi / odiInn : 0;
  const sixPerInnT20 = t20Inn > 0 ? sixesT20 / t20Inn : 0;
  const sixRate = Math.max(sixPerInnOdi, sixPerInnT20);

  const notOutOdi = f(odiBat, "not_out");
  const notOutT20 = f(t20Bat, "not_out");
  const notOutRateOdi = odiInn > 0 ? notOutOdi / odiInn : 0;
  const notOutRateT20 = t20Inn > 0 ? notOutT20 / t20Inn : 0;
  const notOutRate = notOutRateOdi * (1 - wT20) + notOutRateT20 * wT20;

  const ducksOdi = f(odiBat, "ducks");
  const ducksT20 = f(t20Bat, "ducks");
  const duckRateOdi = odiInn > 0 ? ducksOdi / odiInn : 0;
  const duckRateT20 = t20Inn > 0 ? ducksT20 / t20Inn : 0;
  const duckRate = duckRateOdi * (1 - wT20) + duckRateT20 * wT20;

  const fiftyOdi = f(odiBat, "50s");
  const fiftyT20 = f(t20Bat, "50s");
  const hundredOdi = f(odiBat, "100s");
  const hundredT20 = f(t20Bat, "100s");
  const bigBatPer10Odi = odiInn > 0 ? ((fiftyOdi + hundredOdi * 2) / odiInn) * 10 : 0;
  const bigBatPer10T20 = t20Inn > 0 ? ((fiftyT20 + hundredT20 * 2) / t20Inn) * 10 : 0;
  const bigBatFrequency = Math.max(bigBatPer10Odi, bigBatPer10T20);

  const hsOdi = f(odiBat, "highest");
  const hsT20 = f(t20Bat, "highest");
  const highest = Math.max(hsOdi, hsT20);

  // ---- Bowling raw values ----------------------------------------------
  const wpmOdi = odiBowlInn > 0 ? f(odiBowl, "wickets") / odiBowlInn : 0;
  const wpmT20 = t20BowlInn > 0 ? f(t20Bowl, "wickets") / t20BowlInn : 0;
  const wicketDensity = Math.max(wpmOdi, wpmT20);

  const bowlAvgOdi = shrink(f(odiBowl, "avg"), f(odiBowl, "wickets"), 32, 12);
  const bowlAvgT20 = shrink(f(t20Bowl, "avg"), f(t20Bowl, "wickets"), 26, 15);
  const bowlAvg = bowlAvgOdi === 0 ? bowlAvgT20 : bowlAvgT20 === 0 ? bowlAvgOdi : (bowlAvgOdi + bowlAvgT20) / 2;

  const ecoOdi = f(odiBowl, "eco");
  const ecoT20 = f(t20Bowl, "eco");
  const eco = ecoOdi === 0 ? ecoT20 : ecoT20 === 0 ? ecoOdi : (ecoOdi + ecoT20) / 2;

  const bowlSROdi = f(odiBowl, "sr");
  const bowlSRT20 = f(t20Bowl, "sr");
  const bowlSR = bowlSROdi === 0 ? bowlSRT20 : bowlSRT20 === 0 ? bowlSROdi : (bowlSROdi + bowlSRT20) / 2;

  const maidensOdi = f(odiBowl, "maidens");
  const oversOdi = f(odiBowl, "balls") / 6;
  const maidenRate = oversOdi > 0 ? maidensOdi / oversOdi : 0;

  const fourW = f(odiBowl, "4w") + f(t20Bowl, "4w");
  const fiveW = f(odiBowl, "5w") + f(t20Bowl, "5w");
  const bigBowlFrequency = totalBowlInnings > 0 ? ((fourW + fiveW * 2) / totalBowlInnings) * 10 : 0;

  const bbi = parseBBI(odi.bowling?.bbi || t20.bowling?.bbi);

  // ---- 0-100 dimension scores ------------------------------------------
  const BENCHMARKS = {
    runDensity: 55,        // ~55 runs per innings = elite for both formats
    average: 42,           // avg 42 = world class
    strikeRate: 150,       // SR 150 = elite
    boundaryRate: 2.0,     // 2 boundaries per innings
    sixRate: 0.6,
    wicketDensity: 1.4,    // 1.4 wkts per bowling innings
    bowlAvg: 22,
    eco: 6.2,
    bowlSR: 22,
    maidenRate: 0.06,
    bigBatFrequency: 3.0,  // 3 fifties per 10 innings
    bigBowlFrequency: 2.5,
  };

  const batting = Math.round(
    densityScore(runDensity, BENCHMARKS.runDensity) * 0.3 +
    densityScore(average, BENCHMARKS.average) * 0.3 +
    densityScore(strikeRate, BENCHMARKS.strikeRate) * 0.2 +
    densityScore(boundaryRate, BENCHMARKS.boundaryRate) * 0.2
  );

  const hasBowling = totalBowlInnings > 0 || f(odiBowl, "wickets") + f(t20Bowl, "wickets") > 0;
  const bowling = hasBowling
    ? Math.round(
        densityScore(wicketDensity, BENCHMARKS.wicketDensity) * 0.3 +
        densityScore(bowlAvg > 0 ? 100 / bowlAvg : 0, 100 / BENCHMARKS.bowlAvg) * 0.25 +
        densityScore(eco > 0 ? 100 / eco : 0, 100 / BENCHMARKS.eco) * 0.2 +
        densityScore(bowlSR > 0 ? 100 / bowlSR : 0, 100 / BENCHMARKS.bowlSR) * 0.25
      )
    : 0;

  const power = Math.round(
    densityScore(boundaryRate, BENCHMARKS.boundaryRate) * 0.6 +
    densityScore(sixRate, BENCHMARKS.sixRate) * 0.4
  );

  const finishing = Math.round(
    densityScore(notOutRate, 0.3) * 0.35 +
    densityScore(strikeRate, BENCHMARKS.strikeRate) * 0.35 +
    densityScore(sixRate, BENCHMARKS.sixRate) * 0.3
  );

  const consistency = Math.round(
    (1 - clamp01(duckRate / 0.15)) * 70 +
    clamp01(Math.min(avgOdi, avgT20) / Math.max(1, Math.max(avgOdi, avgT20))) * 30
  );

  const peakRatioBat = average > 0 ? highest / average : 0;
  const peakRatio = Math.round(
    clamp01(peakRatioBat / 2.2) * 50 +
    clamp01(bigBatFrequency / BENCHMARKS.bigBatFrequency) * 25 +
    (bbi.wickets >= 5 ? 15 : bbi.wickets >= 4 ? 10 : 0) +
    clamp01(bigBowlFrequency / BENCHMARKS.bigBowlFrequency) * 10
  );

  const clutch = Math.round(
    clamp01(bigBatFrequency / BENCHMARKS.bigBatFrequency) * 50 +
    clamp01(bigBowlFrequency / BENCHMARKS.bigBowlFrequency) * 50
  );

  const hasBothFormats = odiInn > 0 && t20Inn > 0;
  const longevity = Math.round(
    clamp01(totalMatches / 60) * 60 +
    clamp01(totalInnings / 50) * 20 +
    (hasBothFormats ? 20 : 0)
  );

  // Meaningful participation gates: don't award all-rounder points for 3 balls.
  const batInningsGate = totalInnings >= 8;
  const bowlBallsGate = f(odiBowl, "balls") + f(t20Bowl, "balls") >= 90 || totalBowlInnings >= 8;
  const secondaryBat = batInningsGate ? batting : 0;
  const secondaryBowl = bowlBallsGate ? bowling : 0;
  const multiSkill = Math.round(
    clamp01((secondaryBowl + secondaryBat) / 200) *
    ((secondaryBowl > 0 && secondaryBat > 0) ? 1 : 0.25) * 100
  );

  // ---- Confidence ------------------------------------------------------
  const bowlingBalls = f(odiBowl, "balls") + f(t20Bowl, "balls");
  const confidenceScore = Math.round(
    clamp01(totalInnings / 35) * 50 + clamp01(bowlingBalls / 350) * 35 + clamp01(totalMatches / 40) * 15
  );
  const confidence: Confidence = confidenceScore >= 70 ? "High" : confidenceScore >= 35 ? "Medium" : "Low";
  const confidenceFactor = confidence === "High" ? 1 : confidence === "Medium" ? 0.8 : 0.55;

  // ---- Role type inference ---------------------------------------------
  const roleLower = role.toLowerCase();
  let roleType: RoleType = "unknown";
  if (roleLower.includes("wk")) roleType = "wicketkeeper";
  else if (roleLower.includes("bowling allrounder") || roleLower.includes("bowling all-rounder")) roleType = "bowling_allrounder_role";
  else if (roleLower.includes("batting allrounder") || roleLower.includes("batting all-rounder")) roleType = "batting_allrounder_role";
  else if (roleLower.includes("bowler")) {
    roleType = bowlSR > 0 && bowlSR < 30 && wicketDensity >= 0.8 ? "strike_bowler_role" : "containment_bowler_role";
  } else if (roleLower.includes("batsman") || roleLower.includes("batter")) {
    roleType = notOutRate >= 0.3 && strikeRate >= 125 ? "finisher_role" : batting >= 60 ? "top_order" : "middle_order";
  }

  // ---- Archetype -------------------------------------------------------
  const isAllrounderRole = roleType === "batting_allrounder_role" || roleType === "bowling_allrounder_role";
  const strongBoth = secondaryBat >= 55 && secondaryBowl >= 55;
  const moderateBoth = secondaryBat >= 40 && secondaryBowl >= 40;
  let archetype: ArchetypeId = "emerging";
  if (totalInnings === 0 && totalBowlInnings === 0) {
    archetype = "emerging";
  } else if (strongBoth || (isAllrounderRole && secondaryBat >= 45 && secondaryBowl >= 45)) {
    archetype = secondaryBowl >= secondaryBat ? "bowling_allrounder" : "batting_allrounder";
  } else if (moderateBoth) {
    archetype = secondaryBowl >= 55 && secondaryBowl > secondaryBat ? "bowling_allrounder" : "utility_allrounder";
  } else if (bowling >= 55 && hasBowling) {
    archetype = bowling > batting && (bowlSR < 28 || wicketDensity >= 1.1) ? "strike_bowler" : "containment_bowler";
  } else if (batting >= 50) {
    if (finishing >= 65 && power >= 60 && notOutRate >= 0.25) archetype = "finisher";
    else if (power >= 60 && strikeRate >= 135) archetype = "aggressor";
    else if (average >= 30 && strikeRate <= 110) archetype = "anchor";
    else archetype = batting >= 62 ? "aggressor" : "anchor";
  } else if (confidence === "Low" && (peakRatio >= 40 || power >= 50 || finishing >= 55)) {
    archetype = "x_factor";
  } else if (confidence === "Low") {
    archetype = "emerging";
  } else {
    archetype = "anchor";
  }

  const ARCHETYPE_LABELS: Record<ArchetypeId, string> = {
    anchor: "Anchor",
    aggressor: "Aggressor",
    finisher: "Finisher",
    strike_bowler: "Strike Bowler",
    containment_bowler: "Containment Bowler",
    batting_allrounder: "Batting All-Rounder",
    bowling_allrounder: "Bowling All-Rounder",
    utility_allrounder: "Utility All-Rounder",
    x_factor: "X-Factor",
    emerging: "Emerging",
  };

  // ---- Quality / Impact / Team Value ----------------------------------
  const isBatterRole = ["top_order", "middle_order", "finisher_role", "wicketkeeper"].includes(roleType);
  const isBowlerRole = ["strike_bowler_role", "containment_bowler_role"].includes(roleType);

  const quality = Math.round(
    isBowlerRole
      ? bowling * 0.7 + batting * 0.12 + consistency * 0.1 + longevity * 0.08
      : isAllrounderRole
      ? batting * 0.42 + bowling * 0.42 + consistency * 0.1 + longevity * 0.06
      : isBatterRole
      ? batting * 0.65 + power * 0.1 + consistency * 0.1 + longevity * 0.15
      : batting * 0.5 + bowling * 0.25 + consistency * 0.15 + longevity * 0.1
  );

  // Impact = how much one player can influence a game, from his profile.
  const acceleration = (power + finishing) / 2;
  const impact = Math.round(
    peakRatio * 0.35 + acceleration * 0.3 + clutch * 0.2 + (isBatterRole ? batting : bowling) * 0.15
  );

  // Team value = quality for the role + versatility + longevity + confidence.
  const versatility = multiSkill / 100;
  const teamValue = Math.round(
    quality * 0.55 +
    versatility * 100 * 0.25 +
    longevity * 0.12 +
    confidenceFactor * 10
  );

  const xFactor = Math.round(
    (peakRatio * 0.4 + acceleration * 0.35 + clutch * 0.15 + multiSkill * 0.1) * confidenceFactor
  );

  return {
    quality: Math.min(100, quality),
    impact: Math.min(100, impact),
    teamValue: Math.min(100, teamValue),
    xFactor: Math.min(100, xFactor),
    confidence,
    confidenceScore,
    archetype,
    archetypeLabel: ARCHETYPE_LABELS[archetype],
    roleType,
    dimensions: {
      batting: Math.min(100, batting),
      bowling: Math.min(100, bowling),
      power: Math.min(100, power),
      finishing: Math.min(100, finishing),
      consistency: Math.min(100, consistency),
      peak: Math.min(100, peakRatio),
      clutch: Math.min(100, clutch),
      longevity: Math.min(100, longevity),
      multiSkill: Math.min(100, multiSkill),
    },
    breakdown: {
      runDensity: Math.round(densityScore(runDensity, BENCHMARKS.runDensity)),
      average: Math.round(densityScore(average, BENCHMARKS.average)),
      strikeRate: Math.round(densityScore(strikeRate, BENCHMARKS.strikeRate)),
      boundaryRate: Math.round(densityScore(boundaryRate, BENCHMARKS.boundaryRate)),
      notOutRate: Math.round(densityScore(notOutRate, 0.3)),
      duckRate: Math.round((1 - clamp01(duckRate / 0.15)) * 100),
      wicketDensity: Math.round(densityScore(wicketDensity, BENCHMARKS.wicketDensity)),
      bowlingAverage: Math.round(bowlAvg > 0 ? densityScore(100 / bowlAvg, 100 / BENCHMARKS.bowlAvg) : 0),
      economy: Math.round(eco > 0 ? densityScore(100 / eco, 100 / BENCHMARKS.eco) : 0),
      bowlingSR: Math.round(bowlSR > 0 ? densityScore(100 / bowlSR, 100 / BENCHMARKS.bowlSR) : 0),
      maidenRate: Math.round(densityScore(maidenRate, BENCHMARKS.maidenRate)),
      bigBatFrequency: Math.round(densityScore(bigBatFrequency, BENCHMARKS.bigBatFrequency)),
      bigBowlFrequency: Math.round(densityScore(bigBowlFrequency, BENCHMARKS.bigBowlFrequency)),
      peakRatio: Math.round(clamp01(peakRatioBat / 2.2) * 100),
    },
    effectiveMatches: totalMatches,
    effectiveBowlingBalls: bowlingBalls,
  };
}

/** Convenience wrapper for a fully-parsed CricketPlayer (uses stored valueModel when present). */
export function getPlayerValueModel(player: CricketPlayer): PlayerValueModel {
  if (player.valueModel) return player.valueModel;
  const bat = (s: typeof player.careerStats.ODI): Record<string, number | string> => ({
    matches: s.matches, innings: s.innings, balls: s.balls, runs: s.runs,
    average: s.average, sr: s.strikeRate, highest: s.highest,
    "50s": s.fifties, "100s": s.hundreds,
  });
  const bowl = (s: typeof player.careerStats.ODI): Record<string, number | string> => ({
    matches: s.matches, innings: s.innings, balls: s.balls, runs: s.runs,
    wickets: s.wickets, avg: s.bowlingAverage, eco: s.economy,
    bbi: s.bestBowling,
  });
  const formats = {
    ODI: { batting: bat(player.careerStats.ODI), bowling: bowl(player.careerStats.ODI) },
    T20I: { batting: bat(player.careerStats.T20I), bowling: bowl(player.careerStats.T20I) },
  };
  return computePlayerValueModel(formats, player.role);
}

/**
 * Head-to-head: which player is better, decided metric by metric.
 * Returns per-metric duels so the UI can show *why*.
 */

export const VALUE_DUEL_METRICS: { key: keyof ValueBreakdown; label: string }[] = [
  { key: "runDensity", label: "Run Density" },
  { key: "average", label: "Batting Average" },
  { key: "strikeRate", label: "Strike Rate" },
  { key: "boundaryRate", label: "Boundary Rate" },
  { key: "notOutRate", label: "Not-Out Rate" },
  { key: "wicketDensity", label: "Wicket Density" },
  { key: "bowlingAverage", label: "Bowling Avg" },
  { key: "economy", label: "Economy" },
  { key: "bowlingSR", label: "Bowling SR" },
  { key: "bigBatFrequency", label: "Fifties Rate" },
  { key: "bigBowlFrequency", label: "4w/5w Rate" },
  { key: "duckRate", label: "Duck Avoidance" },
];

export function comparePlayerValue(
  p1Model: PlayerValueModel,
  p2Model: PlayerValueModel
): { duels: ValueDuel[]; p1Wins: number; p2Wins: number; draws: number; overallWinner: "p1" | "p2" | "draw" } {
  const duels: ValueDuel[] = VALUE_DUEL_METRICS.map(({ key, label }) => {
    const s1 = p1Model.breakdown[key];
    const s2 = p2Model.breakdown[key];
    const winner: ValueDuel["winner"] = s1 > s2 ? "p1" : s2 > s1 ? "p2" : "draw";
    return { metric: key, label, p1Score: s1, p2Score: s2, winner };
  });

  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  for (const d of duels) {
    if (d.winner === "p1") p1Wins++;
    else if (d.winner === "p2") p2Wins++;
    else draws++;
  }

  const overallWinner: "p1" | "p2" | "draw" =
    p1Wins > p2Wins ? "p1" : p2Wins > p1Wins ? "p2" : "draw";

  return { duels, p1Wins, p2Wins, draws, overallWinner };
}

export const ARCHETYPE_EMOJI: Record<ArchetypeId, string> = {
  anchor: "🧱",
  aggressor: "⚡",
  finisher: "💥",
  strike_bowler: "🎯",
  containment_bowler: "🧤",
  batting_allrounder: "🔄",
  bowling_allrounder: "🎳",
  utility_allrounder: "🛠️",
  x_factor: "🧨",
  emerging: "🌱",
};
