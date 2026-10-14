import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import {
  SeasonMacroPlanCard,
  SeasonMacroPlanCardLive,
} from "@/components/SeasonMacroPlanCard";
import { SeasonPlanCard, SeasonPlanCardLive } from "@/components/SeasonPlanCard";
import {
  SeasonSessionsCard,
  SeasonSessionsCardLive,
} from "@/components/SeasonSessionsCard";

export const metadata: Metadata = {
  title: "Saison - Nextrainers",
  description:
    "Ton plan de saison : catégorie, thèmes prioritaires, macro-plan et séances.",
};

export default function SaisonPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Saison" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <div className="space-y-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ta saison
            </h2>
            <p className="text-lg text-muted-foreground">
              Ton programme complet, de la préparation au dernier match.
            </p>
          </div>

          <div className="space-y-6">
            {/* Backend data streams in at request time; the prerendered shell
                keeps the exact empty states as fallbacks. */}
            <Suspense fallback={<SeasonPlanCard />}>
              <SeasonPlanCardLive />
            </Suspense>
            <Suspense fallback={<SeasonMacroPlanCard />}>
              <SeasonMacroPlanCardLive />
            </Suspense>
            <Suspense fallback={<SeasonSessionsCard />}>
              <SeasonSessionsCardLive />
            </Suspense>
          </div>
        </div>
      </main>

      <BottomNav active="Saison" />
    </div>
  );
}
