/* Phase 10.23: Draw preview source sync */
(() => {
  'use strict';
  if (window.__PEPS_DRAW_PREVIEW_SOURCE_SYNC__) return;
  window.__PEPS_DRAW_PREVIEW_SOURCE_SYNC__ = true;

  const KEY = 'pepsliveTournamentControlV2';
  const view = new URLSearchParams(location.search || '').get('view') || '';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };

  function ensureCss() {
    if (document.querySelector('link[href^="assets/draw-preview-source-sync.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/draw-preview-source-sync.css?v=phase10-33-20260513-1';
    document.head.appendChild(link);
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
  if (!view) {
    syncDrawStyleToStorage();
    setInterval(syncDrawStyleToStorage, 700);
    document.addEventListener('change', (e) => { if (e.target?.id === 'drawAnimation') setTimeout(syncDrawStyleToStorage, 0); }, true);
  }
})();
