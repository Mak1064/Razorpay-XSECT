# XSECT build brief (shared by all build streams)

Product spec: `attached_assets/Pasted--XSECT-The-Opportunity-Network-Product-tagline-Your-nex_1789813151588.txt` (read it fully first).

## Non-negotiables
- No dummy/placeholder data anywhere in product code. Everything is DB-backed, server-enforced, wired into UI. Empty states are fine; fake rows are not.
- Never expose exact coordinates. Only `DistanceBand` (`lt_250m | 250m_500m | 500m_1km | 1km_2km | 2km_5km | 5km_plus`, labels in `artifacts/api-server/src/lib/geo.ts`) and city/area labels.
- Counterpart identity (name, photo, company, links) is hidden until an accepted connection exists between both users. Use `engine.protectedProfileView(viewerId, counterpartId)` for any counterpart rendering.
- Respect visibility: `professional_profiles.visibility` (`discoverable | trusted_only | stealth | ghost`), `privacy.womenOnly`, `trustRequirement` on wants/offers, blocked connections. `engine.isDiscoverable(viewer, counterpart)` is the shared gate.
- Trust levels (`contact | professional | enhanced`) come from profile completeness + behaviour, never from subscription. Never claim formal identity verification — wording is "Enhanced trust", not "verified".
- Entitlements are enforced on the backend with `requireEntitlement(...)` / `getEffectivePlan(userId)` from `artifacts/api-server/src/lib/entitlements.ts`. Frontend only mirrors the 402 responses (show upgrade prompt linking to `/plans`).
- AI must only reason over real DB rows and must never invent people. Every AI recommendation must cite an existing xsect/path/event id.
- Use XSECT vocabulary in UI: XSECT, XSECT Score, Radar, Missed, Paths, Bridge, Moments, Intelligence, Standing XSECT, Time XSECT, Opportunity Map. Never "match".
- Track analytics with `track(name, userId, props)` from `artifacts/api-server/src/lib/analytics.ts` (names in `lib/db/src/schema/platform.ts`).

## Codebase conventions
- pnpm monorepo. DB schema: `lib/db/src/schema/*.ts` (already written for all new tables — read `opportunities.ts`, `xsects.ts`, `network.ts`, `ai.ts`, `platform.ts`, `profiles.ts`). If you must add a column, add it to the relevant schema file, then run `pnpm --filter @workspace/db run push` and `pnpm --filter @workspace/db exec tsc -b` (regenerates types consumed by the API). Announce schema changes in your final report.
- API: Express 5 in `artifacts/api-server`. Each stream owns ONE route file under `src/routes/` (already created and mounted under `/api`). Auth: `requireAuth` sets `req.userId` (Clerk). Admin guard: `src/middlewares/requireAdmin.ts`. Errors: `res.status(4xx).json({ error })`. Validate bodies with `zod` (`import { z } from "zod"`).
- Engine contract: `artifacts/api-server/src/services/xsect-engine/index.ts` (types + `engine` export). Only the engine stream edits files in that directory. Other streams import `{ engine, pairKeyFor }` from `"../services/xsect-engine"`. Until the engine stream finishes, `engine.ts` is a throwing placeholder (file contains the word PLACEHOLDER) — write your code against the contract, and poll that file before end-to-end testing.
- OpenAI: `import { openai } from "@workspace/integrations-openai-ai-server"`; model `gpt-5.6-terra` for reasoning, `gpt-5.6-luna` for cheap extraction. Use `response_format: { type: "json_schema", ... }` for structured output.
- Frontend: React + Vite + wouter + react-query + Tailwind + shadcn in `artifacts/xsect`. Pages in `src/pages`, hooks in `src/hooks` (pattern: `fetch('/api/...', { credentials: 'include' })` + react-query, see `use-profile.ts`, `use-social.ts`). App is light-themed inside the shell (white cards, `border-border`, `text-muted-foreground`, `bg-primary` accents, `font-mono-custom` for labels) — match `pages/Events.tsx` / `pages/Network.tsx` style. Each stream owns its own page files and hook files; do NOT edit `App.tsx`, `Shell.tsx`, `routes/index.ts`, or `lib/db/src/schema/index.ts` (routes and nav are already registered — see the list below). If you need a new page/route, put it in your report and the integrator will add it.
- Typecheck: `pnpm --filter @workspace/api-server exec tsc --noEmit -p .` and `pnpm --filter @workspace/xsect exec tsc --noEmit -p .`. Both must pass before you report done.
- Dev servers are managed workflows (`artifacts/api-server: API Server`, `artifacts/xsect: web`); tsx watch reloads the API on save. Test API routes with curl only if you have a session cookie; otherwise write a small `tsx` script under `artifacts/api-server/scripts/` that calls your service functions directly against the DB (DATABASE_URL is in env). Clean up test rows you create.
- Existing users are Clerk ids. Seeded synthetic users use ids prefixed `seed_` and exist only in `professional_profiles` (they never log in).

## Registered routes / pages (already in App.tsx + nav)
`/radar` Radar.tsx · `/discover` Discover.tsx · `/xsects` XSECTs.tsx · `/network` Network.tsx · `/ai` Intelligence.tsx · `/opportunities` Opportunities.tsx · `/paths` Paths.tsx · `/alerts` Alerts.tsx · `/events` Events.tsx · `/organizations` Organizations.tsx · `/organizations/:id` OrganizationDetail.tsx · `/messages` · `/profile` Profile.tsx · `/plans` · `/admin` Admin.tsx (nav item shown when `GET /api/admin/me` returns `isAdmin: true`; hook `src/hooks/use-admin.ts`).

## Stream ownership
| Stream | Route file | Services | Pages/hooks |
|---|---|---|---|
| engine | `routes/xsects.ts` | `services/xsect-engine/*` | `pages/Radar.tsx`, `pages/Discover.tsx`, `pages/XSECTs.tsx`, `hooks/use-xsects.ts` |
| opportunities | `routes/opportunities.ts` | `services/opportunities/*`, `services/trust.ts` | `pages/Opportunities.tsx`, `pages/Organizations.tsx`, `pages/OrganizationDetail.tsx`, `hooks/use-opportunities.ts`, `hooks/use-organizations.ts`, Wants/Offers steps in `pages/Onboarding.tsx`, availability + trust panel in `pages/Profile.tsx` |
| network | `routes/network.ts` | `services/network/*` | `pages/Paths.tsx`, `pages/Alerts.tsx`, `pages/Network.tsx` (Bridge inbox, reviews), event "Who should I meet?" section in `pages/Events.tsx`, `hooks/use-network.ts` |
| ai | `routes/ai.ts` | `services/ai/*` | `pages/Intelligence.tsx`, Twin section component `components/ProfessionalTwin.tsx` (integrator mounts it in Profile), `hooks/use-ai.ts` |
| admin | `routes/admin.ts` | `services/admin/*` | `pages/Admin.tsx`, `hooks/use-admin.ts` (extend), plan switch UI in `pages/Plans.tsx` |
| seed | — | `artifacts/api-server/scripts/seed.ts` + `services/seed/*` | — |
