(()=>{
  const stamp='20260508-stable-theme-v5';
  function css(id,href){
    if(document.getElementById(id))return;
    const l=document.createElement('link');
    l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l);
  }
  function js(id,src){
    if(document.getElementById(id))return;
    const s=document.createElement('script');
    s.id=id;s.src=src;s.defer=true;document.body.appendChild(s);
  }
  function boot(){
    css('pepsToolsThemeCss','assets/pepslive-tools-theme.css?v='+stamp);
    css('plsSafeV2Css','assets/live-source-safe-v2.css?v='+stamp);
    js('plsSafeV2Js','assets/live-source-safe-v2.js?v='+stamp);
    css('plsUiScoreBasicCss','assets/ui-score-basic-fix.css?v='+stamp);
    js('plsUiScoreBasicJs','assets/ui-score-basic-fix.js?v='+stamp);
    css('plsPageLayoutCss','assets/page-layout-settings.css?v='+stamp);
    js('plsPageLayoutJs','assets/page-layout-settings.js?v='+stamp);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
