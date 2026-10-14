"use client";

import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** How long the inline success confirmation stays visible. */
const SUCCESS_MESSAGE_MS = 4_000;

type GenerationState = "idle" | "pending" | "success" | "error";

/**
 * "Générer les séances" CTA. POSTs /api/season/generate (contract §11), waits
 * for the ~1.2 s generation to finish, then refreshes the route so the
 * server-rendered sessions list picks up the regenerated skeleton.
 */
export function GenerateSessionsButton({ seasonPlanId }: { seasonPlanId: string }) {
  const router = useRouter();
  const [state, setState] = useState<GenerationState>("idle");
  const pending = state === "pending";

  async function generate() {
    if (pending) return;
    setState("pending");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4900"}/api/season/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seasonPlanId, locale: "fr" }),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("sessions" in payload)
      ) {
        throw new Error("missing sessions key in response");
      }

      setState("success");
      router.refresh();
      window.setTimeout(() => {
        setState((current) => (current === "success" ? "idle" : current));
      }, SUCCESS_MESSAGE_MS);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        data-testid="generate-sessions"
        onClick={generate}
        disabled={pending}
        aria-busy={pending}
        className="glow-primary flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Génération en cours…
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Générer les séances
          </>
        )}
      </button>

      {state === "success" ? (
        <p
          role="status"
          className="flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <Check className="size-3.5" />
          Séances mises à jour
        </p>
      ) : null}

      {state === "error" ? (
        <p className="text-xs text-muted-foreground">
          La génération a échoué. Réessaie dans un instant.
        </p>
      ) : null}
    </div>
  );
}
