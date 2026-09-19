---
name: Parallel build conventions
description: How multi-stream builds are partitioned in this monorepo and the engine contract that other services depend on.
---
- Shared integration points (schema index, routes/index.ts, App.tsx routes, Shell nav) are pre-scaffolded by the main agent before dispatching workers; each stream owns one route file + its own pages/hooks. Stream map lives in `docs/xsect-build-brief.md`.
- All XSECT scoring/crossing logic goes through the `XsectEngine` contract in `artifacts/api-server/src/services/xsect-engine/index.ts`; other services must not reimplement scoring (local "fit" scores for org opportunities are the one allowed exception).
- After editing `lib/db/src/schema/*`, run `pnpm --filter @workspace/db exec tsc -b` — the API typecheck reads the built `.d.ts`, so a push alone leaves stale types.
- Plan/entitlements: `plan_overrides` provides persistent demo access and is resolved by the entitlement service. Trust level is never derived from plan.
**Why:** the user asked for parallel agents with no half-baked/dummy data; pre-scaffolding avoided merge conflicts on shared files.
