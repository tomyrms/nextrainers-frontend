"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { markRead } from "@/lib/api-notifications";

/**
 * One inbox row. Tapping marks it read (PATCH) then opens `href` when the
 * notification links to a clone screen, otherwise refreshes the inbox.
 */
export function NotificationItem({
  id,
  title,
  body,
  when,
  unread,
  href,
}: {
  id: string;
  title: string;
  body: string;
  when: string;
  unread: boolean;
  href: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    if (unread) await markRead(id);
    setPending(false);
    if (href) router.push(href);
    else router.refresh();
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        data-notification-id={id}
        data-unread={unread ? "true" : "false"}
        className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
          unread
            ? "border-primary/25 bg-card hover:border-primary/40"
            : "border-white/8 bg-card/60 hover:border-white/15"
        }`}
      >
        <span
          aria-hidden
          className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span
              className={`min-w-0 truncate text-sm ${unread ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}
            >
              {title}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{when}</span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed break-words text-muted-foreground">
            {body}
          </span>
          {unread ? <span className="sr-only">Non lue</span> : null}
        </span>
      </button>
    </li>
  );
}
