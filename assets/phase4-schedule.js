/* Phase 4: Schedule Stability
   Lightweight schedule health layer. Does not modify app.js algorithms.
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function cleanText(v) { return String(v || '').trim(); }
  function isBye(v) { return cleanText(v).toUpperCase() === 'BYE'; }
  function isDone(m) { return String(m?.status || '').toLowerCase() === 'done'; }
  function getMatches(state) { return Array.isArray(state.matches) ? state.matches : []; }
  function realMatches(state) { return getMatches(state).filter((m) => !isBye(m.teamA) && !isBye(m.teamB)); }
  function byeMatches(state) { return getMatches(state).filter((m) => isBye(m.teamA) || isBye(m.teamB)); }
  function confirmedTeams(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    return Object.values(groups).flat().filter((t) => cleanText(t) && !isBye(t));
  }
  function hasScores(state) { return realMatches(state).some((m) => isDone(m) || m.scoreA !== undefined || m.scoreB !== undefined); }

  function parseMinutes(time) {
    const m = String(time || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  function formatTime(total) {
    if (total == null || !Number.isFinite(total)) return '-';
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function teamOf(m, side) {
    return cleanText(m?.[side] || m?.[side === 'teamA' ? 'home' : 'away'] || '');
  }
  function timeOf(m) { return cleanText(m?.time || m?.startTime || ''); }
  function courtOf(m) { return cleanText(m?.court || m?.field || ''); }

  function scheduleHealth() {
    const state = readState();
    const all = getMatches(state);
    const real = realMatches(state);
    const byes = byeMatches(state);
    const courts = new Set(real.map(courtOf).filter(Boolean));
    const times = real.map((m) => parseMinutes(timeOf(m))).filter((v) => v != null).sort((a, b) => a - b);
    const start = times.length ? times[0] : parseMinutes(state.event?.startTime);
    const end = times.length ? times[times.length - 1] + Number(state.event?.matchInterval || 0) : null;
    const confirmed = confirmedTeams(state).length;
    const done = real.filter(isDone).length;
    const clashes = findBackToBackWarnings(real);
    const drawConfirmed = confirmed > 0;
    return {
      state, all, real, byes, courts, times, start, end, confirmed, done, clashes,
      drawConfirmed,
      scheduleReady: real.length > 0,
      scoreTouched: hasScores(state)
    };
  }

  function findBackToBackWarnings(matches) {
    const sorted = matches.slice().sort((a, b) => {
      const ta = parseMinutes(timeOf(a));
      const tb = parseMinutes(timeOf(b));
      if (ta !== tb) return (ta ?? 99999) - (tb ?? 99999);
      return courtOf(a).localeCompare(courtOf(b));
    });
    const last = new Map();
    const warnings = [];
    sorted.forEach((m) => {
      const t = parseMinutes(timeOf(m));
      const teams = [teamOf(m, 'teamA'), teamOf(m, 'teamB')].filter(Boolean).filter((x) => !isBye(x));
      teams.forEach((team) => {
        if (last.has(team)) {
          const prev = last.get(team);
          if (t != null && prev.time != null && t - prev.time <= Number(readState().event?.matchInterval || 15)) {
            warnings.push(`${team}: ${prev.label} → ${labelMatch(m)}`);
          }
        }
        last.set(team, { time: t, label: labelMatch(m) });
      });
    });
    return warnings.slice(0, 8);
  }

  function labelMatch(m) {
    const time = timeOf(m) || '-';
    const court = courtOf(m) || '-';
    return `${time} สนาม ${court}`;
  }

  function row(text, type = '') {
    return `<div class="phase4-item ${type}">${escapeHtml(text)}</div>`;
  }
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function ensureScheduleBox() {
    const panel = $('[data-panel="schedule"]');
    if (!panel) return;
    if (!$('#phase4ScheduleHealth')) {
      const box = document.createElement('section');
      box.id = 'phase4ScheduleHealth';
      box.className = 'phase4-card';
      const controls = panel.querySelector('.card.compact');
      if (controls) controls.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
  }

  function renderScheduleHealth() {
    ensureScheduleBox();
    const box = $('#phase4ScheduleHealth');
    if (!box) return;
    const h = scheduleHealth();
    const ok = h.scheduleReady && h.byes.length === 0 && h.clashes.length === 0 && h.drawConfirmed;
    const bad = h.byes.length > 0 || !h.drawConfirmed;
    box.className = `phase4-card ${ok ? 'good' : (bad ? 'bad' : 'warn')}`;
    box.innerHTML = `
      <div class="phase4-title">
        <span>Phase 4 · Schedule Health</span>
        <span class="phase4-badge ${ok ? 'good' : 'warn'}">${ok ? 'ตารางพร้อมใช้งาน' : 'ต้องตรวจตาราง'}</span>
      </div>
      <div class="phase4-text">ตรวจความพร้อมของตารางแข่งหลัง Generate Schedule โดยไม่แก้อัลกอริทึมหลัก</div>
      <div class="phase4-metrics">
        <div class="phase4-metric"><small>คู่แข่งจริง</small><b>${h.real.length}</b></div>
        <div class="phase4-metric"><small>คู่ที่มี BYE</small><b>${h.byes.length}</b></div>
        <div class="phase4-metric"><small>จำนวนสนาม</small><b>${h.courts.size || Number(h.state.event?.courtCount || 0)}</b></div>
        <div class="phase4-metric"><small>เวลาเริ่ม-จบ</small><b>${formatTime(h.start)}-${formatTime(h.end)}</b></div>
      </div>
      <div class="phase4-list">
        ${h.drawConfirmed ? row(`Schedule สร้างจาก Draw ที่ Confirm แล้ว (${h.confirmed} ทีม)`, 'good') : row('ยังไม่พบ Draw ที่ Confirm แล้ว ห้ามใช้ Schedule นี้เป็นผลจริง', 'bad')}
        ${h.scheduleReady ? row(`มีตารางแข่งจริง ${h.real.length} คู่`, 'good') : row('ยังไม่มี Schedule ให้ตรวจ', 'warn')}
        ${h.byes.length ? row(`พบคู่ที่มี BYE ${h.byes.length} คู่ ควรตรวจว่าไม่ถูกนำไปแข่งจริง`, 'bad') : row('ไม่พบ BYE ในคู่แข่งจริง', 'good')}
        ${h.clashes.length ? row(`พบทีมที่แข่งติดกัน ${h.clashes.length} รายการ`, 'warn') : row('ไม่พบทีมแข่งติดกันตามเงื่อนไขพื้นฐาน', 'good')}
        ${h.scoreTouched ? row('มีคะแนนเดิมอยู่ ถ้า Rebuild Random อาจทำให้ผลเดิมไม่ตรงคู่แข่ง', 'warn') : row('ยังไม่มีคะแนนเดิมค้างในตาราง', 'good')}
        ${h.clashes.map((x) => row(x, 'warn')).join('')}
      </div>
    `;
  }

  function ensureSourceBox() {
    const panel = $('[data-panel="sources"]');
    if (!panel) return;
    if (!$('#phase4SourceHealth')) {
      const box = document.createElement('section');
      box.id = 'phase4SourceHealth';
      box.className = 'phase4-card';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
  }

  function renderSourceHealth() {
    ensureSourceBox();
    const box = $('#phase4SourceHealth');
    if (!box) return;
    const h = scheduleHealth();
    box.className = `phase4-card ${h.scheduleReady ? 'good' : 'warn'}`;
    box.innerHTML = `
      <div class="phase4-title"><span>Phase 4 · Live Source Readiness</span><span class="phase4-badge ${h.scheduleReady ? 'good' : 'warn'}">${h.scheduleReady ? 'พร้อมเปิด Source' : 'ยังไม่พร้อม'}</span></div>
      <div class="phase4-list">
        ${h.scheduleReady ? row('Schedule Source มีข้อมูลสำหรับแสดงผล', 'good') : row('Schedule Source ยังไม่มีข้อมูล ควร Generate Schedule ก่อน', 'warn')}
        ${h.done ? row('Latest Result Source มีผลล่าสุด', 'good') : row('Latest Result Source จะสมบูรณ์หลังบันทึกคะแนน', 'warn')}
        ${h.drawConfirmed ? row('Groups Source ใช้ผล Draw ที่ Confirm แล้ว', 'good') : row('Groups Source ยังไม่มีผล Confirm', 'warn')}
      </div>
    `;
  }

  function toast(message) {
    const old = $('.phase4-toast');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'phase4-toast';
    box.textContent = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2400);
  }

  function warnBeforeRebuild(event) {
    const btn = event.target.closest('#rebalanceSchedule');
    if (!btn) return;
    const h = scheduleHealth();
    if (!h.scoreTouched) return;
    const ok = confirm('ตารางนี้มีคะแนนเดิมอยู่แล้ว การ Rebuild Random อาจทำให้ผลคะแนนไม่ตรงคู่แข่ง ต้องการทำต่อไหม?');
    if (ok) return;
    event.preventDefault();
    event.stopPropagation();
    toast('ยกเลิก Rebuild Random เพื่อรักษาคะแนนเดิม');
  }

  function refresh() {
    renderScheduleHealth();
    renderSourceHealth();
  }

  function install() {
    document.addEventListener('click', warnBeforeRebuild, true);
    document.addEventListener('click', () => setTimeout(refresh, 160));
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.setInterval(refresh, 1500);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
