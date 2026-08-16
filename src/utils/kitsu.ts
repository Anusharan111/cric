import type { Character } from "../types";

/** Resolve a Kitsu anime ID from a free‑text title */
export async function resolveKitsuAnimeId(title: string): Promise<string | null> {
  const q = encodeURIComponent(title.trim());
  const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${q}&page[limit]=1`);
  if (!res.ok) return null;
  const json = await res.json();
  const first = json.data?.[0];
  return first ? first.id : null;
}

/** Fetch *all* characters for a Kitsu anime ID (max 500 per page) */
export async function fetchKitsuCharacters(kitsuAnimeId: string): Promise<Character[]> {
  const res = await fetch(`https://kitsu.io/api/edge/anime/${kitsuAnimeId}/characters?page[limit]=500`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data.map((c: any) => ({
    id: `kitsu-${c.id}`,
    name: c.attributes.canonicalName ?? c.attributes.nicknames?.[0] ?? "Unnamed",
    anime: c.relationships.anime?.data?.attributes?.canonicalTitle ?? "",
    image: c.relationships.character?.data?.attributes?.image?.original ?? "",
    themeColor: "#8B5CF6",
    stats: { strength: 70, speed: 70, iq: 70, defense: 70, magic: 70 },
    overallPower: 350,
    rarity: "Common",
    description: c.attributes.description ?? "",
    signatureEmoji: "🌀",
  }));
}
