import type { Metadata, Viewport } from "next";
import "./globals.css";
// Registers the server-side token reader for backend calls (per-account data).
import "@/lib/backend-auth.server";

export const metadata: Metadata = {
  title: "Nextrainers - L’app n°1 des coachs de foot",
  description: "Crée ton entraînement de foot en quelques secondes.",
  icons: {
    icon: "/logo-files/favicons/browser.png",
    apple: "/logo-files/favicons/iPhone.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0e",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
