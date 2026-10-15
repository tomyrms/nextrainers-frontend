import { io } from "next/cache";
import { Bell } from "lucide-react";

import {
  cloneRoute,
  getInbox,
  relativeTimeFr,
  type Inbox,
} from "@/lib/api-notifications";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { NotificationItem } from "./NotificationItem";

/**
 * Streams the inbox from the backend. `io()` keeps the fetch and the
 * relative dates (computed against "now") out of the static shell.
 */
export async function NotificationsInboxLive() {
  await io();
  const inbox = await getInbox();
  return <NotificationsInbox inbox={inbox} now={Date.now()} />;
}

/**
 * Inbox content: unread badge + "mark all read" header, then the list or the
 * empty state. `inbox === null` doubles as the static fallback shell.
 */
export function NotificationsInbox({ inbox, now = 0 }: { inbox: Inbox | null; now?: number }) {
  const notifications = [...(inbox?.notifications ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const unreadCount = inbox?.unreadCount ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          <Bell className="size-3.5" aria-hidden />
          <span data-testid="unread-count">{unreadCount}</span>
          <span>non lue{unreadCount > 1 ? "s" : ""}</span>
        </span>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </div>

      {notifications.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-card border border-white/8 bg-card p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/8 text-primary">
            <Bell className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Aucune notification</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tu seras prévenu ici quand une séance est prête ou qu&apos;un joueur progresse.
            </p>
          </div>
        </section>
      ) : (
        <ul className="space-y-2.5">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              id={notification.id}
              title={notification.title}
              body={notification.body}
              when={now ? relativeTimeFr(notification.createdAt, now) : ""}
              unread={!notification.readAt}
              href={cloneRoute(notification.path)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
