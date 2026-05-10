/* Pre-Phase 6: Knockout Generate Fix
   Allows Knockout generation from existing Standings even when match statuses are not all Done.
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
  function asNum(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

  function standingsEntries(state) {
    const standings = state.standings && typeof state.standings === 'object' ? state.standings : {};
    return Object.entries(standings)
      .map(([group, rows]) => [String(group), normalizeRows(rows)])
      .filter(([, rows]) => rows.length);
  }

  function normalizeRows(rows) {
    let list = [];
    if (Array.isArray(rows)) list = rows.slice();
    else if (rows && typeof rows === 'object') list = Object.entries(rows).map(([team, data]) => ({ team, ...(data || {}) }));
    return list
      .map((r) => ({
        ...r,
        team: clean(r.team || r.name || r.Team || r.title),
        pts: asNum(r.pts ?? r.points ?? r.PTS),
        gd: asNum(r.gd ?? r.diff ?? r.GD),
        gf: asNum(r.gf ?? r.for ?? r.GF),
        w: asNum(r.w ?? r.win ?? r.W)
      }))
      .filter((r) => r.team && !isBye(r.team))
      .sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (b.w - a.w) || a.team.localeCompare(b.team));
  }

  function qualifiersFromStandings(state) {
    const perGroup = Math.max(1, Number(state.event?.qualifiersPerGroup || 2));
    return standingsEntries(state)
      .sort(([a], [b]) => a.localeCompare(b, 'th'))
      .map(([group, rows]) => ({ group, rows: rows.slice(0, perGroup) }));
  }

  function enoughQualifiers(state) {
    const groups = qualifiersFromStandings(state);
    const total = groups.reduce((sum, g) => sum + g.rows.length, 0);
    return { groups, total, ok: groups.length >= 2 && total >= 4 };
  }

  function makeMatch(id, round, teamA, teamB, label) {
    return { id, round, label: label || id.toUpperCase(), teamA: teamA || '', teamB: teamB || '', scoreA: '', scoreB: '', winner: '', status: 'Pending' };
  }

  function buildKnockoutFromStandings(state) {
    const q = enoughQualifiers(state);
    if (!q.ok) return [];
    const groups = q.groups;

    // Common 4 groups x top 2 layout: A1-B2, C1-D2, B1-A2, D1-C2.
    if (groups.length >= 4 && groups.every((g) => g.rows.length >= 2)) {
      const A = groups[0], B = groups[1], C = groups[2], D = groups[3];
      const qf = [
        makeMatch('qf1', 'Quarter Final', A.rows[0].team, B.rows[1].team, `${A.group}1 vs ${B.group}2`),
        makeMatch('qf2', 'Quarter Final', C.rows[0].team, D.rows[1].team, `${C.group}1 vs ${D.group}2`),
        makeMatch('qf3', 'Quarter Final', B.rows[0].team, A.rows[1].team, `${B.group}1 vs ${A.group}2`),
        makeMatch('qf4', 'Quarter Final', D.rows[0].team, C.rows[1].team, `${D.group}1 vs ${C.group}2`)
      ];
      const ko = [
        ...qf,
        makeMatch('sf1', 'Semi Final', 'Winner QF1', 'Winner QF2', 'Winner QF1 vs Winner QF2'),
        makeMatch('sf2', 'Semi Final', 'Winner QF3', 'Winner QF4', 'Winner QF3 vs Winner QF4'),
        makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2', 'Winner SF1 vs Winner SF2')
      ];
      if (state.event?.enableThird !== false) ko.push(makeMatch('third', 'Third Place', 'Loser SF1', 'Loser SF2', 'Loser SF1 vs Loser SF2'));
      return ko;
    }

    // Fallback generic sequential bracket.
    const flat = groups.flatMap((g) => g.rows.map((r, idx) => ({ team: r.team, seed: `${g.group}${idx + 1}` })));
    const firstRoundName = flat.length <= 4 ? 'Semi Final' : flat.length <= 8 ? 'Quarter Final' : 'Knockout Round 1';
    const first = [];
    for (let i = 0; i < flat.length; i += 2) {
      first.push(makeMatch(`ko${(i / 2) + 1}`, firstRoundName, flat[i]?.team || '', flat[i + 1]?.team || '', `${flat[i]?.seed || '-'} vs ${flat[i + 1]?.seed || '-'}`));
    }
    if (first.length <= 2) return [...first, makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')];
    return [...first, makeMatch('sf1', 'Semi Final', 'Winner QF1', 'Winner QF2'), makeMatch('sf2', 'Semi Final', 'Winner QF3', 'Winner QF4'), makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')];
  }

  function winnerOf(m) {
    if (!m) return '';
    if (clean(m.winner)) return clean(m.winner);
    const a = Number(m.scoreA), b = Number(m.scoreB);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return '';
    return a > b ? clean(m.teamA) : clean(m.teamB);
  }
  function loserOf(m) {
    const w = winnerOf(m);
    if (!w) return '';
    const a = clean(m.teamA), b = clean(m.teamB);
    return w === a ? b : a;
  }
  function byId(state, id) { return (state.knockout || []).find((m) => m.id === id); }

  function advanceGeneratedBracket(state) {
    if (!Array.isArray(state.knockout)) return;
    const qf1 = byId(state, 'qf1'), qf2 = byId(state, 'qf2'), qf3 = byId(state, 'qf3'), qf4 = byId(state, 'qf4');
    const sf1 = byId(state, 'sf1'), sf2 = byId(state, 'sf2'), final = byId(state, 'final'), third = byId(state, 'third');
    if (sf1) { sf1.teamA = winnerOf(qf1) || sf1.teamA || 'Winner QF1'; sf1.teamB = winnerOf(qf2) || sf1.teamB || 'Winner QF2'; }
    if (sf2) { sf2.teamA = winnerOf(qf3) || sf2.teamA || 'Winner QF3'; sf2.teamB = winnerOf(qf4) || sf2.teamB || 'Winner QF4'; }
    if (final) { final.teamA = winnerOf(sf1) || final.teamA || 'Winner SF1'; final.teamB = winnerOf(sf2) || final.teamB || 'Winner SF2'; }
    if (third) { third.teamA = loserOf(sf1) || third.teamA || 'Loser SF1'; third.teamB = loserOf(sf2) || third.teamB || 'Loser SF2'; }
  }

  function generateFromStandings() {
    const state = readState();
    const q = enoughQualifiers(state);
    if (!q.ok) {
      alert('ยังสร้าง Knockout ไม่ได้: ต้องมี Standings อย่างน้อย 2 สาย และทีมเข้ารอบรวมอย่างน้อย 4 ทีม');
      return;
    }
    const ko = buildKnockoutFromStandings(state);
    state.knockout = ko;
    state.qualifierOverrides = state.qualifierOverrides || {};
    state.audit = Array.isArray(state.audit) ? state.audit : [];
    state.audit.unshift({ at: new Date().toISOString(), action: 'fallback-generate-knockout-from-standings', data: { total: ko.length } });
    state.audit = state.audit.slice(0, 100);
    writeState(state);
    toast(`สร้าง Knockout จาก Standings แล้ว ${ko.length} คู่/ช่อง`);
    setTimeout(() => location.reload(), 450);
  }

  function ensureButton() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return;
    const state = readState();
    const q = enoughQualifiers(state);
    const coreBtn = $('#generateKnockout');
    if (coreBtn && q.ok) {
      coreBtn.disabled = false;
      coreBtn.classList.remove('phase2-disabled');
      coreBtn.title = 'มี Standings แล้ว สามารถ Generate Knockout ได้';
    }
    if ($('#pre6GenerateFromStandings')) return;
    const row = coreBtn?.parentElement || panel.querySelector('.row');
    if (!row) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn good';
    btn.id = 'pre6GenerateFromStandings';
    btn.textContent = 'Generate from Standings';
    row.appendChild(btn);
  }

  function renderHint() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return;
    let box = $('#pre6KnockoutGenerateHint');
    if (!box) {
      box = document.createElement('section');
      box.id = 'pre6KnockoutGenerateHint';
      box.className = 'pre6-card warn';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    const state = readState();
    const q = enoughQualifiers(state);
    box.className = `pre6-card ${q.ok ? 'good' : 'warn'}`;
    box.innerHTML = `
      <div class="pre6-title"><span>Knockout Generate Check</span><span>${q.ok ? 'พร้อมสร้าง' : 'ยังไม่พร้อม'}</span></div>
      <div class="pre6-text">
        ${q.ok ? `พบ Standings ${q.groups.length} สาย / ทีมเข้ารอบ ${q.total} ทีม สามารถสร้าง Knockout ได้` : `พบทีมเข้ารอบ ${q.total} ทีม ต้องมีอย่างน้อย 4 ทีม`}
      </div>
      <div class="pre6-final-preview">ถ้า Guard เดิมล็อกปุ่ม ให้ใช้ปุ่ม Generate from Standings เพื่อสร้างสายจากอันดับ Standings โดยตรง</div>
    `;
  }

  function toast(message) {
    const old = $('.pre6-toast'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'pre6-toast'; box.textContent = message;
    document.body.appendChild(box); setTimeout(() => box.remove(), 2200);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('#pre6GenerateFromStandings')) generateFromStandings();
      if (event.target.closest('#pre6SaveKnockoutScores')) {
        setTimeout(() => {
          const state = readState();
          advanceGeneratedBracket(state);
          writeState(state);
        }, 120);
      }
      setTimeout(refresh, 200);
    }, true);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    setInterval(refresh, 1200);
  }

  function refresh() {
    ensureButton();
    renderHint();
  }

  function install() {
    bind();
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
