import { CalendarDays, Clock, ImageOff, Users } from "lucide-react";

import { exerciseTypeLabel } from "@/lib/api-bibliotheque";
import {
  formatLongDate,
  svgDataUri,
  type TrainingDetail,
} from "@/lib/api-trainings";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Session summary card: theme chip, name, French long date, total duration and
 * squad details. Shared by the detail page and the public share page.
 */
export function TrainingSummary({ training }: { training: TrainingDetail }) {
  const meta = [
    training.ageGroup ? training.ageGroup.toUpperCase() : null,
    training.playerCount ? `${training.playerCount} joueurs` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-card border border-white/10 bg-card p-4">
      <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
        {capitalize(training.theme)}
      </span>
      <h2
        data-testid="training-name"
        className="mt-3 text-xl leading-snug font-bold break-words text-foreground"
      >
        {training.name}
      </h2>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-4" />
          {capitalize(formatLongDate(training.date))}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4" />
          {training.duration} min
        </span>
        {meta ? (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" />
            {meta}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Ordered plan: numbered exercise cards with the diagram (rendered as an
 * image, never as live markup), type label, duration and objective.
 */
export function TrainingPlan({ training }: { training: TrainingDetail }) {
  if (training.plan.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-white/12 bg-black/20 p-4 text-sm text-muted-foreground">
        Aucun exercice dans cette séance.
      </p>
    );
  }

  return (
    <ol data-testid="training-plan" className="space-y-3">
      {training.plan.map((exercise, index) => (
        <li
          key={`${exercise.id}-${index}`}
          data-exercise-id={exercise.id}
          className="overflow-hidden rounded-card border border-white/10 bg-card p-3"
        >
          <div className="flex items-start gap-3">
            <div className="h-[74px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-darker ring-1 ring-white/8">
              {exercise.exerciseSvg ? (
                // eslint-disable-next-line @next/next/no-img-element -- inline data URI
                <img
                  src={svgDataUri(exercise.exerciseSvg)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-5" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                {index + 1}. {exerciseTypeLabel(exercise.type)} ·{" "}
                {exercise.duration} min
              </p>
              <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-bold text-foreground">
                {exercise.title}
              </h3>
              {exercise.objective ? (
                <p className="mt-1 line-clamp-3 text-xs leading-snug text-muted-foreground">
                  {exercise.objective}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
