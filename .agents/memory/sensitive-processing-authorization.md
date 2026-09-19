---
name: Sensitive processing authorization
description: Security rules for consent-gated processing and private object uploads.
---

Optional consent must be checked by the backend when sensitive processing happens, not only when UI controls are rendered. Analytics collection skips identified users without current analytics consent, and AI generation requires current AI-profiling consent.

**Why:** Consent records existed before enforcement, so direct API callers and background paths could continue sensitive processing after a user declined or withdrew consent.

**How to apply:** Put checks in shared service or route boundaries that cover every caller. Viewing or exporting already-stored user-owned data does not require renewed processing consent.

Private upload finalization must require a current, unconsumed upload intent bound to the authenticated user, opaque object path, declared size, and MIME type. Ownership cannot be claimed from an arbitrary object path.

**Why:** A signed URL alone does not prove who is authorized to finalize or own the resulting object.

**How to apply:** Create short-lived upload intents before issuing write URLs, validate stored-object metadata, finalize once, and keep private-object read authorization separate from upload authorization.