import { Stadium, StadiumPitchProfile } from "../types";
import stadiumData from "../../stadiums.json";

type StadiumFormat = "ODI" | "T20I";

const STADIUM_DATASET = stadiumData as { stadiums: Stadium[] };

let cachedStadiums: Stadium[] | null = null;

export function getAllStadiums(): Stadium[] {
  if (cachedStadiums) return cachedStadiums;
  cachedStadiums = Array.isArray(STADIUM_DATASET.stadiums) ? STADIUM_DATASET.stadiums : [];
  return cachedStadiums;
}

export function getRandomStadium(): Stadium {
  const stadiums = getAllStadiums();
  if (stadiums.length === 0) {
    return {
      id: "neutral_venue",
      name: "Neutral Venue",
      city: "",
      country: "",
      country_code: "",
      flag: "🏟️",
      image_url: "",
      pitch: {
        type: "balanced",
        condition: "balanced",
        description: "A neutral playing surface.",
        grass_level: 25,
        dryness: 45,
        hardness: 70,
        bounce: 60,
        spin_assistance: 50,
        pace_assistance: 50,
        batting_friendly: 65,
      },
      recommended_attack: { spinner: 2, pace: 2, medium: 0 },
      modifiers: { max_bonus: 7, max_penalty: 6 },
    };
  }
  return stadiums[Math.floor(Math.random() * stadiums.length)];
}

export function getStadiumById(id: string | null | undefined): Stadium | null {
  if (!id) return null;
  return getAllStadiums().find((stadium) => stadium.id === id) || null;
}

export function getPitchProfile(stadium: Stadium, format: StadiumFormat): StadiumPitchProfile {
  const formatProfile = stadium.pitch_profiles?.[format];
  return formatProfile || stadium.pitch;
}

// Curated pitch surface photos keyed by visual surface archetype.
export const PITCH_IMAGES = {
  green_grassy:
    "https://scontent.fktm20-1.fna.fbcdn.net/v/t39.30808-6/775243689_1014355438094030_7947883373414242628_n.jpg?stp=dst-jpg_tt6&cstp=mx570x1154&ctp=s570x1154&_nc_cat=107&ccb=1-7&_nc_sid=127cfc&_nc_ohc=YN5L4-Az5PIQ7kNvwFnMYFF&_nc_oc=AdqACpxqSaaVAG-92ELPhvFfXxwd70qS7uB_SvW5BCuGW4oxHSYRJhL9XWH3MDamkvk&_nc_zt=23&_nc_ht=scontent.fktm20-1.fna&_nc_gid=OO5RZ1tleKIgQZpRCSwI-g&_nc_ss=7b2a8&oh=00_AQG8Au9UtlJXkWMW6EVSge0AR4i2Ut9Rwogd_qPYSdEmyw&oe=6A888D5B",

  dry_dusty:
    "https://scontent.fktm20-1.fna.fbcdn.net/v/t39.30808-6/774236860_1014351874761053_2243917799525328925_n.jpg?stp=dst-jpg_tt6&cstp=mx663x1086&ctp=s663x1086&_nc_cat=109&ccb=1-7&_nc_sid=127cfc&_nc_ohc=Map7czz43tkQ7kNvwG681wd&_nc_oc=Adpq5e6op8yK42nHMYTpvV7ygobDABuTIzMRzHtfHjB4dAe98qqhRsZsqloKPcmmqXE&_nc_zt=23&_nc_ht=scontent.fktm20-1.fna&_nc_gid=4kzLOCbRzuMRJeQ_miL7FA&_nc_ss=7b2a8&oh=00_AQH86no65ZTlaA-X7oVq6McXYjljDjDOz18K4awa1uTX0g&oe=6A88A4E8",

  cracked_worn:
    "https://scontent.fktm20-1.fna.fbcdn.net/v/t39.30808-6/778313308_1014351878094386_1799560095009375426_n.jpg?stp=dst-jpg_tt6&cstp=mx645x1192&ctp=s645x1192&_nc_cat=111&ccb=1-7&_nc_sid=127cfc&_nc_ohc=pfQX9hV5plIQ7kNvwGDy2Rr&_nc_oc=AdqVYGMRKBU44VfV9R0kWB8VhTrFGEHGyMoHzt5DU5or9M7n4KhOdFi7Z5OaKcmiS-w&_nc_zt=23&_nc_ht=scontent.fktm20-1.fna&_nc_gid=4kzLOCbRzuMRJeQ_miL7FA&_nc_ss=7b2a8&oh=00_AQERmmVgPDe_ZU0oT4v3WUkZPqX3OLKhifgCJ1TzfJxdJQ&oe=6A88AB8A",

  hard_bouncy:
    "https://scontent.fktm20-1.fna.fbcdn.net/v/t39.30808-6/776666104_1014351998094374_1866419129510737628_n.jpg?stp=dst-jpg_tt6&cstp=mx589x1128&ctp=s589x1128&_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=lwP2ZKmj-McQ7kNvwH-l8Ix&_nc_oc=AdpyfSEQP17m2uTZEsJrt8qMq-WOIlktKr3r_itsusyPfbG-pWemU22M-6f1WeadgjQ&_nc_zt=23&_nc_ht=scontent.fktm20-1.fna&_nc_gid=4kzLOCbRzuMRJeQ_miL7FA&_nc_ss=7b2a8&oh=00_AQETR1_fOJ1rtcc0NXcSGLuhcIh77Z4X5sprYlL8hhCr3g&oe=6A88B33D",

  flat_batting:
    "https://scontent.fktm20-1.fna.fbcdn.net/v/t39.30808-6/776222436_1014351928094381_5130993671396430120_n.jpg?stp=dst-jpg_tt6&cstp=mx622x1100&ctp=s622x1086&_nc_cat=102&ccb=1-7&_nc_sid=127cfc&_nc_ohc=AifU1bd26TMQ7kNvwGAYsh0&_nc_oc=AdpHl8ef9rKi8QU-4wExkMU1WZAKOnYuPVcVAJcR5wkEDaNYEwu-D4oldkEwI61eTBQ&_nc_zt=23&_nc_ht=scontent.fktm20-1.fna&_nc_gid=4kzLOCbRzuMRJeQ_miL7FA&_nc_ss=7b2a8&oh=00_AQHhzyRKv52ULsNbct6U2ZlvqH5hCQbAslcoXuuGwODMSQ&oe=6A888F25",

  balanced:
    "https://scontent.fktm20-1.fna.fbcdn.net/v/t39.30808-6/777828449_1014351868094387_8804601974413441346_n.jpg?stp=dst-jpg_tt6&cstp=mx699x1160&ctp=s699x1160&_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=AM0pqfBrKqYQ7kNvwFs8fz9&_nc_oc=AdorbURFhcQoxd-B6a94_PQPRxBGm8kh1rl-04ruKQKkxpgH9PouLCApq2afKi7dI9Y&_nc_zt=23&_nc_ht=scontent.fktm20-1.fna&_nc_gid=2d5Xko8X3wJ9lPFA5ViDcw&_nc_ss=7b2a8&oh=00_AQFfiWg3UoZBaFNbo2qe49m63OwEPMWQOa1XTToGrw-ZKQ&oe=6A88A6C9",
} as const;

