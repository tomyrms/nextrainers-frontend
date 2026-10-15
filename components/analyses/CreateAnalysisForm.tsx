"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, TriangleAlert } from "lucide-react";

import {
  FORMATION_OPTIONS,
  createAnalysis,
  generateTips,
} from "@/lib/api-analyses";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60";

/**
 * "Nouvelle analyse" form (contract §7): POST /api/analysis, then fire
 * generate-tips and open the detail screen. `defaultOpponent` comes from the
 * `?opponent=` query (next-match CTA). Errors stay inline.
 */
export function CreateAnalysisForm({
  defaultOpponent = "",
}: {
  defaultOpponent?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const opponentTeamName = String(data.get("opponentTeamName") ?? "").trim();
    const teamFormation = String(data.get("teamFormation") ?? "");
    const opponentTeamFormation = String(data.get("opponentTeamFormation") ?? "");

    if (!opponentTeamName) {
      setError("Indique le nom de l'adversaire.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await createAnalysis({
      teamFormation,
      opponentTeamName,
      opponentTeamFormation,
    });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    // Tips are best effort: the detail screen offers a retry when missing.
    await generateTips(result.id);
    router.push(`/fr/analyses/${encodeURIComponent(result.id)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Nouvelle analyse"
      className="rounded-card border border-white/10 bg-card p-4"
    >
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Nouvelle analyse
      </span>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="analysis-opponent" className="block text-xs font-medium text-muted-foreground">
            Adversaire
          </label>
          <input
            id="analysis-opponent"
            name="opponentTeamName"
            defaultValue={defaultOpponent}
            autoComplete="off"
            placeholder="FC Lyon"
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="analysis-team-formation" className="block text-xs font-medium text-muted-foreground">
              Mon système
            </label>
            <select
              id="analysis-team-formation"
              name="teamFormation"
              defaultValue="4-3-3"
              className={FIELD_CLASS}
            >
              {FORMATION_OPTIONS.map((formation) => (
                <option key={formation} value={formation}>
                  {formation}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="analysis-opponent-formation" className="block text-xs font-medium text-muted-foreground">
              Son système
            </label>
            <select
              id="analysis-opponent-formation"
              name="opponentTeamFormation"
              defaultValue="4-4-2"
              className={FIELD_CLASS}
            >
              {FORMATION_OPTIONS.map((formation) => (
                <option key={formation} value={formation}>
                  {formation}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-darker transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <Sparkles className="size-4" aria-hidden />
          {pending ? "Analyse en cours…" : "Analyser l'adversaire"}
        </button>
      </div>
    </form>
  );
}
