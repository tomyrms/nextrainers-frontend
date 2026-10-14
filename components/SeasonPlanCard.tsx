import { CalendarRange } from "lucide-react";
import { io } from "next/cache";

import {
  formatLongDate,
  getSeasonPlan,
  matchDayLabel,
  themeLabel,
  trainingDayLabel,
  type SeasonPlan,
} from "@/lib/api-saison";

/**
 * Streams the season plan from the backend into the card. The plan is
 * request-time data (`io()`), so the card stays out of the static shell: the
 * prerendered fallback is the exact empty state, upgraded once the API answers.
 */
export async function SeasonPlanCardLive() {
  await io();
  const plan = await getSeasonPlan();
  return <SeasonPlanCard plan={plan} />;
}

/**
 * "Plan de saison" card: category badge, season span (preseason start →
 * championship end), priority-theme chips and the weekly training days.
 */
export function SeasonPlanCard({ plan = null }: { plan?: SeasonPlan | null }) {
  const category = plan?.teamCategory?.toUpperCase() ?? null;
  const matchDay = matchDayLabel(plan?.usualMatchDay);
  const themes = plan?.seasonThemesPriority ?? [];
  const trainingDays = (plan?.trainingDays ?? []).map(trainingDayLabel);
  const seasonStart = formatLongDate(plan?.calendar?.preseasonStartDate);
  const seasonEnd = formatLongDate(plan?.calendar?.championshipEndDate);
  const seasonSpan = [seasonStart, seasonEnd]
    .filter((value): value is string => Boolean(value))
    .join(" → ");
  const hasDetails = Boolean(
    category || seasonSpan || themes.length > 0 || trainingDays.length > 0,
  );

  return (
    <section
      data-testid="season-plan-card"
      className="relative overflow-hidden rounded-card bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <CalendarRange className="size-3.5" />
          Plan de saison
        </span>

        {matchDay ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {matchDay}
          </span>
        ) : null}
      </div>

      {plan && hasDetails ? (
        <>
          {category || seasonSpan ? (
            <div className="mt-4 flex items-center gap-3">
              {category ? (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-base font-black tracking-wide text-primary">
                  {category}
                </span>
              ) : null}
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Saison
                </span>
                <span className="block text-sm leading-snug font-semibold">
                  {seasonSpan || "Dates à définir"}
                </span>
              </div>
            </div>
          ) : null}

          {themes.length > 0 ? (
            <div className="mt-4">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Thèmes prioritaires
              </span>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {themes.map((theme) => (
                  <li
                    key={theme}
                    className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {themeLabel(theme)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {trainingDays.length > 0 ? (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2.5">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Entraînements
              </span>
              <span className="text-sm font-semibold">
                {trainingDays.join(" · ")}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/12 bg-black/20 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-primary">
            <CalendarRange className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-snug font-semibold text-foreground">
              Aucun plan de saison pour l&apos;instant
            </span>
            <span className="block text-xs leading-snug text-muted-foreground">
              Ton plan de saison apparaîtra ici dès sa création.
            </span>
          </span>
        </div>
      )}
    </section>
  );
}
