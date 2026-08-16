import { Character } from "../types";
import { CHARACTERS } from "../data/characters";

/**
 * Picks `count` random characters from CHARACTERS, ensuring diverse anime representation.
 * Tries to spread picks across different anime series before filling remaining slots randomly.
 */
export function pickGrid(count = 24): Character[] {
  if (count >= CHARACTERS.length) return [...CHARACTERS];

  // Group characters by anime
  const byAnime = new Map<string, Character[]>();
  for (const c of CHARACTERS) {
    const list = byAnime.get(c.anime) || [];
    list.push(c);
    byAnime.set(c.anime, list);
  }

  const picked: Character[] = [];
  const usedIds = new Set<string>();

  // Round-robin: pick one random character from each anime series first
  const animeKeys = [...byAnime.keys()].sort(() => Math.random() - 0.5);
  for (const anime of animeKeys) {
    if (picked.length >= count) break;
    const pool = byAnime.get(anime)!;
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const char = shuffled[0];
    picked.push(char);
    usedIds.add(char.id);
  }

  // Fill remaining slots with random characters not yet picked
  if (picked.length < count) {
    const remaining = CHARACTERS
      .filter((c) => !usedIds.has(c.id))
      .sort(() => Math.random() - 0.5);
    for (const c of remaining) {
      if (picked.length >= count) break;
      picked.push(c);
    }
  }

  // Final shuffle so positions are randomized
  return picked.sort(() => Math.random() - 0.5);
}

/**
 * Picks 2 different random characters from the grid to serve as secrets.
 */
export function pickSecrets(grid: Character[]): { p1: Character; p2: Character } {
  if (grid.length < 2) throw new Error("Grid must have at least 2 characters");

  const i1 = Math.floor(Math.random() * grid.length);
  let i2: number;
  do {
    i2 = Math.floor(Math.random() * grid.length);
  } while (i2 === i1);

  return { p1: grid[i1], p2: grid[i2] };
}
