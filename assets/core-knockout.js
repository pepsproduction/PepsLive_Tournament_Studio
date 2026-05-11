/* Phase 10: Core Knockout Merge
   Canonical knockout module for PepsLive Tournament Studio.
   Merged from:
   - phase6-knockout.js
   - prephase6-knockout-generate-fix.js
   - Knockout Scores + winner advance from prephase6-knockout-source-fix.js
   Final rule: one bracket generator, one standings parser, one winner advance flow.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_KNOCKOUT_INSTALLED__) return;
  window.__PEPSLIVE_CORE_KNOCKOUT_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  let lastKnockoutSignature = '';
  let editModeUntil = 0;
  let refreshTimer = null;

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function writeState(state, action = 'core-knockout-save', data = {}) {
    state.updatedAt = new Date().toISOString();
    state.audit = Array.isArray(state.audit) ? state.audit : [];
    state.audit.unshift({ at: state.updatedAt, action, data });
    state.audit = state.audit.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('pepslive-core-knockout-updated', { detail: { action, data } }));
  }

  function clean(v) { return String(v ?? '').trim(); }
  function isBye(v) { return clean(v).toUpperCase() === 'BYE'; }
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function asNum(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  function nullableNum(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function normalizeGroupName(v) {
    const s = clean(v).replace(/^สาย\s*/i, '').replace(/^group\s*/i, '').trim();
    return s || clean(v) || '-';
  }
  function rowTeam(r) { return clean(r?.team || r?.name || r?.Team || r?.title || r?.teamName); }

  // ---------------------------------------------------------------------------
  // Canonical standings parser
  // ---------------------------------------------------------------------------
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
        ga: asNum(r.ga ?? r.against ?? r.GA),
        w: asNum(r.w ?? r.win ?? r.W),
        d: asNum(r.d ?? r.draw ?? r.D),
        l: asNum(r.l ?? r.loss ?? r.L)
      }))
      .filter((r) => r.team && !isBye(r.team))
      .sort((a, b) =>
        (a.rank - b.rank) ||
        (b.pts - a.pts) ||
        (b.gd - a.gd) ||
        (b.gf - a.gf) ||
        (b.w - a.w) ||
        a.team.localeCompare(b.team, 'th')
      );
  }

  function standingsEntriesFromState(state) {
    const standings = state.standings && typeof state.standings === 'object' ? state.standings : {};
    return Object.entries(standings)
      .map(([group, rows]) => [normalizeGroupName(group), normalizeRows(rows)])
      .filter(([, rows]) => rows.length);
  }

  function parseVisibleStandings() {
    const text = clean($('#standingsBox')?.innerText || '');
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
        current.rows.push({
          rank: Number(rowMatch[1]),
          team: clean(rowMatch[2]),
          pts: Number(rowMatch[3]),
          gd: 0,
          gf: 0,
          ga: 0,
          w: 0,
          d: 0,
          l: 0,
          fromVisible: true
        });
      }
    }

    return groups.map((g) => [g.group, normalizeRows(g.rows)]).filter(([, rows]) => rows.length);
  }

  function standingsEntries(state) {
    const fromState = standingsEntriesFromState(state);
    return fromState.length ? fromState : parseVisibleStandings();
  }

  function tieKey(tie) { return `${tie.group}|${tie.pts}|${tie.teams.slice().sort().join(',')}`; }

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
        if (list.length > 1) out.push({
          group,
          pts: Number(pts),
          teams: list.map((r) => r.team),
          ranks: list.map((r) => r.rank)
        });
      });
    }
    return out;
  }

  function resolvedStandingsEntries(state) {
    const entries = standingsEntries(state);
    const overrides = state.tieResolvers || {};

    return entries.map(([group, rows]) => {
      const resolved = rows.slice();
      const ties = tieGroups([[group, rows]]);

      ties.forEach((tie) => {
        const savedOrder = Array.isArray(overrides[tieKey(tie)]?.order) ? overrides[tieKey(tie)].order : [];
        if (!savedOrder.length) return;

        const tiedSet = new Set(tie.teams);
        const tiedRows = resolved.filter((r) => tiedSet.has(r.team));
        const untied = resolved.filter((r) => !tiedSet.has(r.team));
        const ordered = savedOrder.map((name) => tiedRows.find((r) => r.team === name)).filter(Boolean);
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

  // ---------------------------------------------------------------------------
  // Canonical bracket generator
  // ---------------------------------------------------------------------------
  function makeMatch(id, round, teamA, teamB, label) {
    return {
      id,
      round,
      label: label || id.toUpperCase(),
      teamA: teamA || '',
      teamB: teamB || '',
      scoreA: '',
      scoreB: '',
      winner: '',
      status: 'Pending'
    };
  }

  function qualifierGroups(state, entries) {
    const perGroup = Math.max(1, Number(state.event?.qualifiersPerGroup || 2));
    return (entries || standingsEntries(state))
      .sort(([a], [b]) => String(a).localeCompare(String(b), 'th'))
      .map(([group, rows]) => ({ group, rows: rows.slice(0, perGroup), allRows: rows }));
  }

  function qualifierSummary(state, entries) {
    const groups = qualifierGroups(state, entries);
    const total = groups.reduce((sum, g) => sum + g.rows.length, 0);
    return { groups, total, ok: groups.length >= 2 && total >= 4 };
  }

  function buildBracketFromEntries(entries, state) {
    const q = qualifierSummary(state, entries);
    if (!q.ok) return [];
    const groups = q.groups;

    if (groups.length >= 4 && groups.every((g) => g.rows.length >= 2)) {
      const A = groups[0], B = groups[1], C = groups[2], D = groups[3];
      const ko = [
        makeMatch('qf1', 'Quarter Final', A.rows[0].team, B.rows[1].team, `${A.group}1 vs ${B.group}2`),
        makeMatch('qf2', 'Quarter Final', C.rows[0].team, D.rows[1].team, `${C.group}1 vs ${D.group}2`),
        makeMatch('qf3', 'Quarter Final', B.rows[0].team, A.rows[1].team, `${B.group}1 vs ${A.group}2`),
        makeMatch('qf4', 'Quarter Final', D.rows[0].team, C.rows[1].team, `${D.group}1 vs ${C.group}2`),
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
    return [
      ...first,
      makeMatch('sf1', 'Semi Final', 'Winner QF1', 'Winner QF2'),
      makeMatch('sf2', 'Semi Final', 'Winner QF3', 'Winner QF4'),
      makeMatch('final', 'Final', 'Winner SF1', 'Winner SF2')
    ];
  }

  function generateKnockout({ resolved = false } = {}) {
    const state = readState();
    const entries = resolved ? resolvedStandingsEntries(state) : standingsEntries(state);
    const q = qualifierSummary(state, entries);

    if (!q.ok) {
      alert('ยังสร้าง Knockout ไม่ได้: ต้องมี Standings อย่างน้อย 2 สาย และทีมเข้ารอบรวมอย่างน้อย 4 ทีม');
      return;
    }

    const ko = buildBracketFromEntries(entries, state);
    if (!ko.length) {
      alert('ยังสร้าง Knockout ไม่ได้: ทีมเข้ารอบไม่พอ');
      return;
    }

    state.knockout = ko;
    state.qualifierOverrides = state.qualifierOverrides || {};
    writeState(state, resolved ? 'core-knockout-generate-resolved' : 'core-knockout-generate-standings', {
      matches: ko.length,
      source: standingsEntriesFromState(state).length ? 'state.standings' : 'visible standings',
      resolved
    });

    toast(resolved ? 'สร้าง Knockout จากลำดับที่แก้แล้ว' : `สร้าง Knockout จาก Standings แล้ว ${ko.length} คู่/ช่อง`);
    setTimeout(() => location.reload(), 350);
  }

  // ---------------------------------------------------------------------------
  // Health + Tie Resolver UI
  // ---------------------------------------------------------------------------
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

  function analyzeKnockout(state) {
    const ko = getKnockoutMatches(state);
    const byes = [];
    const placeholders = [];
    const firstRoundTeams = new Map();

    ko.forEach((m) => ['teamA', 'teamB'].forEach((side) => {
      const team = clean(m[side]);
      if (!team) return;
      if (isBye(team)) byes.push(`${m.id || m.round}: ${team}`);
      else if (/^(winner|loser|รอทีม)/i.test(team)) placeholders.push(`${m.id || m.round}: ${team}`);
    }));

    ko.filter((m) => /quarter|knockout|semi/i.test(clean(m.round))).slice(0, 8).forEach((m) => ['teamA', 'teamB'].forEach((side) => {
      const team = clean(m[side]);
      if (!team || isBye(team) || /^(winner|loser|รอทีม)/i.test(team)) return;
      firstRoundTeams.set(team, (firstRoundTeams.get(team) || 0) + 1);
    }));

    const duplicates = Array.from(firstRoundTeams.entries()).filter(([, n]) => n > 1).map(([t, n]) => `${t} x${n}`);
    const final = ko.find((m) => /final/i.test(clean(m.round)) && !/semi/i.test(clean(m.round)) && !/third|3/i.test(clean(m.round)));

    return {
      ko,
      count: ko.length,
      byes,
      placeholders,
      duplicates,
      finalReady: !!(final && clean(final.teamA) && clean(final.teamB) && !/^winner/i.test(clean(final.teamA)) && !/^winner/i.test(clean(final.teamB)))
    };
  }

  function healthItem(text, type) { return `<div class="phase6-item ${type || ''}">${esc(text)}</div>`; }

  function ensureKnockoutHealthBox() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return null;
    let box = $('#coreKnockoutHealth') || $('#phase6KnockoutHealth');
    if (!box) {
      box = document.createElement('section');
      box.id = 'coreKnockoutHealth';
      box.className = 'phase6-card';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    box.id = 'coreKnockoutHealth';
    return box;
  }

  function renderHealth() {
    const box = ensureKnockoutHealthBox();
    if (!box) return;
    const state = readState();
    const h = analyzeKnockout(state);
    const good = h.count && !h.byes.length && !h.duplicates.length;

    box.className = `phase6-card ${good ? 'good' : 'warn'}`;
    box.innerHTML = `
      <div class="phase6-title"><span>Core Knockout · Health</span><span class="phase6-badge ${good ? 'good' : 'warn'}">${good ? 'Bracket OK' : 'ต้องตรวจ'}</span></div>
      <div class="phase6-metrics">
        <div class="phase6-metric"><small>Matches</small><b>${h.count}</b></div>
        <div class="phase6-metric"><small>BYE</small><b>${h.byes.length}</b></div>
        <div class="phase6-metric"><small>Duplicate</small><b>${h.duplicates.length}</b></div>
        <div class="phase6-metric"><small>Final Ready</small><b>${h.finalReady ? 'YES' : 'NO'}</b></div>
      </div>
      <div class="phase6-list">
        ${h.count ? healthItem(`มี Knockout ${h.count} คู่/ช่อง`, 'good') : healthItem('ยังไม่มี Knockout', 'warn')}
        ${h.byes.length ? healthItem(`พบ BYE ใน Knockout: ${h.byes.join(', ')}`, 'bad') : healthItem('ไม่พบ BYE ใน Knockout', 'good')}
        ${h.duplicates.length ? healthItem(`พบทีมซ้ำในรอบแรก: ${h.duplicates.join(', ')}`, 'bad') : healthItem('ไม่พบทีมซ้ำในรอบแรก', 'good')}
        ${h.placeholders.length ? healthItem(`ยังมีช่องรอผล: ${h.placeholders.slice(0, 6).join(', ')}`, 'warn') : healthItem('ไม่มีช่องรอผลค้าง', 'good')}
      </div>
    `;
  }

  function ensureTieResolverBox() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return null;
    let box = $('#coreTieResolver') || $('#phase6TieResolver');
    if (!box) {
      box = document.createElement('section');
      box.id = 'coreTieResolver';
      box.className = 'phase6-card';
      const health = $('#coreKnockoutHealth');
      if (health) health.insertAdjacentElement('afterend', box);
      else panel.appendChild(box);
    }
    box.id = 'coreTieResolver';
    return box;
  }

  function renderTie(tie, state) {
    const saved = state.tieResolvers?.[tieKey(tie)]?.order || tie.teams;
    return `
      <div class="phase6-tie" data-core-tie-key="${esc(tieKey(tie))}" data-core-teams="${esc(tie.teams.join('|'))}">
        <div class="phase6-tie-head">สาย ${esc(tie.group)} · ${esc(tie.pts)} pts · อันดับ ${esc(tie.ranks.join(', '))}</div>
        <textarea class="phase6-tie-order">${esc(saved.join('\n'))}</textarea>
        <div class="phase6-actions">
          <button class="btn" type="button" data-core-save-tie>Save Order</button>
          <button class="btn" type="button" data-core-random-tie>Draw Lots</button>
        </div>
      </div>
    `;
  }

  function renderTieResolver() {
    const box = ensureTieResolverBox();
    if (!box) return;
    const state = readState();
    const entries = standingsEntries(state);
    const ties = tieGroups(entries);
    const q = qualifierSummary(state, entries);
    const source = standingsEntriesFromState(state).length ? 'state.standings' : (entries.length ? 'visible standings' : 'none');

    box.className = `phase6-card ${ties.length || !q.ok ? 'warn' : 'good'}`;
    box.innerHTML = `
      <div class="phase6-title"><span>Core Knockout · Tie Resolver & Generator</span><span class="phase6-badge ${q.ok ? 'good' : 'warn'}">${q.ok ? `พร้อมสร้าง · ${q.total} ทีม` : `ยังไม่พร้อม · ${q.total} ทีม`}</span></div>
      <div class="phase6-text">แหล่งข้อมูล: ${esc(source)} · ถ้าคะแนนเท่ากัน ให้บันทึกลำดับก่อนสร้าง Knockout จาก Resolved Order</div>
      ${ties.length ? ties.map((tie) => renderTie(tie, state)).join('') : '<div class="phase6-list"><div class="phase6-item good">ไม่พบทีมคะแนนเท่ากันในสายเดียวกัน</div></div>'}
      <div class="phase6-actions">
        <button class="btn good" type="button" id="coreGenerateFromStandings">Generate from Standings</button>
        <button class="btn primary" type="button" id="coreGenerateResolved">Generate from Resolved Order</button>
      </div>
    `;
  }

  function saveTieOrder(root) {
    if (!root) return;
    const state = readState();
    state.tieResolvers = state.tieResolvers || {};
    const key = root.dataset.coreTieKey || root.dataset.tieKey;
    const teams = (root.dataset.coreTeams || root.dataset.teams || '').split('|').filter(Boolean);
    const typed = clean(root.querySelector('.phase6-tie-order')?.value || '').split(/\r?\n/).map(clean).filter(Boolean);
    const valid = typed.filter((t) => teams.includes(t));
    teams.forEach((t) => { if (!valid.includes(t)) valid.push(t); });
    state.tieResolvers[key] = { order: valid, method: 'manual', updatedAt: new Date().toISOString() };
    writeState(state, 'core-knockout-save-tie-order', { key, order: valid });
    toast('บันทึกลำดับคะแนนเท่ากันแล้ว');
    refresh();
  }

  function randomTieOrder(root) {
    if (!root) return;
    const teams = (root.dataset.coreTeams || root.dataset.teams || '').split('|').filter(Boolean);
    const shuffled = teams.slice().sort(() => Math.random() - 0.5);
    const textarea = root.querySelector('.phase6-tie-order');
    if (textarea) textarea.value = shuffled.join('\n');
    saveTieOrder(root);
  }

  // ---------------------------------------------------------------------------
  // Canonical knockout scores + winner advance flow
  // ---------------------------------------------------------------------------
  function roundOrder(name) {
    const s = String(name || '').toLowerCase();
    if (s.includes('final') && !s.includes('semi') && !s.includes('third')) return 99;
    if (s.includes('third') || s.includes('3')) return 98;
    if (s.includes('semi')) return 80;
    if (s.includes('quarter') || s.includes('8')) return 40;
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

  function inferWinnerFromScores(m) {
    const a = nullableNum(m.scoreA);
    const b = nullableNum(m.scoreB);
    const teamA = clean(m.teamA || m.home || m.a || m.teams?.[0]);
    const teamB = clean(m.teamB || m.away || m.b || m.teams?.[1]);
    if (a == null || b == null || a === b) return '';
    return a > b ? teamA : teamB;
  }

  function winnerOf(m) {
    if (!m) return '';
    const winner = clean(m.winner || m.winnerTeam);
    return winner || inferWinnerFromScores(m);
  }

  function loserOf(m) {
    const winner = winnerOf(m);
    if (!winner) return '';
    const teamA = clean(m.teamA || m.home || m.a || m.teams?.[0]);
    const teamB = clean(m.teamB || m.away || m.b || m.teams?.[1]);
    if (winner === teamA) return teamB;
    if (winner === teamB) return teamA;
    return '';
  }

  function byId(state, id) {
    const target = clean(id).toLowerCase();
    return (state.knockout || []).find((m) => clean(m.id).toLowerCase() === target);
  }

  function setTeam(match, side, value, fallback) {
    if (!match) return;
    const next = clean(value) || fallback || '';
    match[side] = next;
  }

  function advanceKnockoutBracket(state) {
    if (!Array.isArray(state.knockout)) return;

    const qf1 = byId(state, 'qf1');
    const qf2 = byId(state, 'qf2');
    const qf3 = byId(state, 'qf3');
    const qf4 = byId(state, 'qf4');
    const sf1 = byId(state, 'sf1');
    const sf2 = byId(state, 'sf2');
    const final = byId(state, 'final');
    const third = byId(state, 'third');

    if (sf1) {
      setTeam(sf1, 'teamA', winnerOf(qf1), 'Winner QF1');
      setTeam(sf1, 'teamB', winnerOf(qf2), 'Winner QF2');
    }
    if (sf2) {
      setTeam(sf2, 'teamA', winnerOf(qf3), 'Winner QF3');
      setTeam(sf2, 'teamB', winnerOf(qf4), 'Winner QF4');
    }
    if (final) {
      setTeam(final, 'teamA', winnerOf(sf1), 'Winner SF1');
      setTeam(final, 'teamB', winnerOf(sf2), 'Winner SF2');
    }
    if (third) {
      setTeam(third, 'teamA', loserOf(sf1), 'Loser SF1');
      setTeam(third, 'teamB', loserOf(sf2), 'Loser SF2');
    }

    const hasNamedBracket = qf1 || qf2 || qf3 || qf4 || sf1 || sf2;
    if (!hasNamedBracket) advanceGenericBracket(state);
  }

  function advanceGenericBracket(state) {
    const normalized = getKnockoutMatches(state);
    const grouped = groupByRound(normalized).filter(([round]) => !/final|third|3/i.test(round));
    if (!grouped.length) return;
    const raw = state.knockout;

    for (let gi = 0; gi < grouped.length - 1; gi += 1) {
      const current = grouped[gi][1];
      const next = grouped[gi + 1][1];
      next.forEach((nextMatch, ni) => {
        const srcA = current[ni * 2];
        const srcB = current[ni * 2 + 1];
        if (raw[nextMatch.index]) {
          raw[nextMatch.index].teamA = winnerOf(raw[srcA?.index]) || nextMatch.teamA || `Winner ${srcA?.id || ''}`.trim();
          raw[nextMatch.index].teamB = winnerOf(raw[srcB?.index]) || nextMatch.teamB || `Winner ${srcB?.id || ''}`.trim();
        }
      });
    }

    const final = raw.find((m) => /final/i.test(clean(m.round || m.stage || m.name)) && !/semi|third|3/i.test(clean(m.round || m.stage || m.name)));
    const semis = normalized.filter((m) => /semi/i.test(m.round));
    if (final && semis.length >= 2) {
      final.teamA = winnerOf(raw[semis[0].index]) || final.teamA || 'Winner SF1';
      final.teamB = winnerOf(raw[semis[1].index]) || final.teamB || 'Winner SF2';
    }
  }

  function isEditingKnockout() {
    const active = document.activeElement;
    return Date.now() < editModeUntil || !!active?.closest?.('#coreKnockoutScores');
  }

  function touchEditMode() { editModeUntil = Date.now() + 3500; }

  function knockoutSignature(matches) {
    return JSON.stringify(matches.map((m) => [m.id, m.round, m.teamA, m.teamB, m.scoreA, m.scoreB, m.winner, m.status]));
  }

  function predictWinner(m) {
    const a = nullableNum(m.scoreA);
    const b = nullableNum(m.scoreB);
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

  function ensureKnockoutScoresBox() {
    const panel = $('[data-panel="scores"]');
    if (!panel) return null;
    let box = $('#coreKnockoutScores') || $('#pre6KnockoutScores');
    if (!box) {
      box = document.createElement('section');
      box.id = 'coreKnockoutScores';
      box.className = 'pre6-card';
      const grid = panel.querySelector('.grid.two.wide-left');
      if (grid) grid.insertAdjacentElement('afterend', box);
      else panel.appendChild(box);
    }
    box.id = 'coreKnockoutScores';
    return box;
  }

  function matchRow(m) {
    const winnerOptions = ['', m.teamA, m.teamB]
      .filter((v, i) => i === 0 || clean(v))
      .map((t) => `<option value="${esc(t)}" ${t === m.winner ? 'selected' : ''}>${t ? esc(t) : 'เลือกผู้ชนะ'}</option>`)
      .join('');

    return `
      <div class="pre6-match" data-core-ko-index="${m.index}">
        <div class="pre6-team right" title="${esc(m.teamA)}">${esc(m.teamA || 'รอทีม')}</div>
        <input type="number" class="core-ko-score-a" value="${esc(m.scoreA)}" placeholder="0" />
        <div class="pre6-vs">-</div>
        <input type="number" class="core-ko-score-b" value="${esc(m.scoreB)}" placeholder="0" />
        <div class="pre6-team" title="${esc(m.teamB)}">${esc(m.teamB || 'รอทีม')}</div>
        <select class="core-ko-winner">${winnerOptions}</select>
      </div>
    `;
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
      box.innerHTML = `<div class="pre6-title"><span>Core Knockout Scores</span><span>ยังไม่มีรอบ Knockout</span></div><div class="pre6-text">สร้าง Knockout ก่อน แล้วระบบจะแสดงช่องกรอกผลรอบต่อไปที่นี่</div>`;
      return;
    }

    box.innerHTML = `
      <div class="pre6-title"><span>Core Knockout Scores</span><span>${matches.length} คู่</span></div>
      <div class="pre6-text">กรอกผลแพ้ชนะของรอบ Knockout เมื่อ Save แล้วผู้ชนะจะถูกส่งต่อไปรอบถัดไปอัตโนมัติ</div>
      ${finalTeams.length ? `<div class="pre6-final-preview">คู่ชิงที่คาด/กำหนด: ${finalTeams.map(esc).join(' vs ')}</div>` : ''}
      ${groupByRound(matches).map(([round, list]) => `
        <div class="pre6-round">
          <div class="pre6-round-head">${esc(round)}</div>
          ${list.map(matchRow).join('')}
        </div>
      `).join('')}
      <div class="pre6-actions">
        <button class="btn primary" type="button" id="coreSaveKnockoutScores">Save Knockout Scores</button>
      </div>
    `;
  }

  function saveKnockoutScores() {
    const state = readState();
    if (!Array.isArray(state.knockout)) return;

    $$('#coreKnockoutScores .pre6-match').forEach((row) => {
      const i = Number(row.dataset.coreKoIndex);
      const m = state.knockout[i];
      if (!m) return;

      const a = row.querySelector('.core-ko-score-a')?.value ?? '';
      const b = row.querySelector('.core-ko-score-b')?.value ?? '';
      const winner = row.querySelector('.core-ko-winner')?.value || '';

      m.scoreA = a === '' ? '' : Number(a);
      m.scoreB = b === '' ? '' : Number(b);
      m.winner = winner || inferWinnerFromScores(m);
      m.status = m.winner ? 'Done' : (a !== '' || b !== '' ? 'Pending' : (m.status || 'Pending'));
    });

    advanceKnockoutBracket(state);
    state.lastResult = findLatestKnockoutResult(state) || state.lastResult;
    writeState(state, 'core-knockout-save-scores', { matches: state.knockout.length });

    editModeUntil = 0;
    lastKnockoutSignature = '';
    toast('บันทึกผล Knockout แล้ว และส่งผู้ชนะไปรอบถัดไปแล้ว');
    renderKnockoutScores(true);
    renderHealth();
  }

  function findLatestKnockoutResult(state) {
    const done = getKnockoutMatches(state).reverse().find((m) => m.winner || clean(m.status).toLowerCase() === 'done');
    if (!done) return null;
    return {
      teamA: done.teamA,
      teamB: done.teamB,
      scoreA: done.scoreA,
      scoreB: done.scoreB,
      round: done.round,
      status: 'Done'
    };
  }

  function ensureCoreButtons() {
    const state = readState();
    const entries = standingsEntries(state);
    const q = qualifierSummary(state, entries);
    const coreBtn = $('#generateKnockout');

    if (coreBtn && q.ok) {
      coreBtn.disabled = false;
      coreBtn.classList.remove('phase2-disabled');
      coreBtn.title = 'Core Knockout พร้อมสร้างจาก Standings';
    }
  }

  function toast(message) {
    const old = $('.core-ko-toast') || $('.phase6-toast') || $('.pre6-toast');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'pre6-toast core-ko-toast';
    box.textContent = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2400);
  }

  // ---------------------------------------------------------------------------
  // Bindings
  // ---------------------------------------------------------------------------
  function bind() {
    document.addEventListener('focusin', (event) => {
      if (event.target.closest('#coreKnockoutScores')) touchEditMode();
    });
    document.addEventListener('input', (event) => {
      if (event.target.closest('#coreKnockoutScores')) touchEditMode();
    });
    document.addEventListener('change', (event) => {
      if (event.target.closest('#coreKnockoutScores')) touchEditMode();
    });

    document.addEventListener('click', (event) => {
      const target = event.target;

      if (target.closest('#generateKnockout') || target.closest('#coreGenerateFromStandings') || target.closest('#pre6GenerateFromStandings')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        generateKnockout({ resolved: false });
        return;
      }

      if (target.closest('#coreGenerateResolved') || target.closest('#phase6GenerateResolved')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        generateKnockout({ resolved: true });
        return;
      }

      const saveTie = target.closest('[data-core-save-tie], [data-phase6-save-tie]');
      if (saveTie) {
        event.preventDefault();
        saveTieOrder(saveTie.closest('.phase6-tie'));
        return;
      }

      const randomTie = target.closest('[data-core-random-tie], [data-phase6-random-tie]');
      if (randomTie) {
        event.preventDefault();
        randomTieOrder(randomTie.closest('.phase6-tie'));
        return;
      }

      if (target.closest('#coreSaveKnockoutScores') || target.closest('#pre6SaveKnockoutScores')) {
        event.preventDefault();
        saveKnockoutScores();
      }
    }, true);

    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('pepslive-core-knockout-updated', refresh);

    if (!refreshTimer) refreshTimer = setInterval(refresh, 1600);
  }

  function refresh() {
    ensureCoreButtons();
    renderHealth();
    renderTieResolver();
    renderKnockoutScores(false);
  }

  function install() {
    bind();
    refresh();
    window.PepsLiveCoreKnockout = {
      readState,
      standingsEntries,
      resolvedStandingsEntries,
      buildBracketFromEntries,
      generateKnockout,
      advanceKnockoutBracket,
      saveKnockoutScores,
      refresh
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
