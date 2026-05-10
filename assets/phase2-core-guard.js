/* Phase 2: PepsLive Tournament Studio Core Guard
   Lightweight workflow guard loaded after assets/app.js.
   Scope: Tournament Studio only. No OBS WebSocket, no live-control features.
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function cleanText(v) { return String(v || '').trim(); }
  function isBye(name) { return cleanText(name).toUpperCase() === 'BYE'; }
  function realTeams(state) {
    return Array.isArray(state.teams) ? state.teams.filter((t) => cleanText(t) && !isBye(t)) : [];
  }
  function realGroupTeams(state) {
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    return Object.values(groups).flat().filter((t) => cleanText(t) && !isBye(t));
  }
  function realMatches(state) {
    const matches = Array.isArray(state.matches) ? state.matches : [];
    return matches.filter((m) => !isBye(m.teamA) && !isBye(m.teamB));
  }
  function doneMatches(state) {
    return realMatches(state).filter((m) => String(m.status || '').toLowerCase() === 'done');
  }

  function loadAddonAssets(cssPath, jsPath) {
    if (cssPath && !document.querySelector(`link[href="${cssPath}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssPath;
      document.head.appendChild(link);
    }
    if (jsPath && !document.querySelector(`script[src="${jsPath}"]`)) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = jsPath;
      document.body.appendChild(script);
    }
  }

  function loadPhaseAddons() {
    loadAddonAssets('assets/phase3-teams-draw.css', 'assets/phase3-teams-draw.js');
    loadAddonAssets('assets/phase4-schedule.css', 'assets/phase4-schedule.js');
    loadAddonAssets('assets/phase5-scores.css', 'assets/phase5-scores.js');
    loadAddonAssets('assets/phase55-google-sheet.css', 'assets/phase55-google-sheet.js');
    loadAddonAssets('assets/prephase6-knockout-source-fix.css', 'assets/prephase6-knockout-source-fix.js');
    loadAddonAssets('', 'assets/prephase6-knockout-generate-fix.js');
  }

  function getChecks() {
    const state = readState();
    const teamCount = realTeams(state).length;
    const confirmedTeamCount = realGroupTeams(state).length;
    const matchCount = realMatches(state).length;
    const doneCount = doneMatches(state).length;
    const standingsCount = state.standings && typeof state.standings === 'object' ? Object.keys(state.standings).length : 0;
    return {
      setup: !!(state.event && cleanText(state.event.name) && Number(state.event.groupCount || 0) > 0),
      teams: teamCount > 0,
      drawConfirmed: confirmedTeamCount > 0,
      schedule: matchCount > 0,
      scoresComplete: matchCount > 0 && doneCount >= matchCount,
      standings: standingsCount > 0,
      teamCount,
      confirmedTeamCount,
      matchCount,
      doneCount
    };
  }

  function currentStep(c) {
    if (!c.setup) return ['Setup', 'ไปที่ Setup แล้วกดบันทึก Setup'];
    if (!c.teams) return ['Teams', 'ใส่รายชื่อทีม แล้วกดบันทึกรายชื่อ'];
    if (!c.drawConfirmed) return ['Draw', 'สุ่มสาย แล้วกด Confirm Result'];
    if (!c.schedule) return ['Schedule', 'กด Generate Schedule'];
    if (!c.scoresComplete) return ['Scores', `กรอกผลและบันทึกคะแนน (${c.doneCount}/${c.matchCount})`];
    if (!c.standings) return ['Standings', 'กดบันทึกคะแนนเพื่อคำนวณ Standings'];
    return ['Knockout', 'พร้อม Generate Knockout'];
  }

  function setButton(id, locked, message) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !!locked;
    btn.classList.toggle('phase2-disabled', !!locked);
    btn.title = locked ? message : '';
  }

  function applyLocks(c) {
    setButton('startDraw', !c.teams, 'ต้องบันทึกรายชื่อทีมก่อน');
    setButton('nextReveal', !c.teams, 'ต้องบันทึกรายชื่อทีมก่อน');
    setButton('confirmDraw', !c.teams, 'ต้องบันทึกรายชื่อทีมก่อน');
    setButton('generateSchedule', !c.drawConfirmed, 'ต้อง Confirm Draw ก่อน');
    setButton('rebalanceSchedule', !c.drawConfirmed, 'ต้อง Confirm Draw ก่อน');
    setButton('saveScores', !c.schedule, 'ต้อง Generate Schedule ก่อน');
    setButton('markAllPending', !c.schedule, 'ต้อง Generate Schedule ก่อน');
    setButton('generateKnockout', !c.scoresComplete && !c.standings, `ต้องบันทึกคะแนนให้ครบหรือมี Standings ก่อน (${c.doneCount}/${c.matchCount || 0})`);
  }

  function row(name, ok, detail) {
    return `<div class="phase2-guard-item ${ok ? 'done' : 'locked'}"><b>${name}</b><span>${detail}</span></div>`;
  }

  function renderDashboard(c) {
    const panel = $('[data-panel="dashboard"]');
    if (!panel) return;
    let box = $('#phase2GuardBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'phase2GuardBox';
      box.className = 'phase2-guard-box';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    const [step, detail] = currentStep(c);
    const allGood = c.setup && c.teams && c.drawConfirmed && c.schedule && c.scoresComplete && c.standings;
    box.classList.toggle('good', allGood);
    box.innerHTML = `
      <div class="phase2-guard-title">Phase 2 Guard · ${allGood ? 'Core Flow พร้อมแล้ว' : 'ขั้นต่อไป: ' + step}</div>
      <div class="phase2-guard-text">${allGood ? 'สามารถ Export หรือเปิด Live Sources แบบเบาได้' : detail}</div>
      <div class="phase2-guard-list">
        ${row('Setup', c.setup, c.setup ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้บันทึก Setup')}
        ${row('Teams', c.teams, c.teams ? c.teamCount + ' ทีม' : 'ยังไม่มีทีม')}
        ${row('Draw', c.drawConfirmed, c.drawConfirmed ? 'Confirm แล้ว ' + c.confirmedTeamCount + ' ทีม' : 'ยังไม่ Confirm')}
        ${row('Schedule', c.schedule, c.schedule ? c.matchCount + ' คู่' : 'ยังไม่มีตารางแข่ง')}
        ${row('Scores', c.scoresComplete, c.matchCount ? c.doneCount + '/' + c.matchCount + ' คู่' : 'ยังไม่มีคะแนน')}
        ${row('Standings', c.standings, c.standings ? 'มีตารางคะแนนแล้ว' : 'ยังไม่มี Standings')}
      </div>
      <div class="phase2-lock-note">ปุ่มที่ยังไม่ถึงขั้นจะถูกปิดไว้ เพื่อกันข้อมูลข้ามขั้นหรือค้างจากรอบก่อน</div>
    `;
  }

  function hintFor(panelName, message) {
    const panel = $(`[data-panel="${panelName}"]`);
    if (!panel) return;
    let box = panel.querySelector('.phase2-panel-hint');
    if (!message) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement('div');
      box.className = 'notice warn phase2-panel-hint';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    box.textContent = message;
  }

  function renderHints(c) {
    hintFor('draw', c.teams ? '' : 'ต้องบันทึก Teams ก่อน จึงจะสุ่มสายได้');
    hintFor('schedule', c.drawConfirmed ? '' : 'ต้อง Confirm Draw ก่อน จึงจะสร้าง Schedule ได้');
    hintFor('scores', c.schedule ? '' : 'ต้อง Generate Schedule ก่อน จึงจะบันทึกคะแนนได้');
    hintFor('knockout', (c.scoresComplete || c.standings) ? '' : `ต้องบันทึกคะแนนให้ครบหรือมี Standings ก่อน จึงจะสร้าง Knockout ได้ (${c.doneCount}/${c.matchCount || 0})`);
  }

  function refresh() {
    const c = getChecks();
    applyLocks(c);
    renderDashboard(c);
    renderHints(c);
  }

  function install() {
    loadPhaseAddons();
    refresh();
    window.setInterval(refresh, 1200);
    document.addEventListener('click', () => window.setTimeout(refresh, 120));
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
