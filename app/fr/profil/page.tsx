import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ProfilContent } from "@/components/profile/ProfilContent";

export const metadata: Metadata = {
  title: "Profil - Nextrainers",
  description: "Ton profil coach : identité, équipe, expérience et niveau.",
};

/** Neutral skeleton shipped in the static shell while the session resolves. */
function ProfilSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-center gap-4">
        <div className="size-16 shrink-0 animate-pulse rounded-full bg-fill" />
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-full bg-fill" />
          <div className="h-3.5 w-44 animate-pulse rounded-full bg-fill" />
        </div>
      </div>
      <div className="h-52 animate-pulse rounded-2xl border border-white/10 bg-card" />
      <div className="h-12 animate-pulse rounded-2xl bg-fill" />
      <div className="h-11 animate-pulse rounded-xl bg-fill" />
    </div>
  );
}

export default function ProfilPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Profil" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        {/* Cookie read + profile fetch are request-time work; the shell keeps
            the skeleton until the session resolves. */}
        <Suspense fallback={<ProfilSkeleton />}>
          <ProfilContent />
        </Suspense>
      </main>

      <BottomNav active="Profil" />
    </div>
  );
}
