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

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  let lastKnockoutSignature = '';
  let editModeUntil = 0;
  let refreshTimer = null;

  const studio = window.PepsLiveTournamentStudio;

  function readState() {
    return studio.getState();
  }

  function writeState(state, action, data) {
    state.audit.unshift({ at: new Date().toISOString(), action, data });
    state.audit = state.audit.slice(0, 100);
    studio.saveState(action);
    window.dispatchEvent(new CustomEvent('pepslive-core-knockout-updated', { detail: { action, data } }));
  }

  function clean(v) { return String(v ?? '').trim(); }
  function isBye(v) { return clean(v).toUpperCase() === 'BYE'; }
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function nullableNum(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
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

  function getKnockoutMatches(state) {
    const raw = Array.isArray(state.knockout) ? state.knockout : [];
    const byId = new Map(raw.map(match => [match.id, match]));
    return raw.map((match, index) => {
      const row = normalizeKOMatch(match, index);
      const sideReady = side => {
        const team = row[`team${side}`];
        if (!team || isBye(team)) return false;
        if (!(`source${side}` in match)) return !/^(?:winner|loser)\s+(?:qf|sf|ko|next)/i.test(team);
        const source = match[`source${side}`];
        if (!source) return true;
        const parent = byId.get(source.id);
        return Boolean(parent?.winner && (source.outcome === 'winner' || parent.status !== 'Bye'));
      };
      row.ready = row.status.toLowerCase() !== 'bye' && sideReady('A') && sideReady('B');
      return row;
    }).filter(row => row.teamA || row.teamB);
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

  function removeOldPanels() {
    const p1 = $('#coreKnockoutHealth');
    if (p1) p1.remove();
    const p2 = $('#phase6KnockoutHealth');
    if (p2) p2.remove();
  }

  function ensureTieResolverBox() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return null;
    let box = $('#coreTieResolver') || $('#phase6TieResolver');
    if (!box) {
      box = document.createElement('details');
      box.id = 'coreTieResolver';
      box.className = 'phase6-card advanced-details';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    box.id = 'coreTieResolver';
    return box;
  }

  function renderTie(tie, state) {
    const saved = state.tieResolvers?.[studio.tieKey(tie)]?.order || tie.teams;
    return `
      <div class="phase6-tie" data-core-tie-key="${esc(studio.tieKey(tie))}" data-core-teams="${esc(JSON.stringify(tie.teams))}">
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
    if (isEditingKnockout()) return;
    const state = readState();
    const progress = studio.groupStageProgress();
    const ties = tieGroups(studio.standingsEntries(progress));
    const issue = studio.knockoutSetupIssue();
    const ready = !issue && progress.complete;
    const wasOpen = box.open;

    box.className = `phase6-card advanced-details ${ties.length || !ready ? 'warn' : 'good'}`;
    box.innerHTML = `
      <summary><span>ตรวจคะแนนเท่ากันและลำดับทีมเข้ารอบ</span><small>${progress.done}/${progress.total} คู่</small></summary>
      <div class="phase6-body">
      <div class="phase6-title"><span>Core Knockout · Tie Resolver & Generator</span><span class="phase6-badge ${ready ? 'good' : 'warn'}">${ready ? 'พร้อมสร้าง' : 'รอข้อมูล'}</span></div>
      <div class="phase6-text">${esc(ready ? 'บันทึกลำดับทีมคะแนนเท่ากัน แล้วเลือกใช้ลำดับจาก Tie Resolver ใน Knockout Builder' : progress.complete ? issue : studio.groupStageMessage(progress))}</div>
      ${ties.length ? ties.map((tie) => renderTie(tie, state)).join('') : '<div class="phase6-list"><div class="phase6-item good">ไม่พบทีมคะแนนเท่ากันในสายเดียวกัน</div></div>'}
      </div>
    `;
    box.open = ties.length > 0 || wasOpen;
  }

  function saveTieOrder(root) {
    if (!root) return;
    const state = readState();
    state.tieResolvers = state.tieResolvers || {};
    const key = root.dataset.coreTieKey || root.dataset.tieKey;
    const teams = JSON.parse(root.dataset.coreTeams || '[]');
    const typed = clean(root.querySelector('.phase6-tie-order')?.value || '').split(/\r?\n/).map(clean).filter(Boolean);
    const valid = [...new Set(typed.filter(t => teams.includes(t)))];
    teams.forEach((t) => { if (!valid.includes(t)) valid.push(t); });
    state.tieResolvers[key] = { order: valid, method: 'manual', updatedAt: new Date().toISOString() };
    editModeUntil = 0;
    writeState(state, 'core-knockout-save-tie-order', { key, order: valid });
    toast('บันทึกลำดับคะแนนเท่ากันแล้ว');
    refresh();
  }

  function randomTieOrder(root) {
    if (!root) return;
    const teams = JSON.parse(root.dataset.coreTeams || '[]');
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
    if (s === 'final') return 99;
    if (s.startsWith('round of ')) return -Number(s.slice(9));
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
  function isCompleteStatus(status) {
    return ['done', 'finished'].includes(clean(status).toLowerCase());
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
    if (state.knockout.some(match => 'sourceA' in match)) {
      studio.advancePlannedKnockout(state.knockout);
      return;
    }

    const qf1 = byId(state, 'qf1');
    const qf2 = byId(state, 'qf2');
    const qf3 = byId(state, 'qf3');
    const qf4 = byId(state, 'qf4');
    const sf1 = byId(state, 'sf1');
    const sf2 = byId(state, 'sf2');
    const final = byId(state, 'final');
    const third = byId(state, 'third');

    if (sf1 && qf1 && qf2) {
      setTeam(sf1, 'teamA', winnerOf(qf1), 'Winner QF1');
      setTeam(sf1, 'teamB', winnerOf(qf2), 'Winner QF2');
    }
    if (sf2 && qf3 && qf4) {
      setTeam(sf2, 'teamA', winnerOf(qf3), 'Winner QF3');
      setTeam(sf2, 'teamB', winnerOf(qf4), 'Winner QF4');
    }
    if (final && sf1 && sf2) {
      setTeam(final, 'teamA', winnerOf(sf1), 'Winner SF1');
      setTeam(final, 'teamB', winnerOf(sf2), 'Winner SF2');
    }
    if (third && sf1 && sf2) {
      setTeam(third, 'teamA', loserOf(sf1), 'Loser SF1');
      setTeam(third, 'teamB', loserOf(sf2), 'Loser SF2');
    }

    const hasNamedBracket = qf1 || qf2 || qf3 || qf4 || sf1 || sf2;
    if (!hasNamedBracket) advanceGenericBracket(state);
  }

  function advanceGenericBracket(state) {
    const normalized = getKnockoutMatches(state);
    const grouped = groupByRound(normalized).filter(([round]) => !/^(final|third place)$/i.test(round));
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

    const final = raw.find((m) => /^final$/i.test(clean(m.round || m.stage || m.name)));
    const semis = normalized.filter((m) => /semi/i.test(m.round));
    if (final && semis.length >= 2) {
      final.teamA = winnerOf(raw[semis[0].index]) || final.teamA || 'Winner SF1';
      final.teamB = winnerOf(raw[semis[1].index]) || final.teamB || 'Winner SF2';
    }
  }

  function isEditingKnockout() {
    const active = document.activeElement;
    return Date.now() < editModeUntil || !!active?.closest?.('#coreKnockoutScores, #coreTieResolver');
  }

  function touchEditMode() { editModeUntil = Date.now() + 3500; }

  function knockoutSignature(matches) {
    return JSON.stringify(matches.map((m) => [m.id, m.round, m.teamA, m.teamB, m.scoreA, m.scoreB, m.winner, m.status, m.ready]));
  }

  function predictWinner(m) {
    const a = nullableNum(m.scoreA);
    const b = nullableNum(m.scoreB);
    if (m.winner) return m.winner;
    if (a == null || b == null || a === b) return '';
    return a > b ? m.teamA : m.teamB;
  }

  function finalPreview(matches) {
    const explicitFinal = matches.find(m => /^final$/i.test(m.round));
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
    const disabled = m.ready ? '' : 'disabled';
    const winnerOptions = ['', m.teamA, m.teamB]
      .filter((v, i) => i === 0 || clean(v))
      .map((t) => `<option value="${esc(t)}" ${t === m.winner ? 'selected' : ''}>${t ? esc(t) : 'เลือกผู้ชนะ'}</option>`)
      .join('');

    return `
      <div class="pre6-match" data-core-ko-index="${m.index}" data-core-ko-id="${esc(m.id)}">
        <div class="pre6-team right" title="${esc(m.teamA)}">${esc(m.teamA || 'รอทีม')}</div>
        <input type="number" min="0" class="core-ko-score-a" ${disabled} value="${esc(m.scoreA)}" placeholder="0" />
        <div class="pre6-vs">-</div>
        <input type="number" min="0" class="core-ko-score-b" ${disabled} value="${esc(m.scoreB)}" placeholder="0" />
        <div class="pre6-team" title="${esc(m.teamB)}">${esc(m.teamB || 'รอทีม')}</div>
        <select class="core-ko-winner" ${disabled}>${winnerOptions}</select>
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

    const ready = new Map(getKnockoutMatches(state).filter(row => row.ready).map(row => [row.index, row]));
    const changes = [];
    for (const row of $$('#coreKnockoutScores .pre6-match')) {
      const index = Number(row.dataset.coreKoIndex);
      const current = ready.get(index);
      if (!current || current.id !== row.dataset.coreKoId || row.querySelector('.core-ko-score-a')?.disabled) continue;
      const a = row.querySelector('.core-ko-score-a')?.value ?? '';
      const b = row.querySelector('.core-ko-score-b')?.value ?? '';
      const selected = row.querySelector('.core-ko-winner')?.value || '';
      if (a === String(current.scoreA) && b === String(current.scoreB) && selected === current.winner) continue;
      if ([a, b].some(score => score !== '' && nullableNum(score) == null)) {
        toast('คะแนน Knockout ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        return;
      }

      const match = state.knockout[index];
      const scoreA = a === '' ? '' : Number(a);
      const scoreB = b === '' ? '' : Number(b);
      const inferred = inferWinnerFromScores({ ...match, scoreA, scoreB });
      const tied = a !== '' && b !== '' && scoreA === scoreB;
      const winner = selected !== current.winner ? selected || inferred : inferred || (tied ? selected : '');
      changes.push({ match, scoreA, scoreB, winner });
    }

    for (const { match, scoreA, scoreB, winner } of changes) {
      Object.assign(match, { scoreA, scoreB, winner, status: winner ? 'Done' : 'Pending' });
      if ('winnerTeam' in match) match.winnerTeam = winner;
    }

    advanceKnockoutBracket(state);
    const latest = findLatestKnockoutResult(state);
    if (latest || state.lastResult?.round) state.lastResult = latest;
    writeState(state, 'core-knockout-save-scores', { matches: state.knockout.length });

    editModeUntil = 0;
    lastKnockoutSignature = '';
    toast('บันทึกผล Knockout แล้ว และส่งผู้ชนะไปรอบถัดไปแล้ว');
    renderKnockoutScores(true);
  }

  function findLatestKnockoutResult(state) {
    const done = getKnockoutMatches(state).reverse().find(m => m.status.toLowerCase() !== 'bye' && (m.winner || isCompleteStatus(m.status)));
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
    const coreBtn = $('#generateKnockout');
    if (!coreBtn) return;
    const progress = studio.groupStageProgress();
    const issue = progress.complete ? studio.knockoutSetupIssue() : studio.groupStageMessage(progress);
    coreBtn.disabled = Boolean(issue);
    coreBtn.classList.toggle('phase2-disabled', Boolean(issue));
    coreBtn.title = issue || 'พร้อมสร้าง Knockout จากอันดับรอบแบ่งกลุ่ม';
  }

  function toast(message) {
    if (window.pepsToast) window.pepsToast(message, 'info');
  }

  // ---------------------------------------------------------------------------
  // Bindings
  // ---------------------------------------------------------------------------
  function bind() {
    document.addEventListener('focusin', (event) => {
      if (event.target.closest('#coreKnockoutScores, #coreTieResolver')) touchEditMode();
    });
    document.addEventListener('input', (event) => {
      if (event.target.closest('#coreKnockoutScores, #coreTieResolver')) touchEditMode();
    });
    document.addEventListener('change', (event) => {
      if (event.target.closest('#coreKnockoutScores, #coreTieResolver')) touchEditMode();
    });

    document.addEventListener('click', (event) => {
      const target = event.target;

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
    removeOldPanels();
    renderTieResolver();
    renderKnockoutScores();
    ensureCoreButtons();
  }

  function install() {
    bind();
    refresh();
    window.PepsLiveCoreKnockout = {
      readState,
      standingsEntries: studio.standingsEntries,
      buildKnockoutPreviewPlan: studio.buildKnockoutPreviewPlan,
      generateKnockout: studio.generateKnockout,
      advanceKnockoutBracket,
      saveKnockoutScores,
      refresh
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
