import Link from "next/link";
import { io } from "next/cache";
import { ArrowLeft, Lightbulb, SearchX } from "lucide-react";

import {
  TIP_CATEGORIES,
  getAnalysis,
  tipCategoryLabel,
  type Analysis,
  type AnalysisTip,
} from "@/lib/api-analyses";
import { GenerateTipsButton } from "./GenerateTipsButton";

/** Resolves the route param and streams the analysis detail. */
export async function AnalysisDetailLive({ params }: { params: Promise<{ id: string }> }) {
  await io();
  const { id } = await params;
  const result = await getAnalysis(id);
  if (result.kind === "not-found") return <AnalysisMissing />;
  if (result.kind === "error") return <AnalysisMissing unreachable />;
  return <AnalysisDetail analysis={result.analysis} />;
}

function BackLink() {
  return (
    <Link
      href="/fr/analyses"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Mes analyses
    </Link>
  );
}

/** Static fallback shell while the detail streams in. */
export function AnalysisDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <BackLink />
      <div className="h-36 animate-pulse rounded-card border border-white/8 bg-card" />
      <div className="h-24 animate-pulse rounded-card border border-white/8 bg-card" />
    </div>
  );
}

/** Unknown id (404 → NOT_FOUND) or unreachable backend. */
export function AnalysisMissing({ unreachable = false }: { unreachable?: boolean }) {
  return (
    <div className="space-y-4">
      <BackLink />
      <section className="flex flex-col items-center gap-3 rounded-card border border-white/8 bg-card p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/8 text-primary">
          <SearchX className="size-6" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {unreachable ? "Analyse indisponible" : "Analyse introuvable"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {unreachable
              ? "Le serveur ne répond pas. Réessaie dans un instant."
              : "Cette analyse n'existe pas ou a été supprimée."}
          </p>
        </div>
      </section>
    </div>
  );
}

function FormationBlock({ label, name, formation }: { label: string; name: string; formation: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-center">
      <p className="truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="truncate text-sm font-bold text-foreground">{name}</p>
      <p className="text-lg font-bold text-primary">{formation}</p>
    </div>
  );
}

/** Groups tips by category in the fixed French order; unknown ones last. */
function groupTips(tips: AnalysisTip[]): { label: string; tips: AnalysisTip[] }[] {
  const known = TIP_CATEGORIES.map((category) => ({
    label: category.label,
    tips: tips.filter((tip) => tip.category === category.value),
  }));
  const others = tips.filter(
    (tip) => !TIP_CATEGORIES.some((category) => category.value === tip.category),
  );
  return [...known, { label: tipCategoryLabel(""), tips: others }].filter(
    (group) => group.tips.length > 0,
  );
}

export function AnalysisDetail({ analysis }: { analysis: Analysis }) {
  const tips = analysis.tips ?? [];
  const groups = groupTips(tips);

  return (
    <div className="space-y-4">
      <BackLink />

      <section className="rounded-card border border-white/8 bg-card p-4">
        <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          Analyse
        </span>
        <h2 className="mt-3 truncate text-xl font-semibold">{analysis.opponentTeamName}</h2>
        <div className="mt-4 flex items-stretch gap-2">
          <FormationBlock label="Mon équipe" name="Système" formation={analysis.teamFormation} />
          <span className="self-center text-xs font-bold text-muted-foreground">VS</span>
          <FormationBlock
            label="Adversaire"
            name={analysis.opponentTeamName}
            formation={analysis.opponentTeamFormation}
          />
        </div>
      </section>

      <section className="space-y-3" aria-label="Conseils">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          Conseils
        </h3>

        {groups.length === 0 ? (
          <div className="space-y-3 rounded-card border border-white/8 bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Aucun conseil pour l&apos;instant. Lance la génération pour préparer ce match.
            </p>
            <GenerateTipsButton analysisId={analysis.id} />
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
              <ul className="space-y-2">
                {group.tips.map((tip) => (
                  <li
                    key={tip.id}
                    data-tip-id={tip.id}
                    className="rounded-2xl border border-white/8 bg-card p-3.5"
                  >
                    <p className="text-sm font-bold text-foreground">{tip.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
