import { Suspense } from "react";

import { HeaderActions, SignedOutPills } from "@/components/HeaderActions";

/**
 * App header: page title on the left, session-aware auth actions on the right.
 * Fixed and transparent so content scrolls underneath it.
 */
export function AppHeader({ title }: { title: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 w-full max-w-[480px] items-center gap-2 px-4 py-1">
        <span className="truncate text-xl font-bold text-white">{title}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* The session cookie read is request-time data: the boundary keeps
              the static shell byte-identical to the signed-out header. */}
          <Suspense fallback={<SignedOutPills />}>
            <HeaderActions />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
