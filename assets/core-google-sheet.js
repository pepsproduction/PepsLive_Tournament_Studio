/* Core Google Sheet: Tournament Database Exporter
   Replaces assets/phase55-google-sheet.js.
   Builds a Tournament Database payload and sends it to Apps Script webhook.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_GOOGLE_SHEET_INSTALLED__) return;
  window.__PEPSLIVE_CORE_GOOGLE_SHEET_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);

  const SHEET_NAMES = [
    'Event_Setup', 'Teams', 'Groups', 'Schedule', 'Scores', 'Standings',
    'Tie_Break', 'Knockout', 'Knockout_Flow', 'Final_Result', 'Export_Log'
  ];

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function clean(v) { return String(v ?? '').trim(); }
  function isBye(v) { return clean(v).toUpperCase() === 'BYE'; }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
  function nowIso() { return new Date().toISOString(); }
  function matchTeam(m, side) { return clean(m?.[side] || m?.[side === 'teamA' ? 'home' : 'away'] || m?.teams?.[side === 'teamA' ? 0 : 1] || ''); }
  function matchScore(m, key) { const v = m?.[key]; return v === '' || v == null ? '' : num(v); }
  function matchWinner(m) {
    const w = clean(m?.winner || m?.winnerTeam);
    if (w) return w;
    const a = matchScore(m, 'scoreA'), b = matchScore(m, 'scoreB');
    if (a === '' || b === '' || a === b) return '';
    return a > b ? matchTeam(m, 'teamA') : matchTeam(m, 'teamB');
  }
  function matchLoser(m) {
    const w = matchWinner(m);
    if (!w) return '';
    const a = matchTeam(m, 'teamA'), b = matchTeam(m, 'teamB');
    return w === a ? b : (w === b ? a : '');
  }

  function normalizeStandingsEntries(state) {
    const standings = state.standings && typeof state.standings === 'object' ? state.standings : {};
    if (Object.keys(standings).length) {
      return Object.entries(standings).map(([group, rows]) => [group, normalizeRows(rows)]).filter(([, rows]) => rows.length);
    }
    return computeStandingsFallback(state);
  }
  function normalizeRows(rows) {
    let list = [];
    if (Array.isArray(rows)) list = rows.slice();
    else if (rows && typeof rows === 'object') list = Object.entries(rows).map(([team, data]) => ({ team, ...(data || {}) }));
    return list.map((r, i) => ({
      rank: num(r.rank ?? r.no ?? r.pos ?? (i + 1), i + 1),
      team: clean(r.team || r.name || r.Team || r.title),
      pts: num(r.pts ?? r.points ?? r.PTS),
      w: num(r.w ?? r.win ?? r.W),
      d: num(r.d ?? r.draw ?? r.D),
      l: num(r.l ?? r.loss ?? r.L),
      gf: num(r.gf ?? r.for ?? r.GF),
      ga: num(r.ga ?? r.against ?? r.GA),
      gd: num(r.gd ?? r.diff ?? r.GD)
    })).filter((r) => r.team && !isBye(r.team));
  }
  function computeStandingsFallback(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const matches = Array.isArray(state.matches) ? state.matches : [];
    return Object.entries(groups).map(([group, teams]) => {
      const rows = (teams || []).filter((t) => clean(t) && !isBye(t)).map((team) => ({ rank: 0, team, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      const map = new Map(rows.map((r) => [r.team, r]));
      matches.forEach((m) => {
        const a = matchTeam(m, 'teamA'), b = matchTeam(m, 'teamB');
        if (!map.has(a) || !map.has(b) || isBye(a) || isBye(b)) return;
        if (String(m.status || '').toLowerCase() !== 'done') return;
        const sa = matchScore(m, 'scoreA'), sb = matchScore(m, 'scoreB');
        if (sa === '' || sb === '') return;
        const ra = map.get(a), rb = map.get(b);
        ra.gf += sa; ra.ga += sb; rb.gf += sb; rb.ga += sa;
        ra.gd = ra.gf - ra.ga; rb.gd = rb.gf - rb.ga;
        if (sa > sb) { ra.w += 1; rb.l += 1; ra.pts += num(state.event?.pointsWin, 3); rb.pts += num(state.event?.pointsLoss, 0); }
        else if (sb > sa) { rb.w += 1; ra.l += 1; rb.pts += num(state.event?.pointsWin, 3); ra.pts += num(state.event?.pointsLoss, 0); }
        else { ra.d += 1; rb.d += 1; ra.pts += num(state.event?.pointsDraw, 1); rb.pts += num(state.event?.pointsDraw, 1); }
      });
      rows.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team));
      rows.forEach((r, i) => { r.rank = i + 1; });
      return [group, rows];
    }).filter(([, rows]) => rows.length);
  }

  function tieBreakRows(state) {
    const rows = [];
    normalizeStandingsEntries(state).forEach(([group, standings]) => {
      const byPts = new Map();
      standings.forEach((r) => {
        const key = String(r.pts);
        if (!byPts.has(key)) byPts.set(key, []);
        byPts.get(key).push(r);
      });
      byPts.forEach((list, pts) => {
        if (list.length > 1) {
          rows.push({
            Group: group,
            TiePoints: Number(pts),
            Teams: list.map((r) => r.team).join(', '),
            DecisionMethod: '',
            FinalOrder: list.map((r) => r.team).join(' > '),
            Note: 'ตรวจคะแนนเท่ากันในสายเดียวกัน'
          });
        }
      });
    });
    return rows;
  }

  function buildPayload() {
    const state = readState();
    const event = state.event || {};
    const exportedAt = nowIso();
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const teams = Array.isArray(state.teams) ? state.teams : [];
    const matches = Array.isArray(state.matches) ? state.matches : [];
    const knockout = Array.isArray(state.knockout) ? state.knockout : [];
    const standingsEntries = normalizeStandingsEntries(state);
    const qualifiedSet = new Set(standingsEntries.flatMap(([, rows]) => rows.slice(0, num(event.qualifiersPerGroup, 2)).map((r) => r.team)));

    const sheets = {
      Event_Setup: [{
        EventName: event.name || '', SportType: event.sportType || '', Preset: event.preset || '',
        GroupCount: event.groupCount || '', CourtCount: event.courtCount || '', StartTime: event.startTime || '',
        MatchInterval: event.matchInterval || '', BreakEverySlots: event.breakEverySlots || '', BreakMinutes: event.breakMinutes || '',
        PointsWin: event.pointsWin ?? 3, PointsDraw: event.pointsDraw ?? 1, PointsLoss: event.pointsLoss ?? 0,
        QualifiersPerGroup: event.qualifiersPerGroup ?? 2, ExportedAt: exportedAt
      }],
      Teams: teams.map((team, i) => ({ TeamID: `T${String(i + 1).padStart(3, '0')}`, TeamName: team, Group: findTeamGroup(groups, team), Seed: i + 1, Status: isBye(team) ? 'BYE' : 'Active' })),
      Groups: Object.entries(groups).flatMap(([group, list]) => (list || []).map((team, i) => ({ Group: group, RankInGroup: i + 1, TeamName: team, IsBye: isBye(team) }))),
      Schedule: matches.map((m, i) => ({
        MatchID: m.id || `M${String(i + 1).padStart(3, '0')}`, Round: m.round || 'Group Stage', Group: m.group || '', Court: m.court || m.field || '', Time: m.time || m.startTime || '',
        TeamA: matchTeam(m, 'teamA'), TeamB: matchTeam(m, 'teamB'), Status: m.status || 'Pending'
      })),
      Scores: matches.map((m, i) => ({
        MatchID: m.id || `M${String(i + 1).padStart(3, '0')}`, Group: m.group || '', TeamA: matchTeam(m, 'teamA'), ScoreA: matchScore(m, 'scoreA'), ScoreB: matchScore(m, 'scoreB'), TeamB: matchTeam(m, 'teamB'),
        Winner: matchWinner(m), Status: m.status || 'Pending', Note: m.note || '', UpdatedAt: m.updatedAt || ''
      })),
      Standings: standingsEntries.flatMap(([group, rows]) => rows.map((r, i) => ({
        Group: group, Rank: r.rank || i + 1, TeamName: r.team, PTS: r.pts, W: r.w, D: r.d, L: r.l, GF: r.gf, GA: r.ga, GD: r.gd, Qualified: qualifiedSet.has(r.team), TieNote: ''
      })),
      Tie_Break: tieBreakRows(state),
      Knockout: knockout.map((m, i) => ({
        MatchID: m.id || `KO${String(i + 1).padStart(2, '0')}`, Round: m.round || m.stage || 'Knockout', TeamA: matchTeam(m, 'teamA'), ScoreA: matchScore(m, 'scoreA'), ScoreB: matchScore(m, 'scoreB'), TeamB: matchTeam(m, 'teamB'),
        Winner: matchWinner(m), Loser: matchLoser(m), NextMatch: nextMatchFor(m), NextSlot: nextSlotFor(m), Status: m.status || 'Pending', UpdatedAt: m.updatedAt || ''
      })),
      Knockout_Flow: knockoutFlowRows(knockout),
      Final_Result: finalResultRows(knockout, exportedAt),
      Export_Log: [{ ExportedAt: exportedAt, Sheets: SHEET_NAMES.join(', '), Version: 'Core Google Sheet', EventName: event.name || '', Note: 'Tournament database export' }]
    };

    return { action: 'writeTournamentDatabase', version: 'core-google-sheet', exportedAt, eventName: event.name || '', sheets };
  }

  function findTeamGroup(groups, team) {
    for (const [group, list] of Object.entries(groups || {})) if ((list || []).includes(team)) return group;
    return '';
  }
  function nextMatchFor(m) {
    const id = clean(m.id).toLowerCase();
    if (id === 'qf1' || id === 'qf2') return 'SF1';
    if (id === 'qf3' || id === 'qf4') return 'SF2';
    if (id === 'sf1' || id === 'sf2') return 'Final';
    return '';
  }
  function nextSlotFor(m) {
    const id = clean(m.id).toLowerCase();
    if (id === 'qf1' || id === 'qf3' || id === 'sf1') return 'TeamA';
    if (id === 'qf2' || id === 'qf4' || id === 'sf2') return 'TeamB';
    return '';
  }
  function knockoutFlowRows(knockout) {
    return knockout.map((m) => ({
      FromMatch: m.id || '', Winner: matchWinner(m), Loser: matchLoser(m), WinnerToMatch: nextMatchFor(m), WinnerToSlot: nextSlotFor(m),
      LoserToMatch: /sf1/i.test(m.id || '') || /sf2/i.test(m.id || '') ? 'Third' : '', LoserToSlot: /sf1/i.test(m.id || '') ? 'TeamA' : (/sf2/i.test(m.id || '') ? 'TeamB' : '')
    }));
  }
  function finalResultRows(knockout, exportedAt) {
    const final = knockout.find((m) => /final/i.test(clean(m.round || m.stage || m.name)) && !/semi/i.test(clean(m.round || m.stage || m.name)));
    const third = knockout.find((m) => /third|3/i.test(clean(m.round || m.stage || m.name)));
    return [{
      Champion: matchWinner(final), RunnerUp: matchLoser(final), ThirdPlace: matchWinner(third), FourthPlace: matchLoser(third),
      FinalScore: final ? `${matchScore(final, 'scoreA')}-${matchScore(final, 'scoreB')}` : '',
      ThirdPlaceScore: third ? `${matchScore(third, 'scoreA')}-${matchScore(third, 'scoreB')}` : '', CompletedAt: exportedAt
    }];
  }

  function ensurePanel() {
    const panel = $('[data-panel="export"]');
    if (!panel) return;
    if ($('#phase55SheetBox')) return;
    const box = document.createElement('section');
    box.id = 'phase55SheetBox';
    box.className = 'phase55-card';
    const head = panel.querySelector('.panel-head');
    if (head) head.insertAdjacentElement('afterend', box);
    else panel.prepend(box);
  }
  function renderPanel() {
    ensurePanel();
    const box = $('#phase55SheetBox');
    if (!box) return;
    const payload = buildPayload();
    const sheetCounts = Object.fromEntries(Object.entries(payload.sheets).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
    box.className = 'phase55-card good';
    box.innerHTML = `
      <div class="phase55-title"><span>Core Google Sheet · Tournament Database</span><span class="phase55-badge good">${SHEET_NAMES.length} Sheets</span></div>
      <div class="phase55-text">ส่งออกข้อมูลการแข่งขันแบบแยกหมวด เพื่อใช้ Google Sheet เป็น Tournament Database</div>
      <div class="phase55-metrics">
        <div class="phase55-metric"><small>Teams</small><b>${sheetCounts.Teams || 0}</b></div>
        <div class="phase55-metric"><small>Matches</small><b>${sheetCounts.Schedule || 0}</b></div>
        <div class="phase55-metric"><small>Standings</small><b>${sheetCounts.Standings || 0}</b></div>
        <div class="phase55-metric"><small>Knockout</small><b>${sheetCounts.Knockout || 0}</b></div>
      </div>
      <div class="phase55-list">
        ${SHEET_NAMES.map((name) => `<div class="phase55-item good">${esc(name)} · ${(sheetCounts[name] ?? 0)} rows</div>`).join('')}
      </div>
      <div class="phase55-actions">
        <button class="btn primary" type="button" id="phase55SendDb">Send Tournament Database</button>
        <button class="btn" type="button" id="phase55CopyPayload">Copy Payload JSON</button>
        <button class="btn" type="button" id="phase55CopyScriptUrl">Copy Apps Script Template Path</button>
      </div>
      <pre class="phase55-code">${esc(JSON.stringify({ action: payload.action, version: payload.version, sheets: sheetCounts }, null, 2))}</pre>
    `;
  }

  async function sendDatabase() {
    const state = readState();
    const webhook = state.webhook || {};
    const url = clean(webhook.url || $('#webhookUrl')?.value || '');
    const token = clean(webhook.token || $('#webhookToken')?.value || '');
    const sheetId = clean(webhook.sheetId || $('#sheetId')?.value || '');
    if (!url) { alert('ยังไม่ได้ตั้ง Apps Script Webhook URL'); return; }
    const payload = buildPayload();
    payload.token = token;
    payload.sheetId = sheetId;
    try {
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      state.webhook = { ...webhook, url, token, sheetId, lastDatabaseExportAt: nowIso() };
      writeState(state);
      toast('ส่ง Tournament Database เข้า Google Sheet แล้ว');
    } catch (err) {
      alert(`ส่ง Google Sheet ไม่สำเร็จ: ${err.message}`);
    }
  }
  async function copyText(text, message) {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    toast(message || 'คัดลอกแล้ว');
  }
  function toast(message) {
    const old = $('.phase55-toast'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'phase55-toast'; box.textContent = message;
    document.body.appendChild(box); setTimeout(() => box.remove(), 2300);
  }
  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('#phase55SendDb')) sendDatabase();
      if (event.target.closest('#phase55CopyPayload')) copyText(JSON.stringify(buildPayload(), null, 2), 'คัดลอก Payload JSON แล้ว');
      if (event.target.closest('#phase55CopyScriptUrl')) copyText('google-apps-script/tournament-database-webhook.gs', 'คัดลอก path Apps Script แล้ว');
      setTimeout(renderPanel, 140);
    });
    window.addEventListener('focus', renderPanel);
    window.addEventListener('storage', renderPanel);
    setInterval(renderPanel, 1800);
  }
  function install() { bind(); renderPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
