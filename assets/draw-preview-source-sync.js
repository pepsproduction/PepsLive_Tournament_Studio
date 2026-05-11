/* Phase 10.23: Draw preview/source sync + Groups source from Reveal Feed */
(() => {
  'use strict';
  if (window.__PEPS_DRAW_PREVIEW_SOURCE_SYNC__) return;
  window.__PEPS_DRAW_PREVIEW_SOURCE_SYNC__ = true;

  const KEY = 'pepsliveTournamentControlV2';
  const view = new URLSearchParams(location.search || '').get('view') || '';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  const clean = (v) => String(v ?? '').trim();
  const isBye = (v) => clean(v).toUpperCase() === 'BYE';
  const letters = (count) => Array.from({ length: Math.max(1, Math.min(26, Number(count) || 4)) }, (_, i) => String.fromCharCode(65 + i));

  function ensureCss() {
    if (document.querySelector('link[href^="assets/draw-preview-source-sync.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/draw-preview-source-sync.css?v=phase10-23-20260511-1';
    document.head.appendChild(link);
  }

  function groupsForDisplay(state) {
    if (state.pendingGroups && Object.keys(state.pendingGroups).length) return state.pendingGroups;
    if (state.groups && Object.keys(state.groups).length) return state.groups;
    const groupCount = Number(state.event?.groupCount || state.settings?.groupColumns || 4) || 4;
    return Object.fromEntries(letters(groupCount).map((g) => [g, []]));
  }

  function groupColumns(state) {
    const requested = Number(state.settings?.groupColumns || state.event?.groupCount || 4) || 4;
    const width = window.innerWidth || 1280;
    const byWidth = Math.max(1, Math.floor(width / 310));
    return Math.max(1, Math.min(10, requested, byWidth));
  }

  function renderGroupsSource() {
    if (view !== 'groups') return;
    ensureCss();
    const state = read();
    const root = document.querySelector('#coreSourceRoot') || document.querySelector('#sourceRoot') || document.body;
    const groups = groupsForDisplay(state);
    const cols = groupColumns(state);
    const eventName = state.event?.name || 'PepsLive Tournament';
    const html = `<div class="phase8-wrap"><div class="phase8-head"><div><div class="phase8-h1">Groups Table</div><div class="phase8-sub">${esc(eventName)} · ดึงข้อมูลจากผลแบ่งสาย / Reveal Feed</div></div></div><div class="phase8-panel-grid phase8-groups-grid" style="--groups-cols:${cols}">${Object.entries(groups).map(([group, teams]) => {
      const list = Array.isArray(teams) ? teams.filter((t) => clean(t)) : [];
      return `<div class="phase8-panel"><h2>สาย ${esc(group)}</h2>${list.length ? `<table class="phase8-table"><thead><tr><th>#</th><th>Team</th><th>Note</th></tr></thead><tbody>${list.map((t, i) => `<tr><td>${i + 1}</td><td class="team">${esc(t)}</td><td>${isBye(t) ? 'BYE' : ''}</td></tr>`).join('')}</tbody></table>` : `<div class="phase8-group-wait">รอผล Reveal Feed</div>`}</div>`;
    }).join('')}</div></div>`;
    if (root.__pepsGroupsHtml !== html) {
      root.innerHTML = html;
      root.__pepsGroupsHtml = html;
    }
  }

  function syncDrawStyleToStorage() {
    if (view) return;
    const select = document.getElementById('drawAnimation');
    if (!select) return;
    const state = read();
    const style = select.value || state.settings?.drawAnimation || 'wheel';
    if (state.settings?.drawAnimation !== style) {
      try { localStorage.setItem(KEY, JSON.stringify({ ...state, settings: { ...(state.settings || {}), drawAnimation: style } })); } catch {}
      window.dispatchEvent(new CustomEvent('peps:draw-style-changed', { detail: { style } }));
    }
  }

  ensureCss();
  if (view === 'groups') {
    renderGroupsSource();
    setInterval(renderGroupsSource, 500);
    window.addEventListener('storage', renderGroupsSource);
    window.addEventListener('focus', renderGroupsSource);
    window.addEventListener('resize', renderGroupsSource);
  } else if (!view) {
    syncDrawStyleToStorage();
    setInterval(syncDrawStyleToStorage, 700);
    document.addEventListener('change', (e) => { if (e.target?.id === 'drawAnimation') setTimeout(syncDrawStyleToStorage, 0); }, true);
  }
})();
