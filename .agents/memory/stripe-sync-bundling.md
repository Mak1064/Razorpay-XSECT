---
name: Stripe sync bundling
description: Runtime constraint for Stripe schema migrations in the bundled API server.
---

Keep `stripe-replit-sync` external to the API server bundle.

**Why:** The package resolves migration files from its installed package directory. Bundling it into the server output hides those files, causing startup to continue without creating required Stripe tables.

**How to apply:** When changing the API build pipeline, preserve this external dependency and verify startup logs confirm Stripe schema, webhook, and backfill initialization.