"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthField } from "@/components/AuthField";

/**
 * Login form: posts through the `/api/session` proxy (login action), which
 * stores the backend token in an httpOnly cookie, then lands on the dashboard.
 */
export function ConnexionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Renseigne ton email et ton mot de passe.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim(), password }),
      });

      if (!response.ok) {
        setError(
          response.status === 401
            ? "Email ou mot de passe incorrect"
            : "Connexion impossible pour le moment. Réessaie dans un instant.",
        );
        setPending(false);
        return;
      }

      // Session cookie is set: re-render the dashboard as signed in.
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
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
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
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
