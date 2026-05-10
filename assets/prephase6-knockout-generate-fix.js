/* Pre-Phase 6: Knockout Generate Fix V2
   Generates Knockout from state.standings OR the visible Standings text.
   Also reports tied teams per group without blocking generation.
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);

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

  function normalizeGroupName(v) {
    const s = clean(v).replace(/^สาย\s*/i, '').trim();
    return s || clean(v) || '-';
  }

  function rowTeam(r) {
    return clean(r.team || r.name || r.Team || r.title || r.teamName);
  }

  function normalizeRows(rows) {
    let list = [];
    if (Array.isArray(rows)) list = rows.slice();
    else if (rows && typeof rows === 'object') list = Object.entries(rows).map(([team, data]) => ({ team, ...(data || {}) }));
    return list
      .map((r, i) => ({
        ...r,
        rank: asNum(r.rank ?? r.no ?? r.pos ?? (i + 1), i + 1),
        team: rowTeam(r),
        pts: asNum(r.pts ?? r.points ?? r.PTS),
        gd: asNum(r.gd ?? r.diff ?? r.GD),
        gf: asNum(r.gf ?? r.for ?? r.GF),
        w: asNum(r.w ?? r.win ?? r.W)
      }))
      .filter((r) => r.team && !isBye(r.team))
      .sort((a, b) => (a.rank - b.rank) || (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (b.w - a.w) || a.team.localeCompare(b.team));
  }

  function standingsEntriesFromState(state) {
    const standings = state.standings && typeof state.standings === 'object' ? state.standings : {};
    const entries = Object.entries(standings)
      .map(([group, rows]) => [normalizeGroupName(group), normalizeRows(rows)])
      .filter(([, rows]) => rows.length);
    return entries;
  }

  function parseVisibleStandings() {
    const box = $('#standingsBox');
    const text = clean(box?.innerText || '');
    if (!text) return [];
    const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    const groups = [];
    let current = null;
    for (const line of lines) {
      const groupMatch = line.match(/^สาย\s*([A-Zก-ฮ0-9]+)\s*$/i) || line.match(/^Group\s*([A-Z0-9]+)\s*$/i);
      if (groupMatch) {
        current = { group: normalizeGroupName(groupMatch[1]), rows: [] };
        groups.push(current);
        continue;
      }
      const rowMatch = line.match(/^(\d+)\.\s*(.+?)\s+(-?\d+)\s*pts?\b/i);
      if (rowMatch && current) {
        current.rows.push({ rank: Number(rowMatch[1]), team: clean(rowMatch[2]), pts: Number(rowMatch[3]), gd: 0, gf: 0, w: 0, fromVisible: true });
      }
    }
    return groups.map((g) => [g.group, normalizeRows(g.rows)]).filter(([, rows]) => rows.length);
  }

  function standingsEntries(state) {
    const fromState = standingsEntriesFromState(state);
    if (fromState.length) return fromState;
    return parseVisibleStandings();
  }

  function tieGroups(entries) {
    const out = [];
    for (const [group, rows] of entries) {
      const byPts = new Map();
      rows.forEach((r) => {
        const key = String(r.pts);
        if (!byPts.has(key)) byPts.set(key, []);
        byPts.get(key).push(r);
      });
      byPts.forEach((list, pts) => {
        if (list.length > 1) out.push({ group, pts: Number(pts), teams: list.map((r) => r.team), ranks: list.map((r) => r.rank) });
      });
    }
    return out;
  }

  function qualifierGroups(state) {
    const perGroup = Math.max(1, Number(state.event?.qualifiersPerGroup || 2));
    return standingsEntries(state)
      .sort(([a], [b]) => a.localeCompare(b, 'th'))
      .map(([group, rows]) => ({ group, rows: rows.slice(0, perGroup), allRows: rows }));
  }

  function enoughQualifiers(state) {
    const groups = qualifierGroups(state);
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

    const flat = groups.flatMap((g) => g.rows.map((r, idx) => ({ team: r.team, seed: `${g.group}${idx + 1}` })));
    const firstRoundName = flat.length <= 4 ? 'Semi Final' : flat.length <= 8 ? 'Quarter Final' : 'Knockout Round 1';
    const first = [];
    for (let i = 0; i < flat.length; i += 2) {
      first.push(makeMatch(`ko${(i / 2) + 1}`, firstRoundName, flat[i]?.team || '', flat[i + 1]?.team || '', `${flat[i]?.seed || '-'} vs ${flat[i + 1]?.seed || '-'}`));
    }
    if (first.length <= 2) return [...first, makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')];
    return [...first, makeMatch('sf1', 'Semi Final', 'Winner QF1', 'Winner QF2'), makeMatch('sf2', 'Semi Final', 'Winner QF3', 'Winner QF4'), makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')];
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
    state.audit.unshift({ at: new Date().toISOString(), action: 'fallback-generate-knockout-from-standings-v2', data: { total: ko.length, source: standingsEntriesFromState(state).length ? 'state' : 'visible' } });
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

  function renderTieBox(entries) {
    const ties = tieGroups(entries);
    if (!ties.length) return '<div class="pre6-final-preview">ไม่พบทีมคะแนนเท่ากันในสายเดียวกัน</div>';
    return `
      <div class="pre6-round">
        <div class="pre6-round-head">ทีมคะแนนเท่ากัน แยกตามสาย</div>
        ${ties.map((t) => `
          <div class="pre6-match" style="grid-template-columns:120px 1fr;">
            <div class="pre6-team">สาย ${esc(t.group)}</div>
            <div class="pre6-text">${esc(t.teams.join(' / '))} · ${esc(t.pts)} pts · อันดับ ${esc(t.ranks.join(', '))}</div>
          </div>
        `).join('')}
      </div>
      <div class="pre6-final-preview">ระบบจะสร้าง Knockout ตามอันดับที่แสดงอยู่ตอนนี้ก่อน ถ้าหน้างานตัดสินใหม่/จับฉลาก ให้แก้อันดับหรือใช้ Override ก่อนสร้างอีกครั้ง</div>
    `;
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
    const entries = standingsEntries(state);
    const q = enoughQualifiers(state);
    const source = standingsEntriesFromState(state).length ? 'state.standings' : (entries.length ? 'visible standings' : 'none');
    box.className = `pre6-card ${q.ok ? 'good' : 'warn'}`;
    box.innerHTML = `
      <div class="pre6-title"><span>Knockout Generate Check</span><span>${q.ok ? 'พร้อมสร้าง' : 'ยังไม่พร้อม'}</span></div>
      <div class="pre6-text">
        ${q.ok ? `พบ Standings ${q.groups.length} สาย / ทีมเข้ารอบ ${q.total} ทีม · แหล่งข้อมูล: ${esc(source)}` : `พบทีมเข้ารอบ ${q.total} ทีม ต้องมีอย่างน้อย 4 ทีม · แหล่งข้อมูล: ${esc(source)}`}
      </div>
      ${renderTieBox(entries)}
      <div class="pre6-final-preview">ถ้าปุ่ม Generate / Refresh Knockout เดิมยังไม่ทำงาน ให้กด Generate from Standings</div>
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
