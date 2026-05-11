/* Core Teams Draw: Teams & Draw Stability
   Replaces assets/phase3-teams-draw.js.
   Scope: Teams tools, duplicate checks, BYE visibility, and Draw status clarity.
*/
(() => {
  'use strict';

  if (window.__PEPSLIVE_CORE_TEAMS_DRAW_INSTALLED__) return;
  window.__PEPSLIVE_CORE_TEAMS_DRAW_INSTALLED__ = true;

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const $ = (s, root = document) => root.querySelector(s);

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function cleanText(v) { return String(v || '').trim(); }
  function isBye(v) { return cleanText(v).toUpperCase() === 'BYE'; }
  function parseTeams(text) { return String(text || '').split(/\r?\n/).map((t) => t.trim()).filter(Boolean); }
  function normalize(v) { return cleanText(v).toLowerCase().replace(/\s+/g, ' '); }
  function uniqueTeams(list) {
    const seen = new Set();
    const out = [];
    for (const team of list) {
      const key = normalize(team);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(cleanText(team));
    }
    return out;
  }
  function duplicateTeams(list) {
    const seen = new Map();
    const dup = [];
    list.forEach((team) => {
      const key = normalize(team);
      if (!key) return;
      if (seen.has(key)) dup.push(cleanText(team));
      seen.set(key, true);
    });
    return dup;
  }
  function teamStats() {
    const state = readState();
    const typed = parseTeams($('#teamText')?.value || (Array.isArray(state.teams) ? state.teams.join('\n') : ''));
    const unique = uniqueTeams(typed);
    const dup = duplicateTeams(typed);
    const groupCount = Math.max(1, Number(state.event?.groupCount || $('#groupCount')?.value || 4));
    const slots = Math.ceil(Math.max(unique.length, 1) / groupCount) * groupCount;
    const byes = Math.max(0, slots - unique.length);
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const confirmed = Object.values(groups).flat().filter((t) => cleanText(t) && !isBye(t)).length;
    return { state, typed, unique, dup, groupCount, slots, byes, confirmed };
  }
  function hasDerivedData(state = readState()) {
    return !!(
      (state.groups && Object.keys(state.groups).length) ||
      (state.pendingGroups && Object.keys(state.pendingGroups).length) ||
      (Array.isArray(state.matches) && state.matches.length) ||
      (state.standings && Object.keys(state.standings).length) ||
      (Array.isArray(state.knockout) && state.knockout.length)
    );
  }

  function showToast(message) {
    const old = $('.phase3-copy-toast');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'phase3-copy-toast';
    box.textContent = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2200);
  }
  async function copyText(text, message) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast(message || 'คัดลอกแล้ว');
    } catch {
      showToast('คัดลอกไม่สำเร็จ');
    }
  }

  function ensureTeamTools() {
    const panel = $('[data-panel="teams"]');
    if (!panel) return;
    if (!$('#phase3TeamBox')) {
      const box = document.createElement('section');
      box.id = 'phase3TeamBox';
      box.className = 'phase3-card';
      const head = panel.querySelector('.panel-head');
      if (head) head.insertAdjacentElement('afterend', box);
      else panel.prepend(box);
    }
    const row = panel.querySelector('textarea#teamText')?.parentElement?.querySelector('.row');
    if (row && !$('#phase3CopyTeams')) {
      const copy = document.createElement('button');
      copy.className = 'btn';
      copy.type = 'button';
      copy.id = 'phase3CopyTeams';
      copy.textContent = 'Copy Teams';
      const clear = document.createElement('button');
      clear.className = 'btn bad';
      clear.type = 'button';
      clear.id = 'phase3ClearTeams';
      clear.textContent = 'Clear Teams';
      row.appendChild(copy);
      row.appendChild(clear);
    }
  }

  function renderTeamBox() {
    ensureTeamTools();
    const box = $('#phase3TeamBox');
    if (!box) return;
    const s = teamStats();
    const ok = s.unique.length > 0 && s.dup.length === 0;
    box.className = `phase3-card ${ok ? 'good' : (s.dup.length ? 'bad' : 'warn')}`;
    box.innerHTML = `
      <div class="phase3-title"><span>Core Teams Draw · Team Validation</span><span>${ok ? 'พร้อมสุ่มสาย' : 'ต้องตรวจรายชื่อ'}</span></div>
      <div class="phase3-text">ระบบนับเฉพาะทีมจริง ไม่รวม BYE และแจ้งจำนวนช่องว่างก่อนสุ่มสาย</div>
      <div class="phase3-metrics">
        <div class="phase3-metric"><small>รายชื่อที่กรอก</small><b>${s.typed.length}</b></div>
        <div class="phase3-metric"><small>ทีมไม่ซ้ำ</small><b>${s.unique.length}</b></div>
        <div class="phase3-metric"><small>จำนวนสาย</small><b>${s.groupCount}</b></div>
        <div class="phase3-metric"><small>BYE โดยประมาณ</small><b>${s.byes}</b></div>
      </div>
      <div class="phase3-list">
        ${s.unique.length ? '<div class="phase3-item good">มีรายชื่อทีมพร้อมใช้งาน</div>' : '<div class="phase3-item warn">ยังไม่มีรายชื่อทีม</div>'}
        ${s.dup.length ? `<div class="phase3-item bad">พบชื่อซ้ำ: ${s.dup.map(escapeHtml).join(', ')}</div>` : '<div class="phase3-item good">ไม่พบชื่อซ้ำ</div>'}
        ${s.byes ? `<div class="phase3-item warn">ระบบจะเติม BYE ${s.byes} ช่องเพื่อให้ครบสาย</div>` : '<div class="phase3-item good">จำนวนทีมลงสายได้พอดี ไม่มี BYE</div>'}
        ${hasDerivedData(s.state) ? '<div class="phase3-item warn">มีข้อมูล Draw/Schedule/Scores เดิมอยู่ ถ้า Save Teams ใหม่ ข้อมูลเดิมจะถูกรีเซ็ต</div>' : '<div class="phase3-item good">ยังไม่มีข้อมูลรอบแข่งเดิมค้างอยู่</div>'}
      </div>
    `;
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function ensureDrawStatus() {
    const panel = $('[data-panel="draw"]');
    if (!panel) return;
    if (!$('#phase3DrawBox')) {
      const box = document.createElement('section');
      box.id = 'phase3DrawBox';
      box.className = 'phase3-card phase3-draw-status';
      const pending = $('#pendingBox', panel);
      if (pending) pending.insertAdjacentElement('afterend', box);
      else panel.appendChild(box);
    }
  }

  function renderDrawBox() {
    ensureDrawStatus();
    const box = $('#phase3DrawBox');
    if (!box) return;
    const state = readState();
    const groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
    const pendingGroups = state.pendingGroups && typeof state.pendingGroups === 'object' ? state.pendingGroups : null;
    const confirmed = Object.values(groups).flat().filter((t) => cleanText(t) && !isBye(t)).length;
    const pending = pendingGroups ? Object.values(pendingGroups).flat().filter((t) => cleanText(t) && !isBye(t)).length : 0;
    const history = Array.isArray(state.drawHistory) ? state.drawHistory.length : 0;
    const byes = Object.values(groups).flat().filter(isBye).length || (pendingGroups ? Object.values(pendingGroups).flat().filter(isBye).length : 0);
    const ok = confirmed > 0;
    box.className = `phase3-card phase3-draw-status ${ok ? 'good' : (pending ? 'warn' : '')}`;
    box.innerHTML = `
      <div class="phase3-title"><span>Core Teams Draw · Draw Status</span><span>${ok ? 'ผลสุ่มถูก Confirm แล้ว' : (pending ? 'มีผล Pending รอ Confirm' : 'ยังไม่สุ่มสาย')}</span></div>
      <div class="phase3-metrics">
        <div class="phase3-metric"><small>ทีม Confirm</small><b>${confirmed}</b></div>
        <div class="phase3-metric"><small>ทีม Pending</small><b>${pending}</b></div>
        <div class="phase3-metric"><small>BYE ในสาย</small><b>${byes}</b></div>
        <div class="phase3-metric"><small>ประวัติสุ่ม</small><b>${history}</b></div>
      </div>
      <div class="phase3-list">
        ${ok ? '<div class="phase3-item good">ผลนี้เป็นผลจริงแล้ว สามารถไป Generate Schedule ต่อได้</div>' : '<div class="phase3-item warn">ต้องกด Confirm Result ก่อน ระบบจึงถือว่าเป็นผลจริง</div>'}
        ${byes ? '<div class="phase3-item warn">BYE ใช้เพื่อถ่วงช่องสายเท่านั้น ไม่ควรกลายเป็นคู่แข่งจริงใน Schedule</div>' : '<div class="phase3-item good">ไม่มี BYE ในผลสุ่มชุดนี้</div>'}
      </div>
    `;
  }

  function clearTeams() {
    if (!confirm('ล้างรายชื่อทีมทั้งหมด? ถ้ามี Draw/Schedule/Scores เดิม ข้อมูลเหล่านั้นจะถูกรีเซ็ตเมื่อ Save Teams ใหม่')) return;
    const ta = $('#teamText');
    if (ta) ta.value = '';
    showToast('ล้างช่องรายชื่อทีมแล้ว กดบันทึกรายชื่อเพื่อยืนยัน');
    refresh();
  }

  function copyTeams() {
    const s = teamStats();
    const text = s.unique.join('\n');
    copyText(text, `คัดลอก ${s.unique.length} ทีมแล้ว`);
  }

  function warnBeforeSaveTeams(event) {
    const btn = event.target.closest('#saveTeams');
    if (!btn) return;
    if (!hasDerivedData()) return;
    if (confirm('การบันทึก Teams ใหม่จะรีเซ็ต Draw, Schedule, Scores, Standings และ Knockout เดิม ต้องการทำต่อไหม?')) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function bind() {
    document.addEventListener('input', (event) => {
      if (event.target?.id === 'teamText') refresh();
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('#phase3CopyTeams')) copyTeams();
      if (event.target.closest('#phase3ClearTeams')) clearTeams();
      window.setTimeout(refresh, 150);
    });
    document.addEventListener('click', warnBeforeSaveTeams, true);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.setInterval(refresh, 1500);
  }

  function refresh() {
    renderTeamBox();
    renderDrawBox();
  }

  function install() {
    bind();
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
