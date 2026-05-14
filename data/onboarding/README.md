# Aethel Onboarding Data Plan

This directory is reserved for curated first-run guidance data.

Runtime workspace data lives in:

- `data/bubbles/*.md`
- `data/snapshots/*.md`
- `data/workspace.json`
- `data/.trash/**`

Those files are ignored by Git because they represent local user state. Future onboarding examples should be stored here as versioned seed assets, then copied or imported into the runtime data layer only when a user explicitly starts from a guided workspace.

Recommended seed shape:

- `seed-workspace.json`: canvas layout, categories, and viewport for a guided first run.
- `bubbles/*.md`: small curated example bubbles with neutral product-thinking content.
- `snapshots/*.md`: optional example snapshots that demonstrate progressive disclosure.

Keep onboarding seeds small, generic, and clearly separated from real user work.
