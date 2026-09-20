# CourseUp

PWA **CourseUp** (NeriaCorp) — Sprint 1, Étape 1 : ingestion multi-format.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion + Lucide React
- vite-plugin-pwa

## Scripts

```bash
npm install
npm run dev      # développement PWA (proxy /api → N2)
npm run dev:api  # passerelle Single Ingress N2 (Express)
npm run build    # build PWA + serveur N2 (server-dist/)
npm run start    # API N2 + dist/ (Railway : PORT injecté)
```

## Déploiement Railway (Railpack)

Railway utilise **Railpack** (plus Nixpacks). Config : `railpack.json` à la racine.

- **Build Command** (auto ou explicite) : `npm run build`
- **Start Command** : `npm run start` (équiv. `serve -s dist -l $PORT`)
- Node **22** recommandé (défini dans `railpack.json`)

Dans **Settings → Build & Deploy**, puis **Redeploy** après merge.

## Structure

- `src/types/ingestion.ts` — modèles d'ingestion
- `src/components/layout/Header.tsx` — en-tête PWA
- `src/features/ingestion/` — hub d'ingestion (upload, ponts, preview)
