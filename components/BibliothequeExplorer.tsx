"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, SearchX, type LucideIcon, X } from "lucide-react";

import { ExerciseCard } from "@/components/ExerciseCard";
import {
  EXERCISE_TYPES,
  exerciseTypeLabel,
  type Exercise,
  type ExerciseType,
} from "@/lib/api-bibliotheque";

/**
 * Browser-side call to the clone backend (permissive CORS). The page itself
 * reads through the server helpers in `lib/api-bibliotheque.ts`; only the
 * favorite mutations go straight to the API, then `router.refresh()` re-reads
 * the server truth for both lists.
 */
const FAVORITES_URL = `${
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4900"
}/api/exercises/favorite`;

/** Case- and accent-insensitive form, so "riviere" matches "rivière". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** "19 exercices", "1 exercice", "0 favori" (French zero takes singular). */
function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

/**
 * Client shell of the Bibliothèque: search field, type chips and the filtered
 * card list. The exercise array (server data) and the favorited ids (server
 * truth) arrive as props from the streaming server component.
 */
export function BibliothequeExplorer({
  exercises,
  favoriteIds,
}: {
  exercises: Exercise[];
  favoriteIds: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<ExerciseType | "all">("all");
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});

  const isFavorite = (id: string) => favoriteOverrides[id] ?? favoriteIds.includes(id);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    return exercises.filter((exercise) => {
      if (activeType !== "all" && exercise.type !== activeType) return false;
      if (!needle) return true;
      // Search covers the title, the description and the theme (type label).
      const haystack = normalize(
        [exercise.title, exercise.description, exerciseTypeLabel(exercise.type)]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(needle);
    });
  }, [exercises, activeType, query]);

  const favoriteCount = visible.filter((exercise) => isFavorite(exercise.id)).length;

  async function toggleFavorite(id: string, next: boolean) {
    setFavoriteOverrides((previous) => ({ ...previous, [id]: next }));
    try {
      const response = await fetch(
        next
          ? FAVORITES_URL
          : `${FAVORITES_URL}?exerciseId=${encodeURIComponent(id)}`,
        next
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ exerciseId: id }),
            }
          : { method: "DELETE" },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      // Failed call: roll the optimistic star back so the UI keeps the truth.
      setFavoriteOverrides((previous) => ({ ...previous, [id]: !next }));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="searchbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un exercice…"
          aria-label="Rechercher un exercice"
          className="h-11 w-full rounded-xl border border-white/10 bg-fill pr-10 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-fill-strong hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={activeType === "all"} onClick={() => setActiveType("all")}>
          Tous
        </FilterChip>
        {EXERCISE_TYPES.map((entry) => (
          <FilterChip
            key={entry.type}
            active={activeType === entry.type}
            onClick={() => setActiveType(entry.type)}
          >
            {entry.label}
          </FilterChip>
        ))}
      </div>

      <p className="text-xs font-medium text-muted-foreground">
        {countLabel(visible.length, "exercice", "exercices")}
        {" · "}
        {countLabel(favoriteCount, "favori", "favoris")}
      </p>

      {exercises.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun exercice dans ta bibliothèque"
          hint="Les exercices créés et partagés apparaîtront ici."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun exercice ne correspond"
          hint="Essaie un autre mot-clé ou change de filtre."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseCard
                exercise={exercise}
                isFavorite={isFavorite(exercise.id)}
                onToggleFavorite={toggleFavorite}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-darker"
          : "bg-fill text-muted-foreground hover:bg-fill-strong hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-white/12 bg-white/5 px-6 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/8 text-primary">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}
