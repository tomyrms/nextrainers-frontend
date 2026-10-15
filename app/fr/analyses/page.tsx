import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { AnalysesList, AnalysesListLive } from "@/components/analyses/AnalysesList";
import { CreateAnalysisForm } from "@/components/analyses/CreateAnalysisForm";

export const metadata: Metadata = {
  title: "Analyses - Nextrainers",
  description: "Analyse tes adversaires et reçois des conseils tactiques.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Reads `?opponent=` (next-match CTA) at request time to prefill the form. */
async function PrefilledForm({ searchParams }: { searchParams: SearchParams }) {
  const opponent = (await searchParams).opponent;
  return (
    <CreateAnalysisForm
      defaultOpponent={typeof opponent === "string" ? opponent.slice(0, 80) : ""}
    />
  );
}

export default function AnalysesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Analyses" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <div className="space-y-6">
          <Suspense fallback={<CreateAnalysisForm />}>
            <PrefilledForm searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={<AnalysesList analyses={null} />}>
            <AnalysesListLive />
          </Suspense>
        </div>
      </main>

      <BottomNav active="" />
    </div>
  );
}
