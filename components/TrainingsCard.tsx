import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";

import { getTrainings, type Training } from "@/lib/api";

/** "5 oct." — day precision, French months, timezone-stable. */
function formatDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Streams the coach's library from the backend into the card. On any failure
 * the array is empty and the card keeps its historical empty state.
 */
export async function TrainingsCardLive() {
  const trainings = await getTrainings();
  return <TrainingsCard trainings={trainings} />;
}

/**
 * "Mes entraînements" library card, tinted slightly lighter than the page
 * canvas: real count plus up to three compact session rows, or the empty state
 * until the signed-in library has sessions.
 */
export function TrainingsCard({ trainings = [] }: { trainings?: Training[] }) {
  const sessions = trainings.slice(0, 3);
  const countLabel = `${trainings.length} séance${trainings.length > 1 ? "s" : ""}`;

  return (
    <section className="relative overflow-hidden rounded-card border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <CalendarDays className="size-3.5" />
          Mes entraînements
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {countLabel}
        </span>
      </div>

      {sessions.length === 0 ? (
        <button
          type="button"
          className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/12 bg-black/20 p-4 text-left transition-colors hover:bg-black/30"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-snug font-semibold text-foreground">
              Aucun entraînement pour l&apos;instant
            </span>
            <span className="block text-xs leading-snug text-muted-foreground">
              Tes séances créées apparaîtront ici.
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <ul className="mt-4 space-y-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/fr/entrainements/${encodeURIComponent(session.id)}`}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3 text-left transition-colors hover:bg-black/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-primary">
                  <CalendarDays className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm leading-snug font-semibold text-foreground">
                    {session.name}
                  </span>
                  <span className="block truncate text-xs leading-snug text-muted-foreground">
                    {[
                      capitalize(session.theme),
                      formatDate(session.date),
                      `${session.duration} min`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
