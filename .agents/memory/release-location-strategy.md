---
name: Release and location strategy
description: The agreed sequence and age/location boundaries for XSECT releases.
---

Ship and stabilize the production web/PWA before building native iOS and Android clients. XSECT is restricted to adults aged 18 and older. The PWA may use explicitly consented foreground location only while open; it must not claim reliable background tracking. Native background location and crossing detection are planned for the later store release.

**Why:** The user selected a production PWA-first release while preserving background crossing detection as a requirement for the future App Store and Play Store version. Browsers cannot reliably provide continuous background location.

**How to apply:** Keep web copy, consent prompts, and privacy controls explicit about foreground-only location. Treat native background location as a separate mobile release with Apple/Google review disclosures, retention controls, and battery-conscious tracking.