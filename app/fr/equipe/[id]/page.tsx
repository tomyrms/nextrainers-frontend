import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PlayerDetailLive, PlayerDetailSkeleton } from "@/components/team/PlayerDetail";

export const metadata: Metadata = {
  title: "Joueur - Nextrainers",
  description: "Fiche joueur : statistiques, radar de compétences, points forts et notes du coach.",
};

export default function PlayerPage({ params }: PageProps<"/fr/equipe/[id]">) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Joueur" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        {/* Params and the player are request-time data: the static shell
            ships the skeleton. */}
        <Suspense fallback={<PlayerDetailSkeleton />}>
          <PlayerDetailLive params={params} />
        </Suspense>
      </main>

      <BottomNav active="Équipe" />
    </div>
  );
}
