/* CyberWorld route repair shim — keeps static GitHub Pages modules addressable.
   This is a defensive layer only: it maps aliases, enables tap/single-click launch,
   and exposes a small route manifest for browser-side diagnostics. */
(function(){
  'use strict';
  if (window.__cwRouteFixLoaded) return;
  window.__cwRouteFixLoaded = true;

  var routes = {
    desktop: '/',
    cyberworld: '/CyberWorld/',
    hub: '/CyberWorld/',
    game: '/cyberworld-game.html',
    mmorpg: '/cyberworld-game.html',
    ctf: '/CyberWorld_login/',
    ctftrail: '/ctf-trail.html',
    login: '/CyberWorld_login/',
    hangar: '/hangar.html',
    mathviz: '/simulator.html',
    simulator: '/simulator.html',
    wargames: '/wargames.html',
    signallab: '/signal-lab.html',
    forensics: '/forensics.html',
    redops: '/redops.html',
    intel: '/intel.html',
    adversaries: '/adversaries.html',
    research: '/research.html',
    ai: '/ai.html',
    nodes: '/nodes.html',
    arcade: '/arcade.html',
    games: '/games.html',
    iso: '/cyberos-iso.html',
    dogfight: '/dogfight.html',
    discuss: '/discuss.html',
    codex: '/cyberworld-codex.html',
    stars: '/stars.html',
    profile: '/profile.html'
  };

  window.CYBERWORLD_ROUTES = Object.assign({}, window.CYBERWORLD_ROUTES || {}, routes);

  function normalize(label){ return String(label || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function absolute(path){ return new URL(path, window.location.origin).href; }

  function iconLabel(el){
    var label = el.querySelector && el.querySelector('.icon-label, .win98-label');
    return (label && label.textContent) || el.getAttribute('aria-label') || el.textContent || '';
  }

  function mapIcon(app){
    var key = normalize(iconLabel(app));
    var direct = routes[key];
    if (direct) return direct;
    if (key.indexOf('ctflogin') >= 0 || key.indexOf('loginctf') >= 0) return routes.ctf;
    if (key.indexOf('cyberworldmmorpg') >= 0 || key === 'cyberworldgame') return routes.game;
    if (key.indexOf('cyberworldhub') >= 0) return routes.hub;
    if (key.indexOf('math') >= 0 || key.indexOf('visual') >= 0 || key.indexOf('simulator') >= 0) return routes.simulator;
    if (key.indexOf('hangar') >= 0) return routes.hangar;
    return '';
  }

  function launch(path){
    if (!path) return false;
    window.open(absolute(path), '_blank', 'noopener');
    return true;
  }

  function patchDesktopIcons(){
    document.querySelectorAll('.icon').forEach(function(icon){
      if (icon.dataset.cwRouteFix) return;
      var mapped = mapIcon(icon);
      if (!mapped) return;
      icon.dataset.cwRouteFix = mapped;
      icon.setAttribute('aria-label', iconLabel(icon).trim() + ' — click, tap, Enter, or Space to open');
      icon.title = iconLabel(icon).trim() + ' — opens ' + mapped;
      var last = 0;
      icon.addEventListener('click', function(ev){
        var now = Date.now();
        document.querySelectorAll('.icon').forEach(function(i){ i.classList.remove('selected'); });
        icon.classList.add('selected');
        // Desktop compatibility: first click selects, second click within 650ms opens.
        // Touch/mobile compatibility: touchend below opens immediately.
        if (now - last < 650) { ev.preventDefault(); launch(mapped); }
        last = now;
      }, true);
      icon.addEventListener('touchend', function(ev){ ev.preventDefault(); launch(mapped); }, {passive:false});
    });
  }

  function addMissingDesktopIcon(){
    var grid = document.getElementById('icon-grid');
    if (!grid || document.querySelector('[data-cw-added-ctf-login]')) return;
    var ctf = document.createElement('div');
    ctf.className = 'icon';
    ctf.tabIndex = 0;
    ctf.setAttribute('role','button');
    ctf.setAttribute('data-cw-added-ctf-login','1');
    ctf.setAttribute('aria-label','CTF Login — click, tap, Enter, or Space to open');
    ctf.title = 'CTF Login — opens /CyberWorld_login/';
    ctf.innerHTML = '<div class="icon-img">🔐</div><div class="icon-label">CTF Login</div>';
    ctf.addEventListener('click', function(){ launch('/CyberWorld_login/'); });
    ctf.addEventListener('keydown', function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); launch('/CyberWorld_login/'); }});
    grid.insertBefore(ctf, grid.children[2] || null);
  }

  function patchWin98Shortcuts(){
    document.querySelectorAll('.win98-shortcut').forEach(function(btn){
      if (btn.dataset.cwRouteFix) return;
      var mapped = mapIcon(btn);
      if (!mapped) return;
      btn.dataset.cwRouteFix = mapped;
      btn.addEventListener('dblclick', function(ev){ ev.preventDefault(); ev.stopPropagation(); launch(mapped); }, true);
      btn.addEventListener('touchend', function(ev){ ev.preventDefault(); launch(mapped); }, {passive:false});
    });
  }

  function boot(){
    addMissingDesktopIcon();
    patchDesktopIcons();
    patchWin98Shortcuts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  new MutationObserver(boot).observe(document.documentElement, {childList:true, subtree:true});
})();
