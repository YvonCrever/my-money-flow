# Ycaro — Contexte projet pour Claude Code

## Projet
App web personnelle React 18 + TypeScript + Vite. Local-first, pas de backend.
Usage : pilotage quotidien (temps, tâches, habitudes, finances, lecture, journal).

## Stack
- UI : Tailwind CSS + shadcn/ui (Radix UI) + lucide-react
- Routing : react-router-dom, lazy loading, manualChunks dans vite.config.ts
- Formulaires : react-hook-form + zod
- Graphiques : recharts
- Layout : react-grid-layout
- Persistance : IndexedDB (appStorageDb, indexedDatasetStore), migration depuis localStorage
- Sauvegarde : système custom dans src/lib/appBackup.ts + backupScheduler.ts
- Tests : Vitest + @testing-library/react + jsdom
- Package manager : npm

## Architecture
- Découpage par feature : src/features/[feature]/{routes, page, components, store}
- Référence d'implémentation : src/features/ARCHITECTURE.md (toujours lire avant de créer une feature)
- Shell global : App.tsx + AppLayout.tsx
- Options contextuelles par page : hook useAppPageChrome → AppChromeProvider.tsx
- Actions globales : AppOptionsMenu.tsx
- Hooks legacy (à ne pas reproduire) : src/hooks/ → migrer vers src/features/[feature]/store/

## Modules actifs
Accueil (refonte), Calendrier, Finances, Lecture, Journal, Tasks (en cours), Habit Tracker (en cours), Systems (en cours).
Module supprimé : Extraction (routes retirées, données conservées en IndexedDB).

## Règles métier clés
- Tâche ≠ événement calendaire
- Habitude ≠ tâche récurrente
- Système ≠ liste de tâches
- Seule relation cross-domain autorisée : Finance ↔ Calendrier via calendarMeta + calendarExternalSyncRuntime.ts
- Chaque store expose isLoaded + loadError

## Conventions
- Code simple, lisible, pédagogique
- Noms explicites, commentaires sur l'intention
- MVP d'abord, abstractions seulement si gain réel
- Séparation stricte : métier / UI / data
- Duplication temporaire OK si elle évite une abstraction prématurée

## Instructions pour Claude
- Lire src/features/ARCHITECTURE.md avant toute nouvelle feature
- Modifier uniquement les fichiers explicitement demandés
- Ne pas importer de nouvelles dépendances sans le signaler
- Réponses concises — code only sauf si explication demandée
- Signaler les impacts cross-feature avant de coder
