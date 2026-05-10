/* Phase 8 Hotfix: disabled duplicate OBS source renderer
   The canonical Live Sources renderer is assets/app.js.
   This file is intentionally kept as a cleanup shim because older main builds
   still load assets/phase8-live-sources.js through phase2-core-guard.js.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_PHASE8_HOTFIX_INSTALLED__) return;
  window.__PEPSLIVE_PHASE8_HOTFIX_INSTALLED__ = true;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  function removeDuplicatePhase8Health() {
    $('#phase8SourceHealth')?.remove();
    $('#coreLiveSourceHealth')?.remove();
    $$('.phase8-card').forEach((node) => {
      const text = node.textContent || '';
      if (
        text.includes('Phase 8 · OBS Source Health') ||
        text.includes('OBS Source Health') ||
        text.includes('Core Live Sources')
      ) {
        node.remove();
      }
    });
  }

  function install() {
    // Do not render source views here. app.js owns ?view=draw-animation/groups/etc.
    // This prevents draw-animation from being routed to Groups Table and stops flicker.
    removeDuplicatePhase8Health();
    window.addEventListener('focus', removeDuplicatePhase8Health);
    window.addEventListener('storage', removeDuplicatePhase8Health);
    document.addEventListener('click', () => setTimeout(removeDuplicatePhase8Health, 100));
    setInterval(removeDuplicatePhase8Health, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
