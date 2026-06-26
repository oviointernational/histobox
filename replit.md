# Histobox — Laboratory Management System

A histopathology laboratory management system managing the full workflow: case entry → bench processing (fixation, processing, embedding, microtomy, staining) → microscopy/QC → sign-out → reporting → reagent management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Histobox server (port 8080)
- The app is served as a static SPA from `artifacts/api-server/public/`

## Stack

- Frontend: React 18 + React Router v7 + Zustand (pre-compiled bundle — no source)
- Styling: Tailwind CSS + shadcn/ui (compiled)
- Backend: Express 5 (static file server + SPA fallback)
- Database: Supabase — PostgreSQL + Auth
- PWA: Service Worker + Web App Manifest

## Where things live

- `artifacts/api-server/public/` — compiled Histobox SPA assets (index.html, assets/, icons/, sw.js, manifest.json)
- `artifacts/api-server/src/app.ts` — Express app; serves `/api` routes + static SPA fallback
- `lib/api-spec/openapi.yaml` — API contract (health check only)
- `lib/db/src/schema/` — DB schema (Drizzle ORM)

## Architecture decisions

- App is served as a pre-compiled React bundle — no source code for the frontend exists in this repo
- Express 5 wildcard route uses `/{*path}` syntax (Express 4 `*` wildcard breaks in Express 5 + path-to-regexp v8)
- Supabase credentials are embedded in `public/index.html` via `window.__HISTOBOX_ENV__` as required by the bundle
- Static files are served before the SPA fallback catch-all to ensure assets (JS, CSS, icons) load correctly

## Product

Histopathology lab management: 21 Supabase tables covering cases, reports, reagents, consumables, equipment, immunohistochemistry runs, exams, rosters, and misc configuration.

## Supabase

- **Project URL**: `https://hadhsnhjbqygtvtmyuuz.supabase.co`
- **Anon Key**: embedded in `public/index.html`
- Run `supabase-fix-rls.sql` in Supabase SQL Editor once to fix RLS policies, UUID defaults, and lab prefix

## Gotchas

- Express 5 does NOT support `app.get("*", ...)` — use `app.get("/{*path}", ...)` instead
- Supabase credentials must stay in `public/index.html` (not moved to env vars) — the compiled bundle reads `window.__HISTOBOX_ENV__`
- `public/` is one level up from `dist/` at runtime (`__dirname` = `dist/`), so `path.join(__dirname, "..", "public")` is correct

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
