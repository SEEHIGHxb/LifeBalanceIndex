# Welcome design rollback — 2026-10-04

The previous welcome design is saved here as exact source copies. Desktop and phone screenshots are `previous-welcome-1440.png` and `previous-welcome-390.png`.

## Restore the previous design

From PowerShell in this folder, preview the actions first:

```powershell
.\restore-welcome.ps1 -WhatIf
```

Then restore:

```powershell
.\restore-welcome.ps1
```

The script restores the saved welcome renderer, its bootstrap/cache entries, retired welcome translations and welcome-specific tests. It removes only the four files added for this welcome design. It preserves this backup and all pre-existing assets and app data. It checks hashes and refuses to overwrite files edited after the redesign; review such changes before using `-Force`.

No journey, dashboard, aspect, weekly review, goals, comparison, profile or methodology page source was changed. **327 pre-existing files** were verified unchanged by SHA-256. `before-hashes.json` and `rollback-manifest.json` record the exact scope.

## Current welcome design

The new welcome uses the approved illustrated Atlas and a live Eight Threads sample. Its primary actions lead to the original full journey (or Overview for a returning reader). The sample has fixed illustrative scores and writes no assessment data. English/Thai, backup restore and reduced motion remain supported.

Support changes in index.html/sw.js only load and cache the new welcome assets and stop preloading the retired welcome dependencies. th.js only removes nine retired welcome strings; the new welcome copy is localized inside views/landing.js.

Verification: 942 unit tests pass. Browser checks passed at 1440, 1024, 390 and 320 pixels, including real journey navigation, returning shared chrome, language switching/focus and reduced motion. Release v193 also bumps the shared cache version and stages the welcome artwork for GitHub Pages. Other page designs and flows are unchanged.

Additional checks passed: returning readers open the existing Overview; the original restore-from-backup control imports successfully; the welcome artwork and styles load after an offline refresh. The rollback script's -WhatIf mode was verified without changing any files.

The rollback also restores the original release metadata and deployment workflow. Before publishing a rollback, bump the cache version beyond the most recently deployed release so existing browsers receive it.

Release checks: all 942 unit tests pass; coverage gate passes (85.10% lines, 79.24% functions); Biome lint, smoke, E2E, motion budget, and moments E2E pass. All 120 service worker shell entries are staged. Returning users, backup import, and offline reload pass at v193.
