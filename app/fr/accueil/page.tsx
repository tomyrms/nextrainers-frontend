import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CreateTrainingCard } from "@/components/CreateTrainingCard";
import { NextMatchCard, NextMatchCardLive } from "@/components/NextMatchCard";
import { TrainingsCard, TrainingsCardLive } from "@/components/TrainingsCard";

export const metadata: Metadata = {
  title: "Accueil - Nextrainers",
  description: "Ton tableau de bord coach : prochain match, séances et équipe.",
};

export default function AccueilPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Accueil" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <div className="space-y-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold tracking-tight">
              Heureux de te revoir
            </h2>
            <p className="text-lg text-muted-foreground">
              Prêt à gagner ton match ce weekend ?
            </p>
          </div>

          <div className="space-y-6">
            <CreateTrainingCard />

            {/* Backend data streams in at request time; the prerendered shell
                keeps the exact empty states as fallbacks. */}
            <Suspense fallback={<NextMatchCard />}>
              <NextMatchCardLive />
            </Suspense>
            <Suspense fallback={<TrainingsCard />}>
              <TrainingsCardLive />
            </Suspense>
          </div>
        </div>
      </main>

      <BottomNav active="Accueil" />
    </div>
  );
}
