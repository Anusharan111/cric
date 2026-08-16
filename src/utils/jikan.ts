import type { Character } from "../types";

/** Fetch all characters for a given MyAnimeList ID via Jikan v4 */
export async function fetchJikanCharacters(malId: number): Promise<Character[]> {
  const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data.map((c: any) => ({
    id: `mal-${c.character.mal_id}`,
    name: c.character.name,
    anime: c.anime?.title ?? "",
    image: c.character.images?.jpg?.image_url ?? "",
    themeColor: "#EF4444",
    stats: { strength: 70, speed: 70, iq: 70, defense: 70, magic: 70 },
    overallPower: 350,
    rarity: c.role?.toUpperCase() ?? "COMMON",
    description: c.character.about ?? "",
    signatureEmoji: "⚡",
  }));
}
