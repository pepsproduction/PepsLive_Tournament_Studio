/* Core Guard: PepsLive Tournament Studio
   Loads core addons, workflow guards, toast/action guard, and Phase 10.23 draw preview/source hotfix.
*/
(() => {
  'use strict';
  if (window.__PEPSLIVE_CORE_GUARD_INSTALLED__) return;
  window.__PEPSLIVE_CORE_GUARD_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const CORE_ASSET_VERSION = 'phase10-25-20260511-1';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function writeState(state) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
  function clean(v) { return String(v || '').trim(); }
  function isBye(v) { return clean(v).toUpperCase() === 'BYE'; }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function currentSourceView() { const view = new URLSearchParams(location.search || '').get('view') || ''; return view && view !== 'control' ? view : ''; }
  function versioned(path) { return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(CORE_ASSET_VERSION)}`; }
  function isLoaded(selector, path) { return !!Array.from(document.querySelectorAll(selector)).find((node) => String(node.getAttribute('href') || node.getAttribute('src') || '').startsWith(path)); }
  function loadAddonAssets(cssPath, jsPath) {
    if (cssPath && !isLoaded('link[href]', cssPath)) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = versioned(cssPath); document.head.appendChild(link); }
    if (jsPath && !isLoaded('script[src]', jsPath)) { const script = document.createElement('script'); script.defer = true; script.src = versioned(jsPath); document.body.appendChild(script); }
  }

  window.pepsToast = function(message, type = 'info') {
    let stack = document.querySelector('.peps-toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'peps-toast-stack'; document.body.appendChild(stack); }
    const toast = document.createElement('div'); toast.className = `peps-toast ${type}`;
    toast.innerHTML = `<div class="peps-toast-content"><div class="peps-toast-desc">${esc(message)}</div></div>`;
    stack.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 5000);
  };
  window.pepsActionLocks = window.pepsActionLocks || {};
  window.pepsActionGuard = function(actionKey, ms = 1000) {
    const now = Date.now(); const last = window.pepsActionLocks[actionKey] || 0;
    if (now - last < ms) { if (window.pepsToast) window.pepsToast('กำลังทำรายการอยู่ / กรุณารอสักครู่', 'warn'); return false; }
    window.pepsActionLocks[actionKey] = now; return true;
  };

  function removeOldLiveHealthPanel() {
    $('#phase8SourceHealth')?.remove(); $('#coreLiveSourceHealth')?.remove(); $('#phase4SourceHealth')?.remove();
    $$('.phase8-card, .phase4-card').forEach((node) => {
      const text = node.textContent || '';
      if (text.includes('OBS Source Health') || text.includes('Core Live Sources') || text.includes('Phase 8') || text.includes('Live Source Readiness')) node.remove();
    });
  }
  function loadCoreAddons() {
    loadAddonAssets('assets/core-teams-draw.css', 'assets/core-teams-draw.js');
    loadAddonAssets('assets/core-schedule.css', 'assets/core-schedule.js');
    loadAddonAssets('assets/core-scores.css', 'assets/core-scores.js');
    loadAddonAssets('assets/core-google-sheet.css', 'assets/core-google-sheet.js');
    loadAddonAssets('assets/core-knockout.css', 'assets/core-knockout.js');
  }
  function loadPhase1023Hotfix() { loadAddonAssets('assets/draw-preview-source-sync.css', 'assets/draw-preview-source-sync.js'); }

  function realTeams(state) { return Array.isArray(state.teams) ? state.teams.filter((t) => clean(t) && !isBye(t)) : []; }
  function groupTeams(state) { const groups = state.groups && typeof state.groups === 'object' ? state.groups : {}; return Object.values(groups).flat().filter((t) => clean(t) && !isBye(t)); }
  function realMatches(state) { const matches = Array.isArray(state.matches) ? state.matches : []; return matches.filter((m) => !isBye(m.teamA) && !isBye(m.teamB)); }
  function doneMatches(state) { return realMatches(state).filter((m) => String(m.status || '').toLowerCase() === 'done'); }
  function getChecks() {
    const state = readState(); const matches = realMatches(state); const done = doneMatches(state);
    return { setup: !!(state.event && clean(state.event.name) && Number(state.event.groupCount || 0) > 0), teams: realTeams(state).length > 0, drawConfirmed: groupTeams(state).length > 0, schedule: matches.length > 0, scoresComplete: matches.length > 0 && done.length >= matches.length, standings: !!(state.standings && typeof state.standings === 'object' && Object.keys(state.standings).length), matchCount: matches.length, doneCount: done.length };
  }
  function setButton(id, locked, message) { const btn = document.getElementById(id); if (!btn) return; btn.disabled = !!locked; btn.classList.toggle('phase2-disabled', !!locked); btn.title = locked ? message : ''; }
  function applyLocks(c) {
    setButton('startDraw', !c.teams, 'ต้องบันทึกรายชื่อทีมก่อน'); setButton('nextReveal', !c.teams, 'ต้องบันทึกรายชื่อทีมก่อน'); setButton('confirmDraw', !c.teams, 'ต้องบันทึกรายชื่อทีมก่อน');
    setButton('generateSchedule', !c.drawConfirmed, 'ต้อง Confirm Draw ก่อน'); setButton('rebalanceSchedule', !c.drawConfirmed, 'ต้อง Confirm Draw ก่อน'); setButton('saveScores', !c.schedule, 'ต้อง Generate Schedule ก่อน'); setButton('markAllPending', !c.schedule, 'ต้อง Generate Schedule ก่อน');
    setButton('generateKnockout', !c.scoresComplete && !c.standings, `ต้องบันทึกคะแนนให้ครบหรือมี Standings ก่อน (${c.doneCount}/${c.matchCount || 0})`);
  }
  function hintFor(panelName, message) {
    const panel = $(`[data-panel="${panelName}"]`); if (!panel) return;
    let box = panel.querySelector('.phase2-panel-hint');
    if (!message) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'notice warn phase2-panel-hint'; const head = panel.querySelector('.panel-head'); if (head) head.insertAdjacentElement('afterend', box); else panel.prepend(box); }
    box.textContent = message;
  }
  function renderHints(c) {
    hintFor('draw', c.teams ? '' : 'ต้องบันทึก Teams ก่อน จึงจะสุ่มสายได้'); hintFor('schedule', c.drawConfirmed ? '' : 'ต้อง Confirm Draw ก่อน จึงจะสร้าง Schedule ได้'); hintFor('scores', c.schedule ? '' : 'ต้อง Generate Schedule ก่อน จึงจะบันทึกคะแนนได้'); hintFor('knockout', (c.scoresComplete || c.standings) ? '' : `ต้องบันทึกคะแนนให้ครบหรือมี Standings ก่อน จึงจะสร้าง Knockout ได้ (${c.doneCount}/${c.matchCount || 0})`);
  }

  function syncDrawControlPreview() {
    if (currentSourceView()) return;
    const stage = document.getElementById('drawStage'); if (!stage) return;
    stage.classList.add('peps-draw-preview-stage');
    const state = readState(); const style = clean(document.getElementById('drawAnimation')?.value || state.settings?.drawAnimation || 'wheel') || 'wheel'; const scale = Number(document.getElementById('drawAnimationScale')?.value || state.settings?.drawAnimationScale || 0.72);
    document.documentElement.style.setProperty('--draw-fx-scale', String(Math.max(.45, Math.min(1.15, scale))));
    stage.querySelectorAll('.draw-graphic,.draw-source-card').forEach((graphic) => { Array.from(graphic.classList).forEach((name) => { if (name.startsWith('draw-style-') || name.startsWith('mode-')) graphic.classList.remove(name); }); graphic.classList.add('peps-control-draw-card', `draw-style-${style}`, `mode-${style}`); });
    const label = stage.querySelector('.draw-style-label,.draw-chip'); if (label) label.textContent = ({ wheel:'Wheel Spin', slot:'Slot Reveal', card:'Card Draw', lottery:'Lottery Ball', glitch:'Glitch Cyber', galaxy:'Galaxy Spiral', crystal:'Crystal Oracle', plasma:'Plasma Arc', vortex:'Vortex Portal', winner:'Winner Reveal' }[style] || style);
    if (state.settings?.drawAnimation !== style || state.settings?.drawAnimationScale !== scale) { writeState({ ...state, settings: { ...(state.settings || {}), drawAnimation: style, drawAnimationScale: scale } }); window.dispatchEvent(new CustomEvent('peps:draw-style-changed', { detail: { style } })); }
  }
  function installDrawControlPreviewHotfix() {
    if (currentSourceView() || window.__PEPS_DRAW_CONTROL_PREVIEW_HOTFIX__) return;
    window.__PEPS_DRAW_CONTROL_PREVIEW_HOTFIX__ = true; const run = () => syncDrawControlPreview();
    setTimeout(run, 80); setInterval(run, 500); window.addEventListener('focus', run); window.addEventListener('storage', run); document.addEventListener('click', () => setTimeout(run, 80), true); document.addEventListener('change', (e) => { if (e.target?.id === 'drawAnimation') setTimeout(run, 0); }, true); document.addEventListener('input', (e) => { if (e.target?.id === 'drawAnimationScale') setTimeout(run, 0); }, true);
    const stage = document.getElementById('drawStage'); if (stage) new MutationObserver(() => setTimeout(run, 0)).observe(stage, { childList: true, subtree: true });
  }
  function refresh() { const c = getChecks(); applyLocks(c); renderHints(c); removeOldLiveHealthPanel(); syncDrawControlPreview(); $('#phase2GuardBox')?.remove(); }
  function install() {
    const sourceView = currentSourceView(); loadPhase1023Hotfix();
    if (!sourceView) { loadCoreAddons(); installDrawControlPreviewHotfix(); } else { removeOldLiveHealthPanel(); }
    refresh(); setInterval(refresh, 1200); document.addEventListener('click', () => setTimeout(refresh, 120)); window.addEventListener('focus', refresh); window.addEventListener('storage', refresh);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
