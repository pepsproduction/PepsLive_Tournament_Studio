/* PepsLive Tournament Studio - Clean Core V13
   - Replaces old source model directly in assets/app.js
   - Draw Animation Source is single: ?view=draw-animation
   - Old aliases wheel/slot/card/lottery/glitch/galaxy/crystal/plasma/vortex/winner map to draw-animation
   - Live Sources remain: groups/schedule/standings/knockout/lower-third/next-match/latest-result
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const DRAW_TEXT_PREVIEW_KEY = 'pepsliveDrawTextPreviewV12';
  const APP_VERSION = 'Clean-Core-13.0.0';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const on = (el, evt, fn, opts) => { if (el) el.addEventListener(evt, fn, opts); };
  const nowIso = () => new Date().toISOString();
  const clamp = (v, min, max, d = min) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
  };
  const intClamp = (v, min, max, d = min) => Math.round(clamp(v, min, max, d));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  const PANELS = [
    ['dashboard', 'Dashboard', 'ภาพรวม'],
    ['setup', 'Setup', 'ตั้งค่ารายการ'],
    ['teams', 'Teams', 'รายชื่อทีม'],
    ['draw', 'Draw', 'สุ่มสาย'],
    ['schedule', 'Schedule', 'ตารางแข่ง'],
    ['scores', 'Scores', 'คะแนน/อันดับ'],
    ['knockout', 'Knockout', 'รอบต่อไป'],
    ['sources', 'Live Sources', 'OBS'],
    ['export', 'Export', 'Copy/Sheet'],
    ['settings', 'Settings', 'ตั้งค่า']
  ];

  const DRAW_SOURCE_ID = 'draw-animation';
  const DRAW_SOURCE_ALIASES = ['wheel', 'slot', 'card', 'lottery', 'glitch', 'galaxy', 'crystal', 'plasma', 'vortex', 'winner'];

  const SOURCES = [
    ['draw-animation', 'Draw Animation Source', 'ลิงก์เดียวสำหรับ OBS ดึง Animation Style จากหน้า Draw Control'],
    ['groups', 'Groups Table', 'แสดงตารางแบ่งสาย / กลุ่ม ตามผล Reveal Feed เท่านั้น'],
    ['schedule', 'Schedule Table', 'แสดงตารางแข่งพร้อมเวลาและสนาม'],
    ['standings', 'Standings Table', 'แสดงตารางคะแนนอัตโนมัติ'],
    ['knockout', 'Knockout Bracket', 'แสดงสายรอบ 8 ทีม / 4 ทีม / ชิง'],
    ['lower-third', 'Lower Third', 'แถบล่างสำหรับผลล่าสุด'],
    ['next-match', 'Next Match', 'แสดงคู่ถัดไปในตาราง'],
    ['latest-result', 'Latest Result', 'แสดงผลการแข่งขันล่าสุด']
  ];

  const SOURCE_META = Object.fromEntries(SOURCES.map(([id, title, desc]) => [id, { id, title, desc }]));

  const DEFAULT_DRAW_TEXT_SIZES = {
    chip: 12,
    groupLabel: 16,
    groupLetter: 30,
    team: 56,
    meta: 14,
    status: 12,
    sourceTeam: 72,
    sourceMeta: 22,
    groupTitle: 14,
    groupTeam: 14
  };

  function readDrawTextPreview() {
    try {
      return JSON.parse(localStorage.getItem(DRAW_TEXT_PREVIEW_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function normalizeDrawTextSizes(values = {}) {
    const normalized = { ...DEFAULT_DRAW_TEXT_SIZES, ...values };
    // OBS Draw Animation Source references Draw Control sizes.
    normalized.sourceTeam = normalized.team;
    normalized.sourceMeta = normalized.meta;
    return normalized;
  }

  function drawTextSizes(settings = state?.settings || {}, includePreview = true) {
    const saved = { ...DEFAULT_DRAW_TEXT_SIZES, ...((settings && settings.drawTextSizes) || {}) };
    const preview = includePreview ? readDrawTextPreview() : null;
    return normalizeDrawTextSizes(preview ? { ...saved, ...preview } : saved);
  }

  function setDrawTextSizeVars(values = drawTextSizes()) {
    const normalized = normalizeDrawTextSizes(values);
    const root = document.documentElement;
    root.style.setProperty('--draw-chip-fs', `${normalized.chip}px`);
    root.style.setProperty('--draw-group-label-fs', `${normalized.groupLabel}px`);
    root.style.setProperty('--draw-group-letter-fs', `${normalized.groupLetter}px`);
    root.style.setProperty('--draw-team-fs', `${normalized.team}px`);
    root.style.setProperty('--draw-meta-fs', `${normalized.meta}px`);
    root.style.setProperty('--draw-status-fs', `${normalized.status}px`);
    root.style.setProperty('--source-team-fs', `${normalized.team}px`);
    root.style.setProperty('--source-meta-fs', `${normalized.meta}px`);
    root.style.setProperty('--group-title-fs', `${normalized.groupTitle}px`);
    root.style.setProperty('--group-team-fs', `${normalized.groupTeam}px`);
  }

  function textSizeVarsStyle(values = drawTextSizes()) {
    const normalized = normalizeDrawTextSizes(values);
    return [
      `--draw-chip-fs:${normalized.chip}px`,
      `--draw-group-label-fs:${normalized.groupLabel}px`,
      `--draw-group-letter-fs:${normalized.groupLetter}px`,
      `--draw-team-fs:${normalized.team}px`,
      `--draw-meta-fs:${normalized.meta}px`,
      `--draw-status-fs:${normalized.status}px`,
      `--source-team-fs:${normalized.team}px`,
      `--source-meta-fs:${normalized.meta}px`,
      `--group-title-fs:${normalized.groupTitle}px`,
      `--group-team-fs:${normalized.groupTeam}px`
    ].join(';');
  }

  function publishDrawTextPreview(values) {
    const normalized = normalizeDrawTextSizes(values);
    try {
      localStorage.setItem(DRAW_TEXT_PREVIEW_KEY, JSON.stringify(normalized));
    } catch {}
    window.dispatchEvent(new CustomEvent('pepslive-draw-text-preview', { detail: normalized }));
  }

  function clearDrawTextPreview() {
    try {
      localStorage.removeItem(DRAW_TEXT_PREVIEW_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent('pepslive-draw-text-preview-clear'));
  }

  function effectiveGroupColumns(requested, availableWidth = window.innerWidth) {
    const requestedCols = intClamp(requested || state.settings.groupColumns || 4, 1, 10, 4);
    const safeWidth = Math.max(240, Number(availableWidth) || 960);
    const maxByWidth = Math.max(1, Math.floor(safeWidth / 220));
    return Math.max(1, Math.min(requestedCols, maxByWidth));
  }


  const sampleTeamList = [
    'Volcano A', 'Volcano B', 'Sisaket One', 'Sisaket Two',
    'Thunder 3x3', 'Dragon Hoop', 'Peps United', 'Moonlight',
    'Red Phoenix', 'Blue Shark', 'Rocket Team', 'Wild Cats',
    'Storm Rider', 'Black Wolf', 'Golden Lion', 'Sky Runner'
  ];

  let state = loadState();
  let activePanel = 'dashboard';
  let modalSource = null;
  let saveTimer = null;
  let drawTimer = null;
  let drawTickerTimer = null;
  let scheduleTimer = null;

  function defaultState() {
    return {
      version: APP_VERSION,
      updatedAt: nowIso(),
      event: {
        name: 'PepsLive Tournament',
        sport: 'Basketball 3x3',
        preset: 'custom',
        groupCount: 4,
        courtCount: 1,
        startTime: '09:00',
        matchInterval: 15,
        breakEverySlots: 0,
        breakMinutes: 0,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        qualifiersPerGroup: 2,
        enableThird: true,
        enableFinal: true
      },
      teams: [],
      groups: {},
      pendingGroups: null,
      drawHistory: [],
      pendingSequence: [],
      pendingRevealIndex: 0,
      pendingComplete: false,
      drawLive: {
        running: false,
        waiting: false,
        finished: false,
        phase: 'idle',
        current: null,
        pendingItem: null,
        revealEndsAt: 0,
        progress: 0,
        total: 0,
        feed: []
      },
      matches: [],
      pendingSchedule: [],
      scheduleLive: { running: false, waiting: false, revealEndsAt: 0, total: 0, style: 'shuffle' },
      standings: {},
      qualifierOverrides: {},
      knockout: [],
      lastResult: null,
      settings: {
        safeLive: true,
        sourceBg: 'dark',
        fontScale: 1,
        drawAnimation: 'wheel',
        drawMethod: 'auto-sequence',
        drawDuration: 5,
        randomizeSchedule: true,
        scheduleDuration: 5,
        scheduleRevealStyle: 'shuffle',
        sidebarWidth: 284,
        appMaxWidth: 1280,
        drawStageHeight: 420,
        drawPanelMode: 'normal',
        uiDensity: 'comfortable',
        groupColumns: 4,
        drawTextSizes: { ...DEFAULT_DRAW_TEXT_SIZES }
      },
      webhook: { url: '', token: '', sheetId: '' },
      audit: []
    };
  }

  function merge(base, incoming) {
    if (!incoming || typeof incoming !== 'object') return base;
    for (const [k, v] of Object.entries(incoming)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = merge(base[k], v);
      } else {
        base[k] = v;
      }
    }
    base.version = APP_VERSION;
    return base;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return merge(defaultState(), JSON.parse(raw));
    } catch (err) {
      console.warn('loadState failed', err);
      return defaultState();
    }
  }

  function saveState(note = 'save', render = true) {
    state.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSavePill();
    applyLayoutSettings();
    if (render) renderAll(false);
    if (note) console.debug('[PepsLive] saved', note);
  }

  function scheduleSave(note) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(note), 180);
  }

  function audit(action, data = {}) {
    state.audit.unshift({ at: nowIso(), action, data });
    state.audit = state.audit.slice(0, 100);
  }

  function sourceUrl(id) {
    const normalized = normalizeSourceView(id);
    const base = location.href.split('?')[0].split('#')[0];
    return `${base}?view=${encodeURIComponent(normalized)}`;
  }

  function normalizeSourceView(view) {
    if (DRAW_SOURCE_ALIASES.includes(view)) return DRAW_SOURCE_ID;
    return view || '';
  }

  function letters(count) {
    const n = intClamp(count, 1, 26, 4);
    return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  }

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function parseTeams(text) {
    return String(text || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  }

  function normalizeName(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function uniqueTeams(list) {
    const seen = new Set();
    const out = [];
    for (const team of list) {
      const key = normalizeName(team);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(team);
    }
    return out;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function init() {
    injectCoreCss();

    const params = new URLSearchParams(location.search);
    const view = normalizeSourceView(params.get('view') || '');
    if (view && view !== 'control') {
      renderSource(view);
      return;
    }

    applyLayoutSettings();
    buildNav();
    bindEvents();
    fillForms();
    renderAll(true);
  }

  function buildNav() {
    const nav = $('#nav');
    if (!nav) return;

    nav.innerHTML = PANELS.map(([id, title, sub], i) => `
      <button class="navbtn ${id === activePanel ? 'active' : ''}" data-panel-target="${esc(id)}" type="button">
        <span>${esc(title)}<br><small>${esc(sub)}</small></span>
        <small>${i + 1}</small>
      </button>
    `).join('');

    $$('[data-panel-target]', nav).forEach(btn => {
      on(btn, 'click', () => showPanel(btn.dataset.panelTarget));
    });
  }

  function bindEvents() {
    on($('#goNext'), 'click', () => showPanel(nextPanel()));
    on($('#btnSaveProject'), 'click', downloadJson);
    on($('#loadProjectInput'), 'change', loadJsonFile);
    on($('#safeLiveToggle'), 'change', e => {
      state.settings.safeLive = !!e.target.checked;
      saveState('safe-live');
    });

    on($('#preset'), 'change', applyPreset);
    on($('#saveSetup'), 'click', saveSetupFromForm);
    on($('#resetAll'), 'click', resetAll);

    on($('#saveTeams'), 'click', saveTeamsFromText);
    on($('#dedupeTeams'), 'click', dedupeTeams);
    on($('#sampleTeams'), 'click', sampleTeams);

    on($('#drawAnimation'), 'change', e => {
      state.settings.drawAnimation = e.target.value;
      saveState('draw-animation');
    });
    on($('#drawMethod'), 'change', e => {
      state.settings.drawMethod = e.target.value;
      saveState('draw-method');
    });
    on($('#drawDuration'), 'input', e => {
      state.settings.drawDuration = intClamp(e.target.value, 1, 20, 5);
      setText($('#drawDurationValue'), state.settings.drawDuration);
      scheduleSave('draw-duration');
    });
    on($('#startDraw'), 'click', startDraw);
    on($('#nextReveal'), 'click', () => nextReveal());
    on($('#confirmDraw'), 'click', confirmDraw);
    on($('#redraw'), 'click', resetPreparedDraw);
    on($('#undoDraw'), 'click', undoDraw);
    on($('#toggleDrawExpand'), 'click', toggleDrawExpand);

    on($('#generateSchedule'), 'click', generateSchedule);
    on($('#rebalanceSchedule'), 'click', generateSchedule);
    on($('#copyScheduleBtn'), 'click', () => copyKind('schedule'));
    on($('#scheduleDuration'), 'input', e => {
      state.settings.scheduleDuration = intClamp(e.target.value, 1, 15, 5);
      setText($('#scheduleDurationValue'), state.settings.scheduleDuration);
      scheduleSave('schedule-duration');
    });
    on($('#randomizeSchedule'), 'change', e => {
      state.settings.randomizeSchedule = !!e.target.checked;
      saveState('randomize-schedule');
    });
    on($('#scheduleRevealStyle'), 'change', e => {
      state.settings.scheduleRevealStyle = e.target.value;
      saveState('schedule-style');
    });

    on($('#saveScores'), 'click', readScores);
    on($('#markAllPending'), 'click', () => {
      state.matches.forEach(m => { m.status = 'Pending'; });
      audit('mark-all-pending');
      saveState('mark-all-pending');
    });
    on($('#copyStandingsBtn'), 'click', () => copyKind('standings'));

    on($('#enableThird'), 'change', e => {
      state.event.enableThird = !!e.target.checked;
      saveState('enable-third');
    });
    on($('#enableFinal'), 'change', e => {
      state.event.enableFinal = !!e.target.checked;
      saveState('enable-final');
    });
    on($('#generateKnockout'), 'click', generateKnockout);
    on($('#copyKnockoutBtn'), 'click', () => copyKind('knockout'));
    on($('#clearOverrides'), 'click', () => {
      state.qualifierOverrides = {};
      saveState('clear-overrides');
    });

    $$('[data-copy]').forEach(btn => on(btn, 'click', () => copyKind(btn.dataset.copy)));

    on($('#saveWebhook'), 'click', saveWebhookFromForm);
    on($('#testWebhook'), 'click', () => sendWebhook(true));
    on($('#sendWebhook'), 'click', () => sendWebhook(false));

    on($('#sourceBg'), 'change', e => {
      state.settings.sourceBg = e.target.value;
      saveState('source-bg');
    });
    on($('#fontScale'), 'input', e => {
      state.settings.fontScale = Number(e.target.value || 1);
      scheduleSave('font-scale');
    });
    on($('#sidebarWidth'), 'input', e => updateRangeSetting('sidebarWidth', e.target.value, 220, 430, 'sidebarWidthValue'));
    on($('#appMaxWidth'), 'input', e => updateRangeSetting('appMaxWidth', e.target.value, 1100, 1900, 'appMaxWidthValue'));
    on($('#drawStageHeight'), 'input', e => updateRangeSetting('drawStageHeight', e.target.value, 300, 760, 'drawStageHeightValue'));
    on($('#drawPanelMode'), 'change', e => {
      state.settings.drawPanelMode = e.target.value;
      applyLayoutSettings();
      saveState('draw-panel-mode');
    });
    on($('#uiDensity'), 'change', e => {
      state.settings.uiDensity = e.target.value;
      applyLayoutSettings();
      saveState('ui-density');
    });
    on($('#saveLayoutSettings'), 'click', () => saveState('layout'));
    on($('#resetLayoutSettings'), 'click', resetLayoutSettings);
    on($('#saveDisplaySettings'), 'click', () => saveState('display'));

    on($('#closeModal'), 'click', () => $('#sourceModal')?.classList.remove('open'));
    on($('#copyModalUrl'), 'click', () => modalSource && copyText(sourceUrl(modalSource), 'คัดลอก URL แล้ว'));
    on($('#openModalUrl'), 'click', () => modalSource && window.open(sourceUrl(modalSource), '_blank'));

    document.addEventListener('click', (e) => {
      const sourceBtn = e.target.closest('[data-open-source]');
      if (sourceBtn) openSourceModal(sourceBtn.dataset.openSource);
      const copyBtn = e.target.closest('[data-copy-source]');
      if (copyBtn) copyText(sourceUrl(copyBtn.dataset.copySource), 'คัดลอก URL แล้ว');
      const previewBtn = e.target.closest('[data-preview-source]');
      if (previewBtn) window.open(sourceUrl(previewBtn.dataset.previewSource), '_blank');
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeDrawOverlay();
    });
  }

  function showPanel(id) {
    if (!PANELS.some(([pid]) => pid === id)) id = 'dashboard';
    activePanel = id;
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    $$('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.panelTarget === id));
    renderAll(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextPanel() {
    const i = PANELS.findIndex(([id]) => id === activePanel);
    return PANELS[(i + 1) % PANELS.length][0];
  }

  function fillForms() {
    setValue($('#eventName'), state.event.name);
    setValue($('#sportType'), state.event.sport);
    setValue($('#preset'), state.event.preset);
    setValue($('#groupCount'), state.event.groupCount);
    setValue($('#courtCount'), state.event.courtCount);
    setValue($('#startTime'), state.event.startTime);
    setValue($('#matchInterval'), state.event.matchInterval);
    setValue($('#breakEverySlots'), state.event.breakEverySlots);
    setValue($('#breakMinutes'), state.event.breakMinutes);
    setValue($('#pointsWin'), state.event.pointsWin);
    setValue($('#pointsDraw'), state.event.pointsDraw);
    setValue($('#pointsLoss'), state.event.pointsLoss);
    setValue($('#qualifiersPerGroup'), state.event.qualifiersPerGroup);
    setValue($('#teamText'), state.teams.join('\n'));
    setChecked($('#safeLiveToggle'), state.settings.safeLive);
    setValue($('#drawAnimation'), state.settings.drawAnimation);
    setValue($('#drawMethod'), state.settings.drawMethod);
    setValue($('#drawDuration'), state.settings.drawDuration);
    setText($('#drawDurationValue'), state.settings.drawDuration);
    setValue($('#scheduleDuration'), state.settings.scheduleDuration);
    setText($('#scheduleDurationValue'), state.settings.scheduleDuration);
    setChecked($('#randomizeSchedule'), state.settings.randomizeSchedule !== false);
    setValue($('#scheduleRevealStyle'), state.settings.scheduleRevealStyle);
    setChecked($('#enableThird'), state.event.enableThird);
    setChecked($('#enableFinal'), state.event.enableFinal);
    setValue($('#webhookUrl'), state.webhook.url);
    setValue($('#webhookToken'), state.webhook.token);
    setValue($('#sheetId'), state.webhook.sheetId);
    setValue($('#sourceBg'), state.settings.sourceBg);
    setValue($('#fontScale'), state.settings.fontScale);
    setValue($('#sidebarWidth'), state.settings.sidebarWidth);
    setText($('#sidebarWidthValue'), state.settings.sidebarWidth);
    setValue($('#appMaxWidth'), state.settings.appMaxWidth);
    setText($('#appMaxWidthValue'), state.settings.appMaxWidth);
    setValue($('#drawStageHeight'), state.settings.drawStageHeight);
    setText($('#drawStageHeightValue'), state.settings.drawStageHeight);
    setValue($('#drawPanelMode'), state.settings.drawPanelMode);
    setValue($('#uiDensity'), state.settings.uiDensity);
    applyLayoutSettings();
  }

  function setValue(el, v) { if (el) el.value = v ?? ''; }
  function setText(el, v) { if (el) el.textContent = String(v ?? ''); }
  function setChecked(el, v) { if (el) el.checked = !!v; }

  function setSavePill() {
    const pill = $('#autosavePill');
    if (pill) pill.textContent = 'Auto Save: ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sheet = $('#sheetPill');
    if (sheet) sheet.textContent = state.webhook.url ? 'Google Sheet: Ready' : 'Google Sheet: Not set';
  }

  function saveSetupFromForm() {
    state.event.name = $('#eventName')?.value.trim() || 'PepsLive Tournament';
    state.event.sport = $('#sportType')?.value || 'Custom';
    state.event.preset = $('#preset')?.value || 'custom';
    state.event.groupCount = intClamp($('#groupCount')?.value, 1, 26, 4);
    state.event.courtCount = intClamp($('#courtCount')?.value, 1, 16, 1);
    state.event.startTime = $('#startTime')?.value || '09:00';
    state.event.matchInterval = intClamp($('#matchInterval')?.value, 1, 240, 15);
    state.event.breakEverySlots = intClamp($('#breakEverySlots')?.value, 0, 1000, 0);
    state.event.breakMinutes = intClamp($('#breakMinutes')?.value, 0, 240, 0);
    state.event.pointsWin = Number($('#pointsWin')?.value || 3);
    state.event.pointsDraw = Number($('#pointsDraw')?.value || 1);
    state.event.pointsLoss = Number($('#pointsLoss')?.value || 0);
    state.event.qualifiersPerGroup = intClamp($('#qualifiersPerGroup')?.value, 1, 8, 2);
    audit('save-setup', state.event);
    saveState('setup');
    toast('บันทึก Setup แล้ว', 'good');
  }

  function applyPreset() {
    const p = $('#preset')?.value || 'custom';
    if (p === 'basket3x3') {
      setValue($('#sportType'), 'Basketball 3x3');
      setValue($('#groupCount'), 4);
      setValue($('#matchInterval'), 12);
      setValue($('#pointsWin'), 1);
      setValue($('#pointsDraw'), 0);
      setValue($('#pointsLoss'), 0);
    } else if (p === 'football') {
      setValue($('#sportType'), 'Football');
      setValue($('#groupCount'), 4);
      setValue($('#matchInterval'), 20);
      setValue($('#pointsWin'), 3);
      setValue($('#pointsDraw'), 1);
      setValue($('#pointsLoss'), 0);
    } else if (p === 'esport') {
      setValue($('#sportType'), 'Esport');
      setValue($('#groupCount'), 4);
      setValue($('#matchInterval'), 30);
      setValue($('#pointsWin'), 3);
      setValue($('#pointsDraw'), 0);
      setValue($('#pointsLoss'), 0);
    }
  }

  function saveTeamsFromText() {
    state.teams = uniqueTeams(parseTeams($('#teamText')?.value || ''));
    setValue($('#teamText'), state.teams.join('\n'));
    resetTournamentDerivedData();
    audit('save-teams', { count: state.teams.length });
    saveState('teams');
    toast('บันทึกรายชื่อทีมแล้ว', 'good');
  }

  function resetTournamentDerivedData() {
    clearDrawTimers();
    clearTimeout(scheduleTimer);
    state.groups = {};
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = {
      running: false,
      waiting: false,
      finished: false,
      phase: 'idle',
      current: null,
      pendingItem: null,
      revealEndsAt: 0,
      progress: 0,
      total: 0,
      feed: []
    };
    state.matches = [];
    state.pendingSchedule = [];
    state.scheduleLive = { running: false, waiting: false, revealEndsAt: 0, total: 0, style: state.settings.scheduleRevealStyle || 'shuffle' };
    state.standings = {};
    state.qualifierOverrides = {};
    state.knockout = [];
    state.lastResult = null;
  }

  function dedupeTeams() {
    const result = uniqueTeams(parseTeams($('#teamText')?.value || ''));
    setValue($('#teamText'), result.join('\n'));
    saveTeamsFromText();
  }

  function sampleTeams() {
    setValue($('#teamText'), sampleTeamList.join('\n'));
    saveTeamsFromText();
  }

  function teamValidation() {
    const teams = state.teams || [];
    const seen = new Map();
    const dup = [];
    for (const t of teams) {
      const k = normalizeName(t);
      if (seen.has(k)) dup.push(t);
      seen.set(k, true);
    }
    const groupCount = intClamp(state.event.groupCount, 1, 26, 4);
    const slots = Math.ceil(Math.max(teams.length, 1) / groupCount) * groupCount;
    return { teams, dup, groupCount, slots, byes: Math.max(0, slots - teams.length), ok: teams.length > 0 && dup.length === 0 };
  }

  function buildDrawPlan() {
    const v = teamValidation();
    if (!v.ok) return null;
    const groupKeys = letters(v.groupCount);
    const shuffled = shuffle(state.teams);
    while (shuffled.length < v.slots) shuffled.push('BYE');

    const groups = Object.fromEntries(groupKeys.map(g => [g, []]));
    shuffled.forEach((team, idx) => {
      const g = groupKeys[idx % groupKeys.length];
      groups[g].push(team);
    });

    const items = [];
    groupKeys.forEach(g => {
      groups[g].forEach((team, i) => items.push({
        order: items.length + 1,
        group: g,
        slot: i + 1,
        team,
        text: `สาย ${g} · ลำดับ ${i + 1} · ${team}`
      }));
    });

    return { groups, sequence: shuffle(items), byes: v.byes };
  }

  function startDraw() {
    if (state.drawLive?.waiting) {
      toast('กำลังเล่นอนิเมชั่นอยู่ รอก่อน', 'warn');
      return;
    }

    const plan = buildDrawPlan();
    if (!plan) {
      toast('กรุณาบันทึกรายชื่อทีมก่อนสุ่ม', 'warn');
      showPanel('teams');
      return;
    }

    state.pendingGroups = deepClone(plan.groups);
    state.pendingSequence = deepClone(plan.sequence);
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = {
      running: false,
      waiting: false,
      finished: false,
      phase: 'prepared',
      current: null,
      pendingItem: null,
      revealEndsAt: 0,
      progress: 0,
      total: plan.sequence.length,
      feed: []
    };
    audit('prepare-draw', { total: plan.sequence.length, byes: plan.byes, method: state.settings.drawMethod });
    saveState('draw-prepared', false);

    if (state.settings.drawMethod === 'instant-all') {
      revealAllAtOnce();
    } else {
      nextReveal();
    }
  }

  function nextReveal() {
    if (state.drawLive?.waiting) {
      toast('กำลังเล่นอนิเมชั่นอยู่ รอก่อน', 'warn');
      return;
    }
    if (!state.pendingSequence?.length) {
      toast('ยังไม่มีผลสุ่มที่เตรียมไว้', 'warn');
      return;
    }
    if (state.pendingRevealIndex >= state.pendingSequence.length) {
      completeDrawSequence();
      return;
    }

    const item = state.pendingSequence[state.pendingRevealIndex];
    beginDrawSuspense(item);
  }

  function beginDrawSuspense(item) {
    clearDrawTimers();
    const duration = intClamp(state.settings.drawDuration, 1, 20, 5) * 1000;

    state.drawLive.waiting = true;
    state.drawLive.running = true;
    state.drawLive.phase = 'suspense';
    state.drawLive.pendingItem = deepClone(item);
    state.drawLive.current = null;
    state.drawLive.revealEndsAt = Date.now() + duration;
    state.drawLive.progress = state.pendingRevealIndex;
    state.drawLive.total = state.pendingSequence.length;

    saveState('draw-suspense', false);
    renderAll(false);
    startDrawTicker();

    drawTimer = setTimeout(() => {
      state.pendingRevealIndex += 1;
      revealDrawItem(item);
      const finished = state.pendingRevealIndex >= state.pendingSequence.length;
      if (finished) completeDrawSequence(false);
      saveState('draw-reveal');
      if (!finished && state.settings.drawMethod === 'auto-sequence') {
        setTimeout(() => nextReveal(), 280);
      }
    }, duration);
  }

  function revealAllAtOnce() {
    clearDrawTimers();
    const duration = intClamp(state.settings.drawDuration, 1, 20, 5) * 1000;
    state.drawLive.waiting = true;
    state.drawLive.running = true;
    state.drawLive.phase = 'bulk-suspense';
    state.drawLive.pendingItem = { group: 'ALL', slot: '-', team: `${state.pendingSequence.length} Teams` };
    state.drawLive.revealEndsAt = Date.now() + duration;
    state.drawLive.progress = 0;
    state.drawLive.total = state.pendingSequence.length;
    saveState('draw-bulk-suspense', false);
    renderAll(false);
    startDrawTicker();

    drawTimer = setTimeout(() => {
      state.pendingRevealIndex = state.pendingSequence.length;
      state.pendingComplete = true;
      state.drawLive.waiting = false;
      state.drawLive.running = false;
      state.drawLive.phase = 'bulk-revealed';
      state.drawLive.current = deepClone(state.pendingSequence[state.pendingSequence.length - 1] || null);
      state.drawLive.pendingItem = null;
      state.drawLive.progress = state.pendingSequence.length;
      state.drawLive.feed = [...state.pendingSequence].reverse().slice(0, 20);
      state.lastResult = { type: 'draw-reveal-all', text: `สุ่มครบทั้งหมด ${state.pendingSequence.length} รายการแล้ว`, at: nowIso() };
      saveState('draw-reveal-all');
      clearDrawTimers(false);
    }, duration);
  }

  function revealDrawItem(item) {
    state.drawLive.waiting = false;
    state.drawLive.running = false;
    state.drawLive.phase = 'revealed';
    state.drawLive.current = deepClone(item);
    state.drawLive.pendingItem = null;
    state.drawLive.progress = state.pendingRevealIndex;
    state.drawLive.total = state.pendingSequence.length;
    state.drawLive.feed.unshift({ ...item, progress: state.pendingRevealIndex, total: state.pendingSequence.length });
    state.drawLive.feed = state.drawLive.feed.slice(0, 20);
    state.lastResult = { type: 'draw-reveal', text: item.text, at: nowIso() };
    audit('draw-reveal', item);
    clearDrawTimers(false);
  }

  function completeDrawSequence(save = true) {
    state.pendingComplete = true;
    state.drawLive.running = false;
    state.drawLive.waiting = false;
    state.drawLive.finished = true;
    state.drawLive.phase = 'complete';
    clearDrawTimers(false);
    if (save) saveState('draw-complete');
  }

  function confirmDraw() {
    if (!state.pendingGroups) {
      toast('ยังไม่มีผลสุ่มให้ยืนยัน', 'warn');
      return;
    }
    if (state.drawLive?.waiting) {
      toast('รอให้ผลออกก่อนค่อย Confirm', 'warn');
      return;
    }
    state.groups = deepClone(state.pendingGroups);
    state.pendingComplete = true;
    state.drawHistory.unshift({ at: nowIso(), groups: deepClone(state.groups), teams: deepClone(state.teams) });
    state.drawHistory = state.drawHistory.slice(0, 20);
    state.lastResult = { type: 'draw-confirm', text: 'ยืนยันผลแบ่งสายแล้ว', at: nowIso() };
    audit('confirm-draw', { groups: Object.keys(state.groups).length });
    saveState('confirm-draw');
    toast('Confirm ผลแบ่งสายแล้ว', 'good');
  }

  function resetPreparedDraw() {
    clearDrawTimers();
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = defaultState().drawLive;
    saveState('reset-draw');
  }

  function undoDraw() {
    const prev = state.drawHistory.shift();
    if (!prev) {
      toast('ไม่มีประวัติให้ Undo', 'warn');
      return;
    }
    state.groups = deepClone(prev.groups || {});
    saveState('undo-draw');
  }

  function clearDrawTimers(clearMain = true) {
    if (clearMain && drawTimer) {
      clearTimeout(drawTimer);
      drawTimer = null;
    }
    if (drawTickerTimer) {
      clearInterval(drawTickerTimer);
      drawTickerTimer = null;
    }
  }

  function startDrawTicker() {
    if (drawTickerTimer) clearInterval(drawTickerTimer);
    drawTickerTimer = setInterval(() => {
      if (!state.drawLive?.waiting) {
        clearDrawTimers(false);
        return;
      }
      renderDrawStage();
    }, 95);
  }

  function tickerItem() {
    const teams = state.teams.length ? state.teams : ['READY'];
    const groups = letters(state.event.groupCount);
    const live = state.drawLive || {};
    const totalMs = Math.max(1000, intClamp(state.settings.drawDuration, 1, 20, 5) * 1000);
    const left = live.revealEndsAt ? Math.max(0, live.revealEndsAt - Date.now()) : totalMs;
    const progress = 1 - Math.min(1, left / totalMs);
    const interval = 32 + Math.round(progress * progress * 260);
    const tick = Math.floor(Date.now() / interval);
    return {
      team: teams[tick % teams.length],
      group: groups[(tick * 3) % groups.length],
      slot: ((tick * 5) % Math.max(1, Math.ceil(teams.length / groups.length))) + 1
    };
  }

  function generateSchedule() {
    const groups = getDisplayGroups(true);
    if (!hasGroups(groups)) {
      toast('ต้อง Confirm ผลแบ่งสายก่อนสร้างตาราง', 'warn');
      return;
    }

    const matches = [];
    const groupKeys = Object.keys(groups).sort();
    groupKeys.forEach(g => {
      const teams = (groups[g] || []).filter(t => t && t !== 'BYE');
      for (let i = 0; i < teams.length; i += 1) {
        for (let j = i + 1; j < teams.length; j += 1) {
          matches.push({
            id: `G${g}-${i + 1}-${j + 1}-${Date.now()}-${matches.length}`,
            group: g,
            teamA: teams[i],
            teamB: teams[j],
            scoreA: '',
            scoreB: '',
            status: 'Pending',
            court: '',
            time: ''
          });
        }
      }
    });

    const ordered = state.settings.randomizeSchedule ? shuffle(matches) : matches;
    const start = parseTime(state.event.startTime || '09:00');
    const interval = intClamp(state.event.matchInterval, 1, 240, 15);
    const courtCount = intClamp(state.event.courtCount, 1, 16, 1);
    ordered.forEach((m, idx) => {
      const slot = Math.floor(idx / courtCount);
      const court = (idx % courtCount) + 1;
      m.court = court;
      m.time = timeFromMinutes(start + (slot * interval));
    });

    state.matches = ordered;
    state.lastResult = { type: 'schedule', text: `สร้างตาราง ${ordered.length} คู่แล้ว`, at: nowIso() };
    audit('generate-schedule', { count: ordered.length });
    calculateStandings();
    saveState('generate-schedule');
  }

  function parseTime(t) {
    const [h, m] = String(t || '09:00').split(':').map(x => Number(x) || 0);
    return h * 60 + m;
  }

  function timeFromMinutes(total) {
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function readScores() {
    state.matches = state.matches.map(m => {
      const row = $(`[data-match-id="${cssEscape(m.id)}"]`);
      if (!row) return m;
      return {
        ...m,
        scoreA: row.querySelector('[data-score-a]')?.value ?? m.scoreA,
        scoreB: row.querySelector('[data-score-b]')?.value ?? m.scoreB,
        status: row.querySelector('[data-status]')?.value ?? m.status
      };
    });
    calculateStandings();
    audit('save-scores', { count: state.matches.length });
    saveState('scores');
  }

  function cssEscape(v) {
    if (window.CSS && CSS.escape) return CSS.escape(v);
    return String(v).replace(/["\\]/g, '\\$&');
  }

  function calculateStandings() {
    const groups = getDisplayGroups(true);
    const table = {};
    Object.keys(groups).forEach(g => {
      table[g] = {};
      (groups[g] || []).filter(t => t && t !== 'BYE').forEach(team => {
        table[g][team] = { team, group: g, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0 };
      });
    });

    for (const m of state.matches || []) {
      const groupTable = table[m.group];
      if (!groupTable) continue;
      const a = groupTable[m.teamA];
      const b = groupTable[m.teamB];
      if (!a || !b) continue;
      if (!['Finished', 'Bye', 'Forfeit A', 'Forfeit B'].includes(m.status)) continue;

      const sa = Number(m.scoreA);
      const sb = Number(m.scoreB);
      const validScore = Number.isFinite(sa) && Number.isFinite(sb);

      a.P += 1;
      b.P += 1;

      if (m.status === 'Forfeit A') {
        applyWinLoss(b, a, 2, 0);
      } else if (m.status === 'Forfeit B' || m.status === 'Bye') {
        applyWinLoss(a, b, 2, 0);
      } else if (validScore) {
        a.GF += sa; a.GA += sb;
        b.GF += sb; b.GA += sa;
        if (sa > sb) { a.W += 1; b.L += 1; a.PTS += Number(state.event.pointsWin); b.PTS += Number(state.event.pointsLoss); }
        else if (sb > sa) { b.W += 1; a.L += 1; b.PTS += Number(state.event.pointsWin); a.PTS += Number(state.event.pointsLoss); }
        else { a.D += 1; b.D += 1; a.PTS += Number(state.event.pointsDraw); b.PTS += Number(state.event.pointsDraw); }
      }
    }

    Object.values(table).forEach(groupTable => {
      Object.values(groupTable).forEach(r => { r.GD = r.GF - r.GA; });
    });
    state.standings = table;
    return table;
  }

  function applyWinLoss(winner, loser, gf, ga) {
    winner.W += 1; loser.L += 1;
    winner.GF += gf; winner.GA += ga;
    loser.GF += ga; loser.GA += gf;
    winner.PTS += Number(state.event.pointsWin);
    loser.PTS += Number(state.event.pointsLoss);
  }

  function sortedStandings(groupTable) {
    return Object.values(groupTable || {}).sort((a, b) =>
      b.PTS - a.PTS ||
      b.GD - a.GD ||
      b.GF - a.GF ||
      b.W - a.W ||
      a.team.localeCompare(b.team, 'th')
    );
  }

  function generateKnockout() {
    calculateStandings();
    const q = intClamp(state.event.qualifiersPerGroup, 1, 8, 2);
    const qualifiers = [];
    Object.keys(state.standings || {}).sort().forEach(g => {
      sortedStandings(state.standings[g]).slice(0, q).forEach((row, i) => {
        qualifiers.push({ seed: `${g}${i + 1}`, team: row.team });
      });
    });

    const pairs = [];
    for (let i = 0; i < qualifiers.length; i += 2) {
      pairs.push({
        id: `KO-${i + 1}`,
        round: qualifiers.length <= 4 ? 'Semi Final' : 'Quarter Final',
        teamA: qualifiers[i]?.team || 'TBD',
        teamB: qualifiers[i + 1]?.team || 'TBD',
        winner: ''
      });
    }
    state.knockout = pairs;
    audit('generate-knockout', { count: pairs.length });
    saveState('knockout');
  }

  function hasGroups(groups) {
    return Object.values(groups || {}).some(arr => Array.isArray(arr) && arr.some(t => t && t !== 'BYE'));
  }

  function getDisplayGroups(confirmedOnly = false) {
    if (hasGroups(state.groups)) return state.groups;
    if (confirmedOnly) return {};
    if (state.settings.drawMethod === 'instant-all' && state.pendingComplete && state.pendingGroups) return state.pendingGroups;

    const groupCount = intClamp(state.event.groupCount, 1, 26, 4);
    const groups = Object.fromEntries(letters(groupCount).map(g => [g, []]));
    const feed = [...(state.drawLive?.feed || [])].reverse();
    feed.forEach(item => {
      if (!item || !item.group || item.group === 'ALL') return;
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group][Math.max(0, Number(item.slot || 1) - 1)] = item.team || '';
    });
    return groups;
  }

  function renderAll(rebuildNav = false) {
    if (rebuildNav) buildNav();
    setSavePill();
    applyLayoutSettings();

    if (activePanel === 'dashboard') renderDashboard();
    if (activePanel === 'teams') renderTeamValidation();
    if (activePanel === 'draw') { renderDrawStage(); renderDrawTools(); renderGroups(); renderRevealFeed(); }
    if (activePanel === 'schedule') renderSchedule();
    if (activePanel === 'scores') { renderScores(); renderStandings(); }
    if (activePanel === 'knockout') { renderOverrides(); renderKnockout(); }
    if (activePanel === 'sources') renderSourceCards();
    if (activePanel === 'settings') { renderSettingsTools(); renderDebug(); }

    renderStepper();
  }

  function renderDrawTools() {
    const actionRow = $('#toggleDrawExpand')?.closest('.row');
    if (!actionRow) return;

    if (!$('#openDrawTextSettings')) {
      const btn = document.createElement('button');
      btn.id = 'openDrawTextSettings';
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = 'Text Size';
      btn.addEventListener('click', openDrawTextSettingsModal);
      actionRow.appendChild(btn);
    }

    if (!$('#drawGroupsColumnsTool')) {
      const tool = document.createElement('div');
      tool.id = 'drawGroupsColumnsTool';
      tool.className = 'draw-inline-tool';
      tool.innerHTML = `
        <label>Groups Columns <b id="drawGroupColumnsValue">${esc(state.settings.groupColumns || 4)}</b></label>
        <input id="drawGroupColumnsRange" type="range" min="1" max="10" step="1" value="${esc(state.settings.groupColumns || 4)}" />
      `;
      const pending = $('#pendingBox');
      if (pending) pending.parentNode.insertBefore(tool, pending);
      const range = $('#drawGroupColumnsRange');
      on(range, 'input', (e) => {
        state.settings.groupColumns = intClamp(e.target.value, 1, 10, 4);
        setText($('#drawGroupColumnsValue'), state.settings.groupColumns);
        applyLayoutSettings();
        renderGroups();
        saveState('group-columns', false);
      });
    } else {
      setValue($('#drawGroupColumnsRange'), state.settings.groupColumns || 4);
      setText($('#drawGroupColumnsValue'), state.settings.groupColumns || 4);
    }
  }

  function renderSettingsTools() {
    const sourceCard = $('#sourceBg')?.closest('.card');
    if (!sourceCard || $('#settingsExtraControls')) return;

    const box = document.createElement('div');
    box.id = 'settingsExtraControls';
    box.className = 'settings-extra-controls';
    box.innerHTML = `
      <div class="field">
        <label>Groups Table Columns</label>
        <div class="inline-range">
          <input id="settingsGroupColumnsRange" type="range" min="1" max="10" step="1" value="${esc(state.settings.groupColumns || 4)}" />
          <div class="range-pill"><span id="settingsGroupColumnsValue">${esc(state.settings.groupColumns || 4)}</span> คอลัมน์</div>
        </div>
      </div>
      <div class="row">
        <button class="btn" id="settingsDrawTextBtn" type="button">Draw Text Size Settings</button>
      </div>
    `;
    const saveBtn = $('#saveDisplaySettings');
    sourceCard.insertBefore(box, saveBtn);

    on($('#settingsGroupColumnsRange'), 'input', (e) => {
      state.settings.groupColumns = intClamp(e.target.value, 1, 10, 4);
      setText($('#settingsGroupColumnsValue'), state.settings.groupColumns);
      applyLayoutSettings();
      saveState('group-columns', false);
    });
    on($('#settingsDrawTextBtn'), 'click', openDrawTextSettingsModal);
  }

  function openDrawTextSettingsModal() {
    clearDrawTextPreview();
    const saved = drawTextSizes(state.settings, false);
    let temp = { ...saved };
    $('#drawTextSettingsModal')?.remove();

    const controls = [
      ['chip', 'ป้าย Style / Reveal', 8, 26, 'Draw Control + OBS'],
      ['groupLabel', 'คำว่า GROUP', 10, 34, 'Draw Control + OBS'],
      ['groupLetter', 'ตัวอักษรสาย A/B/C', 18, 62, 'Draw Control + OBS'],
      ['team', 'ชื่อทีม Draw Control / OBS Source', 34, 84, 'ใช้ร่วมกัน'],
      ['meta', 'บรรทัดสาย/ลำดับ Draw / OBS Meta', 10, 28, 'ใช้ร่วมกัน'],
      ['status', 'Progress / Status', 9, 24, 'Draw Control'],
      ['groupTitle', 'หัวตาราง Groups / OBS Groups Source', 11, 26, 'Groups Table + OBS'],
      ['groupTeam', 'ชื่อทีมใน Groups Table / OBS Groups Source', 11, 24, 'Groups Table + OBS']
    ];

    const modal = document.createElement('div');
    modal.id = 'drawTextSettingsModal';
    modal.className = 'peps-settings-modal open';
    modal.innerHTML = `
      <div class="peps-settings-box">
        <div class="peps-settings-head">
          <div>
            <h3>Draw Text Size Settings</h3>
            <p>เลื่อนแล้วดู Preview แบบ real-time · Draw Animation Source เปลี่ยนตาม Draw Control แบบ real-time · Cancel จะคืนค่าล่าสุด</p>
          </div>
          <button type="button" class="iconbtn" data-close-text-modal>×</button>
        </div>
        <div class="peps-settings-body">
          <div class="peps-settings-sliders">
            ${controls.map(([key, label, min, max, scope]) => `
              <div class="peps-slider">
                <label>
                  <span>${esc(label)} <small>${esc(scope)}</small></span>
                  <b data-size-value="${key}">${esc(temp[key])}px</b>
                </label>
                <input type="range" min="${min}" max="${max}" step="1" value="${esc(temp[key])}" data-size-key="${key}" />
              </div>
            `).join('')}
          </div>
          <div class="peps-settings-preview">
            <div class="preview-section-title">Draw Control Preview</div>
            <div class="draw-stage preview-draw-stage">
              <div class="draw-graphic preview-graphic">
                <div class="draw-fx"><div class="pl-wheel"></div></div>
                <div class="draw-chip">Wheel Spin</div>
                <div class="draw-group-badge">GROUP <b>B</b></div>
                <div class="draw-team-name"><span>Golden Lion</span></div>
                <div class="draw-team-sub">สาย B · ลำดับ 2</div>
                <div class="draw-progress"><div class="draw-progress-bar" style="width:65%"></div></div>
                <div class="draw-progress-text"><span>พร้อมแสดงผล</span><span>65%</span></div>
              </div>
            </div>

            <div class="preview-section-title">OBS Draw Animation Source Preview · ใช้ขนาดจาก Draw Control</div>
            <div class="preview-source-card">
              <div class="pl-anim-core preview-anim-core">
                <div class="pl-anim-fx"><div class="pl-ring"></div></div>
                <div class="draw-chip">Draw Source</div>
                <div class="draw-group-badge">GROUP <b>C</b></div>
                <div class="pl-anim-name"><span>Storm Rider</span></div>
                <div class="pl-anim-meta">สาย C · ลำดับ 3</div>
              </div>
            </div>

            <div class="preview-section-title">Groups Table Preview</div>
            <div class="pl-group-card preview-group-card">
              <div class="pl-group-title"><span>สาย B</span><span>4 ทีม</span></div>
              <div class="pl-group-row"><span class="no">1</span><span class="team">Golden Lion</span></div>
              <div class="pl-group-row"><span class="no">2</span><span class="team">Storm Rider</span></div>
              <div class="pl-group-row"><span class="no">3</span><span class="team">Sisaket Two</span></div>
            </div>
          </div>
        </div>
        <div class="peps-settings-actions">
          <button type="button" class="btn primary" data-save-text-size>บันทึก</button>
          <button type="button" class="btn" data-reset-text-size>Reset</button>
          <button type="button" class="btn" data-cancel-text-size>ยกเลิก</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const applyVarsTo = (el, values) => {
      if (!el) return;
      const normalized = { ...values, sourceTeam: values.team, sourceMeta: values.meta };
      el.style.setProperty('--draw-chip-fs', `${normalized.chip}px`);
      el.style.setProperty('--draw-group-label-fs', `${normalized.groupLabel}px`);
      el.style.setProperty('--draw-group-letter-fs', `${normalized.groupLetter}px`);
      el.style.setProperty('--draw-team-fs', `${normalized.team}px`);
      el.style.setProperty('--draw-meta-fs', `${normalized.meta}px`);
      el.style.setProperty('--draw-status-fs', `${normalized.status}px`);
      el.style.setProperty('--source-team-fs', `${normalized.team}px`);
      el.style.setProperty('--source-meta-fs', `${normalized.meta}px`);
      el.style.setProperty('--group-title-fs', `${normalized.groupTitle}px`);
      el.style.setProperty('--group-team-fs', `${normalized.groupTeam}px`);
    };

    const updatePreview = () => {
      temp = normalizeDrawTextSizes(temp);
      publishDrawTextPreview(temp);
      setDrawTextSizeVars(temp);
      applyVarsTo(modal, temp);
      applyVarsTo($('.peps-settings-preview', modal), temp);

      $$('[data-size-value]', modal).forEach(el => {
        const key = el.dataset.sizeValue;
        el.textContent = `${temp[key]}px`;
      });

      // Force a tiny layout refresh so Chrome/OBS preview repaints immediately while dragging.
      const preview = $('.peps-settings-preview', modal);
      if (preview) preview.dataset.previewTick = String(Date.now());
    };

    $$('[data-size-key]', modal).forEach(input => {
      input.addEventListener('input', (e) => {
        temp[e.target.dataset.sizeKey] = Number(e.target.value);
        updatePreview();
      });
      input.addEventListener('change', (e) => {
        temp[e.target.dataset.sizeKey] = Number(e.target.value);
        updatePreview();
      });
    });

    const closeRestore = () => {
      clearDrawTextPreview();
      setDrawTextSizeVars(saved);
      modal.remove();
      renderAll(false);
    };

    on($('[data-close-text-modal]', modal), 'click', closeRestore);
    on($('[data-cancel-text-size]', modal), 'click', closeRestore);
    on($('[data-reset-text-size]', modal), 'click', () => {
      temp = { ...DEFAULT_DRAW_TEXT_SIZES };
      $$('[data-size-key]', modal).forEach(input => {
        input.value = temp[input.dataset.sizeKey];
      });
      updatePreview();
    });
    on($('[data-save-text-size]', modal), 'click', () => {
      temp = normalizeDrawTextSizes(temp);
      clearDrawTextPreview();
      state.settings.drawTextSizes = { ...temp };
      applyLayoutSettings();
      saveState('draw-text-sizes');
      modal.remove();
      toast('บันทึกขนาดตัวหนังสือแล้ว', 'good');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRestore();
    });

    updatePreview();
  }

  function renderStepper() {
    const root = $('#stepper');
    if (!root) return;
    root.innerHTML = PANELS.slice(0, 7).map(([id, title], i) => {
      const done = panelDone(id);
      return `<div class="step ${done ? 'done' : ''} ${activePanel === id ? 'active' : ''}"><b>${i + 1}</b><span>${esc(title)}</span></div>`;
    }).join('');
  }

  function panelDone(id) {
    if (id === 'setup') return !!state.event.name;
    if (id === 'teams') return state.teams.length > 0;
    if (id === 'draw') return hasGroups(state.groups);
    if (id === 'schedule') return state.matches.length > 0;
    if (id === 'scores') return Object.keys(state.standings || {}).length > 0;
    if (id === 'knockout') return state.knockout.length > 0;
    return true;
  }

  function renderDashboard() {
    const stats = $('#dashboardStats');
    if (stats) {
      stats.innerHTML = [
        ['ทีม', state.teams.length],
        ['สาย', state.event.groupCount],
        ['คู่แข่ง', state.matches.length],
        ['ยืนยันสาย', hasGroups(state.groups) ? 'YES' : 'NO']
      ].map(([label, value]) => `<div class="stat"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
    }

    const next = $('#nextAction');
    if (next) {
      let msg = 'พร้อมใช้งาน';
      if (!state.teams.length) msg = 'ไปที่ Teams แล้วใส่รายชื่อทีม';
      else if (!hasGroups(state.groups)) msg = 'ไปที่ Draw แล้วกด Start Draw จากนั้น Confirm Result';
      else if (!state.matches.length) msg = 'ไปที่ Schedule แล้ว Generate Schedule';
      else msg = 'ไปที่ Scores เพื่อกรอกผลการแข่งขัน';
      next.textContent = msg;
    }

    const guard = $('#guardList');
    if (guard) {
      guard.innerHTML = `
        <div class="notice ${state.settings.safeLive ? 'good' : 'warn'}">Safe Live Mode: ${state.settings.safeLive ? 'ON' : 'OFF'}</div>
        <div class="notice">Draw Source: ใช้ลิงก์เดียว ?view=draw-animation</div>
        <div class="notice">Live Sources: ${SOURCES.length} รายการ ไม่มี Wheel/Slot/Card แยกใบ</div>
      `;
    }
  }

  function renderTeamValidation() {
    const box = $('#teamValidation');
    if (!box) return;
    const v = teamValidation();
    box.innerHTML = `
      <div class="notice ${v.ok ? 'good' : 'warn'}">
        ทีมทั้งหมด: <b>${v.teams.length}</b> · สาย: <b>${v.groupCount}</b> · BYE: <b>${v.byes}</b>
      </div>
      ${v.dup.length ? `<div class="notice warn">ชื่อซ้ำ: ${esc(v.dup.join(', '))}</div>` : '<div class="notice good">ไม่พบชื่อซ้ำ</div>'}
    `;
  }

  function renderDrawStage() {
    const stage = $('#drawStage');
    if (!stage) return;
    const html = drawVisualHtml('control');
    stage.innerHTML = html;

    const overlayStage = $('#drawExpandOverlay .draw-overlay-stage');
    if (overlayStage) overlayStage.innerHTML = drawVisualHtml('overlay');
  }

  function drawVisualHtml(context = 'control') {
    const live = state.drawLive || {};
    const waiting = !!live.waiting;
    const running = !!live.running;
    const item = waiting ? tickerItem() : (live.current || live.pendingItem || { team: 'READY', group: '-', slot: '-' });
    const mode = state.settings.drawAnimation || 'wheel';
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    
    const animState = (waiting || running) ? 'active' : (live.current ? 'result' : 'idle');

    return `
      <div class="draw-graphic ${animState} mode-${esc(mode)} draw-context-${esc(context)}">
        <div class="draw-fx">${drawFx(mode)}</div>
        <div class="draw-chip">${esc(sourceModeLabel(mode))}</div>
        <div class="draw-group-badge">GROUP <b>${esc(item.group || '-')}</b></div>
        <div class="draw-team-name"><span>${esc(item.team || 'READY')}</span></div>
        <div class="draw-team-sub">${waiting ? 'กำลังรันรายชื่อและสาย...' : `สาย ${esc(item.group || '-')} · ลำดับ ${esc(item.slot || '-')}`}</div>
        <div class="draw-progress">
          <div class="draw-progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="draw-progress-text"><span>${waiting ? 'กำลังสุ่ม...' : 'พร้อมแสดงผล'}</span><span>${progress}%</span></div>
      </div>
    `;
  }

  function drawFx(mode) {
    if (mode === 'wheel') return '<div class="wheel-visual"><div class="wheel-rotor"></div><div class="wheel-pointer"></div><div class="wheel-pulse-ring"></div><div class="wheel-dots"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i></div></div>';
    if (mode === 'slot') return '<div class="slot-visual"><div class="slot-top">JACKPOT</div><div class="slot-frame"><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#ff2f7e;--chip2:#c000ff">777</div><div class="slot-chip" style="--chip1:#08c3ff;--chip2:#1f6ad8">BAR</div></div></div><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#14d955;--chip2:#0b8032">WIN</div><div class="slot-chip" style="--chip1:#ff8c00;--chip2:#cc2900">777</div></div></div><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#c000ff;--chip2:#6600cc">BAR</div><div class="slot-chip" style="--chip1:#ff3b30;--chip2:#99140d">WIN</div></div></div><div class="slot-reel"><div class="slot-reel-track"><div class="slot-chip" style="--chip1:#ffd400;--chip2:#cc8800">WIN</div><div class="slot-chip" style="--chip1:#08c3ff;--chip2:#1f6ad8">777</div></div></div></div></div>';
    if (mode === 'card') return '<div class="card-visual"><div class="card-fan"><div class="card-suit">♠</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">♠</div></div><div class="card-fan"><div class="card-suit" style="color:#ff3b30">♥</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end;color:#ff3b30">♥</div></div><div class="card-fan"><div class="card-suit">♣</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">♣</div></div></div>';
    if (mode === 'lottery') return '<div class="lottery-visual"><div class="lottery-stand"></div><div class="lottery-base"></div><div class="lottery-cage"><div class="ball-cloud"><div class="ball-mini red">12</div><div class="ball-mini blue">45</div><div class="ball-mini red">08</div><div class="ball-mini blue">67</div><div class="ball-mini red">33</div><div class="ball-mini blue">91</div></div></div></div>';
    if (mode === 'glitch') return '<div class="glitch-visual"><div class="glitch-scanlines"></div><div class="glitch-lines"><div class="glitch-hline" style="--gi:1"></div><div class="glitch-hline" style="--gi:2"></div><div class="glitch-hline" style="--gi:3"></div></div><div class="glitch-text" data-text="SYSTEM">SYSTEM</div><div class="glitch-corner tl"></div><div class="glitch-corner tr"></div><div class="glitch-corner bl"></div><div class="glitch-corner br"></div></div>';
    if (mode === 'galaxy') return '<div class="galaxy-visual"><div class="galaxy-disk"></div><div class="galaxy-arm arm1"></div><div class="galaxy-arm arm2"></div><div class="galaxy-core"></div><div class="galaxy-star" style="--gd:0deg;--gr:40px;--gi:1"></div><div class="galaxy-star" style="--gd:72deg;--gr:60px;--gi:2"></div><div class="galaxy-star" style="--gd:144deg;--gr:80px;--gi:3"></div><div class="galaxy-star" style="--gd:216deg;--gr:50px;--gi:4"></div><div class="galaxy-star" style="--gd:288deg;--gr:70px;--gi:5"></div></div>';
    if (mode === 'crystal') return '<div class="crystal-visual"><div class="crystal-glow-bg"></div><div class="crystal-orb"><div class="crystal-inner"></div><div class="crystal-shine"></div><div class="crystal-spark" style="--ci:1"></div><div class="crystal-spark" style="--ci:2"></div><div class="crystal-spark" style="--ci:3"></div></div><div class="crystal-stand"></div><div class="crystal-base"></div></div>';
    if (mode === 'plasma') return '<div class="plasma-visual"><div class="plasma-ring ring1"></div><div class="plasma-ring ring2"></div><div class="plasma-ring ring3"></div><div class="plasma-core"></div><div class="plasma-arc" style="--pa:0deg"></div><div class="plasma-arc" style="--pa:120deg"></div><div class="plasma-arc" style="--pa:240deg"></div></div>';
    if (mode === 'vortex') return '<div class="vortex-visual"><div class="vortex-tunnel"><div class="vortex-layer" style="--vl:1"></div><div class="vortex-layer" style="--vl:2"></div><div class="vortex-layer" style="--vl:3"></div><div class="vortex-layer" style="--vl:4"></div><div class="vortex-layer" style="--vl:5"></div></div><div class="vortex-eye"></div></div>';
    if (mode === 'winner') return '<div class="winner-visual"><div class="winner-trophy">🏆</div><div class="winner-sparks"></div></div>';
    return '<div class="pl-ring"></div>';
  }

  function sourceModeLabel(mode) {
    return ({
      wheel: 'Wheel Spin',
      slot: 'Slot Reveal',
      card: 'Card Draw',
      lottery: 'Lottery Ball',
      glitch: 'Glitch Cyber',
      galaxy: 'Galaxy Spiral',
      crystal: 'Crystal Oracle',
      plasma: 'Plasma Arc',
      vortex: 'Vortex Portal'
    })[mode] || mode;
  }

  function renderGroups() {
    setDrawTextSizeVars(drawTextSizes());
    const box = $('#groupResult');
    if (!box) return;
    const groups = getDisplayGroups(false);
    const keys = Object.keys(groups).length ? Object.keys(groups).sort() : letters(state.event.groupCount);
    const maxRows = Math.max(1, ...keys.map(g => (groups[g] || []).length), Math.ceil(Math.max(1, state.teams.length) / Math.max(1, keys.length)));
    const cols = effectiveGroupColumns(state.settings.groupColumns || 4, box.clientWidth || window.innerWidth);

    box.innerHTML = `
      <div class="pl-groups-grid" style="${textSizeVarsStyle(drawTextSizes())};--group-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr));">
        ${keys.map(g => `
          <div class="pl-group-card">
            <div class="pl-group-title" style="font-size:var(--group-title-fs,14px)!important"><span>สาย ${esc(g)}</span><span>${(groups[g] || []).filter(Boolean).length} ทีม</span></div>
            ${Array.from({ length: maxRows }, (_, i) => {
              const team = (groups[g] || [])[i] || '';
              return `<div class="pl-group-row ${team ? '' : 'empty'}"><span class="no">${i + 1}</span><span class="team" style="font-size:var(--group-team-fs,14px)!important">${esc(team || 'รอผลสุ่ม')}</span></div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderRevealFeed() {
    const box = $('#revealFeed');
    if (!box) return;
    const feed = state.drawLive?.feed || [];
    if (!feed.length) {
      box.innerHTML = '<div class="notice">Reveal Feed ยังว่างอยู่</div>';
      return;
    }
    box.innerHTML = `<div class="feed-list">${feed.map(item => `<div class="notice">สาย ${esc(item.group)} · ลำดับ ${esc(item.slot)} · <b>${esc(item.team)}</b></div>`).join('')}</div>`;
  }

  function renderSchedule() {
    const box = $('#scheduleBox');
    if (!box) return;
    if (!state.matches.length) {
      box.innerHTML = '<div class="notice">ยังไม่มีตารางแข่ง</div>';
      return;
    }
    box.innerHTML = `
      <div class="tablewrap"><table><thead><tr><th>เวลา</th><th>สนาม</th><th>สาย</th><th>ทีม A</th><th>ทีม B</th><th>สถานะ</th></tr></thead>
      <tbody>${state.matches.map(m => `<tr><td>${esc(m.time)}</td><td>${esc(m.court)}</td><td>${esc(m.group)}</td><td>${esc(m.teamA)}</td><td>${esc(m.teamB)}</td><td>${esc(m.status)}</td></tr>`).join('')}</tbody></table></div>
    `;
  }

  function renderScores() {
    const box = $('#scoresBox');
    if (!box) return;
    if (!state.matches.length) {
      box.innerHTML = '<div class="notice">ยังไม่มีคู่แข่งขัน</div>';
      return;
    }
    box.innerHTML = state.matches.map(m => `
      <div class="score-row" data-match-id="${esc(m.id)}">
        <b>${esc(m.time)} · สนาม ${esc(m.court)} · สาย ${esc(m.group)}</b>
        <span>${esc(m.teamA)}</span>
        <input data-score-a type="number" value="${esc(m.scoreA)}" placeholder="0">
        <span>-</span>
        <input data-score-b type="number" value="${esc(m.scoreB)}" placeholder="0">
        <span>${esc(m.teamB)}</span>
        <select data-status>
          ${['Pending', 'Live', 'Finished', 'Bye', 'Forfeit A', 'Forfeit B'].map(s => `<option ${m.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    `).join('');
  }

  function renderStandings() {
    const box = $('#standingsBox');
    if (!box) return;
    calculateStandings();
    const groups = Object.keys(state.standings || {}).sort();
    if (!groups.length) {
      box.innerHTML = '<div class="notice">ยังไม่มีตารางคะแนน</div>';
      return;
    }
    box.innerHTML = groups.map(g => `
      <h3>สาย ${esc(g)}</h3>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>ทีม</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead>
      <tbody>${sortedStandings(state.standings[g]).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.team)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.PTS}</b></td></tr>`).join('')}</tbody></table></div>
    `).join('');
  }

  function renderOverrides() {
    const box = $('#overrideBox');
    if (!box) return;
    calculateStandings();
    const groups = Object.keys(state.standings || {}).sort();
    box.innerHTML = groups.length
      ? groups.map(g => `<div class="notice">สาย ${esc(g)}: ${sortedStandings(state.standings[g]).slice(0, state.event.qualifiersPerGroup).map(r => esc(r.team)).join(', ')}</div>`).join('')
      : '<div class="notice">ยังไม่มีอันดับจากรอบแบ่งกลุ่ม</div>';
  }

  function renderKnockout() {
    const box = $('#knockoutBox');
    if (!box) return;
    if (!state.knockout.length) {
      box.innerHTML = '<div class="notice">ยังไม่มี Knockout Bracket</div>';
      return;
    }
    box.innerHTML = `<div class="grid two">${state.knockout.map(m => `
      <div class="card compact"><h3>${esc(m.round)}</h3><p>${esc(m.teamA)} vs ${esc(m.teamB)}</p></div>
    `).join('')}</div>`;
  }

  function renderSourceCards() {
    const root = $('#sourceCards');
    if (!root) return;

    const draw = `
      <div class="source-section peps-source-section-clean">
        <h3>Draw Animation Source</h3>
        <div class="source-grid-core single">
          ${sourceCardHtml('draw-animation')}
        </div>
      </div>
    `;

    const live = `
      <div class="source-section peps-source-section-clean">
        <h3>Live Data Sources</h3>
        <div class="source-grid-core">
          ${SOURCES.filter(([id]) => id !== 'draw-animation').map(([id]) => sourceCardHtml(id)).join('')}
        </div>
      </div>
    `;

    root.className = 'grid three peps-source-holder-clean';
    root.innerHTML = draw + live;
  }

  function sourceCardHtml(id) {
    const meta = SOURCE_META[id] || { title: id, desc: '' };
    return `
      <div class="source-card peps-source-card-clean">
        <h3>${esc(meta.title)}</h3>
        <p>${esc(meta.desc)}</p>
        <div class="row">
          <button class="btn primary small" type="button" data-copy-source="${esc(id)}">Copy URL</button>
          <button class="btn small" type="button" data-preview-source="${esc(id)}">Preview URL</button>
          <button class="btn small" type="button" data-open-source="${esc(id)}">Details</button>
        </div>
        <div class="source-url">${esc(sourceUrl(id))}</div>
      </div>
    `;
  }

  function openSourceModal(id) {
    modalSource = normalizeSourceView(id);
    const meta = SOURCE_META[modalSource] || { title: modalSource, desc: '' };
    setText($('#modalTitle'), meta.title);
    setText($('#modalDesc'), meta.desc);
    setText($('#modalUrl'), sourceUrl(modalSource));
    $('#sourceModal')?.classList.add('open');
  }

  function renderDebug() {
    const box = $('#debugState');
    if (box) box.textContent = JSON.stringify(state, null, 2);
  }

  function renderSource(view) {
    view = normalizeSourceView(view);
    injectSourceCss();

    document.documentElement.classList.add('source-mode');
    document.body.classList.add('source-mode-body');
    document.documentElement.style.setProperty('background', 'transparent', 'important');
    document.documentElement.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background', 'transparent', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    $('#app')?.classList.add('hidden');

    const root = $('#sourceRoot') || document.body.appendChild(document.createElement('div'));
    root.id = 'sourceRoot';
    root.classList.remove('hidden');
    root.className = `source-root source-view-${view}`;
    root.style.background = 'transparent';
    root.style.backgroundImage = 'none';

    let lastHash = '';

    const buildHash = () => {
      const live = state.drawLive || {};
      if (view === 'draw-animation') {
        return JSON.stringify({
          view,
          mode: state.settings.drawAnimation,
          waiting: !!live.waiting,
          current: live.current,
          pendingItem: live.pendingItem,
          feed0: (live.feed || [])[0],
          progress: live.progress,
          total: live.total,
          textSizes: drawTextSizes(),
          tick: live.waiting ? Math.floor(Date.now() / 110) : 0
        });
      }

      if (view === 'groups') {
        return JSON.stringify({
          view,
          groups: state.groups,
          pendingGroups: state.pendingGroups,
          method: state.settings.drawMethod,
          pendingComplete: state.pendingComplete,
          feed: state.drawLive?.feed || [],
          groupCount: state.event.groupCount,
          groupColumns: state.settings.groupColumns,
          eventName: state.event.name,
          textSizes: drawTextSizes()
        });
      }

      return JSON.stringify({
        view,
        eventName: state.event.name,
        matches: state.matches,
        standings: state.standings,
        knockout: state.knockout,
        lastResult: state.lastResult
      });
    };

    const draw = () => {
      if (view === 'draw-animation') renderDrawSource(root);
      else if (view === 'groups') renderGroupsSource(root);
      else if (view === 'schedule') renderScheduleSource(root);
      else if (view === 'standings') renderStandingsSource(root);
      else if (view === 'knockout') renderKnockoutSource(root);
      else renderSimpleSource(root, view);
    };

    const tick = () => {
      state = loadState();
      setDrawTextSizeVars(drawTextSizes());
      const hash = buildHash();

      if (hash !== lastHash) {
        lastHash = hash;
        draw();
      }

      const previewActive = !!readDrawTextPreview();
      const fast = view === 'draw-animation' || previewActive || !!state.drawLive?.waiting;
      setTimeout(tick, fast ? 110 : 650);
    };

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === DRAW_TEXT_PREVIEW_KEY) {
        state = loadState();
        setDrawTextSizeVars(drawTextSizes());
        lastHash = '';
        draw();
      }
    });

    tick();
  }

  function renderDrawSource(root) {
    const live = state.drawLive || {};
    const item = live.waiting ? tickerItem() : (live.current || live.pendingItem || (live.feed || [])[0] || { team: 'READY', group: '-', slot: '-' });
    const mode = state.settings.drawAnimation || 'wheel';

    root.innerHTML = `
      <div class="pl-anim-source">
        <div class="pl-anim-core">
          <div class="pl-anim-fx">${drawFx(mode)}</div>
          <div class="draw-chip">${esc(sourceModeLabel(mode))}</div>
          <div class="draw-group-badge">GROUP <b>${esc(item.group || '-')}</b></div>
          <div class="pl-anim-name"><span>${esc(item.team || 'READY')}</span></div>
          <div class="pl-anim-meta">${live.waiting ? 'กำลังสุ่มรายชื่อและสาย...' : `สาย ${esc(item.group || '-')} · ลำดับ ${esc(item.slot || '-')}`}</div>
        </div>
      </div>
    `;
  }

  function renderGroupsSource(root) {
    setDrawTextSizeVars(drawTextSizes());
    const groups = getDisplayGroups(false);
    const keys = Object.keys(groups).length ? Object.keys(groups).sort() : letters(state.event.groupCount);
    const maxRows = Math.max(1, ...keys.map(g => (groups[g] || []).length), Math.ceil(Math.max(1, state.teams.length) / Math.max(1, keys.length)));
    const cols = effectiveGroupColumns(state.settings.groupColumns || 4, Math.min(1500, window.innerWidth * 0.96));
    const sizeVars = textSizeVarsStyle(drawTextSizes());
    root.innerHTML = `
      <div class="pl-groups-source" style="${sizeVars}">
        <div class="pl-groups-board" style="${sizeVars}">
          <div class="pl-groups-head"><div><h1>${esc(state.event.name || 'PepsLive Tournament')}</h1><p>Groups Table · แสดงตาม Reveal Feed / Confirm Result</p></div></div>
          <div class="pl-groups-grid" style="grid-template-columns:repeat(${cols}, minmax(180px, 1fr));">
            ${keys.map(g => `<div class="pl-group-card"><div class="pl-group-title" style="font-size:var(--group-title-fs,14px)!important"><span>สาย ${esc(g)}</span><span>${(groups[g] || []).filter(Boolean).length} ทีม</span></div>
              ${Array.from({ length: maxRows }, (_, i) => {
                const team = (groups[g] || [])[i] || '';
                return `<div class="pl-group-row ${team ? '' : 'empty'}"><span class="no">${i + 1}</span><span class="team" style="font-size:var(--group-team-fs,14px)!important">${esc(team || 'รอผลสุ่ม')}</span></div>`;
              }).join('')}
            </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderScheduleSource(root) {
    root.innerHTML = sourceBoard('Schedule Table', state.matches.length
      ? `<table><thead><tr><th>เวลา</th><th>สนาม</th><th>สาย</th><th>คู่แข่งขัน</th></tr></thead><tbody>${state.matches.map(m => `<tr><td>${esc(m.time)}</td><td>${esc(m.court)}</td><td>${esc(m.group)}</td><td>${esc(m.teamA)} vs ${esc(m.teamB)}</td></tr>`).join('')}</tbody></table>`
      : '<div class="empty-source">ยังไม่มีตารางแข่ง</div>');
  }

  function renderStandingsSource(root) {
    calculateStandings();
    const groups = Object.keys(state.standings || {}).sort();
    root.innerHTML = sourceBoard('Standings Table', groups.map(g => `
      <h2>สาย ${esc(g)}</h2>
      <table><tbody>${sortedStandings(state.standings[g]).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.team)}</td><td>${r.PTS}</td></tr>`).join('')}</tbody></table>
    `).join('') || '<div class="empty-source">ยังไม่มีตารางคะแนน</div>');
  }

  function renderKnockoutSource(root) {
    root.innerHTML = sourceBoard('Knockout Bracket', state.knockout.length
      ? state.knockout.map(m => `<div class="notice">${esc(m.round)} · ${esc(m.teamA)} vs ${esc(m.teamB)}</div>`).join('')
      : '<div class="empty-source">ยังไม่มี Knockout</div>');
  }

  function renderSimpleSource(root, view) {
    const title = SOURCE_META[view]?.title || view;
    const text = state.lastResult?.text || 'ยังไม่มีข้อมูลล่าสุด';
    root.innerHTML = `<div class="pl-anim-source"><div class="pl-anim-core"><div class="pl-anim-name">${esc(title)}</div><div class="pl-anim-meta">${esc(text)}</div></div></div>`;
  }

  function sourceBoard(title, body) {
    return `<div class="pl-groups-source"><div class="pl-groups-board"><div class="pl-groups-head"><div><h1>${esc(title)}</h1><p>${esc(state.event.name || '')}</p></div></div>${body}</div></div>`;
  }

  function updateRangeSetting(key, value, min, max, outputId) {
    state.settings[key] = intClamp(value, min, max, state.settings[key]);
    setText($('#' + outputId), state.settings[key]);
    applyLayoutSettings();
    scheduleSave(key);
  }

  function applyLayoutSettings() {
    document.documentElement.style.setProperty('--sidebar-w', `${state.settings.sidebarWidth || 284}px`);
    document.documentElement.style.setProperty('--app-max', `${state.settings.appMaxWidth || 1280}px`);
    document.documentElement.style.setProperty('--draw-stage-h', `${state.settings.drawStageHeight || 420}px`);
    document.documentElement.style.setProperty('--group-cols', `${intClamp(state.settings.groupColumns || 4, 1, 10, 4)}`);
    setDrawTextSizeVars(drawTextSizes());
    document.body.dataset.density = state.settings.uiDensity || 'comfortable';
    document.body.dataset.drawPanel = state.settings.drawPanelMode || 'normal';
  }

  function toggleDrawExpand() {
    let overlay = $('#drawExpandOverlay');
    if (overlay) {
      closeDrawOverlay();
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'drawExpandOverlay';
    overlay.className = 'draw-expand-overlay';
    overlay.innerHTML = `
      <div class="draw-overlay-stage">${drawVisualHtml('overlay')}</div>
      <button type="button" class="draw-overlay-close" aria-label="Close expanded draw">ESC / ปิด</button>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('draw-expanded-active');

    on($('.draw-overlay-close', overlay), 'click', closeDrawOverlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDrawOverlay();
    });
  }

  function closeDrawOverlay() {
    $('#drawExpandOverlay')?.remove();
    document.body.classList.remove('draw-expanded-active');
    $('#drawStage')?.classList.remove('expanded');
  }

  function resetLayoutSettings() {
    Object.assign(state.settings, {
      sidebarWidth: 284,
      appMaxWidth: 1280,
      drawStageHeight: 420,
      drawPanelMode: 'normal',
      uiDensity: 'comfortable'
    });
    fillForms();
    saveState('reset-layout');
  }

  function saveWebhookFromForm() {
    state.webhook.url = $('#webhookUrl')?.value.trim() || '';
    state.webhook.token = $('#webhookToken')?.value.trim() || '';
    state.webhook.sheetId = $('#sheetId')?.value.trim() || '';
    saveState('webhook');
  }

  async function sendWebhook(testOnly = false) {
    saveWebhookFromForm();
    const status = $('#sheetStatus');
    if (!state.webhook.url) {
      if (status) status.textContent = 'ยังไม่ได้ใส่ Webhook URL';
      return;
    }
    const payload = {
      test: testOnly,
      token: state.webhook.token,
      sheetId: state.webhook.sheetId,
      event: state.event,
      teams: state.teams,
      groups: state.groups,
      matches: state.matches,
      standings: state.standings,
      knockout: state.knockout
    };
    try {
      const res = await fetch(state.webhook.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (status) status.textContent = testOnly ? 'ส่ง Test แล้ว' : 'ส่งข้อมูลไป Google Sheet แล้ว';
      state.lastResult = { type: 'webhook', text: 'Export Google Sheet แล้ว', at: nowIso() };
      saveState('webhook-send');
    } catch (err) {
      if (status) status.textContent = 'ส่งไม่สำเร็จ: ' + err.message;
    }
  }

  function resetAll() {
    if (!confirm('Reset โปรเจกต์ทั้งหมด?')) return;
    state = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    fillForms();
    renderAll(true);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(state.event.name || 'pepslive').replace(/[^\wก-๙-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadJsonFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = merge(defaultState(), JSON.parse(reader.result));
        saveState('load-json');
        fillForms();
        renderAll(true);
      } catch (err) {
        toast('ไฟล์ JSON ไม่ถูกต้อง', 'warn');
      }
    };
    reader.readAsText(file);
  }

  function exportText(kind) {
    if (kind === 'draw') return groupsToText(getDisplayGroups(true));
    if (kind === 'schedule') return state.matches.map(m => `${m.time} สนาม ${m.court} | สาย ${m.group} | ${m.teamA} vs ${m.teamB}`).join('\n');
    if (kind === 'scores') return state.matches.map(m => `${m.teamA} ${m.scoreA || '-'} - ${m.scoreB || '-'} ${m.teamB} (${m.status})`).join('\n');
    if (kind === 'standings') {
      calculateStandings();
      return Object.keys(state.standings).sort().map(g => `สาย ${g}\n${sortedStandings(state.standings[g]).map((r, i) => `${i + 1}. ${r.team} ${r.PTS} pts`).join('\n')}`).join('\n\n');
    }
    if (kind === 'knockout') return state.knockout.map(m => `${m.round}: ${m.teamA} vs ${m.teamB}`).join('\n');
    if (kind === 'caption') return `${state.event.name}\n\nติดตามผลการแข่งขันและตารางแข่งแบบสด ๆ โดย PepsLive Tournament Studio`;
    if (kind === 'script') return `สวัสดีครับ ตอนนี้เป็นรายการ ${state.event.name} พร้อมเข้าสู่การแข่งขัน`;
    if (kind === 'all') return ['draw', 'schedule', 'scores', 'standings', 'knockout'].map(k => `--- ${k.toUpperCase()} ---\n${exportText(k)}`).join('\n\n');
    return '';
  }

  function groupsToText(groups) {
    return Object.keys(groups || {}).sort().map(g => `สาย ${g}\n${(groups[g] || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}`).join('\n\n');
  }

  function copyKind(kind) {
    copyText(exportText(kind), 'คัดลอกแล้ว');
    const box = $('#copyStatus');
    if (box) box.textContent = `คัดลอก ${kind} แล้ว`;
  }

  async function copyText(text, msg = 'คัดลอกแล้ว') {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text || '';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(msg, 'good');
  }

  function toast(msg, mode = 'good') {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.className = `toast ${mode}`;
    el.textContent = msg;
    setTimeout(() => { if (el) el.remove(); }, 1800);
  }

  function injectCoreCss() {
    if ($('#peps-clean-core-css')) return;
    const style = document.createElement('style');
    style.id = 'peps-clean-core-css';
    style.textContent = `
      .hidden{display:none!important}
      .stepper{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px auto;max-width:var(--app-max,1280px)}
      .step{border:1px solid var(--line);border-radius:14px;padding:9px;background:rgba(255,255,255,.04);display:flex;gap:8px;align-items:center}
      .step b{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08)}
      .step.done b{background:rgba(66,245,155,.26)}.step.active{outline:2px solid rgba(91,231,255,.25)}
      .statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.stat{border:1px solid var(--line);border-radius:18px;padding:14px;background:rgba(255,255,255,.045)}.stat span{display:block;color:var(--muted)}.stat b{font-size:32px}
      .source-section{grid-column:1/-1;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.03);padding:14px}.source-section h3{margin:0 0 12px;color:var(--accent)}
      .source-grid-core{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.source-grid-core.single{grid-template-columns:minmax(260px,560px)}
      .source-card{border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(255,255,255,.035);padding:16px}.source-card h3{margin:0 0 8px}.source-card p{color:var(--muted);min-height:34px}
      .source-url{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#cbefff;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.22);padding:9px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:10px}
      .draw-graphic{text-align:center;display:grid;gap:10px;place-items:center}.draw-fx{height:190px;display:grid;place-items:center}.draw-chip{border:1px solid rgba(255,132,49,.4);border-radius:999px;padding:6px 12px;color:#ffd7bd}.draw-group-badge{border:1px solid rgba(255,132,49,.4);border-radius:999px;padding:8px 16px}.draw-group-badge b{font-size:30px}.draw-team-name{font-size:clamp(34px,5vw,74px);font-weight:950;line-height:.95}.draw-team-sub{color:var(--muted);font-weight:800}.draw-progress{height:10px;width:min(460px,100%);border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.draw-progress-bar{height:100%;background:linear-gradient(90deg,#ff8131,#5be7ff);transition:width .12s linear}.draw-progress-text{width:min(460px,100%);display:flex;justify-content:space-between;color:var(--muted);font-size:12px}
      .pl-wheel{width:160px;height:160px;border-radius:50%;background:conic-gradient(#ffd51f,#5be7ff,#ff4081,#7d4dff,#ff9500,#ff4b3f,#48e662,#ffd51f);box-shadow:0 0 0 9px rgba(255,255,255,.08);animation:plSpin .95s linear infinite}.pl-slot{display:grid;grid-template-columns:repeat(4,42px);gap:8px}.pl-slot i{height:90px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.04));animation:plPulse .55s infinite alternate}.pl-card{width:116px;height:154px;border-radius:18px;background:#fff;color:#111;display:grid;place-items:center;font-size:42px;font-weight:950;animation:plFlip .85s infinite alternate}.pl-ball{width:138px;height:138px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff,#ffbe57 38%,#b95513);display:grid;place-items:center;color:#111;font-size:32px;font-weight:950;animation:plBob .75s infinite alternate}.pl-ring{width:160px;height:160px;border-radius:50%;border:10px solid rgba(255,255,255,.12);border-top-color:#ff8131;border-right-color:#5be7ff;animation:plSpin 1.1s linear infinite}@keyframes plSpin{to{transform:rotate(360deg)}}@keyframes plPulse{to{transform:translateY(-12px);opacity:.55}}@keyframes plFlip{to{transform:rotateY(28deg) rotateZ(3deg)}}@keyframes plBob{to{transform:translateY(-16px)}}
      .pl-groups-grid{display:grid;gap:12px}.pl-group-card{border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.06);overflow:hidden}.pl-group-title{display:flex;justify-content:space-between;padding:12px 14px;background:rgba(91,231,255,.08);font-weight:950}.pl-group-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:8px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.11)}.pl-group-row.empty .team{opacity:.45}.pl-group-row .no{color:var(--accent);font-weight:950}.pl-group-row .team{font-weight:850;word-break:break-word}
      .score-row{display:grid;grid-template-columns:1.5fr 1fr 70px auto 70px 1fr 130px;gap:8px;align-items:center;border-bottom:1px solid var(--line);padding:8px 0}.score-row input{min-width:0}
      .toast{position:fixed;right:18px;bottom:18px;z-index:99999;border:1px solid rgba(91,231,255,.4);background:rgba(7,17,31,.94);color:#fff;border-radius:14px;padding:11px 14px;box-shadow:0 14px 40px rgba(0,0,0,.30);font-weight:800}
      body[data-density="compact"] .card{padding:13px}.draw-stage.expanded{position:fixed;inset:24px;z-index:9999;background:var(--panel,#0e1d31);padding:20px;border-radius:24px}

      /* V6: stable Draw layout. Team names can wrap to 2 lines without pushing UI down. */
      .draw-stage{min-height:var(--draw-stage-h,420px)!important}
      .draw-stage .draw-graphic{
        width:min(760px,96%);
        min-height:var(--draw-stage-h,420px);
        display:grid!important;
        grid-template-rows:190px 34px 58px 112px 28px 10px 18px;
        align-content:center;
        justify-items:center;
        gap:10px!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-fx{height:190px!important;min-height:190px!important;display:grid;place-items:center}
      .draw-stage .draw-chip{height:34px;max-width:100%;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
      .draw-stage .draw-group-badge{min-height:58px;display:inline-flex;align-items:center;justify-content:center}
      .draw-stage .draw-team-name{
        min-height:112px!important;
        max-height:112px!important;
        width:min(680px,96%);
        display:-webkit-box!important;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden!important;
        text-overflow:ellipsis;
        overflow-wrap:anywhere;
        word-break:break-word;
        align-content:center;
        line-height:1.02!important;
      }
      .draw-stage .draw-team-sub{
        min-height:28px!important;
        max-height:28px!important;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
        max-width:100%;
      }
      .draw-stage .draw-progress{height:10px!important;margin:0!important}
      .draw-stage .draw-progress-text{height:18px!important;min-height:18px!important;align-items:center;margin:0!important}

      /* V6: expanded Draw is a real top layer, not behind the wheel or control row. */
      body.draw-expanded-active{overflow:hidden}
      .draw-stage.expanded{
        position:fixed!important;
        inset:18px!important;
        z-index:2147483000!important;
        min-height:auto!important;
        width:auto!important;
        height:auto!important;
        margin:0!important;
        padding:22px!important;
        display:grid!important;
        place-items:center!important;
        background:
          radial-gradient(circle at 20% 0%,rgba(91,231,255,.18),transparent 34%),
          radial-gradient(circle at 96% 10%,rgba(255,91,189,.16),transparent 30%),
          rgba(7,17,31,.96)!important;
        border:1px solid rgba(91,231,255,.38)!important;
        box-shadow:0 30px 90px rgba(0,0,0,.62)!important;
      }
      .draw-stage.expanded ~ .row{visibility:hidden!important}
      .draw-stage.expanded .draw-graphic{
        width:min(980px,94vw)!important;
        min-height:min(720px,calc(100vh - 80px))!important;
        grid-template-rows:220px 36px 64px 132px 32px 12px 20px!important;
      }
      .draw-stage.expanded .draw-fx{height:220px!important;min-height:220px!important}
      .draw-stage.expanded .draw-team-name{min-height:132px!important;max-height:132px!important;width:min(860px,94vw)}
      .draw-stage.expanded::after{
        content:'ESC เพื่อปิด Expand';
        position:absolute;
        right:20px;
        top:16px;
        font-size:12px;
        color:rgba(237,245,255,.68);
        border:1px solid rgba(255,255,255,.16);
        border-radius:999px;
        padding:7px 10px;
        background:rgba(0,0,0,.24);
      }


      /* V7: hard-lock Draw card geometry. 1-line and 2-line team names must not change UI height. */
      .draw-stage{
        min-height:var(--draw-stage-h,420px)!important;
        overflow:visible!important;
      }
      .draw-stage .draw-graphic{
        width:min(760px,96%)!important;
        height:var(--draw-stage-h,420px)!important;
        min-height:var(--draw-stage-h,420px)!important;
        max-height:var(--draw-stage-h,420px)!important;
        display:grid!important;
        grid-template-rows:150px 34px 58px 116px 28px 10px 18px!important;
        align-content:center!important;
        justify-items:center!important;
        gap:8px!important;
        overflow:hidden!important;
        contain:layout paint!important;
      }
      .draw-stage .draw-fx{
        grid-row:1!important;
        height:150px!important;
        min-height:150px!important;
        max-height:150px!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-chip{
        grid-row:2!important;
        height:34px!important;
        min-height:34px!important;
        max-height:34px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-group-badge{
        grid-row:3!important;
        min-height:58px!important;
        height:58px!important;
        max-height:58px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .draw-stage .draw-team-name{
        grid-row:4!important;
        width:min(680px,96%)!important;
        min-height:116px!important;
        height:116px!important;
        max-height:116px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        text-align:center!important;
        line-height:1!important;
        padding:0 8px!important;
      }
      .draw-stage .draw-team-name > span{
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        line-height:1!important;
        max-height:2em!important;
      }
      .draw-stage .draw-team-sub{
        grid-row:5!important;
        height:28px!important;
        min-height:28px!important;
        max-height:28px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
        width:min(680px,96%)!important;
      }
      .draw-stage .draw-progress{
        grid-row:6!important;
        height:10px!important;
        min-height:10px!important;
        max-height:10px!important;
        margin:0!important;
      }
      .draw-stage .draw-progress-text{
        grid-row:7!important;
        height:18px!important;
        min-height:18px!important;
        max-height:18px!important;
        margin:0!important;
        align-items:center!important;
      }
      .draw-stage .pl-wheel{width:132px!important;height:132px!important}
      .draw-stage .pl-slot i{height:70px!important}
      .draw-stage .pl-card{width:96px!important;height:126px!important}
      .draw-stage .pl-ball{width:118px!important;height:118px!important}

      /* V7: expanded draw is opaque and above every UI element. */
      body.draw-expanded-active{overflow:hidden!important}
      .draw-stage.expanded{
        position:fixed!important;
        inset:0!important;
        width:100vw!important;
        height:100vh!important;
        min-height:100vh!important;
        max-height:100vh!important;
        margin:0!important;
        padding:26px!important;
        z-index:2147483646!important;
        display:grid!important;
        place-items:center!important;
        background:#07111f!important;
        background-image:
          radial-gradient(circle at 16% 0%,rgba(91,231,255,.17),transparent 34%),
          radial-gradient(circle at 94% 10%,rgba(255,91,189,.14),transparent 30%)!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        overflow:hidden!important;
        isolation:isolate!important;
      }
      .draw-stage.expanded + .row,
      .draw-stage.expanded ~ .row,
      body.draw-expanded-active .content .panel[data-panel="draw"] .card > .row{
        visibility:hidden!important;
        pointer-events:none!important;
      }
      .draw-stage.expanded .draw-graphic{
        width:min(980px,94vw)!important;
        height:min(760px,calc(100vh - 80px))!important;
        min-height:min(760px,calc(100vh - 80px))!important;
        max-height:min(760px,calc(100vh - 80px))!important;
        grid-template-rows:190px 36px 66px 132px 32px 12px 20px!important;
        position:relative!important;
        z-index:2147483647!important;
      }
      .draw-stage.expanded .draw-fx{height:190px!important;min-height:190px!important;max-height:190px!important}
      .draw-stage.expanded .draw-team-name{
        width:min(860px,94vw)!important;
        height:132px!important;
        min-height:132px!important;
        max-height:132px!important;
      }
      .draw-stage.expanded .pl-wheel{width:168px!important;height:168px!important}
      .draw-stage.expanded .pl-card{width:116px!important;height:154px!important}
      .draw-stage.expanded .pl-ball{width:138px!important;height:138px!important}
      .draw-stage.expanded::after{
        content:'ESC เพื่อปิด Expand';
        position:absolute;
        top:16px;
        right:20px;
        z-index:2147483647;
        font-size:12px;
        color:rgba(237,245,255,.78);
        border:1px solid rgba(255,255,255,.16);
        border-radius:999px;
        padding:7px 10px;
        background:rgba(0,0,0,.32);
      }


      /* V8: stable Draw card + full wheel visibility. Total row height is below card height. */
      .draw-stage{
        min-height:520px!important;
        overflow:visible!important;
      }
      .draw-stage .draw-graphic{
        width:min(760px,96%)!important;
        height:500px!important;
        min-height:500px!important;
        max-height:500px!important;
        display:grid!important;
        grid-template-rows:170px 32px 56px 118px 28px 10px 18px!important;
        align-content:center!important;
        justify-items:center!important;
        gap:8px!important;
        overflow:hidden!important;
        contain:layout paint!important;
        box-sizing:border-box!important;
      }
      .draw-stage .draw-fx{
        grid-row:1!important;
        height:170px!important;
        min-height:170px!important;
        max-height:170px!important;
        width:100%!important;
        display:grid!important;
        place-items:center!important;
        overflow:visible!important;
      }
      .draw-stage .draw-chip{
        grid-row:2!important;
        height:32px!important;
        min-height:32px!important;
        max-height:32px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-group-badge{
        grid-row:3!important;
        height:56px!important;
        min-height:56px!important;
        max-height:56px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .draw-stage .draw-team-name{
        grid-row:4!important;
        width:min(680px,96%)!important;
        height:118px!important;
        min-height:118px!important;
        max-height:118px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        text-align:center!important;
        line-height:1!important;
        padding:0 8px!important;
      }
      .draw-stage .draw-team-name > span{
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        line-height:1!important;
        max-height:2em!important;
      }
      .draw-stage .draw-team-sub{
        grid-row:5!important;
        height:28px!important;
        min-height:28px!important;
        max-height:28px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
        width:min(680px,96%)!important;
      }
      .draw-stage .draw-progress{
        grid-row:6!important;
        height:10px!important;
        min-height:10px!important;
        max-height:10px!important;
        margin:0!important;
      }
      .draw-stage .draw-progress-text{
        grid-row:7!important;
        height:18px!important;
        min-height:18px!important;
        max-height:18px!important;
        margin:0!important;
        align-items:center!important;
      }
      .draw-stage .pl-wheel{width:150px!important;height:150px!important}
      .draw-stage .pl-slot{grid-template-columns:repeat(4,38px)!important}
      .draw-stage .pl-slot i{height:78px!important}
      .draw-stage .pl-card{width:106px!important;height:140px!important}
      .draw-stage .pl-ball{width:128px!important;height:128px!important}
      .draw-stage .pl-ring{width:142px!important;height:142px!important}

      /* V8: Expand Draw is a separate body-level overlay, never inside grid/cards. */
      body.draw-expanded-active{overflow:hidden!important}
      .draw-expand-overlay{
        position:fixed!important;
        inset:0!important;
        z-index:2147483647!important;
        display:grid!important;
        place-items:center!important;
        padding:26px!important;
        background:#07111f!important;
        background-image:
          radial-gradient(circle at 16% 0%,rgba(91,231,255,.17),transparent 34%),
          radial-gradient(circle at 94% 10%,rgba(255,91,189,.14),transparent 30%)!important;
        isolation:isolate!important;
      }
      .draw-overlay-stage{
        width:min(1040px,94vw)!important;
        height:min(780px,calc(100vh - 72px))!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        position:relative!important;
        z-index:2!important;
      }
      .draw-overlay-stage .draw-graphic{
        width:min(980px,94vw)!important;
        height:min(740px,calc(100vh - 100px))!important;
        min-height:min(740px,calc(100vh - 100px))!important;
        max-height:min(740px,calc(100vh - 100px))!important;
        grid-template-rows:210px 36px 66px 136px 32px 12px 20px!important;
        overflow:hidden!important;
      }
      .draw-overlay-stage .draw-fx{height:210px!important;min-height:210px!important;max-height:210px!important}
      .draw-overlay-stage .draw-team-name{height:136px!important;min-height:136px!important;max-height:136px!important;width:min(860px,94vw)!important}
      .draw-overlay-stage .pl-wheel{width:190px!important;height:190px!important}
      .draw-overlay-stage .pl-card{width:128px!important;height:170px!important}
      .draw-overlay-stage .pl-ball{width:158px!important;height:158px!important}
      .draw-overlay-stage .pl-ring{width:180px!important;height:180px!important}
      .draw-overlay-close{
        position:absolute!important;
        right:20px!important;
        top:16px!important;
        z-index:3!important;
        font-size:12px!important;
        color:rgba(237,245,255,.82)!important;
        border:1px solid rgba(255,255,255,.16)!important;
        border-radius:999px!important;
        padding:8px 12px!important;
        background:rgba(0,0,0,.35)!important;
      }
      .draw-stage.expanded{position:relative!important;inset:auto!important;width:auto!important;height:auto!important;z-index:auto!important}


      /* V9: real text-size variables + settings modal + adaptive group columns */
      .draw-stage .draw-chip{font-size:var(--draw-chip-fs,12px)!important}
      .draw-stage .draw-group-badge{font-size:var(--draw-group-label-fs,16px)!important}
      .draw-stage .draw-group-badge b{font-size:var(--draw-group-letter-fs,30px)!important}
      .draw-stage .draw-team-name{font-size:var(--draw-team-fs,56px)!important}
      .draw-stage .draw-team-sub{font-size:var(--draw-meta-fs,14px)!important}
      .draw-stage .draw-progress-text{font-size:var(--draw-status-fs,12px)!important}
      .pl-anim-core .draw-chip{font-size:var(--draw-chip-fs,12px)!important}
      .pl-anim-core .draw-group-badge{font-size:var(--draw-group-label-fs,16px)!important}
      .pl-anim-core .draw-group-badge b{font-size:var(--draw-group-letter-fs,30px)!important}
      .pl-anim-name{font-size:var(--source-team-fs,72px)!important}
      .pl-anim-meta{font-size:var(--source-meta-fs,22px)!important}
      .pl-group-title{font-size:var(--group-title-fs,14px)!important}
      .pl-group-row .team{font-size:var(--group-team-fs,14px)!important}
      .draw-inline-tool{
        display:grid;
        grid-template-columns:minmax(180px,240px) 1fr;
        gap:10px;
        align-items:center;
        margin:12px 0;
        border:1px solid rgba(91,231,255,.18);
        border-radius:16px;
        padding:10px 12px;
        background:rgba(7,20,38,.45);
      }
      .draw-inline-tool label{
        color:var(--muted);
        font-size:12px;
        font-weight:800;
      }
      .draw-inline-tool b{color:var(--text)}
      .settings-extra-controls{
        margin:12px 0;
        padding:12px;
        border:1px solid rgba(91,231,255,.16);
        border-radius:16px;
        background:rgba(7,20,38,.38);
      }
      .peps-settings-modal{
        position:fixed;
        inset:0;
        z-index:2147483600;
        display:none;
        align-items:center;
        justify-content:center;
        padding:18px;
        background:rgba(0,0,0,.66);
        backdrop-filter:blur(10px);
      }
      .peps-settings-modal.open{display:flex}
      .peps-settings-box{
        width:min(980px,96vw);
        max-height:92vh;
        overflow:auto;
        border:1px solid var(--line);
        border-radius:24px;
        background:linear-gradient(180deg,rgba(14,29,49,.98),rgba(7,17,31,.98));
        box-shadow:var(--shadow);
      }
      .peps-settings-head{
        position:sticky;
        top:0;
        z-index:2;
        display:flex;
        justify-content:space-between;
        gap:16px;
        padding:18px 20px;
        border-bottom:1px solid var(--line);
        background:rgba(14,29,49,.98);
      }
      .peps-settings-head h3{margin:0}
      .peps-settings-head p{margin:4px 0 0;color:var(--muted);font-size:13px}
      .peps-settings-body{
        display:grid;
        grid-template-columns:minmax(280px,.85fr) minmax(340px,1.15fr);
        gap:18px;
        padding:18px 20px;
      }
      .peps-settings-sliders{display:grid;gap:10px}
      .peps-slider label{
        display:flex;
        justify-content:space-between;
        gap:12px;
        color:var(--muted);
        font-size:12px;
        font-weight:800;
        margin-bottom:6px;
      }
      .peps-slider b{color:var(--text)}
      .peps-slider input{padding:0;height:8px;accent-color:var(--accent)}
      .peps-settings-preview{
        display:grid;
        align-content:start;
        gap:12px;
      }
      .preview-graphic{
        width:100%!important;
        height:500px!important;
        min-height:500px!important;
      }
      .preview-group-card{width:100%}
      .peps-settings-actions{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        padding:0 20px 20px;
      }


      /* V13: explicit Groups text-size rules for Control + Preview + Source */
      .pl-group-title{
        font-size:var(--group-title-fs,14px)!important;
        line-height:1.2!important;
      }
      .pl-group-row .team,
      .pl-group-row .no{
        font-size:var(--group-team-fs,14px)!important;
        line-height:1.25!important;
      }
      .preview-group-card .pl-group-title{
        font-size:var(--group-title-fs,14px)!important;
      }
      .preview-group-card .pl-group-row .team,
      .preview-group-card .pl-group-row .no{
        font-size:var(--group-team-fs,14px)!important;
      }
      /* V10: realtime preview selectors for every Draw Text Size control */
      .peps-settings-preview .preview-section-title{
        color:var(--accent);
        font-size:12px;
        font-weight:950;
        letter-spacing:.08em;
        text-transform:uppercase;
        margin:4px 0 -4px;
      }
      .peps-slider small{
        color:rgba(237,245,255,.45);
        font-size:10px;
        margin-left:6px;
        white-space:nowrap;
      }
      .preview-draw-stage{
        min-height:500px!important;
        border:1px solid rgba(91,231,255,.18);
        border-radius:20px;
        background:rgba(7,20,38,.42);
        padding:12px;
        overflow:hidden;
      }
      .preview-graphic{
        width:100%!important;
        height:500px!important;
        min-height:500px!important;
        max-height:500px!important;
      }
      .peps-settings-preview .draw-chip{font-size:var(--draw-chip-fs,12px)!important}
      .peps-settings-preview .draw-group-badge{font-size:var(--draw-group-label-fs,16px)!important}
      .peps-settings-preview .draw-group-badge b{font-size:var(--draw-group-letter-fs,30px)!important}
      .peps-settings-preview .draw-team-name{font-size:var(--draw-team-fs,56px)!important}
      .peps-settings-preview .draw-team-sub{font-size:var(--draw-meta-fs,14px)!important}
      .peps-settings-preview .draw-progress-text{font-size:var(--draw-status-fs,12px)!important}
      .preview-source-card{
        border:1px solid rgba(91,231,255,.18);
        border-radius:20px;
        background:rgba(7,20,38,.42);
        padding:12px;
        overflow:hidden;
      }
      .preview-source-card .preview-anim-core{
        width:100%!important;
        min-height:420px!important;
        height:420px!important;
        max-height:420px!important;
        box-shadow:none!important;
      }
      .preview-source-card .pl-anim-fx{
        height:120px!important;
        min-height:120px!important;
        max-height:120px!important;
      }
      .preview-source-card .pl-ring{
        width:100px!important;
        height:100px!important;
      }
      .preview-source-card .pl-anim-name{
        font-size:var(--source-team-fs,72px)!important;
      }
      .preview-source-card .pl-anim-meta{
        font-size:var(--source-meta-fs,22px)!important;
      }
      .preview-group-card{width:100%}
      .preview-group-card .pl-group-title{font-size:var(--group-title-fs,14px)!important}
      .preview-group-card .pl-group-row .team{font-size:var(--group-team-fs,14px)!important}

      @media(max-width:860px){
        .peps-settings-body{grid-template-columns:1fr}
        .draw-inline-tool{grid-template-columns:1fr}
      }

      @media(max-width:900px){.score-row{grid-template-columns:1fr 60px auto 60px 1fr}.score-row b,.score-row select{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function injectSourceCss() {
    injectCoreCss();
    if ($('#peps-source-css')) return;
    const style = document.createElement('style');
    style.id = 'peps-source-css';
    style.textContent = `
      html.source-mode,
      html.source-mode body,
      html.source-mode #sourceRoot{
        margin:0!important;
        width:100%!important;
        min-height:100%!important;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
        overflow:hidden!important;
      }
      html.source-mode body::before,
      html.source-mode body::after,
      html.source-mode #sourceRoot::before,
      html.source-mode #sourceRoot::after{
        display:none!important;
        content:none!important;
        background:none!important;
        background-image:none!important;
      }
      .source-mode #app{display:none!important}
      #sourceRoot{
        min-height:100vh!important;
        width:100vw!important;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
        overflow:hidden!important;
      }

      .pl-anim-source{
        min-height:100vh!important;
        width:100vw!important;
        display:grid!important;
        place-items:center!important;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
        color:#edf5ff;
        font-family:Prompt,"IBM Plex Sans Thai",system-ui,sans-serif;
        padding:0!important;
      }
      .pl-anim-core{
        text-align:center;
        width:min(620px,94vw);
        height:560px;
        min-height:560px;
        max-height:560px;
        padding:22px 24px;
        display:grid!important;
        grid-template-rows:210px 34px 64px 132px 32px!important;
        align-content:center!important;
        justify-items:center!important;
        gap:10px!important;
        background:rgba(7,17,31,.82)!important;
        border:1px solid rgba(91,231,255,.26)!important;
        border-radius:28px!important;
        box-shadow:0 24px 70px rgba(0,0,0,.38)!important;
        overflow:hidden!important;
      }
      .pl-anim-fx{
        height:210px!important;
        min-height:210px!important;
        max-height:210px!important;
        display:grid!important;
        place-items:center!important;
        overflow:visible!important;
      }
      .pl-anim-core .draw-chip{
        height:34px!important;
        min-height:34px!important;
        max-height:34px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .pl-anim-core .draw-group-badge{
        height:64px!important;
        min-height:64px!important;
        max-height:64px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .pl-anim-name{
        height:132px!important;
        min-height:132px!important;
        max-height:132px!important;
        width:min(560px,92vw)!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        text-align:center!important;
        overflow:hidden!important;
        padding:0 8px!important;
        font-size:clamp(42px,7vw,88px);
        font-weight:950;
        line-height:1!important;
        text-shadow:0 8px 32px rgba(0,0,0,.42);
      }
      .pl-anim-name > span{
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        line-height:1!important;
        max-height:2em!important;
      }
      .pl-anim-meta{
        height:32px!important;
        min-height:32px!important;
        max-height:32px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        margin:0!important;
        color:#c8d7ea;
        font-size:clamp(16px,2vw,26px);
        font-weight:800;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        max-width:100%;
      }
      .pl-anim-source .pl-wheel{width:190px!important;height:190px!important}
      .pl-anim-source .pl-card{width:128px!important;height:170px!important}
      .pl-anim-source .pl-ball{width:158px!important;height:158px!important}
      .pl-anim-source .pl-ring{width:180px!important;height:180px!important}

      .pl-groups-source{
        min-height:100vh!important;
        width:100vw!important;
        display:grid!important;
        place-items:center!important;
        padding:24px!important;
        color:#edf5ff;
        font-family:"IBM Plex Sans Thai",Prompt,system-ui,sans-serif;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
      }
      .pl-groups-board{
        width:min(1500px,96vw);
        max-height:calc(100vh - 48px);
        overflow:hidden!important;
        border:1px solid rgba(91,231,255,.24)!important;
        border-radius:28px!important;
        background:rgba(7,17,31,.86)!important;
        box-shadow:0 24px 70px rgba(0,0,0,.38)!important;
        padding:24px!important;
      }
      .pl-groups-head{
        display:flex;
        justify-content:space-between;
        gap:16px;
        align-items:flex-start;
        margin-bottom:16px;
        padding-bottom:14px;
        border-bottom:1px solid rgba(91,231,255,.18);
      }
      .pl-groups-head h1{margin:0;font-size:clamp(28px,3.4vw,56px);line-height:1}
      .pl-groups-head p{margin:6px 0 0;color:#94a8c5}
      .pl-groups-source .pl-groups-grid{
        display:grid!important;
        gap:12px!important;
        align-items:start!important;
        overflow:hidden!important;
      }
      .pl-groups-source .pl-group-card{
        border:1px solid rgba(91,231,255,.18)!important;
        border-radius:18px!important;
        background:rgba(255,255,255,.045)!important;
        overflow:hidden!important;
      }
      .pl-groups-source .pl-group-title{
        display:flex;
        justify-content:space-between;
        gap:12px;
        padding:12px 14px;
        background:linear-gradient(135deg,rgba(91,231,255,.12),rgba(255,91,189,.08))!important;
        font-weight:950;
      }
      .pl-groups-source .pl-group-row{
        display:grid;
        grid-template-columns:38px minmax(0,1fr);
        gap:8px;
        padding:9px 12px;
        border-top:1px solid rgba(255,255,255,.11);
      }
      .pl-groups-source .pl-group-row.empty .team{opacity:.45}
      .pl-groups-source .pl-group-row .no{color:#5be7ff;font-weight:950}
      .pl-groups-source .pl-group-row .team{font-weight:850;word-break:break-word}
      .pl-groups-board table{width:100%;border-collapse:collapse}
      .pl-groups-board th,.pl-groups-board td{border-bottom:1px solid rgba(255,255,255,.15);padding:10px;text-align:left}

      /* V13: Groups Table OBS Source must follow Groups text-size sliders in real time. */
      .pl-groups-source .pl-group-title{
        font-size:var(--group-title-fs,14px)!important;
        line-height:1.2!important;
      }
      .pl-groups-source .pl-group-row .team{
        font-size:var(--group-team-fs,14px)!important;
        line-height:1.25!important;
      }
      .pl-groups-source .pl-group-row .no{
        font-size:var(--group-team-fs,14px)!important;
        line-height:1.25!important;
      }
      .empty-source{font-size:34px;font-weight:900;color:#c8d7ea;padding:40px;text-align:center}
    `;
    document.head.appendChild(style);
  }

  function resetMissingRoots() {
    // Keep function for future extension; avoids ReferenceError in older inline patches.
  }

  window.PeppsLiveTournamentStudio = { getState: () => state, saveState, renderAll, sourceUrl };
  window.PepsLiveTournamentStudio = window.PeppsLiveTournamentStudio;

  init();
})();
