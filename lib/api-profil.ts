/**
 * Server + browser helpers for the Profil screen (profile contract §8).
 *
 * Reads mirror `lib/api.ts`: fail-soft, so any network/HTTP/parse error
 * resolves to an all-null profile instead of crashing the page. The update
 * runs in the browser against the public API URL (permissive CORS) so it can
 * be issued from the edit form and followed by `router.refresh()`.
 *
 * Note: non-`NEXT_PUBLIC_` env vars are replaced with `""` in client bundles,
 * hence the `||` fallback and the lazy base-url lookup for the mutation.
 */

export interface Profile {
  fullName: string | null;
  imageUrl: string | null;
  teamName: string | null;
  /** "YYYY-MM-DD" */
  dateOfBirth: string | null;
  experience: number | null;
  level: string | null;
}

/** The four levels the backend understands, in display order. */
export const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "competition", label: "Compétition" },
  { value: "elite", label: "Élite" },
];

/** Label of a `level` code; unknown values fall back to the raw code. */
export function levelLabel(level: string): string {
  return LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level;
}

/** Partial PUT body: only the fields the edit form actually changed. */
export interface ProfilePatch {
  fullName?: string;
  teamName?: string;
  dateOfBirth?: string | null;
  experience?: number | null;
  level?: string | null;
}

/** A non-empty string, or null (the API's "absent" representation). */
function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function emptyProfile(): Profile {
  return {
    fullName: null,
    imageUrl: null,
    teamName: null,
    dateOfBirth: null,
    experience: null,
    level: null,
  };
}

/** `GET /api/user/profile` — nulls when the API is unreachable (§8). */
export async function getProfile(): Promise<Profile> {
  const base = process.env.API_BASE_URL ?? "http://localhost:4900";
  try {
    const response = await fetch(`${base}/api/user/profile`, {
      cache: "no-store",
    });
    if (!response.ok) return emptyProfile();
    const data = (await response.json()) as Record<string, unknown>;
    return {
      fullName: asString(data.fullName),
      imageUrl: asString(data.imageUrl),
      teamName: asString(data.teamName),
      dateOfBirth: asString(data.dateOfBirth),
      experience: typeof data.experience === "number" ? data.experience : null,
      level: asString(data.level),
    };
  } catch {
    return emptyProfile();
  }
}

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/** `PUT /api/user/profile` — true on any 2xx, French error line otherwise. */
export async function updateProfile(
  patch: ProfilePatch,
): Promise<UpdateProfileResult> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4900";
  try {
    const response = await fetch(`${base}/api/user/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Le serveur a refusé la modification (${response.status}).`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Impossible de joindre le serveur. Réessaie dans un instant.",
    };
  }
}
