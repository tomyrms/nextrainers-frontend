import { CalendarDays } from "lucide-react";
import { io } from "next/cache";

import { GenerateSessionsButton } from "@/components/GenerateSessionsButton";
import {
  formatShortDate,
  getSeasonPlan,
  getSeasonSessions,
  intensityLabel,
  sessionKindLabel,
  themeLabel,
  type SeasonSession,
} from "@/lib/api-saison";

const INTENSITY_STYLES: Record<string, { dot: string; text: string }> = {
  low: { dot: "bg-primary", text: "text-primary" },
  medium: { dot: "bg-amber-400", text: "text-amber-300" },
  high: { dot: "bg-destructive", text: "text-destructive" },
};

const UNKNOWN_INTENSITY_STYLE = {
  dot: "bg-white/40",
  text: "text-muted-foreground",
};

/**
 * Streams the plan's session skeleton (plan id first, then its sessions) into
 * the card; same request-time / fail-soft pattern as the other season sections.
 */
export async function SeasonSessionsCardLive() {
  await io();
  const plan = await getSeasonPlan();
  const sessions = plan ? await getSeasonSessions(plan.id) : [];
  return (
    <SeasonSessionsCard sessions={sessions} seasonPlanId={plan?.id ?? null} />
  );
}

/**
 * "Séances" card: session count, the generation CTA, then the sessions grouped
 * by macro-plan block — date, theme, intensity, kind, duration and objective.
 */
export function SeasonSessionsCard({
  sessions = [],
  seasonPlanId = null,
}: {
  sessions?: SeasonSession[];
  seasonPlanId?: string | null;
}) {
  const groups: { mesocycle: string | null; sessions: SeasonSession[] }[] = [];
  for (const session of sessions) {
    const current = groups[groups.length - 1];
    if (current && current.mesocycle === session.mesocycle) {
      current.sessions.push(session);
    } else {
      groups.push({ mesocycle: session.mesocycle, sessions: [session] });
    }
  }
  const countLabel = `${sessions.length} séance${sessions.length > 1 ? "s" : ""}`;

  return (
    <section
      data-testid="season-sessions-card"
      className="relative overflow-hidden rounded-card bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <CalendarDays className="size-3.5" />
          Séances
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {countLabel}
        </span>
      </div>

      {seasonPlanId ? (
        <div className="mt-4">
          <GenerateSessionsButton seasonPlanId={seasonPlanId} />
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <div className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/12 bg-black/20 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-snug font-semibold text-foreground">
              Aucune séance planifiée
            </span>
            <span className="block text-xs leading-snug text-muted-foreground">
              Génère ton programme pour voir les séances ici.
            </span>
          </span>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.mesocycle ?? "sessions"}>
              {group.mesocycle ? (
                <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.mesocycle}
                </h3>
              ) : null}
              <ul className="mt-2 space-y-2">
                {group.sessions.map((session, index) => {
                  const theme = themeLabel(session.theme);
                  const intensity = intensityLabel(session.intensity);
                  const style =
                    (session.intensity &&
                      INTENSITY_STYLES[session.intensity]) ||
                    UNKNOWN_INTENSITY_STYLE;
                  const kind = sessionKindLabel(session.sessionKind);
                  const meta = [
                    kind,
                    session.durationMinutes
                      ? `${session.durationMinutes} min`
                      : null,
                  ]
                    .filter((value): value is string => Boolean(value))
                    .join(" · ");

                  return (
                    <li
                      key={`${session.date}-${index}`}
                      data-testid="session-row"
                      className="rounded-xl border border-white/8 bg-black/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm leading-snug font-semibold text-foreground">
                          {formatShortDate(session.date)}
                        </span>
                        {intensity ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold">
                            <span
                              className={`size-1.5 rounded-full ${style.dot}`}
                            />
                            <span className={style.text}>{intensity}</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {theme ? (
                          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {theme}
                          </span>
                        ) : null}
                        {meta ? (
                          <span className="text-xs text-muted-foreground">
                            {meta}
                          </span>
                        ) : null}
                      </div>

                      {session.objective ? (
                        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                          {session.objective}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
