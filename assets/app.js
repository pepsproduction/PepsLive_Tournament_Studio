/* PepsLive Tournament Studio */
(() => {
  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const APP_VERSION = 'Final-1.0.0';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

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

  const SOURCES = [
    ['wheel', 'Wheel Spin', 'วงล้อสุ่มแบบคลาสสิก ใช้กับ OBS ได้ทันที'],
    ['slot', 'Slot Reveal', 'ชื่อทีมวิ่งแบบสล็อต เหมาะกับไลฟ์สนุก ๆ'],
    ['card', 'Card Draw', 'สับการ์ดแล้วเปิดชื่อทีม ดูโปรและไม่จำเจ'],
    ['lottery', 'Lottery Ball', 'สุ่มแบบลูกบอลจับฉลาก เหมาะกับงานทางการ'],
    ['winner', 'Winner Graphic', 'แสดงผลสุ่มล่าสุดหรือผลคู่ล่าสุด'],
    ['groups', 'Groups Table', 'แสดงตารางแบ่งสาย / กลุ่ม'],
    ['schedule', 'Schedule Table', 'แสดงตารางแข่งพร้อมเวลาและสนาม'],
    ['standings', 'Standings Table', 'แสดงตารางคะแนนอัตโนมัติ'],
    ['knockout', 'Knockout Bracket', 'แสดงสายรอบ 8 ทีม / 4 ทีม / ชิง'],
    ['lower-third', 'Lower Third', 'แถบล่างสำหรับผลล่าสุด'],
    ['next-match', 'Next Match', 'แสดงคู่ถัดไปในตาราง'],
    ['latest-result', 'Latest Result', 'แสดงผลการแข่งขันล่าสุด']
  ];

  let state = loadState();
  let activePanel = 'dashboard';
  let modalSource = null;
  let saveTimer = null;
  let drawRuntime = { timer:null, uiTimer:null };
  let scheduleRuntime = { timer:null, uiTimer:null };

  function defaultState(){
    return {
      version: APP_VERSION,
      updatedAt: new Date().toISOString(),
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
      drawLive: { running:false, waiting:false, finished:false, phase:'idle', current:null, pendingItem:null, revealEndsAt:0, progress:0, total:0, feed:[] },
      matches: [],
      pendingSchedule: [],
      scheduleLive: { running:false, waiting:false, revealEndsAt:0, total:0, style:'shuffle' },
      standings: {},
      qualifierOverrides: {},
      knockout: [],
      lastResult: null,
      settings: { safeLive: true, sourceBg: 'dark', fontScale: 1, drawAnimation: 'wheel', drawMethod: 'auto-sequence', drawDuration: 5, randomizeSchedule: true, scheduleDuration: 5, scheduleRevealStyle: 'shuffle', sidebarWidth: 284, appMaxWidth: 1280, drawStageHeight: 420, drawPanelMode: 'normal', uiDensity: 'comfortable' },
      webhook: { url: '', token: '', sheetId: '' },
      audit: []
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return merge(defaultState(), parsed);
    }catch(err){
      console.warn(err);
      return defaultState();
    }
  }

  function merge(base, incoming){
    if(!incoming || typeof incoming !== 'object') return base;
    for(const [k,v] of Object.entries(incoming)){
      if(v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = merge(base[k], v);
      else base[k] = v;
    }
    base.version = APP_VERSION;
    return base;
  }

  function saveState(note='save'){
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyLayoutSettings();
    const pill = $('#autosavePill');
    if(pill) pill.textContent = 'Auto Save: ' + new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    renderAll(false);
    if(note) console.debug('saved', note);
  }

  function scheduleSave(note){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(note), 220);
  }

  function audit(action, data={}){
    state.audit.unshift({ at: new Date().toISOString(), action, data });
    state.audit = state.audit.slice(0, 80);
  }

  function init(){
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if(view && view !== 'control'){
      renderSource(view);
      return;
    }
    applyLayoutSettings();
    buildNav();
    bindBaseEvents();
    fillForms();
    renderAll();
  }

  function buildNav(){
    const nav = $('#nav');
    nav.innerHTML = PANELS.map(([id, title, sub], i) => `<button class="navbtn" data-panel-target="${id}"><span>${title}<br><small>${sub}</small></span><small>${i+1}</small></button>`).join('');
    $$('[data-panel-target]').forEach(btn => btn.addEventListener('click', () => showPanel(btn.dataset.panelTarget)));
  }

  function bindBaseEvents(){
    $('#goNext').onclick = () => showPanel(nextPanel());
    $('#btnSaveProject').onclick = downloadJson;
    $('#loadProjectInput').onchange = loadJson;
    $('#safeLiveToggle').onchange = e => { state.settings.safeLive = e.target.checked; scheduleSave('safe-live'); };

    $('#preset').onchange = applyPreset;
    $('#saveSetup').onclick = saveSetupFromForm;
    $('#resetAll').onclick = resetAll;
    $('#saveTeams').onclick = saveTeamsFromText;
    $('#dedupeTeams').onclick = dedupeTeams;
    $('#sampleTeams').onclick = sampleTeams;

    $('#startDraw').onclick = startDraw;
    $('#nextReveal').onclick = nextReveal;
    $('#confirmDraw').onclick = confirmDraw;
    $('#redraw').onclick = resetPreparedDraw;
    $('#undoDraw').onclick = undoDraw;
    $('#drawAnimation').onchange = e => { state.settings.drawAnimation = e.target.value; scheduleSave('draw-animation'); };
    $('#drawMethod').onchange = e => { state.settings.drawMethod = e.target.value; scheduleSave('draw-method'); renderAll(false); };
    $('#drawDuration').oninput = e => { const v = clampInt(e.target.value, 1, 20); state.settings.drawDuration = v; const out = $('#drawDurationValue'); if(out) out.textContent = v; scheduleSave('draw-duration'); };
    $('#drawDuration').onchange = e => { const v = clampInt(e.target.value, 1, 20); state.settings.drawDuration = v; const out = $('#drawDurationValue'); if(out) out.textContent = v; renderAll(false); };

    $('#generateSchedule').onclick = generateSchedule;
    $('#rebalanceSchedule').onclick = generateSchedule;
    $('#copyScheduleBtn').onclick = () => copyKind('schedule');
    $('#scheduleDuration').oninput = e => { const v = clampInt(e.target.value, 1, 15); state.settings.scheduleDuration = v; const out = $('#scheduleDurationValue'); if(out) out.textContent = v; scheduleSave('schedule-duration'); };
    $('#scheduleDuration').onchange = e => { const v = clampInt(e.target.value, 1, 15); state.settings.scheduleDuration = v; const out = $('#scheduleDurationValue'); if(out) out.textContent = v; renderSchedule(); };
    $('#randomizeSchedule').onchange = e => { state.settings.randomizeSchedule = e.target.checked; scheduleSave('randomize-schedule'); };
    $('#scheduleRevealStyle').onchange = e => { state.settings.scheduleRevealStyle = e.target.value; scheduleSave('schedule-reveal-style'); renderSchedule(); };
    $('#saveScores').onclick = readScores;
    $('#markAllPending').onclick = () => { state.matches.forEach(m => m.status='Pending'); audit('mark-all-pending'); saveState('pending'); };
    $('#copyStandingsBtn').onclick = () => copyKind('standings');

    $('#enableThird').onchange = e => { state.event.enableThird = e.target.checked; scheduleSave('enable-third'); };
    $('#enableFinal').onchange = e => { state.event.enableFinal = e.target.checked; scheduleSave('enable-final'); };
    $('#generateKnockout').onclick = generateKnockout;
    $('#copyKnockoutBtn').onclick = () => copyKind('knockout');
    $('#clearOverrides').onclick = () => { state.qualifierOverrides = {}; audit('clear-overrides'); saveState('clear-overrides'); };

    $$('[data-copy]').forEach(b => b.onclick = () => copyKind(b.dataset.copy));
    $('#saveWebhook').onclick = saveWebhookFromForm;
    $('#testWebhook').onclick = () => sendWebhook(true);
    $('#sendWebhook').onclick = () => sendWebhook(false);

    $('#sourceBg').onchange = e => { state.settings.sourceBg = e.target.value; scheduleSave('source-bg'); };
    $('#fontScale').oninput = e => { state.settings.fontScale = Number(e.target.value); scheduleSave('font-scale'); };
    $('#sidebarWidth').oninput = e => updateRangeSetting('sidebarWidth', e.target.value, 220, 430, 'sidebarWidthValue', 'px');
    $('#appMaxWidth').oninput = e => updateRangeSetting('appMaxWidth', e.target.value, 1100, 1900, 'appMaxWidthValue', 'px');
    $('#drawStageHeight').oninput = e => updateRangeSetting('drawStageHeight', e.target.value, 300, 760, 'drawStageHeightValue', 'px');
    $('#drawPanelMode').onchange = e => { state.settings.drawPanelMode = e.target.value; applyLayoutSettings(); scheduleSave('draw-panel-mode'); };
    $('#uiDensity').onchange = e => { state.settings.uiDensity = e.target.value; applyLayoutSettings(); scheduleSave('ui-density'); };
    $('#toggleDrawExpand').onclick = toggleDrawExpand;
    $('#saveLayoutSettings').onclick = () => { applyLayoutSettings(); saveState('layout-settings'); toast('บันทึก Layout แล้ว', 'good'); };
    $('#resetLayoutSettings').onclick = resetLayoutSettings;
    $('#saveDisplaySettings').onclick = () => saveState('display-settings');

    $('#closeModal').onclick = () => $('#sourceModal').classList.remove('open');
    $('#copyModalUrl').onclick = () => modalSource && copyText(sourceUrl(modalSource), 'คัดลอก URL แล้ว');
    $('#openModalUrl').onclick = () => modalSource && window.open(sourceUrl(modalSource), '_blank');
  }

  function showPanel(id){
    activePanel = id;
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    $$('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.panelTarget === id));
    renderAll(false);
    scrollTo({top:0, behavior:'smooth'});
  }

  function fillForms(){
    $('#eventName').value = state.event.name || '';
    $('#sportType').value = state.event.sport || 'Custom';
    $('#preset').value = state.event.preset || 'custom';
    $('#groupCount').value = state.event.groupCount;
    $('#courtCount').value = state.event.courtCount;
    $('#startTime').value = state.event.startTime;
    $('#matchInterval').value = state.event.matchInterval;
    $('#breakEverySlots').value = state.event.breakEverySlots || 0;
    $('#breakMinutes').value = state.event.breakMinutes || 0;
    $('#pointsWin').value = state.event.pointsWin;
    $('#pointsDraw').value = state.event.pointsDraw;
    $('#pointsLoss').value = state.event.pointsLoss;
    $('#qualifiersPerGroup').value = state.event.qualifiersPerGroup;
    $('#teamText').value = state.teams.join('\n');
    $('#safeLiveToggle').checked = !!state.settings.safeLive;
    $('#drawAnimation').value = state.settings.drawAnimation || 'wheel';
    if($('#drawMethod')) $('#drawMethod').value = state.settings.drawMethod || 'auto-sequence';
    if($('#drawDuration')) $('#drawDuration').value = String(state.settings.drawDuration || 5);
    if($('#drawDurationValue')) $('#drawDurationValue').textContent = String(state.settings.drawDuration || 5);
    if($('#scheduleDuration')) $('#scheduleDuration').value = String(state.settings.scheduleDuration || 5);
    if($('#scheduleDurationValue')) $('#scheduleDurationValue').textContent = String(state.settings.scheduleDuration || 5);
    if($('#randomizeSchedule')) $('#randomizeSchedule').checked = state.settings.randomizeSchedule !== false;
    if($('#scheduleRevealStyle')) $('#scheduleRevealStyle').value = state.settings.scheduleRevealStyle || 'shuffle';
    $('#enableThird').checked = !!state.event.enableThird;
    $('#enableFinal').checked = !!state.event.enableFinal;
    $('#webhookUrl').value = state.webhook.url || '';
    $('#webhookToken').value = state.webhook.token || '';
    $('#sheetId').value = state.webhook.sheetId || '';
    $('#sourceBg').value = state.settings.sourceBg || 'dark';
    $('#fontScale').value = state.settings.fontScale || 1;
    setRangeValue('sidebarWidth', 'sidebarWidthValue', state.settings.sidebarWidth || 284);
    setRangeValue('appMaxWidth', 'appMaxWidthValue', state.settings.appMaxWidth || 1280);
    setRangeValue('drawStageHeight', 'drawStageHeightValue', state.settings.drawStageHeight || 420);
    if($('#drawPanelMode')) $('#drawPanelMode').value = state.settings.drawPanelMode || 'normal';
    if($('#uiDensity')) $('#uiDensity').value = state.settings.uiDensity || 'comfortable';
    applyLayoutSettings();
  }

  function saveSetupFromForm(){
    state.event.name = $('#eventName').value.trim() || 'PepsLive Tournament';
    state.event.sport = $('#sportType').value;
    state.event.preset = $('#preset').value;
    state.event.groupCount = clampInt($('#groupCount').value, 1, 64);
    state.event.courtCount = clampInt($('#courtCount').value, 1, 16);
    state.event.startTime = $('#startTime').value || '09:00';
    state.event.matchInterval = clampInt($('#matchInterval').value, 1, 240);
    state.event.breakEverySlots = clampInt($('#breakEverySlots').value, 0, 1000);
    state.event.breakMinutes = clampInt($('#breakMinutes').value, 0, 240);
    state.event.pointsWin = Number($('#pointsWin').value || 3);
    state.event.pointsDraw = Number($('#pointsDraw').value || 1);
    state.event.pointsLoss = Number($('#pointsLoss').value || 0);
    state.event.qualifiersPerGroup = clampInt($('#qualifiersPerGroup').value, 1, 8);
    audit('save-setup', state.event);
    saveState('setup');
    toast('บันทึก Setup แล้ว', 'good');
  }

  function applyPreset(){
    const p = $('#preset').value;
    if(p === 'basket3x3'){
      $('#sportType').value = 'Basketball 3x3'; $('#groupCount').value = 4; $('#matchInterval').value = 12; $('#pointsWin').value = 1; $('#pointsDraw').value = 0; $('#pointsLoss').value = 0;
    }else if(p === 'football'){
      $('#sportType').value = 'Football'; $('#groupCount').value = 4; $('#matchInterval').value = 20; $('#pointsWin').value = 3; $('#pointsDraw').value = 1; $('#pointsLoss').value = 0;
    }else if(p === 'esport'){
      $('#sportType').value = 'Esport'; $('#groupCount').value = 4; $('#matchInterval').value = 30; $('#pointsWin').value = 3; $('#pointsDraw').value = 0; $('#pointsLoss').value = 0;
    }
  }

  function saveTeamsFromText(){
    state.teams = parseTeams($('#teamText').value);
    state.groups = {};
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = { running:false, waiting:false, finished:false, phase:'idle', current:null, pendingItem:null, revealEndsAt:0, progress:0, total:0, feed:[] };
    state.matches = [];
    state.pendingSchedule = [];
    state.scheduleLive = { running:false, waiting:false, revealEndsAt:0, total:0, style: state.settings.scheduleRevealStyle || 'shuffle' };
    state.knockout = [];
    state.standings = {};
    audit('save-teams', { count: state.teams.length });
    saveState('teams');
  }

  function parseTeams(text){
    return text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  }

  function dedupeTeams(){
    const seen = new Set();
    const result = [];
    for(const t of parseTeams($('#teamText').value)){
      const key = normalizeName(t);
      if(!seen.has(key)){ seen.add(key); result.push(t); }
    }
    $('#teamText').value = result.join('\n');
    saveTeamsFromText();
    toast('ลบชื่อซ้ำแล้ว', 'good');
  }

  function sampleTeams(){
    const names = ['Volcano A','Volcano B','Sisaket One','Sisaket Two','Thunder 3x3','Dragon Hoop','Peps United','Moonlight','Red Phoenix','Blue Shark','Rocket Team','Wild Cats','Storm Rider','Black Wolf','Golden Lion','Sky Runner'];
    $('#teamText').value = names.join('\n');
    saveTeamsFromText();
  }

  function teamValidation(){
    const teams = state.teams;
    const dup = findDuplicates(teams);
    const similar = findSimilar(teams);
    const g = Math.max(1, state.event.groupCount || 1);
    const slots = Math.ceil(Math.max(teams.length,1) / g) * g;
    const byes = Math.max(0, slots - teams.length);
    const ok = teams.length > 0 && dup.length === 0;
    return { teams, dup, similar, groupCount:g, slots, byes, ok };
  }

  function clearDrawTimer(){ if(drawRuntime.timer){ clearTimeout(drawRuntime.timer); drawRuntime.timer = null; } }

  function setDrawUiTicker(active){
    if(active){
      if(!drawRuntime.uiTimer) drawRuntime.uiTimer = setInterval(updateDrawCountdownUI, 180);
    }else if(drawRuntime.uiTimer){
      clearInterval(drawRuntime.uiTimer);
      drawRuntime.uiTimer = null;
    }
  }

  function updateDrawCountdownUI(scopeRoot=null){
    const live = state.drawLive || {};
    if(!live.waiting) return;
    const scope = scopeRoot || $('#drawStage') || document;
    const bar = $('.draw-progress-bar', scope);
    const text = $('.draw-progress-text span:first-child', scope);
    const pctText = $('.draw-progress-text span:last-child', scope);
    if(!bar || !text || !pctText) return;
    const base = live.total ? ((live.progress + countdownProgress()) / live.total) * 100 : 0;
    const pct = Math.max(0, Math.min(100, Math.round(base)));
    bar.style.width = pct + '%';
    text.textContent = `กำลังสุ่ม... จะประกาศผลใน ${remainingSeconds()} วินาที`;
    pctText.textContent = pct + '%';
  }

  function clearScheduleTimer(){
    if(scheduleRuntime.timer){ clearTimeout(scheduleRuntime.timer); scheduleRuntime.timer = null; }
  }

  function setScheduleUiTicker(active){
    if(active){
      if(!scheduleRuntime.uiTimer) scheduleRuntime.uiTimer = setInterval(updateScheduleCountdownUI, 180);
    }else if(scheduleRuntime.uiTimer){
      clearInterval(scheduleRuntime.uiTimer);
      scheduleRuntime.uiTimer = null;
    }
  }

  function updateScheduleCountdownUI(scopeRoot=null){
    const live = state.scheduleLive || {};
    if(!live.waiting) return;
    const box = scopeRoot || $('#scheduleBox') || document;
    const bar = $('.schedule-progress-bar', box);
    const text = $('.schedule-progress-text span:first-child', box);
    const pctText = $('.schedule-progress-text span:last-child', box);
    if(!bar || !text || !pctText) return;
    const pct = scheduleCountdownProgress();
    bar.style.width = pct + '%';
    text.textContent = `กำลังสุ่มลำดับตารางแข่ง... จะเปิดผลใน ${scheduleRemainingSeconds()} วินาที`;
    pctText.textContent = pct + '%';
    if(scheduleRemainingSeconds() <= 0 && state.scheduleLive.waiting) commitPendingSchedule();
  }

  function resetDrawLive(){
    clearDrawTimer();
    setDrawUiTicker(false);
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = { running:false, waiting:false, finished:false, phase:'idle', current:null, pendingItem:null, revealEndsAt:0, progress:0, total:0, feed:[] };
  }

  function buildDrawPlan(){
    const v = teamValidation();
    if(!v.ok) return null;
    const groupLetters = letters(v.groupCount);
    const shuffled = shuffle([...state.teams]);
    while(shuffled.length < v.slots) shuffled.push('BYE');
    const groups = {};
    groupLetters.forEach(g => groups[g] = []);
    const sequence = [];
    let order = 1;
    shuffled.forEach(team => {
      const group = groupLetters[sequence.length % groupLetters.length];
      const slot = groups[group].length + 1;
      groups[group].push(team);
      sequence.push({ order, group, slot, team, text:`สาย ${group} · ลำดับ ${slot} · ${team}` });
      order++;
    });
    return { groups, sequence, byes:v.byes };
  }

  function prepareDrawSession(plan){
    clearDrawTimer();
    state.pendingGroups = structuredCloneSafe(plan.groups);
    state.pendingSequence = structuredCloneSafe(plan.sequence);
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = { running:false, waiting:false, finished:false, phase:'prepared', current:null, pendingItem:null, revealEndsAt:0, progress:0, total:plan.sequence.length, feed:[] };
    state.lastResult = { type:'draw-prepare', text:`เตรียมสุ่ม ${plan.sequence.length} รายการแล้ว`, at:new Date().toISOString() };
    audit('prepare-draw', { total: plan.sequence.length, byes: plan.byes, method: state.settings.drawMethod, animation: state.settings.drawAnimation });
  }

  function revealDrawItem(item, finished=false){
    state.drawLive.current = structuredCloneSafe(item);
    state.drawLive.pendingItem = null;
    state.drawLive.waiting = false;
    state.drawLive.phase = 'revealed';
    state.drawLive.progress = state.pendingRevealIndex;
    state.drawLive.total = state.pendingSequence.length;
    state.drawLive.finished = finished;
    state.drawLive.revealEndsAt = 0;
    state.drawLive.feed.unshift({ ...item, progress: state.pendingRevealIndex, total: state.pendingSequence.length });
    state.drawLive.feed = state.drawLive.feed.slice(0, 10);
    state.lastResult = { type:'draw-reveal', text:`สาย ${item.group} ลำดับ ${item.slot}: ${item.team}`, at:new Date().toISOString() };
  }

  function beginSuspense(item, opts={}){
    if(!item) return;
    clearDrawTimer();
    state.drawLive.running = !!opts.running;
    state.drawLive.waiting = true;
    state.drawLive.finished = false;
    state.drawLive.phase = opts.phase || 'suspense';
    state.drawLive.pendingItem = structuredCloneSafe(item);
    state.drawLive.revealEndsAt = Date.now() + (Math.max(1, state.settings.drawDuration || 5) * 1000);
    state.drawLive.progress = state.pendingRevealIndex;
    state.drawLive.total = state.pendingSequence.length;
    setDrawUiTicker(true);
    audit('draw-suspense', { mode: state.settings.drawAnimation, item });
    saveState('draw-suspense');
    drawRuntime.timer = setTimeout(() => {
      state.pendingRevealIndex += 1;
      const finished = state.pendingRevealIndex >= state.pendingSequence.length;
      revealDrawItem(item, finished);
      audit('draw-reveal', item);
      saveState('draw-reveal');
      if(finished){
        drawSequenceDone();
      }else if((state.settings.drawMethod || 'auto-sequence') === 'auto-sequence'){
        setTimeout(() => startNextSuspense(), 260);
      }else{
        state.drawLive.running = false;
        setDrawUiTicker(false);
      }
    }, Math.max(1, state.settings.drawDuration || 5) * 1000);
  }

  function startNextSuspense(){
    if(state.drawLive.waiting){ toast('กำลังเล่นอนิเมชั่นสุ่มอยู่', 'warn'); return false; }
    if(!state.pendingSequence.length){ toast('ยังไม่มีผลสุ่มที่เตรียมไว้', 'warn'); return false; }
    if(state.pendingRevealIndex >= state.pendingSequence.length){ drawSequenceDone(); return false; }
    const item = state.pendingSequence[state.pendingRevealIndex];
    beginSuspense(item, { running:(state.settings.drawMethod || 'auto-sequence') !== 'manual-step' });
    return true;
  }

  function revealAllAtOnce(){
    clearDrawTimer();
    setDrawUiTicker(true);
    state.drawLive.running = true;
    state.drawLive.waiting = true;
    state.drawLive.finished = false;
    state.drawLive.phase = 'bulk-suspense';
    state.drawLive.pendingItem = { order: state.pendingSequence.length, group:'ALL', slot:'ALL', team:`${state.pendingSequence.length} Teams` };
    state.drawLive.revealEndsAt = Date.now() + (Math.max(1, state.settings.drawDuration || 5) * 1000);
    state.drawLive.progress = 0;
    state.drawLive.total = state.pendingSequence.length;
    saveState('draw-bulk-suspense');
    drawRuntime.timer = setTimeout(() => {
      state.pendingRevealIndex = state.pendingSequence.length;
      state.pendingComplete = true;
      state.drawLive.waiting = false;
      state.drawLive.phase = 'bulk-revealed';
      state.drawLive.current = structuredCloneSafe(state.pendingSequence[state.pendingSequence.length - 1] || null);
      state.drawLive.pendingItem = null;
      state.drawLive.revealEndsAt = 0;
      state.drawLive.progress = state.pendingSequence.length;
      state.drawLive.feed = [...state.pendingSequence].reverse().slice(0, 10).map(item => ({ ...item, progress: state.pendingSequence.length, total: state.pendingSequence.length }));
      state.lastResult = { type:'draw-reveal-all', text:`สุ่มครบทั้งหมด ${state.pendingSequence.length} รายการแล้ว`, at:new Date().toISOString() };
      audit('draw-reveal-all', { total: state.pendingSequence.length });
      saveState('draw-reveal-all');
      drawSequenceDone();
    }, Math.max(1, state.settings.drawDuration || 5) * 1000);
  }

  function nextReveal(forceSave=true){
    if((state.settings.drawMethod || 'auto-sequence') !== 'manual-step'){
      return startNextSuspense();
    }
    if(state.drawLive.waiting){ toast('กำลังเล่นอนิเมชั่นอยู่ รอให้ผลออกก่อน', 'warn'); return false; }
    return startNextSuspense();
  }

  function drawSequenceDone(){
    clearDrawTimer();
    state.drawLive.running = false;
    state.drawLive.waiting = false;
    state.drawLive.finished = true;
    state.drawLive.phase = state.settings.drawMethod === 'instant-all' ? 'bulk-revealed' : 'revealed';
    state.pendingComplete = true;
    state.lastResult = { type:'draw-ready', text:'สุ่มครบทุกทีมแล้ว พร้อม Confirm Result', at:new Date().toISOString() };
    audit('draw-finished', { total: state.pendingSequence.length });
    saveState('draw-finished');
    setDrawUiTicker(false);
  }

  function runAutoReveal(){
    if(!state.pendingSequence.length){ toast('ยังไม่มีรายการให้สุ่ม', 'warn'); return; }
    state.drawLive.running = true;
    startNextSuspense();
  }

  function resetPreparedDraw(){
    resetDrawLive();
    state.lastResult = { type:'draw-reset', text:'ล้างผลสุ่มที่เตรียมไว้แล้ว', at:new Date().toISOString() };
    audit('reset-prepared-draw');
    saveState('reset-draw');
  }

  function startDraw(){
    saveSetupFromForm();
    saveTeamsFromText();
    const v = teamValidation();
    if(!v.ok){ toast('ยังสุ่มไม่ได้: ตรวจรายชื่อทีมก่อน', 'bad'); return; }
    const plan = buildDrawPlan();
    if(!plan){ toast('ยังสร้างแผนสุ่มไม่ได้', 'bad'); return; }
    prepareDrawSession(plan);
    const method = state.settings.drawMethod || 'auto-sequence';
    if(method === 'manual-step'){
      state.drawLive.running = false;
      state.lastResult = { type:'draw-manual-ready', text:'เตรียมสุ่มแล้ว กด Next Reveal เพื่อเปิดผลทีละทีม', at:new Date().toISOString() };
      audit('start-draw-manual', { total: plan.sequence.length });
      saveState('draw-manual-ready');
      toast('เตรียมสุ่มแบบ Manual แล้ว', 'good');
      return;
    }
    audit('start-draw-auto', { total: plan.sequence.length, method });
    saveState('draw-start');
    if(method === 'instant-all') revealAllAtOnce();
    else runAutoReveal();
  }

  function confirmDraw(){
    if(!state.pendingGroups){ toast('ยังไม่มีผลสุ่มที่รอ Confirm', 'warn'); return; }
    if(!state.pendingComplete && state.pendingSequence.length){ toast('ยังสุ่มไม่ครบทุกทีม กดให้ reveal จนครบก่อน', 'warn'); return; }
    state.drawHistory.unshift({ at:new Date().toISOString(), groups: structuredCloneSafe(state.pendingGroups) });
    state.groups = structuredCloneSafe(state.pendingGroups);
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.matches = [];
    state.pendingSchedule = [];
    state.scheduleLive = { running:false, waiting:false, revealEndsAt:0, total:0, style: state.settings.scheduleRevealStyle || 'shuffle' };
    state.knockout = [];
    state.qualifierOverrides = {};
    state.drawLive.running = false;
    state.drawLive.finished = true;
    state.lastResult = { type:'draw-confirmed', text:'ยืนยันผลจับสายแล้ว', at:new Date().toISOString() };
    audit('confirm-draw');
    saveState('confirm-draw');
    toast('Confirm ผลจับสายแล้ว', 'good');
  }

  function undoDraw(){
    clearDrawTimer();
    const last = state.drawHistory.shift();
    if(!last){ toast('ไม่มีประวัติให้ย้อนกลับ', 'warn'); return; }
    state.groups = last.groups || {};
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = { running:false, waiting:false, finished:false, phase:'idle', current:null, pendingItem:null, revealEndsAt:0, progress:0, total:0, feed:[] };
    state.matches = [];
    state.pendingSchedule = [];
    state.scheduleLive = { running:false, waiting:false, revealEndsAt:0, total:0, style: state.settings.scheduleRevealStyle || 'shuffle' };
    state.knockout = [];
    audit('undo-draw');
    saveState('undo-draw');
  }

  function drawStageHtml(){
    const live = state.drawLive || {};
    const phase = live.phase || 'idle';
    const waiting = !!live.waiting;
    const mode = state.settings.drawAnimation || 'wheel';
    const fallback = live.current || { order:0, group:'READY', slot:'-', team:'READY' };
    const showItem = waiting ? (live.pendingItem || fallback) : fallback;
    const isIdle = !live.current && !live.pendingItem && !state.pendingGroups;
    const isBye = showItem.team === 'BYE';
    const pct = live.total ? Math.round(((live.progress || 0) + (waiting ? countdownProgress() : (live.current ? 1 : 0))) / live.total * 100) : 0;
    const stateClass = waiting ? 'active waiting' : (isIdle ? 'idle' : 'result revealed');
    const bulkClass = phase.includes('bulk') ? 'bulk' : '';
    const statusText = waiting ? `กำลังสุ่ม... จะประกาศผลใน ${remainingSeconds()} วินาที` : (isIdle ? 'พร้อมสุ่ม · อนิเมชั่นขยับช้า ๆ รอใช้งาน' : (live.finished ? 'สุ่มครบแล้ว · พร้อม Confirm Result' : 'ประกาศผลแล้ว'));
    const visual = modeVisual(mode, waiting, showItem, phase, isIdle);
    const metaA = phase === 'bulk-suspense'
      ? `<span class="draw-chip">กำลังสุ่มทั้งหมด <b>${live.total || 0}</b> ทีม</span>`
      : `<span class="draw-chip">Reveal <b>${Math.min((live.progress || 0) + (waiting ? 1 : 0), live.total || 0)}</b> / ${live.total || 0}</span>`;
    const groupText = isIdle ? 'READY' : (phase === 'bulk-suspense' ? 'ALL GROUPS' : `สาย ${showItem.group}`);
    const slotText = isIdle ? 'รอสุ่ม' : (phase === 'bulk-suspense' ? 'ทั้งหมด' : `ลำดับ ${showItem.slot}`);
    const teamName = waiting ? (phase === 'bulk-suspense' ? 'DRAW ALL TEAMS' : '????????') : (isIdle ? 'READY TO DRAW' : (showItem.team || 'READY'));
    const teamSub = waiting
      ? (phase === 'bulk-suspense' ? `กำลังประมวลผลผลสุ่มทั้งหมด ${live.total || 0} รายการ` : `กำลังหาทีมสำหรับ <strong>สาย ${esc(showItem.group)} ลำดับ ${showItem.slot}</strong>`)
      : (isIdle ? 'กด Start Draw แล้วอนิเมชั่นจะเร่งความเร็ว ก่อนค่อยประกาศผล' : (isBye ? 'ช่องว่าง BYE ถูกวางลงในสายนี้' : `ทีมถูกสุ่มเข้า สาย ${esc(showItem.group)} ลำดับ ${showItem.slot}`));
    return `<div class="draw-graphic mode-${esc(mode)} ${stateClass} ${bulkClass} ${isBye ? 'danger-zone' : ''}" data-motion="${waiting ? 'active' : (isIdle ? 'idle' : 'result')}">${visual}<div class="draw-meta">${metaA}<span class="draw-chip">${groupText}</span><span class="draw-chip">${slotText}</span></div><div class="draw-hero"><div class="draw-group-badge">${isIdle ? 'STANDBY' : (phase === 'bulk-suspense' ? 'ALL GROUPS' : `Group <b>${esc(showItem.group)}</b>`)}</div><div class="draw-team-name">${esc(teamName)}</div><div class="draw-team-sub">${teamSub}</div></div><div class="draw-progress"><div class="draw-progress-track"><div class="draw-progress-bar" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div><div class="draw-progress-text"><span class="js-draw-status">${statusText}</span><span class="js-draw-percent">${Math.max(0, Math.min(100, pct))}%</span></div></div></div>`;
  }

  function remainingSeconds(){
    const end = state.drawLive?.revealEndsAt || 0;
    if(!end) return 0;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  function countdownProgress(){
    const live = state.drawLive || {};
    const dur = Math.max(1, state.settings.drawDuration || 5) * 1000;
    if(!live.revealEndsAt || !live.waiting) return 1;
    return Math.max(0, Math.min(1, 1 - ((live.revealEndsAt - Date.now()) / dur)));
  }

  function modeVisual(mode, waiting, item, phase, idle=false){
    const safeTeam = item?.team || 'READY';
    const letterChips = ['P','E','P','S','L','I','V','E'];
    if(mode === 'slot') return `<div class="slot-visual"><div class="slot-top">LUCKY DRAW</div><div class="slot-frame">${Array.from({length:4},(_,i)=>`<div class="slot-reel"><div class="slot-reel-track">${['★','9','7','6','3','8'].map((t,j)=>`<div class="slot-chip" style="--chip1:${['#14d955','#ff2f7e','#08c3ff','#ffd400'][ (i+j)%4 ]};--chip2:${['#0d8d38','#8a3dff','#ff8c00','#e43d30'][ (i+j)%4 ]}">${(waiting || idle) ? t : safeTeam.slice((i+j)%Math.max(1,safeTeam.length), ((i+j)%Math.max(1,safeTeam.length))+1)}</div>`).join('')}</div></div>`).join('')}</div></div>`;
    if(mode === 'card') return `<div class="card-visual"><div class="card-fan"><span class="card-rank">10</span><span class="card-center">♠</span><span class="card-suit">♠</span></div><div class="card-fan"><span class="card-rank">Q</span><span class="card-center">♥</span><span class="card-suit">♥</span></div><div class="card-fan"><span class="card-rank">A</span><span class="card-center">♣</span><span class="card-suit">♣</span></div></div>`;
    if(mode === 'lottery') return `<div class="lottery-visual"><div class="lottery-cage"></div><div class="ball-cloud"><div class="ball-mini red">12</div><div class="ball-mini blue">08</div><div class="ball-mini red">03</div><div class="ball-mini blue">17</div><div class="ball-mini red">22</div><div class="ball-mini blue">05</div></div><div class="lottery-stand"></div><div class="lottery-base"></div></div>`;
    return `<div class="wheel-pointer"></div><div class="wheel-visual"><div class="wheel-rotor"><div class="wheel-dots">${letterChips.map((c,i)=>`<i style="--i:${i}">${c}</i>`).join('')}</div></div></div>`;
  }

  function renderRevealFeed(){
    const feed = (state.drawLive && state.drawLive.feed) || [];
    if(!feed.length) return '<div class="empty">ยังไม่มี Reveal Feed</div>';
    return `<div class="reveal-feed">${feed.map(item => `<div class="reveal-item"><div class="idx">${item.order}</div><div><div class="line1">สาย ${esc(item.group)} · ลำดับ ${item.slot} · <b>${esc(item.team)}</b></div><div class="line2">Reveal ${item.progress}/${item.total}</div></div></div>`).join('')}</div>`;
  }

  function generateSchedule(){
    if(!Object.keys(state.groups).length){ toast('ต้องสุ่มสายก่อนสร้างตาราง', 'bad'); return; }
    saveSetupFromForm();
    clearScheduleTimer();
    const all = buildScheduleMatches();
    if(!all.length){ toast('ยังสร้างตารางไม่ได้', 'bad'); return; }
    applyTimes(all);
    state.pendingSchedule = all;
    state.scheduleLive = {
      running:true,
      waiting:true,
      revealEndsAt: Date.now() + (Math.max(1, state.settings.scheduleDuration || 5) * 1000),
      total: all.length,
      style: state.settings.scheduleRevealStyle || 'shuffle'
    };
    state.lastResult = { type:'schedule-pending', text:`กำลังสุ่มตารางแข่ง ${all.length} คู่`, at:new Date().toISOString() };
    audit('generate-schedule-pending', { matches: all.length, randomize: state.settings.randomizeSchedule !== false });
    saveState('schedule-pending');
    renderSchedule();
    setScheduleUiTicker(true);
    scheduleRuntime.timer = setTimeout(commitPendingSchedule, Math.max(1, state.settings.scheduleDuration || 5) * 1000);
  }

  function buildScheduleMatches(){
    const groupsEntries = Object.entries(state.groups);
    const groupOrder = state.settings.randomizeSchedule === false ? groupsEntries : shuffle([...groupsEntries]);
    const groupPairsMap = groupOrder.map(([group, teamsRaw]) => {
      const teams = teamsRaw.filter(t => t !== 'BYE');
      let pairs = roundRobinPairs(teams);
      if(state.settings.randomizeSchedule !== false) pairs = shuffle(pairs);
      return { group, pairs };
    });
    const all = [];
    let no = 1;
    while(groupPairsMap.some(g => g.pairs.length)){
      const activeGroups = state.settings.randomizeSchedule === false ? groupPairsMap : shuffle([...groupPairsMap]);
      for(const item of activeGroups){
        const pair = item.pairs.shift();
        if(!pair) continue;
        all.push({ id: uid('M'), no:no++, round:'Group Stage', group:item.group, teamA:pair[0], teamB:pair[1], scoreA:'', scoreB:'', winner:'', status:'Pending', court:'', time:'', locked:false });
      }
    }
    return all;
  }

  function commitPendingSchedule(){
    if(!state.pendingSchedule || !state.pendingSchedule.length) return;
    clearScheduleTimer();
    setScheduleUiTicker(false);
    state.matches = structuredCloneSafe(state.pendingSchedule);
    state.pendingSchedule = [];
    state.scheduleLive = { running:false, waiting:false, revealEndsAt:0, total:state.matches.length, style:state.settings.scheduleRevealStyle || 'shuffle' };
    state.knockout = [];
    state.lastResult = { type:'schedule-confirmed', text:`สร้างตารางแข่งแล้ว ${state.matches.length} คู่`, at:new Date().toISOString() };
    audit('commit-schedule', { matches: state.matches.length });
    saveState('schedule');
    renderAll(false);
  }

  function scheduleRemainingSeconds(){
    const end = state.scheduleLive?.revealEndsAt || 0;
    if(!end) return 0;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  function scheduleCountdownProgress(){
    const dur = Math.max(1, state.settings.scheduleDuration || 5) * 1000;
    const end = state.scheduleLive?.revealEndsAt || 0;
    if(!end) return 100;
    return Math.max(0, Math.min(100, Math.round((1 - ((end - Date.now()) / dur)) * 100)));
  }

  function applyTimes(matches){
    const courtCount = Math.max(1, state.event.courtCount || 1);
    const interval = Math.max(1, state.event.matchInterval || 15);
    const breakEvery = Math.max(0, state.event.breakEverySlots || 0);
    const breakMin = Math.max(0, state.event.breakMinutes || 0);
    let minutes = timeToMinutes(state.event.startTime || '09:00');
    let slotIndex = 0;
    matches.forEach((m, idx) => {
      if(idx > 0 && idx % courtCount === 0){
        slotIndex++;
        minutes += interval;
        if(breakEvery > 0 && slotIndex % breakEvery === 0) minutes += breakMin;
      }
      m.time = minutesToTime(minutes);
      m.court = 'สนาม ' + ((idx % courtCount) + 1);
    });
  }

  function readScores(){
    $$('#scoresBox tbody tr').forEach(row => {
      const id = row.dataset.id;
      const m = state.matches.find(x => x.id === id);
      if(!m) return;
      m.scoreA = $('[data-score="a"]', row).value;
      m.scoreB = $('[data-score="b"]', row).value;
      m.status = $('[data-score="status"]', row).value;
      m.winner = computeWinner(m);
    });
    computeStandings();
    refreshKnockoutNames();
    audit('save-scores');
    saveState('scores');
  }

  function computeWinner(m){
    if(m.status === 'Bye') return m.teamA === 'BYE' ? m.teamB : m.teamA;
    if(m.status === 'Forfeit A') return m.teamB;
    if(m.status === 'Forfeit B') return m.teamA;
    const a = Number(m.scoreA), b = Number(m.scoreB);
    if(m.status !== 'Finished' || Number.isNaN(a) || Number.isNaN(b)) return '';
    if(a > b) return m.teamA;
    if(b > a) return m.teamB;
    return 'Draw';
  }

  function computeStandings(){
    const standings = {};
    for(const [group, teams] of Object.entries(state.groups)){
      const rows = {};
      teams.filter(t => t !== 'BYE').forEach(t => rows[t] = { group, team:t, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, PTS:0, Rank:0 });
      state.matches.filter(m => m.group === group).forEach(m => {
        if(!rows[m.teamA] || !rows[m.teamB]) return;
        if(!['Finished','Bye','Forfeit A','Forfeit B'].includes(m.status)) return;
        let a = Number(m.scoreA), b = Number(m.scoreB);
        if(m.status === 'Forfeit A'){ a = 0; b = 2; }
        if(m.status === 'Forfeit B'){ a = 2; b = 0; }
        if(Number.isNaN(a) || Number.isNaN(b)) return;
        const A = rows[m.teamA], B = rows[m.teamB];
        A.P++; B.P++; A.GF += a; A.GA += b; B.GF += b; B.GA += a;
        if(a > b){ A.W++; B.L++; A.PTS += Number(state.event.pointsWin); B.PTS += Number(state.event.pointsLoss); }
        else if(b > a){ B.W++; A.L++; B.PTS += Number(state.event.pointsWin); A.PTS += Number(state.event.pointsLoss); }
        else { A.D++; B.D++; A.PTS += Number(state.event.pointsDraw); B.PTS += Number(state.event.pointsDraw); }
      });
      const sorted = Object.values(rows).map(r => ({...r, GD:r.GF-r.GA})).sort((a,b) =>
        b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF || b.W - a.W || a.team.localeCompare(b.team, 'th')
      );
      sorted.forEach((r,i) => r.Rank = i+1);
      standings[group] = sorted;
    }
    state.standings = standings;
    return standings;
  }

  function generateKnockout(){
    computeStandings();
    const qualifiers = getQualifierSlots();
    if(qualifiers.length < 2){ toast('ยังไม่มีทีมเข้ารอบพอสำหรับ Knockout', 'bad'); return; }
    const matches = [];
    if(qualifiers.length >= 8){
      const q = pickEight(qualifiers);
      matches.push(ko('QF1','รอบ 8 ทีม','QF1', q[0], q[3]));
      matches.push(ko('QF2','รอบ 8 ทีม','QF2', q[1], q[2]));
      matches.push(ko('QF3','รอบ 8 ทีม','QF3', q[4], q[7]));
      matches.push(ko('QF4','รอบ 8 ทีม','QF4', q[5], q[6]));
      matches.push(ko('SF1','รอบ 4 ทีม','SF1', {type:'winner', match:'QF1'}, {type:'winner', match:'QF2'}));
      matches.push(ko('SF2','รอบ 4 ทีม','SF2', {type:'winner', match:'QF3'}, {type:'winner', match:'QF4'}));
    }else if(qualifiers.length >= 4){
      const q = qualifiers.slice(0,4);
      matches.push(ko('SF1','รอบ 4 ทีม','SF1', q[0], q[3]));
      matches.push(ko('SF2','รอบ 4 ทีม','SF2', q[1], q[2]));
    }else{
      matches.push(ko('FINAL','ชิงชนะเลิศ','Final', qualifiers[0], qualifiers[1]));
    }
    if(matches.find(m => m.id === 'SF1') && matches.find(m => m.id === 'SF2')){
      if(state.event.enableThird) matches.push(ko('THIRD','ชิงที่ 3','Third Place', {type:'loser', match:'SF1'}, {type:'loser', match:'SF2'}));
      if(state.event.enableFinal) matches.push(ko('FINAL','ชิงชนะเลิศ','Final', {type:'winner', match:'SF1'}, {type:'winner', match:'SF2'}));
    }
    state.knockout = mergeExistingKnockout(matches, state.knockout);
    refreshKnockoutNames();
    audit('generate-knockout', { count: state.knockout.length });
    saveState('knockout');
  }

  function ko(id, round, label, sourceA, sourceB){
    return { id, round, label, sourceA, sourceB, teamA:'', teamB:'', scoreA:'', scoreB:'', winner:'', status:'Pending' };
  }

  function mergeExistingKnockout(next, old){
    return next.map(n => {
      const o = old.find(x => x.id === n.id);
      return o ? { ...n, scoreA:o.scoreA, scoreB:o.scoreB, winner:o.winner, status:o.status } : n;
    });
  }

  function readKnockout(){
    $$('#knockoutBox tbody tr').forEach(row => {
      const id = row.dataset.id;
      const m = state.knockout.find(x => x.id === id);
      if(!m) return;
      m.scoreA = $('[data-ko="a"]', row).value;
      m.scoreB = $('[data-ko="b"]', row).value;
      m.status = $('[data-ko="status"]', row).value;
      const manual = $('[data-ko="winner"]', row).value.trim();
      m.winner = manual || computeKoWinner(m);
    });
    refreshKnockoutNames();
    state.lastResult = lastFinishedResult();
    audit('save-knockout');
    saveState('knockout-score');
  }

  function computeKoWinner(m){
    const a = Number(m.scoreA), b = Number(m.scoreB);
    if(m.status !== 'Finished' || Number.isNaN(a) || Number.isNaN(b)) return '';
    if(a > b) return m.teamA;
    if(b > a) return m.teamB;
    return '';
  }

  function refreshKnockoutNames(){
    computeStandings();
    let changed = true;
    let guard = 0;
    while(changed && guard++ < 5){
      changed = false;
      for(const m of state.knockout){
        const a = resolveSource(m.sourceA);
        const b = resolveSource(m.sourceB);
        if(m.teamA !== a || m.teamB !== b){ m.teamA = a; m.teamB = b; changed = true; }
        if(!m.winner || ![m.teamA,m.teamB].includes(m.winner)) m.winner = computeKoWinner(m);
      }
    }
  }

  function resolveSource(src){
    if(!src) return '';
    if(src.type === 'qualifier') return resolveQualifier(src.group, src.rank) || `${src.rankText || 'ที่ '+src.rank} สาย ${src.group}`;
    if(src.type === 'winner'){
      const m = state.knockout.find(x => x.id === src.match);
      return m?.winner || `ผู้ชนะ ${src.match}`;
    }
    if(src.type === 'loser'){
      const m = state.knockout.find(x => x.id === src.match);
      if(!m || !m.winner) return `ผู้แพ้ ${src.match}`;
      if(m.winner === m.teamA) return m.teamB || `ผู้แพ้ ${src.match}`;
      if(m.winner === m.teamB) return m.teamA || `ผู้แพ้ ${src.match}`;
      return `ผู้แพ้ ${src.match}`;
    }
    return '';
  }

  function getQualifierSlots(){
    const slots = [];
    const groupNames = Object.keys(state.groups).sort();
    const qPer = Math.max(1, state.event.qualifiersPerGroup || 2);
    for(const g of groupNames){
      for(let r=1; r<=qPer; r++) slots.push({ type:'qualifier', group:g, rank:r, rankText:`ที่ ${r}` });
    }
    return slots;
  }

  function pickEight(q){
    const groups = Object.keys(state.groups).sort();
    if(groups.length >= 4 && state.event.qualifiersPerGroup >= 2){
      const [A,B,C,D] = groups;
      return [
        {type:'qualifier',group:A,rank:1}, {type:'qualifier',group:B,rank:1}, {type:'qualifier',group:A,rank:2}, {type:'qualifier',group:B,rank:2},
        {type:'qualifier',group:C,rank:1}, {type:'qualifier',group:D,rank:1}, {type:'qualifier',group:C,rank:2}, {type:'qualifier',group:D,rank:2}
      ];
    }
    return q.slice(0,8);
  }

  function resolveQualifier(group, rank){
    const key = `${group}:${rank}`;
    if(state.qualifierOverrides[key]) return state.qualifierOverrides[key];
    computeStandings();
    return state.standings[group]?.find(r => r.Rank === rank)?.team || '';
  }

  function saveOverridesFromUI(){
    $$('#overrideBox select').forEach(sel => {
      const key = sel.dataset.override;
      if(sel.value) state.qualifierOverrides[key] = sel.value;
      else delete state.qualifierOverrides[key];
    });
    refreshKnockoutNames();
    audit('save-overrides', state.qualifierOverrides);
    saveState('overrides');
  }

  function renderAll(fill=true){
    computeStandings();
    renderStepper();
    renderTop();
    renderNav();
    renderDashboard();
    renderTeams();
    renderDraw();
    renderSchedule();
    renderScores();
    renderStandings();
    renderOverrides();
    renderKnockout();
    renderSources();
    renderSettings();
    if(fill) fillForms();
  }

  function renderTop(){
    $('#sheetPill').textContent = state.webhook.url ? 'Google Sheet: Ready' : 'Google Sheet: Not set';
  }

  function renderNav(){
    const status = stepStatus();
    $$('.navbtn').forEach(btn => {
      const id = btn.dataset.panelTarget;
      btn.classList.toggle('active', id === activePanel);
      btn.classList.toggle('locked', false);
    });
  }

  function renderStepper(){
    const s = stepStatus();
    const steps = [
      ['Setup', s.setup, `${state.event.groupCount} สาย`],
      ['Teams', s.teams, `${state.teams.length} ทีม`],
      ['Draw', s.draw, Object.keys(state.groups).length ? 'สุ่มแล้ว' : 'ยังไม่สุ่ม'],
      ['Schedule', s.schedule, `${state.matches.length} คู่`],
      ['Scores', s.scores, `${finishedMatches()}/${state.matches.length}`],
      ['Knockout', s.knockout, `${state.knockout.length} แมตช์`],
      ['Export', s.export, 'Copy / Sheet']
    ];
    $('#stepper').innerHTML = steps.map(([name, ok, sub]) => `<div class="step ${ok?'done':'warn'}"><b>${esc(name)}</b>${esc(sub)}</div>`).join('');
  }

  function renderDashboard(){
    const stats = [
      ['ทีมทั้งหมด', state.teams.length],
      ['จำนวนสาย', Object.keys(state.groups).length || state.event.groupCount],
      ['แมตช์รอบแบ่งกลุ่ม', state.matches.length],
      ['จบแล้ว', finishedMatches()],
      ['Knockout', state.knockout.length],
      ['BYE', countBye()],
      ['Google Sheet', state.webhook.url ? 'Ready' : 'No'],
      ['Version', APP_VERSION]
    ];
    $('#dashboardStats').innerHTML = stats.map(([k,v]) => `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('');
    $('#nextAction').className = 'notice ' + (nextAction().type || '');
    $('#nextAction').textContent = nextAction().text;
    const guards = [
      ['State กลางชุดเดียว', true],
      ['Confirm ก่อนบันทึกผลสุ่ม', !!state.settings.safeLive],
      ['อนิเมชั่นสุ่มสีสันมากขึ้น', true],
      ['กำหนดเวลาออกผล 1–20 วินาที', true],
      ['Auto Save', true],
      ['Manual Override', true],
      ['Excel Export ถูกตัดออก', true]
    ];
    $('#guardList').innerHTML = guards.map(([t,ok]) => `<div class="tag ${ok?'good':'warn'}">${ok?'OK':'Check'} · ${esc(t)}</div>`).join(' ');
  }

  function renderTeams(){
    const v = teamValidation();
    const items = [];
    items.push(`<div class="notice ${v.teams.length?'good':'warn'}">พบรายชื่อ ${v.teams.length} ทีม · ${v.groupCount} สาย · ต้องใช้ ${v.slots} ช่อง · BYE ${v.byes}</div>`);
    if(v.dup.length) items.push(`<div class="notice bad">ชื่อซ้ำ: ${esc(v.dup.join(', '))}</div>`);
    if(v.similar.length) items.push(`<div class="notice warn">ชื่อคล้ายกัน: ${esc(v.similar.map(x=>x.join(' / ')).join(', '))}</div>`);
    if(!v.dup.length && v.teams.length) items.push(`<div class="notice good">รายชื่อพร้อมสุ่ม</div>`);
    $('#teamValidation').innerHTML = items.join('');
  }

  function renderDraw(){
    const pendingText = state.pendingGroups ? (state.pendingComplete ? 'สุ่มครบทุกทีมแล้ว รอ Confirm Result' : 'มีผลสุ่มรอ Confirm อยู่') : 'ยังไม่มีผล pending';
    $('#pendingBox').className = 'notice ' + (state.pendingGroups ? (state.pendingComplete ? 'good' : 'warn') : '');
    $('#pendingBox').textContent = pendingText;
    const groups = state.pendingGroups ? visiblePendingGroups() : state.groups;
    $('#groupResult').innerHTML = renderGroupCards(groups);
    $('#revealFeed').innerHTML = renderRevealFeed();
    $('#drawStage').innerHTML = drawStageHtml();
    const nextBtn = $('#nextReveal');
    if(nextBtn) nextBtn.disabled = !(state.settings.drawMethod === 'manual-step' && state.pendingSequence.length && !state.pendingComplete && !state.drawLive.waiting);
  }

  function renderGroupCards(groups){
    if(!groups || !Object.keys(groups).length) return '<div class="empty">ยังไม่มีผลแบ่งสาย</div>';
    return `<div class="groupgrid">${Object.entries(groups).map(([g, teams]) => `<div class="groupcard"><div class="grouphead"><span>สาย ${esc(g)}</span><small>${teams.length} ทีม</small></div>${teams.map((t,i)=>`<div class="teamrow"><span class="slot">${i+1}</span><span>${esc(t || '—')}</span></div>`).join('')}</div>`).join('')}</div>`;
  }

  function visiblePendingGroups(){
    if(!state.pendingGroups) return state.groups;
    if(state.pendingComplete) return state.pendingGroups;
    const groups = {};
    Object.keys(state.pendingGroups).forEach(g => groups[g] = []);
    const revealed = state.pendingSequence.slice(0, state.pendingRevealIndex);
    revealed.forEach(item => {
      const arr = groups[item.group] || (groups[item.group] = []);
      arr[item.slot - 1] = item.team;
    });
    Object.keys(groups).forEach(g => {
      const full = state.pendingGroups[g].length;
      groups[g] = Array.from({length: full}, (_,i) => groups[g][i] || '—');
    });
    return groups;
  }

  function renderSchedule(){
    if(state.scheduleLive?.waiting && state.scheduleLive.revealEndsAt && Date.now() >= state.scheduleLive.revealEndsAt) commitPendingSchedule();
    $('#restWarnings').innerHTML = renderRestWarnings();
    if(state.scheduleLive?.waiting){
      $('#scheduleBox').innerHTML = scheduleSuspenseHtml();
      updateScheduleCountdownUI();
      return;
    }
    if(!state.matches.length){ $('#scheduleBox').innerHTML = '<div class="empty">ยังไม่มีตารางแข่ง กด Generate Schedule หลังสุ่มสาย</div>'; return; }
    $('#scheduleBox').innerHTML = scheduleTableHtml(state.matches);
  }

  function scheduleTableHtml(matches){
    return `<div class="tablewrap"><table><thead><tr><th>Match</th><th>เวลา</th><th>สนาม</th><th>สาย</th><th>ทีม A</th><th>ทีม B</th><th>Status</th></tr></thead><tbody>${matches.map(m => `<tr><td>${m.no}</td><td>${esc(m.time)}</td><td>${esc(m.court)}</td><td>${esc(m.group)}</td><td>${esc(m.teamA)}</td><td>${esc(m.teamB)}</td><td>${esc(m.status)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function scheduleSuspenseHtml(){
    const live = state.scheduleLive || {};
    const style = live.style || 'shuffle';
    const pct = scheduleCountdownProgress();
    const preview = (state.pendingSchedule || []).slice(0, 6);
    return `<div class="schedule-suspense ${esc(style)}"><div class="schedule-visual">${scheduleVisualHtml(style)}</div><div class="schedule-title">Randomizing Match Schedule</div><div class="schedule-sub">สุ่มลำดับสายและคู่แข่งขันทั้งหมด ${live.total || 0} คู่</div><div class="schedule-preview">${preview.map(m => `<div class="schedule-mini-card"><b>Match ?</b><span>${esc(m.group)} · ${esc(m.teamA)} vs ${esc(m.teamB)}</span></div>`).join('')}</div><div class="schedule-progress"><div class="schedule-progress-track"><div class="schedule-progress-bar" style="width:${pct}%"></div></div><div class="schedule-progress-text"><span>กำลังสุ่มลำดับตารางแข่ง... จะเปิดผลใน ${scheduleRemainingSeconds()} วินาที</span><span>${pct}%</span></div></div></div>`;
  }

  function scheduleVisualHtml(style){
    if(style === 'scanner') return `<div class="scanner-visual"><span></span><span></span><span></span><span></span></div>`;
    if(style === 'cards') return `<div class="schedule-card-stack"><i></i><i></i><i></i><i></i></div>`;
    return `<div class="shuffle-board"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span></div>`;
  }

  function renderScores(){
    if(!state.matches.length){ $('#scoresBox').innerHTML = '<div class="empty">ยังไม่มีตารางแข่ง</div>'; return; }
    $('#scoresBox').innerHTML = `<div class="tablewrap"><table><thead><tr><th>Match</th><th>เวลา</th><th>สาย</th><th>ทีม A</th><th>Score</th><th>Score</th><th>ทีม B</th><th>Winner</th><th>Status</th></tr></thead><tbody>${state.matches.map(m => `<tr data-id="${m.id}"><td>${m.no}</td><td>${esc(m.time)}</td><td>${esc(m.group)}</td><td>${esc(m.teamA)}</td><td><input class="scoreinput" type="number" data-score="a" value="${esc(m.scoreA)}"></td><td><input class="scoreinput" type="number" data-score="b" value="${esc(m.scoreB)}"></td><td>${esc(m.teamB)}</td><td>${esc(m.winner || computeWinner(m) || '-')}</td><td><select data-score="status"><option ${m.status==='Pending'?'selected':''}>Pending</option><option ${m.status==='Live'?'selected':''}>Live</option><option ${m.status==='Finished'?'selected':''}>Finished</option><option ${m.status==='Bye'?'selected':''}>Bye</option><option ${m.status==='Forfeit A'?'selected':''}>Forfeit A</option><option ${m.status==='Forfeit B'?'selected':''}>Forfeit B</option></select></td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderStandings(){
    const html = Object.entries(state.standings).map(([g, rows]) => `<h3>สาย ${esc(g)}</h3><div class="tablewrap"><table><thead><tr><th>Rank</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>${rows.map(r => `<tr><td class="${r.Rank<=2?'rank'+r.Rank:''}">${r.Rank}</td><td>${esc(r.team)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td>${r.PTS}</td></tr>`).join('')}</tbody></table></div>`).join('');
    $('#standingsBox').innerHTML = html || '<div class="empty">ยังไม่มี standings</div>';
  }

  function renderOverrides(){
    const groups = Object.keys(state.groups).sort();
    if(!groups.length){ $('#overrideBox').innerHTML = '<div class="empty">ต้องสุ่มสายก่อน</div>'; return; }
    const q = Math.max(1, state.event.qualifiersPerGroup || 2);
    let html = '';
    for(const g of groups){
      const teams = (state.groups[g] || []).filter(t => t !== 'BYE');
      html += `<h4>สาย ${esc(g)}</h4><div class="grid two">`;
      for(let r=1; r<=q; r++){
        const key = `${g}:${r}`;
        html += `<div class="field"><label>อันดับ ${r} สาย ${esc(g)}</label><select data-override="${esc(key)}"><option value="">Auto: ${esc(resolveQualifier(g,r) || '-')}</option>${teams.map(t => `<option value="${esc(t)}" ${state.qualifierOverrides[key]===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
      }
      html += `</div>`;
    }
    html += `<div class="row"><button class="btn primary" id="saveOverrides">บันทึก Override</button></div>`;
    $('#overrideBox').innerHTML = html;
    $('#saveOverrides').onclick = saveOverridesFromUI;
  }

  function renderKnockout(){
    refreshKnockoutNames();
    if(!state.knockout.length){ $('#knockoutBox').innerHTML = '<div class="empty">ยังไม่มี Knockout กด Generate / Refresh Knockout</div>'; return; }
    $('#knockoutBox').innerHTML = `<div class="tablewrap"><table><thead><tr><th>รอบ</th><th>คู่</th><th>ทีม A</th><th>Score</th><th>Score</th><th>ทีม B</th><th>Winner / Override</th><th>Status</th></tr></thead><tbody>${state.knockout.map(k => `<tr data-id="${k.id}"><td>${esc(k.round)}</td><td>${esc(k.label)}</td><td>${esc(k.teamA)}</td><td><input class="scoreinput" type="number" data-ko="a" value="${esc(k.scoreA)}"></td><td><input class="scoreinput" type="number" data-ko="b" value="${esc(k.scoreB)}"></td><td>${esc(k.teamB)}</td><td><input data-ko="winner" value="${esc(k.winner)}" placeholder="Auto"></td><td><select data-ko="status"><option ${k.status==='Pending'?'selected':''}>Pending</option><option ${k.status==='Live'?'selected':''}>Live</option><option ${k.status==='Finished'?'selected':''}>Finished</option></select></td></tr>`).join('')}</tbody></table></div><div class="row"><button class="btn primary" id="saveKoScores">บันทึก Knockout Scores</button></div>`;
    $('#saveKoScores').onclick = readKnockout;
  }

  function renderSources(){
    $('#sourceCards').innerHTML = SOURCES.map(([id,name,desc]) => `<div class="source-card"><h3>+ ${esc(name)}</h3><p>${esc(desc)}</p><div class="row"><button class="btn small primary" data-source="${id}">Copy / Preview URL</button></div></div>`).join('');
    $$('[data-source]').forEach(btn => btn.onclick = () => openSourceModal(btn.dataset.source));
  }

  function openSourceModal(id){
    const src = SOURCES.find(x => x[0] === id);
    modalSource = id;
    $('#modalTitle').textContent = src?.[1] || id;
    $('#modalDesc').textContent = src?.[2] || '';
    $('#modalUrl').textContent = sourceUrl(id);
    $('#sourceModal').classList.add('open');
  }


  function setRangeValue(inputId, outputId, value){
    const input = $('#' + inputId);
    const output = $('#' + outputId);
    if(input) input.value = String(value);
    if(output) output.textContent = String(value);
  }

  function updateRangeSetting(key, raw, min, max, outputId){
    const value = clampInt(raw, min, max);
    state.settings[key] = value;
    const output = $('#' + outputId);
    if(output) output.textContent = String(value);
    applyLayoutSettings();
    scheduleSave('layout-' + key);
  }

  function applyLayoutSettings(){
    const root = document.documentElement;
    if(!root || !state || !state.settings) return;
    const sidebar = clampInt(state.settings.sidebarWidth || 284, 220, 430);
    const appWidth = clampInt(state.settings.appMaxWidth || 1280, 1100, 1900);
    const drawHeight = clampInt(state.settings.drawStageHeight || 420, 300, 760);
    root.style.setProperty('--sidebar-w', sidebar + 'px');
    root.style.setProperty('--app-max', appWidth + 'px');
    root.style.setProperty('--draw-stage-min', drawHeight + 'px');
    document.body.classList.toggle('draw-wide', state.settings.drawPanelMode === 'wide');
    document.body.classList.toggle('draw-full', state.settings.drawPanelMode === 'full');
    document.body.classList.toggle('ui-compact', state.settings.uiDensity === 'compact');
  }

  function resetLayoutSettings(){
    state.settings.sidebarWidth = 284;
    state.settings.appMaxWidth = 1280;
    state.settings.drawStageHeight = 420;
    state.settings.drawPanelMode = 'normal';
    state.settings.uiDensity = 'comfortable';
    applyLayoutSettings();
    fillForms();
    saveState('reset-layout');
    toast('Reset Layout แล้ว', 'good');
  }

  function toggleDrawExpand(){
    const current = state.settings.drawPanelMode || 'normal';
    state.settings.drawPanelMode = current === 'normal' ? 'wide' : current === 'wide' ? 'full' : 'normal';
    applyLayoutSettings();
    fillForms();
    saveState('toggle-draw-expand');
  }

  function renderSettings(){
    const dbg = {
      version: state.version,
      updatedAt: state.updatedAt,
      teams: state.teams.length,
      groups: Object.keys(state.groups).length,
      matches: state.matches.length,
      finished: finishedMatches(),
      knockout: state.knockout.length,
      overrides: state.qualifierOverrides,
      webhookReady: !!state.webhook.url,
      layout: { sidebarWidth: state.settings.sidebarWidth, appMaxWidth: state.settings.appMaxWidth, drawStageHeight: state.settings.drawStageHeight, drawPanelMode: state.settings.drawPanelMode, uiDensity: state.settings.uiDensity }
    };
    $('#debugState').textContent = JSON.stringify(dbg, null, 2);
  }

  function stepStatus(){
    return {
      setup: !!state.event.name && state.event.groupCount > 0,
      teams: state.teams.length > 0 && !teamValidation().dup.length,
      draw: Object.keys(state.groups).length > 0,
      schedule: state.matches.length > 0,
      scores: state.matches.length > 0 && finishedMatches() === state.matches.length,
      knockout: state.knockout.length > 0,
      export: Object.keys(state.groups).length > 0
    };
  }

  function nextPanel(){
    const s = stepStatus();
    if(!s.setup) return 'setup';
    if(!s.teams) return 'teams';
    if(!s.draw) return 'draw';
    if(!s.schedule) return 'schedule';
    if(!s.scores) return 'scores';
    if(!s.knockout) return 'knockout';
    return 'export';
  }

  function nextAction(){
    const n = nextPanel();
    const map = {
      setup: 'ตั้งค่ารายการก่อน เช่น จำนวนสาย สนาม เวลาเริ่ม และกติกาคะแนน',
      teams: 'ใส่รายชื่อทีมและตรวจชื่อซ้ำให้เรียบร้อย',
      draw: 'เริ่มสุ่มสาย แล้วกด Confirm Result เพื่อบันทึก',
      schedule: 'สร้างตารางแข่งรอบแบ่งกลุ่ม',
      scores: 'กรอกคะแนนให้ครบ เพื่อให้ระบบคำนวณอันดับ',
      knockout: 'Generate Knockout เพื่อให้ทีมอันดับ 1/2 เด้งเข้ารอบต่อไป',
      export: 'พร้อม Export แบบ Copy หรือ Google Sheet'
    };
    return { text: map[n], type: n === 'export' ? 'good' : 'warn' };
  }

  function rows(kind){
    computeStandings(); refreshKnockoutNames();
    const out = [];
    if(kind === 'draw'){
      out.push(['Group','Slot','Team']);
      Object.entries(state.groups).forEach(([g,ts]) => ts.forEach((t,i) => out.push([g,i+1,t])));
    }else if(kind === 'schedule'){
      out.push(['Match','Time','Court','Round','Group','Team A','Team B','Status']);
      state.matches.forEach(m => out.push([m.no,m.time,m.court,m.round,m.group,m.teamA,m.teamB,m.status]));
    }else if(kind === 'scores'){
      out.push(['Match','Group','Team A','Score A','Score B','Team B','Winner','Status']);
      state.matches.forEach(m => out.push([m.no,m.group,m.teamA,m.scoreA,m.scoreB,m.teamB,m.winner || computeWinner(m),m.status]));
    }else if(kind === 'standings'){
      out.push(['Group','Rank','Team','P','W','D','L','GF','GA','GD','PTS']);
      Object.entries(state.standings).forEach(([g,rs]) => rs.forEach(r => out.push([g,r.Rank,r.team,r.P,r.W,r.D,r.L,r.GF,r.GA,r.GD,r.PTS])));
    }else if(kind === 'knockout'){
      out.push(['Round','Label','Team A','Score A','Score B','Team B','Winner','Status']);
      state.knockout.forEach(k => out.push([k.round,k.label,k.teamA,k.scoreA,k.scoreB,k.teamB,k.winner,k.status]));
    }
    return out;
  }

  function copyKind(kind){
    let text = '';
    if(kind === 'all') text = ['draw','schedule','scores','standings','knockout'].map(k => `[${k.toUpperCase()}]\n` + tsv(rows(k))).join('\n\n');
    else if(kind === 'caption') text = facebookCaption();
    else if(kind === 'script') text = presenterScript();
    else text = tsv(rows(kind));
    copyText(text, 'คัดลอก ' + kind + ' แล้ว');
  }

  function facebookCaption(){
    const lines = [`${state.event.name}`, '', 'ผลจับสาย / ตารางแข่งขัน'];
    Object.entries(state.groups).forEach(([g,ts]) => lines.push(`สาย ${g}: ${ts.filter(t=>t!=='BYE').join(', ')}`));
    if(state.matches.length) lines.push('', `ตารางแข่งทั้งหมด ${state.matches.length} คู่ เริ่มเวลา ${state.event.startTime}`);
    if(state.knockout.length) lines.push(`รอบ Knockout ทั้งหมด ${state.knockout.length} คู่`);
    lines.push('', '#PepsLive', '#Pepsproduction');
    return lines.join('\n');
  }

  function presenterScript(){
    const lines = [`สคริปต์ประกาศรายการ ${state.event.name}`, ''];
    if(state.lastResult) lines.push(`ผลล่าสุด: ${state.lastResult.text}`, '');
    const next = nextMatch();
    if(next) lines.push(`คู่ถัดไป: Match ${next.no} เวลา ${next.time} ${next.teamA} พบ ${next.teamB} ที่${next.court}`);
    Object.entries(state.standings).forEach(([g,rs]) => {
      if(rs[0]) lines.push(`อันดับ 1 สาย ${g}: ${rs[0].team}`);
      if(rs[1]) lines.push(`อันดับ 2 สาย ${g}: ${rs[1].team}`);
    });
    return lines.join('\n');
  }

  async function copyText(text, msg){
    try{
      await navigator.clipboard.writeText(text);
      const box = $('#copyStatus') || $('#nextAction');
      if(box){ box.className = 'notice good'; box.textContent = msg || 'คัดลอกแล้ว'; }
    }catch(err){
      prompt('คัดลอกข้อความนี้', text);
    }
  }

  function saveWebhookFromForm(){
    state.webhook.url = $('#webhookUrl').value.trim();
    state.webhook.token = $('#webhookToken').value.trim();
    state.webhook.sheetId = $('#sheetId').value.trim();
    audit('save-webhook');
    saveState('webhook');
    toast('บันทึก Webhook แล้ว', 'good');
  }

  function exportPayload(test=false){
    computeStandings(); refreshKnockoutNames();
    return {
      app: 'PepsLive Tournament Studio',
      version: APP_VERSION,
      test,
      token: state.webhook.token,
      sheetId: state.webhook.sheetId,
      exportedAt: new Date().toISOString(),
      event: state.event,
      tables: {
        Settings: [['Key','Value'], ...Object.entries(state.event)],
        Teams: [['Team'], ...state.teams.map(t => [t])],
        Draw_Result: rows('draw'),
        Schedule: rows('schedule'),
        Scores: rows('scores'),
        Standings: rows('standings'),
        Knockout: rows('knockout'),
        Export_Log: [['At','Action','Version'], [new Date().toISOString(), test ? 'Test' : 'Export', APP_VERSION]]
      },
      state
    };
  }

  async function sendWebhook(test=false){
    saveWebhookFromForm();
    const url = state.webhook.url;
    if(!url){ setSheetStatus('ยังไม่ได้ใส่ Apps Script Webhook URL', 'bad'); return; }
    setSheetStatus('กำลังส่งข้อมูลไป Google Sheet...', 'warn');
    try{
      await fetch(url, { method:'POST', mode:'no-cors', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body:JSON.stringify(exportPayload(test)) });
      setSheetStatus('ส่งข้อมูลแล้ว ถ้า Apps Script ตั้งค่าถูกต้อง ข้อมูลจะเข้า Google Sheet', 'good');
    }catch(err){
      setSheetStatus('ส่งไม่สำเร็จ: ' + err.message, 'bad');
    }
  }

  function setSheetStatus(text, type){
    const el = $('#sheetStatus');
    el.className = 'notice ' + type;
    el.textContent = text;
  }

  function downloadJson(){
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeFile(state.event.name || 'pepslive') + '_pepslive_tournament_studio_backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadJson(e){
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try{
        state = merge(defaultState(), JSON.parse(r.result));
        saveState('load-json');
        fillForms();
        toast('โหลด JSON Backup แล้ว', 'good');
      }catch(err){ toast('ไฟล์ JSON ไม่ถูกต้อง', 'bad'); }
    };
    r.readAsText(f);
  }

  function resetAll(){
    if(!confirm('Reset โปรเจกต์ทั้งหมด? ข้อมูลเดิมจะถูกล้างจาก browser นี้')) return;
    state = defaultState();
    localStorage.removeItem(STORAGE_KEY);
    saveState('reset');
    fillForms();
  }

  function renderSource(view){
    $('#app')?.classList.add('hidden');
    const root = $('#sourceRoot');
    root.classList.remove('hidden');
    let lastSig = '';
    const sig = () => {
      const dl = state.drawLive || {};
      const sl = state.scheduleLive || {};
      return JSON.stringify({
        view,
        bg:state.settings.sourceBg,
        font:state.settings.fontScale,
        last:state.lastResult?.text,
        drawPhase:dl.phase,
        drawWaiting:dl.waiting,
        drawProgress:dl.progress,
        drawTotal:dl.total,
        drawItem:dl.current || dl.pendingItem,
        scheduleWaiting:sl.waiting,
        scheduleTotal:sl.total,
        scheduleMatches:state.matches.length,
        pendingSchedule:(state.pendingSchedule || []).length,
        groups:Object.keys(state.groups || {}).length,
        standings:Object.keys(state.standings || {}).length,
        knockout:state.knockout.length
      });
    };
    const draw = (force=false) => {
      state = loadState();
      computeStandings(); refreshKnockoutNames();
      const nextSig = sig();
      if(!force && nextSig === lastSig){
        updateDrawCountdownUI(root);
        updateScheduleCountdownUI(root);
        return;
      }
      lastSig = nextSig;
      const bg = state.settings.sourceBg || 'dark';
      root.className = 'srcbody ' + bg;
      root.style.fontSize = `${16 * (state.settings.fontScale || 1)}px`;
      root.innerHTML = sourceHtml(view);
      updateDrawCountdownUI(root);
      updateScheduleCountdownUI(root);
    };
    draw(true);
    setInterval(() => draw(false), 300);
  }

  function sourceHtml(view){
    if(view === 'lower-third') return `<div class="src-lower">${esc(state.lastResult?.text || state.event.name)}</div>`;
    if(view === 'next-match'){
      const m = nextMatch();
      return `<div class="src-card"><h1 class="src-title">Next Match</h1><p class="src-sub">${esc(state.event.name)}</p><div class="src-next">${m ? `Match ${m.no} · ${esc(m.time)} · ${esc(m.court)}<br>${esc(m.teamA)} vs ${esc(m.teamB)}` : 'ยังไม่มีคู่ถัดไป'}</div></div>`;
    }
    if(view === 'latest-result'){
      const lr = lastFinishedResult();
      return `<div class="src-card"><h1 class="src-title">Latest Result</h1><p class="src-sub">${esc(state.event.name)}</p><div class="src-result">${esc(lr?.text || 'ยังไม่มีผลล่าสุด')}</div></div>`;
    }
    let title = 'PepsLive Source', body = '';
    if(['wheel','slot','card','lottery'].includes(view)){
      title = ({wheel:'Wheel Spin', slot:'Slot Reveal', card:'Card Draw', lottery:'Lottery Ball'})[view];
      const live = state.drawLive || {};
      const item = live.current || { order:0, group:'?', slot:'?', team: state.lastResult?.text || 'READY' };
      body = `<div class="src-draw-stage">${drawStageHtml()}</div>`;
    }else if(view === 'winner'){
      title = 'Winner Graphic';
      if(state.drawLive?.current) body = `<div class="src-draw-stage">${drawStageHtml()}</div>`;
      else body = `<div class="src-result">${esc(state.lastResult?.text || 'รอผลล่าสุด')}</div>`;
    }else if(view === 'groups'){
      title = 'Groups Table'; body = renderGroupCards(state.groups);
    }else if(view === 'schedule'){
      title = 'Schedule Table'; body = state.scheduleLive?.waiting ? scheduleSuspenseHtml() : sourceTable(rows('schedule'));
    }else if(view === 'standings'){
      title = 'Standings Table'; body = sourceTable(rows('standings'));
    }else if(view === 'knockout'){
      title = 'Knockout Bracket'; body = sourceTable(rows('knockout'));
    }else{
      body = '<div class="empty">ไม่พบ Source View</div>';
    }
    return `<div class="src-card"><h1 class="src-title">${esc(title)}</h1><p class="src-sub">${esc(state.event.name)}</p>${body}</div>`;
  }

  function sourceTable(data){
    if(!data || data.length < 2) return '<div class="empty">ยังไม่มีข้อมูล</div>';
    const [head, ...body] = data;
    return `<div class="tablewrap"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function sourceUrl(id){
    const url = new URL(location.href);
    url.search = '?view=' + encodeURIComponent(id);
    return url.href;
  }

  function baseUrl(){
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    return u.href;
  }

  function openUrl(url){ window.open(url, '_blank'); }

  function roundRobinPairs(teams){
    const list = [...teams];
    if(list.length % 2) list.push('BYE');
    const n = list.length;
    const rounds = n - 1;
    const half = n / 2;
    const arr = [...list];
    const pairs = [];
    for(let r=0; r<rounds; r++){
      for(let i=0; i<half; i++){
        const a = arr[i], b = arr[n-1-i];
        if(a !== 'BYE' && b !== 'BYE') pairs.push(r % 2 ? [b,a] : [a,b]);
      }
      arr.splice(1, 0, arr.pop());
    }
    return pairs;
  }

  function renderRestWarnings(){
    if(!state.matches.length) return '';
    const interval = state.event.matchInterval || 15;
    const minRest = interval * 2;
    const last = {};
    const warns = [];
    for(const m of state.matches){
      const tm = timeToMinutes(m.time);
      for(const t of [m.teamA, m.teamB]){
        if(!t || t === 'BYE') continue;
        if(last[t] != null && tm - last[t] < minRest) warns.push(`${t} พัก ${tm-last[t]} นาที ก่อน Match ${m.no}`);
        last[t] = tm;
      }
    }
    return warns.length ? `<div class="notice warn"><b>Rest Warning</b><br>${warns.slice(0,8).map(esc).join('<br>')}${warns.length>8?'<br>...':''}</div>` : `<div class="notice good">ไม่พบทีมพักถี่เกินไปตามเกณฑ์ ${minRest} นาที</div>`;
  }

  function nextMatch(){
    return state.matches.find(m => !['Finished','Bye','Forfeit A','Forfeit B'].includes(m.status));
  }

  function lastFinishedResult(){
    const ko = [...state.knockout].reverse().find(m => m.status === 'Finished' && m.winner);
    if(ko) return { type:'knockout', at:new Date().toISOString(), text:`${ko.label}: ${ko.teamA} ${ko.scoreA || 0} - ${ko.scoreB || 0} ${ko.teamB} · Winner ${ko.winner}` };
    const m = [...state.matches].reverse().find(x => ['Finished','Forfeit A','Forfeit B'].includes(x.status) && (x.winner || computeWinner(x)));
    if(m) return { type:'match', at:new Date().toISOString(), text:`Match ${m.no}: ${m.teamA} ${m.scoreA || 0} - ${m.scoreB || 0} ${m.teamB} · ${m.winner || computeWinner(m)}` };
    return state.lastResult;
  }

  function finishedMatches(){ return state.matches.filter(m => ['Finished','Bye','Forfeit A','Forfeit B'].includes(m.status)).length; }
  function countBye(){ return Object.values(state.groups).flat().filter(t => t === 'BYE').length; }

  function findDuplicates(items){
    const seen = new Map(), dup = [];
    for(const item of items){
      const key = normalizeName(item);
      if(seen.has(key)) dup.push(item);
      else seen.set(key, item);
    }
    return dup;
  }

  function findSimilar(items){
    const out = [];
    for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++){
      const a=normalizeName(items[i]), b=normalizeName(items[j]);
      if(a !== b && Math.abs(a.length-b.length)<=2 && levenshtein(a,b)<=2) out.push([items[i], items[j]]);
    }
    return out.slice(0,10);
  }

  function levenshtein(a,b){
    const dp = Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++) dp[i][0]=i;
    for(let j=0;j<=b.length;j++) dp[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return dp[a.length][b.length];
  }

  function normalizeName(s){ return String(s||'').toLowerCase().replace(/[\s\-_\.]+/g,'').trim(); }
  function letters(n){ return Array.from({length:n}, (_,i) => { let x=i, s=''; do{ s=String.fromCharCode(65 + (x%26)) + s; x=Math.floor(x/26)-1; }while(x>=0); return s; }); }
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
  function timeToMinutes(t){ const [h,m] = String(t||'00:00').split(':').map(Number); return (h||0)*60+(m||0); }
  function minutesToTime(min){ min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min/60)).padStart(2,'0') + ':' + String(min%60).padStart(2,'0'); }
  function clampInt(v,min,max){ const n = parseInt(v,10); return Math.min(max, Math.max(min, Number.isFinite(n)?n:min)); }
  function uid(p='ID'){ return p + '_' + Math.random().toString(36).slice(2,9); }
  function tsv(rows){ return rows.map(r => r.map(c => String(c ?? '').replace(/\t/g,' ').replace(/\n/g,' ')).join('\t')).join('\n'); }
  function safeFile(s){ return String(s).replace(/[^a-z0-9ก-๙]+/gi,'_').replace(/^_+|_+$/g,'') || 'pepslive'; }
  function structuredCloneSafe(o){ return JSON.parse(JSON.stringify(o)); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function toast(text, type=''){ const el = $('#nextAction') || $('#copyStatus'); if(el){ el.className = 'notice ' + type; el.textContent = text; } }

  init();
})();
