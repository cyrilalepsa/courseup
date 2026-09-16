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
npm run dev      # développement
npm run build    # build production (+ service worker)
npm run start    # sert dist/ (Railway : PORT injecté)
```

## Déploiement Railway

- **Build Command** : `npm run build`
- **Start Command** : `npx serve -s dist -l $PORT` (ou `npm run start`)
- Fichier `nixpacks.toml` à la racine pour Railpack/Nixpacks

Après merge, lance un **Redeploy** depuis Settings → Build & Deploy si besoin.

## Structure

- `src/types/ingestion.ts` — modèles d'ingestion
- `src/components/layout/Header.tsx` — en-tête PWA
- `src/features/ingestion/` — hub d'ingestion (upload, ponts, preview)
