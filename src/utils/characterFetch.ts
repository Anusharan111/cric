import { Character, SlottedTeam } from "../types";
import { API_BASE } from "../config";
import { 
  getRequiredRarityForTeam, 
  getBalancedCharacterPool, 
  pickVariedCharacter,
  getTeamDraftPower,
  CHARACTERS 
} from "./gameLogic";

export interface CharacterFetchOptions {
  excludes: string[];
  activeAnimes: string[];
  targetSlots: SlottedTeam;
  opponentSlots: SlottedTeam;
  requiredRarity?: string;
}

async function fetchFromAPI(url: string): Promise<Character | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildApiUrl(options: CharacterFetchOptions): string {
  const { excludes, activeAnimes, targetSlots, opponentSlots, requiredRarity } = options;
  const activePower = getTeamDraftPower(targetSlots);
  const opponentPower = getTeamDraftPower(opponentSlots);
  const activePickCount = Object.values(targetSlots).filter(Boolean).length;
  const opponentPickCount = Object.values(opponentSlots).filter(Boolean).length;

  let url = `${API_BASE}/api/characters/random?exclude=${excludes.join(",")}&activePower=${activePower}&opponentPower=${opponentPower}&activePickCount=${activePickCount}&opponentPickCount=${opponentPickCount}`;
  
  if (activeAnimes.length > 0) {
    url += `&animes=${encodeURIComponent(activeAnimes.join(","))}`;
  }
  if (requiredRarity) {
    url += `&rarity=${encodeURIComponent(requiredRarity)}`;
  }
  return url;
}

function filterLocalPool(options: CharacterFetchOptions): Character[] {
  const { excludes, activeAnimes, targetSlots, opponentSlots, requiredRarity } = options;
  
  let available = CHARACTERS.filter((c) => !excludes.includes(c.id));
  
  if (activeAnimes.length > 0) {
    const filtered = available.filter((c) =>
      c.anime && activeAnimes.some(anime => c.anime.toLowerCase().includes(anime.toLowerCase()))
    );
    available = filtered;
  }
  
  if (requiredRarity) {
    const rarityFiltered = available.filter((c) => c.rarity === requiredRarity);
    if (rarityFiltered.length > 0) {
      available = rarityFiltered;
    }
  }
  
  available = getBalancedCharacterPool(available, targetSlots, opponentSlots);
  
  return available;
}

function pickFromPool(pool: Character[], alreadySeen: Character[]): Character | null {
  return pickVariedCharacter(pool, alreadySeen);
}

export async function pullRandomCharacter(options: CharacterFetchOptions): Promise<Character | null> {
  const { excludes, activeAnimes, targetSlots, opponentSlots, requiredRarity } = options;
  
  // Try API first
  const apiUrl = buildApiUrl(options);
  const apiCharacter = await fetchFromAPI(apiUrl);
  if (apiCharacter) return apiCharacter;
  
  // Fallback to local pool
  const localPool = filterLocalPool(options);
  const alreadySeenCharacters = [
    ...Object.values(targetSlots),
    ...Object.values(opponentSlots),
    ...CHARACTERS.filter((character) => excludes.includes(character.id)),
  ].filter(Boolean) as Character[];
  
  return pickFromPool(localPool, alreadySeenCharacters);
}