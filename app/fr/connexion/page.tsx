import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/AuthShell";
import { ConnexionForm } from "@/components/ConnexionForm";

export const metadata: Metadata = {
  title: "Connexion - Nextrainers",
  description: "Connecte-toi à ton compte coach Nextrainers.",
};

export default function ConnexionPage() {
  return (
    <AuthShell
      title="Connexion"
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link
            href="/fr/inscription"
            className="font-semibold text-primary hover:underline"
          >
            Créer un compte
          </Link>
        </>
      }
    >
      <ConnexionForm />
    </AuthShell>
  );
}
