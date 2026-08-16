import { CricketPlayer } from "../types";
import { computePlayerValueModel } from "./playerValueModel";
import finalData from "../../nepal_players_final.json";

const COUNTRY_FLAGS: Record<string, string> = {
  Afghanistan: "🇦🇫",
  Australia: "🇦🇺",
  Bangladesh: "🇧🇩",
  Canada: "🇨🇦",
  India: "🇮🇳",
  Ireland: "🇮🇪",
  "New Zealand": "🇳🇿",
  "South Africa": "🇿🇦",
  "Sri Lanka": "🇱🇰",
  Pakistan: "🇵🇰",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Hong Kong": "🇭🇰",
  "United Arab Emirates": "🇦🇪",
  "West Indies": "🇧🇧",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Nepal: "🇳🇵",
};

const ROLE_EMOJI: Record<string, string> = {
  Batter: "🏏",
  Bowler: "🔥",
  "Batting Allrounder": "⚡",
  "Bowling Allrounder": "⚡",
  "WK-Batsman": "🧤",
  "WK-Bowler": "🧤",
};

function extractCleanName(profileName: string): string {
  return profileName
    .replace(" Profile - ICC Ranking, Age, Career Info & Stats", "")
    .replace(" | Cricbuzz.com", "")
    .trim();
}

