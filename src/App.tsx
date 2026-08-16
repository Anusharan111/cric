// Anime Battle Main Application - Mobile Optimized
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Pusher from "pusher-js";
import {
  Swords,
  Users,
  Computer,
  Sparkles,
  RefreshCw,
  Play,
  RotateCcw,
  Zap,
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
  AlertCircle,
  Cpu,
  Loader2,
  UserPlus,
  X,
  Globe,
  Plus,
  LogIn
} from "lucide-react";

import { Character, CricketPlayer, MatchHistory, RoleId, SlottedTeam, BattleReport, MatchType } from "./types";
import { ROLE_CATEGORIES } from "./data/roles";
import { CHARACTERS } from "./data/characters";
import CharacterCard from "./components/common/CharacterCard";
import TeamSlots from "./components/common/TeamSlots";
import DeployModal from "./components/ui/DeployModal";
import CharacterSearch from "./components/common/CharacterSearch";
import AnimeFeudGame from "./pages/AnimeFeudGame";
import AnimeGuessWhoGame from "./pages/AnimeGuessWhoGame";
import AnimePartyGames from "./pages/AnimePartyGames";
import CricketGuessWhoGame from "./pages/CricketGuessWhoGame";
import CricketPartyGames from "./pages/CricketPartyGames";
import LandingPage from "./LandingPage";
import { sfx } from "./utils/audio";
import { getCaptainSuitability, getWicketkeeperSuitability, getRoleFitScore, getRoleSuitabilityLabel, getRoleFitMultiplier } from "./utils/roleUtils";
import DraftView from "./components/ui/DraftView";
import { DraftPoolSettings, DraftPoolSummary } from "./components/DraftPoolSettings";
import { ratingDataset, RATING_ANIME_SET, getCharactersByAnime } from "./utils/ratingDataset";
import { adaptRatingCharacters } from "./utils/ratingAdapter";
import { useSEO, routeSEO } from "./hooks/useSEO";
import { getAllPlayers, getCountries } from "./utils/cricketData";

type ViewState = "landing" | "draft" | "results" | "feud" | "guesswho" | "party" | "cricket-guesswho" | "cricket-party";
type GameHubMode = "hub" | "battle";
type AppHistoryState = {
  animeBattleInternal: true;
  view: ViewState;
  selectedGameHubMode?: GameHubMode;
};

const getRouteHash = (view: ViewState, selectedGameHubMode: GameHubMode = "hub") => {
  if (view === "landing" && selectedGameHubMode === "battle") return "#/battle";
  if (view === "landing") return "";
  return `#/${view}`;
};

const getPageStateFromHash = (): { view: ViewState; selectedGameHubMode: GameHubMode } => {
  const route = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (route === "battle") return { view: "landing", selectedGameHubMode: "battle" };
  if (["draft", "results", "feud", "guesswho", "party", "cricket-guesswho", "cricket-party"].includes(route)) {
    return { view: route as ViewState, selectedGameHubMode: "hub" };
  }
  return { view: "landing", selectedGameHubMode: "hub" };
};

const initialSlots: SlottedTeam = {
  opening_batsman_1: null,
  opening_batsman_2: null,
  batsman_1: null,
  batsman_2: null,
  batsman_3: null,
  all_rounder_1: null,
  all_rounder_wicketkeeper: null,
  bowler_1: null,
  bowler_2: null,
  bowler_3: null,
  last_bowler: null,
  captain: null,
  vice_captain: null,
  strategist: null,
  defender: null,
  healer: null,
  support_speed: null,
  support_power: null,
  traitor: null,
};

import CharacterImage from "./components/common/CharacterImage";
import { API_BASE } from "./config";
import {
  MIN_RECOMMENDED_POOL,
  ABSOLUTE_MIN,
  DraftQuality,
  getDraftQuality,
  getDraftQualityLabel,
  getAnimeKey,
  buildAnimeCatalog,
  getSuggestions,
  dedupeCharacters,
  DraftQueue,
} from "./utils/draftPool";

const normalizeCharacterName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const CRICKET_THEME_COLORS: Record<string, string> = {
  India: "#2d8cff",
  Australia: "#d4a817",
  England: "#d94b58",
  Pakistan: "#42bd77",
  Nepal: "#df5666",
  "South Africa": "#d7b533",
  "New Zealand": "#b8c7d9",
};

/**
 * Adjust the computed battle result by the user-selected captain / vice
 * captain. A strong, experienced leader (high suitability) earns the team
 * extra points; a weak pick deducts points. Neutral baseline is 55.
 */
const applyCaptaincyBonus = (
  stats: any,
  team1Slots: SlottedTeam,
  team2Slots: SlottedTeam,
  captainRoleId: { p1: RoleId | null; p2: RoleId | null },
  viceCaptainRoleId: { p1: RoleId | null; p2: RoleId | null },
  wicketkeeperRoleId: { p1: RoleId | null; p2: RoleId | null },
  format: "ODI" | "T20I"
): any => {
  const teamAdjustment = (team: SlottedTeam, capRole: RoleId | null, vcRole: RoleId | null, wkRole: RoleId | null): number => {
    let adj = 0;
    const captain = capRole ? team[capRole] : null;
    const vice = vcRole ? team[vcRole] : null;
    const keeper = wkRole ? team[wkRole] : null;

    const quality = (character: Character): number => {
      const cd = character.cricketData;
      if (!cd) return getCaptainSuitability(character, format);
      const matches = (cd.careerStats?.ODI?.matches || 0) + (cd.careerStats?.T20I?.matches || 0);
      const experience = Math.min(100, Math.round(Math.sqrt(matches / 150) * 100));
      const skill = cd.overallPower || character.overallPower;
      return Math.round(experience * 0.5 + skill * 0.5);
    };

    if (captain) {
      const diff = quality(captain) - 55;
      // Stronger penalty if quality is below neutral (bad captain)
      adj += diff < 0 ? diff * 1.2 : diff * 0.8;
    }
    if (vice) {
      const diff = quality(vice) - 55;
      adj += diff < 0 ? diff * 0.6 : diff * 0.4;
    }

    if (keeper) {
      const wkEval = getWicketkeeperSuitability(keeper, format);
      adj += wkEval.adjustment;
    }

    return Math.round(adj);
  };

  const p1Adj = teamAdjustment(team1Slots, captainRoleId.p1, viceCaptainRoleId.p1, wicketkeeperRoleId.p1);
  const p2Adj = teamAdjustment(team2Slots, captainRoleId.p2, viceCaptainRoleId.p2, wicketkeeperRoleId.p2);
  if (!p1Adj && !p2Adj) return stats;

  const report = stats.battleReport;
  const p1Power = Math.max(0, (report?.p1BattleScore ?? stats.player1Power ?? 0) + p1Adj);
  const p2Power = Math.max(0, (report?.p2BattleScore ?? stats.player2Power ?? 0) + p2Adj);
  const winnerId: "p1" | "p2" | "draw" = p1Power > p2Power ? "p1" : p2Power > p1Power ? "p2" : "draw";
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return {
    ...stats,
    player1Power: p1Power,
    player2Power: p2Power,
    winnerId,
    winner: winnerId === "p1" ? (stats.player1Name || "Player 1") : winnerId === "p2" ? (stats.player2Name || "Player 2") : "Draw",
    mvpReason: `${stats.mvp?.name || "MVP"} delivered peak tactical impact. Captaincy swing: ${sign(p1Adj)} vs ${sign(p2Adj)}.`,
    commentary: `${stats.commentary || ""} Captaincy: ${sign(p1Adj)} vs ${sign(p2Adj)}.`,
    battleReport: {
      ...report,
      p1Stats: { ...report?.p1Stats, overall: p1Power },
      p2Stats: { ...report?.p2Stats, overall: p2Power },
      p1BattleScore: p1Power,
      p2BattleScore: p2Power,
      bonuses: {
        ...report?.bonuses,
        p1: { ...report?.bonuses?.p1, captaincy: p1Adj },
        p2: { ...report?.bonuses?.p2, captaincy: p2Adj },
      },
    },
  };
};

const cricketPlayerToCharacter = (player: CricketPlayer): Character => ({
  id: player.id,
  name: player.name,
  anime: player.country,
  image: player.image,
  themeColor: CRICKET_THEME_COLORS[player.country] || "#8ed16a",
  stats: {
    strength: player.gameStats.bat,
    speed: player.gameStats.bowl,
    iq: player.gameStats.con,
    defense: player.gameStats.field,
    magic: player.gameStats.clutch,
  },
  overallPower: player.overallPower,
  rarity: player.rarity,
  description: `${player.country} ${player.role}. ${player.description}`,
  quote: player.quote,
  signatureEmoji: player.roleEmoji,
  source: "builtin",
  cricketData: player,
});

const CRICKET_CHARACTERS = getAllPlayers().map(cricketPlayerToCharacter);

type BattleDuel = BattleReport["duels"][number];

const CINEMATIC_ROLE_ORDER: RoleId[] = ["last_bowler", "bowler_3", "bowler_2", "bowler_1", "all_rounder_wicketkeeper", "all_rounder_1", "batsman_3", "batsman_2", "batsman_1", "opening_batsman_2", "opening_batsman_1"];

