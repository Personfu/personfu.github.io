/* Public Ascension entry, identity, accessible controls, settings and local save UI.
 * Existing game/Academy state remains in cw.operative.v1; auth tokens never enter exports.
 */
(function () {
  'use strict';
  var PROFILE_KEY = 'cw.ascension.profile.v1';
  var SETTINGS_KEY = 'cw.ascension.settings.v1';
  var phase = 'title';
  var color = '#48ffd5';
  var avatarFrame = 0;
  var preview3d = null;
  var inMemoryProfile = null;
  var toastTimer;
  var settingsReturnFocus;
  var patchRegistration = null, waitingPatch = null, announcedPatch = null;
  var patchApplying = false, patchReloaded = false, patchActivationTimer = null, patchError = '';
  var minimapTime = 0;
  var previousSettings = read(SETTINGS_KEY, {}) || {};
  var settings = { sound: previousSettings.sound === true, reducedMotion: previousSettings.reducedMotion === true, quality: ['low','medium','high','ultra','custom'].includes(previousSettings.quality) ? previousSettings.quality : undefined, graphics: { resolution: Math.max(.5, Math.min(2, Number(previousSettings.graphics && previousSettings.graphics.resolution) || 1)), shadows: !(previousSettings.graphics && previousSettings.graphics.shadows === false), effects: !(previousSettings.graphics && previousSettings.graphics.effects === false) } };
  var NAMES = { plaza: 'CYBER PLAZA', soc: 'SOC TOWER', academy: 'HACKER ACADEMY', lab: 'YOUR LAB', net: 'NET CAFE', map: 'NETWORK MAP', field: 'LAUNCH BAY', relay: 'RELAY CAVE', storm: 'STORMCORE', grid: 'THE GRID', sector: 'ACADEMY SECTOR' };
  var PATHS = {
    soc: { faction: 'IRONWALL', frame: 'sentinel', label: 'SOC CADET' },
    osint: { faction: 'GHOSTNET', frame: 'ghost', label: 'OSINT SCOUT' },
    packet: { faction: 'GHOSTNET', frame: 'runner', label: 'PACKET ROOKIE' },
    red: { faction: 'NULLSEC', frame: 'runner', label: 'REVERSE ENGINEER' },
    sysadmin: { faction: 'IRONWALL', frame: 'tinker', label: 'SYSADMIN APPRENTICE' },
    hardware: { faction: 'DAEMON', frame: 'tinker', label: 'HARDWARE TINKERER' },
    cloud: { faction: 'IRONWALL', frame: 'sentinel', label: 'CLOUD INITIATE' },
    space: { faction: 'NULLSEC', frame: 'ghost', label: 'SPACE CYBER CADET' }
  };
  function $(id) { return document.getElementById(id); }
  function text(id, value) { var el = $(id); if (el && el.textContent !== String(value)) el.textContent = String(value); }
  function read(key, fallback) { try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { text('cwas-save-status', 'SAVE UNAVAILABLE — EXPORT YOUR PROGRESS'); $('cwas-save-status').classList.add('warning'); return false; } }
  function campaign() { return window.__cwAscension; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(message) { text('cwas-toast', message); $('cwas-toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('cwas-toast').classList.remove('show'); }, 3300); }
  function setPhase(next) {
    if (next !== 'creator' && preview3d) { preview3d.dispose(); preview3d = null; }
    phase = next; document.body.dataset.phase = next;
    $('cwas-title').hidden = next !== 'title'; $('cwas-creator').hidden = next !== 'creator'; $('cwas-ingame').hidden = next !== 'playing';
    if (next === 'creator') { drawPreview(); setTimeout(function () { $('cwas-handle').focus(); }, 30); }
    if (next === 'playing') { $('cwg-canvas').setAttribute('tabindex', '-1'); $('cwg-canvas').focus(); updateHud(); }
  }
  function currentProfile() {
    if (inMemoryProfile) return inMemoryProfile;
    var profile = read(PROFILE_KEY, null), op = window.__cwGameplay ? window.__cwGameplay.state() : {};
    var net = read('cw.net.v1', {});
    return profile || { callsign: op.callsign || 'OPERATIVE', path: 'soc', faction: net.faction || 'IRONWALL', color: op.look && op.look.suit || '#48ffd5' };
  }
  function backup(key) {
    try { var value = localStorage.getItem(key); if (value && !localStorage.getItem(key + '.pre-ascension')) localStorage.setItem(key + '.pre-ascension', value); } catch (_) { /* A failed backup never deletes the original. */ }
  }
  function createOperative(event) {
    event.preventDefault();
    var callsign = $('cwas-handle').value.trim();
    if (!/^[A-Za-z0-9_\- ]{2,20}$/.test(callsign)) { $('cwas-handle').setCustomValidity('Use 2–20 letters, numbers, spaces, underscores or hyphens.'); $('cwas-handle').reportValidity(); return; }
    var path = $('cwas-specialization').value, spec = PATHS[path] || PATHS.soc;
    var profile = { version: 1, callsign: callsign, path: path, faction: spec.faction, color: color };
    backup('cw.operative.v1'); backup('cw.net.v1');
    var op = window.__cwGameplay.state();
    op.callsign = callsign;
    op.flags = Object.assign({}, op.flags, { path: path, origin: 'ascension-plaza' });
    op.look = Object.assign({}, op.look, { frame: spec.frame, suit: color, accent: '#b797ff', hair: '#111827', coat: '#0b1622', skin: '#a97559' });
    if (window.__cwGameplay.replaceState) window.__cwGameplay.replaceState(op);
    else if (!save('cw.operative.v1', op)) toast('Storage is unavailable. You can still play; export before leaving.');
    save('cw.net.v1', Object.assign({}, read('cw.net.v1', {}), { callsign: callsign, faction: spec.faction }));
    inMemoryProfile = profile; save(PROFILE_KEY, profile); window.__cwGameplay.refresh(); enterWorld(profile);
  }
  function enterWorld(profile) {
    window.__cwGameplay.refresh();
    // Continue/Create is a user gesture: restore an opted-in audio preference
    // here instead of starting an audio context during page boot.
    if (settings.sound && window.__cwWorld.setSoundEnabled) window.__cwWorld.setSoundEnabled(true);
    var boot = $('cwg-boot'); if (boot) boot.classList.add('gone');
    window.__cwWorld.open(); window.__cwWorld.toPlaza();
    if (campaign() && campaign().init) campaign().init();
    setPhase('playing');
    if (window.__cwAscensionNet) window.__cwAscensionNet.start(profile || currentProfile());
    var snap = read('cw.ascension.position.v1', null);
    if (snap && snap.zone && NAMES[snap.zone] && snap.zone !== 'plaza' && snap.zone !== 'sector' && snap.zone !== 'grid') window.__cwWorld.toDistrict(snap.zone);
    updateHud(); toast('Welcome to the Grid, ' + (profile || currentProfile()).callsign + '. Find Agent Zero.');
  }
  function openDeck(tab) { if (campaign() && campaign().openDeck) campaign().openDeck(tab || 'missions'); }
  function toggleHud() { var compact = document.body.classList.toggle('cwas-immersive'); $('cwas-hud-toggle').textContent = compact ? 'HUD +' : 'HUD −'; $('cwas-hud-toggle').setAttribute('aria-pressed', String(!compact)); }
  function closeModal() {
    var modal = $('cwas-modal');
    if (campaign() && typeof campaign().close === 'function') campaign().close();
    modal.hidden = true; modal.classList.remove('is-open');
    if (settingsReturnFocus && settingsReturnFocus.focus) settingsReturnFocus.focus();
    else if ($('cwg-canvas')) $('cwg-canvas').focus();
  }
  function openSettings() {
    settingsReturnFocus = document.activeElement;
    // Preserve any entered case evidence before replacing the shared dialog.
    if (campaign() && typeof campaign().close === 'function') campaign().close();
    var modal = $('cwas-modal');
    modal.innerHTML = '<section class="cwas-dialog" aria-labelledby="cwas-settings-title"><header><div><small>SIMULATION PAUSED / LOCAL PROGRESS</small><h2 id="cwas-settings-title">Operator settings</h2></div><button type="button" data-shell-close aria-label="Close settings">×</button></header><div class="cwas-dialog-body"><p>Every operation uses fictional local systems. Real public presence shares only your handle, faction and in-game position. Your game progress stays in this browser.</p><div class="cwas-settings-grid"><div class="cwas-setting"><span>AUDIO / CITY SCORE</span><small>Original reactive score, rain, footsteps and interior ambience. Sound begins only after you enable it.</small><button id="cwas-setting-sound">' + (settings.sound ? 'TURN SOUND OFF' : 'ENABLE SOUND') + '</button></div><div class="cwas-setting"><span>ACCESSIBILITY / MOTION</span><small>Reduce ambient movement and effects. System reduced-motion preference is respected automatically.</small><button id="cwas-setting-motion">' + (settings.reducedMotion ? 'STANDARD MOTION' : 'REDUCE MOTION') + '</button></div><div class="cwas-setting"><span>LOCAL SAVE / EXPORT</span><small>Download your operative and campaign progress. Account sessions and authentication tokens are excluded.</small><button id="cwas-save-export">EXPORT PROGRESS</button></div><div class="cwas-setting"><span>LOCAL SAVE / IMPORT</span><small>Restore a CyberWorld Ascension export. Your current save is backed up before replacement.</small><label><span class="cwas-sr">Choose Ascension save file</span><input id="cwas-save-import" type="file" accept="application/json,.json"></label></div></div><h3>Know your controls</h3><p><b>WASD / arrow keys</b> move · <b>Shift</b> run · <b>E</b> interact · <b>Q</b> Overclock · <b>Tab</b> Cyberdeck · <b>J</b> notes · <b>I</b> inventory · <b>Esc</b> pause/close. Click the world to walk. Right-drag to orbit the camera; scroll to zoom. Touch controls appear on smaller screens.</p><p>Gamepad: left stick moves, A interacts, X toggles Overclock, Y opens the Cyberdeck. Motion and time pressure never limit evidence reading.</p><p><b>Independent fan-made educational game.</b> Agency references describe publicly documented disciplines. CyberWorld is not affiliated with or endorsed by NSA, FBI, CIA, CISA or NASA. The campaign is original; licensed character art is credited with the game; all cyber actions remain inside the simulation.</p><div class="cwas-settings-footer"><a href="THIRD_PARTY_LICENSES.txt" target="_blank" rel="noopener noreferrer">CREDITS ↗</a><a href="../index.html">OPERATOR DESKTOP ↗</a><a href="https://www.fllc.net/cyberworld" target="_blank" rel="noopener noreferrer">FLLC MEMBER GRID ↗</a><a href="../GovINT/index.html" target="_blank" rel="noopener noreferrer">GOVINT ↗</a><a href="https://github.com/Personfu/personfu.github.io" target="_blank" rel="noopener noreferrer">SOURCE ↗</a></div></div></section>';
    renderPatchAction();
    modal.hidden = false; modal.classList.add('is-open'); modal.setAttribute('aria-label', 'Operator settings'); modal.setAttribute('aria-labelledby', 'cwas-settings-title');
    modal.querySelector('[data-shell-close]').onclick = closeModal;
    $('cwas-setting-sound').onclick = function () { toggleSound(); openSettings(); };
    $('cwas-setting-motion').onclick = function () { settings.reducedMotion = !settings.reducedMotion; save(SETTINGS_KEY, settings); applySettings(); openSettings(); };
    $('cwas-save-export').onclick = exportSave;
    $('cwas-save-import').onchange = importSave;
    var display = document.createElement('div'); display.className = 'cwas-setting';
    var currentQuality = settings.quality || (window.innerWidth <= 900 ? 'low' : 'high');
    display.innerHTML = '<span>DISPLAY / 3D DETAIL</span><small>Presets scale render resolution, shadows, weather and glow. Phones start on Low; your manual choice is saved.</small><label>Quality <select id="cwas-setting-quality">' + ['low','medium','high','ultra','custom'].map(function (quality) { return '<option value="' + quality + '"' + (currentQuality === quality ? ' selected' : '') + '>' + quality.toUpperCase() + '</option>'; }).join('') + '</select></label>' + (currentQuality === 'custom' ? '<label>Resolution cap <output id="cwas-resolution-value">' + settings.graphics.resolution + '×</output><input id="cwas-setting-resolution" type="range" min="0.5" max="2" step="0.1" value="' + settings.graphics.resolution + '"></label><label><input id="cwas-setting-shadows" type="checkbox"' + (settings.graphics.shadows ? ' checked' : '') + '> Dynamic shadows</label><label><input id="cwas-setting-effects" type="checkbox"' + (settings.graphics.effects ? ' checked' : '') + '> Atmosphere and glow</label>' : '') + '<button id="cwas-setting-fullscreen">' + (document.fullscreenElement ? 'EXIT FULL SCREEN' : 'ENTER FULL SCREEN') + '</button>';
    modal.querySelector('.cwas-settings-grid').appendChild(display);
    $('cwas-setting-quality').onchange = function () { settings.quality = this.value; save(SETTINGS_KEY, settings); applySettings(); openSettings(); };
    ['resolution','shadows','effects'].forEach(function (name) { var input = $('cwas-setting-' + name); if (!input) return; input.oninput = function () { settings.graphics[name] = name === 'resolution' ? Number(this.value) : this.checked; if ($('cwas-resolution-value')) $('cwas-resolution-value').textContent = settings.graphics.resolution + '×'; save(SETTINGS_KEY, settings); applySettings(); }; });
    $('cwas-setting-fullscreen').onclick = function () { var action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (action && action.catch) action.catch(function () { toast('Full screen is unavailable in this browser.'); }); };
    modal.querySelector('[data-shell-close]').focus();
  }
  function renderPatchAction() {
    var modal = $('cwas-modal');
    if (!modal || !modal.querySelector('#cwas-settings-title')) return;
    var existing = $('cwas-grid-patch');
    if (existing) existing.remove();
    if (!waitingPatch || waitingPatch.state === 'redundant') return;
    var block = document.createElement('div'); block.id = 'cwas-grid-patch'; block.className = 'cwas-setting';
    var title = document.createElement('span'); title.textContent = 'NEW GRID PATCH AVAILABLE'; block.appendChild(title);
    var info = document.createElement('small'); info.textContent = 'Apply when you are ready. Your operation is saved before the game reloads.'; block.appendChild(info);
    if (patchError) { var error = document.createElement('p'); error.setAttribute('role', 'alert'); error.textContent = patchError; block.appendChild(error); }
    var button = document.createElement('button'); button.id = 'cwas-apply-update'; button.type = 'button';
    button.textContent = patchApplying ? 'APPLYING GRID PATCH…' : 'SAVE + APPLY GRID PATCH'; button.disabled = patchApplying; button.onclick = applyGridPatch; block.appendChild(button);
    var footer = modal.querySelector('.cwas-settings-footer');
    if (footer) footer.before(block); else modal.querySelector('.cwas-dialog-body').appendChild(block);
  }
  function checkpointForPatch() {
    var values = {};
    if (window.__cwGameplay && window.__cwGameplay.state) values['cw.operative.v1'] = window.__cwGameplay.state();
    if (campaign() && campaign().exportState) values['cw.ascension.v1'] = campaign().exportState();
    if (window.__cwCity && window.__cwCity.state) values['cw.ascension.city.v1'] = window.__cwCity.state();
    values[PROFILE_KEY] = currentProfile(); values[SETTINGS_KEY] = settings;
    if (window.__cwWorld && window.__cwWorld.snapshot) {
      var snapshot = window.__cwWorld.snapshot();
      if (snapshot && (snapshot.district || snapshot.view)) values['cw.ascension.position.v1'] = { zone: snapshot.district || snapshot.view };
    }
    // Never reload a memory-only session. Verify every checkpoint write first;
    // a failed write leaves the current running operation available for export.
    Object.keys(values).forEach(function (key) {
      var serialized = JSON.stringify(values[key]);
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized) throw new Error('Save verification failed');
    });
  }
  function applyGridPatch() {
    if (!waitingPatch || patchApplying || patchReloaded) return;
    try { checkpointForPatch(); }
    catch (_) { patchError = 'Your progress could not be saved. Export your progress before leaving; the patch has not been applied.'; renderPatchAction(); toast('Save unavailable. Export progress before applying the patch.'); return; }
    patchError = ''; patchApplying = true; renderPatchAction();
    try { waitingPatch.postMessage({ type: 'ACTIVATE_PATCH' }); }
    catch (_) { patchApplying = false; patchError = 'The patch is no longer ready. Keep playing and try again later.'; renderPatchAction(); return; }
    patchActivationTimer = setTimeout(function () {
      if (patchReloaded) return;
      patchApplying = false; patchError = 'The patch is still waiting. Your save is safe; keep playing or try again.'; renderPatchAction();
    }, 20000);
  }
  function refreshWaitingPatch() {
    waitingPatch = patchRegistration && patchRegistration.waiting || null;
    if (waitingPatch && waitingPatch !== announcedPatch && navigator.serviceWorker.controller) {
      announcedPatch = waitingPatch; toast('New Grid patch available. Open settings to save and apply it.');
    }
    renderPatchAction();
  }
  function registerOfflineRuntime() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!patchApplying || patchReloaded) return;
      patchReloaded = true; clearTimeout(patchActivationTimer); window.location.reload();
    });
    navigator.serviceWorker.register('./ascension-sw.js', { scope: './' }).then(function (registration) {
      patchRegistration = registration; refreshWaitingPatch();
      registration.addEventListener('updatefound', function () {
        var installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed') { refreshWaitingPatch(); setTimeout(refreshWaitingPatch, 0); }
        });
      });
    }).catch(function () { /* Offline storage support is optional; the game stays playable. */ });
  }
  function applySettings() {
    var systemReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.toggle('cwas-reduced-motion', settings.reducedMotion || systemReduced);
    if (window.__cwWorld && window.__cwWorld.setReducedMotion) window.__cwWorld.setReducedMotion(!!settings.reducedMotion);
    var graphics = settings.quality || (window.innerWidth <= 900 ? 'low' : 'high');
    if (window.__cwWorld && window.__cwWorld.setGraphicsQuality) window.__cwWorld.setGraphicsQuality(graphics, settings.graphics);
    text('cwas-audio', settings.sound ? 'SOUND ON' : 'SOUND OFF'); $('cwas-audio').setAttribute('aria-pressed', String(!!settings.sound));
    try { localStorage.setItem('cw.sound', JSON.stringify(!!settings.sound)); } catch (_) {}
  }
  function toggleSound() {
    settings.sound = !settings.sound; save(SETTINGS_KEY, settings); applySettings();
    if (window.__cwWorld && window.__cwWorld.setSoundEnabled) window.__cwWorld.setSoundEnabled(!!settings.sound);
    else { var oldButton = $('cwg-btn-snd'); if (oldButton && (oldButton.dataset.on === '1') !== !!settings.sound) oldButton.click(); }
    if (settings.sound && !(window.__cwWorld && window.__cwWorld.setSoundEnabled)) {
      try { var AC = window.AudioContext || window.webkitAudioContext; var ctx = new AC(); var osc = ctx.createOscillator(), gain = ctx.createGain(); gain.gain.value = .025; osc.type = 'sine'; osc.frequency.value = 523; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .12); setTimeout(function () { ctx.close(); }, 250); } catch (_) {}
    }
  }
  function cleanOperative(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Missing operative.');
    var out = {}, integer = function (value, min, max) { return Math.max(min, Math.min(max, Math.trunc(Number(value) || min))); };
    out.callsign = String(source.callsign || '').replace(/[^A-Za-z0-9_\- ]/g, '').slice(0, 20);
    if (out.callsign.length < 2) throw new Error('Invalid callsign.');
    ['level','xp','credits','hp','maxHp','shield','maxShield'].forEach(function (key) { out[key] = integer(source[key], key === 'level' ? 1 : 0, key === 'level' ? 999 : 1000000); });
    out.inventory = {}; out.completed = {};
    ['inventory','completed'].forEach(function (key) {
      if (!source[key] || typeof source[key] !== 'object' || Array.isArray(source[key])) return;
      Object.keys(source[key]).slice(0, 500).forEach(function (id) { if (/^[A-Za-z0-9_.:-]{1,100}$/.test(id) && !['__proto__','constructor','prototype'].includes(id)) out[key][id] = integer(source[key][id], 0, key === 'inventory' ? 9999 : 9000000000000000); });
    });
    out.flags = { run: { active: false, missionId: null }, tutorialDone: !!(source.flags && source.flags.tutorialDone), path: source.flags && PATHS[source.flags.path] ? source.flags.path : 'soc' };
    out.look = {};
    ['suit','accent','hair','coat','skin'].forEach(function (key) { if (source.look && /^#[0-9a-f]{6}$/i.test(source.look[key])) out.look[key] = source.look[key]; });
    out.look.frame = source.look && ['sentinel','ghost','runner','tinker','street','bot'].includes(source.look.frame) ? source.look.frame : 'sentinel';
    out.field = { clears: integer(source.field && source.field.clears, 0, 99999), bestRoute: integer(source.field && source.field.bestRoute, 0, 99999) };
    return out;
  }
  function exportSave() {
    var data = { format: 'cyberworld-ascension', version: 1, exportedAt: new Date().toISOString(), operative: cleanOperative(window.__cwGameplay.state()), identity: currentProfile(), campaign: campaign() && campaign().exportState ? campaign().exportState() : read('cw.ascension.v1', {}), city: window.__cwCity ? window.__cwCity.state() : null };
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    var anchor = document.createElement('a'); anchor.href = url; anchor.download = 'cyberworld-ascension-save.json'; anchor.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); toast('Progress exported. No authentication data included.');
  }
  var RESTORE_KEYS = ['cw.operative.v1','cw.ascension.v1',PROFILE_KEY,'cw.net.v1','cw.ascension.city.v1'];
  function applyRestore(writes) {
    var before = {};
    RESTORE_KEYS.forEach(function(key){ before[key] = localStorage.getItem(key); });
    // A small write-ahead journal makes a tab closure between synchronous writes recoverable.
    localStorage.setItem('cw.ascension.restore.backup.v1', JSON.stringify({version:1,at:new Date().toISOString(),values:before}));
    localStorage.setItem('cw.ascension.restore.pending.v1', JSON.stringify({version:1,before:before}));
    try {
      RESTORE_KEYS.forEach(function(key){ localStorage.setItem(key, JSON.stringify(writes[key])); });
      localStorage.removeItem('cw.ascension.restore.pending.v1');
    } catch (error) {
      var restored = true;
      RESTORE_KEYS.forEach(function(key){ try { if (before[key] === null) localStorage.removeItem(key); else localStorage.setItem(key,before[key]); } catch (_) { restored = false; } });
      if (restored) localStorage.removeItem('cw.ascension.restore.pending.v1');
      throw new Error(restored ? 'Storage could not hold this save. The previous progress was restored.' : 'Storage is unavailable. The recovery journal is retained; export the current session before leaving.');
    }
  }
  function recoverRestore() {
    try {
      var pending = read('cw.ascension.restore.pending.v1', null);
      if (!pending || pending.version !== 1 || !pending.before) return;
      if (!Object.prototype.hasOwnProperty.call(pending.before,'cw.ascension.city.v1')) pending.before['cw.ascension.city.v1'] = null;
      if (!RESTORE_KEYS.every(function(key){ return pending.before[key] === null || typeof pending.before[key] === 'string' && pending.before[key].length <= 262144; })) return;
      RESTORE_KEYS.forEach(function(key){ if (pending.before[key] === null) localStorage.removeItem(key); else localStorage.setItem(key,pending.before[key]); });
      localStorage.removeItem('cw.ascension.restore.pending.v1');
      window.__cwGameplay.refresh();
      if (campaign() && campaign().reloadState) campaign().reloadState();
      if (window.__cwCity) window.__cwCity.reloadState();
      toast('Previous progress recovered after an interrupted import.');
    } catch (_) { text('cwas-save-status','RESTORE PENDING — EXPORT BEFORE LEAVING'); }
  }
  async function importSave(event) {
    var file = event.target.files && event.target.files[0]; if (!file) return;
    try {
      if (file.size > 262144) throw new Error('Save file exceeds 256 KB.');
      var data = JSON.parse(await file.text());
      if (data.format !== 'cyberworld-ascension' || data.version !== 1) throw new Error('Use an Ascension version 1 save.');
      var op = cleanOperative(data.operative);
      if (!campaign() || typeof campaign().validateState !== 'function') throw new Error('Campaign import is still loading.');
      if (!campaign().validateState(data.campaign)) throw new Error('Campaign save is invalid.');
      if (data.city && (!window.__cwCity || !window.__cwCity.validateState(data.city))) throw new Error('City save is invalid.');
      var path = op.flags.path, spec = PATHS[path];
      var profile = { version: 1, callsign: op.callsign, path: path, faction: spec.faction, color: op.look.suit || '#48ffd5' };
      var writes = {}; writes['cw.operative.v1'] = op; writes['cw.ascension.v1'] = data.campaign; writes[PROFILE_KEY] = profile;
      writes['cw.net.v1'] = Object.assign({}, read('cw.net.v1', {}), { callsign: profile.callsign, faction: profile.faction });
      writes['cw.ascension.city.v1'] = data.city || (window.__cwCity && window.__cwCity.state());
      applyRestore(writes);
      inMemoryProfile = profile;
      if (window.__cwGameplay.replaceState) window.__cwGameplay.replaceState(op); else window.__cwGameplay.refresh();
      campaign().importState(data.campaign); if (campaign().syncRewards) campaign().syncRewards(); closeModal(); enterWorld(profile); toast('Progress restored. Your previous save was backed up.');
      if (window.__cwCity) window.__cwCity.reloadState();
    } catch (error) { toast('Import stopped: ' + error.message); }
  }
  function updateHud() {
    if (phase !== 'playing' || !window.__cwGameplay) return;
    var op = window.__cwGameplay.state(), profile = currentProfile(), snap = window.__cwWorld.snapshot();
    text('cwas-callsign', op.callsign); text('cwas-monogram', op.callsign.charAt(0)); text('cwas-rank', (PATHS[profile.path] || PATHS.soc).label + ' / ' + profile.faction);
    var levelNumber = String(op.level).padStart(2, '0');
    if ($('cwas-level').dataset.level !== levelNumber) { $('cwas-level').textContent = levelNumber; $('cwas-level').dataset.level = levelNumber; }
    // The nested LEVEL label is recreated only when the numeric level changes.
    var levelEl = $('cwas-level'); if (!levelEl.querySelector('small')) { var small = document.createElement('small'); small.textContent = 'LEVEL'; levelEl.appendChild(small); }
    $('cwas-xp-fill').style.width = Math.min(100, op.xp / Math.floor(100 * Math.pow(1.35, op.level - 1)) * 100) + '%';
    var zone = snap.district || snap.view, name = NAMES[zone] || 'THE GRID'; text('cwas-location-name', name); text('cwas-zone', name);
    document.querySelectorAll('[data-district]').forEach(function (button) { button.classList.toggle('active', button.dataset.district === zone); });
    var state = campaign() && campaign().state ? campaign().state() : null;
    if (state) updateObjective(state);
    if (Date.now() - minimapTime > 120) { drawMinimap(snap); minimapTime = Date.now(); }
    if (window.__cwAscensionNet) updatePresence();
  }
  function updateObjective(state) {
    document.body.classList.toggle('cwas-contact-established', !!state.seenZero);
    // The campaign owns its quest state; prefer its presentation API when supplied.
    if (campaign() && campaign().objective) {
      var obj = campaign().objective();
      if (obj) { text('cwas-objective-title', obj.title || 'Codebreaker: Ascension'); text('cwas-objective-copy', obj.description || 'Investigate the first signal.'); text('cwas-step-title', obj.step || 'Open your case file'); text('cwas-step-copy', obj.hint || 'Review the evidence in your Cyberdeck.'); text('cwas-mission-number', obj.index || '01 / 07'); }
    }
    var count = state.completed ? Object.keys(state.completed).length : 0;
    if (count) text('cwas-radio-copy', 'A recovered signal opens another district. Check your case file for the next operation.');
    var over = !!state.overclockActive || !!state.overclockUntil && state.overclockUntil > Date.now();
    document.body.classList.toggle('overclock-active', over);
    text('cwas-overclock-charge', over ? 'NETWORK VISIBLE' : (typeof state.overclock === 'number' ? Math.round(state.overclock) + '% CHARGE' : 'REVEAL THE SIGNAL'));
    if (state.saveOk === false) { text('cwas-save-status','SAVE UNAVAILABLE — EXPORT PROGRESS'); $('cwas-save-status').classList.add('warning'); }
  }
  function updatePresence() {
    var status = window.__cwAscensionNet.status();
    text('cwas-presence-label', status.label || 'SOLO MODE'); $('cwas-presence-dot').classList.toggle('live', !!status.online);
    var list = $('cwas-peer-list');
    if (!list.hidden) { list.replaceChildren(); var peers = window.__cwAscensionNet.peers(); var info = document.createElement('p'); info.textContent = peers.length ? 'Actual connected operatives:' : 'You are the only operative here. Invite another player to this URL.'; list.appendChild(info); peers.slice(0, 12).forEach(function (peer) { var p = document.createElement('p'); p.textContent = peer.callsign + ' / ' + (peer.transport === 'cloud' ? 'LIVE GRID' : 'THIS BROWSER'); list.appendChild(p); }); }
  }
  function drawMinimap(snap) {
    var canvas = $('cwas-minimap'), ctx = canvas.getContext('2d'), width = canvas.width, height = canvas.height;
    ctx.clearRect(0,0,width,height); ctx.fillStyle = '#06121c'; ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = '#12313b'; ctx.lineWidth = 1;
    for (var x = 0; x < width; x += 15) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
    for (var y = 0; y < height; y += 15) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }
    var nodes = (snap.targets || []).filter(function (node) { return node.id !== 'zero' && node.id !== 'byte'; }).map(function (node) { return [(node.x + 50) / 100, (node.z + 50) / 100]; });
    nodes.forEach(function (node, index) { ctx.fillStyle = index === 3 ? '#967244' : '#164b59'; ctx.fillRect(node[0]*width-9,node[1]*height-5,18,10); ctx.strokeStyle = index === 3 ? '#d9a45f' : '#2f7482'; ctx.strokeRect(node[0]*width-9,node[1]*height-5,18,10); });
    var ax = snap.avatar.x / (snap.width || 1)*width, ay = snap.avatar.y / (snap.height || 1)*height;
    ctx.strokeStyle = '#48ffd54d'; ctx.beginPath(); ctx.arc(ax,ay,10,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#48ffd5'; ctx.shadowColor = '#48ffd5'; ctx.shadowBlur = 9; ctx.beginPath(); ctx.arc(ax,ay,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    var meZone = snap.district || snap.view;
    var peers = window.__cwAscensionNet ? window.__cwAscensionNet.peers() : [];
    peers.filter(function (p) { return p.zone === meZone; }).forEach(function (p) { ctx.fillStyle = '#b797ff'; ctx.fillRect(p.x*width-2,p.y*height-2,4,4); });
  }
  function drawPreview() {
    if (phase !== 'creator' || !window.__cwWorld.createPreview) return;
    var path = $('cwas-specialization').value;
    var profile = { color: color, path: path, frame: (PATHS[path] || PATHS.soc).frame };
    if (preview3d) preview3d.update(profile);
    else preview3d = window.__cwWorld.createPreview($('cwas-avatar-preview'), profile);
  }
  function handleKey(event) {
    if (event.key === 'Tab' && !$('cwas-modal').hidden) { trapFocus(event); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (phase !== 'playing') return;
    if (event.key === 'Escape') { event.preventDefault();event.stopImmediatePropagation(); if (!$('cwas-modal').hidden) closeModal(); else openSettings();return; }
    if (!$('cwas-modal').hidden || event.repeat) return;
    var key=event.key.toLowerCase();
    if(key==='tab'){event.preventDefault();event.stopImmediatePropagation();openDeck('missions');}
    else if(key==='h'){event.preventDefault();event.stopImmediatePropagation();toggleHud();}
    else if(key==='q'){event.preventDefault();event.stopImmediatePropagation();if(campaign())campaign().toggleOverclock();}
    else if(key==='j'||key==='i'){event.preventDefault();event.stopImmediatePropagation();openDeck(key==='j'?'journal':'inventory');}
    else if(key==='e'){event.preventDefault();event.stopImmediatePropagation();window.__cwWorld.interact();}
  }
  function trapFocus(event) {
    var nodes=Array.from($('cwas-modal').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]')).filter(function(e){return e.getClientRects().length;});
    if(!nodes.length)return; var first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  var gamepadButtons=[],gamepadActive=false;
  function gamepadTick(){
    if(phase==='playing'&&$('cwas-modal').hidden&&navigator.getGamepads){var pad=Array.from(navigator.getGamepads()).find(Boolean);if(pad){var x=Math.abs(pad.axes[0])>.18?pad.axes[0]:0,y=Math.abs(pad.axes[1])>.18?pad.axes[1]:0;if(x||y||gamepadActive)window.__cwWorld.setMovement(x,y);gamepadActive=!!(x||y);[0,2,3].forEach(function(i){if(pad.buttons[i]&&pad.buttons[i].pressed&&!gamepadButtons[i]){if(i===0)window.__cwWorld.interact();if(i===2&&campaign())campaign().toggleOverclock();if(i===3)openDeck('missions');}gamepadButtons[i]=!!(pad.buttons[i]&&pad.buttons[i].pressed);});}else if(gamepadActive){window.__cwWorld.setMovement(0,0);gamepadActive=false;gamepadButtons=[];}}
    requestAnimationFrame(gamepadTick);
  }
  function boot(){
    if(!window.__cwWorld||!window.__cwGameplay){toast('Game engine could not load. Refresh to retry.');return;}
    recoverRestore();applySettings();var oldBoot=$('cwg-boot');if(oldBoot)oldBoot.classList.add('gone');window.__cwWorld.open();window.__cwWorld.toPlaza();
    $('cwas-continue').hidden=!read(PROFILE_KEY,null)&&!read('cw.operative.v1',null);
    $('cwas-begin').onclick=function(){var profile=read(PROFILE_KEY,null);if(profile){$('cwas-handle').value=profile.callsign;color=profile.color||color;$('cwas-specialization').value=profile.path||'soc';}setPhase('creator');};
    $('cwas-continue').onclick=function(){enterWorld(currentProfile());};
    $('cwas-creator-back').onclick=function(){cancelAnimationFrame(avatarFrame);setPhase('title');};
    $('cwas-creator-form').onsubmit=createOperative;
    $('cwas-handle').oninput=function(){this.setCustomValidity('');};
    document.querySelectorAll('[data-color]').forEach(function(button){button.onclick=function(){color=button.dataset.color;document.querySelectorAll('[data-color]').forEach(function(b){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});drawPreview();};});
    $('cwas-specialization').addEventListener('change',drawPreview);
    document.querySelectorAll('[data-deck]').forEach(function(button){button.onclick=function(){openDeck(button.dataset.deck);};});
    document.querySelectorAll('[data-district]').forEach(function(button){button.onclick=function(){var district=button.dataset.district;if(district==='plaza')window.__cwWorld.toPlaza();else window.__cwWorld.toDistrict(district);updateHud();};});
    $('cwas-objective-open').onclick=function(){if(campaign())campaign().startMission();};
    $('cwas-radio-open').onclick=function(){if(campaign())campaign().talkZero();};
    $('cwas-overclock').onclick=function(){if(campaign())campaign().toggleOverclock();};
    $('cwas-settings').onclick=openSettings;$('cwas-audio').onclick=toggleSound;
    $('cwas-hud-toggle').onclick=toggleHud;
    $('cwas-roster').onclick=function(){$('cwas-peer-list').hidden=!$('cwas-peer-list').hidden;updatePresence();};
    $('cwas-touch-interact').onclick=function(){window.__cwWorld.interact();};
    document.querySelectorAll('[data-move]').forEach(function(button){button.addEventListener('pointerdown',function(e){e.preventDefault();button.setPointerCapture(e.pointerId);var dir=button.dataset.move.split(',').map(Number);window.__cwWorld.setMovement(dir[0],dir[1]);});['pointerup','pointercancel','lostpointercapture'].forEach(function(type){button.addEventListener(type,function(){window.__cwWorld.setMovement(0,0);});});});
    window.addEventListener('blur',function(){window.__cwWorld.setMovement(0,0);});
    document.addEventListener('keydown',handleKey,true);
    window.addEventListener('cw:ascension-state',updateHud);
    document.addEventListener('cw:view',function(e){updateHud();var zone=e.detail&&e.detail.district||e.detail&&e.detail.view;if(phase==='playing'&&zone)save('cw.ascension.position.v1',{zone:zone});});
    if(window.__cwAscensionNet)window.__cwAscensionNet.onChange(updatePresence);
    setInterval(updateHud,300);requestAnimationFrame(gamepadTick);
    registerOfflineRuntime();
  }
  window.__cwAscensionShell={toast:toast,openSettings:openSettings,updateHud:updateHud,exportSave:exportSave};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
