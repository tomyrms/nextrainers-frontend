"use client";

import { useState } from "react";

import { patchPlayer } from "@/lib/api-equipe";

type Status = "idle" | "saving" | "saved" | "error";

/** Free-text coach notes, saved with PATCH {coachNotes}. */
export function CoachNotesForm({
  playerId,
  initialNotes,
}: {
  playerId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(initialNotes);
  const [status, setStatus] = useState<Status>("idle");

  async function save() {
    setStatus("saving");
    const ok = await patchPlayer(playerId, { coachNotes: notes });
    if (ok) setSaved(notes);
    setStatus(ok ? "saved" : "error");
  }

  const dirty = notes !== saved;

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setStatus("idle");
        }}
        rows={4}
        maxLength={2000}
        placeholder="Observations, consignes individuelles, objectifs…"
        aria-label="Notes du coach"
        className="w-full resize-none rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {status === "saved" ? "Notes enregistrées" : status === "error" ? "Échec de l'enregistrement" : ""}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === "saving"}
          className="h-9 cursor-pointer rounded-xl bg-primary px-4 text-sm font-semibold text-darker transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
        >
          {status === "saving" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
