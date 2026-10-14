import Link from "next/link";

import { InitialsAvatar } from "@/components/InitialsAvatar";
import { getSessionUser } from "@/lib/api-auth";

/**
 * Signed-out header actions. Extracted so the same markup doubles as the
 * `<Suspense>` fallback of `HeaderActions`: the static shell then ships the
 * exact historical signed-out header.
 */
export function SignedOutPills() {
  return (
    <>
      <Link
        href="/fr/connexion"
        className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-fill px-4 text-sm font-medium text-foreground transition-colors hover:bg-fill-strong active:scale-[0.97]"
      >
        Connexion
      </Link>
      <Link
        href="/fr/inscription"
        className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-medium text-darker transition-colors hover:bg-white/85 active:scale-[0.97]"
      >
        Inscription
      </Link>
    </>
  );
}

/**
 * Right-side header actions, resolved from the session cookie: the signed-out
 * pills, or a teal initials avatar linking to /fr/profil. `AppHeader` wraps it
 * in `<Suspense fallback={<SignedOutPills />}>` — the cookie read is the
 * request-time suspension point (Cache Components keeps the shell static).
 */
export async function HeaderActions() {
  const user = await getSessionUser();
  if (!user) return <SignedOutPills />;

  return (
    <Link
      href="/fr/profil"
      aria-label="Profil"
      className="shrink-0 rounded-full transition-opacity hover:opacity-90 active:scale-[0.97]"
    >
      <InitialsAvatar email={user.email} className="size-8 text-sm" />
    </Link>
  );
}
