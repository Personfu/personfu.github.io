/* Breach Foundry: original, local-only construct combat and earned souvenirs. */
(function () {
  'use strict';
  var MISSION = 'combat:breach-foundry';
  var REWARD = { xp: 260, credits: 140, item: 'PHASE-GAUNTLET', title: 'Breach Foundry' };
  var ACTIONS = [
    { id: 'strike', key: 'J', name: 'PHASE STRIKE', hint: 'Close-range combo', icon: '⌁' },
    { id: 'burst', key: 'K', name: 'DISRUPT', hint: 'Break nearby shields', icon: '◉' },
    { id: 'dodge', key: 'SPACE', name: 'EVADE', hint: 'Beat the amber tell', icon: '»' },
    { id: 'overclock', key: 'L', name: 'OVERCLOCK', hint: 'Slow the constructs', icon: 'ϟ' }
  ];
  var previousPhase = null, lastEventId = 0, noticeUntil = 0, resultShown = null;
  var latest = null, hud = null, entry = null;
  function $(id) { return document.getElementById(id); }
  function number(value, max) { return Math.max(0, Math.min(max || 999999, Number(value) || 0)); }
  function integer(value, max) { return Math.floor(number(value, max)); }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function playing() { return document.body.dataset.phase === 'playing'; }
  function modalOpen() { return $('cwas-modal') && !$('cwas-modal').hidden; }
  function snapshot() { return window.__cwWorld && window.__cwWorld.snapshot ? window.__cwWorld.snapshot().combat : null; }
  function operative() { return window.__cwGameplay && window.__cwGameplay.state ? window.__cwGameplay.state() : {}; }
  function notify(message) { if ($('cwcombat-feedback')) $('cwcombat-feedback').textContent = message; noticeUntil = performance.now() + 2000; }
  function start() {
    if (!playing() || modalOpen() || !window.__cwWorld || !window.__cwWorld.startCombat) return false;
    previousPhase = null; resultShown = null; lastEventId = 0;
    window.__cwWorld.startCombat(); update();
    if (snapshot()) notify('Move into range. Strike in rhythm; evade when an amber ring appears.');
    return !!snapshot();
  }
  function leave() {
    if (window.__cwWorld && window.__cwWorld.leaveCombat) window.__cwWorld.leaveCombat();
    previousPhase = null; resultShown = null; update();
    if (entry && playing()) entry.focus({ preventScroll: true });
  }
  function action(id) {
    var combat = snapshot();
    if (!playing() || modalOpen() || !combat || combat.phase !== 'active' || !window.__cwWorld.combatAction) return false;
    window.__cwWorld.combatAction(id); update(); return true;
  }
  function best() {
    var value = operative().flags && operative().flags.combatBest;
    return { score: integer(value && value.score, 9999999), wins: integer(value && value.wins, 100000) };
  }
  function recordVictory(combat) {
    var game = window.__cwGameplay;
    if (!game) return false;
    var first = game.completeMission(MISSION, REWARD);
    var op = game.state(), previous = best();
    op.flags = op.flags || {};
    op.flags.combatBest = { score: Math.max(previous.score, integer(combat.score, 9999999)), wins: Math.min(previous.wins + 1, 100000) };
    if (game.replaceState) game.replaceState(op);
    return first;
  }
  function download(name, files) {
    var api = window.CW_ASCENSION_DOWNLOADS;
    if (!api) { notify('The field kit is still loading. Try again.'); return false; }
    api.download(window, name, api.zip(files), 'application/zip'); return true;
  }
  function briefFiles() {
    return [
      { name: 'breach-foundry-field-guide.txt', data: 'CYBERWORLD / BREACH FOUNDRY\nORIGINAL LOCAL SPARRING SIMULATION\n\nClear three construct waves. You can leave freely; defeat does not cost campaign progress or credits.\n\nWASD / ARROWS: move; right-drag: orbit; J / left click: Phase Strike; K: Disrupt; SPACE: Evade; L / Q: Overclock. Touch buttons and the movement pad provide the same actions.\n\nGet close enough to strike. Link successive strikes into a combo. Disrupt nearby shielded constructs. Amber ground rings telegraph attacks; evade out of their reach before the tell finishes. Overclock slows the constructs. Actions consume energy or have cooldowns; watch both meters.\n\nFirst victory: 260 XP, 140 credits and the Phase Gauntlet. Later victories improve your local score record without repeating the gear, XP or credit award.\n\nDEFENSIVE COUNTER\nThese constructs are game fiction, not real hosts. The underlying lesson is layered defense: observe a warning, create separation, contain the affected component and verify recovery. No game action connects to, scans or attacks a real system.\n' },
      { name: 'practice-log.csv', data: 'run,waves_cleared,score,dodges,observation,next_adjustment\r\n1,,,,,\r\n2,,,,,\r\n3,,,,,\r\n' },
      { name: 'defense-counters.json', data: JSON.stringify({ format: 'cyberworld-combat-practice-v1', synthetic: true, controls: { strike: 'J', disrupt: 'K', evade: 'SPACE', overclock: 'L' }, counters: ['Observe independent warning signals.', 'Use separation to avoid a cascading impact.', 'Contain the affected component before restoring the service.', 'Verify the outcome rather than relying on one green indicator.'], live_targets: false }, null, 2) + '\n' }
    ];
  }
  function rewardFiles() {
    var op = operative();
    if (!op.completed || !op.completed[MISSION]) return null;
    var callsign = String(op.callsign || 'LOCAL OPERATIVE').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32) || 'LOCAL OPERATIVE';
    var record = best();
    return [
      { name: 'breach-foundry-badge.svg', data: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#07121b"/><path d="M480 52 666 153 637 359 480 458 323 359 294 153Z" fill="#17253f" stroke="#b797ff" stroke-width="6"/><path d="m492 121-91 141h63l-24 103 119-152h-73Z" fill="#48ffd5"/><text x="480" y="415" text-anchor="middle" fill="#fff" font-family="monospace" font-size="23">BREACH FOUNDRY</text><text x="480" y="511" text-anchor="middle" fill="#48ffd5" font-family="monospace" font-size="25">' + escape(callsign) + '</text><text x="480" y="554" text-anchor="middle" fill="#b797ff" font-family="monospace" font-size="20">PHASE GAUNTLET / THREE WAVES CLEARED</text><text x="480" y="606" text-anchor="middle" fill="#a8bcc9" font-family="monospace" font-size="13">LOCAL GAME ACHIEVEMENT / NO AGENCY AFFILIATION</text></svg>' },
      { name: 'phase-gauntlet-receipt.json', data: JSON.stringify({ format: 'cyberworld-combat-reward-v1', mission: MISSION, callsign: callsign, module: REWARD.item, first_victory_reward: { xp: REWARD.xp, credits: REWARD.credits }, best_score: record.score, local_victories: record.wins, completion: 'recorded-on-this-device', official_certification: false }, null, 2) + '\n' },
      { name: 'foundry-achievement.txt', data: 'CYBERWORLD / BREACH FOUNDRY\n\nOperative: ' + callsign + '\nThree construct waves cleared. Phase Gauntlet earned.\nLocal best score: ' + record.score + '\n\nOriginal CyberWorld game souvenir. This local achievement is not an agency award or professional certification. Repeat runs award score only; the campaign reward is issued once.\n\nDEFENSIVE COUNTER: Observe warnings, create separation, contain affected components and verify the actual outcome. All constructs and actions exist only in the local game simulation.\n' }
    ];
  }
  function rewardDownload() {
    var files = rewardFiles();
    if (!files) return false;
    return download('cyberworld-breach-foundry-reward.zip', files);
  }
  function showResult(combat, firstReward) {
    var won = combat.phase === 'victory', panel = $('cwcombat-result');
    panel.innerHTML = '<div class="cwcombat-result-card"><span class="cwas-eyebrow">' + (won ? 'THREE WAVES / CONTAINED' : 'SIMULATION / RECONNECT') + '</span><h2 id="cwcombat-result-title">' + (won ? 'FOUNDRY SECURED.' : 'SIGNAL INTERRUPTED.') + '</h2><p>' + (won ? 'You read the tells, broke the shields and cleared the construct swarm.' : 'Your campaign progress and equipment are safe. Try spacing out your strikes and evade the amber attack rings.') + '</p><dl class="cwcombat-result-stats"><div><dt>SCORE</dt><dd>' + integer(combat.score, 9999999) + '</dd></div><div><dt>CONSTRUCTS</dt><dd>' + integer(combat.kills, 999) + '</dd></div><div><dt>BEST</dt><dd>' + best().score + '</dd></div></dl><p class="cwcombat-reward-copy">' + (won ? firstReward ? 'FIRST VICTORY · +260 XP · +140 CREDITS · PHASE GAUNTLET' : 'REPEAT VICTORY · SCORE RECORD UPDATED · NO REPEAT XP, CREDITS OR GEAR' : 'NO CREDIT LOSS · YOUR NEXT RUN STARTS AT FULL STRENGTH') + '</p><div class="cwcombat-result-actions"><button type="button" id="cwcombat-retry">' + (won ? 'RUN IT AGAIN' : 'RETRY / FULL HEALTH') + '</button><button type="button" id="cwcombat-return">RETURN TO THE CITY</button>' + (won ? '<button type="button" id="cwcombat-reward">DOWNLOAD BADGE + GAUNTLET RECEIPT</button>' : '') + '</div><p class="cwcombat-lesson">DEFENSIVE COUNTER / Observe warnings, create separation, contain the affected component, then verify recovery. Original local game simulation.</p></div>';
    panel.hidden = false; $('cwcombat-retry').onclick = start; $('cwcombat-return').onclick = leave;
    if ($('cwcombat-reward')) $('cwcombat-reward').onclick = rewardDownload;
    $('cwcombat-retry').focus({ preventScroll: true });
  }
  function update() {
    if (!hud) return;
    var combat = snapshot(), active = playing() && !!combat;
    latest = combat; hud.hidden = !active; document.body.classList.toggle('cwas-in-combat', active);
    if (!active) { previousPhase = null; resultShown = null; return; }
    var health = number(combat.health, 100), energy = number(combat.energy, 100);
    $('cwcombat-health').value = health; $('cwcombat-health').setAttribute('aria-valuetext', Math.ceil(health) + ' of 100 health');
    $('cwcombat-energy').value = energy; $('cwcombat-energy').setAttribute('aria-valuetext', Math.floor(energy) + ' of 100 energy');
    $('cwcombat-health-value').textContent = Math.ceil(health); $('cwcombat-energy-value').textContent = Math.floor(energy);
    $('cwcombat-wave').textContent = integer(combat.wave, 3) + ' / 3';
    $('cwcombat-score').textContent = integer(combat.score, 9999999);
    $('cwcombat-combo').textContent = '×' + Math.max(1, integer(combat.combo, 3));
    var enemies = Array.isArray(combat.enemies) ? combat.enemies : [];
    $('cwcombat-enemies').textContent = enemies.filter(function (enemy) { return enemy.hp > 0 && enemy.phase !== 'dead'; }).length;
    $('cwcombat-stage').textContent = combat.phase === 'ready' ? 'NEXT WAVE / GET READY' : combat.phase === 'active' ? 'BREACH FOUNDRY / LIVE' : 'BREACH FOUNDRY / ' + combat.phase.toUpperCase();
    ACTIONS.forEach(function (item) {
      var button = $('cwcombat-' + item.id), remaining = number(combat.cooldowns && combat.cooldowns[item.id], 120);
      var cost = { strike: 0, burst: 30, dodge: 18, overclock: 35 }[item.id];
      button.disabled = combat.phase !== 'active' || remaining > 0 || energy < cost;
      button.querySelector('small').textContent = remaining > 0 ? remaining.toFixed(1) + 's RECHARGING' : energy < cost ? 'NEEDS ' + cost + ' ENERGY' : item.hint;
      button.classList.toggle('cwcombat-charged', item.id === 'overclock' && number(combat.overclockUntil) > number(combat.time));
    });
    var events = Array.isArray(combat.events) ? combat.events : [];
    var event = events.filter(function (item) { return item.id > lastEventId; }).pop();
    if (event) {
      lastEventId = event.id;
      var messages = { hit: 'PHASE STRIKE / CONTACT', kill: 'CONSTRUCT CONTAINED', combo: 'COMBO LINKED / KEEP THE RHYTHM', miss: 'OUT OF RANGE / CLOSE THE DISTANCE', burst: 'DISRUPT / SHIELDS BREAK', dodge: 'EVADE / CREATE SEPARATION', overclock: 'OVERCLOCK / READ THE OPENING', 'wave-clear': 'WAVE CONTAINED / RECOVERING ENERGY' };
      if (messages[event.type]) notify(messages[event.type]);
    }
    if (performance.now() > noticeUntil) $('cwcombat-feedback').textContent = combat.phase === 'ready' ? 'A fresh wave is forming. Reposition before the constructs arrive.' : 'WASD move · Right-drag orbit · Amber ring? EVADE before it lands.';
    var ended = combat.phase === 'victory' || combat.phase === 'defeat';
    if (ended && previousPhase !== combat.phase && resultShown !== combat.phase) {
      var firstReward = combat.phase === 'victory' ? recordVictory(combat) : false;
      resultShown = combat.phase; showResult(combat, firstReward);
    } else if (!ended) $('cwcombat-result').hidden = true;
    previousPhase = combat.phase;
  }
  function boot() {
    if ($('cwcombat-hud')) return;
    var field = $('cwas-field-open');
    if (!field) return;
    entry = document.createElement('button'); entry.id = 'cwas-combat-open'; entry.type = 'button'; entry.className = 'cwas-text-button';
    entry.innerHTML = 'BREACH FOUNDRY / COMBAT <span>↗</span>'; entry.onclick = start; field.after(entry);
    hud = document.createElement('section'); hud.id = 'cwcombat-hud'; hud.hidden = true; hud.setAttribute('aria-label', 'Breach Foundry combat');
    hud.innerHTML = '<div class="cwcombat-status"><div class="cwcombat-status-heading"><div><span class="cwas-eyebrow" id="cwcombat-stage">BREACH FOUNDRY</span><h1>HOLD THE LINE.</h1></div><button type="button" id="cwcombat-exit" aria-label="Leave combat arena">LEAVE ↗</button></div><div class="cwcombat-vital"><label for="cwcombat-health">INTEGRITY <b id="cwcombat-health-value">100</b></label><progress id="cwcombat-health" max="100" value="100">100</progress></div><div class="cwcombat-vital cwcombat-energy"><label for="cwcombat-energy">ENERGY <b id="cwcombat-energy-value">100</b></label><progress id="cwcombat-energy" max="100" value="100">100</progress></div><div class="cwcombat-counts"><span>WAVE <b id="cwcombat-wave">1 / 3</b></span><span>HOSTILES <b id="cwcombat-enemies">0</b></span><span>COMBO <b id="cwcombat-combo">×1</b></span><span>SCORE <b id="cwcombat-score">0</b></span></div></div><div class="cwcombat-bottom"><p id="cwcombat-feedback" role="status" aria-live="polite"></p><div class="cwcombat-actions" aria-label="Combat abilities">' + ACTIONS.map(function (item) { return '<button type="button" id="cwcombat-' + item.id + '" data-combat-action="' + item.id + '"><kbd>' + item.key + '</kbd><span class="cwcombat-action-icon" aria-hidden="true">' + item.icon + '</span><strong>' + item.name + '</strong><small>' + item.hint + '</small></button>'; }).join('') + '</div><button type="button" id="cwcombat-brief">DOWNLOAD PRACTICE KIT / ZIP</button></div><div id="cwcombat-result" hidden aria-labelledby="cwcombat-result-title"></div>';
    document.body.appendChild(hud);
    $('cwcombat-exit').onclick = leave;
    $('cwcombat-brief').onclick = function () { download('cyberworld-breach-foundry-practice.zip', briefFiles()); };
    hud.querySelectorAll('[data-combat-action]').forEach(function (button) { button.onclick = function () { action(button.dataset.combatAction); }; });
    // Window capture reaches combat before the shell's J journal and Space keys.
    // Movement and mouse events continue to the 3D world without interception.
    window.addEventListener('keydown', function (event) {
      var combat = snapshot();
      if (!playing() || modalOpen() || !combat || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
      if (combat.phase !== 'active' && event.key === ' ' && event.target.tagName === 'BUTTON') return;
      var id = { j: 'strike', k: 'burst', ' ': 'dodge', l: 'overclock' }[event.key.toLowerCase()];
      if (!id) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) action(id);
    }, true);
    document.addEventListener('cw:action', function (event) { if (event.detail && event.detail.action === 'combat:enter') { event.preventDefault(); start(); } });
    document.addEventListener('cw:combat-state', update);
    window.addEventListener('storage', update);
    setInterval(update, 150);
    window.__cwCombatUI = { start: start, leave: leave, action: action, snapshot: function () { return latest; }, briefFiles: briefFiles, rewardFiles: rewardFiles, downloadReward: rewardDownload };
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}());
