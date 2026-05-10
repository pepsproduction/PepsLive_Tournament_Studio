/* Phase 10 Core Loader Scaffold
   Branch: core-merge-v1
   Purpose: centralize loading order before merging add-ons into core modules.
   Phase 10.1 routes OBS Live Sources through assets/core-live-sources.js.
*/
(() => {
  'use strict';

  const CORE_MODULES = [
    'assets/phase3-teams-draw.js',
    'assets/phase4-schedule.js',
    'assets/phase5-scores.js',
    'assets/phase55-google-sheet.js',
    'assets/phase6-knockout.js',
    'assets/core-live-sources.js',
    'assets/prephase6-knockout-source-fix.js',
    'assets/prephase6-knockout-generate-fix.js'
  ];

  const CORE_STYLES = [
    'assets/phase3-teams-draw.css',
    'assets/phase4-schedule.css',
    'assets/phase5-scores.css',
    'assets/phase55-google-sheet.css',
    'assets/phase6-knockout.css',
    'assets/phase8-live-sources.css',
    'assets/prephase6-knockout-source-fix.css'
  ];

  function loadStyle(path) {
    if (!path || document.querySelector(`link[href="${path}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path;
    document.head.appendChild(link);
  }

  function loadScript(path) {
    if (!path || document.querySelector(`script[src="${path}"]`)) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = path;
    document.body.appendChild(script);
  }

  function install() {
    CORE_STYLES.forEach(loadStyle);
    CORE_MODULES.forEach(loadScript);
    window.__PEPS_CORE_LOADER_V1__ = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
