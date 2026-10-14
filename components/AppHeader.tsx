/**
 * Signed-out app header: page title on the left, auth actions on the right.
 * Fixed and transparent so content scrolls underneath it.
 */
export function AppHeader({ title }: { title: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 w-full max-w-[480px] items-center gap-2 px-4 py-1">
        <span className="truncate text-xl font-bold text-white">{title}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-fill px-4 text-sm font-medium text-foreground transition-colors hover:bg-fill-strong active:scale-[0.97]"
          >
            Connexion
          </button>
          <button
            type="button"
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-medium text-darker transition-colors hover:bg-white/85 active:scale-[0.97]"
          >
            Inscription
          </button>
        </div>
      </div>
    </header>
  );
}
