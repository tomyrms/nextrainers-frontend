"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/**
 * Discreet sign-out: POSTs the logout action to the `/api/session` proxy
 * (clears the httpOnly cookie) and lands back on the landing page. Errors
 * stay inline in French.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      setError("Déconnexion impossible pour le moment. Réessaie dans un instant.");
      setPending(false);
      return;
    }

    router.push("/fr");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-fill text-sm font-medium text-muted-foreground transition-colors hover:bg-fill-strong hover:text-foreground disabled:cursor-default disabled:opacity-60"
      >
        <LogOut className="size-4" aria-hidden />
        {pending ? "Déconnexion…" : "Se déconnecter"}
      </button>

      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
