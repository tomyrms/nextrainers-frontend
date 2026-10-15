import type { Metadata } from "next";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CreerFlow } from "@/components/trainings/CreerFlow";

export const metadata: Metadata = {
  title: "Créer - Nextrainers",
  description: "Crée une séance, prépare un match ou génère ta saison.",
};

export default function CreerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Créer" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <CreerFlow />
      </main>

      <BottomNav active="" />
    </div>
  );
}
