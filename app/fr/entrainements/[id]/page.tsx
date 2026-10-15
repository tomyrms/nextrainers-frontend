import { ArrowLeft, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { TrainingActions } from "@/components/trainings/TrainingActions";
import { TrainingPlan, TrainingSummary } from "@/components/trainings/TrainingPlan";
import { getTraining } from "@/lib/api-trainings";

export const metadata: Metadata = {
  title: "Entraînement - Nextrainers",
  description: "Le détail de ta séance : exercices, durée et partage.",
};

/** Static fallback while the session streams in. */
function DetailSkeleton() {
  return (
    <div aria-busy className="space-y-4">
      <div className="h-32 animate-pulse rounded-card bg-card" />
      <div className="h-24 animate-pulse rounded-card bg-card" />
      <div className="h-24 animate-pulse rounded-card bg-card" />
    </div>
  );
}

async function TrainingDetailLive({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const training = await getTraining(id);

  if (!training) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-white/12 bg-black/20 p-6 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="text-base font-semibold">Séance introuvable</p>
        <p className="text-sm text-muted-foreground">
          Elle a peut-être été supprimée.
        </p>
        <Link href="/fr/accueil" className="text-sm font-semibold text-primary">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TrainingSummary training={training} />
      <TrainingActions trainingId={training.id} name={training.name} />
      <section className="space-y-3">
        <h3 className="text-base font-semibold">
          Programme · {training.plan.length} exercice{training.plan.length > 1 ? "s" : ""}
        </h3>
        <TrainingPlan training={training} />
      </section>
    </div>
  );
}

export default function EntrainementPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Entraînement" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Link
          href="/fr/accueil"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Accueil
        </Link>
        <Suspense fallback={<DetailSkeleton />}>
          <TrainingDetailLive params={params} />
        </Suspense>
      </main>

      <BottomNav active="Accueil" />
    </div>
  );
}
