/* Core Scores: Scores & Standings Stability
   Replaces assets/phase5-scores.js.
   Scope: Scores health, standings readiness, knockout readiness, and standings render repair.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_SCORES_INSTALLED__) return;
  window.__PEPSLIVE_CORE_SCORES_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function cleanText(v) { return String(v ?? '').trim(); }
  function isBye(v) { return cleanText(v).toUpperCase() === 'BYE'; }
  function asNum(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  function getMatches(state) { return Array.isArray(state.matches) ? state.matches : []; }
  function realMatches(state) { return getMatches(state).filter((m) => !isBye(teamOf(m, 'teamA')) && !isBye(teamOf(m, 'teamB'))); }
  function isDone(m) { return String(m?.status || '').toLowerCase() === 'done'; }
  function teamOf(m, side) { return cleanText(m?.[side] || m?.[side === 'teamA' ? 'home' : 'away'] || m?.teams?.[side === 'teamA' ? 0 : 1] || ''); }
  function scoreValue(m, key) {
    const v = m?.[key];
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  function hasAnyScore(m) { return scoreValue(m, 'scoreA') !== null || scoreValue(m, 'scoreB') !== null; }
  function matchName(m) { return `${teamOf(m, 'teamA') || 'Team A'} vs ${teamOf(m, 'teamB') || 'Team B'}`; }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function row(text, type = '') { return `<div class="phase5-item ${type}">${escapeHtml(text)}</div>`; }

  function normalizeStandingRow(r, i = 0) {
    const team = cleanText(r?.team || r?.name || r?.Team || r?.title || r?.teamName || '');
    return {
      rank: asNum(r?.rank ?? r?.no ?? r?.pos ?? (i + 1), i + 1),
      team,
      pts: asNum(r?.pts ?? r?.points ?? r?.PTS),
      w: asNum(r?.w ?? r?.win ?? r?.W),
      d: asNum(r?.d ?? r?.draw ?? r?.D),
      l: asNum(r?.l ?? r?.loss ?? r?.L),
      gf: asNum(r?.gf ?? r?.for ?? r?.GF),
      ga: asNum(r?.ga ?? r?.against ?? r?.GA),
      gd: asNum(r?.gd ?? r?.diff ?? r?.GD)
    };
  }

  function standingsEntriesFromState(state) {
    const s = state.standings && typeof state.standings === 'object' ? state.standings : {};
    return Object.entries(s).map(([group, list]) => {
      let rows = [];
      if (Array.isArray(list)) rows = list.map(normalizeStandingRow);
      else if (list && typeof list === 'object') rows = Object.entries(list).map(([team, data], i) => normalizeStandingRow({ team, ...(data || {}) }, i));
      rows = rows.filter((r) => r.team && !isBye(r.team));
      rows.sort((a, b) => (a.rank - b.rank) || (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team, 'th'));
      rows.forEach((r, i) => { r.rank = i + 1; });
      return [group, rows];
    }).filter(([, rows]) => rows.length);
  }

  function computeStandingsEntries(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const entries = Object.entries(groups).map(([group, teams]) => {
      const rows = (Array.isArray(teams) ? teams : [])
        .filter((t) => cleanText(t) && !isBye(t))
        .map((team) => ({ rank: 0, team, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      const byTeam = new Map(rows.map((r) => [r.team, r]));

      getMatches(state).forEach((m) => {
        const groupA = cleanText(m.group || m.Group || '');
        if (groupA && groupA !== group) return;
        const a = teamOf(m, 'teamA');
        const b = teamOf(m, 'teamB');
        if (!byTeam.has(a) || !byTeam.has(b) || isBye(a) || isBye(b) || !isDone(m)) return;
        const sa = scoreValue(m, 'scoreA');
        const sb = scoreValue(m, 'scoreB');
        if (sa === null || sb === null || Number.isNaN(sa) || Number.isNaN(sb)) return;
        const ra = byTeam.get(a);
        const rb = byTeam.get(b);
        ra.gf += sa; ra.ga += sb; ra.gd = ra.gf - ra.ga;
        rb.gf += sb; rb.ga += sa; rb.gd = rb.gf - rb.ga;
        if (sa > sb) {
          ra.w += 1; rb.l += 1;
          ra.pts += asNum(state.event?.pointsWin, 3);
          rb.pts += asNum(state.event?.pointsLoss, 0);
        } else if (sb > sa) {
          rb.w += 1; ra.l += 1;
          rb.pts += asNum(state.event?.pointsWin, 3);
          ra.pts += asNum(state.event?.pointsLoss, 0);
        } else {
          ra.d += 1; rb.d += 1;
          ra.pts += asNum(state.event?.pointsDraw, 1);
          rb.pts += asNum(state.event?.pointsDraw, 1);
        }
      });

      rows.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (b.w - a.w) || a.team.localeCompare(b.team, 'th'));
      rows.forEach((r, i) => { r.rank = i + 1; });
      return [group, rows];
    }).filter(([, rows]) => rows.length);
    return entries;
  }

  function standingsEntries(state) {
    const fromState = standingsEntriesFromState(state);
    return fromState.length ? fromState : computeStandingsEntries(state);
  }

  function standingsRows(state) {
    return standingsEntries(state).flatMap(([group, rows]) => rows.map((r) => ({ group, ...r })));
  }

  function analyzeScores() {
    const state = readState();
    const real = realMatches(state);
    const done = real.filter(isDone);
    const pending = real.filter((m) => !isDone(m));
    const invalid = [];
    const blankDone = [];
    const partial = [];
    real.forEach((m) => {
      const a = scoreValue(m, 'scoreA');
      const b = scoreValue(m, 'scoreB');
      if (Number.isNaN(a) || Number.isNaN(b)) invalid.push(matchName(m));
      if (isDone(m) && (a === null || b === null)) blankDone.push(matchName(m));
      if (!isDone(m) && hasAnyScore(m)) partial.push(matchName(m));
    });
    const rows = standingsRows(state);
    const byeStanding = rows.filter((r) => isBye(r.team || r.name)).map((r) => r.team || r.name || 'BYE');
    const tieGroups = findTieGroups(rows);
    return { state, real, done, pending, invalid, blankDone, partial, rows, byeStanding, tieGroups };
  }

  function findTieGroups(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const key = `${r.group || '-'}|${Number(r.pts ?? r.points ?? 0)}|${Number(r.gd ?? r.diff ?? 0)}|${Number(r.gf ?? r.for ?? 0)}`;
      const team = cleanText(r.team || r.name || '');
      if (!team || isBye(team)) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(team);
    });
    return Array.from(map.values()).filter((list) => list.length > 1).slice(0, 8);
  }

  function removeOldPanels() {
    const p1 = $('#phase5ScoresHealth');
    if (p1) p1.remove();
    const p2 = $('#phase5KnockoutHint');
    if (p2) p2.remove();
  }

  function renderStandingsRepair() {
    const box = $('#standingsBox');
    if (!box) return;
    const state = readState();
    const entries = standingsEntries(state);
    if (!entries.length) return;

    const text = cleanText(box.innerText || '');
    const hasTeamRows = entries.some(([, rows]) => rows.some((r) => text.includes(r.team)));
    const hasNumbers = /\bPTS\b|\bGD\b|\bGF\b|แต้ม|ผลต่าง/i.test(text);
    if (hasTeamRows && hasNumbers) return;

    box.innerHTML = entries.map(([group, rows]) => `
      <div class="phase5-card good">
        <div class="phase5-title"><span>สาย ${escapeHtml(group)}</span><span class="phase5-badge good">${rows.length} ทีม</span></div>
        <div style="overflow:auto">
          <table class="phase8-table" style="width:100%;border-collapse:collapse">
            <thead><tr><th>#</th><th>Team</th><th>PTS</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th></tr></thead>
            <tbody>
              ${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="team">${escapeHtml(r.team)}</td><td>${r.pts}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  }



  function warnBeforeMarkPending(event) {
    const btn = event.target.closest('#markAllPending');
    if (!btn) return;
    const a = analyzeScores();
    if (!a.done.length && !a.partial.length) return;
    const ok = confirm(`มีผลคะแนนเดิมอยู่แล้ว (${a.done.length} คู่ Done, ${a.partial.length} คู่ Pending ที่มีคะแนน) การตั้งทุกคู่เป็น Pending อาจล้างสถานะผลแข่ง ต้องการทำต่อไหม?`);
    if (ok) return;
    event.preventDefault();
    event.stopPropagation();
    if (window.pepsToast) window.pepsToast('ยกเลิก Mark All Pending เพื่อรักษาคะแนนเดิม', 'info');
  }

  function refresh() {
    removeOldPanels();
    renderStandingsRepair();
  }

  function install() {
    document.addEventListener('click', warnBeforeMarkPending, true);
    document.addEventListener('click', () => setTimeout(refresh, 220));
    document.addEventListener('input', (event) => {
      if (event.target?.closest('#scoresBox')) setTimeout(refresh, 180);
    });
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.setInterval(refresh, 1500);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
