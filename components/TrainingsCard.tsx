import { CalendarDays, ChevronRight } from "lucide-react";

/**
 * Placeholder library card ("Mes entraînements"), tinted slightly lighter than
 * the page canvas. Empty until the signed-in library exists.
 */
export function TrainingsCard() {
  return (
    <section className="relative overflow-hidden rounded-card border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <CalendarDays className="size-3.5" />
          Mes entraînements
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          0 séance
        </span>
      </div>

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
    </section>
  );
}
