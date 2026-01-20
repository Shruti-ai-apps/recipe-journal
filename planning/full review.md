# Recipe Journal - Code Review

Date: 2026-01-20

This review focuses on architecture, correctness, error handling, security, race conditions, and operational concerns.

---

## Executive Summary

The app is a Next.js (App Router) application with:
- API routes for parsing/scaling recipes (`app/api/...`)
- A scraper pipeline (`lib/scraper/...`)
- Deterministic scaling + AI advisory scaling (`lib/scaling`, `lib/llm`)
- Local favorites for guests + Supabase-backed favorites with offline sync (`services/*`, `lib/offline`, `lib/supabase`)

The core structure is solid and tests are present. The highest-risk issues are around SSRF (server-side fetching of arbitrary URLs), overly-permissive image remote patterns, and caching/auth interactions.

---

## What's Working Well

- **Clear separation of concerns**:
  - Scraping vs parsing vs scaling vs AI advisory are separate modules.
- **Defensive smart-scale UI**:
  - `app/page.tsx` includes debounce + abort + request-token checks to prevent stale async updates.
- **Typed API responses**:
  - Parse/scale endpoints use consistent response envelopes with meta.
- **Test coverage exists and runs**:
  - Jest suite includes unit tests for core utilities and components.

---

## Architecture Notes

- The repo reads like a single Next.js app, but `README.md` describes a different architecture (Vite/Express monorepo). This will confuse onboarding and contributors.
  - Recommendation: update `README.md` to reflect actual Next.js structure, dev commands, and runtime behavior.

- The app mixes **guest localStorage favorites** and **cloud + offline IndexedDB sync**. That's a reasonable UX choice, but it creates several edge cases (see Offline/Sync section).

---

## Security Findings (High Priority)

### 1) SSRF risk in recipe parsing (High)

