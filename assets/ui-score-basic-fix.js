(()=>{
  const SEL='#scoresBox input[type="number"],#scoresBox input.scoreinput,#scoresBox .scoreinput';
  function getInput(t){
    if(!t||!t.closest)return null;
    if(t.matches&&t.matches(SEL))return t;
    const direct=t.closest(SEL); if(direct)return direct;
    const cell=t.closest('td,th,.score-cell,.match-score,.score-row');
    return cell&&cell.closest('#scoresBox')?cell.querySelector(SEL):null;
  }
  function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
  function step(input,dy){
    const st=num(input.step,1)||1,min=input.min===''?-9999:num(input.min,-9999),max=input.max===''?9999:num(input.max,9999),cur=num(input.value,0);
    input.value=String(Math.max(min,Math.min(max,cur+(dy<0?st:-st))));
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.classList.add('scores-wheel-focus');
    clearTimeout(input.__sw);input.__sw=setTimeout(()=>input.classList.remove('scores-wheel-focus'),520);
  }
  function prep(root=document){root.querySelectorAll(SEL).forEach(i=>{i.inputMode='numeric';i.autocomplete='off';i.title='เลื่อนเมาส์ขึ้น/ลงเพื่อเพิ่มหรือลดคะแนน';});}
  function boot(){
    if(!document.__pepsScoreWheelV4){document.__pepsScoreWheelV4=true;document.addEventListener('wheel',e=>{const i=getInput(e.target);if(!i||i.disabled||i.readOnly)return;e.preventDefault();e.stopPropagation();if(document.activeElement!==i)i.focus({preventScroll:true});step(i,e.deltaY);},{passive:false,capture:true});document.addEventListener('focusin',e=>{const i=getInput(e.target);if(i)i.classList.add('scores-wheel-focus')});document.addEventListener('focusout',e=>{const i=getInput(e.target);if(i)i.classList.remove('scores-wheel-focus')});}
    prep();new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)prep(n)}))).observe(document.body,{childList:true,subtree:true});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
