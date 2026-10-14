"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthField } from "@/components/AuthField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Posts one auth action through the `/api/session` proxy. */
async function postSession(body: Record<string, string>): Promise<Response> {
  return fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Sign-up form: client-side checks, register through the proxy, then auto-login
 * so the account lands on the dashboard already signed in.
 */
export function InscriptionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(trimmedEmail: string): string | null {
    if (!EMAIL_RE.test(trimmedEmail)) return "Entre une adresse email valide.";
    if (password.length < 8)
      return "Le mot de passe doit contenir au moins 8 caractères.";
    if (password !== confirm)
      return "Les mots de passe ne correspondent pas.";
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    const trimmedEmail = email.trim();
    const invalid = validate(trimmedEmail);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    try {
      const registration = await postSession({
        action: "register",
        email: trimmedEmail,
        password,
      });
      if (!registration.ok) {
        setError(
          registration.status === 409
            ? "Un compte existe déjà avec cet email."
            : registration.status === 400
              ? "Email invalide ou mot de passe trop court (8 caractères minimum)."
              : "Inscription impossible pour le moment. Réessaie dans un instant.",
        );
        setPending(false);
        return;
      }

      // Auto-login right after the successful registration.
      const login = await postSession({
        action: "login",
        email: trimmedEmail,
        password,
      });
      if (!login.ok) {
        setError(
          "Compte créé, mais la connexion a échoué. Connecte-toi manuellement.",
        );
        setPending(false);
        return;
      }

      router.push("/fr/accueil");
      router.refresh();
    } catch {
      setError("Service indisponible. Réessaie dans un instant.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="coach@club.fr"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <AuthField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        placeholder="8 caractères minimum"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <AuthField
        id="confirm"
        label="Confirme ton mot de passe"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="glow-primary inline-flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-xl text-base font-semibold text-primary-foreground disabled:cursor-default disabled:opacity-70"
      >
        {pending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
