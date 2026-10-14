import { ArrowRight, Plus, Shield } from "lucide-react";

/**
 * "PROCHAIN MATCH" card: my club vs. an opponent that has not been picked yet,
 * over a centred pitch ornament (halfway line, centre circle, side glows).
 */
export function NextMatchCard() {
  return (
    <section className="relative isolate overflow-hidden rounded-card bg-surface p-4 sm:p-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/6" />
        <div className="absolute top-[42%] left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/6" />
        <div className="absolute top-[42%] left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute top-[40%] left-[22%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-[40%] left-[78%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tertiary/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Prochain match
        </span>
      </div>

      <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 flex-col items-center gap-2">
          <div className="flex size-18 items-center justify-center overflow-hidden rounded-full bg-fill shadow-[0_0_32px_rgba(125,226,206,0.25)] ring-2 ring-primary/50">
            <Shield className="size-8 text-primary" />
          </div>
          <span className="mt-1 max-w-full truncate text-sm font-bold">
            Mon club
          </span>
        </div>

        <span className="bg-linear-to-b from-foreground to-foreground/30 bg-clip-text px-2 text-3xl font-black tracking-tight text-transparent italic">
          VS
        </span>

        <button
          type="button"
          className="group flex min-w-0 cursor-pointer flex-col items-center gap-2"
        >
          <div className="flex size-18 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-fill transition-all group-hover:border-primary group-hover:shadow-[0_0_24px_rgba(125,226,206,0.25)]">
            <Plus className="size-7 text-primary transition-transform group-hover:scale-110" />
          </div>
          <span className="mt-1 max-w-full truncate text-sm font-bold text-muted-foreground">
            Ajouter ton adversaire
          </span>
        </button>
      </div>

      <button
        type="button"
        className="flex h-12 w-full min-w-0 cursor-pointer items-center justify-center gap-2 self-center rounded-xl bg-fill px-6 text-base font-semibold text-foreground backdrop-blur-md transition-colors hover:bg-fill-strong active:scale-[0.98]"
      >
        Importer mon calendrier
        <ArrowRight className="size-5" />
      </button>
    </section>
  );
}
