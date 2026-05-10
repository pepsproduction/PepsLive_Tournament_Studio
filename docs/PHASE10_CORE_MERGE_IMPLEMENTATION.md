# Phase 10: Core Merge Implementation

Branch: `core-merge-v1`

## Status

Phase 10 has started on a separate branch. The production `main` branch has not been changed by this phase.

## Completed in this phase

- Created branch `core-merge-v1` from the latest `main` commit available at phase start.
- Added `assets/core-loader.js` as a conservative loader scaffold.

## Why a scaffold first

The current production build is stable through add-on files loaded by `phase2-core-guard.js`. Directly merging all add-ons into new core files in one commit is high risk because:

1. OBS source rendering exists in more than one file.
2. Knockout generation exists in more than one file.
3. Knockout score advancement depends on localStorage state and browser-side runtime data.
4. Google Sheet export depends on final data shape after Knockout and Tie Resolver are complete.

## Current scaffold

`assets/core-loader.js` currently loads the existing validated add-ons in one central list:

- `phase3-teams-draw`
- `phase4-schedule`
- `phase5-scores`
- `phase55-google-sheet`
- `phase6-knockout`
- `phase8-live-sources`
- `prephase6-knockout-source-fix`
- `prephase6-knockout-generate-fix`

This keeps behavior equivalent while giving us a single place to control loading order during the merge.

## Next implementation steps

### Step 1: Validate branch loader

- Load `core-loader.js` after `app.js` on the branch only.
- Confirm add-ons still load once.
- Confirm no duplicate panels appear.

### Step 2: Merge live source renderer

Canonical file target:

```text
assets/core-live-sources.js
```

Source of truth:

```text
assets/phase8-live-sources.js
```

Action:

- Move Phase 8 source rendering into `core-live-sources.js`.
- Remove source-rendering responsibility from `prephase6-knockout-source-fix.js` later.

### Step 3: Merge knockout logic

Canonical file target:

```text
assets/core-knockout.js
```

Merge from:

- `phase6-knockout.js`
- `prephase6-knockout-generate-fix.js`
- Knockout Scores section of `prephase6-knockout-source-fix.js`

Action:

- Keep only one visible-standings parser.
- Keep only one bracket generator.
- Keep only one winner advancement flow.

### Step 4: Merge health panels

Canonical files:

```text
assets/core-teams-draw.js
assets/core-schedule.js
assets/core-scores.js
```

Merge from:

- Phase 3
- Phase 4
- Phase 5

### Step 5: Merge Google Sheet exporter

Canonical file:

```text
assets/core-google-sheet.js
```

Merge from:

- `phase55-google-sheet.js`

Add later:

- Export tie resolver method/order from `state.tieResolvers`.

## Do not merge into main yet

This branch should not be merged into `main` until the V1 Stable Release Checklist passes.

## Current phase result

Phase 10 produced the first safe migration step, not the full core merge. The full merge should continue in smaller commits to avoid breaking the working production build.
