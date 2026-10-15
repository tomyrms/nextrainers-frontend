import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  ageFromDateOfBirth,
  footLabel,
  getPlayer,
  positionLabel,
  type Player,
} from "@/lib/api-equipe";
import { CoachNotesForm } from "./CoachNotesForm";
import { SkillEditor } from "./SkillEditor";
import { SkillsRadar } from "./SkillsRadar";

function BackLink() {
  return (
    <Link
      href="/fr/equipe"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Équipe
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "good" | "work" }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Rien de renseigné.</p>;
  const color = tone === "good" ? "bg-primary/15 text-primary" : "bg-white/8 text-foreground/80";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

/** Static shell shown while the player streams in (and the loading state). */
export function PlayerDetailSkeleton() {
  return (
    <div className="space-y-4">
      <BackLink />
      <div className="h-28 animate-pulse rounded-2xl bg-card" />
      <div className="h-80 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="space-y-4">
      <BackLink />
      <div className="rounded-2xl border border-white/10 bg-card p-6 text-center">
        <p className="font-semibold">Joueur introuvable</p>
        <p className="mt-1 text-sm text-muted-foreground">Il a peut-être été retiré de l&apos;effectif.</p>
      </div>
    </div>
  );
}

export function PlayerDetail({ player }: { player: Player }) {
  const age = ageFromDateOfBirth(player.dateOfBirth);
  const meta = [positionLabel(player.position), `Pied ${footLabel(player.preferredFoot).toLowerCase()}`, age !== null ? `${age} ans` : null]
    .filter(Boolean)
    .join(" · ");
  const skills = player.skills ?? [];
  const stats = [
    { label: "Matchs", value: player.matches ?? 0 },
    { label: "Buts", value: player.goals ?? 0 },
    { label: "Passes D.", value: player.assists ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <BackLink />

      <section className="rounded-2xl border border-white/10 bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-xl font-bold text-primary">
            {player.jerseyNumber}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight" data-testid="player-name">
              {player.firstName} {player.lastName}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{meta}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/5 py-2 text-center">
              <dd className="text-lg font-bold tabular-nums">{stat.value}</dd>
              <dt className="text-[11px] font-medium text-muted-foreground">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <Section title="Compétences">
        <SkillsRadar skills={skills} />
        {skills.length > 0 ? (
          <div className="mt-2">
            <SkillEditor playerId={player.id} skills={skills} />
          </div>
        ) : null}
      </Section>

      <Section title="Points forts">
        <Chips items={player.strengths ?? []} tone="good" />
      </Section>

      <Section title="Axes de progression">
        <Chips items={player.improvements ?? []} tone="work" />
      </Section>

      <Section title="Notes du coach">
        <CoachNotesForm playerId={player.id} initialNotes={player.coachNotes ?? ""} />
      </Section>
    </div>
  );
}

/** Awaits the route params and the player at request time (inside Suspense). */
export async function PlayerDetailLive({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  return player ? <PlayerDetail player={player} /> : <NotFound />;
}
