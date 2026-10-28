/* Original, browser-local adventures. No prior cybersecurity knowledge required. */
(function (host, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (host && host.document) { host.CW_ROOKIE = api; api.mount(host); }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  var IDS = ['intro', 'sweep', 'courier', 'match', 'practice'];
  var COLORS = { blue: '#49bfff', amber: '#ffbe65', violet: '#b797ff' };
  var PATTERN = ['blue', 'amber', 'violet', 'blue', 'violet'];
  var JOBS = {
    intro: { title: 'First Light', time: '3-minute warm-up', copy: 'Walk, collect three sparks, then light a beacon. We show you every step.', xp: 60, credits: 40, item: 'SPARK-COMPANION', icon: '✦' },
    sweep: { title: 'Spark Sweep', time: '2-minute treasure hunt', copy: 'Find five glowing sparks. Follow the trail; there is no timer.', xp: 70, credits: 35, item: 'SPARK-TRAIL', icon: '◇' },
    courier: { title: 'Drone Delivery', time: '3 short stops', copy: 'A friendly drone needs a guide. Walk it to three marked delivery pads.', xp: 60, credits: 30, item: 'COURIER-PIN', icon: '⌁' },
    match: { title: 'Signal Match', time: '5 easy rounds', copy: 'Read a color name and press the matching button. The clue stays on screen.', xp: 50, credits: 25, item: 'NEON-SWITCH', icon: '◉' },
    practice: { title: 'Safe Sparring', time: 'Learn your moves', copy: 'Punch a harmless training target. It cannot hurt you. Try every ability for free.', xp: 30, credits: 15, item: 'TRAINING-TOKEN', icon: '»' }
  };
  var SPARKS = [[-5, 7], [-7, 10], [-4, 12], [0, 16], [4, 13]];
  var PADS = [[-8, 11], [-4, 17], [5, 15]];
  function integer(v, max) { return Math.max(0, Math.min(max, Math.floor(Number(v) || 0))); }
  function initial() { return { version: 1, intro: 0, sparks: [], active: null, step: 0, collected: [], mistakes: 0, dismissed: false, done: [], records: {} }; }
  function unique(values, allowed) { return Array.isArray(values) ? Array.from(new Set(values.filter(function (v) { return allowed.includes(v); }))) : []; }
  function normalize(value) {
    var s = value && typeof value === 'object' ? value : {}, out = initial();
    out.intro = integer(s.intro, 3); out.sparks = unique(s.sparks, [0, 1, 2]);
    out.active = IDS.slice(0, 4).includes(s.active) ? s.active : null;
    out.step = integer(s.step, 5); out.collected = unique(s.collected, [0, 1, 2, 3, 4]);
    out.mistakes = integer(s.mistakes, 999); out.dismissed = s.dismissed === true; out.done = unique(s.done, IDS);
    IDS.forEach(function (id) { if (s.records && s.records[id]) out.records[id] = { wins: integer(s.records[id].wins, 99999), best: integer(s.records[id].best, 100) }; });
    if (out.intro === 3 && !out.done.includes('intro')) out.intro = 2;
    if (out.intro >= 2 && out.sparks.length < 3) out.intro = 1;
    if (out.intro === 0) out.sparks = [];
    if (out.intro === 1 && out.sparks.length === 3) out.intro = 2;
    if (out.active === 'intro' && out.intro === 3) out.active = null;
    if (out.active === 'courier') out.step = Math.min(out.step, 2);
    if (out.active === 'match') out.step = Math.min(out.step, 4);
    if (out.active === 'sweep' && out.collected.length === 5) out.active = null;
    return out;
  }
  function valid(s) {
    if (!s || s.version !== 1 || typeof s.dismissed !== 'boolean' || (s.active !== null && !IDS.slice(0, 4).includes(s.active))) return false;
    if (Object.keys(s).some(function (key) { return !Object.keys(initial()).includes(key); })) return false;
    if (![s.intro, s.step, s.mistakes].every(Number.isInteger) || s.intro < 0 || s.intro > 3 || s.step < 0 || s.step > 5 || s.mistakes < 0 || s.mistakes > 999) return false;
    if (!Array.isArray(s.done) || !Array.isArray(s.sparks) || !Array.isArray(s.collected) || !s.records || typeof s.records !== 'object' || Array.isArray(s.records)) return false;
    if (s.done.length !== unique(s.done, IDS).length || s.sparks.length !== unique(s.sparks, [0, 1, 2]).length || s.collected.length !== unique(s.collected, [0, 1, 2, 3, 4]).length) return false;
    if ((s.intro === 3 && !s.done.includes('intro')) || (s.intro >= 2 && s.sparks.length !== 3)) return false;
    if ((s.intro === 0 && s.sparks.length) || (s.intro === 1 && s.sparks.length === 3) || (s.active === 'intro' && s.intro === 3)) return false;
    if ((s.active === 'courier' && s.step > 2) || (s.active === 'match' && s.step > 4) || (s.active === 'sweep' && s.collected.length === 5)) return false;
    return Object.keys(s.records).every(function (id) { var r = s.records[id]; return IDS.includes(id) && r && Object.keys(r).length === 2 && Number.isInteger(r.wins) && r.wins >= 0 && r.wins <= 99999 && Number.isInteger(r.best) && r.best >= 0 && r.best <= 100; });
  }
  function result(s, message, finished) { return { state: s, message: message, finished: finished || null }; }
  function finish(s, id) {
    var score = Math.max(10, 100 - s.mistakes * 5), prior = s.records[id] || { wins: 0, best: 0 };
    s.records[id] = { wins: Math.min(99999, prior.wins + 1), best: Math.max(prior.best, score) };
    if (!s.done.includes(id)) s.done.push(id);
    s.active = null; if (id === 'intro') s.intro = 3;
    return result(s, JOBS[id].title + ' complete! You made the city a little brighter.', id);
  }
  function start(value, id) {
    var s = normalize(value); if (!IDS.slice(0, 4).includes(id)) return result(s, 'Choose a quick adventure.');
    s.active = id; s.dismissed = false; s.step = 0; s.collected = []; s.mistakes = 0;
    if (id === 'intro') { s.intro = 0; s.sparks = []; }
    return result(s, 'Follow the glowing trail. Take your time.');
  }
  function targets(value) {
    var s = normalize(value), out = [];
    function target(id, title, position, kind, done, next, color) { out.push({ id: id, title: title, x: position[0], z: position[1], kind: kind, state: done ? 'done' : next ? 'next' : 'todo', color: color || COLORS.blue }); }
    if (s.active === 'intro') {
      if (s.intro === 0) target('intro-welcome', 'START HERE', [-3, 9], 'ring', false, true);
      if (s.intro === 1) SPARKS.slice(0, 3).forEach(function (p, i) { target('intro-spark-' + i, 'SPARK ' + (i + 1), p, 'spark', s.sparks.includes(i), !s.sparks.includes(i), COLORS.amber); });
      if (s.intro === 2) target('rookie-beacon', 'LIGHT THE BEACON', [-5, 15], 'beacon', false, true);
    }
    if (s.active === 'sweep') SPARKS.forEach(function (p, i) { target('sweep-' + i, 'SPARK ' + (i + 1), p, 'spark', s.collected.includes(i), !s.collected.includes(i), COLORS.amber); });
    if (s.active === 'courier') PADS.forEach(function (p, i) { target('courier-' + i, 'DELIVERY ' + (i + 1), p, 'pad', i < s.step, i === s.step, COLORS.violet); });
    if (s.active === 'match') target('rookie-beacon', 'SIGNAL MATCH', [-5, 15], 'beacon', false, true, COLORS[PATTERN[Math.min(4, s.step)]]);
    // One clear next destination, even when several sparks are available.
    var chosen = false; out.forEach(function (t) { if (t.state === 'next') { if (chosen) t.state = 'todo'; else chosen = true; } });
    return out;
  }
  function touch(value, id) {
    var s = normalize(value), t = targets(s).find(function (item) { return item.id === id && item.state !== 'done'; });
    if (!t) return result(s, 'That stop is already done. Follow the next glowing marker.');
    if (id === 'intro-welcome') { s.intro = 1; return result(s, 'Nice! You can move. Walk through three golden sparks to collect them.'); }
    if (id.startsWith('intro-spark-')) { s.sparks.push(Number(id.slice(-1))); if (s.sparks.length === 3) s.intro = 2; return result(s, s.sparks.length === 3 ? 'All three! Follow the trail to the blue beacon.' : 'Spark collected! ' + s.sparks.length + ' of 3.'); }
    if (id.startsWith('sweep-')) { s.collected.push(Number(id.slice(-1))); return s.collected.length === 5 ? finish(s, 'sweep') : result(s, 'Spark collected! ' + s.collected.length + ' of 5.'); }
    if (id.startsWith('courier-')) { if (Number(id.slice(-1)) !== s.step) return result(s, 'Follow the bright delivery pad first.'); s.step++; return s.step === 3 ? finish(s, 'courier') : result(s, 'Delivery made! Your drone is ready for the next stop.'); }
    return result(s, 'The beacon asks for a matching color. You can read the clue for as long as you like.');
  }
  function choose(value, color) {
    var s = normalize(value); if (!(s.active === 'intro' && s.intro === 2) && s.active !== 'match') return result(s, 'Visit the beacon to play.');
    var wanted = s.active === 'intro' ? 'blue' : PATTERN[Math.min(s.step, 4)];
    if (color !== wanted) { s.mistakes = Math.min(999, s.mistakes + 1); return result(s, 'No problem. The clue says ' + wanted.toUpperCase() + '. Choose the button with that word. Nothing is lost.'); }
    if (s.active === 'intro') return finish(s, 'intro');
    s.step++; return s.step >= 5 ? finish(s, 'match') : result(s, 'That is it! Match the next word. ' + s.step + ' of 5 done.');
  }
  function practice(value) { var s = normalize(value); if (s.done.includes('practice')) return result(s, 'Practice complete. Keep trying your moves.'); return finish(s, 'practice'); }
  function guide(value) {
    var s = normalize(value), id = s.active, job = JOBS[id]; if (!job) return null;
    if (id === 'intro') return [
      { title: 'Your first little win', step: 'Walk into the glowing ring', copy: 'Use WASD, arrow keys or the on-screen arrows. You can also click the ground to walk.', progress: 0, total: 3 },
      { title: 'Collect a little light', step: 'Walk through the golden sparks', copy: 'No buttons or puzzles needed. Follow the glowing trail. ' + s.sparks.length + ' of 3 collected.', progress: 1, total: 3 },
      { title: 'Bring the beacon back', step: 'Visit the blue beacon', copy: 'Walk closer, then press E or tap the interact button. We will show you what to do.', progress: 2, total: 3 }
    ][Math.min(s.intro, 2)];
    return { title: job.title, step: id === 'sweep' ? 'Walk through five sparks' : id === 'courier' ? 'Guide your drone to the glowing pad' : 'Visit the matching beacon', copy: job.copy, progress: id === 'sweep' ? s.collected.length : s.step, total: id === 'courier' ? 3 : 5 };
  }
  function escape(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rewardFiles(value, name) {
    var s = normalize(value); if (!s.done.includes('intro')) return null;
    var handle = String(name || 'CITY EXPLORER').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 32);
    return [
      { name: 'first-light-badge.svg', data: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" rx="30" fill="#091725"/><path d="m400 90 35 100 105 10-80 65 25 105-85-60-85 60 25-105-80-65 105-10Z" fill="#ffce76"/><text x="400" y="430" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#fff">FIRST LIGHT</text><text x="400" y="480" text-anchor="middle" font-family="monospace" font-size="24" fill="#48ffd5">' + escape(handle) + '</text><text x="400" y="550" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#b7cbd8">An original CyberWorld game achievement</text></svg>' },
      { name: 'spark-companion.json', data: JSON.stringify({ format: 'cyberworld-first-light-v1', callsign: handle, item: 'SPARK-COMPANION', adventures: s.done, records: s.records, official_certification: false }, null, 2) + '\n' },
      { name: 'you-did-it.txt', data: 'You explored, collected three sparks and restored a beacon. Your Spark companion now follows you around the plaza. Try a quick city job or safe sparring next. Every technical case has a free coach. There is no penalty for learning.\n\nAll systems and actions are fictional local game state. The defensive lesson is simple: follow clear clues, make one safe change, and check that it worked.\n' }
    ];
  }
  function mount(win) {
    var doc = win.document, state = initial(), mounted = false, modal, card, lastFocus, message = '', stamp = '', lastPublished = '', lastClaimed = null;
    function $(id) { return doc.getElementById(id); }
    function game() { return win.__cwGameplay; }
    function load() { state = normalize(game() && game().state().flags && game().state().flags.rookie); }
    function publish() {
      var value = worldState(), key = JSON.stringify(value);
      if (key !== lastPublished) { lastPublished = key; doc.dispatchEvent(new win.CustomEvent('cw:rookie-state', { detail: value })); }
    }
    function save() { if (!game()) return; var op = game().state(); op.flags = op.flags || {}; op.flags.rookie = normalize(state); game().replaceState(op); publish(); }
    function syncRewards() { if (!game()) return; state.done.forEach(function (id) { var job = JOBS[id]; game().completeMission('rookie:' + id, { xp: job.xp, credits: job.credits, item: job.item, title: job.title }); }); }
    function playing() { return doc.body.dataset.phase === 'playing'; }
    function inCity() { var snap = win.__cwWorld && win.__cwWorld.snapshot(); return playing() && snap && !snap.district && !snap.combat; }
    function paused() { return doc.hidden || !$('cwas-modal').hidden || !modal.hidden || doc.body.classList.contains('cwas-combat-preparing'); }
    function worldState() { return { active: !!state.active, job: state.active, companion: state.done.includes('intro'), targets: targets(state) }; }
    function nearby(id) { var snap = win.__cwWorld && win.__cwWorld.snapshot(), target = targets(state).find(function (t) { return t.id === id; }); return inCity() && target && Math.hypot(snap.world.x - target.x, snap.world.z - target.z) < 3.4; }
    function finishResult(r) {
      state = r.state; message = r.message; save(); syncRewards(); render(); win.__cwAscensionShell?.updateHud();
      if (r.finished) { lastClaimed = r.finished; celebrate(r.finished); }
    }
    function close() { modal.hidden = true; doc.body.classList.remove('cwr-dialog-open'); if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); else $('cwg-canvas')?.focus(); }
    function show(title, body) {
      win.__cwAscension?.close(); lastFocus = doc.activeElement;
      modal.innerHTML = '<section class="cwr-dialog" tabindex="-1"><header><div><span class="cwas-eyebrow">QUICK PLAY / TAKE YOUR TIME</span><h2 id="cwr-dialog-title">' + title + '</h2></div><button data-rookie="close" aria-label="Close quick play">×</button></header><div class="cwr-dialog-body">' + body + '</div></section>';
      modal.hidden = false; doc.body.classList.add('cwr-dialog-open'); modal.querySelector('button').focus();
    }
    function startJob(id) {
      close(); win.__cwAscension?.close();
      if (id === 'practice') { win.__cwCombatUI?.start({ difficulty: 'practice' }); return; }
      if (!inCity()) win.__cwWorld.toPlaza();
      if (state.active === id || (id === 'intro' && state.intro > 0 && state.intro < 3 && !state.done.includes('intro'))) {
        state.active = id; message = 'Welcome back. Your next marker is waiting.'; save(); render(); $('cwg-canvas')?.focus(); return;
      }
      finishResult(start(state, id)); $('cwg-canvas')?.focus();
    }
    function openHub() {
      var tiles = IDS.map(function (id) { var j = JOBS[id], r = state.records[id]; return '<button class="cwr-job" data-rookie="start" data-job="' + id + '"><span class="cwr-job-icon" aria-hidden="true">' + j.icon + '</span><span><small>' + j.time + (state.done.includes(id) ? ' · ✓ PLAYED' : '') + '</small><strong>' + j.title + '</strong><p>' + j.copy + '</p><em>' + (r ? id === 'practice' ? 'Your token is saved · practice freely' : 'Best ' + r.best + ' · ' + r.wins + ' wins · play again' : '+' + j.xp + ' XP · ' + j.credits + ' coins · first win') + '</em></span><b aria-hidden="true">→</b></button>'; }).join('');
      show('A small adventure, a real win.', '<p class="cwr-lead">No cybersecurity experience needed. Pick something that sounds fun. There is no timer, and mistakes never cost your gear.</p><div class="cwr-jobs">' + tiles + '</div><div class="cwr-next"><h3>Ready to investigate?</h3><p>The seven story cases include a free, step-by-step coach. You can switch it off whenever you want.</p><button data-rookie="cases">Open coached cases</button><button data-rookie="arena">Try a Rookie arena fight</button></div><div class="cwr-pack-actions"><button data-rookie="guide">Download beginner field guide</button>' + (state.done.includes('intro') ? '<button data-rookie="reward">Download First Light badge</button>' : '') + '</div>');
    }
    function celebrate(id) {
      var j = JOBS[id], op = game().state(), receipt = op.completed['rookie:' + id];
      show(id === 'intro' ? 'You brought the light back.' : j.title + ' complete!', '<div class="cwr-celebrate"><span aria-hidden="true">✦</span><h3>Nice work, ' + escape(op.callsign || 'explorer') + '!</h3><p>' + (id === 'intro' ? 'Your Spark companion is ready to explore with you. Look for the little glowing orb beside your character.' : 'You followed the clues and finished the job. Try another adventure, or replay to improve your score.') + '</p><p class="cwr-earned">' + (receipt ? j.item + ' collected · first-win reward saved' : 'Your adventure is complete. Progress is kept for this session.') + '</p><p>First win: ' + j.xp + ' XP + ' + j.credits + ' coins. Repeat wins improve your score without duplicating gear.</p></div><div class="cwr-dialog-actions"><button class="cwr-primary" data-rookie="hub">Pick another adventure</button><button data-rookie="close">Keep exploring</button>' + (id === 'intro' ? '<button data-rookie="reward">Download your badge</button>' : '') + '</div>');
    }
    function openBeacon() {
      if (!nearby('rookie-beacon')) { message = 'Follow the trail a little closer to the beacon.'; render(); return; }
      var wanted = state.active === 'intro' ? 'blue' : PATTERN[Math.min(4, state.step)];
      show(state.active === 'intro' ? 'One easy fix.' : 'Signal Match · ' + (state.step + 1) + ' / 5', '<p class="cwr-lead">The beacon is asking for one color. Match the word below. The clue stays here; you do not need to memorize it.</p><div class="cwr-color-clue" style="--clue:' + COLORS[wanted] + '"><span aria-hidden="true">' + (wanted === 'blue' ? '●' : wanted === 'amber' ? '◆' : '▲') + '</span><strong>' + wanted.toUpperCase() + '</strong></div><div class="cwr-color-buttons">' + Object.keys(COLORS).map(function (c) { return '<button data-rookie="color" data-color="' + c + '" style="--clue:' + COLORS[c] + '">' + c.toUpperCase() + '</button>'; }).join('') + '</div><p id="cwr-match-feedback" role="status">' + escape(message || 'Choose the matching word. There is no penalty for trying.') + '</p>');
    }
    function downloadReward() { var files = rewardFiles(state, game().state().callsign); if (files) win.CW_ASCENSION_DOWNLOADS.download(win, 'cyberworld-first-light-reward.zip', win.CW_ASCENSION_DOWNLOADS.zip(files), 'application/zip'); }
    function guideDownload() { win.CW_ASCENSION_DOWNLOADS.download(win, 'cyberworld-beginner-guide.zip', win.CW_ASCENSION_DOWNLOADS.zip([{ name: 'start-here.txt', data: 'CYBERWORLD / START HERE\n\nNo prior knowledge needed. Use WASD or arrows to move, or click the ground. Follow the glowing trail. Sparks collect when you walk through them. At a beacon, press E or tap Interact, then match the visible word. No countdown or credit loss.\n\nQuick Play offers First Light, Spark Sweep, Drone Delivery, Signal Match and harmless Safe Sparring. The Rookie arena is the gentle combat option; Standard is optional. Every story case includes a free coach.\n\nAll actions affect fictional local game systems. Learn the defensive habit: look for a clear clue, make a safe change, and check the result.\n' }, { name: 'my-adventures.csv', data: 'adventure,what_I_tried,what_I_learned\nFirst Light,,\nSpark Sweep,,\nDrone Delivery,,\nSignal Match,,\nSafe Sparring,,\n' }]), 'application/zip'); }
    function render() {
      if (!mounted) return; var g = guide(state), visible = inCity() && !!g;
      card.hidden = !visible; doc.body.classList.toggle('cwr-guided', visible); $('cwr-launch').hidden = !playing();
      if (!g) { stamp = ''; publish(); return; }
      var snap = win.__cwWorld.snapshot(), next = targets(state).find(function (t) { return t.state === 'next'; });
      var distance = next ? Math.round(Math.hypot(next.x - snap.world.x, next.z - snap.world.z)) : 0;
      var key = JSON.stringify([g, distance, message]); if (key === stamp) return; stamp = key;
      card.innerHTML = '<div class="cwr-card-top"><span>START HERE · NO TIMER</span><button data-rookie="hub" aria-label="Choose a quick adventure">☰</button></div><div class="cwr-dots" aria-label="' + g.progress + ' of ' + g.total + ' steps"><progress max="' + g.total + '" value="' + g.progress + '"></progress><span>' + g.progress + ' / ' + g.total + '</span></div><h2>' + g.title + '</h2><strong>' + g.step + '</strong><p>' + g.copy + '</p><div class="cwr-distance">✦ ' + (distance > 3 ? distance + ' steps away · follow the glowing trail' : 'You are close!') + '</div>' + (next?.kind === 'beacon' && distance <= 3 ? '<button class="cwr-primary" data-rookie="beacon">Use the beacon</button>' : '') + '<p class="cwr-encourage" role="status">' + escape(message) + '</p><div class="cwr-card-actions"><button data-rookie="hub">Other adventures</button><button id="cwr-dismiss" data-rookie="dismiss">Explore freely</button></div>';
      publish();
    }
    function action(event) {
      var el = event.target.closest('[data-rookie]'); if (!el) return;
      var name = el.dataset.rookie;
      if (name === 'close') close();
      if (name === 'hub') openHub();
      if (name === 'start') startJob(el.dataset.job);
      if (name === 'beacon') openBeacon();
      if (name === 'dismiss') { state.active = null; state.dismissed = true; message = ''; save(); render(); }
      if (name === 'color') { if (!nearby('rookie-beacon')) return; var r = choose(state, el.dataset.color); finishResult(r); if (!r.finished) openBeacon(); }
      if (name === 'reward') downloadReward();
      if (name === 'guide') guideDownload();
      if (name === 'cases') { state.active = null; state.dismissed = true; save(); close(); win.__cwAscension?.setCoach?.(true); win.__cwAscension?.openDeck('missions'); render(); }
      if (name === 'arena') { close(); win.__cwCombatUI?.start({ difficulty: 'rookie' }); }
    }
    function enterWorld() {
      load(); syncRewards();
      var caseState = win.__cwAscension?.state(), advanced = caseState && (caseState.active || Object.keys(caseState.completed || {}).length > 0);
      if (!advanced && !state.dismissed && !state.active && !state.done.includes('intro')) { state.active = 'intro'; save(); }
      render(); publish();
    }
    function tick() {
      if (!mounted || !playing()) return; render();
      if (!inCity() || paused() || !state.active) return;
      var snap = win.__cwWorld.snapshot(), target = targets(state).find(function (t) { return t.kind !== 'beacon' && t.state !== 'done' && (t.kind !== 'pad' || t.state === 'next') && Math.hypot(snap.world.x - t.x, snap.world.z - t.z) < 1.45; });
      if (target) finishResult(touch(state, target.id));
    }
    function boot() {
      if (!$('cwas-field-open')) return;
      var launch = doc.createElement('button'); launch.id = 'cwr-launch'; launch.textContent = '✦ QUICK PLAY'; launch.hidden = true; launch.onclick = openHub; doc.querySelector('.cwas-top-actions').prepend(launch);
      card = doc.createElement('aside'); card.id = 'cwr-card'; card.hidden = true; card.setAttribute('aria-label', 'Your next easy adventure'); doc.body.appendChild(card);
      modal = doc.createElement('div'); modal.id = 'cwr-modal'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'cwr-dialog-title'); doc.body.appendChild(modal);
      mounted = true; load(); doc.addEventListener('click', action);
      win.addEventListener('keydown', function (event) {
        if (modal.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
        if (event.key === 'Tab') { var all = Array.from(modal.querySelectorAll('button,a,[tabindex="0"]')); var first = all[0], last = all[all.length - 1]; if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); } }
      }, true);
      doc.addEventListener('cw:action', function (event) { if (event.detail?.action !== 'rookie:interact') return; event.preventDefault(); var id = event.detail.target?.id; if (!nearby(id)) return; if (id === 'rookie-beacon') openBeacon(); else { var target = targets(state).find(function (t) { return t.id === id; }), p = win.__cwWorld.snapshot().world; if (target && Math.hypot(p.x-target.x,p.z-target.z)<1.45) finishResult(touch(state, id)); } });
      doc.addEventListener('cw:combat-state', function (event) { var c = event.detail; if (c?.difficulty === 'practice' && c.phase === 'victory' && !state.done.includes('practice')) { state = practice(state).state; save(); syncRewards(); } });
      win.addEventListener('storage', function (event) { if (event.key === 'cw.operative.v1') { load(); publish(); render(); } });
      win.__cwRookie = { state: function () { return normalize(state); }, worldState: worldState, enterWorld: enterWorld, openHub: openHub, startJob: startJob, close: close, reload: function () { load(); publish(); render(); }, downloadReward: downloadReward };
      setInterval(tick, 120); render(); publish();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  }
  return { JOBS: JOBS, initial: initial, normalize: normalize, valid: valid, start: start, touch: touch, choose: choose, practice: practice, guide: guide, targets: targets, rewardFiles: rewardFiles, mount: mount };
});
