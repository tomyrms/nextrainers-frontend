/**
 * Server + browser helpers for the Analyses screens (contract §7).
 *
 * Reads mirror `lib/api-equipe.ts`: fail-soft, so any network/HTTP/parse
 * error degrades to an empty list (or `null` detail) instead of crashing the
 * page. Mutations run in the browser against the public API URL and are
 * followed by navigation or `router.refresh()`.
 */

import { BROWSER_API_BASE, backendAuthHeaders } from "@/lib/backend-auth";

export interface AnalysisTip {
  id: string;
  /** "defense" | "attack" | "transition" | "setPieces" (free string tolerated). */
  category: string;
  title: string;
  body: string;
}

export interface Analysis {
  id: string;
  teamFormation: string;
  opponentTeamName: string;
  opponentTeamFormation: string;
  /** ISO timestamp (filled by the detail endpoint). */
  createdAt?: string;
  tips?: AnalysisTip[];
}

/** French label + order of the tip categories on the detail screen. */
export const TIP_CATEGORIES: { value: string; label: string }[] = [
  { value: "attack", label: "Attaque" },
  { value: "defense", label: "Défense" },
  { value: "transition", label: "Transitions" },
  { value: "setPieces", label: "Coups de pied arrêtés" },
];

export function tipCategoryLabel(value: string): string {
  return TIP_CATEGORIES.find((category) => category.value === value)?.label ?? "Autres";
}

/** Formations offered by the create form. */
export const FORMATION_OPTIONS = [
  "4-3-3",
  "4-4-2",
  "4-2-3-1",
  "3-5-2",
  "3-4-3",
  "5-3-2",
  "4-1-4-1",
  "4-4-1-1",
];

// --- Server-side reads -----------------------------------------------------

async function apiGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  const base = process.env.API_BASE_URL || "http://localhost:4900";
  try {
    const response = await fetch(`${base}${path}`, { cache: "no-store", headers: await backendAuthHeaders() });
    if (!response.ok) return { status: response.status, data: null };
    return { status: response.status, data: (await response.json()) as T };
  } catch {
    return { status: 0, data: null };
  }
}

function isAnalysis(value: unknown): value is Analysis {
  const entry = value as Analysis | null;
  return (
    !!entry &&
    typeof entry.id === "string" &&
    typeof entry.opponentTeamName === "string" &&
    typeof entry.teamFormation === "string" &&
    typeof entry.opponentTeamFormation === "string"
  );
}

/** `GET /api/analysis` — top-level array; empty when the API is unreachable. */
export async function getAnalyses(): Promise<Analysis[]> {
  const { data } = await apiGet<unknown[]>("/api/analysis");
  return Array.isArray(data) ? data.filter(isAnalysis) : [];
}

export type AnalysisResult =
  | { kind: "ok"; analysis: Analysis }
  | { kind: "not-found" }
  | { kind: "error" };

/** `GET /api/analysis/:id` — 404 maps to `not-found` (contract §7 NOT_FOUND). */
export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const { status, data } = await apiGet<unknown>(
    `/api/analysis/${encodeURIComponent(id)}`,
  );
  if (status === 404) return { kind: "not-found" };
  if (!isAnalysis(data)) return { kind: "error" };
  const tips = Array.isArray(data.tips)
    ? data.tips.filter(
        (tip): tip is AnalysisTip =>
          !!tip && typeof tip.title === "string" && typeof tip.body === "string",
      )
    : [];
  return { kind: "ok", analysis: { ...data, tips } };
}

// --- Browser-side mutations --------------------------------------------------

function mutationBaseUrl(): string {
  return BROWSER_API_BASE;
}

export interface CreateAnalysisInput {
  teamFormation: string;
  opponentTeamName: string;
  opponentTeamFormation: string;
}

/** `POST /api/analysis` — the new id, or an inline-displayable error. */
export async function createAnalysis(
  input: CreateAnalysisInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${mutationBaseUrl()}/api/analysis`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return { ok: false, error: `Le serveur a refusé l'analyse (${response.status}).` };
    }
    const data = (await response.json()) as { id?: unknown };
    if (typeof data?.id !== "string") {
      return { ok: false, error: "Réponse inattendue du serveur." };
    }
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Impossible de joindre le serveur. Réessaie dans un instant." };
  }
}

/** `POST /api/analysis/:id/generate-tips` — true on any 2xx. */
export async function generateTips(id: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${mutationBaseUrl()}/api/analysis/${encodeURIComponent(id)}/generate-tips`,
      { method: "POST" },
    );
    return response.ok;
  } catch {
    return false;
  }
}
