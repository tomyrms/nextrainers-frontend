/**
 * Server + browser helpers for the Équipe (roster) screen.
 *
 * Reads mirror `lib/api.ts`: fail-soft, so any network/HTTP/parse error
 * degrades to an empty roster instead of crashing the page. Mutations run in
 * the browser against the public API URL (players contract §4) so they can be
 * issued from event handlers and followed by `router.refresh()`.
 *
 * Note: non-`NEXT_PUBLIC_` env vars are replaced with `""` in client bundles,
 * hence the `||` fallbacks and the lazy base-url lookups below.
 */

import { BROWSER_API_BASE, backendAuthHeaders } from "@/lib/backend-auth";

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  /** Raw code from the API: GK, DC, DG, DD, MC, MG, MD, MDC, MOC, BU, AG, AD. */
  position: string;
  jerseyNumber: number;
  /** "RIGHT" | "LEFT" */
  preferredFoot: string;
  /** "YYYY-MM-DD" */
  dateOfBirth: string;
  matches?: number;
  goals?: number;
  assists?: number;
  strengths?: string[];
  improvements?: string[];
  coachNotes?: string;
  skills?: PlayerSkill[];
}

export interface PlayerSkill {
  id: string;
  /** French display name ("Vitesse"). */
  name: string;
  /** 1..10 coach rating. */
  value: number;
}

/** Ratings run from 1 to 10 (radar rings + editor bounds). */
export const SKILL_MIN = 1;
export const SKILL_MAX = 10;

/** Compact French label per position code (player cards). */
export const POSITION_LABELS: Record<string, string> = {
  GK: "Gardien",
  DC: "Déf. central",
  DG: "Latéral gauche",
  DD: "Latéral droit",
  MC: "Milieu central",
  MDC: "Milieu déf.",
  MOC: "Meneur de jeu",
  MG: "Milieu gauche",
  MD: "Milieu droit",
  AG: "Ailier gauche",
  AD: "Ailier droit",
  BU: "Attaquant",
};

export function positionLabel(code: string): string {
  return POSITION_LABELS[code] ?? code;
}

export function footLabel(code: string): string {
  return code === "LEFT" ? "Gauche" : "Droit";
}

/** The 12 positions, in pitch order, for the create form select. */
export const POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: "GK", label: "Gardien" },
  { value: "DC", label: "Défenseur central" },
  { value: "DG", label: "Latéral gauche" },
  { value: "DD", label: "Latéral droit" },
  { value: "MDC", label: "Milieu défensif" },
  { value: "MC", label: "Milieu central" },
  { value: "MOC", label: "Meneur de jeu" },
  { value: "MG", label: "Milieu gauche" },
  { value: "MD", label: "Milieu droit" },
  { value: "AG", label: "Ailier gauche" },
  { value: "AD", label: "Ailier droit" },
  { value: "BU", label: "Attaquant" },
];

/** Roster buckets behind the summary chips. */
export const POSITION_GROUPS: { label: string; positions: string[] }[] = [
  { label: "Gardiens", positions: ["GK"] },
  { label: "Défenseurs", positions: ["DC", "DG", "DD"] },
  { label: "Milieux", positions: ["MC", "MG", "MD", "MDC", "MOC"] },
  { label: "Attaquants", positions: ["BU", "AG", "AD"] },
];

/** Whole years since `dateOfBirth` ("YYYY-MM-DD"), or null when unreadable. */
export function ageFromDateOfBirth(dateOfBirth: string): number | null {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/** "12 matchs · 4 buts · 2 passes" (zeros skipped); "" when nothing to show. */
export function statsSummary(player: Player): string {
  const { matches = 0, goals = 0, assists = 0 } = player;
  const parts: string[] = [];
  if (matches > 0) parts.push(`${matches} match${matches > 1 ? "s" : ""}`);
  if (goals > 0) parts.push(`${goals} but${goals > 1 ? "s" : ""}`);
  if (assists > 0) parts.push(`${assists} passe${assists > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

// --- Server-side read (used by the streamed roster) -------------------------

async function apiGet<T>(path: string): Promise<T | null> {
  const base = process.env.API_BASE_URL || "http://localhost:4900";
  try {
    const response = await fetch(`${base}${path}`, { cache: "no-store", headers: await backendAuthHeaders() });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** `GET /api/players` — top-level array; empty when the API is unreachable. */
export async function getPlayers(): Promise<Player[]> {
  const data = await apiGet<Player[]>("/api/players");
  return Array.isArray(data) ? data : [];
}

/** `GET /api/players/:id` — the player, or null (unknown id / API down). */
export async function getPlayer(id: string): Promise<Player | null> {
  const data = await apiGet<Player>(`/api/players/${encodeURIComponent(id)}`);
  return data && typeof data.id === "string" ? data : null;
}

// --- Browser-side mutations (called from client components) ------------------

function mutationBaseUrl(): string {
  return BROWSER_API_BASE;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  position: string;
  jerseyNumber: number;
  preferredFoot: "RIGHT" | "LEFT";
  dateOfBirth: string;
}

export type CreatePlayerResult =
  | { ok: true; player: Player }
  | { ok: false; error: string };

/** `POST /api/players` — the created player, or an inline-displayable error. */
export async function createPlayer(
  input: CreatePlayerInput,
): Promise<CreatePlayerResult> {
  try {
    const response = await fetch(`${mutationBaseUrl()}/api/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Le serveur a refusé la création (${response.status}).`,
      };
    }
    const player = (await response.json()) as Player;
    if (!player || typeof player.id !== "string") {
      return { ok: false, error: "Réponse inattendue du serveur." };
    }
    return { ok: true, player };
  } catch {
    return {
      ok: false,
      error: "Impossible de joindre le serveur. Réessaie dans un instant.",
    };
  }
}

/** `DELETE /api/players/:id` — true on any 2xx. */
export async function deletePlayer(id: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${mutationBaseUrl()}/api/players/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export type PlayerPatch = {
  coachNotes?: string;
  skills?: { id: string; value: number }[];
};

/** `PATCH /api/players/:id` (coachNotes | skills) — true on any 2xx. */
export async function patchPlayer(id: string, patch: PlayerPatch): Promise<boolean> {
  try {
    const response = await fetch(
      `${mutationBaseUrl()}/api/players/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