export type PitchImageKey = keyof typeof PITCH_IMAGES;

// Maps researched pitch `type` archetypes to the curated surface photo.
const PITCH_TYPE_TO_IMAGE: Record<string, PitchImageKey> = {
  dry_turning: "dry_dusty",
  slow_dry: "dry_dusty",
  slow_low: "dry_dusty",
  flat_dry_dew: "dry_dusty",
  dry_seaming_balanced: "dry_dusty",
  dry_balanced: "dry_dusty",
  hard_fast_cracking: "cracked_worn",
  slow_flat: "cracked_worn",
  hard_to_slow: "cracked_worn",
  balanced_grassy: "green_grassy",
  green_seaming: "green_grassy",
  grassy_seaming: "green_grassy",
  true_grassy: "green_grassy",
  variable_seaming: "green_grassy",
  hard_sea_breeze: "hard_bouncy",
  hard_bouncy: "hard_bouncy",
  quick_seaming: "hard_bouncy",
  hard_high_bounce: "hard_bouncy",
  humid_seaming: "hard_bouncy",
  balanced_flat: "flat_batting",
  high_altitude_flat: "flat_batting",
  flat_drop_in: "flat_batting",
  balanced_batting: "flat_batting",
  slow_drop_in: "flat_batting",
  true_batting_seam: "flat_batting",
  hard_turning_balanced: "balanced",
  balanced_with_late_spin: "balanced",
};

export function getPitchImageKey(stadium: Stadium, format: StadiumFormat): PitchImageKey {
  return PITCH_TYPE_TO_IMAGE[getPitchProfile(stadium, format).type] || "balanced";
}

export function getPitchImageUrl(stadium: Stadium, format: StadiumFormat): string {
  return stadium.pitch.image_url || PITCH_IMAGES[getPitchImageKey(stadium, format)];
}