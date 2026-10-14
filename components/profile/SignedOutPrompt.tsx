import Link from "next/link";
import { User } from "lucide-react";

/**
 * Signed-out state of /fr/profil: a centered card prompting for a sign-in,
 * with the teal link to the connexion page. Static — no request-time data.
 */
export function SignedOutPrompt() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full rounded-2xl border border-white/10 bg-card p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15">
          <User className="size-7 text-primary" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          Connecte-toi pour voir ton profil
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ton équipe, ton niveau et tes informations de coach t&apos;attendent.
        </p>
        <Link
          href="/fr/connexion"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-darker transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
