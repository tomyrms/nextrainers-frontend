"use client";

import { Check, Copy, LoaderCircle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { duplicateTraining, shareTraining } from "@/lib/api-trainings";

type Busy = "share" | "duplicate" | null;

/** Public URL of a share token on this frontend (not the backend's link). */
function shareUrlFor(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

/**
 * Detail-page actions. "Partager" creates a share token and copies (or hands
 * to the native share sheet) the link to this frontend's /share/[token] page;
 * "Dupliquer" goes through the same token, then opens the copy.
 */
export function TrainingActions({ trainingId, name }: { trainingId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    if (busy) return;
    setBusy("share");
    setError(null);
    const token = await shareTraining(trainingId);
    setBusy(null);
    if (!token) {
      setError("Le partage a échoué. Réessaie dans un instant.");
      return;
    }
    const url = shareUrlFor(token);
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false); // the link stays visible for a manual copy
    }
  }

  async function duplicate() {
    if (busy) return;
    setBusy("duplicate");
    setError(null);
    const token = await shareTraining(trainingId);
    const copyId = token ? await duplicateTraining(token) : null;
    setBusy(null);
    if (!copyId) {
      setError("La duplication a échoué. Réessaie dans un instant.");
      return;
    }
    router.push(`/fr/entrainements/${encodeURIComponent(copyId)}`);
  }

  const buttonClass =
    "flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-semibold active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="share-training"
          onClick={share}
          disabled={busy !== null}
          aria-label={`Partager ${name}`}
          className={`glow-primary border border-white/20 text-primary-foreground ${buttonClass}`}
        >
          {busy === "share" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Share2 className="size-4" />
          )}
          Partager
        </button>
        <button
          type="button"
          data-testid="duplicate-training"
          onClick={duplicate}
          disabled={busy !== null}
          className={`border border-white/15 bg-fill text-foreground hover:bg-fill-strong ${buttonClass}`}
        >
          {busy === "duplicate" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Copy className="size-4" />
          )}
          Dupliquer
        </button>
      </div>

      {link ? (
        <div role="status" className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Check className="size-3.5" />
            {copied ? "Lien copié" : "Lien de partage prêt"}
          </p>
          <a
            data-testid="share-link"
            href={link}
            className="mt-1 block truncate text-xs text-muted-foreground underline"
          >
            {link}
          </a>
        </div>
      ) : null}

      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
    </div>
  );
}
