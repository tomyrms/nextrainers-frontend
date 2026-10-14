"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { deletePlayer } from "@/lib/api-equipe";

/**
 * Discreet per-card delete affordance: DELETE /api/players/:id, then refresh
 * the route so the roster streams back without the removed player. Kept safe:
 * the button is disabled while the request is in flight and turns destructive
 * (with a tooltip) when the server refuses.
 */
export function DeletePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const ok = await deletePlayer(playerId);
    if (ok) {
      // Keep the spinner until the refreshed payload swaps this card out.
      router.refresh();
      return;
    }
    setPending(false);
    setFailed(true);
    window.setTimeout(() => setFailed(false), 4000);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label={`Supprimer ${playerName}`}
      title={failed ? "Suppression impossible" : "Supprimer"}
      className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/8 disabled:cursor-default disabled:opacity-60 ${
        failed
          ? "text-destructive"
          : "text-muted-foreground/70 hover:text-destructive"
      }`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
