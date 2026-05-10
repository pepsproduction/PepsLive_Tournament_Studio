/* Phase 8: Live Sources Final Stability
   Final fallback renderer for OBS Browser Source views and source health UI.
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const SOURCE_VIEWS = [
    ['draw-animation', 'Draw Animation'],
    ['groups', 'Groups Table'],
    ['schedule', 'Schedule'],
    ['standings', 'Standings Table'],
    ['knockout', 'Knockout'],
    ['lower-third', 'Lower Third'],
    ['next-match', 'Next Match'],
    ['latest-result', 'Latest Result']
  ];
  const $ = (s, root = document) => root.querySelector(s);

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function clean(v) { return String(v ?? '').trim(); }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function isBye(v) { return clean(v).toUpperCase() === 'BYE'; }
  function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  function team(m, side) { return clean(m?.[side] || m?.[side === 'teamA' ? 'home' : 'away'] || m?.teams?.[side === 'teamA' ? 0 : 1] || ''); }
  function score(m, key) { const v = m?.[key]; return v === '' || v == null ? '' : num(v); }

  function currentView() { return new URLSearchParams(location.search).get('view'); }
  function isSourceView() { return SOURCE_VIEWS.some(([id]) => id === currentView()); }
  function sourceBg(state) { return state.settings?.sourceBg || 'dark'; }

  function renderSource() {
    const view = currentView();
    if (!isSourceView()) return;
    const app = $('#app');
    if (app) app.style.display = 'none';
    let root = $('#sourceRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sourceRoot';
      document.body.prepend(root);
    }
    const paint = () => {
      const state = readState();
      document.body.className = `phase8-body ${sourceBg(state)}`;
      root.classList.remove('hidden');
      root.innerHTML = renderByView(view, state);
    };
    paint();
    setInterval(paint, 1000);
  }

  function shell(title, subtitle, content) {
    return `<div class="phase8-wrap"><div class="phase8-head"><div><div class="phase8-h1">${esc(title)}</div><div class="phase8-sub">${esc(subtitle || '')}</div></div></div>${content}</div>`;
  }
  function empty(title, message) { return `<div class="phase8-empty"><div><h1>${esc(title)}</h1><p>${esc(message)}</p></div></div>`; }

  function renderByView(view, state) {
    const eventName = state.event?.name || 'PepsLive Tournament';
    if (view === 'groups' || view === 'draw-animation') return renderGroups(state, view === 'draw-animation' ? 'Draw Result' : 'Groups Table', eventName);
    if (view === 'schedule') return renderSchedule(state, eventName);
    if (view === 'standings') return renderStandings(state, eventName);
    if (view === 'knockout') return renderKnockout(state, eventName);
    if (view === 'latest-result') return renderLatestResult(state, eventName);
    if (view === 'next-match') return renderNextMatch(state, eventName);
    if (view === 'lower-third') return renderLowerThird(state, eventName);
    return empty('Source', 'Unknown source view');
  }

  function renderGroups(state, title, eventName) {
    const groups = state.groups && Object.keys(state.groups).length ? state.groups : (state.pendingGroups || {});
    const entries = Object.entries(groups);
    if (!entries.length) return empty(title, 'ยังไม่มีผลแบ่งสาย ให้ Confirm Draw ก่อน');
    return shell(title, eventName, `<div class="phase8-panel-grid">${entries.map(([group, teams]) => `
      <div class="phase8-panel"><h2>สาย ${esc(group)}</h2><table class="phase8-table"><thead><tr><th>#</th><th>Team</th><th>Note</th></tr></thead><tbody>
      ${(teams || []).filter((t) => clean(t)).map((t, i) => `<tr><td>${i + 1}</td><td class="team">${esc(t)}</td><td>${isBye(t) ? 'BYE' : ''}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}</div>`);
  }

  function matches(state) { return Array.isArray(state.matches) ? state.matches : []; }
  function knockout(state) { return Array.isArray(state.knockout) ? state.knockout : []; }
  function realMatches(state) { return matches(state).filter((m) => !isBye(team(m, 'teamA')) && !isBye(team(m, 'teamB'))); }
  function done(m) { return String(m.status || '').toLowerCase() === 'done'; }
  function renderSchedule(state, eventName) {
    const list = realMatches(state);
    if (!list.length) return empty('Schedule', 'ยังไม่มีตารางแข่ง ให้ Generate Schedule ก่อน');
    return shell('Schedule', eventName, `<div class="phase8-panel"><table class="phase8-table"><thead><tr><th>Time</th><th>Court</th><th>Group</th><th>Team A</th><th>Team B</th><th>Status</th></tr></thead><tbody>
      ${list.map((m) => `<tr><td>${esc(m.time || m.startTime || '')}</td><td>${esc(m.court || m.field || '')}</td><td>${esc(m.group || '')}</td><td class="team">${esc(team(m, 'teamA'))}</td><td class="team">${esc(team(m, 'teamB'))}</td><td>${esc(m.status || 'Pending')}</td></tr>`).join('')}
    </tbody></table></div>`);
  }

  function standingsEntries(state) {
    const s = state.standings && typeof state.standings === 'object' ? state.standings : {};
    if (Object.keys(s).length) return Object.entries(s).map(([group, rows]) => [group, Array.isArray(rows) ? rows : Object.entries(rows || {}).map(([teamName, data]) => ({ team: teamName, ...(data || {}) }))]);
    return computeStandings(state);
  }
  function computeStandings(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    return Object.entries(groups).map(([group, teams]) => {
      const rows = (teams || []).filter((t) => clean(t) && !isBye(t)).map((t) => ({ team: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      const map = new Map(rows.map((r) => [r.team, r]));
      matches(state).forEach((m) => {
        const a = team(m, 'teamA'), b = team(m, 'teamB');
        if (!map.has(a) || !map.has(b) || !done(m)) return;
        const sa = score(m, 'scoreA'), sb = score(m, 'scoreB');
        if (sa === '' || sb === '') return;
        const ra = map.get(a), rb = map.get(b);
        ra.gf += sa; ra.ga += sb; rb.gf += sb; rb.ga += sa; ra.gd = ra.gf - ra.ga; rb.gd = rb.gf - rb.ga;
        if (sa > sb) { ra.w++; rb.l++; ra.pts += num(state.event?.pointsWin, 3); rb.pts += num(state.event?.pointsLoss, 0); }
        else if (sb > sa) { rb.w++; ra.l++; rb.pts += num(state.event?.pointsWin, 3); ra.pts += num(state.event?.pointsLoss, 0); }
        else { ra.d++; rb.d++; ra.pts += num(state.event?.pointsDraw, 1); rb.pts += num(state.event?.pointsDraw, 1); }
      });
      rows.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team));
      return [group, rows];
    });
  }
  function rowTeam(r) { return clean(r.team || r.name || r.Team || r.title); }
  function renderStandings(state, eventName) {
    const entries = standingsEntries(state).filter(([, rows]) => rows && rows.length);
    if (!entries.length) return empty('Standings Table', 'ยังไม่มีตารางคะแนน ให้บันทึก Scores ก่อน');
    return shell('Standings Table', eventName, `<div class="phase8-panel-grid">${entries.map(([group, rows]) => `
      <div class="phase8-panel"><h2>สาย ${esc(group)}</h2><table class="phase8-table"><thead><tr><th>#</th><th>Team</th><th>PTS</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>GF</th></tr></thead><tbody>
      ${(rows || []).filter((r) => !isBye(rowTeam(r))).map((r, i) => `<tr><td>${i + 1}</td><td class="team">${esc(rowTeam(r))}</td><td>${esc(r.pts ?? r.points ?? 0)}</td><td>${esc(r.w ?? r.win ?? 0)}</td><td>${esc(r.d ?? r.draw ?? 0)}</td><td>${esc(r.l ?? r.loss ?? 0)}</td><td>${esc(r.gd ?? r.diff ?? 0)}</td><td>${esc(r.gf ?? r.for ?? 0)}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}</div>`);
  }

  function renderKnockout(state, eventName) {
    const list = knockout(state);
    if (!list.length) return empty('Knockout', 'ยังไม่มีสาย Knockout');
    return shell('Knockout', eventName, `<div class="phase8-panel"><table class="phase8-table"><thead><tr><th>Round</th><th>Team A</th><th>Score</th><th>Team B</th><th>Winner</th></tr></thead><tbody>
      ${list.map((m) => `<tr><td>${esc(m.round || m.stage || '')}</td><td class="team">${esc(team(m, 'teamA'))}</td><td>${esc(score(m, 'scoreA'))} - ${esc(score(m, 'scoreB'))}</td><td class="team">${esc(team(m, 'teamB'))}</td><td>${esc(m.winner || '')}</td></tr>`).join('')}
    </tbody></table></div>`);
  }
  function allDoneResults(state) { return [...realMatches(state), ...knockout(state)].filter((m) => done(m) || clean(m.winner)); }
  function latestResult(state) { return clean(state.lastResult?.teamA) ? state.lastResult : allDoneResults(state).slice(-1)[0]; }
  function renderLatestResult(state, eventName) {
    const r = latestResult(state);
    if (!r) return empty('Latest Result', 'ยังไม่มีผลล่าสุด');
    const a = team(r, 'teamA'), b = team(r, 'teamB');
    return `<div class="phase8-result"><div><div class="phase8-sub">${esc(eventName)} · ${esc(r.round || r.group || 'Latest Result')}</div><div class="teams">${esc(a)} vs ${esc(b)}</div><div class="score">${esc(score(r, 'scoreA'))} - ${esc(score(r, 'scoreB'))}</div><div class="phase8-sub">Winner: ${esc(r.winner || '')}</div></div></div>`;
  }
  function nextPending(state) { return [...realMatches(state), ...knockout(state)].find((m) => !done(m) && !clean(m.winner)); }
  function renderNextMatch(state, eventName) {
    const m = nextPending(state);
    if (!m) return empty('Next Match', 'ยังไม่มีคู่ถัดไป');
    return shell('Next Match', eventName, `<div class="phase8-result"><div><div class="phase8-sub">${esc(m.round || m.group || '')} · ${esc(m.time || m.startTime || '')}</div><div class="teams">${esc(team(m, 'teamA'))} vs ${esc(team(m, 'teamB'))}</div><div class="phase8-sub">${esc(m.court || m.field || '')}</div></div></div>`);
  }
  function renderLowerThird(state, eventName) {
    const m = nextPending(state) || latestResult(state);
    if (!m) return empty('Lower Third', eventName);
    return `<div class="phase8-wrap" style="justify-content:flex-end;min-height:100vh"><div class="phase8-panel"><h2>${esc(eventName)}</h2><div class="phase8-list"><div class="phase8-row"><span class="time">${esc(m.time || m.startTime || '')}</span><span class="main">${esc(team(m, 'teamA'))} vs ${esc(team(m, 'teamB'))}</span><span class="meta">${esc(m.round || m.group || '')}</span></div></div></div></div>`;
  }

  function ensureHealthPanel() {
    const panel = $('[data-panel="sources"]');
    if (!panel) return;
    if ($('#phase8SourceHealth')) return;
    const box = document.createElement('section');
    box.id = 'phase8SourceHealth';
    box.className = 'phase8-card';
    const head = panel.querySelector('.panel-head');
    if (head) head.insertAdjacentElement('afterend', box);
    else panel.prepend(box);
  }
  function renderHealthPanel() {
    if (isSourceView()) return;
    ensureHealthPanel();
    const box = $('#phase8SourceHealth');
    if (!box) return;
    const state = readState();
    const base = location.origin + location.pathname;
    const checks = {
      groups: !!(state.groups && Object.keys(state.groups).length),
      schedule: realMatches(state).length,
      standings: standingsEntries(state).some(([, r]) => r.length),
      knockout: knockout(state).length,
      latest: !!latestResult(state)
    };
    box.className = `phase8-card ${checks.groups && checks.schedule ? 'good' : 'warn'}`;
    box.innerHTML = `<div class="phase8-title"><span>Phase 8 · OBS Source Health</span><span class="phase8-badge ${checks.groups && checks.schedule ? 'good' : 'warn'}">${SOURCE_VIEWS.length} Sources</span></div><div class="phase8-text">Copy URL ไปใส่ OBS Browser Source ขนาดแนะนำ 1920×1080</div><div class="phase8-grid">${SOURCE_VIEWS.map(([id, label]) => `<div class="phase8-source"><b>${esc(label)}</b><small>${esc(base + '?view=' + id)}</small><div class="phase8-actions"><button class="btn" data-phase8-copy="${esc(base + '?view=' + id)}">Copy URL</button><button class="btn" data-phase8-open="${esc(base + '?view=' + id)}">Open</button></div></div>`).join('')}</div>`;
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('คัดลอก OBS URL แล้ว');
  }
  function toast(message) {
    const old = $('.phase8-toast'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'phase8-toast'; box.textContent = message;
    document.body.appendChild(box); setTimeout(() => box.remove(), 2200);
  }
  function bind() {
    document.addEventListener('click', (event) => {
      const copy = event.target.closest('[data-phase8-copy]'); if (copy) copyText(copy.dataset.phase8Copy);
      const open = event.target.closest('[data-phase8-open]'); if (open) window.open(open.dataset.phase8Open, '_blank');
      setTimeout(renderHealthPanel, 140);
    });
    window.addEventListener('focus', renderHealthPanel);
    window.addEventListener('storage', renderHealthPanel);
    setInterval(renderHealthPanel, 2000);
  }
  function install() { renderSource(); bind(); renderHealthPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
