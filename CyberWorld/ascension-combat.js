/* Breach Foundry: original, local-only construct combat and earned souvenirs. */
(function () {
  'use strict';
  var MISSION = 'combat:breach-foundry';
  var REWARD = { xp: 260, credits: 140, item: 'PHASE-GAUNTLET', title: 'Breach Foundry' };
  var BLACKOUT_MISSION = 'combat:blackout-run';
  var BLACKOUT_REWARD = { xp: 180, credits: 90, item: 'RELAY-RUNNER', title: 'Blackout Run' };
  var ACTIONS = [
    { id: 'strike', key: 'HOLD J', name: 'PUNCH', hint: 'Hold to keep punching · free', icon: '⌁' },
    { id: 'burst', key: 'K', name: 'BURST', hint: 'Push nearby bots away', icon: '◉' },
    { id: 'dodge', key: 'SPACE', name: 'DODGE', hint: 'Escape the amber circle', icon: '»' },
    { id: 'overclock', key: 'L', name: 'SLOW TIME', hint: 'Give yourself a breather', icon: 'ϟ' }
  ];
  var previousPhase = null, noticeUntil = 0, resultShown = null, lastImpactId = 0, impactUntil = 0, previousHealth = null;
  var latest = null, hud = null, entry = null, prep = null, preparing = null, difficulty = 'rookie', holdTimer = null, holdSource = null;
  var PACES = { rookie: { title: 'Rookie', description: 'Recommended · Four slower bots, three short rounds, extra health and plenty of time to react.' }, practice: { title: 'Practice', description: 'One still training bot that never hits back. A safe first win. No arena gear.' }, standard: { title: 'Standard', description: 'The original eight-bot challenge. Faster attacks, less recovery time. Full arena reward.' } };
  PACES.blackout = { title: 'Blackout Run', description: 'Intercept the breach, contain the malware constructs and restore the relay.' };
  function $(id) { return document.getElementById(id); }
  function number(value, max) { return Math.max(0, Math.min(max || 999999, Number(value) || 0)); }
  function integer(value, max) { return Math.floor(number(value, max)); }
  function put(id, value) { var node = $(id); if (node && node.textContent !== String(value)) node.textContent = value; }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function playing() { return document.body.dataset.phase === 'playing'; }
  function modalOpen() { return $('cwas-modal') && !$('cwas-modal').hidden; }
  function snapshot() { return window.__cwWorld && window.__cwWorld.snapshot ? window.__cwWorld.snapshot().combat : null; }
  function operative() { return window.__cwGameplay && window.__cwGameplay.state ? window.__cwGameplay.state() : {}; }
  function notify(message) { put('cwcombat-feedback', message); noticeUntil = performance.now() + 2000; }
  function start(options) {
    if (!playing() || modalOpen() || !window.__cwWorld || !window.__cwWorld.startCombat) return false;
    if (options && Object.prototype.hasOwnProperty.call(PACES, options.difficulty)) difficulty = options.difficulty;
    return openPrep(false);
  }
  function stopHold() { if (holdTimer) clearInterval(holdTimer); holdTimer = null; holdSource = null; }
  function holdPunch(source) {
    stopHold(); holdSource = source; action('strike');
    holdTimer = setInterval(function () {
      var combat = snapshot();
      if (!combat || combat.phase !== 'active' || preparing || modalOpen() || !playing() || document.hidden) { stopHold(); return; }
      if (!combat.cooldowns || combat.cooldowns.strike <= 0) action('strike');
    }, 70);
  }
  function hidePrep() { preparing = null; if (prep) prep.hidden = true; document.body.classList.remove('cwas-combat-preparing'); }
  function openPrep(resume) {
    if (!playing() || modalOpen()) return false;
    stopHold();
    var combat = snapshot();
    if (resume && combat && Object.prototype.hasOwnProperty.call(PACES, combat.difficulty)) difficulty = combat.difficulty;
    preparing = resume && combat && combat.phase === 'active' ? 'resume' : 'start';
    if (preparing === 'start' && combat) window.__cwWorld.leaveCombat();
    prep.hidden = false; document.body.classList.add('cwas-combat-preparing');
    var blackout = difficulty === 'blackout';
    prep.classList.toggle('cwcombat-blackout-brief', blackout);
    $('cwcombat-prep-title').textContent = preparing === 'resume' ? 'Mission paused.' : blackout ? 'BLACKOUT RUN' : 'Try a few moves.';
    $('cwcombat-prep-copy').textContent = preparing === 'resume' ? 'Action paused. Nothing can hit you while this guide is open. Your progress is right where you left it.' : blackout ? 'The city relay is under attack. Break through the rogue constructs, shatter their shields and bring the signal back. A short action mission — no technical knowledge needed.' : 'This is a friendly sparring space. Nothing starts until you press Start. You can leave or try again without losing anything.';
    $('cwcombat-mission-brief').hidden = !blackout;
    $('cwcombat-prep-kit').textContent = blackout ? 'Download mission brief / ZIP' : 'Download the move guide / ZIP';
    $('cwcombat-pace-options').hidden = preparing === 'resume' || blackout;
    var radio = prep.querySelector('[value="' + difficulty + '"]'); if (radio) radio.checked = true;
    $('cwcombat-prep-back').textContent = preparing === 'resume' ? 'Leave this match' : 'Not right now';
    updateStartLabel(); update(); $('cwcombat-prep-start').focus({ preventScroll: true }); return true;
  }
  function updateStartLabel() {
    var selected = prep.querySelector('[name="cwcombat-pace"]:checked');
    if (selected && difficulty !== 'blackout') difficulty = selected.value;
    $('cwcombat-prep-start').textContent = preparing === 'resume' ? 'Back to the action' : difficulty === 'blackout' ? 'START BLACKOUT RUN' : 'Start ' + PACES[difficulty].title + ' sparring';
  }
  function beginFight() {
    var resume = preparing === 'resume'; updateStartLabel(); hidePrep();
    if (resume) { update(); return true; }
    previousPhase = null; resultShown = null; lastImpactId = 0; previousHealth = null; impactUntil = 0;
    window.__cwWorld.startCombat({ difficulty: difficulty }); update();
    if (snapshot()) notify(difficulty === 'blackout' ? 'Protect the relay. Hold J / Punch to close in; Space dodges incoming attacks.' : 'Start with Punch. Hold J or the Punch button — you can keep moving.');
    return !!snapshot();
  }
  function leave() {
    stopHold(); hidePrep();
    if (snapshot() && window.__cwWorld && window.__cwWorld.leaveCombat) window.__cwWorld.leaveCombat();
    previousPhase = null; resultShown = null; update();
    if (entry && playing()) entry.focus({ preventScroll: true });
  }
  function action(id) {
    var combat = snapshot();
    if (!playing() || preparing || modalOpen() || !combat || combat.phase !== 'active' || !window.__cwWorld.combatAction) return false;
    window.__cwWorld.combatAction(id); update(); return true;
  }
  function best() {
    var value = operative().flags && operative().flags.combatBest;
    return { score: integer(value && value.score, 9999999), wins: integer(value && value.wins, 100000) };
  }
  function recordVictory(combat) {
    var game = window.__cwGameplay;
    if (game && combat.difficulty === 'blackout') return combat.objective && combat.objective.relayRestored === true ? game.completeMission(BLACKOUT_MISSION, BLACKOUT_REWARD) : false;
    if (!game || combat.eligibleReward === false || combat.difficulty === 'practice') return false;
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
      { name: 'breach-foundry-field-guide.txt', data: 'CYBERWORLD / FRIENDLY SPARRING GUIDE\nORIGINAL LOCAL GAME SIMULATION\n\nChoose your pace before anything starts. Rookie is recommended: four slower bots over three rounds, with extra health and recovery. Practice has one still bot that never attacks. Standard keeps the original eight-bot challenge. You may pause with Help, leave or retry without losing progress or credits.\n\nSTART SIMPLE\n1. Move closer with WASD, arrow keys or the movement pad.\n2. Hold J or the Punch button to keep punching. Punching is free. A left click also punches.\n3. See an amber circle under you? Step away or press Space / Dodge.\n\nOPTIONAL MOVES\nK / Burst pushes nearby bots away and breaks shields. L or Q / Slow time gives you a breather. These moves spend energy, which returns on its own. Right-drag changes the view; scroll zooms.\n\nClear Rookie or Standard to earn 260 XP, 140 credits and the Phase Gauntlet once. Repeat wins improve your local score without repeating gear, XP or credits. Practice offers a small downloadable practice note, never the arena reward.\n\nDEFENSIVE COUNTER\nObserve warnings, create separation, contain affected components, then verify recovery. All bots and actions are local game fiction. Nothing connects to, scans or attacks a real system.\n' },
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
  function practiceFiles() {
    var combat = snapshot();
    if (!combat || combat.phase !== 'victory' || combat.difficulty !== 'practice' || combat.eligibleReward !== false) return null;
    return [{ name: 'first-moves-practice-note.txt', data: 'CYBERWORLD / YOUR FIRST MOVES\n\nNice work! You completed a no-pressure practice round.\nBots defeated: ' + integer(combat.kills, 99) + '\n\nNo Phase Gauntlet or arena reward was issued for this practice. The separate welcome achievement awards a Training Token once. This is an original local game souvenir, not a certification.\n\nWhen you feel ready, try Rookie sparring. You can pause, leave or try again at any time.\n' }];
  }
  function blackoutFiles() {
    var op = operative();
    if (!op.completed || !op.completed[BLACKOUT_MISSION]) return null;
    var callsign = String(op.callsign || 'RELAY RUNNER').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32);
    var combat = snapshot(), run = combat && combat.difficulty === 'blackout' && combat.phase === 'victory' ? combat : null;
    return [
      { name: 'relay-runner-receipt.json', data: JSON.stringify({ format: 'cyberworld-blackout-reward-v1', mission: BLACKOUT_MISSION, callsign: callsign, item: BLACKOUT_REWARD.item, xp: BLACKOUT_REWARD.xp, credits: BLACKOUT_REWARD.credits, reward_frequency: 'first-completion-only', completion: 'recorded-on-this-device', official_certification: false }, null, 2) + '\n' },
      { name: 'blackout-run-mission-report.json', data: JSON.stringify({ format: 'cyberworld-blackout-mission-v1', mission: BLACKOUT_MISSION, synthetic: true, local_achievement: true, stages: ['Intercept breach', 'Break malware shield', 'Restore relay'], relay_restored: true, score: run ? integer(run.score, 9999999) : null, targets_defeated: 6, lesson: 'Observe the warning, contain the affected component and verify recovery. Every construct and action is fictional local game state.' }, null, 2) + '\n' },
      { name: 'blackout-run-badge.svg', data: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#06111e"/><path d="M480 48 670 151 640 371 480 465 320 371 290 151Z" fill="#102d3b" stroke="#72ffd4" stroke-width="6"/><path d="M480 125v165m-100-65 100 65 100-65" fill="none" stroke="#64d9ff" stroke-width="15"/><g fill="#72ffd4"><circle cx="380" cy="225" r="20"/><circle cx="480" cy="125" r="20"/><circle cx="580" cy="225" r="20"/><circle cx="480" cy="300" r="27"/></g><text x="480" y="405" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="31">RELAY RUNNER</text><text x="480" y="512" text-anchor="middle" fill="#72ffd4" font-family="monospace" font-size="24">' + escape(callsign) + '</text><text x="480" y="556" text-anchor="middle" fill="#b8d9e6" font-family="monospace" font-size="19">BLACKOUT RUN / SIGNAL RESTORED</text><text x="480" y="609" text-anchor="middle" fill="#9fc4d3" font-family="monospace" font-size="13">ORIGINAL LOCAL GAME ACHIEVEMENT / NO AGENCY AFFILIATION</text></svg>' }
    ];
  }
  function blackoutBriefFiles() {
    return [{ name: 'blackout-run-brief.txt', data: 'CYBERWORLD / BLACKOUT RUN\nORIGINAL LOCAL ACTION MISSION\n\nPROTECT THE RELAY\n1. Intercept the breach.\n2. Break the malware shield.\n3. Contain the final constructs and restore the signal.\n\nWASD / arrows move. Shift sprints. Hold J / Punch to strike and close in on nearby targets; a left click also strikes. Space dodges the amber attack tells. K / Burst breaks shields. L / Slow time gives you a breather. Energy returns automatically.\n\nNo technical knowledge is required. Help pauses the action. You can leave or retry without losing credits or campaign progress. The first completed run awards 180 XP, 90 credits and Relay Runner once. Every system and construct is fictional local game state; nothing attacks real hosts.\n' }];
  }
  function showBlackoutResult(combat, firstReward) {
    var won = combat.phase === 'victory', panel = $('cwcombat-result');
    panel.innerHTML = '<div class="cwcombat-result-card cwcombat-mission-result"><span class="cwas-eyebrow">BLACKOUT RUN / ' + (won ? 'MISSION COMPLETE' : 'RECONNECT') + '</span><h2 id="cwcombat-result-title">' + (won ? 'SIGNAL RESTORED.' : 'ONE MORE RUN?') + '</h2><p>' + (won ? 'You intercepted the breach, broke the malware shield and brought the city relay back online.' : 'The relay still needs you. Your progress and equipment are safe. Dodge the amber tells and use Burst against shields.') + '</p><dl class="cwcombat-result-stats"><div><dt>SCORE</dt><dd>' + integer(combat.score, 9999999) + '</dd></div><div><dt>THREATS CONTAINED</dt><dd>' + integer(combat.kills, 6) + ' / 6</dd></div><div><dt>STAGES</dt><dd>' + (won ? '3 / 3' : integer(combat.objective && combat.objective.stage, 3) + ' / 3') + '</dd></div></dl><p class="cwcombat-reward-copy">' + (won ? firstReward ? '+180 XP · +90 CREDITS · RELAY-RUNNER EARNED' : 'Replay complete. Your Relay Runner reward was already issued; no duplicate XP, credits or gear.' : 'No credit loss. Restart at full health.') + '</p><div class="cwcombat-result-actions"><button type="button" id="cwcombat-retry">' + (won ? 'PLAY BLACKOUT AGAIN' : 'RETRY BLACKOUT RUN') + '</button><button type="button" id="cwcombat-return">EXPLORE THE CITY</button>' + (won ? '<button type="button" id="cwcombat-blackout-reward">DOWNLOAD MISSION BADGE + RECEIPT</button>' : '') + '</div><p class="cwcombat-lesson">Original local action mission. All constructs and systems exist only in the game.</p></div>';
    panel.hidden = false; $('cwcombat-retry').onclick = function () { start({ difficulty: 'blackout' }); }; $('cwcombat-return').onclick = leave;
    if ($('cwcombat-blackout-reward')) $('cwcombat-blackout-reward').onclick = function () { var files = blackoutFiles(); if (files) download('cyberworld-blackout-run-reward.zip', files); };
    $('cwcombat-retry').focus({ preventScroll: true });
  }
  function showResult(combat, firstReward) {
    stopHold();
    if (Object.prototype.hasOwnProperty.call(PACES, combat.difficulty)) difficulty = combat.difficulty;
    if (combat.difficulty === 'blackout') { showBlackoutResult(combat, firstReward); return; }
    var won = combat.phase === 'victory', practice = combat.difficulty === 'practice', panel = $('cwcombat-result');
    panel.innerHTML = '<div class="cwcombat-result-card"><span class="cwas-eyebrow">' + escape(combat.label || PACES[difficulty].title) + ' SPARRING</span><h2 id="cwcombat-result-title">' + (won ? practice ? 'First moves. Nice work!' : 'You did it!' : 'Good try. Another go?') + '</h2><p>' + (won ? practice ? 'You tried the moves in a safe space. There is no rush to take on more.' : 'You beat every bot. Take a moment to enjoy your win.' : 'All your progress is safe. Try holding Punch, and move away when the ground turns amber. Rookie offers more time to react.') + '</p><dl class="cwcombat-result-stats"><div><dt>SCORE</dt><dd>' + integer(combat.score, 9999999) + '</dd></div><div><dt>BOTS BEATEN</dt><dd>' + integer(combat.kills, 999) + '</dd></div><div><dt>' + (practice ? 'PACE' : 'BEST SCORE') + '</dt><dd>' + (practice ? 'Easy' : best().score) + '</dd></div></dl><p class="cwcombat-reward-copy">' + (won ? practice ? 'Practice complete. Your first-moves note is ready to keep. The full arena reward waits for Rookie or Standard.' : firstReward ? 'FIRST WIN · +260 XP · +140 CREDITS · PHASE GAUNTLET' : 'Your score record is updated. No repeat XP, credits or gear — you already earned the arena reward.' : 'No credit loss. Your next match starts at full health.') + '</p><div class="cwcombat-result-actions"><button type="button" id="cwcombat-retry">' + (won ? 'Choose pace & play again' : 'Choose pace & try again') + '</button><button type="button" id="cwcombat-return">Back to the city</button>' + (won ? practice ? '<button type="button" id="cwcombat-practice-reward">Keep my first-moves note</button>' : '<button type="button" id="cwcombat-reward">Download my badge & reward receipt</button>' : '') + '</div><p class="cwcombat-lesson">Original local game simulation. No real systems are involved.</p></div>';
    panel.hidden = false; $('cwcombat-retry').onclick = start; $('cwcombat-return').onclick = leave;
    if ($('cwcombat-reward')) $('cwcombat-reward').onclick = rewardDownload;
    if ($('cwcombat-practice-reward')) $('cwcombat-practice-reward').onclick = function () { var files = practiceFiles(); if (files) download('cyberworld-first-moves.zip', files); };
    $('cwcombat-retry').focus({ preventScroll: true });
  }
  function update() {
    if (!hud) return;
    var combat = snapshot(), active = playing() && !!combat;
    latest = combat; hud.hidden = !active || !!preparing; document.body.classList.toggle('cwas-in-combat', active);
    var blackout = active && combat.difficulty === 'blackout';
    document.body.classList.toggle('cwas-blackout-combat', blackout); hud.classList.toggle('cwcombat-blackout', blackout);
    $('cwcombat-objective').hidden = !blackout; $('cwcombat-reticle').hidden = !blackout || combat.phase !== 'active';
    if (!active || preparing || modalOpen() || document.hidden) stopHold();
    if (!active) { previousPhase = null; resultShown = null; previousHealth = null; $('cwcombat-impact').hidden = true; return; }
    var maxHealth = number(combat.maxHealth || 100, 1000), health = number(combat.health, maxHealth), energy = number(combat.energy, 100);
    hud.classList.toggle('cwcombat-simple', combat.difficulty !== 'standard');
    $('cwcombat-status-title').textContent = blackout ? 'Protect the relay' : 'You’ve got this.';
    if (blackout) {
      var objective = combat.objective || {}, stage = Math.max(1, integer(objective.stage || combat.wave, 3));
      put('cwcombat-objective-title', objective.completed ? 'Signal restored' : objective.title || 'Intercept the breach');
      put('cwcombat-current-goal', objective.completed ? 'Relay online. All routes restored.' : objective.stageComplete ? 'Stage clear. The next threat is forming — keep moving.' : objective.instruction || 'Intercept the constructs before they take the relay.');
      $('cwcombat-objective-count').textContent = stage + ' / 3';
      $('cwcombat-stage-track').querySelectorAll('[data-stage]').forEach(function (step) {
        var index = Number(step.dataset.stage); step.classList.toggle('is-current', index === stage && !objective.completed); step.classList.toggle('is-done', index < stage || objective.completed === true);
        if (index === stage && !objective.completed) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
      });
    }
    $('cwcombat-health').max = maxHealth; $('cwcombat-health').value = health; $('cwcombat-health').textContent = Math.ceil(health); $('cwcombat-health').setAttribute('aria-valuetext', Math.ceil(health) + ' of ' + maxHealth + ' health');
    $('cwcombat-energy').value = energy; $('cwcombat-energy').setAttribute('aria-valuetext', Math.floor(energy) + ' of 100 energy');
    $('cwcombat-health-value').textContent = Math.ceil(health) + ' / ' + maxHealth; $('cwcombat-energy-value').textContent = Math.floor(energy);
    $('cwcombat-wave').textContent = integer(combat.wave, 9) + ' / ' + integer(combat.totalWaves || 3, 9);
    $('cwcombat-defeated').textContent = integer(combat.kills, 999) + ' / ' + integer(combat.totalEnemies || 8, 999);
    $('cwcombat-progress').max = integer(combat.totalEnemies || 8, 999); $('cwcombat-progress').value = integer(combat.kills, 999);
    $('cwcombat-score').textContent = integer(combat.score, 9999999);
    $('cwcombat-combo').textContent = '×' + Math.max(1, integer(combat.combo, 3));
    var enemies = Array.isArray(combat.enemies) ? combat.enemies : [];
    $('cwcombat-enemies').textContent = enemies.filter(function (enemy) { return enemy.hp > 0 && enemy.phase !== 'dead'; }).length;
    $('cwcombat-stage').textContent = (combat.label || PACES[difficulty].title) + (combat.phase === 'active' ? blackout ? ' / MISSION' : ' / SPARRING' : combat.phase === 'victory' ? ' / COMPLETE' : ' / TAKE A BREATHER');
    ACTIONS.forEach(function (item) {
      var button = $('cwcombat-' + item.id), remaining = number(combat.cooldowns && combat.cooldowns[item.id], 120);
      var cost = combat.abilityCosts && combat.abilityCosts[item.id] !== undefined ? combat.abilityCosts[item.id] : { strike: 0, burst: 30, dodge: 18, overclock: 35 }[item.id];
      button.disabled = combat.phase !== 'active' || (item.id !== 'strike' && remaining > 0) || energy < cost;
      button.querySelector('small').textContent = item.id === 'strike' ? item.hint : remaining > 0 ? 'Ready in ' + remaining.toFixed(1) + 's' : energy < cost ? 'Needs ' + cost + ' energy' : item.hint;
      button.classList.toggle('cwcombat-charged', item.id === 'overclock' && number(combat.overclockUntil) > number(combat.time));
    });
    var nearby = enemies.filter(function (enemy) { return enemy.hp > 0; }).sort(function (a, b) { return Math.hypot(a.x - combat.player.x, a.z - combat.player.z) - Math.hypot(b.x - combat.player.x, b.z - combat.player.z); });
    var danger = nearby.some(function (enemy) { return enemy.phase === 'windup' && Math.hypot(combat.player.x - enemy.attackX, combat.player.z - enemy.attackZ) <= enemy.attackRadius; });
    var prompt = danger ? 'Amber circle under you? Step away or press Space / Dodge.' : combat.waveDelay > 0 ? 'Nice work! Catch your breath — the next round is coming.' : !nearby.length ? 'You beat every bot. Nice work!' : Math.hypot(nearby[0].x - combat.player.x, nearby[0].z - combat.player.z) > 3.2 ? 'Walk closer to the blue bot, then hold Punch (J).' : nearby[0].shield > 0 ? 'That bot has a shield. Burst (K) can break it.' : energy < 20 ? 'Energy returns on its own. Punch is always free.' : combat.difficulty === 'practice' ? 'This bot never hits back. Hold Punch or try any move you like.' : 'Hold Punch (J). You can keep moving while you attack.';
    if (blackout) prompt = danger ? 'Amber means impact. Space / Dodge gets you clear.' : combat.waveDelay > 0 ? 'Breach contained. Reconfiguring relay — keep moving.' : nearby[0] && nearby[0].shield > 0 ? 'Break the shield with K / Burst, then finish with Punch.' : 'Hold J / Punch to close in and strike. Shift sprints; Space dodges.';
    if (danger || performance.now() > noticeUntil) put('cwcombat-feedback', prompt);
    $('cwcombat-feedback').classList.toggle('cwcombat-warning', danger);
    var events = Array.isArray(combat.events) ? combat.events : [], fresh = events.filter(function (event) { return event.id > lastImpactId; });
    var impact = fresh.filter(function (event) { return event.type === 'hit' || event.type === 'kill' || event.type === 'combo'; }).pop();
    if (fresh.length) lastImpactId = fresh[fresh.length - 1].id;
    if (blackout && impact) {
      $('cwcombat-impact-value').textContent = impact.type === 'kill' ? 'CONTAINED' : impact.type === 'combo' ? '×3' : impact.damage ? '−' + integer(impact.damage, 999) : 'SHIELD';
      $('cwcombat-impact-copy').textContent = impact.type === 'combo' ? 'FINISHER' : combat.combo >= 2 ? 'COMBO ×' + integer(combat.combo, 3) : impact.type === 'kill' ? 'SIGNAL CLEARED' : 'PHASE STRIKE';
      impactUntil = performance.now() + 650;
    }
    $('cwcombat-impact').hidden = !blackout || performance.now() > impactUntil;
    if (previousHealth !== null && combat.health < previousHealth) { hud.classList.add('cwcombat-hurt'); setTimeout(function () { hud.classList.remove('cwcombat-hurt'); }, 450); }
    previousHealth = combat.health;
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
    entry.innerHTML = 'TRY FRIENDLY SPARRING <span>↗</span>'; entry.onclick = function () { start({ difficulty: 'rookie' }); }; field.after(entry);
    prep = document.createElement('section'); prep.id = 'cwcombat-prep'; prep.hidden = true; prep.setAttribute('role', 'dialog'); prep.setAttribute('aria-modal', 'true'); prep.setAttribute('aria-labelledby', 'cwcombat-prep-title');
    prep.innerHTML = '<div class="cwcombat-prep-card"><span class="cwas-eyebrow">YOUR PACE. YOUR PRACTICE.</span><h1 id="cwcombat-prep-title">Try a few moves.</h1><p id="cwcombat-prep-copy"></p><fieldset id="cwcombat-pace-options"><legend>Choose a pace</legend>' + Object.keys(PACES).map(function (id) { return '<label class="cwcombat-pace"><input type="radio" name="cwcombat-pace" value="' + id + '"' + (id === 'rookie' ? ' checked' : '') + '><span><strong>' + PACES[id].title + '</strong><small>' + PACES[id].description + '</small></span></label>'; }).join('') + '</fieldset><ol class="cwcombat-first-moves"><li><strong>Move closer.</strong> Use WASD, arrows, or the movement pad.</li><li><strong>Hold Punch.</strong> Hold J or the Punch button. Punching is free.</li><li><strong>See amber? Dodge.</strong> Step away or press Space / Dodge.</li></ol><details class="cwcombat-optional"><summary>Other moves, when you feel ready</summary><p><strong>Burst (K)</strong> pushes nearby bots away and breaks shields. <strong>Slow time (L)</strong> gives you a breather. Energy comes back on its own.</p></details><div class="cwcombat-prep-actions"><button type="button" id="cwcombat-prep-start">Start Rookie sparring</button><button type="button" id="cwcombat-prep-back">Not right now</button></div><button type="button" id="cwcombat-prep-kit">Download the move guide / ZIP</button></div>';
    document.body.appendChild(prep);
    var blackoutChoice = prep.querySelector('[name="cwcombat-pace"][value="blackout"]');
    if (blackoutChoice) blackoutChoice.closest('label').remove();
    var missionBrief = document.createElement('ol'); missionBrief.id = 'cwcombat-mission-brief'; missionBrief.hidden = true;
    missionBrief.innerHTML = '<li><span>01</span><strong>INTERCEPT</strong><small>Stop the breach</small></li><li><span>02</span><strong>CONTAIN</strong><small>Break the shield</small></li><li><span>03</span><strong>RESTORE</strong><small>Bring back the signal</small></li>';
    $('cwcombat-prep-copy').after(missionBrief);
    prep.querySelectorAll('[name="cwcombat-pace"]').forEach(function (input) { input.onchange = updateStartLabel; });
    $('cwcombat-prep-start').onclick = beginFight;
    $('cwcombat-prep-back').onclick = leave;
    $('cwcombat-prep-kit').onclick = function () { download(difficulty === 'blackout' ? 'cyberworld-blackout-run-brief.zip' : 'cyberworld-breach-foundry-practice.zip', difficulty === 'blackout' ? blackoutBriefFiles() : briefFiles()); };
    hud = document.createElement('section'); hud.id = 'cwcombat-hud'; hud.hidden = true; hud.setAttribute('aria-label', 'Breach Foundry combat');
    hud.innerHTML = '<div class="cwcombat-status"><div class="cwcombat-status-heading"><div><span class="cwas-eyebrow" id="cwcombat-stage">FRIENDLY SPARRING</span><h1>You’ve got this.</h1></div><button type="button" id="cwcombat-exit" aria-label="Leave combat arena">Leave ↗</button></div><div class="cwcombat-vital"><label for="cwcombat-health">HEALTH <b id="cwcombat-health-value">100</b></label><progress id="cwcombat-health" max="100" value="100">100</progress></div><div class="cwcombat-vital cwcombat-energy"><label for="cwcombat-energy">ENERGY <b id="cwcombat-energy-value">100</b></label><progress id="cwcombat-energy" max="100" value="100">100</progress></div><div class="cwcombat-round-progress"><span>Bots defeated <b id="cwcombat-defeated">0 / 4</b></span><progress id="cwcombat-progress" max="4" value="0" aria-label="Bots defeated"></progress></div><div class="cwcombat-counts"><span>ROUND <b id="cwcombat-wave">1 / 3</b></span><span>BOTS LEFT <b id="cwcombat-enemies">0</b></span><span>COMBO <b id="cwcombat-combo">×1</b></span><span>SCORE <b id="cwcombat-score">0</b></span></div></div><div class="cwcombat-bottom"><p id="cwcombat-feedback" role="status" aria-live="polite"></p><div class="cwcombat-actions" aria-label="Combat abilities">' + ACTIONS.map(function (item) { return '<button type="button" id="cwcombat-' + item.id + '" data-combat-action="' + item.id + '"><kbd>' + item.key + '</kbd><span class="cwcombat-action-icon" aria-hidden="true">' + item.icon + '</span><strong>' + item.name + '</strong><small>' + item.hint + '</small></button>'; }).join('') + '</div><button type="button" id="cwcombat-brief">Help / pause</button></div><div id="cwcombat-result" hidden aria-labelledby="cwcombat-result-title"></div>';
    document.body.appendChild(hud);
    hud.querySelector('.cwcombat-status h1').id = 'cwcombat-status-title';
    hud.insertAdjacentHTML('afterbegin', '<aside id="cwcombat-objective" hidden aria-label="Blackout Run mission"><div><span>PROTECT THE RELAY / STAGE <b id="cwcombat-objective-count">1 / 3</b></span><h2 id="cwcombat-objective-title">Intercept the breach</h2></div><ol id="cwcombat-stage-track"><li data-stage="1"><span>01</span><strong>INTERCEPT</strong></li><li data-stage="2"><span>02</span><strong>CONTAIN</strong></li><li data-stage="3"><span>03</span><strong>RESTORE</strong></li></ol><p id="cwcombat-current-goal" role="status" aria-live="polite">Stop the incoming constructs.</p></aside>');
    hud.insertAdjacentHTML('beforeend', '<div id="cwcombat-reticle" hidden aria-hidden="true"><i></i><b></b></div><div id="cwcombat-impact" hidden aria-live="off"><strong id="cwcombat-impact-value"></strong><small id="cwcombat-impact-copy"></small></div>');
    $('cwcombat-exit').onclick = leave;
    $('cwcombat-brief').onclick = function () { openPrep(true); };
    hud.querySelectorAll('[data-combat-action]').forEach(function (button) { button.onclick = function () { action(button.dataset.combatAction); }; });
    var punch = $('cwcombat-strike');
    punch.onpointerdown = function (event) { if (event.button !== 0 && event.pointerType !== 'touch') return; event.preventDefault(); punch.setPointerCapture(event.pointerId); holdPunch(event.pointerId); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) { punch.addEventListener(name, function (event) { if (holdSource === event.pointerId) stopHold(); }); });
    punch.onclick = function (event) { if (event.detail === 0) action('strike'); };
    // Window capture reaches combat before the shell's J journal and Space keys.
    // Movement and mouse events continue to the 3D world without interception.
    window.addEventListener('keydown', function (event) {
      if (preparing) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); hidePrep(); update(); if (!snapshot()) entry.focus({ preventScroll: true }); return; }
        if (event.key === 'Tab') {
          var focusable = Array.from(prep.querySelectorAll('button,input,summary')).filter(function (node) { return node.getClientRects().length; });
          var first = focusable[0], last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey) event.stopImmediatePropagation();
        return;
      }
      var combat = snapshot();
      if (!playing() || modalOpen() || !combat || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
      if (combat.phase !== 'active' && event.key === ' ' && event.target.tagName === 'BUTTON') return;
      var id = { j: 'strike', k: 'burst', ' ': 'dodge', l: 'overclock' }[event.key.toLowerCase()];
      if (!id) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) { if (id === 'strike' && combat.phase === 'active') holdPunch('key'); else action(id); }
    }, true);
    window.addEventListener('keyup', function (event) { if (event.key.toLowerCase() === 'j' && holdSource === 'key') stopHold(); }, true);
    window.addEventListener('blur', stopHold);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopHold(); });
    document.addEventListener('cw:action', function (event) { if (event.detail && event.detail.action === 'combat:enter') { event.preventDefault(); start(); } });
    document.addEventListener('cw:combat-state', update);
    window.addEventListener('storage', update);
    setInterval(update, 150);
    window.__cwCombatUI = { start: start, leave: leave, action: action, snapshot: function () { return latest; }, briefFiles: briefFiles, rewardFiles: rewardFiles, practiceFiles: practiceFiles, blackoutFiles: blackoutFiles, downloadReward: rewardDownload };
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}());
