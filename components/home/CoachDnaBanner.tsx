"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "nextrainers_coach_dna_home_banner_dismissed";

/**
 * Signed-in home banner, mirroring the original CoachDnaHomeBanner (same copy,
 * same localStorage dismissal key). The clone has no coach-DNA quiz yet, so
 * the CTA opens the profile page.
 */
export function CoachDnaBanner() {
  // Hidden until localStorage is read, like the original (no flash).
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative" data-testid="coach-dna-banner">
      <Link
        href="/fr/profil"
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/20 bg-card py-4 pr-12 pl-4 transition-transform active:scale-[0.98]"
      >
        <div className="pointer-events-none absolute top-1/2 -left-10 size-36 -translate-y-1/2 rounded-full bg-primary/15 blur-2xl" />
        <Sparkles className="relative size-8 shrink-0 text-primary" strokeWidth={1.5} />
        <div className="relative min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold tracking-wide text-primary uppercase">
            Nouveau
          </span>
          <p className="mt-1.5 text-base leading-snug font-semibold">Quel grand coach es-tu ?</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Réponds à quelques questions sur ta façon de coacher et obtiens ta carte à partager.
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-sm font-semibold text-primary transition-all duration-200 group-hover:gap-2.5">
            Créer ma carte
            <ArrowRight className="size-4" />
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-label="Masquer"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "true");
          } catch {
            // Private mode: dismissal lasts for this page view only.
          }
        }}
        className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
