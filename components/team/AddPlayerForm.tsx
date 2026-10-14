"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TriangleAlert, UserPlus, X } from "lucide-react";

import { POSITION_OPTIONS, createPlayer } from "@/lib/api-equipe";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60";

/**
 * "Ajouter un joueur" trigger + create form (players contract §4): POSTs the
 * player from the browser, then refreshes the route so the roster streams back
 * with the new card. Validation, server and network errors stay inline.
 */
export function AddPlayerForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function openForm() {
    setError(null);
    setSuccess(null);
    setOpen(true);
  }

  function closeForm() {
    setError(null);
    setOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const position = String(data.get("position") ?? "");
    const jerseyNumber = Number(data.get("jerseyNumber"));
    const preferredFoot =
      String(data.get("preferredFoot")) === "LEFT" ? "LEFT" : "RIGHT";
    const dateOfBirth = String(data.get("dateOfBirth") ?? "");

    if (
      !firstName ||
      !lastName ||
      !position ||
      !dateOfBirth ||
      !Number.isFinite(jerseyNumber)
    ) {
      setError("Remplis tous les champs pour ajouter le joueur.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await createPlayer({
      firstName,
      lastName,
      position,
      jerseyNumber,
      preferredFoot,
      dateOfBirth,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    form.reset();
    setOpen(false);
    setSuccess(`${firstName} ${lastName} ajouté à l'effectif`);
    window.setTimeout(() => setSuccess(null), 5000);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {success}
        </p>
      ) : null}

      {open ? (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="rounded-card border border-white/10 bg-card p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Nouveau joueur
            </span>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Fermer le formulaire"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" htmlFor="player-first-name">
                <input
                  id="player-first-name"
                  name="firstName"
                  required
                  autoComplete="off"
                  placeholder="Léo"
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Nom" htmlFor="player-last-name">
                <input
                  id="player-last-name"
                  name="lastName"
                  required
                  autoComplete="off"
                  placeholder="Martin"
                  className={FIELD_CLASS}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Numéro" htmlFor="player-jersey">
                <input
                  id="player-jersey"
                  name="jerseyNumber"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  required
                  placeholder="10"
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Pied fort" htmlFor="player-foot">
                <select
                  id="player-foot"
                  name="preferredFoot"
                  defaultValue="RIGHT"
                  className={FIELD_CLASS}
                >
                  <option value="RIGHT">Droit</option>
                  <option value="LEFT">Gauche</option>
                </select>
              </Field>
            </div>

            <Field label="Poste" htmlFor="player-position">
              <select
                id="player-position"
                name="position"
                required
                defaultValue=""
                className={FIELD_CLASS}
              >
                <option value="" disabled>
                  Choisir un poste
                </option>
                {POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date de naissance" htmlFor="player-birthdate">
              <input
                id="player-birthdate"
                name="dateOfBirth"
                type="date"
                required
                className={FIELD_CLASS}
              />
            </Field>

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-xs text-destructive"
              >
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-darker transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
              >
                {pending ? "Ajout…" : "Ajouter"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="h-11 cursor-pointer rounded-xl bg-fill px-4 text-sm font-medium text-foreground transition-colors hover:bg-fill-strong"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={openForm}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 active:scale-[0.99]"
        >
          <UserPlus className="size-4" aria-hidden />
          Ajouter un joueur
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
