(()=>{
  const K='pepsliveTournamentControlV2';
  const DRAW='wheel slot card lottery glitch galaxy crystal plasma vortex'.split(' ');
  const LIVE='winner groups schedule standings knockout lower-third next-match latest-result'.split(' ');
  const ALL=[...DRAW,...LIVE];
  const TITLE={wheel:'Wheel Spin',slot:'Slot Reveal',card:'Card Draw',lottery:'Lottery Ball',glitch:'Glitch Cyber',galaxy:'Galaxy Spiral',crystal:'Crystal Oracle',plasma:'Plasma Arc',vortex:'Vortex Portal',winner:'Winner Graphic',groups:'Groups Table',schedule:'Schedule Table',standings:'Standings Table',knockout:'Knockout Bracket','lower-third':'Lower Third','next-match':'Next Match','latest-result':'Latest Result'};
  const PARAMS=new URLSearchParams(location.search);
  const VIEW=(PARAMS.get('view')||'').trim();
  const IS_SOURCE=VIEW&&VIEW!=='control'&&ALL.includes(VIEW);
  let LAST='';
  let enhanced=false;

  const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const arr=x=>Array.isArray(x)?x:[];
  const letters=n=>Array.from({length:Math.max(1,+n||4)},(_,i)=>String.fromCharCode(65+i));

  function merge(a,b){
    if(!b||typeof b!=='object')return a;
    for(const[k,v]of Object.entries(b)){
      if(v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))a[k]=merge(a[k],v);
      else a[k]=v;
    }
    return a;
  }

  function state(){
    const base={event:{name:'PepsLive Tournament',sport:'Basketball 3x3',groupCount:4},teams:[],groups:{},pendingGroups:null,pendingSequence:[],pendingRevealIndex:0,drawLive:{waiting:false,current:null,pendingItem:null,feed:[],progress:0,total:0},matches:[],settings:{drawAnimation:'wheel',sourceBg:'transparent',fontScale:1},lastResult:null};
    try{return merge(base,JSON.parse(localStorage.getItem(K)||'{}'))}catch{return base}
  }

  function url(id){return location.href.split('?')[0].split('#')[0]+'?view='+encodeURIComponent(id)+(DRAW.includes(id)?'&bg=transparent':'')}

  function sourceShell(s){
    const bg=PARAMS.get('bg')||(DRAW.includes(VIEW)?'transparent':s.settings?.sourceBg||'transparent');
    document.documentElement.classList.add('pls-live');
    document.documentElement.style.setProperty('--pls-source-bg',bg==='green'?'#00b140':bg==='dark'?'#050816':'transparent');
    document.documentElement.style.setProperty('--pls-font-scale',String(+s.settings?.fontScale||1));
    const app=document.getElementById('app');
    if(app)app.style.display='none';
  }

  function currentDraw(s){
    const l=s.drawLive||{},p=s.pendingSequence||[];
    if(l.waiting&&l.pendingItem)return[l.pendingItem,1];
    if(l.current)return[l.current,0];
    if(l.feed&&l.feed.length)return[l.feed[0],0];
    const i=+s.pendingRevealIndex||0;
    return[p.length&&i>0?p[Math.min(i,p.length)-1]:null,0];
  }

  function progress(s){
    const l=s.drawLive||{};
    const t=Math.max(1,+l.total||arr(s.pendingSequence).length||arr(s.teams).length||1);
    const d=+l.progress||+s.pendingRevealIndex||0;
    return Math.max(0,Math.min(100,Math.round(d/t*100)));
  }

  function fx(mode){
    return {wheel:'<div class="wheel-pointer"></div><div class="wheel"></div><div class="ring r2"></div>',slot:'<div class="reels"><i></i><i></i><i></i><i></i><i></i></div>',card:'<div class="cards"><i></i><i></i><i></i><i></i><i></i></div>',lottery:'<div class="balls"><i></i><i></i><i></i><i></i><i></i></div>',glitch:'<div class="gridfx"></div><div class="ring r1"></div>',galaxy:'<div class="spiral"></div><div class="ring r3"></div>',crystal:'<div class="diamond"></div><div class="ring r2"></div>',plasma:'<div class="arc"></div><div class="ring r1"></div>',vortex:'<div class="portal"></div><div class="ring r2"></div>'}[mode]||'<div class="ring r1"></div>';
  }

  function drawHtml(s){
    let mode=VIEW==='winner'?(s.settings?.drawAnimation||'wheel'):VIEW;
    if(!DRAW.includes(mode))mode='wheel';
    const [item,waiting]=currentDraw(s);
    const name=item?.team||(waiting?'DRAWING...':'READY');
    const meta=item?`สาย ${item.group} · ลำดับ ${item.slot}`:s.event?.name;
    return `<div class="cv"><section class="draw m-${esc(mode)}"><div class="fx">${fx(mode)}</div><div class="core glass"><div class="k">${esc(TITLE[VIEW]||TITLE[mode])}</div><div class="name">${esc(name)}</div><div class="meta">${esc(meta)}</div><div class="bar"><i style="width:${progress(s)}%"></i></div></div></section></div>`;
  }

  function revealedItems(s){
    const map=new Map(),add=i=>{if(i&&i.group&&i.slot&&i.team)map.set(i.group+'|'+i.slot,i)};
    arr(s.pendingSequence).slice(0,+s.pendingRevealIndex||0).forEach(add);
    arr(s.drawLive?.feed).slice().reverse().forEach(add);
    if(s.drawLive?.current&&!s.drawLive?.waiting)add(s.drawLive.current);
    return [...map.values()].sort((a,b)=>String(a.group).localeCompare(String(b.group))||(+a.slot-+b.slot));
  }

  function groupsHtml(s){
    const ls=letters(s.event?.groupCount);
    const hasGroups=Object.values(s.groups||{}).some(x=>Array.isArray(x)&&x.length);
    const hasPending=Object.values(s.pendingGroups||{}).some(x=>Array.isArray(x)&&x.length);
    const source=hasGroups?s.groups:hasPending?s.pendingGroups:null;
    let slots=Math.max(2,Math.ceil(Math.max(arr(s.teams).length,ls.length*4)/ls.length));
    arr(s.pendingSequence).forEach(i=>slots=Math.max(slots,+i.slot||0));
    const groupMap=Object.fromEntries(ls.map(x=>[x,Array.from({length:slots},()=>({team:'',state:'empty'}))]));
    if(source){
      ls.forEach(x=>arr(source[x]).forEach((t,i)=>{if(groupMap[x]&&groupMap[x][i])groupMap[x][i]={team:t,state:'done'}}));
    }else{
      revealedItems(s).forEach(i=>{if(groupMap[i.group]&&groupMap[i.group][+i.slot-1])groupMap[i.group][+i.slot-1]={team:i.team,state:'done'}});
    }
    const p=s.drawLive?.waiting?s.drawLive.pendingItem:null;
    if(!source&&p&&groupMap[p.group]&&groupMap[p.group][+p.slot-1])groupMap[p.group][+p.slot-1]={team:'กำลังสุ่ม...',state:'wait'};
    const total=arr(s.pendingSequence).length||arr(s.teams).length||0;
    const done=source?Object.values(source).reduce((a,b)=>a+arr(b).filter(Boolean).length,0):revealedItems(s).length;
    const cards=ls.map(x=>`<article class="group-card"><div class="group-title"><span>สาย ${esc(x)}</span><b>${groupMap[x].filter(r=>r.team&&r.team!=='กำลังสุ่ม...').length}</b></div>${groupMap[x].map((r,i)=>`<div class="group-row ${r.state}"><div class="no">${i+1}</div><div class="team">${esc(r.team||'ว่าง')}</div></div>`).join('')}</article>`).join('');
    const feed=revealedItems(s).slice(-10).reverse().map(i=>`<span>${esc(i.group)}-${esc(i.slot)} · ${esc(i.team)}</span>`).join('')||'<span>ยังไม่มีรายการเปิดผล</span>';
    return `<div class="cv"><section class="board groups-board glass"><div class="head"><div><div class="k">LIVE GROUPS TABLE</div><h1>${esc(s.event?.name||'PepsLive Tournament')}</h1><p>${source?'ผลแบ่งสายจริงจาก Draw':total?'อัปเดตตาม Reveal Feed':'พร้อมใช้งาน รอเริ่ม Draw'} · ${done}/${total}</p></div><div class="sport">${esc(s.event?.sport||'')}</div></div><div class="groups-grid">${cards}</div><div class="feed stable">${feed}</div></section></div>`;
  }

  function scheduleHtml(s){
    const rows=arr(s.matches).slice(0,20).map((m,i)=>`<tr><td>${i+1}</td><td>${esc(m.time||'-')}</td><td>${esc(m.group||'-')}</td><td>${esc(m.teamA||m.a||'-')}</td><td>${esc(m.teamB||m.b||'-')}</td><td>${esc(m.court||m.field||'-')}</td></tr>`).join('');
    return `<div class="cv"><section class="board glass"><div class="head"><div><div class="k">SCHEDULE TABLE</div><h1>${esc(s.event?.name||'PepsLive Tournament')}</h1><p>${arr(s.matches).length} matches</p></div></div><div class="tablewrap source-table"><table><thead><tr><th>#</th><th>เวลา</th><th>สาย</th><th>ทีม A</th><th>ทีม B</th><th>สนาม</th></tr></thead><tbody>${rows||'<tr><td colspan="6">ยังไม่มีตารางแข่ง</td></tr>'}</tbody></table></div></section></div>`;
  }

  function simpleHtml(s){return `<div class="cv"><section class="simple glass"><div class="k">${esc(TITLE[VIEW]||VIEW)}</div><div class="name">${esc(s.lastResult?.text||'READY')}</div><div class="meta">${esc(s.event?.name||'PepsLive Tournament')}</div></section></div>`}

  function renderSource(){
    if(!IS_SOURCE)return;
    const s=state();
    sourceShell(s);
    let root=document.getElementById('sourceRoot');
    if(!root){root=document.createElement('div');root.id='sourceRoot';document.body.prepend(root)}
    root.className='v2';
    const html=(DRAW.includes(VIEW)||VIEW==='winner')?drawHtml(s):VIEW==='groups'?groupsHtml(s):VIEW==='schedule'?scheduleHtml(s):simpleHtml(s);
    if(html!==LAST){root.innerHTML=html;LAST=html}
  }

  function card(id){
    const u=url(id);
    return `<article class="source-card live-source-ready"><div class="source-kind">${DRAW.includes(id)?'Draw Animation Source':'Live Data Source'}</div><h3>${esc(TITLE[id]||id)}</h3><p>${DRAW.includes(id)?'พื้นหลังโปร่งใส ใช้กับ OBS ได้ทันที':'Live Source ใช้กับ OBS ได้ทันที'}</p><div class="source-url">${esc(u)}</div><div class="row source-actions"><button class="btn primary" data-open-source="${esc(u)}">Open Preview</button><button class="btn" data-copy-source="${esc(u)}">Copy URL</button></div></article>`;
  }

  function enhanceSourcesPanel(force=false){
    if(IS_SOURCE)return;
    const target=document.getElementById('sourceCards');
    if(!target)return;
    if(enhanced&&!force&&target.dataset.pepsLiveSources==='stable-v5')return;
    enhanced=true;
    target.dataset.pepsLiveSources='stable-v5';
    target.className='source-panel-grid';
    target.innerHTML=`<div class="source-section"><h3>Draw Animation Sources</h3><div class="source-grid">${DRAW.map(card).join('')}</div></div><div class="source-section"><h3>Live Data Sources</h3><div class="source-grid">${LIVE.map(card).join('')}</div></div>`;
  }

  function boot(){
    if(IS_SOURCE){
      renderSource();
      setInterval(renderSource,900);
      addEventListener('storage',renderSource);
      return;
    }
    document.addEventListener('click',async e=>{
      const openBtn=e.target.closest('[data-open-source]');
      const copyBtn=e.target.closest('[data-copy-source]');
      if(openBtn)open(openBtn.dataset.openSource,'_blank');
      if(copyBtn){
        try{await navigator.clipboard.writeText(copyBtn.dataset.copySource);const old=copyBtn.textContent;copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent=old,900)}
        catch{prompt('Copy URL',copyBtn.dataset.copySource)}
      }
      if(e.target.closest('[data-panel-target="sources"]'))setTimeout(()=>enhanceSourcesPanel(true),350);
    });
    setTimeout(()=>enhanceSourcesPanel(false),500);
    setTimeout(()=>enhanceSourcesPanel(false),1800);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
