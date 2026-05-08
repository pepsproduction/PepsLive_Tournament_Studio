(()=>{
  const KEY='pepsliveTournamentControlV2';
  const view=(new URLSearchParams(location.search).get('view')||'').trim();
  if(view&&view!=='control')return;
  if(window.__pepsManualSaveGuard)return;
  window.__pepsManualSaveGuard=true;

  const nativeSet=Storage.prototype.setItem;
  let allowUntil=0;
  let pendingValue=null;
  let dirty=false;

  const MANUAL_CLICK_SELECTOR=[
    '#saveSetup','#saveTeams','#dedupeTeams','#sampleTeams',
    '#startDraw','#nextReveal','#confirmDraw','#redraw','#undoDraw',
    '#generateSchedule','#rebalanceSchedule','#saveScores','#markAllPending',
    '#generateKnockout','#clearOverrides','#saveWebhook','#saveLayoutSettings',
    '#resetLayoutSettings','#saveDisplaySettings','#testWebhook','#sendWebhook',
    '#btnManualSaveLocal'
  ].join(',');

  function nowText(){
    try{return new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}catch{return new Date().toLocaleTimeString();}
  }

  function pill(){return document.getElementById('autosavePill')}

  function setPill(text,mode){
    const p=pill();
    if(!p)return;
    p.textContent=text;
    p.dataset.manualSaveMode=mode||'';
  }

  function markDirty(){
    dirty=true;
    setPill('Manual Save: มีการเปลี่ยนแปลง ยังไม่ได้เซฟ','dirty');
  }

  function markSaved(){
    dirty=false;
    setPill('Manual Save: Saved '+nowText(),'saved');
  }

  function allowManual(ms=1600){allowUntil=Date.now()+ms;}

  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&key===KEY){
      const isManual=Date.now()<=allowUntil;
      if(!isManual){
        pendingValue=String(value);
        markDirty();
        return;
      }
      pendingValue=null;
      const out=nativeSet.apply(this,arguments);
      markSaved();
      return out;
    }
    return nativeSet.apply(this,arguments);
  };

  function addManualSaveButton(){
    const top=document.querySelector('.top-actions');
    if(!top||document.getElementById('btnManualSaveLocal'))return;
    const b=document.createElement('button');
    b.className='btn small primary';
    b.id='btnManualSaveLocal';
    b.type='button';
    b.textContent='Manual Save';
    b.title='บันทึกข้อมูลลง Browser เฉพาะตอนกดปุ่มนี้เท่านั้น';
    b.addEventListener('click',()=>{
      if(pendingValue){
        allowManual(1200);
        nativeSet.call(localStorage,KEY,pendingValue);
        pendingValue=null;
        markSaved();
      }else if(dirty){
        markSaved();
      }else{
        setPill('Manual Save: ไม่มีรายการค้างเซฟ','saved');
      }
    });
    const first=top.querySelector('#btnSaveProject');
    top.insertBefore(b,first||null);
  }

  document.addEventListener('click',e=>{
    const t=e.target&&e.target.closest&&e.target.closest(MANUAL_CLICK_SELECTOR);
    if(t)allowManual(1800);
  },true);

  function boot(){
    addManualSaveButton();
    setPill('Manual Save: Ready','ready');
    new MutationObserver(addManualSaveButton).observe(document.body,{childList:true,subtree:true});
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
