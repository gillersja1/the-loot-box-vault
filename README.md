# The Loot Box Vault

[![CI](https://github.com/gillersja1/the-loot-box-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/gillersja1/the-loot-box-vault/actions/workflows/ci.yml)

An unofficial **Dungeon Crawler Carl** fan collectors site. Track merch and cards in one place, mark what you own, want and dream about (grails), open a loot box every time you add something to your hoard, and share your vault with a link.

**Live:** https://the-loot-box-vault.web.app

> Fan project. Not affiliated with Dungeon Crawler Carl, its author or publishers. The catalog holds names and details only, with no copyrighted images.

## Features (v1)

- **Catalog** with Merch and Cards tabs, search, rarity filter and Owned / Missing / Want / Grail filters. Ships with books 1–8 and the full DCC Series One trading card checklist (Classic, Emerald, Gold Foil, Rainbow Foil, Sketch & Signed), with rarity tiers based on the official pull ratios
- **Synced vault:** sign in with Google, GitHub or an email link; your marks follow you across devices
- **Loot box reveal:** marking an item Owned opens a box in the item's rarity tier (Bronze → Celestial), with commentary from the System
- **Shareable vault:** make your vault public and send the link; others get a read-only view
- **Community submissions:** signed-in users submit missing items; they stay pending until an admin approves them
- **Admin approval queue:** admins review submissions at `/admin`, fix any details, then approve (publish) or reject (delete)
- HUD-style dark theme, responsive down to phone width, respects reduced motion

## Stack

React 18 + TypeScript + Vite · Firebase Auth, Cloud Firestore and Hosting · Vitest · Playwright · GitHub Actions

## Testing strategy

| Layer | Tool | What it covers |
| --- | --- | --- |
| Unit | Vitest | Filtering, sorting, vault stats, state toggling, rarity helpers |
| Security rules | `@firebase/rules-unit-testing` on the Firestore emulator | Who can read and write items, vaults and entries; field validation; spoofing and privilege escalation attempts |
| End-to-end | Playwright (desktop Chrome + Pixel 7) on Auth + Firestore emulators | Real email-link sign-in (codes pulled from the Auth emulator), marking loot, the reveal dialog, public/private vault sharing seen from a second signed-out browser, submissions, and the admin queue (admin granted mid-test through the emulator) |

CI runs every layer on each push and PR, uploads the Playwright report and traces, and sends results to Grafana via [test-results-otel](https://github.com/gillersja1/test-results-otel).

The security rules are the real backend here, so they get their own suite instead of being trusted.

## Run it locally

Requires Node 22+ and Java 21+ (for the Firebase emulators).

```bash
npm install
npm run test:unit      # unit tests
npm run test:rules     # rules tests (starts the Firestore emulator)
npm run test:e2e       # e2e (starts emulators, seeds data, runs Playwright)
```

Click around against the emulators:

```bash
npm run emulators      # terminal 1
npm run seed:emu       # terminal 2, once
npm run dev:emu        # terminal 2 → http://localhost:5173
```

In emulator mode, email-link sign-ins are not sent; read the link from the Auth emulator's `oobCodes` endpoint.

## Data model

```
items/{itemId}                 name, category (merch|card), type, series, number, rarity, notes,
                               status (approved|pending), submittedBy, createdAt
vaults/{uid}                   displayName, isPublic, updatedAt
vaults/{uid}/entries/{itemId}  state (owned|want|grail), updatedAt
admins/{uid}                   presence = admin (managed in the Firebase console)
```

## Roadmap

Drops calendar · achievements · CSV/JSON export and import · signed/slabbed/remarqued status · Discord sign-in
