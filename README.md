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
npm run start    # preview (Railway / hébergement statique après build)
```

## Structure

- `src/types/ingestion.ts` — modèles d'ingestion
- `src/components/layout/Header.tsx` — en-tête PWA
- `src/features/ingestion/` — hub d'ingestion (upload, ponts, preview)
