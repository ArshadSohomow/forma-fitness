# FORMA — sculpt your habits

**Live demo: https://forma-fitness-d3e.pages.dev**

A calm, responsive fitness tracker: workouts, interval timer, exercise guides with animated demonstrations, nutrition tracking and weekly reviews. Consistency slowly reveals a marble sculpture.

> **Status: working demo.** Everything runs in the browser and data is saved to that browser's `localStorage`. There are no accounts, no server and no sync between devices yet. See *Demo vs production* below.

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev       # http://localhost:5173 with rebuild on save
npm run build     # production build → dist/
```

The build is a single esbuild step (`build.mjs`): React + TypeScript bundled to `dist/assets/app.js`, plus `public/` copied as-is.

## Deploying to Cloudflare Pages

**Git integration (recommended)**
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → choose this repository.
2. Framework preset: *None*. Build command: `npm run build`. Build output directory: `dist`.
3. Save and deploy. Every push to `main` redeploys.

**Direct upload with Wrangler**
```bash
npm run build
npx wrangler pages deploy dist --project-name forma
```

No environment variables are required for the demo. `.env.example` lists placeholders for the production phase only.

## Demo vs production

| | Local demo | Deployed demo (now) | Production (not built yet) |
|---|---|---|---|
| Where data lives | Browser `localStorage` | Browser `localStorage` | Cloudflare D1 database |
| Accounts | None | None | Sign-up, login, password reset |
| Sync across devices | No | No | Yes |
| Offline | Yes | Yes (service worker caches the app) | Yes, with sync and conflict handling |

Users can export/import their data as JSON from **Profile → Your data**.

## Architecture

- **React 19 + TypeScript**, bundled with **esbuild**. No framework or router dependency — hash routing (`#/workouts`) works on any static host without rewrite rules.
- **State**: one typed `AppState` (`src/types.ts`) in a React context (`src/store.tsx`), persisted on every change. Failed writes surface an error instead of pretending to save.
- **Design system**: CSS custom properties in `src/styles.css` — colour, type, spacing and radius tokens, with fully specified light and dark themes, reduced-motion and text-size settings.
- **Sculpture** (`src/components/Sculpture.tsx`): layered SVG with marble/grain filters. Six refinement stages, plus reversible weathering (dust, crack, chip), a repaired gold seam, and an environment (sunlight, grass, plants, fallen leaves, optional wrappers) driven by stored state.
- **Exercise demos** (`src/components/ExerciseDemo.tsx`): a small pose engine (joint angles + two-bone IK) animates neutral figures between keyframes, with equipment, movement-path arrows and primary/secondary muscle highlighting. Purpose-made, so there are no licensing issues.
- **Logic** (`src/logic/`): week calculations, personal records, outcome rules, milestones, recommendations — all pure functions.

### How weekly progression works
`decideOutcome` in `src/logic/calc.ts`:
- Measures stay separate (sessions, nutrition days, habits) — never blended into a score. The user chooses which ones count.
- All counted goals met → **refined** (one step of refinement; repairs any weathering).
- At least half the sessions, or a self-set reduced target → **held / restored**.
- Planned break, or the user's first week → **held**, never weathered.
- Otherwise → **weathered** by one level (max 3). Refinement is never removed.
- Each week can only be reviewed once (idempotent by week ID).
- Nutrition affects only the environment, and only from multi-day patterns (needs ≥3 tracked days). Wrappers are opt-in and only reflect habits the user names and tags themselves.

## Features

**Implemented**
- 8-step onboarding with skip options and an "explore with sample data" mode
- Dashboard: greeting, contextual messages, today's plan, sculpture preview, weekly overview, nutrition summary, quick actions, dismissible tips and progression suggestions
- Workout builder: create, customise built-in templates, reorder, supersets, delete; weekly schedule
- Active workout: per-set logging for weight/reps, bodyweight, assisted, timed holds and distance; rest timer; pause/resume; skip; add exercises mid-session; in-workout exercise guide; auto-save and resume after refresh
- Workout summary with personal bests and comparison with the previous session; history with log correction; quick log for training done outside the app
- Interval (HIIT) timer: presets, full customisation, audio cues with mute, low-impact swap, timestamp-based so it stays correct across tab switches
- Exercise library: 32 exercises, 9 filters, animated demonstrations with start/end frames, glossary, gym confidence mode
- Nutrition: daily targets (calories optional), meals with custom categories, search of a 65-item reference list, recent foods, manual entries, meal/recipe builder with servings, edit/undo
- Weekly review → sculpture change, environment change, milestones (9), next-week target adjustment
- Progress charts (frequency, adherence, duration, volume, strength, protein, body measurements) over 4 weeks to 1 year
- Profile: all settings, units (kg/lb, km/mi), theme, text size, reduced motion, export/import, delete all data
- PWA manifest and offline service worker

**Partly implemented**
- Food database: a small built-in reference list of typical values, clearly labelled as approximate. Not a full database.
- Reminders: the setting is stored but no notifications are sent (needs a backend).
- Programme completion milestone is approximated as completing the same workout 12 times.

**Deferred (Phase 2–3)**
- Accounts and server storage (Cloudflare D1 + auth), cross-device sync
- Full food database (Open Food Facts needs no key; others such as USDA FoodData Central need a free API key)
- 3D sculpture, more demonstrations, device integrations

## Known limitations
- No automated test suite or type-check script yet. The main journeys were tested by hand in Chromium at desktop and phone sizes.
- Fonts (Marcellus, Instrument Sans) load from Google Fonts; system fonts are used if they can't load.

## Disclaimer
FORMA offers general fitness and nutrition information, not medical, dietetic or coaching advice. The sculpture is a symbolic record of habits. It does not represent body composition or health.
