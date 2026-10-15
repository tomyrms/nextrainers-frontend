/**
 * Server-side client for the season endpoints of the Nextrainers clone backend
 * (`GET /api/season-plan` and `GET /api/season/sessions`, contract §5/§6), plus
 * the French labels and date formats the saison page renders.
 *
 * Same fail-soft contract as `lib/api.ts`: network errors, non-2xx responses
 * and malformed bodies resolve to `null`/empty so the sections degrade to their
 * empty states instead of crashing.
 */

import { backendAuthHeaders } from "@/lib/backend-auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4900";

// ------------------------------------------------------------------- types

export interface SeasonCalendar {
  /** All "YYYY-MM-DD" */
  preseasonStartDate: string | null;
  championshipStartDate: string | null;
  championshipEndDate: string | null;
}

export interface SeasonMacroPlanBlock {
  name: string;
  startWeek: number;
  endWeek: number;
  /** Season-theme id (translated by `themeLabel`). */
  objective: string | null;
}

export interface SeasonPlan {
  id: string;
  /** e.g. "u15" */
  teamCategory: string | null;
  customThemeLabel: string | null;
  seasonThemesPriority: string[];
  /** e.g. ["tuesday", "thursday"] */
  trainingDays: string[];
  /** e.g. "saturday" | "sunday" | "variable" */
  usualMatchDay: string | null;
  calendar: SeasonCalendar | null;
  macroPlan: SeasonMacroPlanBlock[];
}

export interface SeasonSession {
  /** "YYYY-MM-DD" */
  date: string;
  weekIndex: number | null;
  /** Season-theme id (translated by `themeLabel`). */
  theme: string | null;
  /** Macro-plan block name, e.g. "Bloc 2 — Consolidation". */
  mesocycle: string | null;
  /** "low" | "medium" | "high" */
  intensity: string | null;
  /** "activation" | "recovery" | "development" | "peak" | "matchPrep" | null */
  sessionKind: string | null;
  /** Minutes */
  durationMinutes: number | null;
  objective: string | null;
  status: string | null;
  hasFeedback: boolean;
  trainingSessionId: string | null;
}

// ----------------------------------------------------------------- fetches

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: await backendAuthHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * `GET /api/season-plan` — the seeded plan, or `null` when it is missing (or
 * the API is unreachable). Array fields are normalised so the UI can map over
 * them unconditionally.
 */
export async function getSeasonPlan(): Promise<SeasonPlan | null> {
  const data = await apiGet<{ plan?: Partial<SeasonPlan> | null }>(
    "/api/season-plan",
  );
  const plan = data?.plan;
  if (!plan || typeof plan.id !== "string") return null;
  return {
    id: plan.id,
    teamCategory: plan.teamCategory ?? null,
    customThemeLabel: plan.customThemeLabel ?? null,
    seasonThemesPriority: Array.isArray(plan.seasonThemesPriority)
      ? plan.seasonThemesPriority
      : [],
    trainingDays: Array.isArray(plan.trainingDays) ? plan.trainingDays : [],
    usualMatchDay: plan.usualMatchDay ?? null,
    calendar: plan.calendar ?? null,
    macroPlan: Array.isArray(plan.macroPlan) ? plan.macroPlan : [],
  };
}

/**
 * `GET /api/season/sessions?seasonPlanId=<id>` — sessions sorted by date;
 * empty when the plan is unknown or the API is unreachable.
 */
export async function getSeasonSessions(
  seasonPlanId: string,
): Promise<SeasonSession[]> {
  const data = await apiGet<{ sessions?: Partial<SeasonSession>[] }>(
    `/api/season/sessions?seasonPlanId=${encodeURIComponent(seasonPlanId)}`,
  );
  const sessions = data?.sessions;
  if (!Array.isArray(sessions)) return [];
  return sessions
    .filter((session) => typeof session?.date === "string")
    .map((session) => ({
      date: session.date as string,
      weekIndex: session.weekIndex ?? null,
      theme: session.theme ?? null,
      mesocycle: session.mesocycle ?? null,
      intensity: session.intensity ?? null,
      sessionKind: session.sessionKind ?? null,
      durationMinutes: session.durationMinutes ?? null,
      objective: session.objective ?? null,
      status: session.status ?? null,
      hasFeedback: session.hasFeedback ?? false,
      trainingSessionId: session.trainingSessionId ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ----------------------------------------------------------------- labels

const THEME_LABELS: Record<string, string> = {
  buildupFromBack: "Relance",
  pressExit: "Sortie de pressing",
  possessionRetention: "Conservation",
  progression: "Progression",
  playBetweenLines: "Jeu entre les lignes",
  crosses: "Centres",
  finishing: "Finition",
  pressing: "Pressing",
  defensiveBlock: "Bloc défensif",
  transitionDefense: "Transition défensive",
  transitionOffense: "Transition offensive",
  setPieces: "Coups de pied arrêtés",
  communication: "Communication",
  other: "Autre",
};

const INTENSITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
};

const SESSION_KIND_LABELS: Record<string, string> = {
  activation: "Activation",
  recovery: "Récupération",
  development: "Développement",
  peak: "Pic de forme",
  matchPrep: "Préparation match",
};

const TRAINING_DAY_LABELS: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const MATCH_DAY_LABELS: Record<string, string> = {
  saturday: "Matchs le samedi",
  sunday: "Matchs le dimanche",
  variable: "Matchs variables",
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "pressing" → "Pressing"; unknown ids fall back to a capitalised raw value. */
export function themeLabel(theme: string | null | undefined): string | null {
  if (!theme) return null;
  return THEME_LABELS[theme] ?? capitalize(theme);
}

/** "medium" → "Moyenne"; `null` for unknown values. */
export function intensityLabel(
  intensity: string | null | undefined,
): string | null {
  if (!intensity) return null;
  return INTENSITY_LABELS[intensity] ?? null;
}

/** "matchPrep" → "Préparation match"; `null` when the session has no kind. */
export function sessionKindLabel(
  kind: string | null | undefined,
): string | null {
  if (!kind) return null;
  return SESSION_KIND_LABELS[kind] ?? capitalize(kind);
}

/** "tuesday" → "Mardi"; unknown ids stay as-is. */
export function trainingDayLabel(day: string): string {
  return TRAINING_DAY_LABELS[day.toLowerCase()] ?? capitalize(day);
}

/** "saturday" → "Matchs le samedi"; `null` when unknown/absent. */
export function matchDayLabel(day: string | null | undefined): string | null {
  if (!day) return null;
  return MATCH_DAY_LABELS[day.toLowerCase()] ?? null;
}

/** "2026-08-01" → "1 août 2026" (UTC-stable French long date). */
export function formatLongDate(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-09-15" → "mar. 15 sept." (UTC-stable French short date). */
export function formatShortDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
