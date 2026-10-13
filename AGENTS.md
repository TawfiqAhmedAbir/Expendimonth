# Expendimonth

## What this is

Mobile-first PWA for a non-technical user (large type, plain language) to track monthly **money in**, **money out**, and **what's left** across one or more properties (house, land, vehicle, business). Charts, history timeline, paper reconciliation, printable report, optional PIN. All data local.

## Goals

- Correct monthly totals and easy history browsing
- Visual dashboard (ring + hero numbers + bar charts)
- Local-only data with JSON backup export

## How I want the agent to work

- Keep UX accessible: 18px+ body, 48px touch targets, green only for "in", coral for "out", teal accent
- Use the in-repo design kit (`src/design-kit/`): tokens → primitives.css → `Primitives.tsx`; no ad-hoc colours
- Smoke-test in a 390px viewport before committing UI changes
- Do not commit unless asked

## Current focus

- Weakness fixes and five features are in the working tree: quieter month screen, cash match, start-month sheet, expected-by-day, property transfers, 30-day backup with Share
- Not deployed yet
- Next candidates: French strings (`src/i18n/fr.json`), real-device PWA install test

## Decisions already made

- English UI; i18n keys ready (`src/i18n/`), French stub empty
- Onboarding: user name → property name → type (house/land/vehicle/business/other+custom) → currency (+ optional opening balance, colour)
- **Multi-property**: IndexedDB v3 with `properties` store; months keyed `${propertyId}:${yearMonth}`; `PropertySwitcher` in the top bar; v1/v2 data migrates into `prop-legacy`
- Settings in localStorage `expendimonth-settings`: `userName, locale, activePropertyId, theme, pinHash/pinSalt, lastExportAt, coachDismissed`
- Home = property command centre (StatRing net, in/out, insight vs last month, tiles); month ledger at `/month/:yearMonth`
- User-created categories per property; no presets. Chips remember last amount; long-press to rename / pick icon
- Amount entry via keypad sheet with `+` chaining; tap a line to edit, Delete lives inside the edit sheet (with Undo toast)
- Month status: `empty → open → checked → done`; `CloseMonthFlow` = review → paper-says → confirm (padlock)
- Month photo attach and compare were removed. Paper totals stay in close-month and the report. Photos already saved stay in IndexedDB and are not shown.
- Months timeline with filters (all/done/mismatch/empty), search, sparklines; `/year/:year` summary
- Print-based report at `/report/:scope/:id` (always prints light)
- PIN: SHA-256(salt:pin), session unlock, auto-lock 60s hidden
- Dark mode via `[data-theme='dark']`; font Manrope; icons lucide-react
- Sheets portal to `document.body` (topbar `backdrop-filter` would otherwise trap `position: fixed`)
- Currency shown with narrow symbol (৳, €, £…), tabular numerals
- PIN hides the app on this phone only. It does not encrypt IndexedDB or the backup file
- `openingAsOf` on new properties: months before that date do not change “money you have now”. Older properties stay `null` (every month counts)
- Line types `adjust` and `transfer` change cash only. They stay out of money in, money out, and what’s left
- Backup export is version 5. Versions 3 and 4 still restore. Photo blobs are dropped
- `checked` months are saved as `open`. Closed stays closed

## Tools & connections

- Vite 8, React 19, React Router 7, Recharts 3, idb, vite-plugin-pwa, Vitest, lucide-react, @fontsource-variable/manrope
- GitHub `TawfiqAhmedAbir/Expendimonth` (main) → Cloudflare Pages project `expendimonth`
- Deploy: Cloudflare Pages builds on push to `main` (`npm run build`, output `dist`). The GitHub Actions workflow was removed. Manual fallback: `npm run build && npx wrangler pages deploy dist --project-name=expendimonth --branch=main --commit-dirty=true`
