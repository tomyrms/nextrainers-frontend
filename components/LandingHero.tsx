import { User } from "lucide-react";

import { GhostButton } from "./GhostButton";
import { GlowButton } from "./GlowButton";

const AVATAR_KEYS = ["avatar-1", "avatar-2", "avatar-3"];

/**
 * Full-bleed hero: pitch photo (ball on mobile, coach from `md` up), darkening
 * gradients, then the copy + calls to action anchored to the bottom.
 */
export function LandingHero() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col">
      <img
        src="/images/img-home-ball.webp"
        alt="Ballon de football sur terrain"
        className="absolute inset-0 h-full w-full object-cover object-center md:hidden"
      />
      <img
        src="/images/img-coach-pc.png"
        alt="Coach donnant des consignes à ses joueurs"
        className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
      />

      {/* Top scrim keeps the header readable */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-32"
        style={{
          background:
            "linear-gradient(rgba(11, 13, 14, 0.55) 0%, rgba(11, 13, 14, 0) 100%)",
        }}
      />
      {/* Bottom scrim blends the photo into the app canvas */}
      <div
        aria-hidden
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, var(--color-background) 0%, rgba(11, 13, 14, 0.92) 20%, rgba(11, 13, 14, 0.55) 45%, rgba(11, 13, 14, 0.15) 65%, rgba(11, 13, 14, 0) 100%)",
        }}
      />

      <section className="relative z-20 mt-auto w-full shrink-0 pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <div className="mx-auto w-full max-w-screen-xl px-6 text-left md:text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-sm md:mx-auto">
            <div className="flex -space-x-2">
              {AVATAR_KEYS.map((key) => (
                <span
                  key={key}
                  className="flex size-6 items-center justify-center rounded-full border border-background bg-primary shadow-[0_0_10px_rgba(125,226,206,0.65)]"
                >
                  <User
                    className="size-3 text-darker"
                    fill="currentColor"
                    strokeWidth={2}
                  />
                </span>
              ))}
            </div>
            <p className="text-xs font-medium whitespace-nowrap text-white/85">
              Utilisé par +21 000 coachs
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight uppercase md:text-6xl">
            Crée ta séance d&apos;entraînement
            <br />
            <span className="text-primary">en 60 secondes</span>
          </h1>

          <div className="my-5 h-0.5 w-9 rounded-full bg-primary/80 md:mx-auto" />

          <div className="flex flex-col items-center justify-center gap-2">
            <GlowButton className="w-full md:w-80">Commencer maintenant</GlowButton>
            <GhostButton className="w-full md:w-80">Se connecter</GhostButton>
          </div>
        </div>
      </section>
    </main>
  );
}
