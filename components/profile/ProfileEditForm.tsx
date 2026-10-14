"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, TriangleAlert, X } from "lucide-react";

import {
  LEVEL_OPTIONS,
  updateProfile,
  type Profile,
  type ProfilePatch,
} from "@/lib/api-profil";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60";

type Message = { tone: "success" | "error" | "info"; text: string };

/**
 * "Modifier" trigger + profile edit form (profile contract §8). Each field is
 * compared with the current server truth and only the changed ones go in the
 * PUT body; success shows an inline confirmation and refreshes the route so
 * the card above streams back the new values.
 */
export function ProfileEditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  function openForm() {
    setMessage(null);
    setOpen(true);
  }

  function closeForm() {
    setMessage(null);
    setOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "").trim();
    const teamName = String(data.get("teamName") ?? "").trim();
    const dateOfBirth = String(data.get("dateOfBirth") ?? "").trim() || null;
    const experienceRaw = String(data.get("experience") ?? "").trim();
    const level = String(data.get("level") ?? "") || null;

    if (!fullName) {
      setMessage({ tone: "error", text: "Le nom complet est requis." });
      return;
    }

    let experience: number | null = null;
    if (experienceRaw) {
      const parsed = Number(experienceRaw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setMessage({
          tone: "error",
          text: "L'expérience doit être un nombre d'années valide.",
        });
        return;
      }
      experience = parsed;
    }

    const patch: ProfilePatch = {};
    if (fullName !== (profile.fullName ?? "")) patch.fullName = fullName;
    if (teamName !== (profile.teamName ?? "")) patch.teamName = teamName;
    if (dateOfBirth !== profile.dateOfBirth) patch.dateOfBirth = dateOfBirth;
    if (experience !== profile.experience) patch.experience = experience;
    if (level !== profile.level) patch.level = level;

    if (Object.keys(patch).length === 0) {
      setMessage({ tone: "info", text: "Aucune modification à enregistrer." });
      return;
    }

    setPending(true);
    setMessage(null);
    const result = await updateProfile(patch);
    setPending(false);

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }

    setMessage({ tone: "success", text: "Profil mis à jour" });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "success"
              ? "flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary"
              : message.tone === "error"
                ? "flex items-start gap-1.5 text-xs text-destructive"
                : "text-xs text-muted-foreground"
          }
        >
          {message.tone === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          ) : message.tone === "error" ? (
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          ) : null}
          {message.text}
        </p>
      ) : null}

      {open ? (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-white/10 bg-card p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Modifier le profil
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
            <Field label="Nom complet" htmlFor="profile-full-name">
              <input
                id="profile-full-name"
                name="fullName"
                required
                autoComplete="name"
                defaultValue={profile.fullName ?? ""}
                placeholder="Coach Demo"
                className={FIELD_CLASS}
              />
            </Field>

            <Field label="Équipe" htmlFor="profile-team-name">
              <input
                id="profile-team-name"
                name="teamName"
                autoComplete="organization"
                defaultValue={profile.teamName ?? ""}
                placeholder="AS Démo"
                className={FIELD_CLASS}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date de naissance" htmlFor="profile-birthdate">
                <input
                  id="profile-birthdate"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={profile.dateOfBirth ?? ""}
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Expérience (années)" htmlFor="profile-experience">
                <input
                  id="profile-experience"
                  name="experience"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  defaultValue={profile.experience ?? ""}
                  placeholder="5"
                  className={FIELD_CLASS}
                />
              </Field>
            </div>

            <Field label="Niveau" htmlFor="profile-level">
              <select
                id="profile-level"
                name="level"
                defaultValue={profile.level ?? ""}
                className={FIELD_CLASS}
              >
                <option value="">Non renseigné</option>
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-darker transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
              >
                {pending ? "Enregistrement…" : "Enregistrer"}
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
          <Pencil className="size-4" aria-hidden />
          Modifier
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