const getCinematicDuels = (duels: BattleDuel[]) => {
  const order = new Map(CINEMATIC_ROLE_ORDER.map((role, index) => [role, index]));
  return [...duels].sort((a, b) => {
    const aIndex = order.get(a.role as RoleId) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = order.get(b.role as RoleId) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
};

const getCharacterPower = (char: Character | undefined): number => {
  if (!char) return 0;
  if (char.source === "rating-dataset" && char.rating != null) {
    return char.rating;
  }
  return char.overallPower;
};

const generateLocalBattleReport = (
  p1Name: string,
  p2Name: string,
  team1: Character[],
  team2: Character[],
  p1Slots: SlottedTeam,
  p2Slots: SlottedTeam
) => {
  const roles: RoleId[] = ["opening_batsman_1", "opening_batsman_2", "batsman_1", "batsman_2", "batsman_3", "all_rounder_1", "all_rounder_wicketkeeper", "bowler_1", "bowler_2", "bowler_3", "last_bowler"];
  const roleLabels: Record<RoleId, string> = {
    opening_batsman_1: "Opening Batsman",
    opening_batsman_2: "Opening Batsman",
    batsman_1: "Batsman",
    batsman_2: "Batsman",
    batsman_3: "Batsman",
    all_rounder_1: "All-Rounder",
    all_rounder_wicketkeeper: "All-Rounder",
    bowler_1: "Bowler",
    bowler_2: "Bowler",
    bowler_3: "Bowler",
    last_bowler: "Last Bowler",
    captain: "Captain",
    vice_captain: "Vice Captain",
    strategist: "Strategist",
    defender: "Defender",
    healer: "Healer",
    support_speed: "Speed Support",
    support_power: "Power Support",
    traitor: "Traitor",
  };

  let p1DuelWins = 0;
  let p2DuelWins = 0;
  let drawDuels = 0;
  let p1Power = 0;
  let p2Power = 0;

  const duels = roles.map((roleId) => {
    const c1 = p1Slots[roleId];
    const c2 = p2Slots[roleId];
    const base1 = getCharacterPower(c1);
    const base2 = getCharacterPower(c2);
    
    const fit1 = c1 ? getRoleFitScore(c1, roleId) : 50;
    const fit2 = c2 ? getRoleFitScore(c2, roleId) : 50;
    const mult1 = c1 ? getRoleFitMultiplier(fit1) : 1.0;
    const mult2 = c2 ? getRoleFitMultiplier(fit2) : 1.0;

    const s1 = Math.round(base1 * mult1);
    const s2 = Math.round(base2 * mult2);
    let winner: "p1" | "p2" | "draw" = "draw";

    if (s1 > s2) { winner = "p1"; p1DuelWins++; }
    else if (s2 > s1) { winner = "p2"; p2DuelWins++; }
    else { drawDuels++; }
    p1Power += s1;
    p2Power += s2;

    const p1IsRating = c1?.source === "rating-dataset" && c1.rating != null;
    const p2IsRating = c2?.source === "rating-dataset" && c2.rating != null;

    return {
      role: roleId,
      label: roleLabels[roleId],
      p1Name: c1?.name || "Empty Slot",
      p2Name: c2?.name || "Empty Slot",
      p1Score: s1,
      p2Score: s2,
      p1FitScore: fit1,
      p2FitScore: fit2,
      p1BaseScore: base1,
      p2BaseScore: base2,
      p1FitMultiplier: mult1,
      p2FitMultiplier: mult2,
      p1Suitability: getRoleSuitabilityLabel(fit1),
      p2Suitability: getRoleSuitabilityLabel(fit2),
      p1FitAdjustment: Math.round(s1 - base1),
      p2FitAdjustment: Math.round(s2 - base2),
      winner,
      p1IsRating,
      p2IsRating,
      p1Rating: c1?.rating,
      p2Rating: c2?.rating,
      detail: `${winner === "draw" ? "Tie" : winner === "p1" ? c1?.name : c2?.name} won the ${roleLabels[roleId]} matchup.`
    };
  });

  const p1Captain = team1.reduce((best, player) => getCaptainSuitability(player) > getCaptainSuitability(best) ? player : best, team1[0] || CHARACTERS[0]);
  const p2Captain = team2.reduce((best, player) => getCaptainSuitability(player) > getCaptainSuitability(best) ? player : best, team2[0] || CHARACTERS[0]);
  const p1CaptainBonus = Math.round(getCaptainSuitability(p1Captain) * 0.12);
  const p2CaptainBonus = Math.round(getCaptainSuitability(p2Captain) * 0.12);
  p1Power += p1CaptainBonus;
  p2Power += p2CaptainBonus;

  const winnerId: "p1" | "p2" | "draw" = p1Power > p2Power ? "p1" : p2Power > p1Power ? "p2" : "draw";
  const winner = winnerId === "p1" ? p1Name : winnerId === "p2" ? p2Name : "Draw";
  const allChars = [...team1, ...team2];
  const mvp = allChars.reduce((best, cur) => getCharacterPower(cur) > getCharacterPower(best) ? cur : best, team1[0] || CHARACTERS[0]);

  const battleReport: BattleReport = {
    p1Stats: { strength: 80, speed: 80, iq: 80, defense: 80, magic: 80, overall: p1Power },
    p2Stats: { strength: 80, speed: 80, iq: 80, defense: 80, magic: 80, overall: p2Power },
    p1BattleScore: p1Power,
    p2BattleScore: p2Power,
    p1DuelWins,
    p2DuelWins,
    drawDuels,
    duels,
    bonuses: {
      p1: { teamPower: p1Power, duelControl: p1DuelWins * 10, completeTeam: 30, captaincy: p1CaptainBonus },
      p2: { teamPower: p2Power, duelControl: p2DuelWins * 10, completeTeam: 30, captaincy: p2CaptainBonus },
    },
    rules: ["Role Matchups: Each position competes directly.", "Captaincy: Experience adds a balanced team bonus."],
  };

  return {
    player1Power: p1Power,
    player2Power: p2Power,
    p1SubStats: battleReport.p1Stats,
    p2SubStats: battleReport.p2Stats,
    winner,
    winnerId,
    mvp,
    mvpReason: `${mvp.name} delivered peak tactical impact for the match victory.`,
    commentary: `An intense battle between ${p1Name} and ${p2Name}! ${winner} secures the win.`,
    battleReport,
  };
};

const findCharacterForDuel = (slots: SlottedTeam, duelRole: string, fallbackName: string) => {
  const slottedCharacter = slots[duelRole as RoleId];
  if (slottedCharacter) return slottedCharacter;
  return Object.values(slots).find((character) => character?.name === fallbackName) ?? null;
};

export default function App() {
  // Game Setup States
  const [view, setView] = useState<ViewState>("landing");
  const [category, setCategory] = useState<"all" | "choose">("all");
  const [allAnime, setAllAnime] = useState(false);
  const [selectedAnimes, setSelectedAnimes] = useState<string[]>([]);
  const [importedCastAnimes, setImportedCastAnimes] = useState<Set<string>>(() => new Set());
  const [player1Name, setPlayer1Name] = useState("Hero Picker");
  const [player2Name, setPlayer2Name] = useState("AI Overlord");
  const [gameMode, setGameMode] = useState<"vs-ai" | "local-2p" | "online-2p">("vs-ai");
  const [selectedGameHubMode, setSelectedGameHubMode] = useState<"hub" | "battle">("hub");
  // Shared country filter for the whole draft pool. When active, it overrides per-player country restrictions.
  const [globalCountries, setGlobalCountries] = useState<string[]>([]);
  // Per-player country restrictions. Used only when the shared country filter is empty.
  const [p1AllowedCountries, setP1AllowedCountries] = useState<string[]>([]);
  const [p2AllowedCountries, setP2AllowedCountries] = useState<string[]>([]);

  // Sync global filter into selectedAnimes/category/allAnime for existing pool logic
  useEffect(() => {
    setSelectedAnimes(globalCountries);
    setCategory(globalCountries.length === 0 ? "all" : "choose");
    setAllAnime(globalCountries.length === 0);
  }, [globalCountries]);

  // Online Multiplayer States
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineSide, setOnlineSide] = useState<"p1" | "p2" | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [isHostJoined, setIsHostJoined] = useState(true);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [onlineAction, setOnlineAction] = useState<"create" | "join" | null>(null);

  // Active Draft Slotted States
  const [round, setRound] = useState(1);
  const [activeTurn, setActiveTurn] = useState<"p1" | "p2">("p1");
  const [p1Slots, setP1Slots] = useState<SlottedTeam>(initialSlots);
  const [p2Slots, setP2Slots] = useState<SlottedTeam>(initialSlots);
  const [p1SkipUsed, setP1SkipUsed] = useState(false);
  const [p2SkipUsed, setP2SkipUsed] = useState(false);

  // Randomly rolled once per match at game start (T20I or ODI).
  const [matchType, setMatchType] = useState<MatchType>("T20I");
  const rollMatchType = () => setMatchType(Math.random() < 0.5 ? "ODI" : "T20I");

  // Tactical Roles: Captain (C), Vice Captain (VC), and Wicketkeeper (WK) designated by dragging badges.
  const [captainRoleId, setCaptainRoleId] = useState<{ p1: RoleId | null; p2: RoleId | null }>({ p1: null, p2: null });
  const [viceCaptainRoleId, setViceCaptainRoleId] = useState<{ p1: RoleId | null; p2: RoleId | null }>({ p1: null, p2: null });
  const [wicketkeeperRoleId, setWicketkeeperRoleId] = useState<{ p1: RoleId | null; p2: RoleId | null }>({ p1: null, p2: null });
  const [captaincyTip, setCaptaincyTip] = useState<{ message: string; key: number } | null>(null);
  const [awaitingCaptaincy, setAwaitingCaptaincy] = useState(false);
  const tipTimeoutRef = useRef<number | null>(null);
  const roundTipShownRef = useRef(false);

  const getCaptaincyComplete = () => {
    const sides = gameMode === "vs-ai" ? ["p1"] : ["p1", "p2"];
    return sides.every((s) => captainRoleId[s] && viceCaptainRoleId[s] && wicketkeeperRoleId[s]);
  };

  const resetCaptaincy = () => {
    setCaptainRoleId({ p1: null, p2: null });
    setViceCaptainRoleId({ p1: null, p2: null });
    setWicketkeeperRoleId({ p1: null, p2: null });
    setAwaitingCaptaincy(false);
  };

  const handleSetCaptain = (team: "p1" | "p2", roleId: RoleId) => {
    setCaptainRoleId((prev) => ({ ...prev, [team]: roleId }));
    setViceCaptainRoleId((prev) => (prev[team] === roleId ? { ...prev, [team]: null } : prev));
    setWicketkeeperRoleId((prev) => (prev[team] === roleId ? { ...prev, [team]: null } : prev));
    if (gameMode === "online-2p") {
      syncGameState({ captainRoleId: { ...captainRoleId, [team]: roleId }, viceCaptainRoleId, wicketkeeperRoleId });
    }
  };
  const handleSetViceCaptain = (team: "p1" | "p2", roleId: RoleId) => {
    setViceCaptainRoleId((prev) => ({ ...prev, [team]: roleId }));
    setCaptainRoleId((prev) => (prev[team] === roleId ? { ...prev, [team]: null } : prev));
    setWicketkeeperRoleId((prev) => (prev[team] === roleId ? { ...prev, [team]: null } : prev));
    if (gameMode === "online-2p") {
      syncGameState({ captainRoleId, viceCaptainRoleId: { ...viceCaptainRoleId, [team]: roleId }, wicketkeeperRoleId });
    }
  };
  const handleSetWicketkeeper = (team: "p1" | "p2", roleId: RoleId) => {
    setWicketkeeperRoleId((prev) => ({ ...prev, [team]: roleId }));
    setCaptainRoleId((prev) => (prev[team] === roleId ? { ...prev, [team]: null } : prev));
    setViceCaptainRoleId((prev) => (prev[team] === roleId ? { ...prev, [team]: null } : prev));
    if (gameMode === "online-2p") {
      syncGameState({ captainRoleId, viceCaptainRoleId, wicketkeeperRoleId: { ...wicketkeeperRoleId, [team]: roleId } });
    }
  };
  const handleClearCaptain = (team: "p1" | "p2") => {
    setCaptainRoleId((prev) => ({ ...prev, [team]: null }));
    if (gameMode === "online-2p") syncGameState({ captainRoleId: { ...captainRoleId, [team]: null } });
  };
  const handleClearViceCaptain = (team: "p1" | "p2") => {
    setViceCaptainRoleId((prev) => ({ ...prev, [team]: null }));
    if (gameMode === "online-2p") syncGameState({ viceCaptainRoleId: { ...viceCaptainRoleId, [team]: null } });
  };
  const handleClearWicketkeeper = (team: "p1" | "p2") => {
    setWicketkeeperRoleId((prev) => ({ ...prev, [team]: null }));
    if (gameMode === "online-2p") syncGameState({ wicketkeeperRoleId: { ...wicketkeeperRoleId, [team]: null } });
  };

  const showCaptaincyTip = (message: string) => {
    setCaptaincyTip({ message, key: Date.now() });
    if (tipTimeoutRef.current) window.clearTimeout(tipTimeoutRef.current);
    tipTimeoutRef.current = window.setTimeout(() => setCaptaincyTip(null), 6000);
  };

  // Trigger battle when captaincy is assigned after draft completion
  useEffect(() => {
    if (awaitingCaptaincy && getCaptaincyComplete()) {
      setAwaitingCaptaincy(false);
      calculateWinner(
        Object.values(p1Slots).filter(Boolean) as Character[],
        Object.values(p2Slots).filter(Boolean) as Character[],
        p1Slots,
        p2Slots
      );
    }
  }, [awaitingCaptaincy, captainRoleId, viceCaptainRoleId, wicketkeeperRoleId, gameMode, p1Slots, p2Slots]);

  // Cinematic Clash States
  const [cinematicStage, setCinematicStage] = useState<"hidden" | "intro" | "launch" | "impact" | "score" | "final">("hidden");
  const [clashIndex, setClashIndex] = useState(0);
  const [p1CinematicScore, setP1CinematicScore] = useState(0);
  const [p2CinematicScore, setP2CinematicScore] = useState(0);
  const [scoredClashIndex, setScoredClashIndex] = useState(-1);

  // Screen position of each player's placement slot for the current duel role.
  // Used to launch clash cards FROM the slot where the character was placed.
  const [slotOrigins, setSlotOrigins] = useState<{ p1: { x: number; y: number } | null; p2: { x: number; y: number } | null }>({ p1: null, p2: null });
  const clashOverlayRef = useRef<HTMLDivElement>(null);

  const measureSlotOrigins = useCallback((duelRole: string | undefined) => {
    if (!duelRole) return;
    const overlay = clashOverlayRef.current;
    const measure = (side: "p1" | "p2"): { x: number; y: number } | null => {
      const el = document.querySelector<HTMLElement>(`[data-slot-side="${side}"][data-role-id="${duelRole}"]`);
      if (!el || !overlay) return null;
      const slotRect = el.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      return {
        x: slotRect.left + slotRect.width / 2 - (overlayRect.left + overlayRect.width / 2),
        y: slotRect.top + slotRect.height / 2 - (overlayRect.top + overlayRect.height / 2),
      };
    };
    setSlotOrigins({ p1: measure("p1"), p2: measure("p2") });
  }, []);

  // Computes flat teams for compatibility with other game engines
  const p1Team = Object.values(p1Slots).filter(Boolean) as Character[];
  const p2Team = Object.values(p2Slots).filter(Boolean) as Character[];

  // Drag-and-drop state to highlight slots during active player drags
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  // Character pool track
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [mustPick, setMustPick] = useState(false);
  const [aiIsProcessing, setAiIsProcessing] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [poolExhausted, setPoolExhausted] = useState(false);
  const [importProgress, setImportProgress] = useState<{ title: string; current: number; total: number } | null>(null);

  // Persistent draft pool (built once before the draft starts)
  const draftPoolRef = useRef<Character[]>([]);
  const draftQueueRef = useRef<DraftQueue | null>(null);
  const importCacheRef = useRef<Map<string, Character[]>>(new Map());
  const [poolSize, setPoolSize] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // --- Navigation History: pushState on view change, popstate to go back ---
  const isInitialRender = useRef(true);
  const isPopstateNavigation = useRef(false);
  const winnerCalculatedRef = useRef(false);

  useEffect(() => {
    const state: AppHistoryState = { animeBattleInternal: true, view, selectedGameHubMode };
    const hash = getRouteHash(view, selectedGameHubMode);
    const url = window.location.pathname + (hash || "");

    if (isInitialRender.current) {
      // First render: replace so the landing page doesn't create a duplicate entry
      window.history.replaceState(state, "", url);
      isInitialRender.current = false;
    } else if (isPopstateNavigation.current) {
      // Navigating via browser back/forward — don't push another entry
      isPopstateNavigation.current = false;
    } else {
      // Normal in-app navigation — push a new history entry
      window.history.pushState(state, "", url);
    }
  }, [view, selectedGameHubMode]);

useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as AppHistoryState | null;
      if (state?.animeBattleInternal) {
        isPopstateNavigation.current = true;
        setView(state.view);
        if (state.selectedGameHubMode) {
          setSelectedGameHubMode(state.selectedGameHubMode);
        }
      } else {
        // If there's no internal state, go to landing (user pressed back past first page)
        isPopstateNavigation.current = true;
        setView("landing");
        setSelectedGameHubMode("hub");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Dynamic SEO meta tags per route
  const getCurrentRoute = () => {
    if (view === "landing" && selectedGameHubMode === "battle") return "battle";
    if (view === "landing") return "landing";
    return view; // draft, results, feud, guesswho, party
  };
  const currentRoute = getCurrentRoute();
  const seoConfig = routeSEO[currentRoute as keyof typeof routeSEO] || routeSEO.landing;
  useSEO(seoConfig);

  useEffect(() => {
    const lockDraftScroll = isMobile && view === "draft";
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyHeight = document.body.style.height;
    const previousHtmlHeight = document.documentElement.style.height;

    if (lockDraftScroll) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.height = "100dvh";
      document.documentElement.style.height = "100dvh";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.height = previousBodyHeight;
      document.documentElement.style.height = previousHtmlHeight;
    };
  }, [isMobile, view]);

  useEffect(() => {
    if (view === "landing") {
      window.scrollTo(0, 0);
    }
  }, [view]);

  // Result States
  const [loadingResult, setLoadingResult] = useState(false);
  const [resultData, setResultData] = useState<{
    player1Power: number;
    player2Power: number;
    p1SubStats: any;
    p2SubStats: any;
    winner: string;
    winnerId: "p1" | "p2" | "draw";
    mvp: Character;
    mvpReason?: string;
    mvpAnalysis?: {
      roleLabel: string;
      score: number;
      baseScore: number;
      fitScore: number;
      fitMultiplier: number;
      suitability: string;
      reason: string;
    };
    commentary: string;
    battleReport?: BattleReport;
  } | null>(null);

  useEffect(() => {
    const duels = resultData?.battleReport ? getCinematicDuels(resultData.battleReport.duels) : [];
    const activeDuel = duels[clashIndex];

    if (cinematicStage === "hidden") return;

    if (cinematicStage === "intro") {
      measureSlotOrigins(duels[0]?.role);
      const timer = window.setTimeout(() => setCinematicStage("launch"), 1100);
      return () => window.clearTimeout(timer);
    }

    if (!activeDuel) {
      if (cinematicStage !== "final") {
        setCinematicStage("final");
        sfx.playVictory();
      }
      const timer = window.setTimeout(() => {
        setCinematicStage("hidden");
        setView("results");
        if (gameMode === "online-2p") {
          syncGameState({ view: "results" });
        }
      }, 1700);
      return () => window.clearTimeout(timer);
    }

    if (cinematicStage === "launch") {
      const timer = window.setTimeout(() => {
        setCinematicStage("impact");
        sfx.playShowdown();
      }, 900);
      return () => window.clearTimeout(timer);
    }

    if (cinematicStage === "impact") {
      const timer = window.setTimeout(() => setCinematicStage("score"), 520);
      return () => window.clearTimeout(timer);
    }

    if (cinematicStage === "score") {
      if (scoredClashIndex !== clashIndex) {
        setScoredClashIndex(clashIndex);
        if (activeDuel.winner === "p1") {
          setP1CinematicScore((score) => score + 1);
        } else if (activeDuel.winner === "p2") {
          setP2CinematicScore((score) => score + 1);
        }
      }

      const timer = window.setTimeout(() => {
        setClashIndex((index) => index + 1);
        measureSlotOrigins(duels[clashIndex + 1]?.role);
        setCinematicStage("launch");
      }, 1300);
      return () => window.clearTimeout(timer);
    }
  }, [cinematicStage, clashIndex, gameMode, resultData?.battleReport, scoredClashIndex, measureSlotOrigins]);

  // Global States
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hottestSpotlight, setHottestSpotlight] = useState<Character>(CRICKET_CHARACTERS[0] || CHARACTERS[0]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [totalCharacters, setTotalCharacters] = useState(CRICKET_CHARACTERS.length);
  const [animeCounts, setAnimeCounts] = useState<Record<string, number>>(() => buildAnimeCatalog(CHARACTERS).animeCounts);
  const aboutCharacter = CRICKET_CHARACTERS[0] || CHARACTERS[0];

  // Extract unique anime names from the character pool
  const [animeList, setAnimeList] = useState<string[]>(() => {
    return buildAnimeCatalog(CHARACTERS).animeList;
  });
  const selectedAnimeCharacterCount = selectedAnimes.reduce(
    (total, country) => total + getAllPlayers().filter((player) => player.country === country).length,
    0
  );
  const draftQuality = getDraftQuality(selectedAnimeCharacterCount);
  const canStartDraft = category === "all" || 
    (category === "choose" && selectedAnimes.length > 0 && selectedAnimeCharacterCount >= ABSOLUTE_MIN);
  const isPoolLimited = category === "choose" && selectedAnimeCharacterCount < MIN_RECOMMENDED_POOL && selectedAnimeCharacterCount >= ABSOLUTE_MIN;

  const importCastForAnime = async (anime: string) => {
    const key = getAnimeKey(anime);
    if (importCacheRef.current.has(key)) return importCacheRef.current.get(key) as Character[];
    if (importedCastAnimes.has(key)) {
      // Load from server-side pool if already imported this session
      const latestPool = await fetchTotalCharactersCount();
      if (latestPool) {
        const cached = latestPool.filter((c) => c.anime && getAnimeKey(c.anime) === key);
        if (cached.length > 0) {
          importCacheRef.current.set(key, cached);
          return cached;
        }
      }
    }

    setImportProgress({ title: anime, current: 0, total: 0 });
    const res = await fetch(`${API_BASE}/api/anime/import-cast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animeTitle: anime, limit: 250 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setImportProgress(null);
      throw new Error(data.error || `Could not import ${anime}.`);
    }

    const importedCharacters = data.totalImported ? await fetchTotalCharactersCount() : null;
    const result: Character[] = importedCharacters
      ? importedCharacters.filter((c) => c.anime && getAnimeKey(c.anime) === getAnimeKey(data.anime || anime))
      : [];

    setImportedCastAnimes(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setImportProgress(null);
    await fetchTotalCharactersCount();

    if (result.length > 0) {
      importCacheRef.current.set(key, result);
      return result;
    }

    return [];
  };

  const fetchRosterCharacters = async (anime: string): Promise<Character[]> => {
    const key = getAnimeKey(anime);
    if (importCacheRef.current.has(key)) return importCacheRef.current.get(key) as Character[];
    try {
      const all = await fetchTotalCharactersCount();
      if (all) {
        const cached = all.filter((c) => c.anime && getAnimeKey(c.anime) === key);
        if (cached.length > 0) {
          importCacheRef.current.set(key, cached);
          return cached;
        }
      }
      const chars = await importCastForAnime(anime);
      return chars;
    } catch {
      return [];
    }
  };

  const importStarterAllAnimeCasts = async () => {
    const starterAnimes = [
      "Jujutsu Kaisen",
      "One Piece",
      "Attack on Titan",
      "Naruto",
      "Bleach",
      "Demon Slayer: Kimetsu no Yaiba",
    ];

    try {
      await Promise.all(starterAnimes.map(anime => importCastForAnime(anime)));
    } catch (error) {
      console.warn("Auto import failed", error);
    }
  };

  const fetchTotalCharactersCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/characters`);
      if (res.ok) {
        const data = await res.json();
        setTotalCharacters(data.length);
        // Build unique anime list
        const animeCatalog = buildAnimeCatalog(data);
        setAnimeList(animeCatalog.animeList);
        setAnimeCounts(animeCatalog.animeCounts);
        return data as Character[];
      }
    } catch (e) {
      console.error("Failed to fetch characters list size", e);
    }
    return null;
  };

/** Build the persistent local cricket draft pool. No anime/API imports. */
  const buildDraftPool = async (activeCountries: string[] = [], _useAll = true): Promise<Character[]> => {
    const hasSharedCountryFilter = activeCountries.length > 0;
    const selected = hasSharedCountryFilter
      ? getAllPlayers().filter((player) => activeCountries.includes(player.country))
      : getAllPlayers();
    const pool = selected.map(cricketPlayerToCharacter);
    draftPoolRef.current = pool;

    // Filter hierarchy: Global Pool → per-player restrictions (intersection).
    // Each player's queue is the Global Pool narrowed by their own nations,
    // so a restriction can only ever reduce what the Global Pool allows.
    const p1Pool = p1AllowedCountries.length > 0
      ? pool.filter((c) => c.cricketData && p1AllowedCountries.includes(c.cricketData.country))
      : pool;
    const p2Pool = p2AllowedCountries.length > 0
      ? pool.filter((c) => c.cricketData && p2AllowedCountries.includes(c.cricketData.country))
      : pool;

    p1QueueRef.current = new DraftQueue(p1Pool);
    p2QueueRef.current = new DraftQueue(p2Pool);

    setPoolSize(pool.length);
    setQueueIndex(0);
    setPoolExhausted(false);
    return pool;
  };

  // Refs for per-player queues
  const p1QueueRef = useRef<DraftQueue | null>(null);
  const p2QueueRef = useRef<DraftQueue | null>(null);

  /**
   * Draw the next character from the persistent shuffled queue for the active player.
   * No network calls — the queue was built once before the draft started.
   */
  const drawNext = async (side: "p1" | "p2"): Promise<Character | null> => {
    const activeQueue = side === "p1" ? p1QueueRef.current : p2QueueRef.current;

    if (!activeQueue || activeQueue.remaining === 0) {
      setPoolExhausted(true);
      // Rebuild the pool (from the same anime set) and reshuffle
      const activeAnimes = categoryRef.current === "choose" ? [...selectedAnimesRef.current] : [];
      const useAll = allAnimeRef.current || categoryRef.current !== "choose";
      await buildDraftPool(activeAnimes, useAll);
      setPoolExhausted(false);
      const rebuiltQueue = side === "p1" ? p1QueueRef.current : p2QueueRef.current;
      if (!rebuiltQueue || rebuiltQueue.remaining === 0) return null;
    }

    const character = side === "p1" ? p1QueueRef.current?.draw() : p2QueueRef.current?.draw();
    setQueueIndex((index) => index + 1);
    return character ?? null;
  };

  // Stable refs so async/socket callbacks always access latest values without stale closures
  const onlineRoomIdRef = useRef<string | null>(null);
  const onlineSideRef = useRef<"p1" | "p2" | null>(null);
  const gameModeRef = useRef<"vs-ai" | "local-2p" | "online-2p">("vs-ai");
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const categoryRef = useRef<"all" | "choose">(category);
  const selectedAnimesRef = useRef<string[]>(selectedAnimes);
  const allAnimeRef = useRef<boolean>(allAnime);
  const pullNewCharacterRef = useRef<
    (excludes: string[], animes: string[], slots: SlottedTeam, side: "p1" | "p2") => Promise<void>
  >(async () => {});

  const resetCinematicClash = useCallback(() => {
    setCinematicStage("hidden");
    setClashIndex(0);
    setScoredClashIndex(-1);
    setP1CinematicScore(0);
    setP2CinematicScore(0);
  }, []);

  useEffect(() => { onlineRoomIdRef.current = onlineRoomId; }, [onlineRoomId]);
  useEffect(() => { onlineSideRef.current = onlineSide; }, [onlineSide]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { categoryRef.current = category; }, [category]);
  useEffect(() => { selectedAnimesRef.current = selectedAnimes; }, [selectedAnimes]);
  useEffect(() => { allAnimeRef.current = allAnime; }, [allAnime]);

  const resetOnlineLobby = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusherRef.current?.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }
    setOnlineRoomId(null);
    onlineRoomIdRef.current = null;
    setIsWaitingForOpponent(false);
    setIsHostJoined(true);
    setOnlineSide(null);
    onlineSideRef.current = null;
    resetCinematicClash();
    setView("landing");
    setIsDeployModalOpen(false);
  }, [resetCinematicClash]);

  const ensurePusher = useCallback(async (playerName: string) => {
    if (pusherRef.current) return pusherRef.current;

    console.log("Fetching Pusher config...");
    let key = "";
    let cluster = "";
    try {
      const res = await fetch(`${API_BASE}/api/pusher/config`);
      const config = await res.json();
      key = config.key;
      cluster = config.cluster;
    } catch (err) {
      console.error("Failed to fetch Pusher config:", err);
      alert("Multiplayer is offline: server configuration missing");
      return null;
    }

    if (!key || !cluster) {
      console.error("Pusher credentials missing in config response:", { key, cluster });
      alert("Multiplayer is offline: credentials not configured on the server.");
      return null;
    }

    console.log("Initializing Pusher client with cluster:", cluster);
    const pusher = new Pusher(key, {
      cluster: cluster,
      authEndpoint: `${API_BASE}/api/pusher/auth`,
      auth: {
        params: {
          username: playerName,
        },
      },
    });

    pusher.connection.bind("connected", () => {
      console.log("Pusher connected successfully!");
    });

    pusher.connection.bind("error", (err: any) => {
      console.error("Pusher connection error:", err);
    });

    pusherRef.current = pusher;
    return pusher;
  }, []);

  const subscribeToChannel = useCallback((pusher: Pusher, roomId: string, side: "p1" | "p2", playerName: string) => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    const channelName = `presence-room-${roomId.toUpperCase()}`;
    console.log(`Subscribing to channel ${channelName} as ${side}...`);
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      console.log("Presence subscription succeeded. Members count:", members.count);
      
      if (side === "p1") {
        setOnlineRoomId(roomId);
        setOnlineSide("p1");
        onlineSideRef.current = "p1";
        setIsWaitingForOpponent(true);
        setOnlineAction(null);

        if (members.count >= 2) {
          let p2Name = "Player 2";
          members.each((member: any) => {
            if (member.id !== members.myID) {
              p2Name = member.info?.name || "Player 2";
            }
          });
          
          console.log("P2 already in room, starting game directly.");
          triggerGameStart(channel, roomId, playerName, p2Name);
        }
      } else {
        setOnlineRoomId(roomId);
        setOnlineSide("p2");
        onlineSideRef.current = "p2";
        setIsWaitingForOpponent(false);
        setOnlineAction(null);
        // Host presence: room is only ready once the admin (p1) is in the channel
        setIsHostJoined(members.count >= 2);
      }
    });

    channel.bind("pusher:member_added", (member: any) => {
      console.log("Member joined:", member.id, member.info);
      if (side === "p1") {
        const p2Name = member.info?.name || "Player 2";
        triggerGameStart(channel, roomId, playerName, p2Name);
      } else {
        // Another member (the room admin) joined — enable the joiner now
        setIsHostJoined(true);
      }
    });

    channel.bind("client-game-started", ({ roomId: rid, p1Name, p2Name, activeAnimes, useAll, matchType: mt, p1AllowedCountries: p1Allowed, p2AllowedCountries: p2Allowed }: any) => {
      console.log("client-game-started received:", { rid, p1Name, p2Name, activeAnimes, useAll, p1Allowed, p2Allowed });
      setOnlineRoomId(rid);
      onlineRoomIdRef.current = rid;
      setPlayer1Name(p1Name);
      setPlayer2Name(p2Name);
      if (p1Allowed) setP1AllowedCountries(p1Allowed);
      if (p2Allowed) setP2AllowedCountries(p2Allowed);
      setIsWaitingForOpponent(false);
      setOnlineAction(null);
      setRound(1);
      setActiveTurn("p1");
      setP1Slots(initialSlots);
      setP2Slots(initialSlots);
      setP1SkipUsed(false);
      setP2SkipUsed(false);
      setExcludedIds([]);
      setMustPick(false);
      setResultData(null);
      resetCinematicClash();
      setMatchType((mt as MatchType) || (Math.random() < 0.5 ? "ODI" : "T20I"));
      resetCaptaincy();
      setView("draft");
      setIsDeployModalOpen(false);

      // Build the persistent pool (both sides need their queues ready)
      buildDraftPool(activeAnimes || [], useAll !== false).then(() => {
        requestAnimationFrame(() => {
          pullNewCharacterRef.current([], [], initialSlots, "p1");
        });
      });
    });

    channel.bind("client-game-state-updated", (state: any) => {
      console.log("client-game-state-updated received:", state);
      if (state.winnerCalculated !== undefined) winnerCalculatedRef.current = state.winnerCalculated;
      if (state.round !== undefined) setRound(state.round);
      if (state.activeTurn !== undefined) setActiveTurn(state.activeTurn);
      if (state.p1Slots !== undefined) setP1Slots(state.p1Slots);
      if (state.p2Slots !== undefined) setP2Slots(state.p2Slots);
      if (state.p1SkipUsed !== undefined) setP1SkipUsed(state.p1SkipUsed);
      if (state.p2SkipUsed !== undefined) setP2SkipUsed(state.p2SkipUsed);
      if (state.excludedIds !== undefined) setExcludedIds(state.excludedIds);
      if (state.activeCharacter !== undefined) setActiveCharacter(state.activeCharacter);
      if (state.isCardFlipped !== undefined) setIsCardFlipped(state.isCardFlipped);
      if (state.mustPick !== undefined) setMustPick(state.mustPick);
      if (state.matchType !== undefined) setMatchType(state.matchType as MatchType);
      if (state.view !== undefined) setView(state.view);
      if (state.loadingResult !== undefined) setLoadingResult(state.loadingResult);
      if (statsMatch(state.resultData)) {
        winnerCalculatedRef.current = true;
        setResultData(state.resultData);
        setCinematicStage("hidden");
        setView("results");
      }
    });

    channel.bind("client-room-cancelled", () => {
      alert("The room was cancelled.");
      resetOnlineLobby();
    });

    channel.bind("pusher:member_removed", (member: any) => {
      console.log("Member left:", member.id, member.info);
      alert("Opponent disconnected. Returning to lobby.");
      resetOnlineLobby();
    });
  }, [resetOnlineLobby]);

  const triggerGameStart = (channel: any, roomId: string, p1Name: string, p2Name: string) => {
    setTimeout(() => {
      console.log("Triggering client-game-started...");
      const activeAnimes = categoryRef.current === "choose" ? [...selectedAnimesRef.current] : [];
      const useAll = allAnimeRef.current || categoryRef.current !== "choose";
      const matchTypeRoll: MatchType = Math.random() < 0.5 ? "ODI" : "T20I";
      channel.trigger("client-game-started", {
        roomId,
        p1Name,
        p2Name,
        activeAnimes,
        useAll,
        matchType: matchTypeRoll,
        p1AllowedCountries,
        p2AllowedCountries,
      });

      // P1 must apply the game start state locally since Pusher does not echo client events to the sender
      console.log("Applying game start state locally for P1...");
      setOnlineRoomId(roomId);
      onlineRoomIdRef.current = roomId;
      setPlayer1Name(p1Name);
      setPlayer2Name(p2Name);
      setIsWaitingForOpponent(false);
      setOnlineAction(null);
      setRound(1);
      setActiveTurn("p1");
      setP1Slots(initialSlots);
      setP2Slots(initialSlots);
      setP1SkipUsed(false);
      setP2SkipUsed(false);
      setExcludedIds([]);
      setMustPick(false);
      setResultData(null);
      resetCinematicClash();
      setMatchType(matchTypeRoll);
      resetCaptaincy();
      setView("draft");
      setIsDeployModalOpen(false);

      // Build the persistent pool before the first draw
      buildDraftPool(activeAnimes, useAll).then(() => {
        requestAnimationFrame(() => {
          pullNewCharacterRef.current([], [], initialSlots, "p1");
        });
      });
    }, 500);
  };

  // Load history and characters on startup
  useEffect(() => {
    fetchMatchHistory();
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(channelRef.current.name);
      }
      pusherRef.current?.disconnect();
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, []);

  // Auto-calculate winner in online mode when both teams are full (driven by either side)
  useEffect(() => {
    if (gameMode === "online-2p") {
      const p1Full = ROLE_CATEGORIES.every((role) => p1Slots[role.id] !== null);
      const p2Full = ROLE_CATEGORIES.every((role) => p2Slots[role.id] !== null);
      if (p1Full && p2Full && view === "draft" && !winnerCalculatedRef.current) {
        if (!getCaptaincyComplete()) {
          setAwaitingCaptaincy(true);
          showCaptaincyTip("⚠️ Assign your Captain (C) and Vice Captain (VC) to start the battle!");
          return;
        }
        winnerCalculatedRef.current = true;
        const team1 = Object.values(p1Slots).filter(Boolean) as Character[];
        const team2 = Object.values(p2Slots).filter(Boolean) as Character[];
        calculateWinner(team1, team2, p1Slots, p2Slots);
      }
    } else {
      winnerCalculatedRef.current = false;
    }
  }, [p1Slots, p2Slots, gameMode, view]);

  // Harmless popup once the 4th card has been drafted per side, reminding
  // both players to assign Captain / Vice Captain while there's still time.
  useEffect(() => {
    if (round >= 4 && !getCaptaincyComplete() && !roundTipShownRef.current) {
      roundTipShownRef.current = true;
      showCaptaincyTip("Assign your Captain and Vice Captain anytime for extra team power!");
    }
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  const statsMatch = (data: any) => {
    return data && data.winnerId;
  };

  const createOnlineRoom = async () => {
    console.log("createOnlineRoom action triggered!");
    setGameMode("online-2p");
    const name = player1Name.trim() || "Player 1";
    const pusher = await ensurePusher(name);
    if (!pusher) return;

    const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log("Generated Room ID for Pusher:", generatedId);
    
    subscribeToChannel(pusher, generatedId, "p1", name);
  };

  const joinOnlineRoom = async () => {
    if (!joinRoomId.trim()) return;
    console.log("joinOnlineRoom action triggered! Room:", joinRoomId);
    setGameMode("online-2p");
    const name = player1Name.trim() || "Player 2";
    const pusher = await ensurePusher(name);
    if (!pusher) return;

    // Joiner must wait until the room admin (host) is present in the channel
    setIsHostJoined(false);
    subscribeToChannel(pusher, joinRoomId.toUpperCase(), "p2", name);
  };

  const syncGameState = (updates: Record<string, unknown>) => {
    if (!channelRef.current || !onlineRoomIdRef.current) return;
    console.log("Emitting state update via Pusher:", updates);
    channelRef.current.trigger("client-game-state-updated", updates);
  };

  // Spotlight rotation effect
  useEffect(() => {
    // Disable background rotation during active draft/results to save resources
    if (view !== "landing") return;

    const interval = setInterval(async () => {
      try {
        const unusedChars = CRICKET_CHARACTERS.filter(c => c.id !== hottestSpotlight.id);
        const randomChar = unusedChars[Math.floor(Math.random() * unusedChars.length)];
        setHottestSpotlight(randomChar);
      } catch (e) {
        console.warn("Spotlight rotation error", e);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [hottestSpotlight.id, view]);

  const fetchMatchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/draft/history`);
      if (res.ok) {
        const data = await res.json();
        setMatchHistory(data);
      }
    } catch (e) {
      console.error("Failed to load match history", e);
    }
  };

  // ---------------- GAMEPLAY MOTIONS ----------------

  const startNewGame = async (mode: "vs-ai" | "local-2p" | "online-2p") => {
    if (mode === "online-2p") {
      if (!onlineRoomIdRef.current) {
        alert("Please create or join a room first.");
        return;
      }
      if (onlineSideRef.current !== "p1") {
        alert("Only the host can start a Revenge Match.");
        return;
      }

      // Reset game states locally
      setRound(1);
      setActiveTurn("p1");
      setP1Slots(initialSlots);
      setP2Slots(initialSlots);
      setP1SkipUsed(false);
      setP2SkipUsed(false);
      setExcludedIds([]);
      setMustPick(false);
      setResultData(null);
      resetCinematicClash();
      rollMatchType();
      resetCaptaincy();
      setView("draft");
      setIsDeployModalOpen(false);

      // Sync the initial states and view to P2
      const activeAnimes = categoryRef.current === "choose" ? [...selectedAnimesRef.current] : [];
      const useAll = allAnimeRef.current || categoryRef.current !== "choose";
      syncGameState({
        round: 1,
        activeTurn: "p1",
        p1Slots: initialSlots,
        p2Slots: initialSlots,
        p1SkipUsed: false,
        p2SkipUsed: false,
        excludedIds: [],
        mustPick: false,
        resultData: null,
        view: "draft",
        activeCharacter: null,
        isCardFlipped: true,
        matchType: matchType,
      });

      // Build the persistent pool before the first draw
      await buildDraftPool(activeAnimes, useAll);
      // Pull first card for P1
      pullNewCharacter([], [], initialSlots, "p1");
      return;
    }

    if (category === "choose" && selectedAnimes.length === 0 && !allAnime) {
      return;
    }

    setIsStartingGame(true);
    // Guard against starting when below absolute minimum
    if (category === "choose" && !allAnime && selectedAnimeCharacterCount < ABSOLUTE_MIN) {
      setIsStartingGame(false);
      return;
    }

    // Build the persistent draft pool once before the draft starts
    const activeAnimes = category === "choose" ? [...selectedAnimes] : [];
    await buildDraftPool(
      activeAnimes,
      allAnime || category === "all" || activeAnimes.length === 0
    );
    setIsStartingGame(false);

    setGameMode(mode);
    setPlayer1Name(player1Name.trim() || "Player 1");
    setPlayer2Name(mode === "vs-ai" ? "Smart AI" : player2Name.trim() || "Player 2");

    // Reset game states
    setRound(1);
    setActiveTurn("p1");
    setP1Slots(initialSlots);
    setP2Slots(initialSlots);
    setP1SkipUsed(false);
    setP2SkipUsed(false);
    setExcludedIds([]);
    setMustPick(false);
    setResultData(null);
    resetCinematicClash();
    rollMatchType();
    resetCaptaincy();
    setIsDeployModalOpen(false);
    roundTipShownRef.current = false;
    if (tipTimeoutRef.current) window.clearTimeout(tipTimeoutRef.current);
    setCaptaincyTip(null);

    // Draw the first character from the persistent queue
    pullNewCharacter([], activeAnimes, initialSlots, "p1");
    setView("draft");
  };

  /**
   * Draw the next character from the persistent shuffled queue.
   * No network calls � the queue was built once before the draft started.
   *
   * @param currentExcludes - IDs already picked/skipped this game
   * @param activeAnimes    - The resolved anime filter for this game session
   * @param targetSlots     - The slots of the player drawing
   */
  const pullNewCharacter = async (
    currentExcludes: string[],
    activeAnimes: string[],
    targetSlots: SlottedTeam,
    targetSide: "p1" | "p2"
  ) => {
    setIsCardFlipped(true); // Flip card back to hide while loading
    sfx.playCardSpin();
    setActiveCharacter(null); // Clear previous to prevent visual artifacts

    const character = await drawNext(targetSide);

    if (!character) {
      // Queue empty and rebuild failed � keep the card hidden
      setActiveCharacter(null);
      setIsCardFlipped(true);
      return;
    }

    const reveal = () => {
      setActiveCharacter(character);
      setIsCardFlipped(true);
      if (gameModeRef.current === "online-2p") {
        syncGameState({ activeCharacter: character, isCardFlipped: true });
      }
    };

    if (gameModeRef.current === "online-2p") {
      reveal();
    } else {
      setTimeout(reveal, 300);
    }
  };

  pullNewCharacterRef.current = pullNewCharacter;

  // Handle slot placement manually by drag or select
  const handleSlotSelect = (roleId: RoleId) => {
    if (!activeCharacter) return;
    if (isCardFlipped) return; // Prevent card slot insertion before reveal
    if (gameMode === "online-2p" && activeTurn !== onlineSide) return;

    const activeSlots = activeTurn === "p1" ? p1Slots : p2Slots;
    if (activeSlots[roleId]) return; // slot already occupied

    sfx.playSelect();

    // Clean up character names to prevent duplicates matching different ID strings (e.g. mal-17 vs anilist-17 or different casing)
    const pickedCharacters = [...Object.values(p1Slots), ...Object.values(p2Slots)].filter(Boolean) as Character[];
    const pickedIds = new Set(pickedCharacters.map((c) => c.id));
    const pickedNames = new Set(pickedCharacters.map((c) => normalizeCharacterName(c.name)));

    // Resolve activeAnimes from current state
    const activeAnimes = category === "choose" ? [...selectedAnimes] : [];

    const updatedExcludes = [...excludedIds, activeCharacter.id];
    
    // Check if duplicate ID or if duplicate normalized name exists in the drafted rosters
    if (pickedIds.has(activeCharacter.id) || pickedNames.has(normalizeCharacterName(activeCharacter.name))) {
      setExcludedIds(updatedExcludes);
      pullNewCharacter(updatedExcludes, activeAnimes, activeSlots, activeTurn);
      if (gameMode === "online-2p") {
        syncGameState({ excludedIds: updatedExcludes });
      }
      return;
    }

    setExcludedIds(updatedExcludes);

    if (activeTurn === "p1") {
      const nextSlots = { ...p1Slots, [roleId]: activeCharacter };
      setP1Slots(nextSlots);
      setMustPick(false);

      const nextTeam = Object.values(nextSlots).filter(Boolean) as Character[];

      if (gameMode === "local-2p") {
        setActiveTurn("p2");
        pullNewCharacter(updatedExcludes, activeAnimes, p2Slots, "p2");
      } else if (gameMode === "online-2p") {
        setActiveTurn("p2");
        syncGameState({
          p1Slots: nextSlots,
          activeTurn: "p2",
          excludedIds: updatedExcludes,
          mustPick: false,
          activeCharacter: null, // Clear on other side
          isCardFlipped: true
        });
        pullNewCharacter(updatedExcludes, activeAnimes, p2Slots, "p2");
      } else {
        // AI Turn — pass activeAnimes so AI's async flow uses the same filter
        setActiveTurn("p2");
        triggerAiTurn(nextTeam, nextSlots, p2Slots, updatedExcludes, activeAnimes, round);
      }
    } else {
      // Local or Online P2 Turn
      const nextSlots = { ...p2Slots, [roleId]: activeCharacter };
      setP2Slots(nextSlots);
      setMustPick(false);

      const nextTeam = Object.values(nextSlots).filter(Boolean) as Character[];

      if (round < ROLE_CATEGORIES.length) {
        setRound(round + 1);
        setActiveTurn("p1");
        pullNewCharacter(updatedExcludes, activeAnimes, p1Slots, "p1");
        if (gameMode === "online-2p") {
          syncGameState({
            p2Slots: nextSlots,
            activeTurn: "p1",
            round: round + 1,
            excludedIds: updatedExcludes,
            mustPick: false,
            activeCharacter: null,
            isCardFlipped: true
          });
        }
      } else {
        const p1CurrentTeam = Object.values(p1Slots).filter(Boolean) as Character[];
        // In online mode, the useEffect hook triggers the winner calculation on P1's client to synchronize both sides
        if (gameModeRef.current !== "online-2p") {
          if (!getCaptaincyComplete()) {
            setAwaitingCaptaincy(true);
            showCaptaincyTip("⚠️ Draft complete! Assign Captain (C) and Vice Captain (VC) for both teams to start the battle!");
          } else {
            calculateWinner(p1CurrentTeam, nextTeam, p1Slots, nextSlots);
          }
        }
        if (gameModeRef.current === "online-2p") {
          syncGameState({
            p2Slots: nextSlots,
            excludedIds: updatedExcludes,
            mustPick: false,
            activeCharacter: null
          });
        }
      }
    }
  };

  // Quick fallback if player hits "Pick Character" directly
  const handlePick = (character: Character) => {
    const activeSlots = activeTurn === "p1" ? p1Slots : p2Slots;
    const firstEmpty = ROLE_CATEGORIES.map((role) => role.id).find((key) => !activeSlots[key]);
    if (firstEmpty) {
      handleSlotSelect(firstEmpty);
    }
  };

  const handleSkip = () => {
    if (gameMode === "online-2p" && activeTurn !== onlineSide) return;

    sfx.playSkip();

    if (activeTurn === "p1") {
      if (p1SkipUsed) return;
      setP1SkipUsed(true);
    } else {
      if (p2SkipUsed) return;
      setP2SkipUsed(true);
    }

    if (!activeCharacter) return;

    const activeAnimes = category === "choose" ? [...selectedAnimes] : [];
    const nextExcludes = [...excludedIds, activeCharacter.id];
    setExcludedIds(nextExcludes);
    setMustPick(true); // Player must pick the next revealed fighter

    // Move the skipped character to the END of the queue so it naturally
    // returns only after the remaining queue has been processed.
    draftQueueRef.current?.skipToEnd(activeCharacter);

    pullNewCharacter(nextExcludes, activeAnimes, activeTurn === "p1" ? p1Slots : p2Slots, activeTurn === "p1" ? "p1" : "p2");

    if (gameMode === "online-2p") {
      syncGameState({
        p1SkipUsed: activeTurn === "p1" ? true : p1SkipUsed,
        p2SkipUsed: activeTurn === "p2" ? true : p2SkipUsed,
        excludedIds: nextExcludes,
        mustPick: true,
        activeCharacter: null,
        isCardFlipped: true
      });
    }
  };

  // ---------------- AI LOGIC SIMULATION ----------------

  const selectAiSlot = (character: Character, currentAiSlots: SlottedTeam): RoleId => {
    const emptyKeys = ROLE_CATEGORIES.map((role) => role.id).filter((k) => !currentAiSlots[k]);
    if (emptyKeys.length === 0) return "opening_batsman_1"; // Safety fallback

    return emptyKeys.reduce((bestRole, role) => {
      return getRoleFitScore(character, role) > getRoleFitScore(character, bestRole) ? role : bestRole;
    }, emptyKeys[0]);
  };

  /**
   * Run the AI's turn.
   *
   * @param activeAnimes - Passed explicitly so all nested async callbacks
   *                       use the same filter value without reading stale state.
   */
  const triggerAiTurn = (
    p1CurrentTeam: Character[],
    p1CurrentSlots: SlottedTeam,
    currentAiSlots: SlottedTeam,
    currentExcludes: string[],
    activeAnimes: string[],
    currentRound: number
  ) => {
    setAiIsProcessing(true);

    // Helper: draw the next character from the persistent queue (no network)
    const fetchCandidate = async (excludes: string[], targetSlots: SlottedTeam): Promise<Character | null> => {
      return drawNext("p2");
    };

    setTimeout(async () => {
      const candidate = await fetchCandidate(currentExcludes, currentAiSlots);
      if (!candidate) {
        setAiIsProcessing(false);
        return;
      }

      setActiveCharacter(candidate);
      setIsCardFlipped(true);

      // AI "thinks" then reveals
      setTimeout(() => {
        setIsCardFlipped(false);

        setTimeout(async () => {
          const decisionCriteria = 430;
          const shouldSkip = candidate.overallPower < decisionCriteria && !p2SkipUsed;

          if (shouldSkip) {
            // AI decides to skip — move candidate to end of queue
            setP2SkipUsed(true);
            draftQueueRef.current?.skipToEnd(candidate);
            const nextExcludes = [...currentExcludes, candidate.id];
            setExcludedIds(nextExcludes);

            setTimeout(async () => {
              const forcedCandidate = await fetchCandidate(nextExcludes, currentAiSlots);
              if (!forcedCandidate) {
                setAiIsProcessing(false);
                return;
              }

              setActiveCharacter(forcedCandidate);
              setIsCardFlipped(true);

              setTimeout(() => {
                setIsCardFlipped(false);

                setTimeout(() => {
                  const chosenSlot = selectAiSlot(forcedCandidate, currentAiSlots);
                  const nextSlots = { ...currentAiSlots, [chosenSlot]: forcedCandidate };
                  setP2Slots(nextSlots);

                  const finalTeam = Object.values(nextSlots).filter(Boolean) as Character[];
                  const finalExcludes = [...nextExcludes, forcedCandidate.id];
                  setExcludedIds(finalExcludes);

                  advanceRoundOrFinish(p1CurrentTeam, finalTeam, p1CurrentSlots, nextSlots, finalExcludes, activeAnimes, currentRound);
                }, 1200);
              }, 1000);
            }, 800);

          } else {
            // AI decides to pick
            const chosenSlot = selectAiSlot(candidate, currentAiSlots);
            const nextSlots = { ...currentAiSlots, [chosenSlot]: candidate };
            setP2Slots(nextSlots);

            const finalTeam = Object.values(nextSlots).filter(Boolean) as Character[];
            const finalExcludes = [...currentExcludes, candidate.id];
            setExcludedIds(finalExcludes);

            advanceRoundOrFinish(p1CurrentTeam, finalTeam, p1CurrentSlots, nextSlots, finalExcludes, activeAnimes, currentRound);
          }
        }, 1500);
      }, 1000);
    }, 1000);
  };

  /**
   * Advance to the next round or end the game.
   *
   * @param activeAnimes - Forwarded explicitly so pullNewCharacter uses
   *                       the correct filter without a stale state read.
   */
  const advanceRoundOrFinish = (
    team1: Character[],
    team2: Character[],
    team1Slots: SlottedTeam,
    team2Slots: SlottedTeam,
    excludes: string[],
    activeAnimes: string[],
    currentRound: number
  ) => {
    setAiIsProcessing(false);
    if (currentRound < ROLE_CATEGORIES.length) {
      const nextRound = currentRound + 1;
      setRound(nextRound);
      setActiveTurn("p1");
      pullNewCharacter(excludes, activeAnimes, team1Slots, "p1");
    } else {
      if (!getCaptaincyComplete()) {
        setAwaitingCaptaincy(true);
        showCaptaincyTip("⚠️ Draft complete! Assign Captain (C) and Vice Captain (VC) to start the battle!");
      } else {
        calculateWinner(team1, team2, team1Slots, team2Slots);
      }
    }
  };

  // ---------------- WINNER CALCULATIONS ----------------

  const calculateWinner = async (
    team1: Character[],
    team2: Character[],
    team1Slots: SlottedTeam = p1Slots,
    team2Slots: SlottedTeam = p2Slots
  ) => {
    winnerCalculatedRef.current = true;
    setLoadingResult(true);
    sfx.playShowdown();
    if (gameMode === "online-2p") {
      syncGameState({ loadingResult: true, winnerCalculated: true });
    }

    let stats: any = null;

    try {
      const res = await fetch(`${API_BASE}/api/draft/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Name,
          player2Name,
          player1Team: team1,
          player2Team: team2,
          player1Slots: team1Slots,
          player2Slots: team2Slots,
        }),
      });

      if (res.ok) {
        stats = await res.json();
      }
    } catch (e) {
      console.warn("API calculate failed, using local fallback:", e);
    }

    if (!stats || !stats.battleReport) {
      stats = generateLocalBattleReport(player1Name, player2Name, team1, team2, team1Slots, team2Slots);
    }

    stats = applyCaptaincyBonus(stats, team1Slots, team2Slots, captainRoleId, viceCaptainRoleId, wicketkeeperRoleId, matchType);

    setResultData(stats);
    setActiveCharacter(null);
    setIsDeployModalOpen(false);

    // End directly on the team analysis; no extra final duel sequence.
    setCinematicStage("hidden");
    setView("results");

    if (gameMode === "online-2p") {
      syncGameState({ resultData: stats, loadingResult: false, winnerCalculated: true, activeCharacter: null });
    }

    try {
      await fetch(`${API_BASE}/api/draft/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Name,
          player2Name,
          player1Team: team1,
          player2Team: team2,
          player1Power: stats.player1Power,
          player2Power: stats.player2Power,
          winner: stats.winner,
          mvp: stats.mvp,
          commentary: stats.commentary,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }),
      });

      fetchMatchHistory();
    } catch (_) {}

    setLoadingResult(false);
  };

  const renderDraftCardArea = () => {
    return (
      <>
        {poolExhausted && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-3xl border border-nexus-cyan/20">
            <div className="space-y-4 text-center p-4">
              <RefreshCw className="w-10 h-10 text-nexus-cyan animate-spin mx-auto" style={{ animationDuration: '1.5s' }} />
              <div className="space-y-1">
                <p className="text-sm font-mono text-nexus-cyan font-black uppercase tracking-[0.25em] animate-pulse">
                  Character Pool Exhausted
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Reshuffling Characters...</p>
              </div>
            </div>
          </div>
        )}
        {activeCharacter ? (
          <div className="flex flex-col items-center gap-4 sm:gap-6 w-full animate-fadeIn relative z-10">
            {aiIsProcessing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-3xl border border-nexus-purple/20">
                <div className="space-y-4 sm:space-y-6 text-center p-4">
                  <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-nexus-purple/20 animate-spin" style={{ animationDuration: '8s' }} />
                    <div className="absolute inset-4 rounded-full border-2 border-nexus-purple animate-ping" />
                    <Cpu className="w-6 h-6 sm:w-10 sm:h-10 text-nexus-purple" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-mono text-nexus-purple font-black uppercase tracking-[0.2em] animate-pulse">
                      Analyzing Stats Matrix...
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-slate-500 font-mono">Optimizing combat equilibrium</p>
                  </div>
                </div>
              </div>
            )}

            <CharacterCard
              character={activeCharacter}
              isFlipped={isCardFlipped}
              activePlayerName={activeTurn === "p1" ? player1Name : player2Name}
              activeTurn={activeTurn}
              matchType={matchType}
              onClickBackSide={() => {
                if (gameMode === "online-2p" && activeTurn !== onlineSide) return;
                setIsCardFlipped(false);
                sfx.playReveal(activeCharacter.rarity);
                if (gameMode === "online-2p") {
                  syncGameState({ isCardFlipped: false });
                }
              }}
              onDragStart={(e) => {
                if (gameMode === "online-2p" && activeTurn !== onlineSide) {
                  e.preventDefault();
                  return;
                }
                if (e.dataTransfer) {
                  e.dataTransfer.setData("text/plain", activeCharacter.id);
                  e.dataTransfer.effectAllowed = "move";
                }
                setIsDraggingActive(true);
              }}
              onDragEnd={() => setIsDraggingActive(false)}
              onTouchDrop={(roleId) => {
                if (gameMode === "online-2p" && activeTurn !== onlineSide) return;
                handleSlotSelect(roleId as RoleId);
              }}
            />

            <AnimatePresence>
              {isCardFlipped ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-2 py-2 select-none"
                >
                  <p className="text-xs sm:text-sm font-mono text-nexus-cyan font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] flex items-center justify-center gap-2 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> CLICK TO DECRYPT <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </p>
                  <p className="text-[8px] sm:text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                    Identify your next tactical asset
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2.5 w-full max-w-[320px] sm:max-w-[360px] px-2"
                >
                  {!aiIsProcessing && (
                    <>
                      <button
                        id={`btn-pick-${activeCharacter.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (gameMode === "online-2p" && activeTurn !== onlineSide) return;
                          setIsDeployModalOpen(true);
                        }}
                        className="group relative w-full py-4 sm:py-4 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(30,144,255,0.3)] hover:shadow-[0_0_40px_rgba(0,229,255,0.5)] transition-all active:scale-95 cursor-pointer touch-manipulation"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-nexus-blue via-nexus-cyan to-nexus-blue bg-[length:200%_100%] animate-pulse" />
                        <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 text-white font-black text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                          <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> RECRUIT TO TEAM
                        </div>
                      </button>

                      <button
                        id={`btn-skip-${activeCharacter.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSkip();
                        }}
                        disabled={activeTurn === "p1" ? p1SkipUsed : p2SkipUsed}
                        className={`w-full py-3 sm:py-3 rounded-xl border-2 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${(activeTurn === "p1" ? !p1SkipUsed : !p2SkipUsed)
                            ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 active:scale-95 cursor-pointer shadow-lg"
                            : "border-white/5 bg-white/5 text-slate-600 cursor-not-allowed opacity-40"
                          }`}
                      >
                        <Zap className="w-3 h-3" /> TACTICAL SKIP {activeTurn === "p1" ? (p1SkipUsed ? "(OFFLINE)" : "(ACTIVE)") : (p2SkipUsed ? "(OFFLINE)" : "(ACTIVE)")}
</button>
                      </> )}
                  </motion.div>
                )}
</AnimatePresence>
            </div>
          ) : (
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-nexus-blue animate-spin" />
            {gameMode === "online-2p" && activeTurn !== onlineSide ? (
              <p className="text-fuchsia-400 font-mono text-[8.5px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] animate-pulse">
                Waiting for {activeTurn === "p1" ? player1Name : player2Name}...
              </p>
            ) : (
              <p className="text-nexus-cyan font-mono text-[8.5px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] animate-pulse">Scanning Cricket Roster...</p>
            )}
          </div>
        )}
      </>
    );
  };

  const isMobileDraft = isMobile && view === "draft";
  const isMobileOnlineDraft = isMobileDraft && gameMode === "online-2p";
  const ownOnlineSide = onlineSide ?? activeTurn;
  const ownOnlineSlots = ownOnlineSide === "p2" ? p2Slots : p1Slots;
  const opponentOnlineSlots = ownOnlineSide === "p2" ? p1Slots : p2Slots;
  const ownOnlineSkipUsed = ownOnlineSide === "p2" ? p2SkipUsed : p1SkipUsed;
  const opponentOnlineSkipUsed = ownOnlineSide === "p2" ? p1SkipUsed : p2SkipUsed;
  const ownOnlineName = ownOnlineSide === "p2" ? player2Name : player1Name;
  const opponentOnlineName = ownOnlineSide === "p2" ? player1Name : player2Name;

  return (
    <div className={`${view === "draft" ? "h-[100dvh] overflow-hidden" : "min-h-screen overflow-x-clip"} bg-[#07130f] text-slate-100 flex flex-col font-sans relative selection:bg-cricket-gold/30`}>
      {/* Global Header/Navbar - compact */}
      <header className="sticky top-0 z-50 cricket-glass bg-[rgba(13,57,37,0.62)] backdrop-blur-2xl border-b border-cricket-gold/20 py-1.5 px-2 sm:py-2 sm:px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setView("landing")}>
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cricket-green to-cricket-light flex items-center justify-center shadow-[0_0_10px_rgba(26,92,46,0.4)] group-hover:scale-110 transition-transform duration-300">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.1em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-cricket-cream via-cricket-gold to-cricket-light cricket-glow-text">
                Cricket Battle
              </h1>
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-mono tracking-widest text-cricket-gold/70 uppercase">Battle System v2.0</span>
                <div className="w-0.5 h-0.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {(view === "draft" || view === "results") && (
              <div className={`flex items-center gap-1.5 border rounded-lg px-2 py-1 font-mono text-[8px] sm:text-[9px] font-black tracking-widest uppercase ${matchType === "T20I"
                  ? "border-nexus-cyan/40 text-nexus-cyan bg-nexus-blue/10"
                  : "border-amber-400/40 text-amber-300 bg-amber-500/10"
                }`}>
                <span className="w-1 h-1 rounded-full bg-cricket-gold animate-ping" />
                {matchType} MATCH
              </div>
            )}
            <button
              id="btn-leaderboard"
              onClick={() => {
                setShowLeaderboard(!showLeaderboard);
                setView("landing");
              }}
              className="py-1 px-2.5 rounded-lg nexus-glass border border-white/5 hover:border-nexus-cyan/40 text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 transition-all flex items-center gap-1 group"
            >
              <Award className="w-2.5 h-2.5 text-nexus-cyan group-hover:scale-125 transition-transform" /> TOP
            </button>
          </div>
        </div>
      </header>
      {/* Captaincy tip popup — top-most, persists across view changes */}
      <AnimatePresence>
        {captaincyTip && (
          <motion.div
            key={captaincyTip.key}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-24px)] max-w-md pointer-events-none"
          >
            <div className="flex items-start gap-2.5 rounded-2xl border border-cricket-gold/40 bg-gradient-to-r from-cricket-dark/95 via-black/95 to-cricket-dark/95 backdrop-blur-md px-4 py-3 shadow-[0_0_25px_rgba(212,168,23,0.25)]">
              <span className="w-7 h-7 rounded-full bg-cricket-gold/15 border border-cricket-gold/40 flex items-center justify-center flex-shrink-0">
                <Award className="w-3.5 h-3.5 text-cricket-gold" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-cricket-gold">Captaincy Reminder</p>
                <p className="text-[11px] font-mono text-cricket-cream/85 mt-0.5 leading-snug">{captaincyTip.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌌 Animated Background */}
      {view !== "landing" && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#173c2b_0%,#0d241d_45%,#06100d_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#d4a81712_1px,transparent_1px),linear-gradient(to_bottom,#d4a81712_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)] opacity-35" />
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-20" />
          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-cricket-gold rounded-full animate-pulse opacity-40 delay-700" />
          <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-cricket-green rounded-full animate-bounce opacity-20 delay-1000" />
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 w-full ${view === "landing" ? "py-0" : "max-w-7xl mx-auto px-1 py-1.5 sm:p-4"} flex flex-col justify-center relative z-10 ${view === "draft" ? "min-h-0 overflow-hidden" : ""}`}>
        <AnimatePresence mode="wait">
          {/* 1. LANDING PAGE VIEW */}
          {view === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-12 relative"
            >
              {/* Startup Loading Overlay */}
              <AnimatePresence>
                {isStartingGame && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-3xl border border-nexus-blue/20"
                  >
                    <div className="space-y-6 text-center p-8 bg-neutral-950/80 rounded-2xl border border-white/5 shadow-2xl">
                      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-dashed border-nexus-cyan/20 animate-spin" style={{ animationDuration: '6s' }} />
                        <div className="absolute inset-4 rounded-full border-2 border-nexus-cyan animate-ping" />
                        <RefreshCw className="w-10 h-10 text-nexus-cyan animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest nexus-glow-text">Loading Cricket Roster</h3>
                        <p className="text-xs font-mono text-nexus-cyan/70 font-black uppercase tracking-[0.2em] animate-pulse">
                          {importProgress?.title ? `Importing ${importProgress.title} Characters...` : "Recruiting Tactical Assets..."}
                        </p>
                        {importProgress && importProgress.total > 0 && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            {importProgress.current} / {importProgress.total} teams loaded
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono max-w-[200px] mx-auto">Reading the local international player dataset</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {showLeaderboard ? (
                <div className="w-full max-w-3xl mx-auto rounded-2xl border border-neutral-800 mirror-panel p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                        🏆 Legendary Hall of Fame
                      </h2>
                      <p className="text-xs text-neutral-500 font-mono">RECORDS OF ALL DIMENSIONAL CROSSOVER COMBATS</p>
                    </div>
                    <button
                      onClick={() => setShowLeaderboard(false)}
                      className="text-xs font-mono font-bold text-violet-400 hover:text-white"
                    >
                      Back to Home
                    </button>
                  </div>

                  {matchHistory.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <ShieldAlert className="w-8 h-8 text-neutral-700 mx-auto" />
                      <p className="text-neutral-500 text-xs font-mono">NO RECORDS LOGGED YET. DEPLOY A MATCH FIRST!</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2">
                      {matchHistory.map((match, idx) => (
                        <div
                          key={match.id}
                          className="p-4 rounded-xl border border-neutral-900 bg-neutral-900/30 flex justify-between items-center hover:border-violet-500/10 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-violet-300 font-mono">#{matchHistory.length - idx}</span>
                              <span className="text-neutral-400">{match.createdAt}</span>
                            </div>
                            <p className="text-sm font-black uppercase text-white tracking-wide">
                              {match.player1Name}{" "}
                              <span className="text-violet-500 font-normal font-mono text-xs italic">vs</span>{" "}
                              {match.player2Name}
                            </p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right font-mono">
                              <p className="text-[9px] text-neutral-500 uppercase tracking-widest">RESULT</p>
                              <p className="text-xs font-bold text-emerald-400">{match.winner} WON</p>
                              <p className="text-[10px] text-neutral-400">
                                Final battle logged
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {selectedGameHubMode === "hub" ? (
                    <LandingPage
                      onSelectBattle={() => setSelectedGameHubMode("battle")}
                      onSelectFeud={() => setView("cricket-party")}
                      onSelectGuessWho={() => setView("cricket-guesswho")}
                      onSelectParty={() => setView("cricket-party")}
                      onOpenAbout={() => setShowAbout(true)}
                    />
                  ) : (
                    <div className="pt-4">
                      {/* Back button to Hub */}
                      <div className="max-w-5xl mx-auto flex justify-start pb-4 w-full">
                        <button
                          onClick={() => setSelectedGameHubMode("hub")}
                          className="px-4 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs font-bold text-neutral-300 hover:text-white hover:border-violet-500/40 transition duration-200 cursor-pointer flex items-center gap-2"
                        >
                          ← Back to Game Hub
                        </button>
                      </div>

                      {/* GAME SETUP MATRIX */}
                      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
                        {/* Setup Controls */}
                        <div className="rounded-3xl border border-neutral-800/80 mirror-panel p-5 sm:p-8 flex flex-col justify-between space-y-6 sm:space-y-8 relative overflow-hidden shadow-2xl">
                          <div className="space-y-5">
                            <div className="flex border-b border-white/5 pb-4 items-center gap-2.5">
                              <Flame className="w-5 h-5 text-violet-400" />
                              <h2 className="text-base sm:text-lg font-black uppercase text-white font-mono tracking-wider">
                                STADIUM MATCH REGISTRATION
                              </h2>
                            </div>

                            {/* Mode selectors */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                                SELECT BATTLE DESIGN
                              </label>
                              <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                                <button
                                  disabled={!isHostJoined}
                                  onClick={() => {
                                    setGameMode("vs-ai");
                                    setPlayer2Name("Smart AI");
                                    setOnlineAction(null);
                                  }}
                                  className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer ${!isHostJoined ? "opacity-40 pointer-events-none" : ""} ${gameMode === "vs-ai"
                                      ? "border-violet-500 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                      : "border-neutral-900 bg-neutral-900/20 text-neutral-400 hover:border-neutral-800"
                                    }`}
                                >
                                  <Computer className="w-4 h-4 sm:w-5 sm:h-5" />
                                  <div>
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide">P1 VS AI</p>
                                    <p className="text-[8px] sm:text-[9px] font-mono text-neutral-500 mt-0.5">Solo Bot</p>
                                  </div>
                                </button>

                                <button
                                  disabled={!isHostJoined}
                                  onClick={() => {
                                    setGameMode("local-2p");
                                    setPlayer2Name("Hype Guest");
                                    setOnlineAction(null);
                                  }}
                                  className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer ${!isHostJoined ? "opacity-40 pointer-events-none" : ""} ${gameMode === "local-2p"
                                      ? "border-violet-500 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                      : "border-neutral-900 bg-neutral-900/20 text-neutral-400 hover:border-neutral-800"
                                    }`}
                                >
                                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                  <div>
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide">LOCAL 2P</p>
                                    <p className="text-[8px] sm:text-[9px] font-mono text-neutral-500 mt-0.5">Pass & Play</p>
                                  </div>
                                </button>

                                <button
                                  disabled={!isHostJoined}
                                  onClick={() => {
                                    setGameMode("online-2p");
                                    setOnlineAction(null);
                                  }}
                                  className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer ${!isHostJoined ? "opacity-40 pointer-events-none" : ""} ${gameMode === "online-2p"
                                      ? "border-violet-500 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                      : "border-neutral-900 bg-neutral-900/20 text-neutral-400 hover:border-neutral-800"
                                    }`}
                                >
                                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                                  <div>
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide">ONLINE 2P</p>
                                    <p className="text-[8px] sm:text-[9px] font-mono text-neutral-500 mt-0.5">Play Online</p>
                                  </div>
                                </button>
                              </div>
                            </div>

                            {gameMode === "online-2p" && !onlineRoomId && (
                              <div className="space-y-4 p-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 animate-fadeIn">
                                {!onlineAction ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      onClick={() => setOnlineAction("create")}
                                      className="py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                      <Plus className="w-4 h-4" /> Create Room
                                    </button>
                                    <button
                                      onClick={() => setOnlineAction("join")}
                                      className="py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                      <LogIn className="w-4 h-4" /> Join Room
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[10px] font-mono text-violet-300 uppercase tracking-widest">
                                        {onlineAction === "create" ? "Configure your room" : "Enter room details"}
                                      </p>
                                      <button
                                        onClick={() => setOnlineAction(null)}
                                        className="text-[9px] font-mono text-neutral-500 hover:text-white uppercase transition-colors cursor-pointer"
                                      >
                                        ← Back
                                      </button>
                                    </div>

                                    {onlineAction === "join" && (
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={joinRoomId}
                                          onChange={(e) => setJoinRoomId(e.target.value)}
                                          placeholder="ROOM CODE"
                                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 px-3 text-[10px] text-white font-mono font-bold focus:border-violet-500 focus:outline-none uppercase"
                                        />
                                        <button
                                          onClick={joinOnlineRoom}
                                          className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-black uppercase cursor-pointer"
                                        >
                                          Join
                                        </button>
                                      </div>
                                    )}

                                    {onlineAction === "join" && !isHostJoined && (
                                      <div className="flex items-center justify-center gap-2 text-[9px] text-amber-400 font-mono uppercase animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for room admin to join...
                                      </div>
                                    )}

                                    {onlineAction === "create" && (
                                      <button
                                        onClick={createOnlineRoom}
                                        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
                                      >
                                        <Plus className="w-4 h-4" /> Initialize & Generate Room
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {onlineRoomId && isWaitingForOpponent && (
                              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-3">
                                <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Room Created! Share code with friend</p>
                                <div className="flex items-center justify-center gap-3">
                                  <h3 className="text-3xl font-black text-white tracking-widest">{onlineRoomId}</h3>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(onlineRoomId).catch(() => {});
                                    }}
                                    className="text-[9px] font-mono text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1 hover:bg-emerald-500/10 transition-all cursor-pointer"
                                    title="Copy room code"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-[9px] text-neutral-500 uppercase font-mono animate-pulse">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Waiting for opponent...
                                </div>
                                <button 
                                  onClick={() => {
                                    if (channelRef.current) {
                                      channelRef.current.trigger("client-room-cancelled", {});
                                    }
                                    resetOnlineLobby();
                                    setGameMode("vs-ai");
                                  }}
                                  className="text-[9px] text-red-400 hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {onlineRoomId && !isWaitingForOpponent && !isHostJoined && (
                              <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center space-y-3">
                                <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Joined Room {onlineRoomId}</p>
                                <div className="flex items-center justify-center gap-2 text-[9px] text-neutral-400 uppercase font-mono animate-pulse">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Waiting for room admin to join...
                                </div>
                                <button 
                                  onClick={() => {
                                    if (channelRef.current) {
                                      channelRef.current.trigger("client-room-cancelled", {});
                                    }
                                    resetOnlineLobby();
                                    setGameMode("vs-ai");
                                  }}
                                  className="text-[9px] text-red-400 hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

{/* Cricket player pool */}
                            {false && (gameMode !== "online-2p" || onlineAction === "create" || (onlineRoomId && onlineSide === "p1")) && (
                              <div className="space-y-3 pt-1 animate-fadeIn">
                                <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                                  CHARACTER POOL FILTER
                                </label>
                                <div className="flex gap-2 items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAllAnime(true);
                                      setCategory("all");
                                      setSelectedAnimes([]);
                                      importStarterAllAnimeCasts().catch(console.warn);
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-mono ${allAnime ? "bg-purple-600 text-white" : "bg-neutral-800 border border-neutral-700 hover:border-amber-500 hover:bg-amber-500/10"}`}
                                  >
                                    All Anime
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAllAnime(false);
                                      setCategory("choose");
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-mono ${!allAnime ? "bg-purple-600 text-white" : "bg-neutral-800 border border-neutral-700 hover:border-amber-500 hover:bg-amber-500/10"}`}
                                  >
                                    Choose Anime
                                  </button>
                                </div>


                                {!allAnime && category === "choose" && (
                                  <div className="space-y-2">
                                    {/* Draft Quality Indicator */}
                                    <div className="flex items-center justify-between gap-2 px-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-mono font-bold ${draftQuality === "excellent" ? "text-green-400" : draftQuality === "good" ? "text-green-400" : draftQuality === "recommended" ? "text-yellow-400" : draftQuality === "limited" ? "text-orange-400" : draftQuality === "very-small" ? "text-red-400" : "text-red-400"}`}>
                                          {getDraftQualityLabel(draftQuality)}
                                        </span>
                                        <span className="hidden text-[9px] text-slate-500 font-mono">Pool: {selectedAnimeCharacterCount} characters</span>
                                      </div>
                                      <div className="h-2 flex-1 bg-neutral-800 rounded-full overflow-hidden max-w-[150px]">
                                        <div 
                                          className={`h-full rounded-full transition-all ${draftQuality === "excellent" ? "bg-green-500" : draftQuality === "good" ? "bg-green-500" : draftQuality === "recommended" ? "bg-yellow-500" : draftQuality === "limited" ? "bg-orange-500" : "bg-red-500"}`}
                                          style={{ width: `${Math.min(100, (selectedAnimeCharacterCount / 100) * 100)}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Suggestions when pool < 50 */}
                                    {selectedAnimeCharacterCount < MIN_RECOMMENDED_POOL && selectedAnimes.length > 0 && (
                                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[9px] font-mono text-amber-300">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <AlertCircle className="w-3 h-3" />
                                          <span>Limited Character Variety ({selectedAnimeCharacterCount}/{MIN_RECOMMENDED_POOL})</span>
                                        </div>
                                        <p className="text-slate-400 mb-2">Add these anime for better variety:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {getSuggestions(animeCounts, selectedAnimes, 3).map(({ anime, count }) => (
                                              <button
                                                key={anime}
                                                onClick={() => {
                                                  setSelectedAnimes((prev) => [...prev, anime]);
                                                  importCastForAnime(anime).catch(console.warn);
                                                }}
                                                className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg hover:border-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer text-[9px] font-mono"
                                              >
                                                +{anime}
                                              </button>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Anime Search & Selection (Rating Dataset) */}
                                    <CharacterSearch
                                      onSelectAnime={(animeName) => {
                                        setSelectedAnimes((prev) => [...new Set([...prev, animeName])]);
                                      }}
                                      placeholder="Search anime… e.g. One Piece, Naruto, Dragon Ball"
                                      selectedAnimes={selectedAnimes}
                                      animeList={animeList}
                                    />
                                     
                                     {selectedAnimes.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {selectedAnimes.map((anime) => (
                                          <span
                                            key={anime}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-lg"
                                          >
                                            🎯 {anime} 
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAnimes((prev) => prev.filter((a) => a !== anime));
                                              }}
                                              className="hover:text-red-400 font-bold font-sans cursor-pointer transition-colors"
                                            >
                                              ✕
                                            </button>
                                          </span>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedAnimes([]);
                                          }}
                                          className="text-[9px] font-mono text-slate-400 hover:text-red-400 transition-colors cursor-pointer self-center ml-1"
                                        >
                                          ✕ clear all
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <DraftPoolSettings
                              globalCountries={globalCountries}
                              setGlobalCountries={setGlobalCountries}
                              p1AllowedCountries={p1AllowedCountries}
                              setP1AllowedCountries={setP1AllowedCountries}
                              p2AllowedCountries={p2AllowedCountries}
                              setP2AllowedCountries={setP2AllowedCountries}
                            />

                            {/* Player Names */}
                            {(gameMode !== "online-2p" || onlineAction !== null) && (
                              <div className="space-y-3 pt-2 animate-fadeIn">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                                    PLAYER 1 SIGNATURE CALL
                                  </label>
                                  <input
                                    id="inp-p1-name"
                                    type="text"
                                    value={player1Name}
                                    onChange={(e) => setPlayer1Name(e.target.value)}
                                    placeholder="Fighter 1 Name"
                                    maxLength={16}
                                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
                                  />
                                </div>

                                {gameMode === "local-2p" && (
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                                      PLAYER 2 SIGNATURE CALL
                                    </label>
                                    <input
                                      id="inp-p2-name"
                                      type="text"
                                      value={player2Name}
                                      onChange={(e) => setPlayer2Name(e.target.value)}
                                      placeholder="Fighter 2 Name"
                                      maxLength={16}
                                      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {category === "choose" && !allAnime && selectedAnimes.length === 0 && (
                            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl font-mono text-[10px] font-bold leading-normal mt-4 shadow-sm animate-pulse">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>Please select at least one anime before starting the game.</span>
                            </div>
                          )}

                          {category === "choose" && !allAnime && selectedAnimes.length > 0 && selectedAnimeCharacterCount < ABSOLUTE_MIN && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl font-mono text-[10px] font-bold leading-normal mt-4 shadow-sm animate-pulse">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>Need at least {ABSOLUTE_MIN} characters to start. Current pool: {selectedAnimeCharacterCount}.</span>
                            </div>
                          )}

                          <DraftPoolSummary
                            globalCountries={globalCountries}
                            p1AllowedCountries={p1AllowedCountries}
                            p2AllowedCountries={p2AllowedCountries}
                          />

                          {(gameMode !== "online-2p" || (onlineRoomId && onlineSide === "p1")) && (
                            isMobile ? (
                              <button
                                id="btn-start-battle-mobile"
                                onClick={() => startNewGame(gameMode)}
                                disabled={!canStartDraft}
                                className={`w-full py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-black transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer ${!canStartDraft
                                    ? "bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-50 shadow-none scale-100"
                                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.45)] active:scale-95"
                                  }`}
                              >
                                <Play className="w-4 h-4 fill-white" /> ENTER DRAFTING ARENA <ArrowRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                id="btn-start-battle"
                                onClick={() => startNewGame(gameMode)}
                                disabled={!canStartDraft}
                                className={`w-full py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-black transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer ${!canStartDraft
                                    ? "bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-50 shadow-none scale-100"
                                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.45)] active:scale-95"
                                  }`}
                              >
                                <Play className="w-4 h-4 fill-white" /> ENTER DRAFTING ARENA <ArrowRight className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>

                        {/* Spotlight Roster Card */}
                        <div className="rounded-3xl border border-neutral-800/85 mirror-panel p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute inset-0 z-0 pointer-events-none opacity-20 filter blur-xl scale-75" style={{ background: hottestSpotlight.themeColor }} />

                          <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                              <p className="text-[10px] font-mono text-violet-400 tracking-widest uppercase font-black">
                                FEATURED SPOTLIGHT CARDS
                              </p>
                              <span className="text-[9px] font-mono bg-neutral-900 border border-white/5 px-2 py-0.5 rounded text-neutral-400 flex items-center gap-1">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: "10s" }} /> Rotating roster
                              </span>
                            </div>

                            <div className="flex gap-4 items-center">
                              <div className="relative w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden border shrink-0 shadow-lg" style={{ borderColor: `${hottestSpotlight.themeColor}44` }}>
                                <CharacterImage
                                  url={hottestSpotlight.image}
                                  name={hottestSpotlight.name}
                                  fallbackUrl={hottestSpotlight.malFallbackUrl}
                                  themeColor={hottestSpotlight.themeColor}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                <div className="absolute bottom-1.5 left-2">
                                  <p className="text-[10px] font-black truncate max-w-[80px] text-white">{hottestSpotlight.name}</p>
                                </div>
                              </div>

                              <div className="space-y-1.5 sm:space-y-2 min-w-0">
                                <span className="text-[8px] font-mono font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase">
                                  {hottestSpotlight.rarity}
                                </span>
                                <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate">{hottestSpotlight.name}</h3>
                                <p className="text-[10px] text-neutral-400 font-mono uppercase truncate">{hottestSpotlight.anime}</p>
                                <p className="text-xs text-neutral-400 leading-relaxed max-w-sm line-clamp-2">
                                  {hottestSpotlight.description}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-neutral-900/30 border border-white/5 p-3 rounded-xl font-mono text-[10px]">
                              <div>
                                <span className="text-neutral-500">RARITY CLASS</span>
                                <p className="text-base sm:text-lg font-black text-white">{hottestSpotlight.rarity}</p>
                              </div>
                              <div>
                                <span className="text-neutral-500">SIGNATURE MANIFESTO</span>
                                <p className="text-xs font-bold text-violet-400 mt-1 truncate">{hottestSpotlight.quote ? `"${hottestSpotlight.quote}"` : "Absolute Dominance"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3.5 mt-4 sm:mt-6 text-center">
                            <p className="text-[9px] font-mono uppercase text-neutral-500 tracking-widest">
                              DATABASE STATUS: {totalCharacters} PLAYERS SYNCED SUCCESSFULLY
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* MyAnimeList Live Portal Recruiter moved to navbar */}

                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* 2. DRAFTING ROOM VIEW */}
           {view === "draft" && ( <>
  <DraftView
    isMobile={isMobile}
    isMobileDraft={isMobileDraft}
    isMobileOnlineDraft={isMobileOnlineDraft}
    ownOnlineSide={ownOnlineSide}
    ownOnlineName={ownOnlineName}
    opponentOnlineName={opponentOnlineName}
    ownOnlineSlots={ownOnlineSlots}
    opponentOnlineSlots={opponentOnlineSlots}
    ownOnlineSkipUsed={ownOnlineSkipUsed}
    opponentOnlineSkipUsed={opponentOnlineSkipUsed}
    isDraggingActive={isDraggingActive}
    activeTurn={activeTurn}
    p1SkipUsed={p1SkipUsed}
    p2SkipUsed={p2SkipUsed}
    p1Slots={p1Slots}
    p2Slots={p2Slots}
    player1Name={player1Name}
    player2Name={player2Name}
    gameMode={gameMode}
    onlineSide={onlineSide}
    aiIsProcessing={aiIsProcessing}
    p1AllowedCountries={p1AllowedCountries}
    p2AllowedCountries={p2AllowedCountries}
    handleSlotSelect={handleSlotSelect}
    renderDraftCardArea={renderDraftCardArea}
    onSkip={handleSkip}
    captainRoleId={captainRoleId}
    viceCaptainRoleId={viceCaptainRoleId}
    wicketkeeperRoleId={wicketkeeperRoleId}
    onSetCaptain={handleSetCaptain}
    onSetViceCaptain={handleSetViceCaptain}
    onSetWicketkeeper={handleSetWicketkeeper}
    onClearCaptain={handleClearCaptain}
    onClearViceCaptain={handleClearViceCaptain}
    onClearWicketkeeper={handleClearWicketkeeper}
    awaitingCaptaincy={awaitingCaptaincy}
   />

              {/* Deploy Modal for scroll-free selection */}
              <AnimatePresence>
                {isDeployModalOpen && activeCharacter && (
                  <DeployModal
                    character={activeCharacter}
                    slots={activeTurn === "p1" ? p1Slots : p2Slots}
                    onSelect={(roleId) => {
                      handleSlotSelect(roleId);
                      setIsDeployModalOpen(false);
                    }}
                    onClose={() => setIsDeployModalOpen(false)}
                  />
                )}
              </AnimatePresence>

              {/* CINEMATIC CLASH OVERLAY */}
              <AnimatePresence>
                {cinematicStage !== "hidden" && resultData?.battleReport && (
                  (() => {
                    const duels = getCinematicDuels(resultData.battleReport.duels);
                    const duel = duels[clashIndex];
                    const p1Character = duel ? findCharacterForDuel(p1Slots, duel.role, duel.p1Name) : null;
                    const p2Character = duel ? findCharacterForDuel(p2Slots, duel.role, duel.p2Name) : null;
                    const p1Wins = duel?.winner === "p1";
                    const p2Wins = duel?.winner === "p2";
                    const isDraw = duel?.winner === "draw";
                    const showMath = cinematicStage === "impact" || cinematicStage === "score";

                    return (
                      <motion.div
                        ref={clashOverlayRef}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          x: cinematicStage === "impact" ? [0, -8, 7, -5, 4, 0] : 0,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: cinematicStage === "impact" ? 0.28 : 0.35 }}
                        className="absolute inset-0 z-50 overflow-hidden rounded-3xl border border-white/10 bg-transparent"
                      >
                        {/* Soft blur behind the clash so text stays readable where the dark overlay was removed */}
                        <div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" />
                        {cinematicStage !== "intro" && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-amber-300/30 text-amber-300 font-black text-[10px] uppercase tracking-widest">
                              {matchType} MATCH
                            </div>
                          )}
                        <div className="absolute top-3 left-3 right-3 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-2 font-mono shadow-2xl sm:top-5 sm:left-8 sm:right-8 sm:p-3">
                          <div className={`rounded-xl border px-3 py-2 ${cinematicStage === "score" && p1Wins ? "border-amber-300/50 bg-amber-400/15 text-amber-200" : "border-white/10 text-white"}`}>
                            <p className="truncate text-[9px] uppercase tracking-widest text-slate-400">{player1Name}</p>
                            <motion.p key={`p1-score-${p1CinematicScore}`} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-3xl font-black">{p1CinematicScore}</motion.p>
                            <p className="text-[8px] uppercase tracking-widest text-slate-500">Point Bank</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Role Clash</p>
                            <p className="mt-1 text-[9px] uppercase tracking-widest text-slate-500">{Math.min(clashIndex + 1, duels.length)} / {duels.length}</p>
                            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-300">{matchType} MATCH</p>
                          </div>
                          <div className={`rounded-xl border px-3 py-2 text-right ${cinematicStage === "score" && p2Wins ? "border-amber-300/50 bg-amber-400/15 text-amber-200" : "border-white/10 text-white"}`}>
                            <p className="truncate text-[9px] uppercase tracking-widest text-slate-400">{player2Name}</p>
                            <motion.p key={`p2-score-${p2CinematicScore}`} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-3xl font-black">{p2CinematicScore}</motion.p>
                            <p className="text-[8px] uppercase tracking-widest text-slate-500">Point Bank</p>
                          </div>
                        </div>

                        {cinematicStage === "intro" && (
                          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                            <motion.h2 initial={{ scale: 0.55, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black uppercase tracking-tighter text-white sm:text-6xl">
                              Battle Commence
                            </motion.h2>
                            <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-amber-300">Role matchup analysis engaged</p>
                          </div>
                        )}

                        {duel && cinematicStage !== "intro" && (
                          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-4 pt-24 text-center">
                            <div>
                              <h2 className="text-xl font-black uppercase tracking-widest text-white sm:text-3xl">{duel.label} Matchup</h2>
                              <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                                {duel.p1Suitability ?? "Fit"} x{(duel.p1FitMultiplier ?? 1).toFixed(2)} vs {duel.p2Suitability ?? "Fit"} x{(duel.p2FitMultiplier ?? 1).toFixed(2)}
                              </p>
                            </div>

                            <div className="relative flex w-full max-w-3xl items-center justify-center">
                              {/* Right edge slot rail */}
                              <motion.div
                                initial={{ opacity: 0, x: 70 }}
                                animate={{ opacity: cinematicStage === "launch" || cinematicStage === "impact" ? 1 : 0, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="pointer-events-none absolute right-0 z-0 h-40 w-10 rounded-l-xl border border-white/10 bg-neutral-950/70 shadow-[inset_0_0_18px_rgba(251,113,133,0.25)]"
                              >
                                <div className="h-full w-full bg-gradient-to-b from-transparent via-rose-300/10 to-transparent" />
                              </motion.div>

                              <motion.div
                                key={`p1-${duel.role}-${clashIndex}`}
                                initial={{ x: slotOrigins.p1?.x ?? -560, y: slotOrigins.p1?.y ?? 80, rotate: -14, scale: 0.85 }}
                                animate={{
                                  x: cinematicStage === "launch" ? -110 : cinematicStage === "impact" ? -18 : p1Wins ? -210 : isDraw ? -72 : -295,
                                  y: cinematicStage === "score" && p1Wins ? -250 : cinematicStage === "score" && !p1Wins ? 90 : 0,
                                  rotate: cinematicStage === "impact" ? -2 : p1Wins ? -8 : -16,
                                  scale: cinematicStage === "score" && p1Wins ? 0.64 : cinematicStage === "score" ? 0.72 : 1,
                                  opacity: cinematicStage === "score" && p2Wins ? 0.25 : 1,
                                }}
                                transition={{ duration: cinematicStage === "launch" ? 0.9 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
                                className={`relative h-56 w-36 overflow-hidden rounded-2xl border bg-neutral-950 shadow-2xl sm:h-64 sm:w-44 ${cinematicStage === "score" && p1Wins ? "border-amber-300 shadow-[0_0_42px_rgba(251,191,36,0.34)]" : "border-white/20"}`}
                              >
                                {p1Character && (
                                  <CharacterImage url={p1Character.image} fallbackUrl={p1Character.malFallbackUrl} name={p1Character.name} themeColor={p1Character.themeColor} className="h-full w-full object-cover object-top" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-3 text-left">
                                  <p className="truncate text-sm font-black uppercase text-white">{duel.p1Name}</p>
                                  <p className="font-mono text-[10px] uppercase text-nexus-cyan">{duel.p1Suitability ?? "Fit"} {duel.p1FitScore ?? 0}</p>
                                  {showMath && (
                                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-xs font-black text-amber-300">
                                      {duel.p1BaseScore ?? duel.p1Score} -&gt; {duel.p1Score}
                                    </motion.p>
                                  )}
                                </div>
                              </motion.div>

                              <AnimatePresence>
                                {cinematicStage === "impact" && (
                                  <motion.div
                                    initial={{ scale: 0.2, opacity: 0 }}
                                    animate={{ scale: 1.35, opacity: 1 }}
                                    exit={{ scale: 1.8, opacity: 0 }}
                                    className="pointer-events-none absolute z-30 flex h-44 w-44 items-center justify-center rounded-full bg-amber-300/25 shadow-[0_0_90px_rgba(250,204,21,0.65)]"
                                  >
                                    <div className="h-24 w-1 rotate-45 bg-white shadow-[0_0_24px_white]" />
                                    <div className="absolute h-24 w-1 -rotate-45 bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <motion.div
                                key={`p2-${duel.role}-${clashIndex}`}
                                initial={{ x: slotOrigins.p2?.x ?? 560, y: slotOrigins.p2?.y ?? -80, rotate: 14, scale: 0.85 }}
                                animate={{
                                  x: cinematicStage === "launch" ? 110 : cinematicStage === "impact" ? 18 : p2Wins ? 210 : isDraw ? 72 : 295,
                                  y: cinematicStage === "score" && p2Wins ? -250 : cinematicStage === "score" && !p2Wins ? -90 : 0,
                                  rotate: cinematicStage === "impact" ? 2 : p2Wins ? 8 : 16,
                                  scale: cinematicStage === "score" && p2Wins ? 0.64 : cinematicStage === "score" ? 0.72 : 1,
                                  opacity: cinematicStage === "score" && p1Wins ? 0.25 : 1,
                                }}
                                transition={{ duration: cinematicStage === "launch" ? 0.9 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
                                className={`relative h-56 w-36 overflow-hidden rounded-2xl border bg-neutral-950 shadow-2xl sm:h-64 sm:w-44 ${cinematicStage === "score" && p2Wins ? "border-amber-300 shadow-[0_0_42px_rgba(251,191,36,0.34)]" : "border-white/20"}`}
                              >
                                {p2Character && (
                                  <CharacterImage url={p2Character.image} fallbackUrl={p2Character.malFallbackUrl} name={p2Character.name} themeColor={p2Character.themeColor} className="h-full w-full object-cover object-top" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-3 text-right">
                                  <p className="truncate text-sm font-black uppercase text-white">{duel.p2Name}</p>
                                  <p className="font-mono text-[10px] uppercase text-nexus-cyan">{duel.p2Suitability ?? "Fit"} {duel.p2FitScore ?? 0}</p>
                                  {showMath && (
                                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-xs font-black text-amber-300">
                                      {duel.p2BaseScore ?? duel.p2Score} -&gt; {duel.p2Score}
                                    </motion.p>
                                  )}
                                </div>
                              </motion.div>
                            </div>

                            <AnimatePresence mode="wait">
                              {cinematicStage === "score" && (
                                <motion.div
                                  key={`${duel.role}-winner-text`}
                                  initial={{ y: 16, opacity: 0, scale: 0.9 }}
                                  animate={{ y: 0, opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="rounded-2xl border border-white/10 bg-black/55 px-5 py-3 shadow-2xl"
                                >
                                  <p className="text-xl font-black uppercase text-white">
                                    {duel.winner === "draw" ? "Draw" : `${duel.winner === "p1" ? duel.p1Name : duel.p2Name} wins`}
                                  </p>
                                  <p className="mt-1 max-w-lg text-[10px] font-mono uppercase tracking-widest text-slate-400">{duel.detail}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {cinematicStage === "final" && (
                          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                            <motion.h2 initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black uppercase text-white">
                              {resultData.winnerId === "draw" ? "Final Clash Draw" : `${resultData.winner} Wins`}
                            </motion.h2>
                            <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-amber-300">
                              Final battle score {resultData.player1Power} - {resultData.player2Power}
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCinematicStage("hidden");
                            setView("results");
                            if (gameMode === "online-2p") {
                              syncGameState({ view: "results" });
                            }
                          }}
                          className="absolute bottom-4 right-4 z-30 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-white/25 hover:text-white"
                        >
                          Skip Cinematic
                        </button>
                      </motion.div>
                    );
                  })()
                )}
              </AnimatePresence>

            </> )}

          {/* 3. SHOWDOWN RESULTS VIEW */}
          {view === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {loadingResult || !resultData ? (
                <div className="min-h-[500px] flex flex-col items-center justify-center space-y-6">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-violet-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-fuchsia-400 animate-ping" />
                    <Swords className="w-8 h-8 text-white" />
                  </div>

                  <div className="text-center space-y-1.5">
                    <h3 className="text-base font-black uppercase tracking-[0.2em] text-white">
                      EVALUATING TEAM COLLISION...
                    </h3>
                    <p className="text-xs text-violet-400 font-mono uppercase tracking-widest animate-pulse">
                      RESOLVING ROLE DUELS AND TEAM BONUSES
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      Querying dimensional caster...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 max-w-5xl mx-auto">
                  {/* WINNER BLOCK */}
                  <div className="text-center space-y-4 bg-gradient-to-b from-neutral-900/60 to-neutral-950/40 border border-neutral-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md shadow-2xl">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-fuchsia-500 to-amber-500" />

                    <div className="space-y-2">
                      <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-400 font-bold">
                        FINAL SHOWDOWN RESULT
                      </p>
                      {resultData.winnerId === "draw" ? (
                        <h1 className="text-5xl font-black uppercase tracking-tight text-white">
                          Double-KO Draw!
                        </h1>
                      ) : (
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500 animate-pulse">
                            {resultData.winner === player1Name ? player1Name : resultData.winner}
                          </span>{" "}
                          VICTORIOUS!
                        </h1>
                      )}
                    </div>

                    {resultData.mvp && (
                      <div className="flex flex-col items-center mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-sm mx-auto">
                        <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest mb-1">Match MVP</span>
                        <span className="text-xl font-black text-white">{resultData.mvp.name}</span>
                        <span className="text-[9px] font-mono text-amber-400/70 mt-1 uppercase text-center">
                          {resultData.mvpReason ?? resultData.mvpAnalysis?.reason ?? "Best role fit plus highest duel impact."}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 max-w-md mx-auto items-center py-4 mirror-panel-subtle rounded-2xl border border-white/5 font-mono">
                      <div className="text-center">
                        <p className="text-[9px] text-neutral-400 leading-none truncate">{player1Name}</p>
                        <p className="text-3xl font-black text-white mt-1">{resultData.player1Power}</p>
                        <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Battle Score</p>
                      </div>
                      <div className="text-center text-sm font-black text-neutral-600 border-x border-white/5">
                        VS
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-neutral-400 leading-none truncate">{player2Name}</p>
                        <p className="text-3xl font-black text-white mt-1">{resultData.player2Power}</p>
                        <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Battle Score</p>
                      </div>
                    </div>

                    {resultData.battleReport && (
                      <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-4 text-left">
                        <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className="text-xs font-mono font-black uppercase tracking-widest text-nexus-cyan">
                              Role Matchup Results
                            </h3>
                            <span className="text-[10px] font-mono text-slate-500">
                              {resultData.battleReport.p1DuelWins}-{resultData.battleReport.p2DuelWins}
                              {resultData.battleReport.drawDuels > 0 ? `-${resultData.battleReport.drawDuels}` : ""}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {resultData.battleReport.duels.map((duel) => (
                              <div key={duel.role} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                                <div className={`min-w-0 ${duel.winner === "p1" ? "text-amber-300" : "text-slate-400"}`}>
                                  <p className="truncate text-[10px] font-bold">{duel.p1Name}</p>
                                  <p className="text-sm font-black">{duel.p1Score}</p>
                                  <p className="text-[8px] font-mono uppercase text-slate-600">
                                    {duel.p1Suitability ?? "Fit"} {duel.p1FitScore ?? 0} x{(duel.p1FitMultiplier ?? 1).toFixed(2)}
                                  </p>
                                  <p className="text-[8px] font-mono uppercase text-slate-700">
                                    Base {duel.p1BaseScore ?? duel.p1Score} -&gt; Final {duel.p1Score}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] font-mono font-black uppercase tracking-widest text-slate-500">{duel.label}</p>
                                  <p className="text-[9px] text-slate-600">VS</p>
                                </div>
                                <div className={`min-w-0 text-right ${duel.winner === "p2" ? "text-amber-300" : "text-slate-400"}`}>
                                  <p className="truncate text-[10px] font-bold">{duel.p2Name}</p>
                                  <p className="text-sm font-black">{duel.p2Score}</p>
                                  <p className="text-[8px] font-mono uppercase text-slate-600">
                                    {duel.p2Suitability ?? "Fit"} {duel.p2FitScore ?? 0} x{(duel.p2FitMultiplier ?? 1).toFixed(2)}
                                  </p>
                                  <p className="text-[8px] font-mono uppercase text-slate-700">
                                    Base {duel.p2BaseScore ?? duel.p2Score} -&gt; Final {duel.p2Score}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-4">
                          <div>
                            <h3 className="text-xs font-mono font-black uppercase tracking-widest text-amber-300">
                              Battle Rules
                            </h3>
                            <div className="mt-3 space-y-2">
                              {resultData.battleReport.rules.map((rule, index) => (
                                <p key={rule} className="text-[10px] text-slate-400 leading-relaxed">
                                  <span className="mr-2 font-mono font-black text-slate-600">{index + 1}</span>
                                  {rule}
                                </p>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                            {(["p1", "p2"] as const).map((side) => (
                              <div key={side} className="space-y-1.5">
                                <p className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-500">
                                  {side === "p1" ? player1Name : player2Name}
                                </p>
                                {Object.entries(resultData.battleReport!.bonuses[side]).map(([label, value]) => (
                                  <div key={label} className="flex items-center justify-between gap-2 text-[10px]">
                                    <span className="capitalize text-slate-500">{label.replace(/([A-Z])/g, " $1")}</span>
                                    <span className="font-mono font-black text-white">+{value}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center gap-3 mt-4">
                      {gameMode === "online-2p" && onlineSide !== "p1" ? (
                        <button
                          id="btn-restart"
                          disabled
                          className="py-3 px-6 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-500 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed opacity-50 font-bold"
                        >
                          <RefreshCw className="w-4 h-4 animate-spin text-neutral-600" /> Waiting for Host
                        </button>
                      ) : (
                        <button
                          id="btn-restart"
                          onClick={() => startNewGame(gameMode)}
                          className="py-3 px-6 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-white font-bold"
                        >
                          <RefreshCw className="w-4 h-4 text-violet-400" /> Revenge Match
                        </button>
                      )}
                      <button
                        id="btn-return-landing"
                        onClick={() => {
                          if (gameMode === "online-2p") {
                            if (channelRef.current) {
                              channelRef.current.trigger("client-room-cancelled", {});
                            }
                            resetOnlineLobby();
                          } else {
                            setView("landing");
                          }
                        }}
                        className="py-3 px-6 rounded-xl text-neutral-100 bg-violet-600 hover:bg-violet-500 text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] font-bold"
                      >
                        <RotateCcw className="w-4 h-4" /> Return to Lobby
                      </button>
                    </div>
                  </div>

                  {/* TEAM COMPARISON */}
                  <div className="grid md:grid-cols-2 gap-6 pt-4">
                    <div className="p-4 rounded-xl border border-neutral-900 mirror-panel-subtle">
                      <h4 className="text-xs font-black font-mono uppercase tracking-widest text-violet-400 mb-3">
                        📋 {player1Name}'s Draft Team
                      </h4>
                      <div className="grid grid-cols-5 gap-2">
                        {p1Team.map((c) => (
                          <div
                            key={c.id}
                            className="aspect-[3/4] border rounded-lg overflow-hidden relative group"
                            style={{ borderColor: `${c.themeColor}33` }}
                          >
                            <CharacterImage
                              url={c.image}
                              name={c.name}
                              themeColor={c.themeColor}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                            />
                            <div className="absolute bottom-1 left-1.5 text-left max-w-[50px] truncate leading-none">
                              <span className="text-[8px] font-black font-sans text-white truncate drop-shadow-md">
                                {c.name.split(" ")[0]}
                              </span>
                            </div>
                            <div className="absolute top-1 right-1 bg-neutral-950/70 rounded px-1 text-[8px] font-mono text-white">
                              {c.rarity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-neutral-900 mirror-panel-subtle">
                      <h4 className="text-xs font-black font-mono uppercase tracking-widest text-violet-400 mb-3">
                        📋 {player2Name}'s Draft Team
                      </h4>
                      <div className="grid grid-cols-5 gap-2">
                        {p2Team.map((c) => (
                          <div
                            key={c.id}
                            className="aspect-[3/4] border rounded-lg overflow-hidden relative group"
                            style={{ borderColor: `${c.themeColor}33` }}
                          >
                            <CharacterImage
                              url={c.image}
                              name={c.name}
                              themeColor={c.themeColor}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                            />
                            <div className="absolute bottom-1 left-1.5 text-left max-w-[50px] truncate leading-none">
                              <span className="text-[8px] font-black font-sans text-white truncate drop-shadow-md">
                                {c.name.split(" ")[0]}
                              </span>
                            </div>
                            <div className="absolute top-1 right-1 bg-neutral-950/70 rounded px-1 text-[8px] font-mono text-white">
                              {c.rarity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. ANIME FEUD VIEW */}
          {view === "feud" && (
            <motion.div
              key="feud"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <AnimeFeudGame onExit={() => setView("landing")} />
            </motion.div>
          )}

          {/* 5. ANIME GUESS WHO VIEW */}
          {view === "guesswho" && (
            <motion.div
              key="guesswho"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <AnimeGuessWhoGame onExit={() => setView("landing")} />
            </motion.div>
          )}

          {view === "party" && (
            <motion.div
              key="party"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <AnimePartyGames onExit={() => setView("landing")} />
            </motion.div>
          )}

          {/* CRICKET GUESS WHO VIEW */}
          {view === "cricket-guesswho" && (
            <motion.div
              key="cricket-guesswho"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <CricketGuessWhoGame onExit={() => setView("landing")} />
            </motion.div>
          )}

          {/* CRICKET PARTY GAMES VIEW */}
          {view === "cricket-party" && (
            <motion.div
              key="cricket-party"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <CricketPartyGames onExit={() => setView("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MATCH HISTORY MODAL */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-white uppercase flex items-center gap-1.5">
                    Match History
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-400">
                    HISTORIC DRAFT HISTORIES AND CAS COMMENTS
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-lg border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-all text-xs cursor-pointer font-mono font-bold px-2 py-1"
                >
                  Close
                </button>
              </div>

              {matchHistory.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-neutral-500 font-mono text-xs">NO CHRONICLES RECORDED IN THE LOGS.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-neutral-800 bg-neutral-900/25 rounded-xl hover:border-violet-500/25 transition-all text-left space-y-3"
                    >
                      <div className="flex justify-between text-[11px] font-mono text-neutral-400 border-b border-white/5 pb-1.5">
                        <span>TIMESTAMPS: {item.createdAt}</span>
                        <span className="text-amber-400">Winner: {item.winner}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-neutral-400 font-mono leading-none">PLAYER 1 TEAM</p>
                          <p className="text-sm font-black text-white">{item.player1Name}</p>
                          <p className="text-xs font-mono text-violet-400">∑ {item.player1Power} Power</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400 font-mono leading-none">PLAYER 2 TEAM</p>
                          <p className="text-sm font-black text-white">{item.player2Name}</p>
                          <p className="text-xs font-mono text-violet-400">∑ {item.player2Power} Power</p>
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-900/50 rounded-lg text-[11px] text-neutral-300 font-sans border border-white/5 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                        {item.commentary}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ABOUT MODAL */}
      <AnimatePresence>
        {showAbout && view === "landing" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-nexus-cyan/30 bg-slate-950 shadow-[0_0_40px_rgba(0,229,255,0.18)]"
              initial={{ y: 24, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.96, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-black/50 p-2 text-white/70 transition-colors hover:text-white"
                aria-label="Close about"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="aspect-[3/4] w-full overflow-hidden bg-slate-900">
                <CharacterImage
                  url={aboutCharacter.image}
                  name={aboutCharacter.name}
                  fallbackUrl={aboutCharacter.malFallbackUrl}
                  themeColor={aboutCharacter.themeColor}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="p-5 text-center">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-nexus-cyan/70">
                  Cricket Battle
                </p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-wide text-white">
                  ANUSHARAN BHATTARAI
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
