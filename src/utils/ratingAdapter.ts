import { Character } from "../types";
import { RawRatingCharacter } from "./ratingDataset";

function seededRandom(seed: number, salt: number): number {
  let x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getRarityColor(rarity: Character["rarity"]): string {
  switch (rarity) {
    case "Legendary":
      return "#f59e0b";
    case "Epic":
      return "#a855f7";
    case "Rare":
      return "#3b82f6";
    default:
      return "#94a3b8";
  }
}

function getSignatureEmoji(rarity: Character["rarity"]): string {
  switch (rarity) {
    case "Legendary":
      return "⭐";
    case "Epic":
      return "💫";
    case "Rare":
      return "✨";
    default:
      return "⚡";
  }
}

function getRarityFromRating(rating: number): Character["rarity"] {
  if (rating >= 450) return "Legendary";
  if (rating >= 400) return "Epic";
  if (rating >= 350) return "Rare";
  return "Common";
}

export function adaptRatingCharacter(raw: RawRatingCharacter): Character {
  const baseStat = 30 + (raw.rating / 500) * 70;

  const variance = (statName: string) => {
    const v = (seededRandom(raw.favorites, statName.charCodeAt(0)) - 0.5) * 15;
    return Math.round(Math.max(1, Math.min(100, baseStat + v)));
  };

  const stats = {
    strength: variance("strength"),
    speed: variance("speed"),
    iq: variance("iq"),
    defense: variance("defense"),
    magic: variance("magic"),
  };

  const overallPower = Object.values(stats).reduce((a, b) => a + b, 0);
  const rarity = getRarityFromRating(raw.rating);

  return {
    id: `rating-${raw.anime_category}-${raw.name}`
      .replace(/\s+/g, "-")
      .toLowerCase(),
    name: raw.name,
    anime: raw.anime_category,
    image: raw.image_url,
    themeColor: getRarityColor(rarity),
    stats,
    overallPower,
    rarity,
    description: `${raw.name} from ${raw.anime_category} (Rating: ${raw.rating})`,
    quote: "",
    signatureEmoji: getSignatureEmoji(rarity),
    skills: [],
    malFallbackUrl: raw.image_url,
    rating: raw.rating,
    source: "rating-dataset",
  };
}

export function adaptRatingCharacters(rawList: RawRatingCharacter[]): Character[] {
  return rawList.map(adaptRatingCharacter);
}