/* Authored city conversations and spatial side-contracts. No generated/live dialogue. */
(function () {
  'use strict';
  var KEY = 'cw.ascension.city.v1', modal, activeSpeaker = null;
  var state = fresh(), saved = true;
  var PEOPLE = {
    vendor: { name: 'Lyra / Deckwright', role: 'HARDWARE ALLEY · QUARTERMASTER', first: 'I repair decks. I do not sell miracles. A focus cell buys you another look at the system, not a correct answer.', returnLine: 'Back again. Your deck survived; that puts you ahead of most of my customers.' },
    trainer: { name: 'Patch / Fieldcraft', role: 'PLAZA · SIGNAL TRAINER', first: 'Your first instrument is your attention. Three field repeaters are broadcasting across the plaza. Find each one, walk up to it, and capture its signature.', returnLine: 'I remember you. The repeaters are still talking; you are getting better at listening.' },
    secret: { name: 'The forgotten relay', role: 'ROOFTOP · LOCAL ARCHIVE', first: 'An old maintenance channel still answers. Someone preserved the city before the freight network went wrong.', returnLine: 'Your signature is already in this archive. A place remembers the people who repair it.' }
  };
  function fresh() { return { version: 1, visits: { vendor: 0, trainer: 0, secret: 0 }, training: false, beacons: [], discovered: false }; }
  function valid(value) {
    return !!value && value.version === 1 && typeof value.training === 'boolean' && typeof value.discovered === 'boolean' && Array.isArray(value.beacons) && value.beacons.length <= 3 && value.beacons.every(function (id) { return ['trace-one','trace-two','trace-three'].includes(id); }) && new Set(value.beacons).size === value.beacons.length && value.visits && ['vendor','trainer','secret'].every(function (id) { return Number.isInteger(value.visits[id]) && value.visits[id] >= 0 && value.visits[id] < 100000; });
  }
  function load() { try { var value = JSON.parse(localStorage.getItem(KEY) || 'null'); state = valid(value) ? value : fresh(); } catch (_) { state = fresh(); } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); saved = true; } catch (_) { saved = false; } }
  function toast(message) { if (window.__cwAscensionShell) window.__cwAscensionShell.toast(message); }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function close() { if (!modal) return; modal.hidden = true; modal.classList.remove('is-open'); document.getElementById('cwg-canvas')?.focus(); }
  function button(label, action) { return '<button class="cwas-btn" data-city-action="' + action + '">' + label + '</button>'; }
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
    if (id === 'trainer') body = '<div class="cwas-panel"><h3>THE THREE SIGNATURES</h3><p>Explore the street, service alley, and raised maintenance walk. Each repeater carries a different signature. Press E nearby or select its terminal.</p><p>CAPTURED: <b>' + state.beacons.length + ' / 3</b> · REWARD: 70 XP / 45 credits / FIELD-RECORDER</p>' + button(state.training ? 'Continue the field route' : 'Accept field training', 'train') + '</div>';
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
    if (id === 'beacon') collect((detail.target || {}).id); else talk(id);
  }
  window.__cwCity = { state: function () { return JSON.parse(JSON.stringify(state)); }, validateState: valid, importState: function (value) { if (!valid(value)) throw new Error('Invalid city save.'); state = JSON.parse(JSON.stringify(value)); persist(); }, reloadState: load, talk: talk, key: KEY };
  load(); document.addEventListener('cw:action',intercept); document.addEventListener('click',action);
})();
