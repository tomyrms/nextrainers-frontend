/**
 * Server-side client for the exercise library (Bibliothèque page).
 *
 * Same fail-soft contract as `lib/api.ts`: network errors, non-2xx responses
 * and malformed bodies all resolve to the empty collection so the page keeps
 * its empty state instead of crashing.
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4900";

/** The five exercise categories the library filters on. */
export type ExerciseType =
  | "warmup"
  | "mainExercises"
  | "gameApplication"
  | "freegame"
  | "cooldown";

/** French labels for the filter chips and type badges, in display order. */
export const EXERCISE_TYPES: { type: ExerciseType; label: string }[] = [
  { type: "warmup", label: "Échauffement" },
  { type: "mainExercises", label: "Exercices" },
  { type: "gameApplication", label: "Jeu" },
  { type: "freegame", label: "Jeu libre" },
  { type: "cooldown", label: "Retour au calme" },
];

/** Label of an exercise `type`; unknown values fall back to the raw code. */
export function exerciseTypeLabel(type: string): string {
  return EXERCISE_TYPES.find((entry) => entry.type === type)?.label ?? type;
}

export interface Exercise {
  id: string;
  title: string;
  /** One of `ExerciseType` — kept open, the backend owns the enum. */
  type: string;
  description: string;
  /** Minutes */
  duration: number;
  /** Inline SVG diagram (trusted seed content), or null when absent. */
  exerciseSvg: string | null;
}

async function apiGet(path: string): Promise<unknown> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/** Keeps only the entries usable as cards: objects carrying a string id. */
function toExerciseArray(data: unknown): Exercise[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is Exercise =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { id?: unknown }).id === "string",
  );
}

/** `GET /api/exercises` — top-level array; empty when the API is unreachable. */
export async function getExercises(): Promise<Exercise[]> {
  return toExerciseArray(await apiGet("/api/exercises"));
}

/**
 * `GET /api/exercises/favorite` — top-level array of the favorited items;
 * empty when the API is unreachable.
 */
export async function getFavoriteExercises(): Promise<Exercise[]> {
  return toExerciseArray(await apiGet("/api/exercises/favorite"));
}
