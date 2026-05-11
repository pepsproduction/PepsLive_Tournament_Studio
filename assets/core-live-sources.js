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

  function drawFx(mode) {
    if (mode === 'wheel') return '<div class="wheel-visual"><div class="wheel-rotor"></div><div class="wheel-pointer"></div><div class="wheel-pulse-ring"></div><div class="wheel-dots"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i></div></div>';
    if (mode === 'slot') return '<div class="slot-visual"><div class="slot-top">JACKPOT</div><div class="slot-frame"><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#ff2f7e;--chip2:#c000ff">777</div><div class="slot-chip" style="--chip1:#08c3ff;--chip2:#1f6ad8">BAR</div></div></div><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#14d955;--chip2:#0b8032">WIN</div><div class="slot-chip" style="--chip1:#ff8c00;--chip2:#cc2900">777</div></div></div><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#c000ff;--chip2:#6600cc">BAR</div><div class="slot-chip" style="--chip1:#ff3b30;--chip2:#99140d">WIN</div></div></div><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#ffd400;--chip2:#cc8800">WIN</div><div class="slot-chip" style="--chip1:#08c3ff;--chip2:#1f6ad8">777</div></div></div></div></div>';
    if (mode === 'card') return '<div class="card-visual"><div class="card-fan"><div class="card-suit">♠</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">♠</div></div><div class="card-fan"><div class="card-suit" style="color:#ff3b30">♥</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end;color:#ff3b30">♥</div></div><div class="card-fan"><div class="card-suit">♣</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">♣</div></div></div>';
    if (mode === 'lottery') return '<div class="lottery-visual"><div class="lottery-stand"></div><div class="lottery-base"></div><div class="lottery-cage"><div class="ball-cloud"><div class="ball-mini red">12</div><div class="ball-mini blue">45</div><div class="ball-mini red">08</div><div class="ball-mini blue">67</div><div class="ball-mini red">33</div><div class="ball-mini blue">91</div></div></div></div>';
    if (mode === 'glitch') return '<div class="glitch-visual"><div class="glitch-scanlines"></div><div class="glitch-lines"><div class="glitch-hline" style="--gi:1"></div><div class="glitch-hline" style="--gi:2"></div><div class="glitch-hline" style="--gi:3"></div><div class="glitch-hline" style="--gi:4"></div><div class="glitch-hline" style="--gi:5"></div></div><div class="glitch-text" data-text="SYSTEM">SYSTEM</div><div class="glitch-corner tl"></div><div class="glitch-corner tr"></div><div class="glitch-corner bl"></div><div class="glitch-corner br"></div></div>';
    if (mode === 'galaxy') return '<div class="galaxy-visual"><div class="galaxy-disk"></div><div class="galaxy-arm arm1"></div><div class="galaxy-arm arm2"></div><div class="galaxy-core"></div><div class="galaxy-star" style="--gd:0deg;--gr:40px;--gi:1"></div><div class="galaxy-star" style="--gd:72deg;--gr:60px;--gi:2"></div><div class="galaxy-star" style="--gd:144deg;--gr:80px;--gi:3"></div><div class="galaxy-star" style="--gd:216deg;--gr:50px;--gi:4"></div><div class="galaxy-star" style="--gd:288deg;--gr:70px;--gi:5"></div></div>';
    if (mode === 'crystal') return '<div class="crystal-visual"><div class="crystal-glow-bg"></div><div class="crystal-orb"><div class="crystal-inner"></div><div class="crystal-shine"></div><div class="crystal-spark" style="--ci:1"></div><div class="crystal-spark" style="--ci:2"></div><div class="crystal-spark" style="--ci:3"></div></div><div class="crystal-stand"></div><div class="crystal-base"></div></div>';
    if (mode === 'plasma') return '<div class="plasma-visual"><div class="plasma-ring ring1"></div><div class="plasma-ring ring2"></div><div class="plasma-ring ring3"></div><div class="plasma-core"></div><div class="plasma-arc" style="--pa:0deg"></div><div class="plasma-arc" style="--pa:120deg"></div><div class="plasma-arc" style="--pa:240deg"></div></div>';
    if (mode === 'vortex') return '<div class="vortex-visual"><div class="vortex-tunnel"><div class="vortex-layer" style="--vl:1"></div><div class="vortex-layer" style="--vl:2"></div><div class="vortex-layer" style="--vl:3"></div><div class="vortex-layer" style="--vl:4"></div><div class="vortex-layer" style="--vl:5"></div></div><div class="vortex-eye"></div></div>';
    if (mode === 'winner') return '<div class="winner-visual"><div class="winner-trophy">🏆</div><div class="winner-sparks"></div></div>';
    return '<div class="pl-ring"></div>';
  }

  function sourceModeLabel(mode) {
    return ({
      wheel: 'Wheel Spin', slot: 'Slot Reveal', card: 'Card Draw', lottery: 'Lottery Ball',
      glitch: 'Glitch Cyber', galaxy: 'Galaxy Spiral', crystal: 'Crystal Oracle',
      plasma: 'Plasma Arc', vortex: 'Vortex Portal', winner: 'Winner Reveal'
    })[mode] || mode;
  }

  function renderDrawAnimation(state) {
    const live = state.drawLive || {};
    const current = live.current || live.pendingItem || null;
    const feed = Array.isArray(live.feed) ? live.feed : [];
    const latest = live.waiting ? { team: 'READY', group: '-', slot: '-' } : (current || feed[0] || { team: 'READY', group: '-', slot: '-' });
    const mode = state.settings?.drawAnimation || 'wheel';
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    const waiting = !!live.waiting;
    const running = !!live.running;
    const animState = (waiting || running) ? 'active' : (live.current ? 'result' : 'idle');

    // We use the same layout class as app.js so that it inherits the CSS
    return `
      <div class="pl-anim-source">
        <div class="pl-anim-core draw-graphic ${animState} mode-${esc(mode)}" style="background:transparent;box-shadow:none;border:none">
          <div class="draw-fx-zone">${drawFx(mode)}</div>
          <div class="draw-result-content">
            <div class="draw-chip">${esc(sourceModeLabel(mode))}</div>
            <div class="draw-group-badge">GROUP <b>${esc(latest.group || '-')}</b></div>
            <div class="pl-anim-name" style="margin-top:12px"><span>${esc(latest.team || 'READY')}</span></div>
            <div class="pl-anim-meta" style="margin-top:8px">${waiting ? 'กำลังสุ่มรายชื่อและสาย...' : `สาย ${esc(latest.group || '-')} · ลำดับ ${esc(latest.slot || '-')}`}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderGroups(state) {
    const groups = groupsForDisplay(state);
    const entries = Object.entries(groups);
    const eventName = state.event?.name || 'PepsLive Tournament';
    const hasData = entries.some(([_, teams]) => Array.isArray(teams) && teams.length > 0);
    if (!hasData) return empty('Groups Table', 'ยังไม่มีผลแบ่งสาย ให้ Confirm Draw ก่อน');
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
    
    if (view === 'draw-animation') {
      const live = state.drawLive || {};
      const current = live.current || live.pendingItem || null;
      const feed = Array.isArray(live.feed) ? live.feed : [];
      const latest = live.waiting ? { team: 'READY', group: '-', slot: '-' } : (current || feed[0] || { team: 'READY', group: '-', slot: '-' });
      const mode = state.settings?.drawAnimation || 'wheel';
      const waiting = !!live.waiting;
      const running = !!live.running;
      const animState = (waiting || running) ? 'active' : (live.current ? 'result' : 'idle');
      
      const sig = `draw-animation|${mode}`;
      if (lastSignature !== sig || !root.querySelector('.pl-anim-core')) {
        root.innerHTML = renderDrawAnimation(state);
        lastSignature = sig;
      } else {
        const core = root.querySelector('.pl-anim-core');
        if (core) {
          core.className = `pl-anim-core draw-graphic ${animState} mode-${esc(mode)}`;
          const badge = core.querySelector('.draw-group-badge b');
          if (badge) badge.textContent = latest.group || '-';
          const nameSpan = core.querySelector('.pl-anim-name span');
          if (nameSpan) nameSpan.textContent = latest.team || 'READY';
          const meta = core.querySelector('.pl-anim-meta');
          if (meta) meta.textContent = waiting ? 'กำลังสุ่มรายชื่อและสาย...' : `สาย ${latest.group || '-'} · ลำดับ ${latest.slot || '-'}`;
        }
      }
      return;
    }

    const html = renderByView(view, state);
    const signature = `${view}|${JSON.stringify(state.drawLive || {})}|${JSON.stringify(state.groups || {})}|${JSON.stringify(state.pendingGroups || {})}|${JSON.stringify(state.matches || [])}|${JSON.stringify(state.standings || {})}|${JSON.stringify(state.knockout || [])}|${JSON.stringify(state.lastResult || {})}`;
    if (signature !== lastSignature) {
      root.innerHTML = html;
      lastSignature = signature;
    }
    
    if (state.settings && state.settings.drawAnimationScale) {
      document.documentElement.style.setProperty('--draw-fx-scale', state.settings.drawAnimationScale);
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
    
    // Some logic in app.js still ticks for sourceRoot and might recreate it.
    // So we ensure coreSourceRoot stays.
    
    const isAnim = currentView() === 'draw-animation';
    paintSource();
    
    const tick = () => {
      paintSource();
      setTimeout(tick, isAnim ? 110 : 1000);
    };
    setTimeout(tick, isAnim ? 110 : 1000);
    
    window.addEventListener('storage', paintSource);
    window.addEventListener('focus', paintSource);
    window.addEventListener('peps:draw-style-changed', (e) => {
      if (e.detail && e.detail.style) {
        const root = document.getElementById('coreSourceRoot');
        if (root) {
          const core = root.querySelector('.draw-graphic');
          if (core) {
            core.className = `pl-anim-core draw-graphic active mode-${e.detail.style}`;
            root.innerHTML = renderDrawAnimation(readState());
          }
        }
      }
    });
    
    // Apply animation scale
    const s = readState();
    if (s.settings && s.settings.drawAnimationScale) {
      document.documentElement.style.setProperty('--draw-fx-scale', s.settings.drawAnimationScale);
    }
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
