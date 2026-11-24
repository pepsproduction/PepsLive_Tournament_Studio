/* Loads the final UX layer after the existing app/core styles are ready. */
(() => {
  const VERSION = 'ux-v2-20260822-3';

  function enforceTransparentSource() {
    const html = document.documentElement;
    const sourceView = html.classList.contains('source-mode') || html.classList.contains('src-mode');
    if (!sourceView) return;

    // The legacy source renderer writes inline !important backgrounds. OBS
    // sources must win over that value while keeping the old setting intact.
    [html, document.body].forEach((node) => {
      if (!node) return;
      node.style.setProperty('background', 'transparent', 'important');
      node.style.setProperty('background-image', 'none', 'important');
      node.style.setProperty('background-color', 'transparent', 'important');
    });
  }

  function install() {
    document.documentElement.classList.add('peps-ux-v2');
    enforceTransparentSource();
    if (document.getElementById('peps-ux-v2-css')) return;

    const link = document.createElement('link');
    link.id = 'peps-ux-v2-css';
    link.rel = 'stylesheet';
    link.href = `assets/ux-v2.css?v=${VERSION}`;
    document.head.appendChild(link);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
