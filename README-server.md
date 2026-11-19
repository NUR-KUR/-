# ULTIMA — единая программа салонов

Dark iOS-inspired catalogue and a D1-backed multi-user account system. Existing project and access policy are retained.

## Runtime

Vinext / Cloudflare Worker, D1 binding `DB`, Drizzle schema-only migrations. Root route returns the catalogue HTML shell; static assets are in `public/`. Server identity comes exclusively from Sites authenticated visitor headers through the provided ChatGPT helper. Sign-in/out use the platform routes. No passwords or email are stored.

## Features

22 branch dossiers, service/district/search/favorite filters, official salon booking links and plans. One account across all salons with a member code, public nickname, private visit ledger, completed visit and distinct-salon counts, cloud favorites, plans, preferences, copy/calendar actions, one editable review per completed visit, and aggregate customer ratings. Old browser-local records can be imported explicitly. User data, visits and reviews can be deleted in the profile.

Visits are self-reported. The interface never labels them salon-confirmed. Planned visits are not bookings. Real CRM integration, salon audits and partner agreements are not connected. Customer ratings are independent from the Ultima audit/admission score. No fictitious reviews, bonuses, discounts, paid consumer subscriptions or confirmed availability are seeded. The free consumer / first-visit salon CPA model is preserved.

## Validation

- `npx tsc --noEmit`
- `node --check public/app.js`
- `node --import tsx tests/account.test.ts` — isolated real local D1, 36 API checks, including ownership isolation, ratings, duplicates, invalid/future dates, CSRF and deletion.
- Supported managed browser preview tested at desktop and 390px mobile. A disposable, excluded local HTML harness supplies synthetic local preview headers only; it is removed before builds. Completed visit → review → salon aggregate, favorites, plan and reload persistence were exercised. Preview test data is never bundled.

## Build

Use the Sites build helper. `.openai/hosting.json` declares the retained project ID and DB binding. Migrations under `drizzle/` are applied by Sites before Worker publication. The production entry point is `dist/server/index.js`.

## Mobile interface

Phone layout up to 760px: safe-area-aware bottom navigation, larger touch controls, a dedicated draft/apply filter sheet, readable forms with 16px inputs, compact catalogue cards and full-width profile/detail sheets. Sheets close on the browser Back action; filters are preserved on return. Visual viewport and keyboard insets constrain sheets when screen space shrinks. Tablet and desktop layouts retain the same catalogue and server features.

A Web App Manifest, Apple web-app metadata and 192/512px icons support adding a shortcut to the home screen and standalone display. No service worker caches account/API content; network access remains required.

Browser QA: 320, 390, 430px portrait, 740×390 landscape and 768px tablet widths. Confirmed no horizontal overflow in catalogue and sheets, district/category filtering and result counts, search clearing, profile/visit forms, native Back closing a salon sheet, and short-screen sheet height. Desktop/tablet layout was inspected. This is browser viewport QA, not a claim of physical-device testing. Disposable local auth harnesses are excluded and removed before publication.
