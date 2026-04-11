# Ycaro

Ycaro is a local-first React application for managing finances, reading, calendar planning, journal entries, and import workflows in a single browser-based workspace.

## Stack

- Vite
- React 18
- TypeScript
- React Router
- Tailwind CSS + shadcn/ui
- IndexedDB and local browser APIs for persistence

## Routes

- `/`
- `/calendar`
- `/finance/:tab?`
- `/reading`
- `/journal`
- `/extraction`

The finance page currently supports these tab routes:

- `/finance/dashboard`
- `/finance/revenus`
- `/finance/depenses`
- `/finance/clients`
- `/finance/donnees`

## Local Development

```sh
npm install
npm run dev
```

## Quality Checks

```sh
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

## Persistence Model

- Primary app data is stored locally in IndexedDB.
- Some domains still support one-time migration from legacy `localStorage`.
- Backup and restore actions are handled entirely in the browser.

## Repository Notes

- `imports/` and `public/imports/` are treated as local working data and should not be committed.
- Theme switching is applied live without reloading the application.
- Cross-domain calendar reference sync is started at app bootstrap so it does not depend on the calendar page being open.
