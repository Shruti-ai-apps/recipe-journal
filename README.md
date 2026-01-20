# Recipe Journal

Import recipes from a URL, scale ingredients with friendly rounding/unit conversion, and save favorites (guest localStorage or Supabase + offline sync).

## Features

- Recipe scraping via Schema.org JSON-LD + DOM fallback
- Deterministic scaling (0.5x/1x/2x/3x/custom) + unit conversion (US/Metric)
- Optional AI “smart scaling” metadata/tips (Gemini) with safe deterministic quantities
- Favorites:
  - Guests: localStorage
  - Logged-in: Supabase + IndexedDB offline cache + background sync
- PWA support (install prompt + offline banner)

## Tech Stack

- Next.js 13 (App Router) + React 18 + TypeScript
- Supabase Auth + Postgres (for logged-in favorites)
- Dexie (IndexedDB) for offline storage and sync queue
- Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
npm install
```

### Run (dev)

```bash
npm run dev
```

### Test / Lint / Build

```bash
npm test
npm run lint
npm run build
```

## Environment Variables

Create `.env.local` at the repo root:

```bash
# Supabase (optional, enables login + cloud favorites)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Gemini (optional, enables /api/recipes/scale-smart)
GEMINI_API_KEY=...

# Production safety: allowlist remote images for next/image
# Example: "images.unsplash.com,*.allrecipes.com"
IMAGE_REMOTE_HOSTNAMES=

# Scraper safety limits (bytes)
SCRAPER_MAX_HTML_BYTES=2000000

# Smart-scale API/server cache
SMART_SCALE_CACHE_TTL_MS=86400000
SMART_SCALE_CACHE_MAX_ENTRIES=2000
SMART_SCALE_LLM_TIMEOUT_MS=15000
SMART_SCALE_LLM_MAX_RETRIES=1
```

## API Endpoints

- `POST /api/recipes/parse` `{ "url": "https://..." }`
- `POST /api/recipes/scale` `{ "recipe": { ... }, "options": { "multiplier": 2 } }`
- `POST /api/recipes/scale-smart` `{ "recipe": { ... }, "multiplier": 2, "recipeId": "optional" }`
- `GET /api/health`
