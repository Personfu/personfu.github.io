/* Authored city conversations and spatial side-contracts. No generated/live dialogue. */
(function () {
  'use strict';
  var KEY = 'cw.ascension.city.v1', modal, activeSpeaker = null;
  var FIELD = window.CW_ASCENSION_FIELD, fieldTarget = null;
  var state = fresh(), saved = true;
  var PEOPLE = {
    vendor: { name: 'Lyra / Deckwright', role: 'HARDWARE ALLEY · QUARTERMASTER', first: 'I repair decks. I do not sell miracles. A focus cell buys you another look at the system, not a correct answer.', returnLine: 'Back again. Your deck survived; that puts you ahead of most of my customers.' },
    trainer: { name: 'Patch / Fieldcraft', role: 'PLAZA · SIGNAL TRAINER', first: 'Your first instrument is your attention. Three field repeaters are broadcasting across the plaza. Find each one, walk up to it, and capture its signature.', returnLine: 'I remember you. The repeaters are still talking; you are getting better at listening.' },
    secret: { name: 'The forgotten relay', role: 'ROOFTOP · LOCAL ARCHIVE', first: 'An old maintenance channel still answers. Someone preserved the city before the freight network went wrong.', returnLine: 'Your signature is already in this archive. A place remembers the people who repair it.' }
  };
  function fresh() { return { version: 1, visits: { vendor: 0, trainer: 0, secret: 0 }, training: false, beacons: [], discovered: false, field: FIELD.fresh() }; }
  function validBase(value) {
    return !!value && value.version === 1 && typeof value.training === 'boolean' && typeof value.discovered === 'boolean' && Array.isArray(value.beacons) && value.beacons.length <= 3 && value.beacons.every(function (id) { return ['trace-one','trace-two','trace-three'].includes(id); }) && new Set(value.beacons).size === value.beacons.length && value.visits && ['vendor','trainer','secret'].every(function (id) { return Number.isInteger(value.visits[id]) && value.visits[id] >= 0 && value.visits[id] < 100000; });
  }
  function valid(value) { return validBase(value) && (value.field === undefined || FIELD.valid(value.field)); }
  // Repair only the new contract when its save is inconsistent; preserve older
  // conversations, discoveries and training. Explicit file imports stay strict.
  function load() { try { var value = JSON.parse(localStorage.getItem(KEY) || 'null'); state = validBase(value) ? value : fresh(); } catch (_) { state = fresh(); } state.field = FIELD.normalize(state.field); syncFieldReward(); publishField(); }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); saved = true; } catch (_) { saved = false; } publishField(); }
  function toast(message) { if (window.__cwAscensionShell) window.__cwAscensionShell.toast(message); }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function close() { if (!modal) return; modal.hidden = true; modal.classList.remove('is-open'); document.getElementById('cwg-canvas')?.focus(); }
  function button(label, action) { return '<button class="cwas-btn" data-city-action="' + action + '">' + label + '</button>'; }
  function fieldButton(label, action, value) { return '<button class="cwas-btn" type="button" data-city-action="field-' + action + '"' + (value ? ' data-value="' + value + '"' : '') + '>' + label + '</button>'; }
  function publishField(message) { document.dispatchEvent(new CustomEvent('cw:field-state', { detail: Object.assign({}, state.field, { feedback: message || '' }) })); }
  function syncFieldReward() { if (state.field && state.field.phase === 'complete' && window.__cwGameplay) window.__cwGameplay.completeMission('city:last-mile', Object.assign({ title: 'The Last Mile' }, FIELD.REWARD)); }
  function nearField(id) {
    var world = window.__cwWorld && window.__cwWorld.snapshot();
    var target = world && world.targets.find(function (item) { return item.id === id; });
    return !!target && !world.district && Math.abs(world.world.y) < 1.5 && Math.hypot(world.world.x - target.x, world.world.z - target.z) <= 4.2;
  }
  function openField(id, message) {
    if (window.__cwAscension) window.__cwAscension.close();
    fieldTarget = id || null;
    var field = state.field, target = FIELD.targets.find(function (item) { return item.id === id; });
    var complete = field.phase === 'complete', body = '<p class="cwas-lead">A freight uplink is sending unapproved commands. The clinic shares its delivery grid. Stop the interference without cutting off medical supplies.</p>';
    body += '<div class="cwas-field-strip"><strong>' + (complete ? 'DISTRICT RECOVERED' : field.route ? 'FALLBACK ROUTE STAGED' : field.phase === 'available' ? 'OPEN FIELD CONTRACT' : 'ON-SITE INVESTIGATION') + '</strong><span>' + field.samples.length + '/3 sources · ' + field.steps.length + '/4 recovery steps</span></div>';
    if (field.phase === 'available') body += '<div class="cwas-actions">' + fieldButton('Accept The Last Mile', 'start') + '</div>';
    if (message) body += '<p class="cwas-field-feedback" role="status" data-field-feedback>' + escape(message) + '</p>';
    if (target && target.id !== 'field-switch') body += '<section class="cwas-panel"><h3>' + escape(target.title) + '</h3><pre class="cwas-field-evidence">' + escape(target.evidence) + '</pre><p>' + escape(target.lesson) + '</p></section>';
    body += '<div class="cwas-field-sources">' + FIELD.targets.filter(function (item) { return item.id !== 'field-switch'; }).map(function (item) { var captured = field.samples.includes(item.id); return '<section class="cwas-panel" data-field-source="' + item.id + '"><span>' + (captured ? '✓ RECORDED' : '○ VISIT IN PERSON') + '</span><h3>' + escape(item.title) + '</h3><p>' + escape(item.where) + '</p>' + (captured ? '<details><summary>Review preserved evidence</summary><pre class="cwas-field-evidence">' + escape(item.evidence) + '</pre></details>' : '') + '</section>'; }).join('') + '</div>';
    if (!complete && id === 'field-switch') {
      if (field.samples.length < 3) body += '<p>Three independent sources are needed before the routing decision. Visit the freight uplink, fallback archive, and clinic pad; then return to this switch.</p>';
      else if (!field.route) body += '<h3>Choose a continuity plan</h3><div class="cwas-field-choices">' + fieldButton('Shut down the entire grid', 'route', 'shutdown') + fieldButton('Keep the primary uplink', 'route', 'primary') + fieldButton('Stage the verified fallback lane', 'route', 'fallback') + '</div>';
      else body += '<h3>Recover the district in a defensible order</h3><p>Preserve the affected state, isolate the untrusted uplink, restore the essential route, then verify actual deliveries.</p><div class="cwas-field-choices">' + [['snapshot','Preserve snapshot'],['isolate','Isolate freight uplink'],['restore','Restore clinic lane'],['verify','Verify delivery']].map(function (step) { return fieldButton((field.steps.includes(step[0]) ? '✓ ' : '') + step[1], 'step', step[0]); }).join('') + '</div>';
    } else if (!complete && field.phase !== 'available') body += '<p>Inspect each marked terminal on foot. The routing pedestal is west of the arrival ring. Route decisions can only be made at that pedestal.</p>';
    if (complete) body += '<section class="cwas-field-complete"><h3>THE LAST MILE / SUPPLY LINE RESTORED</h3><p>The clinic drone is delivering again. The freight uplink is isolated and the verified fallback stays in service.</p><p>+220 XP · +110 credits · CONTINUITY-PRISM</p>' + fieldButton('Download earned field kit / ZIP', 'reward') + '</section>';
    body += '<div class="cwas-actions">' + fieldButton('Download field evidence / ZIP', 'download') + button('Return to the city', 'close') + '</div><p class="cwas-fine">' + (saved ? 'Field evidence and choices are saved on this device.' : 'Storage is unavailable. Export your progress before leaving.') + '</p>';
    modal = document.getElementById('cwas-modal'); modal.innerHTML = '<section class="cwas-dialog cwas-field-dialog"><header><div><small>STREET OPERATION / CONTINUITY DESK</small><h2 id="cwas-field-title">The Last Mile</h2></div>' + button('×','close') + '</header><div class="cwas-dialog-body">' + body + '</div></section>';
    modal.hidden = false; modal.classList.add('is-open'); modal.setAttribute('aria-labelledby','cwas-field-title'); modal.querySelector('button').setAttribute('aria-label','Close field contract'); modal.querySelector('button').focus();
  }
  function fieldResult(result) { state.field = result.state; persist(); syncFieldReward(); publishField(result.message); openField(fieldTarget, result.message); window.__cwAscensionShell?.updateHud(); }
  function inspectField(id) { if (!nearField(id)) { toast('Walk closer to that field terminal to inspect it.'); return; } fieldTarget = id; fieldResult(FIELD.inspect(state.field, id)); }
  function show(person, body) {
    if (window.__cwAscension) window.__cwAscension.close();
    modal = document.getElementById('cwas-modal');
    modal.innerHTML = '<section class="cwas-dialog"><header class="cwas-dialog-header"><div><small>' + escape(person.role) + '</small><h2 id="cwas-city-title">' + escape(person.name) + '</h2></div>' + button('×', 'close') + '</header><div class="cwas-dialog-body"><p class="cwas-lead">' + escape(state.visits[activeSpeaker] > 1 ? person.returnLine : person.first) + '</p>' + body + '<p class="cwas-fine">' + (saved ? 'This character remembers your visits on this device.' : 'Storage is unavailable. This conversation is remembered for this session.') + '</p></div></section>';
    modal.hidden = false; modal.classList.add('is-open'); modal.setAttribute('aria-labelledby','cwas-city-title');
    modal.querySelector('button').setAttribute('aria-label','Close conversation'); modal.querySelector('button').focus();
  }
  function talk(id) {
    if (!PEOPLE[id]) return;
    activeSpeaker = id; state.visits[id] = Math.min(99999, state.visits[id] + 1); persist(); render();
  }
  function render() {
    var id = activeSpeaker, op = window.__cwGameplay.state(), body = '';
    if (id === 'vendor') body = '<div class="cwas-panel"><h3>FOCUS CELL / 25 credits</h3><p>A calibrated deck capacitor restores 50 Overclock focus immediately. Earn credits through verified investigations or field training.</p><p>YOUR BALANCE: <b>' + op.credits + ' credits</b></p>' + button('Acquire focus cell', 'buy-focus') + '</div>';
    if (id === 'trainer') body = '<div class="cwas-panel"><h3>THE THREE SIGNATURES</h3><p>Explore the street, service alley, and rooftop. For the roof, find the amber ROOFTOP ACCESS sign east of the plaza and follow its amber chevrons up the maintenance ramp. Each repeater carries a different signature. Press E nearby or select its terminal.</p><p>CAPTURED: <b>' + state.beacons.length + ' / 3</b> · REWARD: 70 XP / 45 credits / FIELD-RECORDER</p>' + button(state.training ? 'Continue the field route' : 'Accept field training', 'train') + '</div><div class="cwas-panel"><h3>THE LAST MILE</h3><p>A blocked clinic supply line needs careful containment. Visit three terminals and repair the route without disconnecting the clinic.</p>' + button('Read the street contract', 'field-brief') + '</div>';
    if (id === 'secret') {
      if (!state.discovered) { state.discovered = true; window.__cwGameplay.completeMission('city:forgotten-relay',{xp:60,credits:30,item:'ARCHIVE-ECHO',title:'The forgotten relay'}); persist(); }
      body = '<div class="cwas-panel"><h3>ARCHIVE ECHO / DISCOVERY RECOVERED</h3><p>Before the city trusted its central dispatcher, maintenance crews kept independent route records. The forgotten relay preserves a reference point the current network cannot rewrite.</p><p><b>Independent copies make corroboration possible.</b> Your archive fragment and discovery reward are in the Loadout.</p></div>';
    }
    show(PEOPLE[id],body);
  }
  function collect(id) {
    if (!['trace-one','trace-two','trace-three'].includes(id)) return;
    if (!state.training) { toast('A field repeater. Find Patch to begin the three-signature route.'); return; }
    if (state.beacons.includes(id)) { toast('Signature already captured. Find a different repeater.'); return; }
    state.beacons.push(id); persist();
    if (state.beacons.length === 3) { window.__cwGameplay.completeMission('city:three-signatures',{xp:70,credits:45,item:'FIELD-RECORDER',title:'The three signatures'}); toast('FIELD ROUTE COMPLETE · +70 XP · +45 credits · Field Recorder acquired.'); }
    else toast('SIGNATURE CAPTURED · ' + state.beacons.length + ' / 3 · Keep exploring the plaza.');
    window.__cwAscensionShell?.updateHud();
  }
  function action(event) {
    var target = event.target.closest('[data-city-action]'); if (!target) return;
    var name = target.dataset.cityAction;
    if (name.startsWith('field-')) {
      if (name === 'field-brief') { openField(); return; }
      if (name === 'field-start') { fieldTarget = null; fieldResult(FIELD.start(state.field)); return; }
      if (name === 'field-route' || name === 'field-step') {
        if (fieldTarget !== 'field-switch' || !nearField('field-switch')) { toast('Return to the routing pedestal to operate the district switch.'); return; }
        fieldResult(name === 'field-route' ? FIELD.chooseRoute(state.field, target.dataset.value) : FIELD.act(state.field, target.dataset.value)); return;
      }
      if (name === 'field-download' || name === 'field-reward') {
        try { var downloads = window.CW_ASCENSION_DOWNLOADS, files = name === 'field-reward' ? FIELD.rewardFiles(state.field, window.__cwGameplay.state().callsign) : FIELD.briefFiles(state.field); downloads.download(window, 'cyberworld-last-mile-' + (name === 'field-reward' ? 'reward' : 'mission') + '.zip', downloads.zip(files), 'application/zip'); toast('Field kit downloaded.'); } catch (error) { toast(error.message); } return;
      }
    }
    if (name === 'close') { close(); return; }
    if (name === 'train') { state.training = true; persist(); close(); toast('FIELD ROUTE ACCEPTED · Find the three glowing repeaters.'); return; }
    if (name === 'buy-focus') {
      var op = window.__cwGameplay.state(), campaign = window.__cwAscension;
      if (!campaign || !campaign.addFocus) return;
      if (campaign.state().overclock >= 100) { toast('Your deck is already fully charged. Keep your credits.'); return; }
      if (op.credits < 25) { toast('You need 25 credits. Patch offers a field training contract.'); return; }
      op.credits -= 25; window.__cwGameplay.replaceState(op); campaign.addFocus(50); render(); toast('CAPACITOR SYNCHRONIZED · +50 Overclock focus.');
    }
  }
  function intercept(event) {
    var detail = event.detail || {}, action = detail.action || '';
    if (!action.startsWith('studio:') || event.__cwCityHandled) return;
    event.__cwCityHandled = true; event.preventDefault();
    var id = action.slice(7);
    if (id === 'field') inspectField((detail.target || {}).id); else if (id === 'beacon') collect((detail.target || {}).id); else talk(id);
  }
  window.__cwCity = { state: function () { return JSON.parse(JSON.stringify(state)); }, validateState: valid, importState: function (value) { if (!valid(value)) throw new Error('Invalid city save.'); state = JSON.parse(JSON.stringify(value)); state.field = FIELD.normalize(state.field); persist(); syncFieldReward(); }, reloadState: load, openField: function () { openField(); }, talk: talk, key: KEY };
  load(); document.addEventListener('cw:action',intercept); document.addEventListener('click',action);
})();
