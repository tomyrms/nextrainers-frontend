import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home directory above this project also holds a package-lock.json, so the
  // workspace root has to be pinned to keep Turbopack scoped to this app.
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The floating dev badge would show up in the captured screenshots.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Only two routes exist (`/fr` and `/fr/accueil`); the bare root just points at
  // the landing page.
  async redirects() {
    return [{ source: "/", destination: "/fr", permanent: false }];
  },
};

export default nextConfig;