function parseStat(value: string | number): number {
  if (typeof value === "number") return value;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// Cricbuzz exports Nepal as row/column tables while the international file
// uses keyed objects. Normalize both shapes into the SAME canonical
// `{ batting, bowling }` sections with lowercase keys so downstream readers
// (careerStats, computeGameStats, playerValueModel) work for every player.
const SECTION_KEY_ALIAS: Record<string, string> = {
  Matches: "matches", Innings: "innings", Runs: "runs", Balls: "balls",
  Highest: "highest", Average: "average", SR: "sr", "Not Out": "not_out",
  Fours: "fours", Sixes: "sixes", Ducks: "ducks",
  Wickets: "wickets", Avg: "avg", Eco: "eco", Maidens: "maidens",
  BBI: "bbi", BBM: "bbm",
};

const BATTING_KEYS = ["matches", "innings", "runs", "balls", "highest", "average", "sr", "not_out", "fours", "sixes", "ducks", "50s", "100s", "200s", "300s", "400s"];
const BOWLING_KEYS = ["matches", "innings", "balls", "runs", "maidens", "wickets", "avg", "eco", "sr", "bbi", "bbm", "4w", "5w", "10w"];

// Flat Cricbuzz exports (every country except Nepal) merge the batting and
// bowling rows into ONE object, so colliding keys (`innings`, `runs`,
// `balls`, `sr`) end up holding BOWLING values. Only these keys are safe to
// read as batting on the flat shape.
const FLAT_BATTING_KEYS = ["matches", "highest", "average", "not_out", "fours", "sixes", "ducks", "50s", "100s", "200s", "300s", "400s"];
const FLAT_BOWLING_KEYS = ["matches", "innings", "balls", "runs", "sr", "maidens", "wickets", "avg", "eco", "bbi", "bbm", "4w", "5w", "10w"];

function normalizeSection(section: any, formatNames: string[]): Record<string, string | number> {
  if (!Array.isArray(section)) return section || {};
  const header = section[0] || [];
  const column = header.findIndex((value: unknown) => formatNames.includes(String(value).toUpperCase()));
  const out: Record<string, string | number> = {};
  for (const row of section.slice(1)) {
    const label = String(row[0]);
    out[SECTION_KEY_ALIAS[label] || label] = row[column >= 0 ? column : 1] ?? "0";
  }
  return out;
}

// Keyed players store batting and bowling figures flat on the format object
// (e.g. `ODI.matches`, `ODI.wickets`). Split them into canonical sections.
function splitKeyed(raw: any, keys: string[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const key of keys) {
    if (raw && raw[key] !== undefined) out[key] = raw[key];
  }
  return out;
}

// Flat exports lose the batting innings/runs (they are overwritten by the
// bowling rows), so estimate them from average + not-out count to keep
// career totals meaningful. Average itself is a real batting value.
function splitFlatBatting(raw: any): Record<string, string | number> {
  const out = splitKeyed(raw, FLAT_BATTING_KEYS);
  const matches = parseStat(raw.matches);
  const notOut = parseStat(raw.not_out);
  const average = parseStat(raw.average);
  if (out.innings === undefined && matches > 0 && average > 0) {
    const inningsEst = Math.max(0, matches - notOut);
    out.innings = inningsEst;
    out.runs = Math.round(average * inningsEst);
  }
  return out;
}

function splitFlatBowling(raw: any): Record<string, string | number> {
  return splitKeyed(raw, FLAT_BOWLING_KEYS);
}

function normalizeFormat(raw: any, formatNames: string[]) {
  raw = raw || {};
  const isArrayBatting = Array.isArray(raw.batting);
  const isNested = isArrayBatting || (typeof raw.batting === "object" && raw.batting);
  const batting = isArrayBatting
    ? normalizeSection(raw.batting, formatNames)
    : isNested
    ? splitKeyed(raw.batting, BATTING_KEYS)
    : splitFlatBatting(raw);
  const bowling = Array.isArray(raw.bowling)
    ? normalizeSection(raw.bowling, formatNames)
    : isNested
    ? splitKeyed(raw.bowling, BOWLING_KEYS)
    : splitFlatBowling(raw);
  const normalized = { ...raw, batting, bowling };
  // On the flat shape the top-level `innings/runs/balls/sr` are bowling
  // values — strip them so downstream readers never mistake them for batting.
  if (!isNested) {
    delete normalized.innings;
    delete normalized.runs;
    delete normalized.balls;
    delete normalized.sr;
  }
  return normalized;
}

function computeGameStats(formats: any): { bat: number; bowl: number; field: number; con: number; clutch: number; overall: number } {
  const odi = normalizeFormat(formats.ODI, ["ODI"]);
  const t20 = normalizeFormat(formats.T20I || formats.T20, ["T20I", "T20"]);

  const odiBatAvg = parseStat(odi.batting?.average || odi.average || "0");
  const odiBatSR = parseStat(odi.batting?.sr || odi.sr || "0");
  const odiMatches = parseStat(odi.batting?.matches || odi.matches || "0");
  const odiInnings = parseStat(odi.batting?.innings || odi.innings || "0");
  const odiRuns = parseStat(odi.batting?.runs || odi.runs || "0");
  const odiBalls = parseStat(odi.batting?.balls || odi.balls || "0");
  const odi50s = parseStat(odi.batting?.["50s"] || odi["50s"] || "0");
  const odi100s = parseStat(odi.batting?.["100s"] || odi["100s"] || "0");
  const odiDucks = parseStat(odi.batting?.ducks || odi.ducks || "0");
  const odiHighest = parseStat(odi.batting?.highest || odi.highest || "0");

  const t20BatAvg = parseStat(t20.batting?.average || t20.average || "0");
  const t20BatSR = parseStat(t20.batting?.sr || t20.sr || "0");
  const t20Matches = parseStat(t20.batting?.matches || t20.matches || "0");
  const t20Innings = parseStat(t20.batting?.innings || t20.innings || "0");
  const t20Runs = parseStat(t20.batting?.runs || t20.runs || "0");
  const t20Balls = parseStat(t20.batting?.balls || t20.balls || "0");
  const t2050s = parseStat(t20.batting?.["50s"] || t20["50s"] || "0");
  const t20100s = parseStat(t20.batting?.["100s"] || t20["100s"] || "0");
  const t20Ducks = parseStat(t20.batting?.ducks || t20.ducks || "0");
  const t20Highest = parseStat(t20.batting?.highest || t20.highest || "0");

  const odiWkts = parseStat(odi.bowling?.wickets || odi.wickets || "0");
  const odiBowlAvg = parseStat(odi.bowling?.avg || odi.avg || "0");
  const odiEco = parseStat(odi.bowling?.eco || odi.eco || "0");
  const odiBowlSR = parseStat(odi.bowling?.sr || odi.sr || "0");
  const odi4w = parseStat(odi.bowling?.["4w"] || odi["4w"] || "0");
  const odi5w = parseStat(odi.bowling?.["5w"] || odi["5w"] || "0");
  const odiBBI = odi.bowling?.bbi || odi.bbi || "-/-";

  const t20Wkts = parseStat(t20.bowling?.wickets || t20.wickets || "0");
  const t20BowlAvg = parseStat(t20.bowling?.avg || t20.avg || "0");
  const t20Eco = parseStat(t20.bowling?.eco || t20.eco || "0");
  const t20BowlSR = parseStat(t20.bowling?.sr || t20.sr || "0");
  const t204w = parseStat(t20.bowling?.["4w"] || t20["4w"] || "0");
  const t205w = parseStat(t20.bowling?.["5w"] || t20["5w"] || "0");
  const t20BBI = t20.bowling?.bbi || t20.bbi || "-/-";

  const totalMatches = odiMatches + t20Matches;
  const totalInnings = odiInnings + t20Innings;
  const totalRuns = odiRuns + t20Runs;
  const totalWkts = odiWkts + t20Wkts;
  const totalBalls = odiBalls + t20Balls;

  const weightedAvg = totalInnings > 0 ? (odiBatAvg * odiInnings + t20BatAvg * t20Innings) / totalInnings : 0;
  const weightedSR = totalBalls > 0 ? (odiBatSR * odiBalls + t20BatSR * t20Balls) / totalBalls : 0;

  // Flat exports don't carry batting SR, so fall back to average-only scoring
  // there instead of letting the missing SR halve the batting rating.
  const batScore = Math.min(100, Math.round(
    (weightedAvg / 50) * 50 + (weightedSR > 0 ? (weightedSR / 150) * 50 : (weightedAvg / 50) * 50)
  ));

  let bowlScore = 0;
  if (totalWkts > 0) {
    const weightedBowlAvg = (odiWkts > 0 || t20Wkts > 0) 
      ? (odiBowlAvg * odiWkts + t20BowlAvg * t20Wkts) / totalWkts 
      : 50;
    const weightedEco = (odiWkts > 0 || t20Wkts > 0)
      ? (odiEco * odiWkts + t20Eco * t20Wkts) / totalWkts
      : 8;
    const weightedBowlSR = (odiWkts > 0 || t20Wkts > 0)
      ? (odiBowlSR * odiWkts + t20BowlSR * t20Wkts) / totalWkts
      : 30;

    bowlScore = Math.min(100, Math.round(
      (Math.max(0, 50 - weightedBowlAvg) / 50) * 40 +
      (Math.max(0, 10 - weightedEco) / 10) * 30 +
      (Math.max(0, 50 - weightedBowlSR) / 50) * 30
    ));
  }

  const fieldScore = Math.min(100, Math.round((totalMatches / 200) * 100));

  const conScore = Math.min(100, Math.round(
    totalInnings > 0 ? (1 - (parseStat(odiDucks) + parseStat(t20Ducks)) / totalInnings) * 100 : 50
  ));

  const clutchScore = Math.min(100, Math.round(
    ((odi50s + odi100s * 2 + t2050s + t20100s * 2) / Math.max(1, totalInnings / 10)) * 20 +
    ((odi4w + odi5w * 2 + t204w + t205w * 2) / Math.max(1, totalWkts / 5)) * 20
  ));

  const overall = Math.round((batScore * 0.35 + bowlScore * 0.35 + fieldScore * 0.1 + conScore * 0.1 + clutchScore * 0.1));

  return { bat: batScore, bowl: bowlScore, field: fieldScore, con: conScore, clutch: clutchScore, overall };
}

function determineRarity(stats: ReturnType<typeof computeGameStats>, formats: any): "Common" | "Rare" | "Epic" | "Legendary" {
  const { overall, bat, bowl } = stats;
  const odi = formats.ODI || {};
  const t20 = formats.T20I || {};
  const odiWkts = parseStat(odi.bowling?.wickets || odi.wickets || "0");
  const t20Wkts = parseStat(t20.bowling?.wickets || t20.wickets || "0");
  const odi100s = parseStat(odi.batting?.["100s"] || odi["100s"] || "0");
  const t20100s = parseStat(t20.batting?.["100s"] || t20["100s"] || "0");
  const odi5w = parseStat(odi.bowling?.["5w"] || odi["5w"] || "0");
  const t205w = parseStat(t20.bowling?.["5w"] || t20["5w"] || "0");
  const totalRuns = parseStat(odi.batting?.runs || odi.runs || "0") + parseStat(t20.batting?.runs || t20.runs || "0");
  const totalWkts = odiWkts + t20Wkts;

  if (overall >= 85 || totalRuns >= 10000 || totalWkts >= 500 || (odi100s + t20100s) >= 20 || (odi5w + t205w) >= 10) {
    return "Legendary";
  }
  if (overall >= 70 || totalRuns >= 5000 || totalWkts >= 200 || (odi100s + t20100s) >= 5 || (odi5w + t205w) >= 3) {
    return "Epic";
  }
  if (overall >= 55 || totalRuns >= 1000 || totalWkts >= 50 || (odi100s + t20100s) >= 1 || (odi5w + t205w) >= 1) {
    return "Rare";
  }
  return "Common";
}

function generateDescription(player: any, stats: ReturnType<typeof computeGameStats>): string {
  const role = player.role || "Cricketer";
  const country = player.country || "";
  const batStyle = player.batting_style || "";
  const bowlStyle = player.bowling_style || "";
  
  let desc = `${role} from ${country}. `;
  if (batStyle) desc += `${batStyle}. `;
  if (bowlStyle) desc += `${bowlStyle}. `;
  
  if (stats.bat > 70) desc += "Explosive batter with high strike rate. ";
  else if (stats.bat > 50) desc += "Reliable run-scorer. ";
  
  if (stats.bowl > 70) desc += "Wicket-taking bowler with great control. ";
  else if (stats.bowl > 50) desc += "Economical bowler who builds pressure. ";
  
  if (stats.clutch > 60) desc += "Big-match player with centuries and five-fors. ";
  
  return desc.trim();
}

function generateQuote(player: any, stats: ReturnType<typeof computeGameStats>): string {
  const quotes = [
    "Play hard, play fair.",
    "Cricket is my religion.",
    "Every ball is an opportunity.",
    "Stay hungry, stay humble.",
    "The game honors the brave.",
    "Pressure makes diamonds.",
    "Champions are made in the nets.",
    "Leave everything on the field.",
  ];
  const idx = (player.name.charCodeAt(0) * 7) % quotes.length;
  return quotes[idx];
}

function parsePlayer(raw: any, country: string): CricketPlayer | null {
  if (!raw.name || !raw.formats) return null;

  const formats = {
    ODI: normalizeFormat(raw.formats.ODI, ["ODI"]),
    T20I: normalizeFormat(raw.formats.T20I || raw.formats.T20, ["T20I", "T20"]),
  };
  const cleanName = extractCleanName(raw.name);
  const stats = computeGameStats(formats);
  const rarity = determineRarity(stats, formats);
  const description = generateDescription(raw, stats);
  const quote = generateQuote(raw, stats);
  // Nepal rows keep role/style inside `bio`; international rows keep them on top level.
  const bio = raw.bio || {};
  const role = raw.role || bio.role || "Batter";
  const battingStyle = raw.batting_style || bio.batting_style || "";
  const bowlingStyle = raw.bowling_style || bio.bowling_style || "";
  const valueModel = computePlayerValueModel(formats, role);

  return {
    id: `cricket-${country}-${cleanName.replace(/\s+/g, "-").toLowerCase()}`,
    name: cleanName,
    country,
    flag: COUNTRY_FLAGS[country] || "🏏",
    image: raw.image_url || "/logo.png",
    countryLogo: raw.country_logo || "",
    role,
    roleEmoji: ROLE_EMOJI[role] || "🏏",
    battingStyle,
    bowlingStyle,
    valueModel,
    careerStats: {
      ODI: {
        matches: parseStat(formats.ODI.batting?.matches || formats.ODI.matches || "0"),
        innings: parseStat(formats.ODI.batting?.innings || formats.ODI.innings || "0"),
        balls: parseStat(formats.ODI.batting?.balls || formats.ODI.balls || "0"),
        runs: parseStat(formats.ODI.batting?.runs || formats.ODI.runs || "0"),
        average: parseStat(formats.ODI.batting?.average || formats.ODI.average || "0"),
        strikeRate: parseStat(formats.ODI.batting?.sr || formats.ODI.sr || "0"),
        highest: parseStat(formats.ODI.batting?.highest || formats.ODI.highest || "0"),
        fifties: parseStat(formats.ODI.batting?.["50s"] || formats.ODI["50s"] || "0"),
        hundreds: parseStat(formats.ODI.batting?.["100s"] || formats.ODI["100s"] || "0"),
        wickets: parseStat(formats.ODI.bowling?.wickets || formats.ODI.wickets || "0"),
        bowlingAverage: parseStat(formats.ODI.bowling?.avg || formats.ODI.avg || "0"),
        economy: parseStat(formats.ODI.bowling?.eco || formats.ODI.eco || "0"),
        bestBowling: formats.ODI.bowling?.bbi || formats.ODI.bbi || "-/-",
      },
      T20I: {
        matches: parseStat(formats.T20I.batting?.matches || formats.T20I.matches || "0"),
        innings: parseStat(formats.T20I.batting?.innings || formats.T20I.innings || "0"),
        balls: parseStat(formats.T20I.batting?.balls || formats.T20I.balls || "0"),
        runs: parseStat(formats.T20I.batting?.runs || formats.T20I.runs || "0"),
        average: parseStat(formats.T20I.batting?.average || formats.T20I.average || "0"),
        strikeRate: parseStat(formats.T20I.batting?.sr || formats.T20I.sr || "0"),
        highest: parseStat(formats.T20I.batting?.highest || formats.T20I.highest || "0"),
        fifties: parseStat(formats.T20I.batting?.["50s"] || formats.T20I["50s"] || "0"),
        hundreds: parseStat(formats.T20I.batting?.["100s"] || formats.T20I["100s"] || "0"),
        wickets: parseStat(formats.T20I.bowling?.wickets || formats.T20I.wickets || "0"),
        bowlingAverage: parseStat(formats.T20I.bowling?.avg || formats.T20I.avg || "0"),
        economy: parseStat(formats.T20I.bowling?.eco || formats.T20I.eco || "0"),
        bestBowling: formats.T20I.bowling?.bbi || formats.T20I.bbi || "-/-",
      },
    },
    gameStats: {
      bat: stats.bat,
      bowl: stats.bowl,
      field: stats.field,
      con: stats.con,
      clutch: stats.clutch,
    },
    overallPower: stats.overall,
    rarity,
    description,
    quote,
    signatureEmoji: ROLE_EMOJI[role] || "🏏",
    // New enrichment fields — pass through from dataset if present
    ...(raw.bowling_category ? { bowlingCategory: raw.bowling_category } : {}),
    ...(raw.favorable_positions ? { favorablePositions: raw.favorable_positions } : {}),
    ...(raw.secondary_positions ? { secondaryPositions: raw.secondary_positions } : {}),
    ...(raw.captaincy ? { captaincy: raw.captaincy } : {}),
    ...(raw.keeping ? { keeping: raw.keeping } : {}),
    ...(Array.isArray(raw.traits) ? { traits: raw.traits } : {}),
    ...(raw.peak_ranking ? { peakRanking: raw.peak_ranking } : {}),
    ...(Array.isArray(raw.clues) ? { clues: raw.clues } : {}),
  };
}

let cachedPlayers: CricketPlayer[] | null = null;
let cachedCountries: string[] | null = null;

export function loadAllCricketPlayers(): CricketPlayer[] {
  if (cachedPlayers) return cachedPlayers;

  const players: CricketPlayer[] = [];

  try {
    // The final file is the single source of truth. It currently stores all
    // 431 players in `players`, while keeping country on each player record.
    // The grouped shape is supported too so future dataset exports remain
    // compatible without reintroducing separate country files.
    const dataset = finalData as any;
    const entries: Array<{ raw: any; country: string }> = [];

    if (Array.isArray(dataset.players)) {
      for (const raw of dataset.players) {
        entries.push({ raw, country: raw.country || dataset.country || "Unknown" });
      }
    } else if (dataset.countries && typeof dataset.countries === "object") {
      for (const [country, countryPlayers] of Object.entries(dataset.countries as Record<string, any[]>)) {
        for (const raw of countryPlayers || []) {
          entries.push({ raw, country: raw.country || country });
        }
      }
    } else if (Array.isArray(dataset)) {
      for (const raw of dataset) {
        entries.push({ raw, country: raw.country || "Unknown" });
      }
    }

    for (const { raw, country } of entries) {
      const parsed = parsePlayer(raw, country);
      if (parsed) players.push(parsed);
    }
  } catch (e) {
    console.warn("Could not load nepal_players_final.json", e);
  }

  cachedPlayers = players;
  return players;
}

export function getAllPlayers(): CricketPlayer[] {
  return loadAllCricketPlayers();
}

export function getPlayersByCountry(country: string): CricketPlayer[] {
  return getAllPlayers().filter(p => p.country === country);
}

export function getCountries(): string[] {
  if (cachedCountries) return cachedCountries;
  const players = getAllPlayers();
  const countryMap = new Map<string, number>();
  for (const p of players) {
    countryMap.set(p.country, (countryMap.get(p.country) || 0) + 1);
  }
  cachedCountries = Array.from(countryMap.keys()).sort((a, b) => (countryMap.get(b) || 0) - (countryMap.get(a) || 0));
  return cachedCountries;
}

export function getCountryInfo(country: string): { name: string; flag: string; count: number; topPlayers: CricketPlayer[] } {
  const players = getPlayersByCountry(country);
  const sorted = [...players].sort((a, b) => b.overallPower - a.overallPower);
  return {
    name: country,
    flag: COUNTRY_FLAGS[country] || "🏏",
    count: players.length,
    topPlayers: sorted.slice(0, 5),
  };
}

export function getRandomPlayers(count: number, countries?: string[]): CricketPlayer[] {
  const pool = countries ? getAllPlayers().filter(p => countries.includes(p.country)) : getAllPlayers();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
