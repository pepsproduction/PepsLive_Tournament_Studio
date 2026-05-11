/* Phase 10.22: stable draw-animation source renderer */
(() => {
  'use strict';
  const KEY = 'pepsliveTournamentControlV2';
  const view = new URLSearchParams(location.search).get('view') || '';
  if (view !== 'draw-animation') return;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  const labelOf = (m) => ({wheel:'Wheel Spin',slot:'Slot Reveal',card:'Card Draw',lottery:'Lottery Ball',glitch:'Glitch Cyber',galaxy:'Galaxy Spiral',crystal:'Crystal Oracle',plasma:'Plasma Arc',vortex:'Vortex Portal',winner:'Winner Reveal'}[m] || m || 'Wheel Spin');

  function latest(s){
    const live = s.drawLive || {};
    const feed = Array.isArray(live.feed) ? live.feed : [];
    if (live.waiting) return {team:'READY',group:'-',slot:'-'};
    return live.current || live.pendingItem || feed[0] || {team:'READY',group:'-',slot:'-'};
  }
  function fx(mode){
    if(mode==='slot') return '<div class="peps-slot-visual"><div class="peps-slot-window"><div class="peps-slot-track"><b>สาย A</b><b>สาย B</b><b>สาย C</b><b>สาย D</b><b>สาย A</b></div></div><div class="peps-slot-window"><div class="peps-slot-track team"><b>Golden Lion</b><b>Wild Cats</b><b>Blue Fox</b><b>Red Bull</b><b>Golden Lion</b></div></div></div>';
    if(mode==='card') return '<div class="card-visual"><div class="card-fan"></div><div class="card-fan"></div><div class="card-fan"></div></div>';
    if(mode==='lottery') return '<div class="lottery-visual"><div class="lottery-cage"><div class="ball-cloud"><div class="ball-mini red">12</div><div class="ball-mini blue">45</div><div class="ball-mini red">08</div></div></div><div class="lottery-stand"></div><div class="lottery-base"></div></div>';
    if(mode==='glitch') return '<div class="glitch-visual"><div class="glitch-lines"><div class="glitch-hline"></div><div class="glitch-hline"></div><div class="glitch-hline"></div></div><div class="glitch-text">MATRIX</div></div>';
    if(mode==='galaxy') return '<div class="galaxy-visual"><div class="galaxy-core"></div><div class="galaxy-star"></div><div class="galaxy-star"></div><div class="galaxy-star"></div></div>';
    if(mode==='crystal') return '<div class="crystal-visual"><div class="crystal-orb"></div><div class="crystal-base"></div></div>';
    if(mode==='plasma') return '<div class="plasma-visual"><div class="plasma-ring ring1"></div><div class="plasma-ring ring2"></div><div class="plasma-core"></div></div>';
    if(mode==='vortex') return '<div class="vortex-visual"><div class="vortex-tunnel"><div class="vortex-layer"></div><div class="vortex-layer"></div><div class="vortex-layer"></div></div><div class="vortex-eye"></div></div>';
    if(mode==='winner') return '<div class="winner-visual"><div class="winner-trophy">🏆</div></div>';
    return '<div class="wheel-visual"><div class="wheel-pointer"></div></div>';
  }
  function ensure(){
    document.documentElement.classList.add('peps-stable-draw-source');
    document.querySelector('#app')?.style.setProperty('display','none','important');
    document.querySelector('#sourceRoot')?.style.setProperty('display','none','important');
    document.querySelector('#coreSourceRoot')?.style.setProperty('display','none','important');
    let root = document.querySelector('#pepsStableDrawRoot');
    if(!root){ root = document.createElement('div'); root.id='pepsStableDrawRoot'; document.body.prepend(root); }
    return root;
  }
  let sig = '';
  function paint(){
    const s = read();
    const live = s.drawLive || {};
    const item = latest(s);
    const mode = s.settings?.drawAnimation || 'wheel';
    const scale = Number(s.settings?.drawAnimationScale || .72);
    document.documentElement.style.setProperty('--draw-fx-scale', String(Math.max(.45, Math.min(1.15, scale))));
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    const state = live.waiting || live.running ? 'active' : (live.current ? 'result' : 'idle');
    const next = `${mode}|${state}|${item.team}|${item.group}|${item.slot}|${progress}`;
    const root = ensure();
    if(next === sig) return;
    sig = next;
    root.innerHTML = `<div class="peps-draw-card ${state} draw-style-${esc(mode)}"><div class="peps-draw-layout"><div class="peps-draw-header"><div class="peps-style-label">${esc(labelOf(mode))}</div><div class="peps-group-pill">GROUP <b>${esc(item.group||'-')}</b></div><div class="peps-status">${live.waiting?'RUNNING':'READY'}</div></div><div class="peps-fx-zone"><div class="peps-fx-scale">${fx(mode)}</div></div><div class="peps-result"><div class="peps-team">${esc(item.team||'READY')}</div><div class="peps-sub">${live.waiting?'กำลังสุ่มรายชื่อและสาย...':`สาย ${esc(item.group||'-')} · ลำดับ ${esc(item.slot||'-')}`}</div></div><div class="peps-progress"><div class="peps-progress-track"><div class="peps-progress-bar" style="width:${progress}%"></div></div><div class="peps-progress-meta"><span>${live.waiting?'กำลังสุ่ม...':'พร้อมแสดงผล'}</span><span>${progress}%</span></div></div></div></div>`;
  }
  paint();
  setInterval(paint, 250);
  window.addEventListener('storage', paint);
  window.addEventListener('focus', paint);
  window.addEventListener('peps:draw-style-changed', () => { sig=''; paint(); });
})();
