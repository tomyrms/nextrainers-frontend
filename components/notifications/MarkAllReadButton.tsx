"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { markAllRead } from "@/lib/api-notifications";

/** "Tout marquer comme lu": POST mark-all-read, then refresh the inbox. */
export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending || disabled) return;
    setPending(true);
    await markAllRead();
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-transparent"
    >
      <CheckCheck className="size-4" aria-hidden />
      Tout marquer comme lu
    </button>
  );
}
