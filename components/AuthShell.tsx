import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Chrome shared by the auth screens (`/fr/connexion`, `/fr/inscription`):
 * white wordmark on top, discreet back link, dark card centered vertically.
 * Deliberately no AppHeader — these are standalone screens.
 */
export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[480px] items-center gap-2 px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
        <Link
          href="/fr"
          aria-label="Nextrainers — retour à l’accueil"
          className="shrink-0 transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-files/png/logo-full-white.png"
            alt="Nextrainers"
            width={157}
            height={48}
            className="h-9 w-auto object-contain opacity-90"
          />
        </Link>

        <Link
          href="/fr/accueil"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Retour
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 items-center px-5 py-10">
        <div className="w-full">
          <div className="rounded-2xl border border-white/10 bg-card p-6">
            <h1 className="text-center text-2xl font-bold tracking-widest uppercase">
              {title}
            </h1>
            {children}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        </div>
      </main>
    </div>
  );
}
