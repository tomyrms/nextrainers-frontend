import { Globe, X } from "lucide-react";

const CHIP =
  "flex cursor-pointer items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20";

/**
 * Landing top bar: white wordmark on the left, language chip + close on the right.
 * Sits on top of the hero photo, so it stays transparent.
 */
export function LandingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-files/png/logo-full-white.png"
        alt="Nextrainers"
        width={157}
        height={48}
        className="-mx-4 h-12 w-auto object-contain opacity-90"
      />

      <div className="flex items-center gap-2">
        <button type="button" className={CHIP}>
          <Globe className="size-4" strokeWidth={2} />
          Français
        </button>
        <button
          type="button"
          aria-label="Fermer"
          className={`${CHIP} p-2`}
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
