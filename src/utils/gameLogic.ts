import { Character, SlottedTeam, RoleId } from "../types";
import { CHARACTERS } from "../data/characters";

const rarityWeight: Record<Character["rarity"], number> = {
  Common: 1.15,
  Rare: 1.85,
  Epic: 1.45,
  Legendary: 1.05,
};

export const getRequiredRarityForTeam = (slots: SlottedTeam): Character["rarity"] | null => {
  const team = Object.values(slots).filter(Boolean) as Character[];
  const hasLegendary = team.some((character) => character.rarity === "Legendary");
  const hasEpic = team.some((character) => character.rarity === "Epic");

  if (Math.random() < 0.85) return null;

  if (!hasLegendary) return "Legendary";
  if (!hasEpic) return "Epic";
  return null;
};

export const normalizeCharacterName = (name: string): string => 
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const normalizeAnimeName = (anime: string): string => 
  anime.trim().toLowerCase();

export const pickVariedCharacter = (availableCharacters: Character[], alreadySeenCharacters: Character[]): Character => {
  const seenAnimeCounts = new Map<string, number>();
  const seenNames = new Set(alreadySeenCharacters.map((character) => normalizeCharacterName(character.name)));

  for (const character of alreadySeenCharacters) {
    if (!character.anime) continue;
    const animeKey = normalizeAnimeName(character.anime);
    seenAnimeCounts.set(animeKey, (seenAnimeCounts.get(animeKey) || 0) + 1);
  }

  const uniqueCharacters = availableCharacters.filter(
    (character) => !seenNames.has(normalizeCharacterName(character.name))
  );
  const pool = uniqueCharacters.length > 0 ? uniqueCharacters : availableCharacters;

  // Safety: if pool is empty, fall back to CHARACTERS
  const finalPool = pool.length > 0 ? pool : CHARACTERS;

  const weightedPool = finalPool.map((character) => {
    const animeKey = character.anime ? normalizeAnimeName(character.anime) : "";
    const animeRepeatCount = animeKey ? seenAnimeCounts.get(animeKey) || 0 : 0;
    const animeWeight = 1 / (1 + animeRepeatCount * 1.6);
    return {
      character,
      weight: rarityWeight[character.rarity] * animeWeight,
    };
  });

  const totalWeight = weightedPool.reduce((total, item) => total + item.weight, 0);
  let pickPoint = Math.random() * totalWeight;

  for (const item of weightedPool) {
    pickPoint -= item.weight;
    if (pickPoint <= 0) return item.character;
  }

  return finalPool[Math.floor(Math.random() * finalPool.length)];
};

export const getBalancedCharacterPool = (
  availableCharacters: Character[],
  activeSlots: SlottedTeam,
  opponentSlots: SlottedTeam
): Character[] => {
  const activePower = getTeamDraftPower(activeSlots);
  const opponentPower = getTeamDraftPower(opponentSlots);
  const activePickCount = Object.values(activeSlots).filter(Boolean).length;
  const opponentPickCount = Object.values(opponentSlots).filter(Boolean).length;

  if (activePickCount === 0 || opponentPickCount === 0) return availableCharacters;
  if (activePower <= opponentPower + 90) return availableCharacters;

  const opponentAveragePower = opponentPower / opponentPickCount;
  const maxAllowedPower = Math.max(330, Math.round(opponentAveragePower + 115));
  const balancedPool = availableCharacters.filter((character) => character.overallPower <= maxAllowedPower);

  return balancedPool.length >= 8 ? balancedPool : availableCharacters;
};

export const getTeamDraftPower = (slots: SlottedTeam): number => {
  return Object.values(slots).reduce((total, character) => total + (character?.overallPower || 0), 0);
};

// Export all for external use
export type { Character, SlottedTeam, RoleId } from "../types";
export { CHARACTERS } from "../data/characters";

export const getRoleFitScore = (character: Character, role: RoleId): number => {
  const { strength, speed, iq, defense, magic } = character.stats;
  const fitScore = {
    captain: (iq + strength + magic) / 3,
    vice_captain: (iq + speed + magic) / 3,
    strategist: iq * 1.2 + (iq >= 80 ? 10 : iq <= 40 ? -20 : 0),
    defender: defense,
    healer: (magic + iq + defense) / 3,
    support_speed: (speed + iq) / 2,
    support_power: (magic + strength) / 2,
    traitor: (strength + speed + magic) / 3,
  }[role];

  return Math.round(fitScore);
};

export const getRoleSuitabilityLabel = (fitScore: number): string => {
  if (fitScore >= 92) return "Perfect Fit";
  if (fitScore >= 82) return "Strong Fit";
  if (fitScore >= 70) return "Stable Fit";
  if (fitScore >= 58) return "Weak Fit";
  return "Bad Fit";
};

export const getRoleFitMultiplier = (fitScore: number): number => {
  if (fitScore >= 94) return 1.24;
  if (fitScore >= 86) return 1.14;
  if (fitScore >= 76) return 1.04;
  if (fitScore >= 66) return 0.94;
  if (fitScore >= 56) return 0.82;
  if (fitScore >= 46) return 0.68;
  return 0.52;
};

export const selectAiSlot = (character: Character, currentAiSlots: SlottedTeam): RoleId => {
  const emptyKeys = (Object.keys(currentAiSlots) as RoleId[]).filter((k) => !currentAiSlots[k]);
  if (emptyKeys.length === 0) return "captain";

  return emptyKeys.reduce((bestRole, role) => {
    return getRoleFitScore(character, role) > getRoleFitScore(character, bestRole) ? role : bestRole;
  }, emptyKeys[0]);
};