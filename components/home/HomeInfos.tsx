import Link from "next/link";
import { UserPlus } from "lucide-react";

import { getSessionUser } from "@/lib/api-auth";
import { CoachDnaBanner } from "./CoachDnaBanner";

function Heading() {
  return <h2 className="mb-3 text-xl font-semibold tracking-tight">Informations</h2>;
}

/**
 * Signed-out "Informations" block (original accueil chunk): a sign-up card.
 * Doubles as the Suspense fallback, so the static shell keeps it.
 */
export function SignedOutInfos() {
  return (
    <div data-testid="home-signup-card">
      <Heading />
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/20 p-3">
            <UserPlus className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Rejoignez Nextrainers</p>
            <p className="text-sm text-muted-foreground">
              Créez votre compte pour sauvegarder vos séances
            </p>
          </div>
        </div>
        <Link
          href="/fr/inscription"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-darker transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          S&apos;inscrire
        </Link>
      </div>
    </div>
  );
}

/**
 * Session-aware "Informations" block: signed-out users get the sign-up card;
 * signed-in users never see it and get the dismissible coach banner instead
 * (the original shows its Coach DNA banner there).
 */
export async function HomeInfos() {
  const user = await getSessionUser();
  if (!user) return <SignedOutInfos />;

  return (
    <div data-testid="home-signed-in-infos">
      <Heading />
      <CoachDnaBanner />
    </div>
  );
}
