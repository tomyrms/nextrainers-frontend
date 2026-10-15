"use client";

import {
  ArrowLeft,
  CalendarRange,
  Check,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Swords,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  PLAN_TYPES,
  THEMES,
  createTraining,
  fetchExercises,
  type PlanExercise,
} from "@/lib/api-trainings";

/** Today as "YYYY-MM-DD" in the browser's timezone (the date input's format). */
function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

interface ChoiceProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  testId: string;
}

const CHOICE_CLASS =
  "flex w-full cursor-pointer items-center gap-3 rounded-card border border-white/10 bg-card p-4 text-left transition-colors hover:border-white/20 active:scale-[0.99]";

function Choice({ icon: Icon, title, description, href, onClick, testId }: ChoiceProps) {
  const content = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  );

  return href ? (
    <Link href={href} data-testid={testId} className={CHOICE_CLASS}>
      {content}
    </Link>
  ) : (
    <button type="button" data-testid={testId} onClick={onClick} className={CHOICE_CLASS}>
      {content}
    </button>
  );
}

/**
 * The "+" flow: three entry points (manual session, match preparation, season
 * generation). The manual path swaps in the session builder on the same page.
 */
export function CreerFlow() {
  const [mode, setMode] = useState<"choose" | "manual">("choose");

  if (mode === "manual") return <ManualTrainingForm onBack={() => setMode("choose")} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h2 className="text-2xl font-semibold tracking-tight">Que veux-tu créer ?</h2>
        <p className="text-base text-muted-foreground">
          Choisis ton point de départ.
        </p>
      </div>
      <div className="space-y-3">
        <Choice
          testId="choice-manual"
          icon={ClipboardList}
          title="Créer un entraînement"
          description="Compose ta séance à partir de la bibliothèque d'exercices."
          onClick={() => setMode("manual")}
        />
        <Choice
          testId="choice-match"
          icon={Swords}
          title="Préparer un match"
          description="Analyse ton adversaire et reçois des conseils tactiques."
          href="/fr/analyses"
        />
        <Choice
          testId="choice-season"
          icon={CalendarRange}
          title="Générer ma saison"
          description="Planifie automatiquement tes prochaines séances."
          href="/fr/saison"
        />
      </div>
    </div>
  );
}

const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-white/10 bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none";

/**
 * Manual session builder: name, theme, date, then a type-filtered exercise
 * picker. Selection order is the plan order; the duration is their sum.
 */
function ManualTrainingForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [exercises, setExercises] = useState<PlanExercise[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState(PLAN_TYPES[0].type);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(THEMES[0]);
  const [date, setDate] = useState(todayLocal);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExercises().then((list) => {
      if (cancelled) return;
      if (list) setExercises(list);
      else setLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const plan = selected
    .map((id) => byId.get(id))
    .filter((exercise): exercise is PlanExercise => Boolean(exercise));
  const duration = plan.reduce((total, exercise) => total + (exercise.duration || 0), 0);
  const visible = (exercises ?? []).filter((exercise) => exercise.type === filter);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!name.trim()) return setError("Donne un nom à ta séance.");
    if (plan.length === 0) return setError("Ajoute au moins un exercice.");

    setSubmitting(true);
    setError(null);
    const id = await createTraining({ name: name.trim(), theme, date, plan });
    if (!id) {
      setSubmitting(false);
      setError("Impossible d'enregistrer la séance. Réessaie dans un instant.");
      return;
    }
    router.push(`/fr/entrainements/${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-fill text-foreground hover:bg-fill-strong"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h2 className="text-xl font-semibold tracking-tight">Nouvel entraînement</h2>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Nom de la séance</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Pressing haut et récupération"
            className={FIELD_CLASS}
            maxLength={80}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Thème</span>
            <select
              name="theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              className={FIELD_CLASS}
            >
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Date</span>
            <input
              type="date"
              name="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${FIELD_CLASS} [color-scheme:dark]`}
            />
          </label>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Exercices</h3>
          <span data-testid="plan-summary" className="text-xs font-medium text-muted-foreground">
            {plan.length} sélectionné{plan.length > 1 ? "s" : ""} · {duration} min
          </span>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {PLAN_TYPES.map((entry) => (
            <button
              key={entry.type}
              type="button"
              data-testid={`filter-${entry.type}`}
              aria-pressed={filter === entry.type}
              onClick={() => setFilter(entry.type)}
              className={`h-8 shrink-0 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors ${
                filter === entry.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-fill text-muted-foreground hover:bg-fill-strong"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {exercises === null && !loadFailed ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Chargement des exercices…
          </p>
        ) : loadFailed ? (
          <p className="text-sm text-muted-foreground">
            Bibliothèque indisponible pour le moment.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun exercice dans cette catégorie.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((exercise) => {
              const position = selected.indexOf(exercise.id);
              const isSelected = position >= 0;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    data-testid="pick-exercise"
                    data-exercise-id={exercise.id}
                    aria-pressed={isSelected}
                    onClick={() => toggle(exercise.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/8 bg-card hover:border-white/15"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-fill text-muted-foreground"
                      }`}
                    >
                      {isSelected ? position + 1 : <Check className="size-3.5 opacity-40" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {exercise.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {exercise.duration} min
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="create-training"
        disabled={submitting}
        className="glow-primary flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Créer la séance{plan.length ? ` (${duration} min)` : ""}
      </button>
    </form>
  );
}
