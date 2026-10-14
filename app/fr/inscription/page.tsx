import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/AuthShell";
import { InscriptionForm } from "@/components/InscriptionForm";

export const metadata: Metadata = {
  title: "Inscription - Nextrainers",
  description: "Crée ton compte coach Nextrainers en quelques secondes.",
};

export default function InscriptionPage() {
  return (
    <AuthShell
      title="Inscription"
      footer={
        <>
          Déjà un compte ?{" "}
          <Link
            href="/fr/connexion"
            className="font-semibold text-primary hover:underline"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <InscriptionForm />
    </AuthShell>
  );
}
