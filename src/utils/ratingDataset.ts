export interface RawRatingCharacter {
  name: string;
  anime_category: string;
  favorites: number;
  image_url: string;
  rating: number;
}

export const RATING_ANIME_NAMES = [
  "One Piece",
  "Naruto",
  "Dragon Ball",
  "Bleach",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "Attack on Titan",
  "Fullmetal Alchemist",
  "Chainsaw Man",
] as const;

export const RATING_ANIME_SET: Set<string> = new Set(RATING_ANIME_NAMES);

// Empty dataset - characters_with_rating.json not available
// The anime battle game will use builtin CHARACTERS instead
export const ratingDataset: RawRatingCharacter[] = [];

export function getCharactersByAnime(_animeName: string): RawRatingCharacter[] {
  return [];
}