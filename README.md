# nextrainers-frontend

French mobile-first UI (Next.js 16 + Tailwind v4, Cache Components) for the
Nextrainers clone. It talks to [nextrainers-backend](https://github.com/tomyrms/nextrainers-backend).

- Production: https://nextrainers-frontend-tomy-b89a.vercel.app
- Env: `API_BASE_URL` → the backend.
- **Per-account data:** the backend keeps one store per account. Server reads
  add the signed-in user's token from the httpOnly `session` cookie
  (`lib/backend-auth.server.ts`, registered by the root layout); browser
  mutations go through the same-origin proxy `/api/proxy/api/...`, which adds
  the token. Signed-out visitors see the shared demo data.

## Run locally

```bash
npm install
npm run dev -- -p 4970      # backend expected on http://localhost:4900
npx tsc --noEmit
```

## Screens

| Route | What |
|---|---|
| `/fr` | landing |
| `/fr/connexion`, `/fr/inscription` | auth via the `/api/session` proxy (httpOnly cookie) |
| `/fr/accueil` | next match (CTA → analyses / saison), trainings (→ detail), « Informations » block: sign-up card when signed out, coach banner when signed in |
| `/fr/creer` | « + » flow: build a training, prepare a match, generate the season |
| `/fr/entrainements/[id]` | training detail + share / duplicate |
| `/share/[token]` | public shared training |
| `/fr/saison` | season plan, sessions, generation |
| `/fr/bibliotheque` | exercise library, filters, favorites |
| `/fr/equipe`, `/fr/equipe/[id]` | roster; player sheet with skills radar, rating steppers, coach notes |
| `/fr/analyses`, `/fr/analyses/[id]` | match analyses + tips |
| `/fr/notifications` | inbox (bell with unread badge in the signed-in header) |
| `/fr/profil` | profile + logout |

Pattern: async server components inside `<Suspense>` with static fallbacks
(partial prerendering), fail-soft fetch helpers in `lib/api-*.ts`.

## Verification

Each screen has a Playwright script (plus `verify-tenancy.py`: two accounts + anonymous, isolation through the UI) in `scripts/verify-*.py` (live API
assertions, 0 console errors, no overflow at 375/420 px, screenshots in
`docs/`). Run them with both dev servers up, e.g. `python scripts/verify-joueur.py`.
See `docs/README.md` for the per-screen details. CI builds on every push.
