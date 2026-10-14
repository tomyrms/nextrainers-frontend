"use client";

import { ImageOff, Star } from "lucide-react";

import { exerciseTypeLabel, type Exercise } from "@/lib/api-bibliotheque";

/**
 * One library card: SVG diagram on a dark panel, title, type badge, duration,
 * a two-line description and the favorite toggle. The favorite state itself
 * lives in `BibliothequeExplorer` (it owns the optimistic overrides and the
 * count line); the card only renders it and reports clicks.
 */
export function ExerciseCard({
  exercise,
  isFavorite,
  onToggleFavorite,
}: {
  exercise: Exercise;
  isFavorite: boolean;
  onToggleFavorite: (id: string, next: boolean) => void;
}) {
  return (
    <article className="overflow-hidden rounded-card border border-white/10 bg-card p-3 transition-colors hover:border-white/15">
      <div className="flex items-start gap-3">
        <div className="h-[74px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-darker ring-1 ring-white/8">
          {exercise.exerciseSvg ? (
            <div
              aria-hidden
              className="size-full [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: exercise.exerciseSvg }}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm leading-snug font-bold text-foreground">
              {exercise.title}
            </h3>

            <button
              type="button"
              data-testid="favorite-toggle"
              aria-pressed={isFavorite}
              aria-label={
                isFavorite
                  ? `Retirer ${exercise.title} des favoris`
                  : `Ajouter ${exercise.title} aux favoris`
              }
              onClick={() => onToggleFavorite(exercise.id, !isFavorite)}
              className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors active:scale-95 ${
                isFavorite
                  ? "bg-primary/15 text-primary"
                  : "bg-fill text-muted-foreground hover:bg-fill-strong hover:text-foreground"
              }`}
            >
              <Star className={`size-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
              {exerciseTypeLabel(exercise.type)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {exercise.duration} min
            </span>
          </div>
        </div>
      </div>

      {exercise.description ? (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {exercise.description}
        </p>
      ) : null}
    </article>
  );
}
