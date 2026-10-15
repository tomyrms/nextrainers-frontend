import { Link2Off } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { GlowButton } from "@/components/GlowButton";
import { TrainingPlan, TrainingSummary } from "@/components/trainings/TrainingPlan";
import { getSharedTraining } from "@/lib/api-trainings";

export const metadata: Metadata = {
  title: "Séance partagée - Nextrainers",
  description: "Une séance d'entraînement partagée par un coach Nextrainers.",
};

function ShareSkeleton() {
  return (
    <div aria-busy className="space-y-4">
      <div className="h-32 animate-pulse rounded-card bg-card" />
      <div className="h-24 animate-pulse rounded-card bg-card" />
    </div>
  );
}

async function SharedTrainingLive({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedTraining(token);

  if (!shared) {
    return (
      <div
        data-testid="share-missing"
        className="flex flex-col items-center gap-3 rounded-card border border-dashed border-white/12 bg-black/20 p-6 text-center"
      >
        <Link2Off className="size-8 text-muted-foreground" />
        <p className="text-base font-semibold">Ce lien n&apos;est plus valide</p>
        <p className="text-sm text-muted-foreground">
          La séance a peut-être été supprimée ou le lien est incomplet.
        </p>
      </div>
    );
  }

  const by = [shared.sharedBy?.fullName, shared.sharedBy?.teamName].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      {by ? (
        <p data-testid="shared-by" className="text-sm text-muted-foreground">
          Partagée par <span className="font-semibold text-foreground">{by}</span>
        </p>
      ) : null}
      <TrainingSummary training={shared.training} />
      <section className="space-y-3">
        <h3 className="text-base font-semibold">
          Programme · {shared.training.plan.length} exercice
          {shared.training.plan.length > 1 ? "s" : ""}
        </h3>
        <TrainingPlan training={shared.training} />
      </section>
    </div>
  );
}

/** Public, read-only page behind a training share link. No app navigation. */
export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[480px] items-center px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <Link href="/fr" aria-label="Nextrainers" className="inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-files/png/logo-full-white.png"
            alt="Nextrainers"
            width={157}
            height={48}
            className="-mx-4 h-12 w-auto object-contain opacity-90"
          />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Séance partagée</h1>
        <Suspense fallback={<ShareSkeleton />}>
          <SharedTrainingLive params={params} />
        </Suspense>

        <section className="mt-8 rounded-card border border-white/10 bg-card p-5 text-center">
          <p className="text-base font-semibold">Crée tes propres séances</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Rejoins les coachs qui préparent leurs entraînements avec Nextrainers.
          </p>
          <GlowButton href="/fr/inscription" className="mt-4 w-full">
            Créer mon compte
          </GlowButton>
        </section>
      </main>
    </div>
  );
}
