/* Core Live Sources: OBS source takeover + control cleanup
   Fixes duplicate Live Sources panels, source flicker, and draw-animation routing.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_LIVE_SOURCES_INSTALLED__) return;
  window.__PEPSLIVE_CORE_LIVE_SOURCES_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const SOURCE_VIEWS = [
    'draw-animation', 'groups', 'schedule', 'standings', 'knockout',
    'lower-third', 'next-match', 'latest-result'
  ];
  const $ = (s, root = document) => root.querySelector(s);

  let lastSignature = '';

  function currentView() {
    return new URLSearchParams(location.search).get('view') || '';
  }

  function isObsSourceView() {
    return SOURCE_VIEWS.includes(currentView());
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function clean(v) { return String(v ?? '').trim(); }
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function isBye(v) { return clean(v).toUpperCase() === 'BYE'; }
  function asNum(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  function teamOf(m, side) { return clean(m?.[side] || m?.[side === 'teamA' ? 'home' : 'away'] || m?.teams?.[side === 'teamA' ? 0 : 1] || ''); }
  function scoreOf(m, key) { const v = m?.[key]; return v === '' || v == null ? '' : asNum(v); }
  function isDone(m) { return String(m?.status || '').toLowerCase() === 'done'; }

  function removeDuplicateHealthPanel() {
    $('#phase8SourceHealth')?.remove();
    $('#coreLiveSourceHealth')?.remove();
    // Older cached builds inserted this extra panel before the source cards.
    document.querySelectorAll('.phase8-card').forEach((node) => {
      const text = node.textContent || '';
      if (text.includes('OBS Source Health') || text.includes('Core Live Sources') || text.includes('Phase 8')) node.remove();
    });
  }

  function sourceRoot() {
    const legacy = $('#sourceRoot');
    if (legacy) {
      legacy.classList.add('hidden');
      legacy.style.display = 'none';
      legacy.innerHTML = '';
    }
    const app = $('#app');
    if (app) app.style.display = 'none';

    let root = $('#coreSourceRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'coreSourceRoot';
      document.body.prepend(root);
    }
    return root;
  }

  function applySourceBody(state) {
    const bg = state.settings?.sourceBg || 'dark';
    document.body.className = `phase8-body ${bg}`;
    document.documentElement.style.background = bg === 'green' ? '#00b140' : (bg === 'transparent' ? 'transparent' : '#061426');
  }

  function shell(title, subtitle, content) {
    return `<div class="phase8-wrap"><div class="phase8-head"><div><div class="phase8-h1">${esc(title)}</div><div class="phase8-sub">${esc(subtitle || '')}</div></div></div>${content}</div>`;
  }

  function empty(title, message) {
    return `<div class="phase8-empty"><div><h1>${esc(title)}</h1><p>${esc(message)}</p></div></div>`;
  }

  function matches(state) { return Array.isArray(state.matches) ? state.matches : []; }
  function knockout(state) { return Array.isArray(state.knockout) ? state.knockout : []; }
  function realMatches(state) { return matches(state).filter((m) => !isBye(teamOf(m, 'teamA')) && !isBye(teamOf(m, 'teamB'))); }

  function groupsForDisplay(state) {
    if (state.groups && Object.keys(state.groups).length) return state.groups;
    if (state.pendingGroups && Object.keys(state.pendingGroups).length) return state.pendingGroups;
    return {};
  }

  function renderDrawAnimation(state) {
    const eventName = state.event?.name || 'PepsLive Tournament';
    const live = state.drawLive || {};
    const current = live.current || live.pendingItem || null;
    const feed = Array.isArray(live.feed) ? live.feed : [];
    const latest = current || feed[feed.length - 1] || null;
    const style = state.settings?.drawAnimation || 'wheel';
    const progress = Math.max(0, Math.min(100, asNum(live.progress, 0)));
    const status = live.waiting || live.running ? 'DRAWING' : (live.finished || state.pendingComplete ? 'DRAW COMPLETE' : 'DRAW READY');

    if (!latest && !Object.keys(groupsForDisplay(state)).length) {
      return empty('Draw Animation', 'ยังไม่มีข้อมูลสุ่มสาย กด Start Draw ในหน้า Control ก่อน');
    }

    return `
      <div class="phase8-result">
        <div style="width:min(1200px,92vw);margin:auto;text-align:center">
          <div class="phase8-sub">${esc(eventName)} · ${esc(style)} · ${esc(status)}</div>
          <div class="phase8-panel" style="padding:34px 28px;margin-top:18px">
            <div class="phase8-sub">${latest ? `สาย ${esc(latest.group || '-') } · ลำดับ ${esc(latest.slot || '-')}` : 'ผลแบ่งสายล่าสุด'}</div>
            <div class="teams" style="margin-top:12px">${esc(latest?.team || 'Draw Animation Source')}</div>
            <div class="score" style="font-size:42px">${latest ? 'DRAW' : 'READY'}</div>
            <div class="phase8-sub">${esc(latest?.text || 'รอการ Reveal ทีมถัดไป')}</div>
            <div style="height:10px;background:rgba(255,255,255,.12);border-radius:999px;margin-top:22px;overflow:hidden">
              <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#5be7ff,#ff5bbd);border-radius:999px"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderGroups(state) {
    const groups = groupsForDisplay(state);
    const entries = Object.entries(groups);
    const eventName = state.event?.name || 'PepsLive Tournament';
    if (!entries.length) return empty('Groups Table', 'ยังไม่มีผลแบ่งสาย ให้ Confirm Draw ก่อน');
    return shell('Groups Table', eventName, `<div class="phase8-panel-grid">${entries.map(([group, teams]) => `
      <div class="phase8-panel"><h2>สาย ${esc(group)}</h2><table class="phase8-table"><thead><tr><th>#</th><th>Team</th><th>Note</th></tr></thead><tbody>
        ${(teams || []).filter((t) => clean(t)).map((t, i) => `<tr><td>${i + 1}</td><td class="team">${esc(t)}</td><td>${isBye(t) ? 'BYE' : ''}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}</div>`);
  }

  function renderSchedule(state) {
    const list = realMatches(state);
    const eventName = state.event?.name || 'PepsLive Tournament';
    if (!list.length) return empty('Schedule', 'ยังไม่มีตารางแข่ง ให้ Generate Schedule ก่อน');
    return shell('Schedule', eventName, `<div class="phase8-panel"><table class="phase8-table"><thead><tr><th>Time</th><th>Court</th><th>Group</th><th>Team A</th><th>Team B</th><th>Status</th></tr></thead><tbody>
      ${list.map((m) => `<tr><td>${esc(m.time || m.startTime || '')}</td><td>${esc(m.court || m.field || '')}</td><td>${esc(m.group || '')}</td><td class="team">${esc(teamOf(m, 'teamA'))}</td><td class="team">${esc(teamOf(m, 'teamB'))}</td><td>${esc(m.status || 'Pending')}</td></tr>`).join('')}
    </tbody></table></div>`);
  }

  function normalizeStandingRow(r, i = 0) {
    return {
      rank: asNum(r?.rank ?? r?.no ?? r?.pos ?? (i + 1), i + 1),
      team: clean(r?.team || r?.name || r?.Team || r?.title || ''),
      pts: asNum(r?.pts ?? r?.points ?? r?.PTS),
      w: asNum(r?.w ?? r?.win ?? r?.W),
      d: asNum(r?.d ?? r?.draw ?? r?.D),
      l: asNum(r?.l ?? r?.loss ?? r?.L),
      gf: asNum(r?.gf ?? r?.for ?? r?.GF),
      ga: asNum(r?.ga ?? r?.against ?? r?.GA),
      gd: asNum(r?.gd ?? r?.diff ?? r?.GD)
    };
  }

  function standingsEntries(state) {
    const s = state.standings && typeof state.standings === 'object' ? state.standings : {};
    if (Object.keys(s).length) {
      return Object.entries(s).map(([group, rows]) => {
        let list = [];
        if (Array.isArray(rows)) list = rows.map(normalizeStandingRow);
        else if (rows && typeof rows === 'object') list = Object.entries(rows).map(([team, data], i) => normalizeStandingRow({ team, ...(data || {}) }, i));
        list = list.filter((r) => r.team && !isBye(r.team));
        list.sort((a, b) => (a.rank - b.rank) || (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team, 'th'));
        return [group, list];
      }).filter(([, rows]) => rows.length);
    }
    return computeStandings(state);
  }

  function computeStandings(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    return Object.entries(groups).map(([group, teams]) => {
      const rows = (teams || []).filter((t) => clean(t) && !isBye(t)).map((team) => ({ rank: 0, team, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      const map = new Map(rows.map((r) => [r.team, r]));
      matches(state).forEach((m) => {
        if (clean(m.group || '') && clean(m.group || '') !== group) return;
        const a = teamOf(m, 'teamA'), b = teamOf(m, 'teamB');
        if (!map.has(a) || !map.has(b) || !isDone(m)) return;
        const sa = scoreOf(m, 'scoreA'), sb = scoreOf(m, 'scoreB');
        if (sa === '' || sb === '') return;
        const ra = map.get(a), rb = map.get(b);
        ra.gf += sa; ra.ga += sb; ra.gd = ra.gf - ra.ga;
        rb.gf += sb; rb.ga += sa; rb.gd = rb.gf - rb.ga;
        if (sa > sb) { ra.w += 1; rb.l += 1; ra.pts += asNum(state.event?.pointsWin, 3); rb.pts += asNum(state.event?.pointsLoss, 0); }
        else if (sb > sa) { rb.w += 1; ra.l += 1; rb.pts += asNum(state.event?.pointsWin, 3); ra.pts += asNum(state.event?.pointsLoss, 0); }
        else { ra.d += 1; rb.d += 1; ra.pts += asNum(state.event?.pointsDraw, 1); rb.pts += asNum(state.event?.pointsDraw, 1); }
      });
      rows.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (b.w - a.w) || a.team.localeCompare(b.team, 'th'));
      rows.forEach((r, i) => { r.rank = i + 1; });
      return [group, rows];
    }).filter(([, rows]) => rows.length);
  }

  function renderStandings(state) {
    const entries = standingsEntries(state);
    const eventName = state.event?.name || 'PepsLive Tournament';
    if (!entries.length) return empty('Standings Table', 'ยังไม่มีตารางคะแนน ให้บันทึก Scores ก่อน');
    return shell('Standings Table', eventName, `<div class="phase8-panel-grid">${entries.map(([group, rows]) => `
      <div class="phase8-panel"><h2>สาย ${esc(group)}</h2><table class="phase8-table"><thead><tr><th>#</th><th>Team</th><th>PTS</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="team">${esc(r.team)}</td><td>${r.pts}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}</div>`);
  }

  function renderKnockout(state) {
    const list = knockout(state);
    const eventName = state.event?.name || 'PepsLive Tournament';
    if (!list.length) return empty('Knockout', 'ยังไม่มีสาย Knockout');
    return shell('Knockout', eventName, `<div class="phase8-panel"><table class="phase8-table"><thead><tr><th>Round</th><th>Team A</th><th>Score</th><th>Team B</th><th>Winner</th></tr></thead><tbody>
      ${list.map((m) => `<tr><td>${esc(m.round || m.stage || '')}</td><td class="team">${esc(teamOf(m, 'teamA'))}</td><td>${esc(scoreOf(m, 'scoreA'))} - ${esc(scoreOf(m, 'scoreB'))}</td><td class="team">${esc(teamOf(m, 'teamB'))}</td><td>${esc(m.winner || '')}</td></tr>`).join('')}
    </tbody></table></div>`);
  }

  function allDoneResults(state) { return [...realMatches(state), ...knockout(state)].filter((m) => isDone(m) || clean(m.winner)); }
  function latestResult(state) { return clean(state.lastResult?.teamA) ? state.lastResult : allDoneResults(state).slice(-1)[0]; }
  function nextPending(state) { return [...realMatches(state), ...knockout(state)].find((m) => !isDone(m) && !clean(m.winner)); }

  function renderLatestResult(state) {
    const eventName = state.event?.name || 'PepsLive Tournament';
    const r = latestResult(state);
    if (!r) return empty('Latest Result', 'ยังไม่มีผลล่าสุด');
    const a = teamOf(r, 'teamA'), b = teamOf(r, 'teamB');
    return `<div class="phase8-result"><div><div class="phase8-sub">${esc(eventName)} · ${esc(r.round || r.group || 'Latest Result')}</div><div class="teams">${esc(a)} vs ${esc(b)}</div><div class="score">${esc(scoreOf(r, 'scoreA'))} - ${esc(scoreOf(r, 'scoreB'))}</div><div class="phase8-sub">Winner: ${esc(r.winner || '')}</div></div></div>`;
  }

  function renderNextMatch(state) {
    const eventName = state.event?.name || 'PepsLive Tournament';
    const m = nextPending(state);
    if (!m) return empty('Next Match', 'ยังไม่มีคู่ถัดไป');
    return shell('Next Match', eventName, `<div class="phase8-result"><div><div class="phase8-sub">${esc(m.round || m.group || '')} · ${esc(m.time || m.startTime || '')}</div><div class="teams">${esc(teamOf(m, 'teamA'))} vs ${esc(teamOf(m, 'teamB'))}</div><div class="phase8-sub">${esc(m.court || m.field || '')}</div></div></div>`);
  }

  function renderLowerThird(state) {
    const eventName = state.event?.name || 'PepsLive Tournament';
    const m = nextPending(state) || latestResult(state);
    if (!m) return empty('Lower Third', eventName);
    return `<div class="phase8-wrap" style="justify-content:flex-end;min-height:100vh"><div class="phase8-panel"><h2>${esc(eventName)}</h2><div class="phase8-list"><div class="phase8-row"><span class="time">${esc(m.time || m.startTime || '')}</span><span class="main">${esc(teamOf(m, 'teamA'))} vs ${esc(teamOf(m, 'teamB'))}</span><span class="meta">${esc(m.round || m.group || '')}</span></div></div></div></div>`;
  }

  function renderByView(view, state) {
    if (view === 'draw-animation') return renderDrawAnimation(state);
    if (view === 'groups') return renderGroups(state);
    if (view === 'schedule') return renderSchedule(state);
    if (view === 'standings') return renderStandings(state);
    if (view === 'knockout') return renderKnockout(state);
    if (view === 'latest-result') return renderLatestResult(state);
    if (view === 'next-match') return renderNextMatch(state);
    if (view === 'lower-third') return renderLowerThird(state);
    return empty('Source', 'Unknown source view');
  }

  function paintSource() {
    const view = currentView();
    if (!SOURCE_VIEWS.includes(view)) return;
    const state = readState();
    applySourceBody(state);
    const root = sourceRoot();
    const html = renderByView(view, state);
    const signature = `${view}|${JSON.stringify(state.drawLive || {})}|${JSON.stringify(state.groups || {})}|${JSON.stringify(state.pendingGroups || {})}|${JSON.stringify(state.matches || [])}|${JSON.stringify(state.standings || {})}|${JSON.stringify(state.knockout || [])}|${JSON.stringify(state.lastResult || {})}`;
    if (signature !== lastSignature) {
      root.innerHTML = html;
      lastSignature = signature;
    }
  }

  function installSourceView() {
    // Hide app.js renderer and use one stable core root. This prevents flicker.
    const legacy = $('#sourceRoot');
    if (legacy) {
      legacy.classList.add('hidden');
      legacy.style.display = 'none';
      legacy.innerHTML = '';
    }
    paintSource();
    setInterval(paintSource, 1000);
    window.addEventListener('storage', paintSource);
    window.addEventListener('focus', paintSource);
  }

  function installControlCleanup() {
    removeDuplicateHealthPanel();
    window.addEventListener('focus', removeDuplicateHealthPanel);
    window.addEventListener('storage', removeDuplicateHealthPanel);
    document.addEventListener('click', () => setTimeout(removeDuplicateHealthPanel, 120));
    setInterval(removeDuplicateHealthPanel, 1000);
  }

  function install() {
    if (isObsSourceView()) installSourceView();
    else installControlCleanup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
