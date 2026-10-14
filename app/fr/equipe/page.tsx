import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { TeamRoster, TeamRosterLive } from "@/components/team/TeamRoster";

export const metadata: Metadata = {
  title: "Équipe - Nextrainers",
  description:
    "Ton effectif : joueurs, postes, pied fort et statistiques de la saison.",
};

export default function EquipePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Équipe" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        {/* The backend roster streams in at request time; the prerendered shell
            keeps the exact empty state as the fallback. */}
        <Suspense fallback={<TeamRoster players={null} />}>
          <TeamRosterLive />
        </Suspense>
      </main>

      <BottomNav active="Équipe" />
    </div>
  );
}
