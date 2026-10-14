import { io } from "next/cache";
import { Users } from "lucide-react";

import { POSITION_GROUPS, getPlayers, type Player } from "@/lib/api-equipe";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerCard } from "./PlayerCard";

/**
 * Streams the roster from the backend into the page. `io()` keeps the fetch
 * (and the ages computed per player) out of the static shell; on any failure
 * `getPlayers` resolves to an empty array and the card keeps its empty state.
 */
export async function TeamRosterLive() {
  await io();
  const players = await getPlayers();
  return <TeamRoster players={players} />;
}

/**
 * Équipe content: summary card (squad count + per-group chips), the add-player
 * affordance and the roster list — or the empty state until players exist.
 * `players === null` renders the same layout as the static fallback shell.
 */
export function TeamRoster({ players }: { players: Player[] | null }) {
  const roster = [...(players ?? [])].sort(
    (a, b) => (a.jerseyNumber ?? 0) - (b.jerseyNumber ?? 0),
  );
  const count = roster.length;
  const countLabel = `${count} joueur${count > 1 ? "s" : ""}`;
  const groups = POSITION_GROUPS.map((group) => ({
    label: group.label,
    count: roster.filter((player) => group.positions.includes(player.position))
      .length,
  })).filter((group) => group.count > 0);

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-white/8 bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
            <Users className="size-3.5" aria-hidden />
            Effectif
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {countLabel}
          </span>
        </div>

        {groups.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {groups.map((group) => (
              <div
                key={group.label}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2"
              >
                <span className="truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </span>
                <span className="text-base font-bold text-primary">
                  {group.count}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <AddPlayerForm />

      {roster.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-card border border-white/8 bg-card p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/8 text-primary">
            <Users className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Aucun joueur pour l&apos;instant
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajoute tes joueurs pour construire l&apos;effectif et suivre leur
              progression.
            </p>
          </div>
        </section>
      ) : (
        <ul className="space-y-2.5">
          {roster.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </ul>
      )}
    </div>
  );
}
