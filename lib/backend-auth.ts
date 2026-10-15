/**
 * Neutral holder for the backend auth headers (safe to import from client
 * components). Data is per account on the backend, so server-side reads must
 * carry the session token; the token lives in an httpOnly cookie that only
 * server code can read. `lib/backend-auth.server.ts` registers that cookie
 * reader at server start (imported by the root layout); in the browser this
 * always resolves to `{}` — browser mutations go through `/api/proxy`, which
 * adds the token itself.
 */

type Provider = () => Promise<Record<string, string>>;

// Process-wide so every server bundle layer sees the same registration.
const KEY = Symbol.for("nextrainers.backendAuthHeaders");

type Holder = Record<symbol, Provider | undefined>;

export function registerBackendAuth(provider: Provider): void {
  (globalThis as unknown as Holder)[KEY] = provider;
}

/** `{ authorization: "Bearer …" }` for the signed-in user, else `{}`. */
export async function backendAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  const provider = (globalThis as unknown as Holder)[KEY];
  return provider ? provider() : {};
}

/** Base path browser mutations use: the same-origin proxy (adds the token). */
export const BROWSER_API_BASE = "/api/proxy";
