import { Layers } from "lucide-react";
import { io } from "next/cache";

import {
  getSeasonPlan,
  themeLabel,
  type SeasonMacroPlanBlock,
} from "@/lib/api-saison";

/**
 * Streams the plan's macro-plan blocks into the card; same request-time /
 * fail-soft pattern as the other season sections.
 */
export async function SeasonMacroPlanCardLive() {
  await io();
  const plan = await getSeasonPlan();
  return <SeasonMacroPlanCard blocks={plan?.macroPlan ?? null} />;
}

/**
 * "Macro-plan" card: one compact row per block — name, week span and the
 * block's priority theme.
 */
export function SeasonMacroPlanCard({
  blocks = null,
}: {
  blocks?: SeasonMacroPlanBlock[] | null;
}) {
  const list = blocks ?? [];
  const countLabel = `${list.length} bloc${list.length > 1 ? "s" : ""}`;

  return (
    <section
      data-testid="macro-plan-card"
      className="relative overflow-hidden rounded-card bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Layers className="size-3.5" />
          Macro-plan
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {countLabel}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/12 bg-black/20 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-primary">
            <Layers className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-snug font-semibold text-foreground">
              Aucun macro-plan pour l&apos;instant
            </span>
            <span className="block text-xs leading-snug text-muted-foreground">
              Les blocs de ta saison apparaîtront ici.
            </span>
          </span>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((block, index) => {
            const objective = themeLabel(block.objective);
            return (
              <li
                key={`${block.name}-${index}`}
                className="rounded-xl border border-white/8 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm leading-snug font-semibold text-foreground">
                    {block.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Sem. {block.startWeek}–{block.endWeek}
                  </span>
                </div>
                {objective ? (
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {objective}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
