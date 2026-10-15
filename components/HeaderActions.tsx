import Link from "next/link";
import { Bell } from "lucide-react";

import { InitialsAvatar } from "@/components/InitialsAvatar";
import { getSessionUser } from "@/lib/api-auth";
import { getInbox } from "@/lib/api-notifications";

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

/** Bell linking to /fr/notifications, with the unread count as a badge. */
function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const label =
    unreadCount > 0
      ? `Notifications (${unreadCount} non lue${unreadCount > 1 ? "s" : ""})`
      : "Notifications";
  return (
    <Link
      href="/fr/notifications"
      aria-label={label}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-fill text-foreground transition-colors hover:bg-fill-strong active:scale-[0.97]"
    >
      <Bell className="size-4.5" aria-hidden />
      {unreadCount > 0 ? (
        <span
          data-testid="bell-badge"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-darker"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Right-side header actions, resolved from the session cookie: the signed-out
 * pills, or the notification bell + a teal initials avatar linking to
 * /fr/profil. `AppHeader` wraps it
 * in `<Suspense fallback={<SignedOutPills />}>` — the cookie read is the
 * request-time suspension point (Cache Components keeps the shell static).
 */
export async function HeaderActions() {
  const user = await getSessionUser();
  if (!user) return <SignedOutPills />;
  const inbox = await getInbox();

  return (
    <>
      <NotificationBell unreadCount={inbox?.unreadCount ?? 0} />
      <Link
        href="/fr/profil"
        aria-label="Profil"
        className="shrink-0 rounded-full transition-opacity hover:opacity-90 active:scale-[0.97]"
      >
        <InitialsAvatar email={user.email} className="size-8 text-sm" />
      </Link>
    </>
  );
}
