import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";

import { AppHeader } from "@/components/AppHeader";
import { BibliothequeExplorer } from "@/components/BibliothequeExplorer";
import { BottomNav } from "@/components/BottomNav";
import { getExercises, getFavoriteExercises } from "@/lib/api-bibliotheque";

export const metadata: Metadata = {
  title: "Bibliothèque - Nextrainers",
  description:
    "Ta bibliothèque d'exercices : échauffements, jeux et retours au calme.",
};

export default function BibliothequePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Bibliothèque" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        {/* Backend data streams in at request time; the prerendered fallback is
            the exact empty state, upgraded once the API answers. */}
        <Suspense
          fallback={<BibliothequeExplorer exercises={[]} favoriteIds={[]} />}
        >
          <BibliothequeLive />
        </Suspense>
      </main>

      <BottomNav active="Bibliothèque" />
    </div>
  );
}

/**
 * Streams the exercise library and the favorited ids from the clone backend.
 * `io()` keeps the uncached reads out of the static shell, so a build-time
 * prerender (where the API may be down) can never bake the empty state in.
 * `lib/api-bibliotheque.ts` is fail-soft: any failure yields empty arrays and
 * the explorer keeps its empty state.
 */
async function BibliothequeLive() {
  await io();
  const [exercises, favorites] = await Promise.all([
    getExercises(),
    getFavoriteExercises(),
  ]);

  return (
    <BibliothequeExplorer
      exercises={exercises}
      favoriteIds={favorites.map((exercise) => exercise.id)}
    />
  );
}
