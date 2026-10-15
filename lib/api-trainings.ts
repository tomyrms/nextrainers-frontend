/**
 * Server + browser helpers for the training screens: the "+" create flow
 * (/fr/creer), the training detail (/fr/entrainements/[id]) and the public
 * share page (/share/[token]). Contract: docs/api-contract.md §2-3.
 *
 * Reads mirror `lib/api-equipe.ts`: fail-soft, any network/HTTP/parse error
 * resolves to `null` / `[]` so the pages keep their empty states. Mutations
 * run in the browser against the public API URL.
 *
 * Note: non-`NEXT_PUBLIC_` env vars are replaced with `""` in client bundles,
 * hence the `||` fallbacks and the lazy base-url lookups below.
 */

import type { Exercise } from "@/lib/api-bibliotheque";

/** One exercise of a training plan (same item shape as the library, §2). */
export interface PlanExercise extends Exercise {
  objective?: string;
  coachingPoints?: string[];
  parameters?: string[];
}

export interface TrainingDetail {
  id: string;
  name: string;
  theme: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** Minutes */
  duration: number;
  ageGroup?: string;
  playerCount?: number;
  plan: PlanExercise[];
  manually_created?: boolean;
}

export interface SharedTraining {
  training: TrainingDetail;
  sharedBy: { fullName: string | null; teamName: string | null } | null;
}

/** Library categories a coach can pick from when building a session. */
export const PLAN_TYPES: { type: string; label: string }[] = [
  { type: "warmup", label: "Échauffement" },
  { type: "mainExercises", label: "Exercices" },
  { type: "gameApplication", label: "Jeu" },
  { type: "cooldown", label: "Retour au calme" },
];

/** Training themes offered by the create form (free text is kept as is). */
export const THEMES = [
  "Technique",
  "Pressing",
  "Finition",
  "Possession",
  "Transitions",
  "Physique",
];

/** "mardi 14 octobre 2026" — timezone-stable French long date. */
export function formatLongDate(dateIso: string): string {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Inline SVG as an `<img>` data URI: the markup is rendered as an image, so
 * scripts or handlers inside shared content can never run.
 */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isTraining(value: unknown): value is TrainingDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

/** Keeps the plan usable even when the backend sends `plan: null`. */
function normalize(training: TrainingDetail): TrainingDetail {
  return {
    ...training,
    plan: Array.isArray(training.plan)
      ? training.plan.filter((item) => item && typeof item.id === "string")
      : [],
  };
}

// --- Server-side reads --------------------------------------------------------

async function apiGet(path: string): Promise<unknown> {
  const base = process.env.API_BASE_URL || "http://localhost:4900";
  try {
    const response = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/** `GET /api/trainings/:id` — the session, or null (404 / unreachable). */
export async function getTraining(id: string): Promise<TrainingDetail | null> {
  const data = await apiGet(`/api/trainings/${encodeURIComponent(id)}`);
  return isTraining(data) ? normalize(data) : null;
}

/** `GET /api/trainings/share/:token` — the shared session, or null. */
export async function getSharedTraining(
  token: string,
): Promise<SharedTraining | null> {
  const data = (await apiGet(
    `/api/trainings/share/${encodeURIComponent(token)}`,
  )) as { training?: unknown; sharedBy?: SharedTraining["sharedBy"] } | null;
  if (!data || !isTraining(data.training)) return null;
  return { training: normalize(data.training), sharedBy: data.sharedBy ?? null };
}

// --- Browser-side mutations -----------------------------------------------------

function mutationBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4900";
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${mutationBaseUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Browser read of the library for the exercise picker. */
export async function fetchExercises(): Promise<PlanExercise[] | null> {
  try {
    const response = await fetch(`${mutationBaseUrl()}/api/exercises`);
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return Array.isArray(data)
      ? data.filter((item) => item && typeof item.id === "string")
      : null;
  } catch {
    return null;
  }
}

export interface CreateTrainingInput {
  name: string;
  theme: string;
  date: string;
  plan: PlanExercise[];
}

/** `POST /api/trainings` — the created session id, or null on failure. */
export async function createTraining(
  input: CreateTrainingInput,
): Promise<string | null> {
  const duration = input.plan.reduce((total, item) => total + (item.duration || 0), 0);
  const created = await post<TrainingDetail>("/api/trainings", {
    name: input.name,
    theme: input.theme,
    date: input.date,
    duration,
    plan: input.plan,
    exercises: input.plan.map((item) => ({
      id: item.id,
      exerciseSvg: item.exerciseSvg,
      setupSvg: null,
    })),
  });
  return isTraining(created) ? created.id : null;
}

/** `POST /api/trainings/share` — the share token (parsed from shareUrl). */
export async function shareTraining(trainingId: string): Promise<string | null> {
  const data = await post<{ shareUrl?: unknown }>("/api/trainings/share", {
    trainingId,
  });
  if (typeof data?.shareUrl !== "string") return null;
  // The backend URL points at the original app; only its last segment matters.
  const token = data.shareUrl.split("/").filter(Boolean).pop();
  return token || null;
}

/** `POST /api/trainings/duplicate` — the copy's id, or null. */
export async function duplicateTraining(shareToken: string): Promise<string | null> {
  const data = await post<{ trainingId?: unknown }>("/api/trainings/duplicate", {
    shareToken,
  });
  return typeof data?.trainingId === "string" ? data.trainingId : null;
}
