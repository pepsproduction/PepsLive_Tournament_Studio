# Phase 9: Final Cleanup & Core Merge Plan

Status: Planning completed. Do not delete add-on files yet.

## Current Loader Inventory

All current add-ons are loaded from `assets/phase2-core-guard.js` through `loadPhaseAddons()`.

### Core guard

- `assets/phase2-core-guard.css`
- `assets/phase2-core-guard.js`

Purpose:
- Workflow guard
- Step lock/unlock
- Dashboard guard status
- Add-on loader

### Add-on phases

| Phase | Files | Purpose | Merge Priority |
|---|---|---|---|
| Phase 3 | `phase3-teams-draw.css/js` | Team validation, duplicate check, BYE visibility, draw status | High |
| Phase 4 | `phase4-schedule.css/js` | Schedule health, BYE checks, rebuild warning | High |
| Phase 5 | `phase5-scores.css/js` | Scores health, standings validation, knockout readiness | High |
| Phase 5.5 | `phase55-google-sheet.css/js` | Tournament database payload and Google Sheet export | Medium |
| Phase 6 | `phase6-knockout.css/js` | Knockout health, tie resolver, resolved-order bracket generation | High |
| Phase 8 | `phase8-live-sources.css/js` | Final OBS source fallback renderer and source health | High |
| Pre-Phase 6 Source Fix | `prephase6-knockout-source-fix.css/js` | Knockout Scores UI, groups/standings fallback source | Medium / partially replace |
| Pre-Phase 6 Generate Fix | `prephase6-knockout-generate-fix.js` | Generate knockout from standings/visible standings | Merge into Phase 6 |

## Main Technical Risk

There are overlapping responsibilities across these files:

1. `prephase6-knockout-source-fix.js` and `phase8-live-sources.js` both render OBS source views.
2. `prephase6-knockout-generate-fix.js` and `phase6-knockout.js` both create Knockout from standings.
3. `phase5-scores.js` and `prephase6-knockout-source-fix.js` both affect Knockout/Scores readiness.
4. `phase2-core-guard.js` is now both workflow guard and add-on loader.

Because these add-ons were intentionally added as safety layers, deleting them immediately is unsafe until runtime tests pass.

## Recommended Core Merge Target

Create these final files in the next cleanup implementation:

```text
assets/core-state.js
assets/core-guard.js
assets/core-teams-draw.js
assets/core-schedule.js
assets/core-scores.js
assets/core-knockout.js
assets/core-live-sources.js
assets/core-google-sheet.js
assets/core-ui-health.css
```

## Merge Mapping

### 1. `core-guard.js`

Merge from:
- `phase2-core-guard.js`

Keep:
- `readState()` guard checks
- `applyLocks()`
- `renderDashboard()`
- `renderHints()`

Remove from final version:
- Hard-coded phase add-on loader after the merge is complete

### 2. `core-teams-draw.js`

Merge from:
- `phase3-teams-draw.js`

Keep:
- Duplicate team detection
- BYE estimate
- Copy Teams
- Clear Teams
- Draw status
- Save Teams warning

### 3. `core-schedule.js`

Merge from:
- `phase4-schedule.js`

Keep:
- Schedule health
- BYE in matches warning
- Back-to-back team warning
- Rebuild warning when scores exist
- Source readiness parts should move to `core-live-sources.js`

### 4. `core-scores.js`

Merge from:
- `phase5-scores.js`

Keep:
- Scores Health
- Pending/Done/Invalid checks
- BYE in standings warning
- Tie warning summary
- Mark All Pending warning

### 5. `core-knockout.js`

Merge from:
- `phase6-knockout.js`
- `prephase6-knockout-generate-fix.js`
- Knockout Scores part of `prephase6-knockout-source-fix.js`

Keep:
- Knockout Health
- Tie Resolver
- Generate from resolved order
- Generate from visible standings fallback
- Knockout Scores UI
- Winner advance QF -> SF -> Final
- Loser advance SF -> Third Place

Remove duplication:
- Only one function should build brackets from standings.
- Only one function should parse visible standings.
- Only one function should advance bracket winners.

### 6. `core-live-sources.js`

Merge from:
- `phase8-live-sources.js`
- Source fallback parts of `prephase6-knockout-source-fix.js`
- Source health parts of `phase4-schedule.js`

Keep:
- `?view=groups`
- `?view=standings`
- `?view=schedule`
- `?view=knockout`
- `?view=latest-result`
- `?view=next-match`
- `?view=lower-third`
- `?view=draw-animation`
- OBS Source Health panel
- Copy/Open buttons

Final rule:
- Phase 8 renderer should become the single source renderer.
- Pre-Phase 6 source renderer should be removed only after Phase 8 source tests pass.

### 7. `core-google-sheet.js`

Merge from:
- `phase55-google-sheet.js`

Keep:
- Tournament Database payload
- 11-sheet schema
- Send Tournament Database
- Copy Payload JSON

Improve later:
- Include `state.tieResolvers` method/order in `Tie_Break` export.
- Include `audit` export if needed.

## Do Not Delete Yet

Do not delete these files until all browser/OBS tests pass:

```text
assets/phase3-teams-draw.css
assets/phase3-teams-draw.js
assets/phase4-schedule.css
assets/phase4-schedule.js
assets/phase5-scores.css
assets/phase5-scores.js
assets/phase55-google-sheet.css
assets/phase55-google-sheet.js
assets/phase6-knockout.css
assets/phase6-knockout.js
assets/phase8-live-sources.css
assets/phase8-live-sources.js
assets/prephase6-knockout-source-fix.css
assets/prephase6-knockout-source-fix.js
assets/prephase6-knockout-generate-fix.js
```

## Safe Cleanup Order

1. Test all current add-ons on GitHub Pages.
2. Freeze the current build as `v1-addon-stable`.
3. Create a new branch: `core-merge-v1`.
4. Merge source-rendering logic first: Phase 8 becomes canonical.
5. Merge Knockout logic second: Phase 6 + Pre-Phase 6 generate + Knockout Scores.
6. Merge Teams/Schedule/Scores health.
7. Merge Google Sheet exporter.
8. Replace `phase2-core-guard.js` loader with final core imports.
9. Remove old phase files only after the final core build passes all tests.

## Expected Final Script Loading

After full merge, `index.html` should load something like:

```html
<link rel="stylesheet" href="assets/style.css" />
<link rel="stylesheet" href="assets/core-ui-health.css" />

<script src="assets/app.js"></script>
<script src="assets/core-state.js"></script>
<script src="assets/core-guard.js"></script>
<script src="assets/core-teams-draw.js"></script>
<script src="assets/core-schedule.js"></script>
<script src="assets/core-scores.js"></script>
<script src="assets/core-knockout.js"></script>
<script src="assets/core-google-sheet.js"></script>
<script src="assets/core-live-sources.js"></script>
```

## V1 Stable Definition

V1 Stable means:

- Setup saves correctly.
- Teams validation works.
- Draw can be confirmed.
- Schedule can be generated without BYE as real matches.
- Scores can be saved.
- Standings calculate and display.
- Tie Resolver handles equal points.
- Knockout generates from resolved standings.
- Knockout winners advance to next round.
- Final result can be completed.
- Google Sheet export writes all 11 sheets.
- OBS sources display Groups, Standings, Schedule, Knockout, Latest Result, Next Match, Lower Third.

## Phase 9 Decision

Phase 9 should not merge core immediately. The correct next implementation phase is:

```text
Phase 10: Core Merge Implementation
```

Phase 10 should be done on a new branch, not directly on `main`.
