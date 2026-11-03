# RebuildOS — Technical Architecture (MVP)

_Companion to `docs/product-brief.md` (what and why) and `DESIGN.md` (how it looks). This document covers how it's built._

## Goals

1. A fast, reliable **installable web app** (PWA) that works offline.
2. **Data never lost**: on-device, durable, exportable.
3. **Product rules are tested code**, not scattered UI logic.
4. A clean path to the **App Store** later without a rewrite.

## Stack

| Area | Choice |
|---|---|
| Language | TypeScript (strict) |
| UI | React 19 |
| Build | Vite |
| PWA | vite-plugin-pwa (Workbox, auto-update) |
| Styling | Plain CSS Modules + CSS custom properties from `DESIGN.md` (`src/styles/tokens.css`) |
| Animation | Motion |
| Fonts | Sora, Roboto Flex, Fraunces via `@fontsource-variable` (bundled, offline) |
| Data | IndexedDB via Dexie + `dexie-react-hooks` (`useLiveQuery`) |
| Routing | React Router |
| Tests | Vitest (rules), Playwright (journeys, from step 6) |
| Hosting | Cloudflare Pages (static, HTTPS) |
| Native later | Capacitor wraps the same app for iOS/Android |

No backend in the MVP.

## Structure

```
src/
  core/        Pure TypeScript product rules. No React, no DOM, no database.
               day.ts (04:00 day start), focus.ts (timer maths), … + *.test.ts
  data/        Dexie database, queries and mutations; storage persistence.
  components/  Reusable UI parts from DESIGN.md (Stage, Dock, Star, …).
  screens/     One file per screen (Today, Plan, Progress, Focus, …).
  styles/      tokens.css (mirror of DESIGN.md) and global.css.
public/icons/  App icons and favicon.
docs/          Product brief, architecture, wireframes.
DESIGN.md      Design system — read before writing UI.
```

**Rule of thumb:** if it's a rule from the product brief (overnight rule, Rebuild trigger, active day, record), it lives in `src/core` with tests. Screens call it; they never re-implement it.

## Data model

All records have `id` (UUID), `createdAt`, `updatedAt` and optional `deletedAt` (soft delete), so a sync layer can be added later without migration. Types live in `src/core/types.ts`.

| Table | Key | Purpose |
|---|---|---|
| `actions` | id | title, state (`later`/`today`/`done`), isMain, missionId, estimate, todayDay, targetDay, completedAt, sortOrder |
| `missions` | id | title, doneWhen, targetDay, status (`active`/`parked`/`complete`), sortOrder |
| `focusSessions` | id | actionId, segments `[{start, end?}]`, targetMinutes, finishedAt |
| `days` | day | logical day: mode (`normal`/`small`), rebuild slots, energy, closedAt, rolledOverAt |
| `meta` | key | app state: last opened, session count, install prompt state |

Schema changes go through Dexie versioning (`db.version(n)`), never by editing an existing version.

## Key decisions

**Logical day.** A day starts at 04:00 local time (`core/day.ts`). Every "today" in the app uses `dayKey(new Date())`, never the raw calendar date.

**Focus timer.** Time is derived from stored segment timestamps (`core/focus.ts`), recomputed on render and on `visibilitychange`. Locking the phone, backgrounding or reloading can't corrupt it. The Screen Wake Lock API is requested during Focus where supported. Sessions over 3 hours ask for confirmation.

**Durability.** On start the app calls `navigator.storage.persist()`. Installing to the home screen (required after a session or two) exempts data from Safari's 7-day eviction. Settings will offer JSON export/import. Accounts and sync are deliberately postponed.

**Notifications.** None in the MVP (iOS web push needs install and is unreliable). Capacitor brings native notifications later.

**Offline.** The service worker precaches the app shell, Latin font subsets and icons. Navigation falls back to `index.html`.

## Commands

```
npm install        # once
npm run dev        # local dev server
npm test           # rule tests
npm run typecheck  # TypeScript
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Deploying to Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → choose this repository.
2. Framework preset: **None** (or Vite). Build command: `npm run build`. Output directory: `dist`.
3. Environment variable: `NODE_VERSION` = `22`.
4. Production branch: `main` once merged; other branches get preview URLs automatically.

No `404.html` is shipped, so Pages serves `index.html` for every route (single-page app behaviour).

## Build plan

| Step | Scope | Status |
|---|---|---|
| 0 | Foundation: tooling, tokens, fonts, PWA shell, icons, dock with three tabs, core day/focus maths + tests, database schema | Done |
| 1 | Today and Actions: first run, add, complete, Main Action, Later, overnight rule | Done |
| 2 | Focus: timer, Done / More to do, Today → Focus transition, wake lock | Done |
| 3 | Plan and Missions: create with first step, next Action, move to Today | Done |
| 4 | Rebuild and Welcome back: small day, swap, return detection | Done |
| 5 | Close the day and Progress: evening ritual, week stars, record | Done |
| 6 | Polish: install flow, export/import, motion, Playwright journeys, release | Next |

## Known notes

- `npm audit` reports moderate advisories in build-time dependencies of Workbox (via vite-plugin-pwa). None of this code ships to users. Revisit when vite-plugin-pwa updates; don't `--force` downgrade.
