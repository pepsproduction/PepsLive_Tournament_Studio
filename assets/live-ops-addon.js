/* PepsLive Tournament Studio - Live Ops Add-on V1
   Adds OBS WebSocket controls, score graphic source, tag map helper,
   logo source fields, score-trigger lock, and Google Sheet result push.
*/
(() => {
  'use strict';

  const CORE_STATE_KEY = 'pepsliveTournamentControlV2';
  const ADDON_KEY = 'pepsliveLiveOpsAddonV1';
  const GRAPHIC_TRIGGER_KEY = 'pepsliveScoreGraphicTriggerV1';
  const ADDON_VERSION = 'Live-Ops-1.0.0';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
  const safeNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const DEFAULT_ADDON = {
    version: ADDON_VERSION,
    selectedMatchIndex: 0,
    scoreGraphicDurationMs: 2800,
    scoreTriggerLockMs: 900,
    lastScoreTriggerAt: 0,
    obs: {
      url: 'ws://127.0.0.1:4455',
      password: '',
      sceneName: '',
      scoreGraphicSource: 'PEPS_ScoreGraphic',
      browserScoreGraphicSource: 'PEPS_ScoreGraphic_URL',
      logoAPath: '',
      logoBPath: '',
      tagSources: {
        eventName: 'PEPS_EventName',
        matchName: 'PEPS_MatchName',
        teamA: 'PEPS_TeamA',
        teamB: 'PEPS_TeamB',
        scoreA: 'PEPS_ScoreA',
        scoreB: 'PEPS_ScoreB',
        latestResult: 'PEPS_LatestResult',
        nextMatch: 'PEPS_NextMatch',
        court: 'PEPS_Court',
        round: 'PEPS_Round',
        logoA: 'PEPS_LogoA',
        logoB: 'PEPS_LogoB'
      }
    }
  };

  const OBS_INPUT_TEXT_KEYS = ['text'];
  const OBS_INPUT_IMAGE_KEYS = ['file'];
  let addon = loadAddon();
  let obsClient = null;
  let obsConnected = false;
  let renderTimer = null;
  let sourceTimer = null;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function deepMerge(base, incoming) {
    if (!incoming || typeof incoming !== 'object') return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    Object.entries(incoming).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = deepMerge(out[key], value);
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  function loadAddon() {
    const saved = readJson(ADDON_KEY, null);
    return deepMerge(DEFAULT_ADDON, saved || {});
  }

  function saveAddon() {
    addon.version = ADDON_VERSION;
    writeJson(ADDON_KEY, addon);
  }

  function coreState() {
    return readJson(CORE_STATE_KEY, {}) || {};
  }

  function writeCoreState(next) {
    next.updatedAt = new Date().toISOString();
    writeJson(CORE_STATE_KEY, next);
    window.dispatchEvent(new CustomEvent('pepslive-addon-state-updated', { detail: next }));
  }

  function currentPageUrl(view) {
    const base = location.href.split('?')[0].split('#')[0];
    return `${base}?view=${encodeURIComponent(view)}`;
  }

  function pick(obj, keys, fallback = '') {
    if (!obj) return fallback;
    for (const key of keys) {
      const value = key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function matchTeamA(match) {
    return pick(match, ['teamA', 'homeTeam', 'home', 'a', 'team1', 'teams.0'], 'Team A');
  }

  function matchTeamB(match) {
    return pick(match, ['teamB', 'awayTeam', 'away', 'b', 'team2', 'teams.1'], 'Team B');
  }

  function matchScoreA(match) {
    return pick(match, ['scoreA', 'homeScore', 'aScore', 'score1'], 0);
  }

  function matchScoreB(match) {
    return pick(match, ['scoreB', 'awayScore', 'bScore', 'score2'], 0);
  }

  function matchLabel(match, index) {
    const group = pick(match, ['group', 'round'], '');
    const time = pick(match, ['time', 'startTime'], '');
    const court = pick(match, ['court', 'field'], '');
    const prefix = [group && `สาย/รอบ ${group}`, time, court && `สนาม ${court}`].filter(Boolean).join(' · ');
    return `${index + 1}. ${prefix ? `${prefix} · ` : ''}${matchTeamA(match)} vs ${matchTeamB(match)}`;
  }

  function getMatches(state = coreState()) {
    return Array.isArray(state.matches) ? state.matches : [];
  }

  function selectedMatch() {
    const matches = getMatches();
    const index = Math.max(0, Math.min(matches.length - 1, safeNumber(addon.selectedMatchIndex, 0)));
    return { match: matches[index] || null, index };
  }

  function lastResultFromState() {
    const state = coreState();
    if (state.lastResult) return normalizeResult(state.lastResult);
    const done = getMatches(state).slice().reverse().find((m) => String(pick(m, ['status'], '')).toLowerCase() !== 'pending' && (m.scoreA !== undefined || m.scoreB !== undefined));
    if (done) return normalizeResult(done);
    const selected = selectedMatch().match;
    return selected ? normalizeResult(selected) : null;
  }

  function normalizeResult(matchLike) {
    if (!matchLike) return null;
    const teamA = matchTeamA(matchLike);
    const teamB = matchTeamB(matchLike);
    const scoreA = safeNumber(matchScoreA(matchLike), 0);
    const scoreB = safeNumber(matchScoreB(matchLike), 0);
    const court = pick(matchLike, ['court', 'field'], '');
    const time = pick(matchLike, ['time', 'startTime'], '');
    const group = pick(matchLike, ['group', 'round'], '');
    const eventName = pick(coreState(), ['event.name'], 'PepsLive Tournament');
    return {
      teamA, teamB, scoreA, scoreB, court, time, group, eventName,
      matchName: `${teamA} vs ${teamB}`,
      latestResult: `${teamA} ${scoreA} - ${scoreB} ${teamB}`,
      updatedAt: new Date().toISOString()
    };
  }

  function nextMatchText() {
    const state = coreState();
    const pending = getMatches(state).find((m) => String(pick(m, ['status'], 'Pending')).toLowerCase() === 'pending');
    if (!pending) return 'ยังไม่มีคู่ถัดไป';
    return `${matchTeamA(pending)} vs ${matchTeamB(pending)}`;
  }

  function buildTagPayload(result = lastResultFromState()) {
    const state = coreState();
    const eventName = pick(state, ['event.name'], 'PepsLive Tournament');
    const r = result || {
      teamA: 'Team A', teamB: 'Team B', scoreA: 0, scoreB: 0,
      matchName: 'Team A vs Team B', latestResult: 'Team A 0 - 0 Team B', court: '', group: ''
    };
    return {
      eventName,
      matchName: r.matchName || `${r.teamA} vs ${r.teamB}`,
      teamA: r.teamA || 'Team A',
      teamB: r.teamB || 'Team B',
      scoreA: String(r.scoreA ?? 0),
      scoreB: String(r.scoreB ?? 0),
      latestResult: r.latestResult || `${r.teamA} ${r.scoreA ?? 0} - ${r.scoreB ?? 0} ${r.teamB}`,
      nextMatch: nextMatchText(),
      court: r.court || '',
      round: r.group || ''
    };
  }

  function init() {
    const view = new URLSearchParams(location.search).get('view');
    if (view === 'score-graphic') {
      renderScoreGraphicSource();
      return;
    }

    document.addEventListener('DOMContentLoaded', () => {
      injectLiveOpsPanel();
      injectSourceCard();
      bindAddonEvents();
      renderAddonPanel();
      renderTimer = window.setInterval(renderAddonPanel, 1200);
    });
  }

  function injectLiveOpsPanel() {
    if ($('#liveOpsAddon')) return;
    const dashboard = $('[data-panel="dashboard"]');
    const scores = $('[data-panel="scores"]');
    const settings = $('[data-panel="settings"]');
    const html = liveOpsHtml();
    if (dashboard) dashboard.insertAdjacentHTML('beforeend', html);
    if (scores && !$('#liveOpsScoreDock')) {
      scores.insertAdjacentHTML('afterbegin', `<div id="liveOpsScoreDock" class="pl-addon-score-dock"></div>`);
    }
    if (settings && !$('#liveOpsSettingsHelp')) {
      settings.insertAdjacentHTML('beforeend', settingsHelpHtml());
    }
  }

  function liveOpsHtml() {
    return `
      <section class="pl-addon-card" id="liveOpsAddon">
        <div class="pl-addon-head">
          <div>
            <h3>Live Ops Bridge</h3>
            <p>ตัวเสริมสำหรับ OBS WebSocket, Score Graphic, Tag Map และ Google Sheet Result</p>
          </div>
          <span class="pl-addon-status" id="plObsStatus">OBS: Offline</span>
        </div>

        <div class="pl-addon-grid three">
          <label>OBS WebSocket URL
            <input id="plObsUrl" value="${esc(addon.obs.url)}" placeholder="ws://127.0.0.1:4455" />
          </label>
          <label>OBS Password
            <input id="plObsPassword" type="password" value="${esc(addon.obs.password)}" placeholder="เว้นว่างได้ถ้า OBS ไม่ตั้งรหัส" />
          </label>
          <label>Scene Name
            <input id="plObsScene" value="${esc(addon.obs.sceneName)}" placeholder="เช่น LIVE_MAIN" />
          </label>
        </div>

        <div class="pl-addon-grid three compact-top">
          <label>Score Graphic Source
            <input id="plScoreGraphicSource" value="${esc(addon.obs.scoreGraphicSource)}" />
          </label>
          <label>Graphic Duration
            <input id="plScoreGraphicDuration" type="number" min="800" step="100" value="${esc(addon.scoreGraphicDurationMs)}" />
          </label>
          <label>Trigger Lock
            <input id="plScoreTriggerLock" type="number" min="300" step="100" value="${esc(addon.scoreTriggerLockMs)}" />
          </label>
        </div>

        <div class="pl-addon-actions">
          <button class="btn primary" id="plConnectObs" type="button">Connect OBS</button>
          <button class="btn" id="plSaveAddon" type="button">Save Bridge</button>
          <button class="btn good" id="plPushTags" type="button">Push Tags to OBS</button>
          <button class="btn warn" id="plTriggerGraphic" type="button">Trigger Score Graphic</button>
          <button class="btn" id="plSendSheetResult" type="button">Send Result to Sheet</button>
        </div>

        <div class="pl-addon-split">
          <div>
            <h4>Quick Match Control</h4>
            <div id="plMatchControl"></div>
          </div>
          <div>
            <h4>OBS Tag Map</h4>
            <div id="plTagMap"></div>
          </div>
        </div>

        <div class="pl-addon-note" id="plAddonLog">พร้อมใช้งาน</div>
      </section>
    `;
  }

  function settingsHelpHtml() {
    return `
      <section class="pl-addon-card" id="liveOpsSettingsHelp">
        <h3>OBS Source Setup Checklist</h3>
        <div class="pl-addon-checklist">
          <div><b>Text GDI+</b><span>สร้าง Source ชื่อตาม Tag Map เช่น PEPS_TeamA, PEPS_ScoreA, PEPS_LatestResult</span></div>
          <div><b>Image Source</b><span>สร้าง PEPS_LogoA และ PEPS_LogoB สำหรับโลโก้ทีม</span></div>
          <div><b>Browser Source</b><span>เพิ่ม URL: <code>${esc(currentPageUrl('score-graphic'))}</code></span></div>
          <div><b>Media Source</b><span>ถ้าใช้ไฟล์ MOV/WEBM เป็น Score Graphic ให้ตั้งชื่อ Source เป็น PEPS_ScoreGraphic</span></div>
        </div>
      </section>
    `;
  }

  function injectSourceCard() {
    const box = $('#sourceCards');
    if (!box || $('#plScoreGraphicSourceCard')) return;
    box.insertAdjacentHTML('afterbegin', `
      <div class="source-card pl-addon-source-card" id="plScoreGraphicSourceCard">
        <h3>Score Graphic</h3>
        <p>Browser Source สำหรับเอฟเฟกต์ขึ้นคะแนน ใช้คู่กับปุ่ม Trigger Score Graphic</p>
        <div class="codebox">${esc(currentPageUrl('score-graphic'))}</div>
        <div class="row">
          <button class="btn primary" type="button" id="plCopyScoreGraphicUrl">Copy URL</button>
          <button class="btn" type="button" id="plOpenScoreGraphicUrl">Open Preview</button>
        </div>
      </div>
    `);
  }

  function bindAddonEvents() {
    document.addEventListener('input', (event) => {
      const id = event.target?.id;
      if (!id || !id.startsWith('pl')) return;
      updateAddonFromInputs(false);
    });

    document.addEventListener('click', async (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      switch (target.id) {
        case 'plConnectObs':
          updateAddonFromInputs(true);
          await connectObs();
          break;
        case 'plSaveAddon':
          updateAddonFromInputs(true);
          log('บันทึก Live Ops Bridge แล้ว', 'good');
          break;
        case 'plPushTags':
          updateAddonFromInputs(true);
          await pushTagsToObs();
          break;
        case 'plTriggerGraphic':
          updateAddonFromInputs(true);
          await triggerScoreGraphic();
          break;
        case 'plSendSheetResult':
          updateAddonFromInputs(true);
          await sendResultToSheet();
          break;
        case 'plCopyScoreGraphicUrl':
          await copyText(currentPageUrl('score-graphic'));
          log('คัดลอก Score Graphic URL แล้ว', 'good');
          break;
        case 'plOpenScoreGraphicUrl':
          window.open(currentPageUrl('score-graphic') + '&always=1', '_blank');
          break;
        case 'plApplyQuickScore':
          applyQuickScore();
          break;
        default:
          break;
      }
    }, true);

    document.addEventListener('change', (event) => {
      if (event.target?.id === 'plMatchSelect') {
        addon.selectedMatchIndex = safeNumber(event.target.value, 0);
        saveAddon();
        renderAddonPanel();
      }
    });
  }

  function updateAddonFromInputs(save = true) {
    const get = (id) => $(`#${id}`)?.value ?? '';
    addon.obs.url = get('plObsUrl') || addon.obs.url;
    addon.obs.password = get('plObsPassword');
    addon.obs.sceneName = get('plObsScene');
    addon.obs.scoreGraphicSource = get('plScoreGraphicSource') || 'PEPS_ScoreGraphic';
    addon.scoreGraphicDurationMs = Math.max(800, safeNumber(get('plScoreGraphicDuration'), 2800));
    addon.scoreTriggerLockMs = Math.max(300, safeNumber(get('plScoreTriggerLock'), 900));
    Object.keys(addon.obs.tagSources).forEach((key) => {
      const input = $(`#plTag_${key}`);
      if (input) addon.obs.tagSources[key] = input.value.trim();
    });
    if (save) saveAddon();
  }

  function renderAddonPanel() {
    if (!$('#liveOpsAddon')) return;
    renderMatchControl();
    renderTagMap();
    renderScoreDock();
    const status = $('#plObsStatus');
    if (status) {
      status.textContent = obsConnected ? 'OBS: Connected' : 'OBS: Offline';
      status.classList.toggle('good', obsConnected);
    }
  }

  function renderMatchControl() {
    const host = $('#plMatchControl');
    if (!host) return;
    const matches = getMatches();
    const { match, index } = selectedMatch();
    const result = normalizeResult(match) || lastResultFromState();
    const options = matches.length
      ? matches.map((m, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${esc(matchLabel(m, i))}</option>`).join('')
      : '<option value="0">ยังไม่มีตารางแข่ง</option>';
    host.innerHTML = `
      <label>เลือกคู่แข่ง
        <select id="plMatchSelect">${options}</select>
      </label>
      <div class="pl-addon-grid two compact-top">
        <label>Score A<input id="plQuickScoreA" type="number" value="${esc(result?.scoreA ?? 0)}" /></label>
        <label>Score B<input id="plQuickScoreB" type="number" value="${esc(result?.scoreB ?? 0)}" /></label>
      </div>
      <div class="pl-addon-actions compact-top">
        <button class="btn good" type="button" id="plApplyQuickScore">Set Latest Result</button>
      </div>
      <div class="pl-addon-mini-result">${esc(result?.latestResult || 'ยังไม่มีผลล่าสุด')}</div>
    `;
  }

  function renderScoreDock() {
    const host = $('#liveOpsScoreDock');
    if (!host) return;
    const result = lastResultFromState();
    host.innerHTML = `
      <div class="pl-addon-card mini">
        <div class="pl-addon-head">
          <div>
            <h3>Live Score Output</h3>
            <p>กดส่ง Tag หรือ Trigger Graphic ได้จากหน้านี้ โดยไม่เพิ่มระบบหนักกลับเข้าเว็บหลัก</p>
          </div>
          <span class="pl-addon-status ${obsConnected ? 'good' : ''}">${obsConnected ? 'OBS Connected' : 'OBS Offline'}</span>
        </div>
        <div class="pl-addon-bigscore">${esc(result?.teamA || 'Team A')} <b>${esc(result?.scoreA ?? 0)} - ${esc(result?.scoreB ?? 0)}</b> ${esc(result?.teamB || 'Team B')}</div>
        <div class="pl-addon-actions">
          <button class="btn good" id="plPushTags" type="button">Push Tags to OBS</button>
          <button class="btn warn" id="plTriggerGraphic" type="button">Trigger Score Graphic</button>
        </div>
      </div>
    `;
  }

  function renderTagMap() {
    const host = $('#plTagMap');
    if (!host) return;
    const labels = {
      eventName: 'Event Name', matchName: 'Match Name', teamA: 'Team A', teamB: 'Team B',
      scoreA: 'Score A', scoreB: 'Score B', latestResult: 'Latest Result', nextMatch: 'Next Match',
      court: 'Court', round: 'Round', logoA: 'Logo A Source', logoB: 'Logo B Source'
    };
    host.innerHTML = Object.keys(addon.obs.tagSources).map((key) => `
      <label>${esc(labels[key] || key)}
        <input id="plTag_${esc(key)}" value="${esc(addon.obs.tagSources[key])}" />
      </label>
    `).join('');
  }

  function applyQuickScore() {
    const state = coreState();
    const matches = getMatches(state);
    if (!matches.length) {
      log('ยังไม่มีตารางแข่งให้บันทึกผล', 'warn');
      return;
    }
    const index = Math.max(0, Math.min(matches.length - 1, safeNumber(addon.selectedMatchIndex, 0)));
    const match = matches[index];
    match.scoreA = safeNumber($('#plQuickScoreA')?.value, 0);
    match.scoreB = safeNumber($('#plQuickScoreB')?.value, 0);
    match.status = 'Done';
    state.matches = matches;
    state.lastResult = normalizeResult(match);
    writeCoreState(state);
    log('ตั้งผลล่าสุดแล้ว ถ้า UI หลักยังไม่เปลี่ยนให้รีเฟรชหน้า 1 ครั้ง', 'good');
    renderAddonPanel();
  }

  async function connectObs() {
    if (obsClient) {
      try { obsClient.close(); } catch {}
    }
    obsClient = new ObsWsClient(addon.obs.url, addon.obs.password, setObsStatus);
    try {
      await obsClient.connect();
      obsConnected = true;
      setObsStatus('เชื่อมต่อ OBS สำเร็จ', 'good');
    } catch (err) {
      obsConnected = false;
      setObsStatus(`เชื่อมต่อ OBS ไม่สำเร็จ: ${err.message}`, 'bad');
    }
    renderAddonPanel();
  }

  function setObsStatus(message, type = '') {
    log(message, type);
  }

  async function ensureObs() {
    if (obsConnected && obsClient?.ready) return obsClient;
    await connectObs();
    if (!obsConnected || !obsClient?.ready) throw new Error('OBS ยังไม่เชื่อมต่อ');
    return obsClient;
  }

  async function pushTagsToObs() {
    const payload = buildTagPayload();
    const map = addon.obs.tagSources;
    try {
      const client = await ensureObs();
      const jobs = [
        ['eventName', payload.eventName], ['matchName', payload.matchName], ['teamA', payload.teamA], ['teamB', payload.teamB],
        ['scoreA', payload.scoreA], ['scoreB', payload.scoreB], ['latestResult', payload.latestResult], ['nextMatch', payload.nextMatch],
        ['court', payload.court], ['round', payload.round]
      ];
      for (const [key, value] of jobs) {
        const source = map[key];
        if (!source) continue;
        await setObsText(client, source, value);
      }
      if (addon.obs.logoAPath && map.logoA) await setObsImage(client, map.logoA, addon.obs.logoAPath);
      if (addon.obs.logoBPath && map.logoB) await setObsImage(client, map.logoB, addon.obs.logoBPath);
      log('Push Tags ไป OBS แล้ว', 'good');
    } catch (err) {
      log(`Push Tags ไม่สำเร็จ: ${err.message}`, 'bad');
    }
  }

  function setObsText(client, inputName, text) {
    const inputSettings = {};
    OBS_INPUT_TEXT_KEYS.forEach((key) => { inputSettings[key] = String(text ?? ''); });
    return client.request('SetInputSettings', { inputName, inputSettings, overlay: true });
  }

  function setObsImage(client, inputName, file) {
    const inputSettings = {};
    OBS_INPUT_IMAGE_KEYS.forEach((key) => { inputSettings[key] = file; });
    return client.request('SetInputSettings', { inputName, inputSettings, overlay: true });
  }

  async function triggerScoreGraphic() {
    const now = Date.now();
    if (now - safeNumber(addon.lastScoreTriggerAt, 0) < addon.scoreTriggerLockMs) {
      log('กันกดซ้ำ: รอให้ Trigger Lock หมดก่อน', 'warn');
      return;
    }
    addon.lastScoreTriggerAt = now;
    saveAddon();

    const result = lastResultFromState();
    if (!result) {
      log('ยังไม่มีผลล่าสุดสำหรับ Score Graphic', 'warn');
      return;
    }

    const trigger = {
      seq: now,
      at: now,
      durationMs: addon.scoreGraphicDurationMs,
      result
    };
    writeJson(GRAPHIC_TRIGGER_KEY, trigger);
    await pushTagsToObs();
    await triggerObsSource();
    log('Trigger Score Graphic แล้ว', 'good');
  }

  async function triggerObsSource() {
    const sceneName = addon.obs.sceneName;
    const sourceName = addon.obs.scoreGraphicSource;
    if (!sourceName) return;
    try {
      const client = await ensureObs();
      try {
        await client.request('TriggerMediaInputAction', {
          inputName: sourceName,
          mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
      } catch {}
      if (sceneName) {
        const itemId = await client.getSceneItemId(sceneName, sourceName);
        if (itemId != null) {
          await client.request('SetSceneItemEnabled', { sceneName, sceneItemId: itemId, sceneItemEnabled: true });
          window.setTimeout(async () => {
            try {
              await client.request('SetSceneItemEnabled', { sceneName, sceneItemId: itemId, sceneItemEnabled: false });
            } catch {}
          }, addon.scoreGraphicDurationMs);
        }
      }
    } catch (err) {
      log(`OBS Graphic Trigger ข้ามไป: ${err.message}`, 'warn');
    }
  }

  async function sendResultToSheet() {
    const state = coreState();
    const webhook = state.webhook || {};
    if (!webhook.url) {
      log('ยังไม่ได้ตั้ง Google Sheet Webhook ในหน้า Export', 'warn');
      return;
    }
    const result = lastResultFromState();
    if (!result) {
      log('ยังไม่มีผลล่าสุดสำหรับส่งเข้า Sheet', 'warn');
      return;
    }
    const payload = {
      action: 'saveResult',
      type: 'pepslive-result',
      token: webhook.token || '',
      sheetId: webhook.sheetId || '',
      result,
      event: state.event || {},
      updatedAt: new Date().toISOString()
    };
    try {
      await fetch(webhook.url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      log('ส่งผลล่าสุดเข้า Google Sheet Webhook แล้ว', 'good');
    } catch (err) {
      log(`ส่ง Sheet ไม่สำเร็จ: ${err.message}`, 'bad');
    }
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  function log(message, type = '') {
    const box = $('#plAddonLog');
    if (box) {
      box.textContent = message;
      box.className = `pl-addon-note ${type || ''}`.trim();
    }
    const status = $('#plObsStatus');
    if (status && message.toLowerCase().includes('obs')) {
      status.textContent = obsConnected ? 'OBS: Connected' : 'OBS: Offline';
    }
  }

  function renderScoreGraphicSource() {
    document.documentElement.classList.add('pl-score-graphic-mode');
    document.body.innerHTML = `
      <main class="pl-score-source-root">
        <section class="pl-score-graphic hidden" id="plScoreGraphic">
          <div class="pl-score-kicker">PEPSLIVE SCORE</div>
          <div class="pl-score-row">
            <div class="pl-score-team" id="plSgTeamA">Team A</div>
            <div class="pl-score-number"><span id="plSgScoreA">0</span><em>-</em><span id="plSgScoreB">0</span></div>
            <div class="pl-score-team" id="plSgTeamB">Team B</div>
          </div>
          <div class="pl-score-meta" id="plSgMeta">PepsLive Tournament</div>
        </section>
      </main>
    `;
    const params = new URLSearchParams(location.search);
    const always = params.get('always') === '1';
    const paint = () => paintScoreGraphic(always);
    paint();
    sourceTimer = window.setInterval(paint, 140);
  }

  function paintScoreGraphic(always = false) {
    const trigger = readJson(GRAPHIC_TRIGGER_KEY, null);
    const latest = lastResultFromState();
    const now = Date.now();
    const active = always || (trigger && now - safeNumber(trigger.at, 0) <= safeNumber(trigger.durationMs, 2800));
    const result = normalizeResult(trigger?.result || latest);
    const box = $('#plScoreGraphic');
    if (!box || !result) return;
    $('#plSgTeamA').textContent = result.teamA;
    $('#plSgTeamB').textContent = result.teamB;
    $('#plSgScoreA').textContent = result.scoreA;
    $('#plSgScoreB').textContent = result.scoreB;
    $('#plSgMeta').textContent = [result.eventName, result.group && `รอบ/สาย ${result.group}`, result.court && `สนาม ${result.court}`].filter(Boolean).join(' · ');
    box.classList.toggle('hidden', !active);
    box.classList.toggle('active', !!active);
  }

  class ObsWsClient {
    constructor(url, password, statusFn) {
      this.url = url;
      this.password = password || '';
      this.statusFn = statusFn || (() => {});
      this.socket = null;
      this.ready = false;
      this.pending = new Map();
      this.requestSeq = 1;
    }

    connect() {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(this.url);
        this.socket = socket;
        const timeout = window.setTimeout(() => reject(new Error('timeout')), 8000);
        socket.addEventListener('open', () => this.statusFn('OBS socket opened'));
        socket.addEventListener('close', () => {
          this.ready = false;
          obsConnected = false;
          this.statusFn('OBS disconnected', 'warn');
          renderAddonPanel();
        });
        socket.addEventListener('error', () => reject(new Error('WebSocket error')));
        socket.addEventListener('message', async (event) => {
          let msg;
          try { msg = JSON.parse(event.data); } catch { return; }
          if (msg.op === 0) {
            try {
              const auth = msg.d?.authentication ? await this.buildAuth(msg.d.authentication) : undefined;
              const identify = { op: 1, d: { rpcVersion: 1 } };
              if (auth) identify.d.authentication = auth;
              socket.send(JSON.stringify(identify));
            } catch (err) {
              window.clearTimeout(timeout);
              reject(err);
            }
          }
          if (msg.op === 2) {
            window.clearTimeout(timeout);
            this.ready = true;
            resolve(true);
          }
          if (msg.op === 7) {
            const id = msg.d?.requestId;
            const pending = this.pending.get(id);
            if (!pending) return;
            this.pending.delete(id);
            if (msg.d?.requestStatus?.result) pending.resolve(msg.d?.responseData);
            else pending.reject(new Error(msg.d?.requestStatus?.comment || msg.d?.requestStatus?.code || 'OBS request failed'));
          }
        });
      });
    }

    close() {
      this.ready = false;
      this.socket?.close();
    }

    async buildAuth(authentication) {
      if (!this.password) return undefined;
      if (!crypto?.subtle) throw new Error('Browser นี้ไม่รองรับ WebCrypto สำหรับ OBS password');
      const { challenge, salt } = authentication;
      const secret = await sha256b64(this.password + salt);
      return sha256b64(secret + challenge);
    }

    request(requestType, requestData = {}) {
      if (!this.ready || this.socket?.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('OBS socket not ready'));
      }
      const requestId = `pl-${Date.now()}-${this.requestSeq++}`;
      const payload = { op: 6, d: { requestType, requestId, requestData } };
      this.socket.send(JSON.stringify(payload));
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error(`${requestType} timeout`));
        }, 6000);
        this.pending.set(requestId, {
          resolve: (data) => { window.clearTimeout(timer); resolve(data); },
          reject: (err) => { window.clearTimeout(timer); reject(err); }
        });
      });
    }

    async getSceneItemId(sceneName, sourceName) {
      const data = await this.request('GetSceneItemId', { sceneName, sourceName });
      return data?.sceneItemId ?? null;
    }
  }

  async function sha256b64(text) {
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const arr = Array.from(new Uint8Array(hash));
    return btoa(String.fromCharCode(...arr));
  }

  init();

  window.addEventListener('beforeunload', () => {
    if (renderTimer) window.clearInterval(renderTimer);
    if (sourceTimer) window.clearInterval(sourceTimer);
    try { obsClient?.close(); } catch {}
  });
})();