- `POST /api/recipes/parse` accepts a user-provided URL and the server fetches it (`app/api/recipes/parse/route.ts`, `lib/scraper/utils/fetcher.ts`).
- Current validation checks protocol (http/https) but does **not** protect against:
  - `http://localhost:...` / `http://127.0.0.1:...`
  - Private IP ranges (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
  - Cloud metadata IPs (e.g., `169.254.169.254`)
  - DNS rebinding tricks
  - Large responses / slowloris (resource exhaustion)

Recommendations:
- Block hostnames/IPs that resolve to private/loopback/link-local ranges.
- Cap redirects (and re-validate each redirect target).
- Enforce a max response size and content length.
- Consider an allowlist strategy if feasible (or at least block obvious internal targets).
- Consider stripping auth headers/cookies explicitly (you currently set explicit headers; good).

### 2) Next Image allows any remote host (High)

- `next.config.js` uses `images.remotePatterns` with `hostname: '**'` (any host).
- This can become an SSRF vector via Next image optimization proxying untrusted URLs, and it increases exposure to unexpected content.

Recommendation:
- Restrict to an allowlist (or a controlled pattern set) that matches known recipe image hosts, or implement a safe image proxy with allowlisting.

### 3) Service worker caches Supabase broadly (High/Med depending on usage)

- `next-pwa` runtime caching includes `urlPattern: /^https:\\/\\/.*\\.supabase\\.co\\/.*/i` with NetworkFirst.
- If this matches auth/session endpoints or sensitive responses, the SW cache may store data you don't intend.

Recommendation:
- Narrow the caching rule to only the endpoints you explicitly want cached.
- Explicitly exclude `/auth/v1/*` and other sensitive endpoints.

### 4) "IP-based" rate limiting is header-spoofable (Med)

- `scale-smart` rate limits by `x-forwarded-for` or `x-real-ip` or `anonymous`.
- In non-managed environments, a client can spoof these headers to bypass limits.

Recommendation:
- Treat it as best-effort only OR use a trusted proxy header validation strategy.
- For real protection, move rate limiting to an upstream proxy/CDN or a shared store keyed by a verified identifier.

---

## API Design & Error Handling

### 1) `apiFetch` assumes JSON always (Med)

- `services/api.ts` does `await response.json()` without checking `Content-Type` or empty bodies.
- If the server returns HTML (Next error page), plain text, or an empty response, this throws and loses useful error context.

Recommendation:
- Parse defensively:
  - Read `response.text()`, attempt JSON parse, fallback to a structured error containing HTTP status + truncated text.
  - Include `response.status` / `statusText` in thrown errors.

### 2) `request.json()` failure becomes 500 (Low/Med)

- API routes call `await request.json()` directly.
- Invalid JSON body results in an exception and likely a 500 response.

Recommendation:
- Catch JSON parsing errors and return 400 with a clear message.

### 3) Supabase env variables are non-null asserted in server/middleware paths (Med)

- `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, and `app/auth/callback/route.ts` use `process.env.NEXT_PUBLIC_SUPABASE_URL!` etc.
- If env vars are missing, requests can hard-crash.

Recommendation:
- Gracefully handle missing configuration:
  - In middleware: return `NextResponse.next()` without session update if unconfigured.
  - In auth callback: redirect with a user-friendly error.
  - In server client: throw a controlled error with actionable text.

---

## Race Conditions / Concurrency

### 1) Offline sync queue merges by `recipeId` only (High)

- `services/sync/OfflineQueue.ts` checks existing operations using only `recipeId`.
- If multiple users use the same browser/profile, operations can merge across users, causing data corruption or lost updates.

Recommendation:
- Scope queue lookups/merges by `(userId, recipeId)`.
- Alternatively: clear offline DB and queue on logout.

### 2) Deleted items may reappear after offline delete (Med)

- `getAllFromOffline(userId)` filters out deleted items for UI use.
- `syncFromCloud` uses `getAllFromOffline` to build the local map; deleted-but-not-synced items may not be present for conflict logic, letting cloud re-download them.

Recommendation:
- For syncing, query offline storage including deleted records (separate function for sync vs UI lists).

### 3) Offline "create" ID remapping impacts UI references (Med)

- When syncing a locally-created recipe, the code deletes the local recipe row and inserts the cloud version, effectively changing IDs.
- UI state might keep the old ID (depending on how components reference items).

Recommendation:
- Emit an "id remapped" event or return mapping so UI state can update immediately.

---

## Offline/Sync Design Observations

- The sync implementation is last-write-wins with `sync_version` and timestamps. That's a pragmatic choice, but you should explicitly decide:
  - Whether timestamps come from client or server (server is preferred for trust).
  - What fields are merged vs overwritten in conflicts (right now "local wins" overwrites most fields).

- Consider adding:
  - A dead-letter queue UI or diagnostics view for operations that exhaust retries.
  - Clearer user feedback when `lastError` is set in sync status.

---

## Performance & Operational Concerns

### 1) In-memory caches/limits are per-instance (Med)

- `scale-smart` caches results and rate-limits in memory.
- In serverless/multi-instance environments this won't behave consistently.

Recommendation:
- If you need real guarantees, move caching/rate limiting to a shared store (Redis, KV) or CDN edge.

### 2) Interval lifecycle in `CacheService` (Low/Med)

- `CacheService` starts a cleanup interval per instance on the server.
- If multiple instances are created (especially in dev/HMR), you can accumulate intervals.

Recommendation:
- Prefer a singleton per module for server-side caches, or avoid intervals and clean opportunistically on access.

### 3) Build warnings for optional `ws` native deps (Low)

- `next build` warns about missing `bufferutil` and `utf-8-validate` (optional deps for `ws`) pulled by `@google/genai`.

Recommendation:
- Decide whether to install the optional deps for performance/noise reduction or accept the warnings.

---

## Data Validation / Robustness

- Ingredient parsing uses many "special character" patterns; some strings show mojibake sequences. This can be caused by encoding issues in source files or scraped content.

Recommendations:
- Ensure files are UTF-8 and consider normalizing scraped text (e.g., replace known mojibake with correct unicode).
- Add tests for typical unicode fraction inputs and common site encodings.

---

## Recommended Priority Roadmap

### P0 (Do ASAP)
- Add SSRF protections to recipe parsing fetch path.
- Restrict `next/image` remote patterns.
- Tighten SW caching rules for Supabase (exclude auth endpoints).
- Fix offline queue merge scoping (userId+recipeId).

### P1
- Improve API client error parsing (`services/api.ts`).
- Gracefully handle missing Supabase config in server/middleware/callback paths.
- Adjust sync logic to include deleted records during sync comparisons.

### P2
- Decide on shared caching/rate limiting strategy for production.
- Improve conflict resolution UX and dead-letter diagnostics.
- Update `README.md` to match actual architecture.

