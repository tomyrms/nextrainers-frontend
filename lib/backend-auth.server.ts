import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/api-auth";
import { registerBackendAuth } from "@/lib/backend-auth";

/**
 * Server-side registration: backend reads made from server components carry
 * the signed-in user's token from the httpOnly `session` cookie. Imported
 * once by the root layout.
 */
registerBackendAuth(async (): Promise<Record<string, string>> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
});
