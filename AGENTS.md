# Expendimonth

## What this is

Mobile-first PWA for one house: monthly **money in**, **money out**, and **what's left**, with charts, history, paper reconciliation, and photo attachment. Built for a non-technical user (large type, plain language).

## Goals

- Correct monthly totals and easy history browsing
- Visual dashboard (hero numbers + bar charts)
- Local-only data with JSON backup export

## How I want the agent to work

- Keep UX accessible: 18px+ body, 48px touch targets, green in / coral out
- Minimize scope; one property until explicitly expanded
- Do not commit unless asked

## Current focus

- v1 scaffold: setup wizard, home/month views, months list with 12-month trend, more/export

## Decisions already made

- English UI; i18n keys ready (`src/i18n/`), French stub empty
- Onboarding: user name → property name → type (house/land/vehicle/business/other+custom) → currency
- Home is property dashboard; month ledger at `/month/:yearMonth`
- User-created categories (IndexedDB `categories`); no preset rent/electricity chips
- Currency chosen on first launch (not hardcoded)
- IndexedDB for months/lines/photos/categories; settings in localStorage
- Running balance supported in domain calc; UI emphasizes monthly net
- Colour theme: warm off-white canvas, sage green in, coral out, teal accent

## Tools & connections

- Vite, React, React Router, Recharts, vite-plugin-pwa, Vitest
