/**
 * Minimal server-side client for the Nextrainers clone backend.
 *
 * Every call is fail-soft: network errors, non-2xx responses and malformed
 * bodies all resolve to `null` so the UI degrades to its empty states instead
 * of crashing or surfacing an error.
 */

import { backendAuthHeaders } from "@/lib/backend-auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4900";

export interface NextMatch {
  /** "YYYY-MM-DD" */
  date: string;
  opponent: string | null;
  homeAway: "home" | "away";
  competition: string | null;
}

export interface Training {
  id: string;
  name: string;
  theme: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** Minutes */
  duration: number;
}

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
 * `GET /api/season/next-match?from=YYYY-MM-DD` — the next fixture, or `null`
 * when none is scheduled (or the API is unreachable).
 */
export async function getNextMatch(from: string): Promise<NextMatch | null> {
  const data = await apiGet<{ match: NextMatch | null }>(
    `/api/season/next-match?from=${encodeURIComponent(from)}`,
  );
  const match = data?.match;
  if (!match || typeof match.date !== "string" || !match.opponent) return null;
  return match;
}

/** `GET /api/trainings` — top-level array; empty when the API is unreachable. */
export async function getTrainings(): Promise<Training[]> {
  const data = await apiGet<Training[]>("/api/trainings");
  return Array.isArray(data) ? data : [];
}
