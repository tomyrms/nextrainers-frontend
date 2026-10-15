import Link from "next/link";
import { io } from "next/cache";
import { ArrowRight, House, Plane, Plus, Shield } from "lucide-react";

import { getNextMatch, type NextMatch } from "@/lib/api";

const DAY_MS = 86_400_000;

/** Local calendar date as "YYYY-MM-DD" (the format `from` expects). */
function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whole calendar days until `dateIso` (UTC-normalised, day precision). */
function daysUntil(dateIso: string): number {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const matchUtc = Date.parse(`${dateIso}T00:00:00Z`);
  return Math.max(0, Math.round((matchUtc - todayUtc) / DAY_MS));
}

/**
 * Streams the next fixture from the season API into the card. Today's date is
 * request-time data (`io()`), so the card stays out of the static shell: the
 * prerendered fallback is the exact empty state, upgraded once the API answers.
 */
export async function NextMatchCardLive() {
  await io();
  const match = await getNextMatch(todayIsoDate());
  return <NextMatchCard match={match} />;
}

/**
 * "PROCHAIN MATCH" card: my club vs. the next opponent, over a centred pitch
 * ornament (halfway line, centre circle, side glows). Renders the historical
 * empty state whenever no fixture is known.
 */
export function NextMatchCard({ match = null }: { match?: NextMatch | null }) {
  const opponent = match?.opponent ?? null;
  const isAway = match?.homeAway === "away";
  const VenueIcon = isAway ? Plane : House;
  const meta = match
    ? [match.competition, `J-${daysUntil(match.date)}`].filter(Boolean).join(" · ")
    : "";

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

        {opponent ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <VenueIcon className="size-3.5" />
            {isAway ? "Extérieur" : "Domicile"}
          </span>
        ) : null}
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

        {opponent ? (
          <div className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex size-18 items-center justify-center overflow-hidden rounded-full bg-fill shadow-[0_0_32px_rgba(0,200,245,0.25)] ring-2 ring-tertiary/50">
              <Shield className="size-8 text-tertiary" />
            </div>
            <span className="mt-1 max-w-full truncate text-sm font-bold">
              {opponent}
            </span>
            <span className="max-w-full truncate text-xs text-muted-foreground">
              {meta}
            </span>
          </div>
        ) : (
          <Link
            href="/fr/saison"
            className="group flex min-w-0 cursor-pointer flex-col items-center gap-2"
          >
            <div className="flex size-18 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-fill transition-all group-hover:border-primary group-hover:shadow-[0_0_24px_rgba(125,226,206,0.25)]">
              <Plus className="size-7 text-primary transition-transform group-hover:scale-110" />
            </div>
            <span className="mt-1 max-w-full truncate text-sm font-bold text-muted-foreground">
              Ajouter ton adversaire
            </span>
          </Link>
        )}
      </div>

      <Link
        href={
          opponent
            ? `/fr/analyses?opponent=${encodeURIComponent(opponent)}`
            : "/fr/saison"
        }
        className={`flex h-12 w-full min-w-0 cursor-pointer items-center justify-center gap-2 self-center rounded-xl bg-fill font-semibold text-foreground backdrop-blur-md transition-colors hover:bg-fill-strong active:scale-[0.98] ${
          opponent ? "px-4 text-sm" : "px-6 text-base"
        }`}
      >
        <span className="truncate">
          {opponent
            ? `Préparer le match contre ${opponent}`
            : "Importer mon calendrier"}
        </span>
        <ArrowRight className="size-5 shrink-0" />
      </Link>
    </section>
  );
}
