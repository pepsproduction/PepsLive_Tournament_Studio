# PepsLive Tournament Studio - V1 Stable Release Checklist

Use this checklist before announcing or using the site for a real event.

## 0. Browser Preparation

- [ ] Open the GitHub Pages site.
- [ ] Press `Ctrl + F5` to clear cached scripts.
- [ ] Open DevTools Console.
- [ ] Confirm there are no red JavaScript errors on first load.

## 1. Setup

- [ ] Enter event name.
- [ ] Select sport type.
- [ ] Set group count.
- [ ] Set court count.
- [ ] Set start time.
- [ ] Set match interval.
- [ ] Set qualifiers per group.
- [ ] Click Save Setup.
- [ ] Dashboard guard shows Setup done.

## 2. Teams

- [ ] Paste team list.
- [ ] Duplicate team warning works.
- [ ] BYE estimate displays correctly.
- [ ] Copy Teams works.
- [ ] Clear Teams asks for confirmation.
- [ ] Save Teams works.
- [ ] Draw buttons unlock after teams are saved.

## 3. Draw

- [ ] Start Draw works.
- [ ] Pending result appears.
- [ ] Confirm Result works.
- [ ] Draw Status shows confirmed teams.
- [ ] Dashboard guard shows Draw done.

## 4. Schedule

- [ ] Generate Schedule works.
- [ ] Real matches display.
- [ ] BYE does not appear as a real match.
- [ ] Schedule Health appears.
- [ ] Back-to-back warning is readable if triggered.
- [ ] Rebuild Random asks for confirmation if scores already exist.

## 5. Group Scores

- [ ] Score inputs work.
- [ ] Save Scores works.
- [ ] Pending count updates.
- [ ] Done count updates.
- [ ] Invalid score warning works.
- [ ] Standings render after scores are saved.

## 6. Standings

- [ ] Standings display by group.
- [ ] PTS values are correct.
- [ ] Rank order is correct.
- [ ] Tie warning appears only within the same group.
- [ ] BYE does not appear in Standings.

## 7. Tie Resolver

- [ ] Tie Resolver appears when teams in the same group have equal points.
- [ ] Manual order can be saved.
- [ ] Draw Lots shuffles tied teams.
- [ ] Generate Knockout from Resolved Order works.
- [ ] Knockout bracket uses the resolved order.

## 8. Knockout

- [ ] Knockout Health appears.
- [ ] BYE warning works if BYE appears.
- [ ] Duplicate team warning works if duplicated.
- [ ] Quarter Final / Semi Final / Final display.
- [ ] Third Place displays if enabled.
- [ ] Generate from Standings works when regular Generate fails.

## 9. Knockout Scores

- [ ] Knockout Scores appears in Scores & Standings.
- [ ] Score inputs can be clicked.
- [ ] Score inputs retain typed values while editing.
- [ ] Winner dropdown can be selected.
- [ ] Save Knockout Scores works.
- [ ] QF winner advances to SF.
- [ ] SF winner advances to Final.
- [ ] SF loser advances to Third Place.
- [ ] Final winner appears as champion data in export payload.

## 10. Google Sheet Export

- [ ] Apps Script webhook is deployed.
- [ ] Webhook URL is entered.
- [ ] Google Sheet ID is entered.
- [ ] Copy Payload JSON works.
- [ ] Send Tournament Database works.
- [ ] Google Sheet contains these sheets:
  - [ ] Event_Setup
  - [ ] Teams
  - [ ] Groups
  - [ ] Schedule
  - [ ] Scores
  - [ ] Standings
  - [ ] Tie_Break
  - [ ] Knockout
  - [ ] Knockout_Flow
  - [ ] Final_Result
  - [ ] Export_Log

## 11. OBS Sources

Create Browser Source in OBS with:

```text
Width: 1920
Height: 1080
```

Test all URLs:

- [ ] `?view=groups`
- [ ] `?view=standings`
- [ ] `?view=schedule`
- [ ] `?view=knockout`
- [ ] `?view=latest-result`
- [ ] `?view=next-match`
- [ ] `?view=lower-third`
- [ ] `?view=draw-animation`

If a source does not update:

- [ ] Click Refresh cache of current page in OBS.
- [ ] Reopen the source URL in browser.
- [ ] Confirm data exists in localStorage.

## 12. Regression Test

After any code change:

- [ ] Setup still works.
- [ ] Teams still save.
- [ ] Draw still confirms.
- [ ] Schedule still generates.
- [ ] Scores still save.
- [ ] Standings still render.
- [ ] Knockout still generates.
- [ ] Knockout scores still advance winners.
- [ ] Google Sheet export still sends.
- [ ] OBS sources still display.

## Release Decision

Release as `V1 Stable` only if every critical item passes:

```text
Setup
Teams
Draw
Schedule
Scores
Standings
Tie Resolver
Knockout
Knockout Scores
Google Sheet Export
OBS Sources
```

## Known Technical Debt

- Multiple add-on files are currently loaded through `phase2-core-guard.js`.
- Phase 8 and Pre-Phase 6 both include source rendering logic.
- Phase 6 and Pre-Phase 6 both include knockout generation logic.
- Final cleanup should happen in Phase 10 on a new branch.
