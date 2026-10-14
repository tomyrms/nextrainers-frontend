import type { Metadata } from "next";

import { LandingHeader } from "@/components/LandingHeader";
import { LandingHero } from "@/components/LandingHero";

export const metadata: Metadata = {
  title: "Nextrainers - L’app n°1 des coachs de foot",
  description: "Crée ton entraînement de foot en quelques secondes.",
};

export default function LandingPage() {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <LandingHeader />
      <LandingHero />
    </div>
  );
}
