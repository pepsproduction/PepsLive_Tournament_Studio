/* Pre-Phase 6: Knockout Scores + OBS Source Fallback Fix V2
   Fixes Knockout score inputs/selects losing focus by pausing auto-render while editing.
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  let lastKnockoutSignature = '';
  let editModeUntil = 0;

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
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function isEditingKnockout() {
    const active = document.activeElement;
    return Date.now() < editModeUntil || !!active?.closest?.('#pre6KnockoutScores');
  }
  function touchEditMode() {
    editModeUntil = Date.now() + 3500;
  }

  function getKnockoutMatches(state) {
    const raw = Array.isArray(state.knockout) ? state.knockout : [];
    return raw.map((m, i) => normalizeKOMatch(m, i)).filter((m) => m.teamA || m.teamB);
  }
  function normalizeKOMatch(m, i) {
    const round = clean(m.round || m.stage || m.name || inferRoundName(i, m));
    const teamA = clean(m.teamA || m.home || m.a || m.teams?.[0] || m.playerA || '');
    const teamB = clean(m.teamB || m.away || m.b || m.teams?.[1] || m.playerB || '');
    return {
      index: i,
      id: clean(m.id || `ko-${i}`),
      round: round || 'Knockout',
      teamA,
      teamB,
      scoreA: m.scoreA ?? m.homeScore ?? m.aScore ?? '',
      scoreB: m.scoreB ?? m.awayScore ?? m.bScore ?? '',
      winner: clean(m.winner || m.winnerTeam || ''),
      status: clean(m.status || '')
    };
  }
  function inferRoundName(i, m) {
    const total = Array.isArray(readState().knockout) ? readState().knockout.length : 0;
    if (/final/i.test(String(m?.type || ''))) return 'Final';
    if (total <= 1) return 'Final';
    if (i >= total - 1) return 'Final';
    if (i >= total - 3) return 'Semi Final';
    return 'Knockout Round 1';
  }
  function roundOrder(name) {
    const s = String(name || '').toLowerCase();
    if (s.includes('final') && !s.includes('semi') && !s.includes('third')) return 99;
    if (s.includes('third') || s.includes('3')) return 98;
    if (s.includes('semi')) return 80;
    if (s.includes('8')) return 40;
    if (s.includes('16')) return 30;
    return 10;
  }
  function groupByRound(matches) {
    const map = new Map();
    matches.forEach((m) => {
      const key = m.round || 'Knockout';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return Array.from(map.entries()).sort((a, b) => roundOrder(a[0]) - roundOrder(b[0]));
  }
  function predictWinner(m) {
    const a = num(m.scoreA); const b = num(m.scoreB);
    if (m.winner) return m.winner;
    if (a == null || b == null || a === b) return '';
    return a > b ? m.teamA : m.teamB;
  }
  function finalPreview(matches) {
    const explicitFinal = matches.find((m) => /final/i.test(m.round) && !/semi/i.test(m.round) && !/third|3/i.test(m.round));
    if (explicitFinal && (explicitFinal.teamA || explicitFinal.teamB)) return [explicitFinal.teamA, explicitFinal.teamB].filter(Boolean);
    const semis = matches.filter((m) => /semi/i.test(m.round));
    return semis.map(predictWinner).filter(Boolean).slice(0, 2);
  }
  function knockoutSignature(matches) {
    return JSON.stringify(matches.map((m) => [m.id, m.round, m.teamA, m.teamB, m.scoreA, m.scoreB, m.winner, m.status]));
  }

  function ensureKnockoutScoresBox() {
    const panel = $('[data-panel="scores"]');
    if (!panel) return null;
    let box = $('#pre6KnockoutScores');
    if (!box) {
      box = document.createElement('section');
      box.id = 'pre6KnockoutScores';
      box.className = 'pre6-card';
      const grid = panel.querySelector('.grid.two.wide-left');
      if (grid) grid.insertAdjacentElement('afterend', box);
      else panel.appendChild(box);
    }
    return box;
  }
  function renderKnockoutScores(force = false) {
    const box = ensureKnockoutScoresBox();
    if (!box) return;
    const state = readState();
    const matches = getKnockoutMatches(state);
    const signature = knockoutSignature(matches);
    if (!force && isEditingKnockout()) return;
    if (!force && signature === lastKnockoutSignature && box.dataset.ready === '1') return;
    lastKnockoutSignature = signature;
    box.dataset.ready = '1';
    const finalTeams = finalPreview(matches);
    box.className = `pre6-card ${matches.length ? 'good' : 'warn'}`;
    if (!matches.length) {
      box.innerHTML = `<div class="pre6-title"><span>Knockout Scores</span><span>ยังไม่มีรอบ Knockout</span></div><div class="pre6-text">สร้าง Knockout ก่อน แล้วระบบจะแสดงช่องกรอกผลรอบต่อไปที่นี่</div>`;
      return;
    }
    box.innerHTML = `
      <div class="pre6-title"><span>Knockout Scores</span><span>${matches.length} คู่</span></div>
      <div class="pre6-text">กรอกผลแพ้ชนะของรอบ Knockout ต่อจากรอบแบ่งกลุ่ม พร้อมแยกหัวข้อแต่ละรอบชัดเจน</div>
      ${finalTeams.length ? `<div class="pre6-final-preview">คู่ชิงที่คาด/กำหนด: ${finalTeams.map(esc).join(' vs ')}</div>` : ''}
      ${groupByRound(matches).map(([round, list]) => `
        <div class="pre6-round">
          <div class="pre6-round-head">${esc(round)}</div>
          ${list.map(matchRow).join('')}
        </div>
      `).join('')}
      <div class="pre6-actions">
        <button class="btn primary" type="button" id="pre6SaveKnockoutScores">Save Knockout Scores</button>
      </div>
    `;
  }
  function matchRow(m) {
    const winnerOptions = ['', m.teamA, m.teamB]
      .filter((v, i) => i === 0 || clean(v))
      .map((t) => `<option value="${esc(t)}" ${t === m.winner ? 'selected' : ''}>${t ? esc(t) : 'เลือกผู้ชนะ'}</option>`)
      .join('');
    return `
      <div class="pre6-match" data-ko-index="${m.index}">
        <div class="pre6-team right" title="${esc(m.teamA)}">${esc(m.teamA || 'รอทีม')}</div>
        <input type="number" class="pre6-ko-score-a" value="${esc(m.scoreA)}" placeholder="0" />
        <div class="pre6-vs">-</div>
        <input type="number" class="pre6-ko-score-b" value="${esc(m.scoreB)}" placeholder="0" />
        <div class="pre6-team" title="${esc(m.teamB)}">${esc(m.teamB || 'รอทีม')}</div>
        <select class="pre6-ko-winner">${winnerOptions}</select>
      </div>
    `;
  }
  function saveKnockoutScores() {
    const state = readState();
    if (!Array.isArray(state.knockout)) return;
    $$('.pre6-match').forEach((row) => {
      const i = Number(row.dataset.koIndex);
      const m = state.knockout[i];
      if (!m) return;
      const a = row.querySelector('.pre6-ko-score-a')?.value ?? '';
      const b = row.querySelector('.pre6-ko-score-b')?.value ?? '';
      const winner = row.querySelector('.pre6-ko-winner')?.value || '';
      m.scoreA = a === '' ? '' : Number(a);
      m.scoreB = b === '' ? '' : Number(b);
      m.winner = winner || inferWinnerFromScores(m);
      m.status = m.winner ? 'Done' : (a !== '' || b !== '' ? 'Pending' : (m.status || 'Pending'));
    });
    state.lastResult = findLatestKnockoutResult(state) || state.lastResult;
    writeState(state);
    editModeUntil = 0;
    lastKnockoutSignature = '';
    toast('บันทึกผล Knockout แล้ว');
    renderKnockoutScores(true);
  }
  function inferWinnerFromScores(m) {
    const a = num(m.scoreA); const b = num(m.scoreB);
    const teamA = clean(m.teamA || m.home || m.a || m.teams?.[0]);
    const teamB = clean(m.teamB || m.away || m.b || m.teams?.[1]);
    if (a == null || b == null || a === b) return '';
    return a > b ? teamA : teamB;
  }
  function findLatestKnockoutResult(state) {
    const done = getKnockoutMatches(state).reverse().find((m) => m.winner || clean(m.status).toLowerCase() === 'done');
    if (!done) return null;
    return { teamA: done.teamA, teamB: done.teamB, scoreA: done.scoreA, scoreB: done.scoreB, round: done.round, status: 'Done' };
  }

  function renderSourceFallback() {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (!['groups', 'standings'].includes(view)) return;
    const root = $('#sourceRoot') || document.body;
    const app = $('#app');
    if (app) app.style.display = 'none';
    const paint = () => {
      const state = readState();
      document.body.className = `pre6-source-body ${state.settings?.sourceBg || 'dark'}`;
      root.classList.remove('hidden');
      root.innerHTML = view === 'groups' ? renderGroupsSource(state) : renderStandingsSource(state);
    };
    paint();
    setInterval(paint, 1200);
  }
  function renderGroupsSource(state) {
    const groups = state.groups && Object.keys(state.groups).length ? state.groups : (state.pendingGroups || {});
    const entries = Object.entries(groups);
    if (!entries.length) return emptySource('Groups Table', 'ยังไม่มีผลแบ่งสาย ให้ Confirm Draw ก่อน');
    return `
      <div class="pre6-source-wrap">
        <div class="pre6-source-head"><div><div class="pre6-source-title">Groups Table</div><div class="pre6-source-sub">${esc(state.event?.name || 'PepsLive Tournament')}</div></div></div>
        <div class="pre6-source-grid">
          ${entries.map(([group, teams]) => `
            <div class="pre6-source-card"><h2>สาย ${esc(group)}</h2><div class="pre6-source-list">
              ${(teams || []).filter((t) => clean(t)).map((team, i) => `
                <div class="pre6-source-row"><span class="idx">${i + 1}</span><span class="team">${esc(team)}</span><span class="meta">${isBye(team) ? 'BYE' : ''}</span></div>
              `).join('')}
            </div></div>
          `).join('')}
        </div>
      </div>
    `;
  }
  function standingsRows(state) {
    const s = state.standings && typeof state.standings === 'object' ? state.standings : {};
    if (Object.keys(s).length) return Object.entries(s).map(([group, rows]) => [group, Array.isArray(rows) ? rows : Object.entries(rows || {}).map(([team, data]) => ({ team, ...(data || {}) }))]);
    return computeStandingsFallback(state);
  }
  function computeStandingsFallback(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const matches = Array.isArray(state.matches) ? state.matches : [];
    return Object.entries(groups).map(([group, teams]) => {
      const rows = (teams || []).filter((t) => clean(t) && !isBye(t)).map((team) => ({ team, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      const map = new Map(rows.map((r) => [r.team, r]));
      matches.forEach((m) => {
        const a = clean(m.teamA), b = clean(m.teamB);
        if (!map.has(a) || !map.has(b) || isBye(a) || isBye(b)) return;
        if (String(m.status || '').toLowerCase() !== 'done') return;
        const sa = num(m.scoreA), sb = num(m.scoreB);
        if (sa == null || sb == null) return;
        const ra = map.get(a), rb = map.get(b);
        ra.gf += sa; ra.ga += sb; rb.gf += sb; rb.ga += sa;
        ra.gd = ra.gf - ra.ga; rb.gd = rb.gf - rb.ga;
        if (sa > sb) { ra.w += 1; rb.l += 1; ra.pts += Number(state.event?.pointsWin ?? 3); rb.pts += Number(state.event?.pointsLoss ?? 0); }
        else if (sb > sa) { rb.w += 1; ra.l += 1; rb.pts += Number(state.event?.pointsWin ?? 3); ra.pts += Number(state.event?.pointsLoss ?? 0); }
        else { ra.d += 1; rb.d += 1; ra.pts += Number(state.event?.pointsDraw ?? 1); rb.pts += Number(state.event?.pointsDraw ?? 1); }
      });
      rows.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team));
      return [group, rows];
    });
  }
  function renderStandingsSource(state) {
    const entries = standingsRows(state).filter(([, rows]) => rows && rows.length);
    if (!entries.length) return emptySource('Standings Table', 'ยังไม่มีตารางคะแนน ให้บันทึก Scores ก่อน');
    return `
      <div class="pre6-source-wrap">
        <div class="pre6-source-head"><div><div class="pre6-source-title">Standings Table</div><div class="pre6-source-sub">${esc(state.event?.name || 'PepsLive Tournament')}</div></div></div>
        <div class="pre6-source-grid">
          ${entries.map(([group, rows]) => `
            <div class="pre6-source-card"><h2>สาย ${esc(group)}</h2>
              <table class="pre6-stand-table"><thead><tr><th>#</th><th>Team</th><th>PTS</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>GF</th></tr></thead><tbody>
              ${(rows || []).filter((r) => !isBye(r.team || r.name)).map((r, i) => `<tr><td>${i + 1}</td><td class="team">${esc(r.team || r.name || '')}</td><td>${esc(r.pts ?? r.points ?? 0)}</td><td>${esc(r.w ?? r.win ?? 0)}</td><td>${esc(r.d ?? r.draw ?? 0)}</td><td>${esc(r.l ?? r.loss ?? 0)}</td><td>${esc(r.gd ?? r.diff ?? 0)}</td><td>${esc(r.gf ?? r.for ?? 0)}</td></tr>`).join('')}
              </tbody></table>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  function emptySource(title, message) {
    return `<div class="pre6-empty"><div><h1>${esc(title)}</h1><p>${esc(message)}</p></div></div>`;
  }
  function toast(message) {
    const old = $('.pre6-toast'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'pre6-toast'; box.textContent = message;
    document.body.appendChild(box); setTimeout(() => box.remove(), 2200);
  }
  function bind() {
    document.addEventListener('focusin', (event) => {
      if (event.target.closest('#pre6KnockoutScores')) touchEditMode();
    });
    document.addEventListener('input', (event) => {
      if (event.target.closest('#pre6KnockoutScores')) touchEditMode();
    });
    document.addEventListener('change', (event) => {
      if (event.target.closest('#pre6KnockoutScores')) touchEditMode();
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('#pre6SaveKnockoutScores')) saveKnockoutScores();
    });
    window.addEventListener('focus', () => renderKnockoutScores(false));
    window.addEventListener('storage', () => renderKnockoutScores(false));
    setInterval(() => renderKnockoutScores(false), 1600);
  }
  function install() {
    renderSourceFallback();
    bind();
    renderKnockoutScores(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
