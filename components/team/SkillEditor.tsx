"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";

import {
  SKILL_MAX,
  SKILL_MIN,
  patchPlayer,
  type PlayerSkill,
} from "@/lib/api-equipe";

/**
 * Per-skill −/+ steppers. Each tap PATCHes the new rating ({skills:[{id,
 * value}]}) and refreshes the route so the server-rendered radar follows.
 */
export function SkillEditor({
  playerId,
  skills,
}: {
  playerId: string;
  skills: PlayerSkill[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(() =>
    Object.fromEntries(skills.map((s) => [s.id, s.value])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function change(skill: PlayerSkill, delta: number) {
    const current = values[skill.id] ?? skill.value;
    const next = Math.max(SKILL_MIN, Math.min(SKILL_MAX, current + delta));
    if (next === current) return;

    setValues((v) => ({ ...v, [skill.id]: next }));
    setError(null);
    const ok = await patchPlayer(playerId, { skills: [{ id: skill.id, value: next }] });
    if (!ok) {
      setValues((v) => ({ ...v, [skill.id]: current }));
      setError("Impossible d'enregistrer la note. Réessaie.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <ul className="divide-y divide-white/8">
        {skills.map((skill) => {
          const value = values[skill.id] ?? skill.value;
          return (
            <li key={skill.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
              <button
                type="button"
                aria-label={`Baisser ${skill.name}`}
                disabled={value <= SKILL_MIN || pending}
                onClick={() => change(skill, -1)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/8 transition-colors hover:bg-white/12 disabled:cursor-default disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span
                className="w-8 text-center text-base font-bold text-primary tabular-nums"
                data-testid={`skill-value-${skill.id}`}
              >
                {value}
              </span>
              <button
                type="button"
                aria-label={`Augmenter ${skill.name}`}
                disabled={value >= SKILL_MAX || pending}
                onClick={() => change(skill, 1)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/8 transition-colors hover:bg-white/12 disabled:cursor-default disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
