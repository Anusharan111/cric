import type { Character } from "../types";

export const MIN_RECOMMENDED_POOL = 50;
export const ABSOLUTE_MIN = 8;

export type DraftQuality = "excellent" | "good" | "recommended" | "limited" | "very-small" | "blocked";

export const getDraftQuality = (total: number): DraftQuality => {
  if (total < ABSOLUTE_MIN) return "blocked";
  if (total >= 100) return "excellent";
  if (total >= 70) return "good";
  if (total >= MIN_RECOMMENDED_POOL) return "recommended";
  if (total >= 20) return "limited";
  return "very-small";
};

export const getDraftQualityLabel = (quality: DraftQuality): string => {
  switch (quality) {
    case "excellent": return "🟢 Excellent";
    case "good": return "🟢 Good";
    case "recommended": return "🟡 Recommended";
    case "limited": return "🟠 Limited";
    case "very-small": return "🔴 Very Small";
    case "blocked": return "🔴 Blocked";
  }
};

export const getAnimeKey = (anime: string) => anime.trim().toLowerCase();

export const fisherYatesShuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const buildAnimeCatalog = (characters: Character[]) => {
  const labelsByKey = new Map<string, string>();
  const countsByLabel: Record<string, number> = {};

  for (const character of characters) {
    if (!character.anime || !getAnimeKey(character.anime)) continue;

    const key = getAnimeKey(character.anime);
    if (!labelsByKey.has(key)) {
      labelsByKey.set(key, character.anime);
    }

    const label = labelsByKey.get(key)!;
    countsByLabel[label] = (countsByLabel[label] || 0) + 1;
  }

  return {
    animeList: [...labelsByKey.values()].sort(),
    animeCounts: countsByLabel,
  };
};

/** Deduplicate characters by id, keeping the first occurrence. */
export const dedupeCharacters = (characters: Character[]): Character[] => {
  const byId = new Map<string, Character>();
  for (const character of characters) {
    if (!character?.id) continue;
    if (!byId.has(character.id)) {
      byId.set(character.id, character);
    }
  }
  return [...byId.values()];
};

/** Filter the full roster to only characters belonging to the given animes. */
export const filterCharactersByAnimes = (characters: Character[], animes: string[]): Character[] => {
  if (animes.length === 0) return characters;
  const keys = animes.map((a) => getAnimeKey(a));
  return characters.filter((c) => c.anime && keys.includes(getAnimeKey(c.anime)));
};

/**
 * Persistent draft queue with true draw-without-replacement.
 * Drawn characters are removed; skipped characters go to the end.
 */
export class DraftQueue {
  private queue: Character[];
  public poolSize: number;
  public draws: number;
  public exhausted: boolean;

  constructor(characters: Character[], shuffle: <T,>(array: T[]) => T[] = fisherYatesShuffle) {
    this.queue = shuffle(dedupeCharacters(characters));
    this.poolSize = this.queue.length;
    this.draws = 0;
    this.exhausted = this.queue.length === 0;
  }

  /** Draw the next character without replacement. Returns null when exhausted. */
  draw(): Character | null {
    if (this.queue.length === 0) {
      this.exhausted = true;
      return null;
    }
    const character = this.queue.shift() ?? null;
    if (character) this.draws += 1;
    return character;
  }

  /** Move a character to the end of the queue so it returns only after the rest. */
  skipToEnd(character: Character): void {
    this.queue.push(character);
  }

  /** Rebuild and reshuffle the queue from the full pool. */
  reshuffle(characters: Character[], shuffle: <T,>(array: T[]) => T[] = fisherYatesShuffle): void {
    this.queue = shuffle(dedupeCharacters(characters));
    this.poolSize = this.queue.length;
    this.draws = 0;
    this.exhausted = this.queue.length === 0;
  }

  get remaining(): number {
    return this.queue.length;
  }
}

/** Generate suggestions: top `limit` animes (by count) not in the selected list. */
export const getSuggestions = (
  animeCounts: Record<string, number>,
  selectedAnimes: string[],
  limit = 3
): Array<{ anime: string; count: number }> => {
  return Object.entries(animeCounts)
    .filter(([anime]) => !selectedAnimes.includes(anime))
    .map(([anime, count]) => [anime, Number(count)] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([anime, count]) => ({ anime, count }));
};
