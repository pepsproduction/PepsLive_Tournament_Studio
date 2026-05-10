/* Core Live Sources: compatibility guard
   Source rendering is handled by assets/app.js Clean Core V13.
   This file intentionally does NOT render OBS sources again, to avoid duplicate
   render loops, flicker, and draw-animation showing the wrong view.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_LIVE_SOURCES_INSTALLED__) return;
  window.__PEPSLIVE_CORE_LIVE_SOURCES_INSTALLED__ = true;

  const SOURCE_VIEWS = [
    'draw-animation',
    'groups',
    'schedule',
    'standings',
    'knockout',
    'lower-third',
    'next-match',
    'latest-result'
  ];

  const $ = (s, root = document) => root.querySelector(s);

  function currentView() {
    return new URLSearchParams(location.search).get('view') || '';
  }

  function isObsSourceView() {
    return SOURCE_VIEWS.includes(currentView());
  }

  function removeDuplicateHealthPanel() {
    $('#phase8SourceHealth')?.remove();
    $('#coreLiveSourceHealth')?.remove();
  }

  function install() {
    removeDuplicateHealthPanel();

    // Critical: app.js is the single canonical renderer for OBS source views.
    // Returning here prevents duplicate setInterval renderers and flicker.
    if (isObsSourceView()) return;

    // On the control UI, app.js already renders Draw Animation Source / Live Data Sources.
    // This guard only cleans stale Phase 8 panels if an older cache injected them.
    window.addEventListener('focus', removeDuplicateHealthPanel);
    window.addEventListener('storage', removeDuplicateHealthPanel);
    document.addEventListener('click', () => setTimeout(removeDuplicateHealthPanel, 120));
    setInterval(removeDuplicateHealthPanel, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
