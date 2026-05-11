/* Core Schedule: Schedule Stability
   Replaces assets/phase4-schedule.js.
   Scope: Schedule health, BYE warnings, back-to-back warnings, and rebuild protection.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_SCHEDULE_INSTALLED__) return;
  window.__PEPSLIVE_CORE_SCHEDULE_INSTALLED__ = true;

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

  function removeOldPanels() {
    const p1 = $('#phase4ScheduleHealth');
    if (p1) p1.remove();
    const p2 = $('#phase4SourceHealth');
    if (p2) p2.remove();
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
    if (window.pepsToast) window.pepsToast('ยกเลิก Rebuild Random เพื่อรักษาคะแนนเดิม', 'info');
  }

  function refresh() {
    removeOldPanels();
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
