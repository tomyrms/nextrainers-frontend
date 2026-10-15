"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { generateTips } from "@/lib/api-analyses";

/** "Générer les conseils": POST generate-tips, then refresh the detail. */
export function GenerateTipsButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const ok = await generateTips(analysisId);
    setPending(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-darker transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      >
        <Sparkles className="size-4" aria-hidden />
        {pending ? "Génération…" : "Générer les conseils"}
      </button>
      {failed ? (
        <p role="alert" className="text-center text-xs text-destructive">
          La génération a échoué. Réessaie dans un instant.
        </p>
      ) : null}
    </div>
  );
}
