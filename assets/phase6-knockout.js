/* Phase 6: Knockout Stability
   Adds Knockout Health, Tie Resolver, and bracket generation from resolved standings.
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

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
  function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

  function getStandingsEntries(state) {
    const standings = state.standings && typeof state.standings === 'object' ? state.standings : {};
    const entries = Object.entries(standings).map(([group, rows]) => [clean(group).replace(/^สาย\s*/i, '') || group, normalizeRows(rows)]).filter(([, rows]) => rows.length);
    return entries.length ? entries : parseVisibleStandings();
  }
  function normalizeRows(rows) {
    let list = [];
    if (Array.isArray(rows)) list = rows.slice();
    else if (rows && typeof rows === 'object') list = Object.entries(rows).map(([team, data]) => ({ team, ...(data || {}) }));
    return list.map((r, i) => ({
      rank: num(r.rank ?? r.no ?? r.pos ?? (i + 1), i + 1),
      team: clean(r.team || r.name || r.Team || r.title),
      pts: num(r.pts ?? r.points ?? r.PTS),
      gd: num(r.gd ?? r.diff ?? r.GD),
      gf: num(r.gf ?? r.for ?? r.GF),
      w: num(r.w ?? r.win ?? r.W)
    })).filter((r) => r.team && !isBye(r.team)).sort((a, b) => a.rank - b.rank);
  }
  function parseVisibleStandings() {
    const text = clean($('#standingsBox')?.innerText || '');
    if (!text) return [];
    const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    const groups = [];
    let current = null;
    lines.forEach((line) => {
      const gm = line.match(/^สาย\s*([A-Zก-ฮ0-9]+)$/i) || line.match(/^Group\s*([A-Z0-9]+)$/i);
      if (gm) { current = { group: gm[1], rows: [] }; groups.push(current); return; }
      const rm = line.match(/^(\d+)\.\s*(.+?)\s+(-?\d+)\s*pts?\b/i);
      if (rm && current) current.rows.push({ rank: Number(rm[1]), team: clean(rm[2]), pts: Number(rm[3]), gd: 0, gf: 0, w: 0 });
    });
    return groups.map((g) => [g.group, normalizeRows(g.rows)]).filter(([, rows]) => rows.length);
  }
  function getTieGroups(entries) {
    const out = [];
    entries.forEach(([group, rows]) => {
      const byPts = new Map();
      rows.forEach((r) => {
        const key = String(r.pts);
        if (!byPts.has(key)) byPts.set(key, []);
        byPts.get(key).push(r);
      });
      byPts.forEach((list, pts) => {
        if (list.length > 1) out.push({ group, pts: Number(pts), teams: list.map((r) => r.team), ranks: list.map((r) => r.rank) });
      });
    });
    return out;
  }
  function getResolvedEntries(state) {
    const entries = getStandingsEntries(state);
    const overrides = state.tieResolvers || {};
    return entries.map(([group, rows]) => {
      const resolved = rows.slice();
      const ties = getTieGroups([[group, rows]]);
      ties.forEach((tie) => {
        const key = tieKey(tie);
        const order = Array.isArray(overrides[key]?.order) ? overrides[key].order : [];
        if (!order.length) return;
        const tiedSet = new Set(tie.teams);
        const tiedRows = resolved.filter((r) => tiedSet.has(r.team));
        const untied = resolved.filter((r) => !tiedSet.has(r.team));
        const ordered = order.map((name) => tiedRows.find((r) => r.team === name)).filter(Boolean);
        tiedRows.forEach((r) => { if (!ordered.includes(r)) ordered.push(r); });
        const insertAt = Math.min(...tiedRows.map((r) => resolved.indexOf(r)));
        const nextRows = untied.slice();
        nextRows.splice(insertAt, 0, ...ordered);
        resolved.splice(0, resolved.length, ...nextRows);
      });
      resolved.forEach((r, i) => { r.rank = i + 1; });
      return [group, resolved];
    });
  }
  function tieKey(tie) { return `${tie.group}|${tie.pts}|${tie.teams.slice().sort().join(',')}`; }

  function makeMatch(id, round, teamA, teamB, label) {
    return { id, round, label: label || id.toUpperCase(), teamA: teamA || '', teamB: teamB || '', scoreA: '', scoreB: '', winner: '', status: 'Pending' };
  }
  function buildBracketFromEntries(entries, state) {
    const per = Math.max(1, num(state.event?.qualifiersPerGroup, 2));
    const groups = entries.sort(([a], [b]) => String(a).localeCompare(String(b), 'th')).map(([group, rows]) => ({ group, rows: rows.slice(0, per) }));
    const total = groups.reduce((sum, g) => sum + g.rows.length, 0);
    if (groups.length >= 4 && groups.every((g) => g.rows.length >= 2)) {
      const A = groups[0], B = groups[1], C = groups[2], D = groups[3];
      const ko = [
        makeMatch('qf1', 'Quarter Final', A.rows[0].team, B.rows[1].team, `${A.group}1 vs ${B.group}2`),
        makeMatch('qf2', 'Quarter Final', C.rows[0].team, D.rows[1].team, `${C.group}1 vs ${D.group}2`),
        makeMatch('qf3', 'Quarter Final', B.rows[0].team, A.rows[1].team, `${B.group}1 vs ${A.group}2`),
        makeMatch('qf4', 'Quarter Final', D.rows[0].team, C.rows[1].team, `${D.group}1 vs ${C.group}2`),
        makeMatch('sf1', 'Semi Final', 'Winner QF1', 'Winner QF2'),
        makeMatch('sf2', 'Semi Final', 'Winner QF3', 'Winner QF4'),
        makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')
      ];
      if (state.event?.enableThird !== false) ko.push(makeMatch('third', 'Third Place', 'Loser SF1', 'Loser SF2'));
      return ko;
    }
    const flat = groups.flatMap((g) => g.rows.map((r, i) => ({ team: r.team, seed: `${g.group}${i + 1}` })));
    if (total < 4) return [];
    const round = flat.length <= 4 ? 'Semi Final' : 'Quarter Final';
    const first = [];
    for (let i = 0; i < flat.length; i += 2) first.push(makeMatch(`ko${i / 2 + 1}`, round, flat[i]?.team || '', flat[i + 1]?.team || '', `${flat[i]?.seed || '-'} vs ${flat[i + 1]?.seed || '-'}`));
    return [...first, makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')];
  }

  function analyzeKnockout(state) {
    const ko = Array.isArray(state.knockout) ? state.knockout : [];
    const realTeams = [];
    const placeholders = [];
    const byes = [];
    ko.forEach((m) => ['teamA', 'teamB'].forEach((side) => {
      const team = clean(m[side]);
      if (!team) return;
      if (isBye(team)) byes.push(`${m.id || m.round}: ${team}`);
      else if (/^(winner|loser|รอทีม)/i.test(team)) placeholders.push(`${m.id || m.round}: ${team}`);
      else realTeams.push(`${m.round || ''}|${m.id || ''}|${team}`);
    }));
    const firstRoundTeams = new Map();
    ko.filter((m) => /quarter|knockout|semi/i.test(clean(m.round))).slice(0, 8).forEach((m) => ['teamA', 'teamB'].forEach((side) => {
      const team = clean(m[side]);
      if (!team || isBye(team) || /^(winner|loser)/i.test(team)) return;
      firstRoundTeams.set(team, (firstRoundTeams.get(team) || 0) + 1);
    }));
    const duplicates = Array.from(firstRoundTeams.entries()).filter(([, n]) => n > 1).map(([t, n]) => `${t} x${n}`);
    const final = ko.find((m) => /final/i.test(clean(m.round)) && !/semi/i.test(clean(m.round)) && !/third|3/i.test(clean(m.round)));
    return { ko, count: ko.length, byes, placeholders, duplicates, finalReady: !!(final && clean(final.teamA) && clean(final.teamB) && !/^winner/i.test(clean(final.teamA)) && !/^winner/i.test(clean(final.teamB))) };
  }

  function ensureHealthBox() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return null;
    let box = $('#phase6KnockoutHealth');
    if (!box) {
      box = document.createElement('section');
      box.id = 'phase6KnockoutHealth';
      box.className = 'phase6-card';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    return box;
  }
  function renderHealth() {
    const box = ensureHealthBox();
    if (!box) return;
    const state = readState();
    const h = analyzeKnockout(state);
    const good = h.count && !h.byes.length && !h.duplicates.length;
    box.className = `phase6-card ${good ? 'good' : 'warn'}`;
    box.innerHTML = `
      <div class="phase6-title"><span>Phase 6 · Knockout Health</span><span class="phase6-badge ${good ? 'good' : 'warn'}">${good ? 'Bracket OK' : 'ต้องตรวจ'}</span></div>
      <div class="phase6-metrics">
        <div class="phase6-metric"><small>Matches</small><b>${h.count}</b></div>
        <div class="phase6-metric"><small>BYE</small><b>${h.byes.length}</b></div>
        <div class="phase6-metric"><small>Duplicate</small><b>${h.duplicates.length}</b></div>
        <div class="phase6-metric"><small>Final Ready</small><b>${h.finalReady ? 'YES' : 'NO'}</b></div>
      </div>
      <div class="phase6-list">
        ${h.count ? item(`มี Knockout ${h.count} คู่/ช่อง`, 'good') : item('ยังไม่มี Knockout', 'warn')}
        ${h.byes.length ? item(`พบ BYE ใน Knockout: ${h.byes.join(', ')}`, 'bad') : item('ไม่พบ BYE ใน Knockout', 'good')}
        ${h.duplicates.length ? item(`พบทีมซ้ำในรอบแรก: ${h.duplicates.join(', ')}`, 'bad') : item('ไม่พบทีมซ้ำในรอบแรก', 'good')}
        ${h.placeholders.length ? item(`ยังมีช่องรอผล: ${h.placeholders.slice(0, 6).join(', ')}`, 'warn') : item('ไม่มีช่องรอผลค้าง', 'good')}
      </div>
    `;
  }
  function item(text, type) { return `<div class="phase6-item ${type || ''}">${esc(text)}</div>`; }

  function ensureTieBox() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return null;
    let box = $('#phase6TieResolver');
    if (!box) {
      box = document.createElement('section');
      box.id = 'phase6TieResolver';
      box.className = 'phase6-card';
      const health = $('#phase6KnockoutHealth');
      if (health) health.insertAdjacentElement('afterend', box);
      else panel.appendChild(box);
    }
    return box;
  }
  function renderTieResolver() {
    const box = ensureTieBox();
    if (!box) return;
    const state = readState();
    const entries = getStandingsEntries(state);
    const ties = getTieGroups(entries);
    box.className = `phase6-card ${ties.length ? 'warn' : 'good'}`;
    box.innerHTML = `
      <div class="phase6-title"><span>Phase 6 · Tie Resolver</span><span class="phase6-badge ${ties.length ? 'warn' : 'good'}">${ties.length ? `${ties.length} กลุ่มคะแนนเท่ากัน` : 'ไม่มีคะแนนเท่ากัน'}</span></div>
      <div class="phase6-text">ถ้ามีทีมคะแนนเท่ากันในสายเดียวกัน ให้เรียงชื่อในช่องตามลำดับที่กรรมการตัดสิน หรือกดสุ่มเฉพาะกลุ่มนั้น แล้วสร้าง Knockout จากลำดับที่แก้แล้ว</div>
      ${ties.length ? ties.map(renderTie).join('') : '<div class="phase6-list"><div class="phase6-item good">ไม่พบทีมคะแนนเท่ากันในสายเดียวกัน</div></div>'}
      <div class="phase6-actions">
        <button class="btn good" type="button" id="phase6GenerateResolved">Generate Knockout from Resolved Order</button>
      </div>
    `;
  }
  function renderTie(tie) {
    const state = readState();
    const saved = state.tieResolvers?.[tieKey(tie)]?.order || tie.teams;
    return `
      <div class="phase6-tie" data-tie-key="${esc(tieKey(tie))}" data-teams="${esc(tie.teams.join('|'))}">
        <div class="phase6-tie-head">สาย ${esc(tie.group)} · ${esc(tie.pts)} pts · อันดับ ${esc(tie.ranks.join(', '))}</div>
        <textarea class="phase6-tie-order">${esc(saved.join('\n'))}</textarea>
        <div class="phase6-actions">
          <button class="btn" type="button" data-phase6-save-tie>Save Order</button>
          <button class="btn" type="button" data-phase6-random-tie>Draw Lots</button>
        </div>
      </div>
    `;
  }
  function saveTieOrder(root) {
    const state = readState();
    state.tieResolvers = state.tieResolvers || {};
    const key = root.dataset.tieKey;
    const teams = (root.dataset.teams || '').split('|').filter(Boolean);
    const typed = clean(root.querySelector('.phase6-tie-order')?.value || '').split(/\r?\n/).map(clean).filter(Boolean);
    const valid = typed.filter((t) => teams.includes(t));
    teams.forEach((t) => { if (!valid.includes(t)) valid.push(t); });
    state.tieResolvers[key] = { order: valid, method: 'manual', updatedAt: new Date().toISOString() };
    writeState(state);
    toast('บันทึกลำดับคะแนนเท่ากันแล้ว');
    renderTieResolver();
  }
  function randomTieOrder(root) {
    const teams = (root.dataset.teams || '').split('|').filter(Boolean);
    const shuffled = teams.slice().sort(() => Math.random() - 0.5);
    root.querySelector('.phase6-tie-order').value = shuffled.join('\n');
    saveTieOrder(root);
  }
  function generateResolved() {
    const state = readState();
    const entries = getResolvedEntries(state);
    const ko = buildBracketFromEntries(entries, state);
    if (!ko.length) { alert('ยังสร้าง Knockout ไม่ได้: ทีมเข้ารอบไม่พอ'); return; }
    state.knockout = ko;
    state.audit = Array.isArray(state.audit) ? state.audit : [];
    state.audit.unshift({ at: new Date().toISOString(), action: 'phase6-generate-knockout-from-resolved-order', data: { matches: ko.length } });
    writeState(state);
    toast('สร้าง Knockout จากลำดับที่แก้แล้ว');
    setTimeout(() => location.reload(), 450);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const save = event.target.closest('[data-phase6-save-tie]');
      if (save) saveTieOrder(save.closest('.phase6-tie'));
      const rnd = event.target.closest('[data-phase6-random-tie]');
      if (rnd) randomTieOrder(rnd.closest('.phase6-tie'));
      if (event.target.closest('#phase6GenerateResolved')) generateResolved();
      setTimeout(refresh, 160);
    });
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    setInterval(refresh, 1800);
  }
  function toast(message) {
    const old = $('.phase6-toast'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'phase6-toast'; box.textContent = message;
    document.body.appendChild(box); setTimeout(() => box.remove(), 2400);
  }
  function refresh() { renderHealth(); renderTieResolver(); }
  function install() { bind(); refresh(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
