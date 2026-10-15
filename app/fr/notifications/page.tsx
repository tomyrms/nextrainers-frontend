import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import {
  NotificationsInbox,
  NotificationsInboxLive,
} from "@/components/notifications/NotificationsInbox";

export const metadata: Metadata = {
  title: "Notifications - Nextrainers",
  description: "Tes notifications : séances prêtes, rappels et nouveautés.",
};

export default function NotificationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Notifications" />

      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Suspense fallback={<NotificationsInbox inbox={null} />}>
          <NotificationsInboxLive />
        </Suspense>
      </main>

      <BottomNav active="" />
    </div>
  );
}
