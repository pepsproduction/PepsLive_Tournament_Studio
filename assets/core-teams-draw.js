/* Core Teams Draw: Teams & Draw Stability
   Replaces assets/phase3-teams-draw.js.
   Scope: Teams tools, duplicate checks, BYE visibility, and Draw status clarity.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_TEAMS_DRAW_INSTALLED__) return;
  window.__PEPSLIVE_CORE_TEAMS_DRAW_INSTALLED__ = true;

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
  function cleanText(v) { return String(v || '').trim(); }
  function isBye(v) { return cleanText(v).toUpperCase() === 'BYE'; }
  function parseTeams(text) { return String(text || '').split(/\r?\n/).map((t) => t.trim()).filter(Boolean); }
  function normalize(v) { return cleanText(v).toLowerCase().replace(/\s+/g, ' '); }
  function uniqueTeams(list) {
    const seen = new Set();
    const out = [];
    for (const team of list) {
      const key = normalize(team);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(cleanText(team));
    }
    return out;
  }
  function duplicateTeams(list) {
    const seen = new Map();
    const dup = [];
    list.forEach((team) => {
      const key = normalize(team);
      if (!key) return;
      if (seen.has(key)) dup.push(cleanText(team));
      seen.set(key, true);
    });
    return dup;
  }
  function teamStats() {
    const state = readState();
    const typed = parseTeams($('#teamText')?.value || (Array.isArray(state.teams) ? state.teams.join('\n') : ''));
    const unique = uniqueTeams(typed);
    const dup = duplicateTeams(typed);
    const groupCount = Math.max(1, Number(state.event?.groupCount || $('#groupCount')?.value || 4));
    const slots = Math.ceil(Math.max(unique.length, 1) / groupCount) * groupCount;
    const byes = Math.max(0, slots - unique.length);
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const confirmed = Object.values(groups).flat().filter((t) => cleanText(t) && !isBye(t)).length;
    return { state, typed, unique, dup, groupCount, slots, byes, confirmed };
  }
  function hasDerivedData(state = readState()) {
    return !!(
      (state.groups && Object.keys(state.groups).length) ||
      (state.pendingGroups && Object.keys(state.pendingGroups).length) ||
      (Array.isArray(state.matches) && state.matches.length) ||
      (state.standings && Object.keys(state.standings).length) ||
      (Array.isArray(state.knockout) && state.knockout.length)
    );
  }

  function showToast(message) {
    if (window.pepsToast) window.pepsToast(message, 'info');
  }

  async function copyText(text, message) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      if (window.pepsToast) window.pepsToast(message || 'คัดลอกแล้ว', 'success');
    } catch {
      if (window.pepsToast) window.pepsToast('คัดลอกไม่สำเร็จ', 'error');
    }
  }

  function ensureTeamTools() {
    const panel = $('[data-panel="teams"]');
    if (!panel) return;
    const row = panel.querySelector('textarea#teamText')?.parentElement?.querySelector('.row');
    if (row && !$('#phase3CopyTeams')) {
      const copy = document.createElement('button');
      copy.className = 'btn';
      copy.type = 'button';
      copy.id = 'phase3CopyTeams';
      copy.textContent = 'Copy Teams';
      const clear = document.createElement('button');
      clear.className = 'btn bad';
      clear.type = 'button';
      clear.id = 'phase3ClearTeams';
      clear.textContent = 'Clear Teams';
      row.appendChild(copy);
      row.appendChild(clear);
    }
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function removeOldPanels() {
    const p1 = $('#phase3TeamBox');
    if (p1) p1.remove();
    const p2 = $('#phase3DrawBox');
    if (p2) p2.remove();
  }

  function clearTeams() {
    if (!confirm('ล้างรายชื่อทีมทั้งหมด? ถ้ามี Draw/Schedule/Scores เดิม ข้อมูลเหล่านั้นจะถูกรีเซ็ตเมื่อ Save Teams ใหม่')) return;
    const ta = $('#teamText');
    if (ta) ta.value = '';
    showToast('ล้างช่องรายชื่อทีมแล้ว กดบันทึกรายชื่อเพื่อยืนยัน');
    refresh();
  }

  function copyTeams() {
    const s = teamStats();
    const text = s.unique.join('\n');
    copyText(text, `คัดลอก ${s.unique.length} ทีมแล้ว`);
  }

  function warnBeforeSaveTeams(event) {
    const btn = event.target.closest('#saveTeams');
    if (!btn) return;
    if (!hasDerivedData()) return;
    if (confirm('การบันทึก Teams ใหม่จะรีเซ็ต Draw, Schedule, Scores, Standings และ Knockout เดิม ต้องการทำต่อไหม?')) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function bind() {
    document.addEventListener('input', (event) => {
      if (event.target?.id === 'teamText') refresh();
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('#phase3CopyTeams')) copyTeams();
      if (event.target.closest('#phase3ClearTeams')) clearTeams();
      window.setTimeout(refresh, 150);
    });
    document.addEventListener('click', warnBeforeSaveTeams, true);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.setInterval(refresh, 1500);
  }

  function refresh() {
    ensureTeamTools();
    removeOldPanels();
  }

  function install() {
    bind();
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
