/**
 * Server-side session helpers for the clone frontend.
 *
 * The frontend keeps the backend token in an httpOnly `session` cookie on its
 * own origin (set by the `/api/session` proxy route), so the token never
 * touches client JS. Fail-soft like `lib/api.ts`: an unreachable or unhappy
 * backend resolves to `null` instead of throwing.
 */

import { cookies } from "next/headers";

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4900";

/** Name of the httpOnly cookie that carries the backend session token. */
export const SESSION_COOKIE = "session";

/** Public user shape returned by the backend (`{ id, email }`). */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * `GET /api/auth/me` through the token stored in the `session` cookie — the
 * signed-in user, or `null` when signed out / backend unreachable.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user?: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}
