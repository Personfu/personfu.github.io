(()=>{
  if(window.__cwPlaytestPatches)return;window.__cwPlaytestPatches=1;
  const GAME_PATH='/cyberworld-game.html';
  const V2='cw.operative.v2';
  const LAUNCHER='cw.launcher.profile';
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn()}
  function read(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(_e){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_e){return false}}
  function isAutoCallsign(v){return !v||/^OPERATIVE(-|\s)?\d*$/i.test(String(v))||String(v).trim()==='OPERATIVE'}
  function mergeLauncherProfile(){
    const profile=read(LAUNCHER,null);let state=read(V2,null)||{};
    if(profile&&typeof profile==='object'){
      if(profile.name&&isAutoCallsign(state.callsign))state.callsign=profile.name;
      if(profile.class&&!state.operatorClass)state.operatorClass=profile.class;
      if(profile.color)state.accent=profile.color;
      state.launcherSyncedAt=state.launcherSyncedAt||new Date().toISOString();
      if(typeof state.onboarded==='undefined')state.onboarded=false;
      write(V2,state);
    }
    const accent=state.accent||(profile&&profile.color)||'#00e8ff';
    document.documentElement.style.setProperty('--cw-player-accent',accent);
    document.body&&document.body.style.setProperty('--cw-player-accent',accent);
    return state;
  }
  function fireKey(key){
    const down=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});
    document.dispatchEvent(down);
    setTimeout(()=>document.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true,cancelable:true})),90);
  }
  function resetStuck(){
    const state=read(V2,{})||{};
    state.currentSector='Mainframe Core';state.playerX=8;state.playerY=6;
    state.hp=state.maxHp||100;state.shield=state.maxShield||30;
    state.inCombat=false;state.lastRescueAt=new Date().toISOString();
    write(V2,state);location.reload();
  }
  function clearGuideSeen(){localStorage.removeItem('cw.guide.seen');location.reload()}
  function testReport(){
    const state=read(V2,{})||{};const profile=read(LAUNCHER,{})||{};
    return {path:location.pathname,profile,game:{callsign:state.callsign,operatorClass:state.operatorClass,sector:state.currentSector,level:state.level,xp:state.xp,credits:state.credits,hp:state.hp,shield:state.shield,missionsCompleted:Array.isArray(state.completedMissions)?state.completedMissions.length:0,inventory:Array.isArray(state.inventory)?state.inventory.length:0,factions:state.factions||{}},seenGuide:!!localStorage.getItem('cw.guide.seen'),timestamp:new Date().toISOString()};
  }
  function installGamePanel(){
    if(location.pathname!==GAME_PATH||document.querySelector('.cw-playtest-panel'))return;
    const state=mergeLauncherProfile();
    const first=!localStorage.getItem('cw.guide.seen');
    const panel=document.createElement('aside');panel.className='cw-playtest-panel'+(first?' open':'');
    panel.innerHTML=`<button class="cw-guide-toggle" type="button" aria-expanded="${first?'true':'false'}">OPS GUIDE</button><div class="cw-playtest-body"><div class="cw-playtest-head"><span>AAA PLAYTEST PATCH</span><button type="button" data-cw-close>×</button></div><p class="cw-playtest-call">${state.callsign||'OPERATIVE'} // ${state.operatorClass||'Sentinel'} // <i style="background:${state.accent||'#00e8ff'}"></i></p><p>The client has content. The blind spot was orientation. Follow this first loop: talk to Ada Root, open Missions, recon one daemon, patch if damaged, then return to the hub with evidence.</p><div class="cw-guide-grid"><button data-key="m"><b>M</b><span>Missions</span></button><button data-key="i"><b>I</b><span>Inventory</span></button><button data-key="Tab"><b>Tab</b><span>Map</span></button><button data-key=" "><b>Space</b><span>Interact</span></button></div><ol class="cw-guide-steps"><li>Move with WASD or arrow keys.</li><li>SPACE near NPCs, terminals, and objects.</li><li>In combat: Recon → Exploit → Patch if low HP.</li><li>If lost, open Missions. If stuck, use Rescue Spawn.</li></ol><div class="cw-guide-actions"><a href="/game/">Customize</a><a href="/CyberWorld/">Hub</a><button type="button" data-cw-rescue>Rescue Spawn</button><button type="button" data-cw-reset-guide>Replay Guide</button></div><p class="cw-playtest-note">Diagnostic hook: run <code>window.__cwPlaytestReport()</code> in console for save/profile state.</p></div>`;
    document.body.appendChild(panel);
    const toggle=panel.querySelector('.cw-guide-toggle');
    const close=panel.querySelector('[data-cw-close]');
    function setOpen(open){panel.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open?'true':'false');if(!open)localStorage.setItem('cw.guide.seen','1')}
    toggle.addEventListener('click',()=>setOpen(!panel.classList.contains('open')));
    close.addEventListener('click',()=>setOpen(false));
    panel.querySelectorAll('[data-key]').forEach(btn=>btn.addEventListener('click',()=>fireKey(btn.getAttribute('data-key'))));
    panel.querySelector('[data-cw-rescue]').addEventListener('click',resetStuck);
    panel.querySelector('[data-cw-reset-guide]').addEventListener('click',clearGuideSeen);
    if(first)setTimeout(()=>panel.classList.add('pulse'),700);
  }
  function installModuleHints(){
    if(location.pathname===GAME_PATH)return;
    const title=(document.title||'CyberWorld module').replace(/\s*[-|].*$/,'');
    if(document.querySelector('.cw-module-hint'))return;
    const hint=document.createElement('div');hint.className='cw-module-hint';
    hint.innerHTML=`<strong>${title}</strong><span>Training module linked to Operation Glasshouse. Use this page as a specialized station, then return to the hub or game client.</span>`;
    const target=document.querySelector('main,.wrap,.container,body');
    if(target&&target!==document.body)target.prepend(hint);else document.body.prepend(hint);
  }
  ready(()=>{mergeLauncherProfile();installGamePanel();installModuleHints();window.__cwPlaytestReport=testReport});
})();
