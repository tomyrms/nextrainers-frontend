import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import {
  AnalysisDetailLive,
  AnalysisDetailSkeleton,
} from "@/components/analyses/AnalysisDetail";

export const metadata: Metadata = {
  title: "Analyse - Nextrainers",
  description: "Systèmes en présence et conseils tactiques pour ton prochain match.",
};

// Not async: the params promise is awaited inside the Suspense boundary so
// the header/nav shell stays static.
export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Analyse" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Suspense fallback={<AnalysisDetailSkeleton />}>
          <AnalysisDetailLive params={params} />
        </Suspense>
      </main>

      <BottomNav active="" />
    </div>
  );
}
