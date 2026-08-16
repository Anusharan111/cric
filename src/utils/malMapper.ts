/**
 * Resolve the MyAnimeList ID (idMal) for a given anime title using AniList's GraphQL endpoint.
 * Returns null if the title cannot be resolved.
 */
export async function getMalIdFromAniList(title: string): Promise<number | null> {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        idMal
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { search: title } })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.Media?.idMal ?? null;
  } catch {
    return null;
  }
}
