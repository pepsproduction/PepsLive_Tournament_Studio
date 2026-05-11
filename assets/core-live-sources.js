/* Core Live Sources: stable OBS source renderer + draw layout sync */
(() => {
  'use strict';
  if (window.__PEPSLIVE_CORE_LIVE_SOURCES_INSTALLED__) return;
  window.__PEPSLIVE_CORE_LIVE_SOURCES_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const DRAW_TEXT_PREVIEW_KEY = 'pepsliveDrawTextPreview';
  const SOURCE_VIEWS = ['draw-animation', 'groups', 'schedule', 'standings', 'knockout', 'lower-third', 'next-match', 'latest-result'];
  const DRAW_SOURCE_ALIASES = ['wheel', 'slot', 'card', 'lottery', 'glitch', 'galaxy', 'crystal', 'plasma', 'vortex', 'winner'];
  const DEFAULT_DRAW_TEXT_SIZES = { chip: 13, groupLabel: 18, groupLetter: 18, team: 52, meta: 22, status: 18, sourceTeam: 52, sourceMeta: 22, groupTitle: 14, groupTeam: 14 };
  const LEGACY_DRAW_TEXT_DEFAULTS = { chip: 12, groupLabel: 16, groupLetter: 30, team: 56, meta: 14, status: 12, sourceTeam: 72, sourceMeta: 22, groupTitle: 14, groupTeam: 14 };
  const $ = (s, root = document) => root.querySelector(s);
  let lastSignature = '';
  let lastDrawSignature = '';

  const currentView = () => {
    const view = new URLSearchParams(location.search).get('view') || '';
    return DRAW_SOURCE_ALIASES.includes(view) ? 'draw-animation' : view;
  };
  const isObsSourceView = () => SOURCE_VIEWS.includes(currentView());
  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const isBye = (v) => clean(v).toUpperCase() === 'BYE';
  const asNum = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const readState = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } };
  const readTextPreview = () => { try { return JSON.parse(localStorage.getItem(DRAW_TEXT_PREVIEW_KEY) || 'null'); } catch { return null; } };
  const teamOf = (m, side) => clean(m?.[side] || m?.[side === 'teamA' ? 'home' : 'away'] || m?.teams?.[side === 'teamA' ? 0 : 1] || '');
  const scoreOf = (m, key) => { const v = m?.[key]; return v === '' || v == null ? '' : asNum(v); };
  const isDone = (m) => String(m?.status || '').toLowerCase() === 'done';

  function removeDuplicateHealthPanel() {
    $('#phase8SourceHealth')?.remove();
    $('#coreLiveSourceHealth')?.remove();
    document.querySelectorAll('.phase8-card').forEach((node) => {
      const text = node.textContent || '';
      if (text.includes('OBS Source Health') || text.includes('Core Live Sources') || text.includes('Phase 8') || text.includes('Live Source Readiness')) node.remove();
    });
  }

  function sourceRoot() {
    const legacy = $('#sourceRoot');
    if (legacy) { legacy.classList.add('hidden'); legacy.style.display = 'none'; legacy.innerHTML = ''; }
    const app = $('#app');
    if (app) app.style.display = 'none';
    let root = $('#coreSourceRoot');
    if (!root) { root = document.createElement('div'); root.id = 'coreSourceRoot'; document.body.prepend(root); }
    return root;
  }

  function applySourceBody(state) {
    const bg = state.settings?.sourceBg || 'dark';
    document.documentElement.classList.add('src-mode');
    document.body.className = `phase8-body ${bg}`;
    document.documentElement.style.background = bg === 'green' ? '#00b140' : (bg === 'transparent' ? 'transparent' : '#061426');
    document.documentElement.style.setProperty('--draw-fx-scale', String(Math.max(.45, Math.min(1.15, Number(state.settings?.drawAnimationScale || .72)))));
    applyDrawTextVars(state);
  }

  function normalizeDrawTextSizes(values = {}) {
    const looksLegacyDefault = Object.keys(LEGACY_DRAW_TEXT_DEFAULTS).every((key) => Number(values?.[key]) === LEGACY_DRAW_TEXT_DEFAULTS[key]);
    const normalized = looksLegacyDefault ? { ...DEFAULT_DRAW_TEXT_SIZES } : { ...DEFAULT_DRAW_TEXT_SIZES, ...values };
    normalized.sourceTeam = normalized.team;
    normalized.sourceMeta = normalized.meta;
    return normalized;
  }

  function drawTextSizes(state) {
    const saved = state.settings?.drawTextSizes || {};
    const preview = readTextPreview();
    return normalizeDrawTextSizes(preview ? { ...saved, ...preview } : saved);
  }

  function applyDrawTextVars(state) {
    const sizes = drawTextSizes(state);
    const root = document.documentElement;
    root.style.setProperty('--draw-chip-fs', `${sizes.chip}px`);
    root.style.setProperty('--draw-group-label-fs', `${sizes.groupLabel}px`);
    root.style.setProperty('--draw-group-letter-fs', `${sizes.groupLetter}px`);
    root.style.setProperty('--draw-team-fs', `${sizes.team}px`);
    root.style.setProperty('--draw-meta-fs', `${sizes.meta}px`);
    root.style.setProperty('--draw-status-fs', `${sizes.status}px`);
    root.style.setProperty('--source-team-fs', `${sizes.team}px`);
    root.style.setProperty('--source-meta-fs', `${sizes.meta}px`);
    root.style.setProperty('--group-title-fs', `${sizes.groupTitle}px`);
    root.style.setProperty('--group-team-fs', `${sizes.groupTeam}px`);
  }

  function shell(title, subtitle, content) {
    return `<div class="phase8-wrap"><div class="phase8-head"><div><div class="phase8-h1">${esc(title)}</div><div class="phase8-sub">${esc(subtitle || '')}</div></div></div>${content}</div>`;
  }
  function empty(title, message) { return `<div class="phase8-empty"><div><h1>${esc(title)}</h1><p>${esc(message)}</p></div></div>`; }
  const matches = (state) => Array.isArray(state.matches) ? state.matches : [];
  const knockout = (state) => Array.isArray(state.knockout) ? state.knockout : [];
  const realMatches = (state) => matches(state).filter((m) => !isBye(teamOf(m, 'teamA')) && !isBye(teamOf(m, 'teamB')));

  function letters(count) {
    return Array.from({ length: Math.max(1, Math.min(26, Number(count) || 4)) }, (_, i) => String.fromCharCode(65 + i));
  }

  function hasGroups(groups) {
    return Object.values(groups || {}).some((arr) => Array.isArray(arr) && arr.some((t) => clean(t) && !isBye(t)));
  }

  function groupsFromRevealFeed(state) {
    const groupKeys = letters(state.event?.groupCount || 4);
    const groups = Object.fromEntries(groupKeys.map((g) => [g, []]));
    const feed = Array.isArray(state.drawLive?.feed) ? [...state.drawLive.feed].reverse() : [];
    feed.forEach((item) => {
      if (!item || !item.group || item.group === 'ALL') return;
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group][Math.max(0, Number(item.slot || 1) - 1)] = item.team || '';
    });
    return groups;
  }

  function groupsForDisplay(state) {
    if (hasGroups(state.groups)) return state.groups;
    if (state.settings?.drawMethod === 'instant-all' && state.pendingComplete && hasGroups(state.pendingGroups)) return state.pendingGroups;
    return groupsFromRevealFeed(state);
  }

  function effectiveGroupColumns(state, availableWidth = window.innerWidth) {
    const requested = Math.max(1, Math.min(10, Number(state.settings?.groupColumns || 4) || 4));
    const byWidth = Math.max(1, Math.floor(Number(availableWidth || 1280) / 310));
    return Math.max(1, Math.min(requested, byWidth));
  }

  function modeLabel(mode) {
    return ({ wheel: 'Wheel Spin', slot: 'Slot Reveal', card: 'Card Draw', lottery: 'Lottery Ball', glitch: 'Glitch Cyber', galaxy: 'Galaxy Spiral', crystal: 'Crystal Oracle', plasma: 'Plasma Arc', vortex: 'Vortex Portal', winner: 'Winner Reveal' }[mode] || mode || 'Wheel Spin');
  }

  function drawFx(mode) {
    if (mode === 'wheel') return '<div class="wheel-visual"><div class="wheel-rotor"></div><div class="wheel-pointer"></div><div class="wheel-pulse-ring"></div><div class="wheel-dots"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i></div></div>';
    if (mode === 'slot') return '<div class="slot-visual peps-slot-machine"><div class="slot-frame"><div class="slot-reel slot-reel-group"><div class="slot-reel-track"><div class="slot-chip">สาย A</div><div class="slot-chip">สาย B</div><div class="slot-chip">สาย C</div><div class="slot-chip">สาย D</div><div class="slot-chip">สาย A</div><div class="slot-chip">สาย B</div></div></div><div class="slot-reel slot-reel-team"><div class="slot-reel-track"><div class="slot-chip">Golden Lion</div><div class="slot-chip">Wild Cats</div><div class="slot-chip">Blue Shark</div><div class="slot-chip">Peps United</div><div class="slot-chip">Thunder 3x3</div><div class="slot-chip">Sky Runner</div></div></div></div><div class="slot-shine"></div></div>';
    if (mode === 'card') return '<div class="card-visual"><div class="card-fan"><div class="card-suit">S</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">S</div></div><div class="card-fan"><div class="card-suit" style="color:#ff3b30">H</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end;color:#ff3b30">H</div></div><div class="card-fan"><div class="card-suit">C</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">C</div></div></div>';
    if (mode === 'lottery') return '<div class="lottery-visual"><div class="lottery-stand"></div><div class="lottery-base"></div><div class="lottery-cage"><div class="ball-cloud"><div class="ball-mini red">12</div><div class="ball-mini blue">45</div><div class="ball-mini red">08</div><div class="ball-mini blue">67</div><div class="ball-mini red">33</div><div class="ball-mini blue">91</div></div></div></div>';
    if (mode === 'glitch') return '<div class="glitch-visual"><div class="glitch-scanlines"></div><div class="glitch-lines"><div class="glitch-hline" style="--gi:1"></div><div class="glitch-hline" style="--gi:2"></div><div class="glitch-hline" style="--gi:3"></div><div class="glitch-hline" style="--gi:4"></div><div class="glitch-hline" style="--gi:5"></div></div><div class="glitch-text" data-text="SYSTEM">SYSTEM</div><div class="glitch-corner tl"></div><div class="glitch-corner tr"></div><div class="glitch-corner bl"></div><div class="glitch-corner br"></div></div>';
    if (mode === 'galaxy') return '<div class="galaxy-visual"><div class="galaxy-disk"></div><div class="galaxy-arm arm1"></div><div class="galaxy-arm arm2"></div><div class="galaxy-core"></div><div class="galaxy-star" style="--gd:0deg;--gr:40px;--gi:1"></div><div class="galaxy-star" style="--gd:72deg;--gr:60px;--gi:2"></div><div class="galaxy-star" style="--gd:144deg;--gr:80px;--gi:3"></div><div class="galaxy-star" style="--gd:216deg;--gr:50px;--gi:4"></div><div class="galaxy-star" style="--gd:288deg;--gr:70px;--gi:5"></div></div>';
    if (mode === 'crystal') return '<div class="crystal-visual"><div class="crystal-glow-bg"></div><div class="crystal-orb"><div class="crystal-inner"></div><div class="crystal-shine"></div><div class="crystal-spark" style="--ci:1"></div><div class="crystal-spark" style="--ci:2"></div><div class="crystal-spark" style="--ci:3"></div></div><div class="crystal-stand"></div><div class="crystal-base"></div></div>';
    if (mode === 'plasma') return '<div class="plasma-visual"><div class="plasma-ring ring1"></div><div class="plasma-ring ring2"></div><div class="plasma-ring ring3"></div><div class="plasma-core"></div><div class="plasma-arc" style="--pa:0deg"></div><div class="plasma-arc" style="--pa:120deg"></div><div class="plasma-arc" style="--pa:240deg"></div></div>';
    if (mode === 'vortex') return '<div class="vortex-visual"><div class="vortex-tunnel"><div class="vortex-layer" style="--vl:1"></div><div class="vortex-layer" style="--vl:2"></div><div class="vortex-layer" style="--vl:3"></div><div class="vortex-layer" style="--vl:4"></div><div class="vortex-layer" style="--vl:5"></div></div><div class="vortex-eye"></div></div>';
    if (mode === 'winner') return '<div class="winner-visual"><div class="winner-trophy">WIN</div><div class="winner-sparks"></div></div>';
    return '<div class="pl-ring"></div>';
  }

  function drawTickerItem(state) {
    const teams = Array.isArray(state.teams) && state.teams.length ? state.teams : ['READY'];
    const groups = letters(state.event?.groupCount || 4);
    const live = state.drawLive || {};
    const duration = Math.max(1000, Math.max(1, Math.min(20, Number(state.settings?.drawDuration || 5))) * 1000);
    const left = live.revealEndsAt ? Math.max(0, live.revealEndsAt - Date.now()) : duration;
    const progress = 1 - Math.min(1, left / duration);
    const interval = 32 + Math.round(progress * progress * 260);
    const tick = Math.floor(Date.now() / interval);
    return {
      team: teams[tick % teams.length],
      group: groups[(tick * 3) % groups.length],
      slot: ((tick * 5) % Math.max(1, Math.ceil(teams.length / groups.length))) + 1
    };
  }

  function drawLatest(state) {
    const live = state.drawLive || {};
    const feed = Array.isArray(live.feed) ? live.feed : [];
    if (live.waiting) return drawTickerItem(state);
    return live.current || live.pendingItem || feed[0] || { team: 'READY', group: '-', slot: '-' };
  }

  function renderDrawAnimation(state) {
    const live = state.drawLive || {};
    const item = drawLatest(state);
    const mode = state.settings?.drawAnimation || 'wheel';
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    const animState = (live.waiting || live.running) ? 'active' : (live.current ? 'result' : 'idle');
    return `<div class="pl-anim-source"><div class="draw-graphic draw-source-card ${animState} draw-style-${esc(mode)} draw-context-source"><div class="draw-layout"><div class="draw-header-zone"><div class="draw-style-label">${esc(modeLabel(mode))}</div><div class="draw-group-pill">GROUP <b data-draw-group>${esc(item.group || '-')}</b></div><div class="draw-status-text" data-draw-status>${live.waiting ? 'RUNNING' : 'READY'}</div></div><div class="draw-fx-zone"><div class="draw-fx-scale">${drawFx(mode)}</div></div><div class="draw-result-zone"><div class="draw-team-name"><span data-draw-team>${esc(item.team || 'READY')}</span></div><div class="draw-subtitle" data-draw-sub>${live.waiting ? 'กำลังรันรายชื่อและสาย...' : `สาย ${esc(item.group || '-')} · ลำดับ ${esc(item.slot || '-')}`}</div></div><div class="draw-progress-zone"><div class="draw-progress-track"><div class="draw-progress-bar" data-draw-bar style="width:${progress}%"></div></div><div class="draw-progress-meta"><span data-draw-caption>${live.waiting ? 'กำลังสุ่ม...' : 'พร้อมแสดงผล'}</span><span data-draw-pct>${progress}%</span></div></div></div></div></div>`;
  }

  function updateDrawText(root, state) {
    const live = state.drawLive || {};
    const item = drawLatest(state);
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    const set = (sel, val) => { const el = root.querySelector(sel); if (el && el.textContent !== String(val)) el.textContent = val; };
    set('[data-draw-group]', item.group || '-');
    set('[data-draw-status]', live.waiting ? 'RUNNING' : 'READY');
    set('[data-draw-team]', item.team || 'READY');
    set('[data-draw-sub]', live.waiting ? 'กำลังรันรายชื่อและสาย...' : `สาย ${item.group || '-'} · ลำดับ ${item.slot || '-'}`);
    set('[data-draw-caption]', live.waiting ? 'กำลังสุ่ม...' : 'พร้อมแสดงผล');
    set('[data-draw-pct]', `${progress}%`);
    const bar = root.querySelector('[data-draw-bar]');
    if (bar) bar.style.width = `${progress}%`;
  }

  function renderGroups(state) {
    const groups = groupsForDisplay(state);
    const keys = Object.keys(groups).length ? Object.keys(groups).sort() : letters(state.event?.groupCount || 4);
    const maxRows = Math.max(1, ...keys.map((g) => (groups[g] || []).length), Math.ceil(Math.max(1, (state.teams || []).length) / Math.max(1, keys.length)));
    const cols = effectiveGroupColumns(state, Math.min(1500, window.innerWidth * 0.96));
    const eventName = state.event?.name || 'PepsLive Tournament';
    return `<div class="pl-groups-source"><div class="pl-groups-board"><div class="pl-groups-head"><div><h1>${esc(eventName)}</h1><p>Groups Table · Reveal Feed / Confirm Result</p></div></div><div class="pl-groups-grid phase8-groups-grid" style="--groups-cols:${cols};grid-template-columns:repeat(${cols},minmax(180px,1fr));">${keys.map((group) => `<div class="pl-group-card"><div class="pl-group-title"><span>สาย ${esc(group)}</span><span>${(groups[group] || []).filter(Boolean).length} ทีม</span></div>${Array.from({ length: maxRows }, (_, i) => { const team = (groups[group] || [])[i] || ''; return `<div class="pl-group-row ${team ? '' : 'empty'}"><span class="no">${i + 1}</span><span class="team">${esc(team || 'รอผลสุ่ม')}</span></div>`; }).join('')}</div>`).join('')}</div></div></div>`;
  }

  function renderSchedule(state) { const list = realMatches(state); if (!list.length) return empty('Schedule', 'ยังไม่มีตารางแข่ง ให้ Generate Schedule ก่อน'); return shell('Schedule', state.event?.name || 'PepsLive Tournament', `<div class="phase8-panel"><table class="phase8-table"><thead><tr><th>Time</th><th>Court</th><th>Group</th><th>Team A</th><th>Team B</th><th>Status</th></tr></thead><tbody>${list.map((m) => `<tr><td>${esc(m.time || m.startTime || '')}</td><td>${esc(m.court || m.field || '')}</td><td>${esc(m.group || '')}</td><td class="team">${esc(teamOf(m, 'teamA'))}</td><td class="team">${esc(teamOf(m, 'teamB'))}</td><td>${esc(m.status || 'Pending')}</td></tr>`).join('')}</tbody></table></div>`); }
  function computeStandings(state) { const groups = state.standings && typeof state.standings === 'object' ? state.standings : {}; return Object.entries(groups).map(([g, rows]) => [g, Array.isArray(rows) ? rows : Object.entries(rows || {}).map(([team, data]) => ({ team, ...(data || {}) }))]).filter(([, rows]) => rows.length); }
  function renderStandings(state) { const entries = computeStandings(state); if (!entries.length) return empty('Standings Table', 'ยังไม่มีตารางคะแนน ให้บันทึก Scores ก่อน'); return shell('Standings Table', state.event?.name || 'PepsLive Tournament', `<div class="phase8-panel-grid">${entries.map(([group, rows]) => `<div class="phase8-panel"><h2>สาย ${esc(group)}</h2><table class="phase8-table"><thead><tr><th>#</th><th>Team</th><th>PTS</th><th>GD</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="team">${esc(r.team || r.name || '')}</td><td>${asNum(r.pts ?? r.points)}</td><td>${asNum(r.gd ?? r.diff)}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>`); }
  function renderKnockout(state) { const list = knockout(state); if (!list.length) return empty('Knockout', 'ยังไม่มีสาย Knockout'); return shell('Knockout', state.event?.name || 'PepsLive Tournament', `<div class="phase8-panel"><table class="phase8-table"><thead><tr><th>Round</th><th>Team A</th><th>Score</th><th>Team B</th><th>Winner</th></tr></thead><tbody>${list.map((m) => `<tr><td>${esc(m.round || m.stage || '')}</td><td class="team">${esc(teamOf(m, 'teamA'))}</td><td>${esc(scoreOf(m, 'scoreA'))} - ${esc(scoreOf(m, 'scoreB'))}</td><td class="team">${esc(teamOf(m, 'teamB'))}</td><td>${esc(m.winner || '')}</td></tr>`).join('')}</tbody></table></div>`); }
  const allDoneResults = (state) => [...realMatches(state), ...knockout(state)].filter((m) => isDone(m) || clean(m.winner));
  const latestResult = (state) => clean(state.lastResult?.teamA) ? state.lastResult : allDoneResults(state).slice(-1)[0];
  const nextPending = (state) => [...realMatches(state), ...knockout(state)].find((m) => !isDone(m) && !clean(m.winner));
  function renderLatestResult(state) { const r = latestResult(state); if (!r) return empty('Latest Result', 'ยังไม่มีผลล่าสุด'); return `<div class="phase8-result"><div><div class="phase8-sub">${esc(state.event?.name || 'PepsLive Tournament')}</div><div class="teams">${esc(teamOf(r, 'teamA'))} vs ${esc(teamOf(r, 'teamB'))}</div><div class="score">${esc(scoreOf(r, 'scoreA'))} - ${esc(scoreOf(r, 'scoreB'))}</div><div class="phase8-sub">Winner: ${esc(r.winner || '')}</div></div></div>`; }
  function renderNextMatch(state) { const m = nextPending(state); if (!m) return empty('Next Match', 'ยังไม่มีคู่ถัดไป'); return shell('Next Match', state.event?.name || 'PepsLive Tournament', `<div class="phase8-result"><div><div class="phase8-sub">${esc(m.round || m.group || '')} · ${esc(m.time || m.startTime || '')}</div><div class="teams">${esc(teamOf(m, 'teamA'))} vs ${esc(teamOf(m, 'teamB'))}</div><div class="phase8-sub">${esc(m.court || m.field || '')}</div></div></div>`); }
  function renderLowerThird(state) { const m = nextPending(state) || latestResult(state); if (!m) return empty('Lower Third', state.event?.name || 'PepsLive Tournament'); return `<div class="phase8-wrap" style="justify-content:flex-end;min-height:100vh"><div class="phase8-panel"><h2>${esc(state.event?.name || 'PepsLive Tournament')}</h2><div class="phase8-list"><div class="phase8-row"><span class="time">${esc(m.time || m.startTime || '')}</span><span class="main">${esc(teamOf(m, 'teamA'))} vs ${esc(teamOf(m, 'teamB'))}</span><span class="meta">${esc(m.round || m.group || '')}</span></div></div></div></div>`; }
  function renderByView(view, state) { if (view === 'groups') return renderGroups(state); if (view === 'schedule') return renderSchedule(state); if (view === 'standings') return renderStandings(state); if (view === 'knockout') return renderKnockout(state); if (view === 'latest-result') return renderLatestResult(state); if (view === 'next-match') return renderNextMatch(state); if (view === 'lower-third') return renderLowerThird(state); return empty('Source', 'Unknown source view'); }

  function paintSource() {
    const view = currentView(); if (!SOURCE_VIEWS.includes(view)) return;
    const state = readState(); applySourceBody(state); const root = sourceRoot();
    if (view === 'draw-animation') {
      const mode = state.settings?.drawAnimation || 'wheel'; const live = state.drawLive || {}; const item = drawLatest(state);
      const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
      const animState = (live.waiting || live.running) ? 'active' : (live.current ? 'result' : 'idle');
      const structureSig = `draw|${mode}|${animState}`;
      const textSig = `${item.team}|${item.group}|${item.slot}|${progress}|${live.waiting ? 1 : 0}`;
      if (lastSignature !== structureSig || !root.querySelector('.draw-source-card')) { root.innerHTML = renderDrawAnimation(state); lastSignature = structureSig; lastDrawSignature = textSig; }
      else if (lastDrawSignature !== textSig) { updateDrawText(root, state); lastDrawSignature = textSig; }
      return;
    }
    const signature = `${view}|${JSON.stringify(groupsForDisplay(state))}|${JSON.stringify(state.matches || [])}|${JSON.stringify(state.standings || {})}|${JSON.stringify(state.knockout || [])}|${JSON.stringify(state.lastResult || {})}|${state.settings?.groupColumns || 4}|${state.event?.name || ''}`;
    if (signature !== lastSignature) { root.innerHTML = renderByView(view, state); lastSignature = signature; }
  }

  function installSourceView() {
    paintSource();
    const delay = currentView() === 'draw-animation' ? 250 : 1000;
    const tick = () => { paintSource(); setTimeout(tick, delay); };
    setTimeout(tick, delay);
    window.addEventListener('storage', paintSource);
    window.addEventListener('focus', paintSource);
    window.addEventListener('resize', () => { lastSignature = ''; paintSource(); });
    window.addEventListener('peps:draw-style-changed', () => { lastSignature = ''; lastDrawSignature = ''; paintSource(); });
  }
  function installControlCleanup() { removeDuplicateHealthPanel(); window.addEventListener('focus', removeDuplicateHealthPanel); window.addEventListener('storage', removeDuplicateHealthPanel); document.addEventListener('click', () => setTimeout(removeDuplicateHealthPanel, 120)); setInterval(removeDuplicateHealthPanel, 1000); }
  function install() { if (isObsSourceView()) installSourceView(); else installControlCleanup(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
