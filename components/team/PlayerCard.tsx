import Link from "next/link";

import {
  ageFromDateOfBirth,
  footLabel,
  positionLabel,
  statsSummary,
  type Player,
} from "@/lib/api-equipe";
import { DeletePlayerButton } from "./DeletePlayerButton";

/**
 * One roster row: teal jersey-number square, name + French position/foot/age
 * line, season totals when non-zero, up to two strength chips and the discreet
 * client-side delete button.
 */
export function PlayerCard({ player }: { player: Player }) {
  const age = ageFromDateOfBirth(player.dateOfBirth);
  const meta = [
    positionLabel(player.position),
    footLabel(player.preferredFoot),
    age !== null ? `${age} ans` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const stats = statsSummary(player);
  const strengths = (player.strengths ?? []).slice(0, 2);
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-white/8 bg-card p-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-base font-bold text-primary">
        {player.jerseyNumber}
      </span>

      <Link
        href={`/fr/equipe/${encodeURIComponent(player.id)}`}
        aria-label={`Fiche de ${fullName}`}
        className="min-w-0 flex-1 rounded-lg transition-opacity hover:opacity-90"
      >
        <p className="truncate text-sm font-bold text-foreground">
          {player.firstName} {player.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>

        {stats ? (
          <p className="mt-1.5 text-xs font-medium text-foreground/80">
            {stats}
          </p>
        ) : null}

        {strengths.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {strengths.map((strength) => (
              <span
                key={strength}
                className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {strength}
              </span>
            ))}
          </div>
        ) : null}
      </Link>

      <DeletePlayerButton playerId={player.id} playerName={fullName} />
    </li>
  );
}
