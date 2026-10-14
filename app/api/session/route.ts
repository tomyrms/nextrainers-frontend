import { cookies } from "next/headers";

import { API_BASE_URL, SESSION_COOKIE } from "@/lib/api-auth";

/** 30 days, in seconds. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type Body = { action?: unknown; email?: unknown; password?: unknown };

function backend(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...init });
}

/** Forwards credentials to a backend auth endpoint as JSON. */
function forward(path: string, email: unknown, password: unknown): Promise<Response> {
  return backend(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/** The backend's `{error}` message when present, without throwing. */
async function errorMessage(response: Response): Promise<string | undefined> {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data?.error === "string" ? data.error : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Frontend-side auth proxy. Keeps the backend token in an httpOnly cookie on
 * this origin so client JS never sees it:
 *
 * - `{action:"login"}`    → forwards to the backend, stores the token,
 *                           responds `{user}` (backend status on failure).
 * - `{action:"register"}` → forwarded as-is (the client logs in next).
 * - `{action:"logout"}`   → clears the cookie and the backend session.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { action, email, password } = body;
  const store = await cookies();

  switch (action) {
    case "login": {
      const response = await forward("/api/auth/login", email, password);
      if (!response.ok) {
        return Response.json(
          { error: await errorMessage(response) },
          { status: response.status },
        );
      }

      const { token, user } = (await response.json()) as {
        token?: unknown;
        user?: unknown;
      };
      if (typeof token !== "string" || !token) {
        return Response.json({ error: "missing token" }, { status: 502 });
      }

      store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
        secure: process.env.NODE_ENV === "production",
      });
      return Response.json({ user });
    }

    case "register": {
      const response = await forward("/api/auth/register", email, password);
      const data: unknown = await response.json().catch(() => ({}));
      return Response.json(data, { status: response.status });
    }

    case "logout": {
      const token = store.get(SESSION_COOKIE)?.value;
      store.delete(SESSION_COOKIE);
      if (token) {
        // Best effort: the frontend cookie is cleared either way.
        try {
          await backend("/api/auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Backend unreachable — local sign-out still stands.
        }
      }
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}

/**
 * `{user}` for the cookie's session, resolved against the backend
 * (`null` when signed out or the backend is unreachable).
 */
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return Response.json({ user: null });

  try {
    const response = await backend("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return Response.json({ user: null });
    const data = (await response.json()) as { user?: unknown };
    return Response.json({ user: data?.user ?? null });
  } catch {
    return Response.json({ user: null });
  }
}
