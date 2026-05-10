/* Core Scores: Scores & Standings Stability
   Replaces assets/phase5-scores.js.
   Scope: Scores health, standings readiness, and knockout readiness.
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
  function getMatches(state) { return Array.isArray(state.matches) ? state.matches : []; }
  function realMatches(state) { return getMatches(state).filter((m) => !isBye(m.teamA) && !isBye(m.teamB)); }
  function isDone(m) { return String(m?.status || '').toLowerCase() === 'done'; }
  function scoreValue(m, key) {
    const v = m?.[key];
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  function hasAnyScore(m) { return scoreValue(m, 'scoreA') !== null || scoreValue(m, 'scoreB') !== null; }
  function matchName(m) { return `${cleanText(m.teamA || 'Team A')} vs ${cleanText(m.teamB || 'Team B')}`; }

  function standingsRows(state) {
    const s = state.standings && typeof state.standings === 'object' ? state.standings : {};
    const rows = [];
    Object.entries(s).forEach(([group, list]) => {
      if (Array.isArray(list)) list.forEach((row) => rows.push({ group, ...row }));
      else if (list && typeof list === 'object') Object.entries(list).forEach(([team, row]) => rows.push({ group, team, ...(row || {}) }));
    });
    return rows;
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

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function row(text, type = '') { return `<div class="phase5-item ${type}">${escapeHtml(text)}</div>`; }

  function ensureScoresBox() {
    const panel = $('[data-panel="scores"]');
    if (!panel) return;
    if (!$('#phase5ScoresHealth')) {
      const box = document.createElement('section');
      box.id = 'phase5ScoresHealth';
      box.className = 'phase5-card';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
  }

  function renderScoresHealth() {
    ensureScoresBox();
    const box = $('#phase5ScoresHealth');
    if (!box) return;
    const a = analyzeScores();
    const complete = a.real.length > 0 && a.done.length >= a.real.length && !a.invalid.length && !a.blankDone.length;
    const bad = a.invalid.length || a.blankDone.length || a.byeStanding.length;
    box.className = `phase5-card ${complete && !bad ? 'good' : (bad ? 'bad' : 'warn')}`;
    box.innerHTML = `
      <div class="phase5-title">
        <span>Core Scores · Scores Health</span>
        <span class="phase5-badge ${complete && !bad ? 'good' : (bad ? 'bad' : 'warn')}">${complete && !bad ? 'คะแนนพร้อม' : 'ต้องตรวจคะแนน'}</span>
      </div>
      <div class="phase5-text">ตรวจคะแนนก่อนนำไปใช้คำนวณ Standings และ Knockout</div>
      <div class="phase5-metrics">
        <div class="phase5-metric"><small>คู่ทั้งหมด</small><b>${a.real.length}</b></div>
        <div class="phase5-metric"><small>บันทึกแล้ว</small><b>${a.done.length}</b></div>
        <div class="phase5-metric"><small>Pending</small><b>${a.pending.length}</b></div>
        <div class="phase5-metric"><small>Standings Rows</small><b>${a.rows.length}</b></div>
      </div>
      <div class="phase5-list">
        ${a.real.length ? row(`มีคู่แข่งจริง ${a.real.length} คู่`, 'good') : row('ยังไม่มีคู่แข่งจริง ต้อง Generate Schedule ก่อน', 'warn')}
        ${a.pending.length ? row(`ยังมีคู่ Pending ${a.pending.length} คู่`, 'warn') : row('ไม่มีคู่ Pending', 'good')}
        ${a.invalid.length ? row(`พบคะแนนไม่ใช่ตัวเลข ${a.invalid.length} คู่: ${a.invalid.slice(0, 5).join(', ')}`, 'bad') : row('ไม่พบคะแนนที่ไม่ใช่ตัวเลข', 'good')}
        ${a.blankDone.length ? row(`พบคู่ Done แต่คะแนนว่าง ${a.blankDone.length} คู่: ${a.blankDone.slice(0, 5).join(', ')}`, 'bad') : row('ไม่พบคู่ Done ที่คะแนนว่าง', 'good')}
        ${a.partial.length ? row(`มีคู่ Pending ที่กรอกคะแนนไว้แล้ว ${a.partial.length} คู่ ควรเช็คสถานะ`, 'warn') : row('ไม่พบคะแนนค้างในคู่ Pending', 'good')}
        ${a.byeStanding.length ? row(`พบ BYE ใน Standings: ${a.byeStanding.join(', ')}`, 'bad') : row('ไม่พบ BYE ใน Standings', 'good')}
        ${a.tieGroups.length ? row(`มีทีมคะแนน/ตัวชี้วัดเท่ากัน ${a.tieGroups.length} กลุ่ม ต้องดูเกณฑ์ตัดสิน`, 'warn') : row('ยังไม่พบกลุ่มคะแนนเท่าที่ต้องระวัง', 'good')}
      </div>
      <div class="phase5-rulebox">กติกาเรียงอันดับที่ Core ระบุไว้: PTS → GD → GF → ชนะมากกว่า → ชื่อทีม A-Z</div>
    `;
  }

  function ensureKnockoutHint() {
    const panel = $('[data-panel="knockout"]');
    if (!panel) return;
    if (!$('#phase5KnockoutHint')) {
      const box = document.createElement('section');
      box.id = 'phase5KnockoutHint';
      box.className = 'phase5-card';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
  }

  function renderKnockoutHint() {
    ensureKnockoutHint();
    const box = $('#phase5KnockoutHint');
    if (!box) return;
    const a = analyzeScores();
    const ready = a.real.length > 0 && a.done.length >= a.real.length && !a.invalid.length && !a.blankDone.length && !a.byeStanding.length;
    box.className = `phase5-card ${ready ? 'good' : 'warn'}`;
    box.innerHTML = `
      <div class="phase5-title"><span>Core Scores · Knockout Readiness</span><span class="phase5-badge ${ready ? 'good' : 'warn'}">${ready ? 'พร้อมสร้าง Knockout' : 'ยังไม่ควรสร้าง Knockout'}</span></div>
      <div class="phase5-list">
        ${ready ? row('คะแนนครบและไม่พบปัญหาหลัก สามารถ Generate Knockout ได้', 'good') : row(`ตรวจคะแนนก่อน: Done ${a.done.length}/${a.real.length}, Pending ${a.pending.length}, Invalid ${a.invalid.length}`, 'warn')}
        ${a.tieGroups.map((list) => row(`คะแนนเท่ากัน: ${list.join(' / ')}`, 'warn')).join('')}
      </div>
    `;
  }

  function toast(message) {
    const old = $('.phase5-toast');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'phase5-toast';
    box.textContent = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2400);
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
    toast('ยกเลิก Mark All Pending เพื่อรักษาคะแนนเดิม');
  }

  function refresh() {
    renderScoresHealth();
    renderKnockoutHint();
  }

  function install() {
    document.addEventListener('click', warnBeforeMarkPending, true);
    document.addEventListener('click', () => setTimeout(refresh, 160));
    document.addEventListener('input', (event) => {
      if (event.target?.closest('#scoresBox')) setTimeout(refresh, 120);
    });
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.setInterval(refresh, 1500);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
