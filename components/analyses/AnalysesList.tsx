import Link from "next/link";
import { io } from "next/cache";
import { ChevronRight, Swords } from "lucide-react";

import { getAnalyses, type Analysis } from "@/lib/api-analyses";

/** Streams the analyses from the backend (fail-soft: empty list on error). */
export async function AnalysesListLive() {
  await io();
  const analyses = await getAnalyses();
  return <AnalysesList analyses={analyses} />;
}

/**
 * Analyses list: one card per opponent with both formations, or the empty
 * state. `analyses === null` is the static fallback shell.
 */
export function AnalysesList({ analyses }: { analyses: Analysis[] | null }) {
  const list = analyses ?? [];
  const count = list.length;

  return (
    <section className="space-y-3" aria-label="Mes analyses">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Mes analyses</h2>
        <span className="text-xs font-medium text-muted-foreground">
          {count} analyse{count > 1 ? "s" : ""}
        </span>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-white/8 bg-card p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/8 text-primary">
            <Swords className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Aucune analyse pour l&apos;instant</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Analyse ton prochain adversaire pour obtenir des conseils tactiques.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((analysis) => (
            <li key={analysis.id}>
              <Link
                href={`/fr/analyses/${encodeURIComponent(analysis.id)}`}
                data-analysis-id={analysis.id}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-card p-3.5 transition-colors hover:border-primary/30"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-primary">
                  <Swords className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {analysis.opponentTeamName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {analysis.teamFormation} vs {analysis.opponentTeamFormation}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
