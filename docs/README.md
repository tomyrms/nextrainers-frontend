# nextrainers-frontend

Clone front-end (Next.js App Router + Tailwind v4) des deux premiers écrans de
l'app Nextrainers, reconstruit à partir des captures et du snapshot statique de
`rea/` + `web/dump/`. Code original : la mise en page, les couleurs et les
espacements sont reproduits à partir des visuels de référence, pas de leur code.

## Lancer

```bash
npm run dev -- -p 4970
```

- Landing : <http://localhost:4970/fr>
- Accueil (shell connecté/déconnecté) : <http://localhost:4970/fr/accueil>
- `/` redirige vers `/fr` (règle `redirects` dans `next.config.ts`, aucune route
  supplémentaire déclarée).

## Vérification visuelle

```bash
python scripts/capture.py
```

Le script Playwright ouvre les deux routes (420×900 et 1280×850), attend le
réseau au repos, relève les erreurs console et enregistre :

| fichier | contenu |
| --- | --- |
| `docs/landing-mobile.png` | `/fr` en 420×900 |
| `docs/landing-desktop.png` | `/fr` en 1280×850 |
| `docs/accueil.png` | `/fr/accueil` en 420×900 |

Il vérifie en plus l'absence de débordement horizontal (360/420/480/768/1280/1440 px).

## Créer, détail d'entraînement et partage

| route | contenu |
| --- | --- |
| `/fr/creer` | flux « + » : créer un entraînement (nom, thème, date, exercices de la bibliothèque filtrés par type, durée calculée) · préparer un match (→ `/fr/analyses`) · générer ma saison (→ `/fr/saison`) |
| `/fr/entrainements/[id]` | détail : thème, date longue, durée, programme ordonné (schémas rendus en `<img>`), « Partager » (lien `/share/<token>` copié) et « Dupliquer » |
| `/share/[token]` | page publique en lecture seule (sans navigation), « Partagée par », CTA inscription ; lien invalide → état dédié |

Les lignes « Mes entraînements » de l'accueil ouvrent le détail.

```bash
python scripts/verify-creer.py   # chooser + création UI (3 exercices) → détail vs GET /api/trainings/:id
python scripts/verify-share.py   # partage → page publique (contexte vierge) vs API, duplication, lien invalide
```

Les deux scripts vérifient 0 erreur console et aucun débordement à 375/420 px,
suppriment leurs séances de test, et enregistrent `docs/creer.png`,
`docs/entrainement.png` et `docs/share.png`.

## Assets

`public/fonts` (Poppins Regular/Bold, self-hosted), `public/images` et
`public/logo-files` sont les assets fournis avec la référence.

## Tokens

Dans `app/globals.css` (`@theme`) : `--color-primary` #7DE2CE,
`--color-background` #0B0D0E, `--color-card`/`--color-background-lighter` #232A2F,
`--color-inverse`/`--color-destructive` #FF4267, `--color-secondary` #B57DE2,
`--color-accent` #847DE2, `--color-tertiary` #00C8F5, bordures
`rgba(255,255,255,.12)`, texte secondaire `rgba(255,255,255,.5)`,
`--radius-card` 20px. Le fond #0B0D0E est la valeur mesurée sur les captures de
référence.
