---
name: Plan access without payments
description: Records the product decision to keep plan entitlements demonstrable without a payment provider.
---

XSECT plan access is controlled by persistent demo overrides, with free access as the default. Do not add checkout, billing portals, payment webhooks, or payment-provider startup work unless the user explicitly asks to restore monetization.

**Why:** The user removed the payment method so publishing would not require a live payment account, while retaining the ability to test Pro and Pro+ functionality.

**How to apply:** Keep entitlement enforcement server-side and preserve the plan switch for product demonstrations. Treat plan labels as access levels rather than purchasable subscriptions.