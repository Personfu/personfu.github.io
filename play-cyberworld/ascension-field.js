/* Original local training scenario. No network operations or real-world targets. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CW_ASCENSION_FIELD = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TARGETS = Object.freeze([
    Object.freeze({
      id: 'field-uplink', title: 'Dispatch uplink', where: 'North plaza / dispatch mast',
      evidence: '17:41 / An unapproved rewrite changed dispatch route CLINIC-7 from the sealed lane to ORBIT-PRIMARY. The rewrite used the uplink service identity. Its local health display still says green.',
      lesson: 'A green dashboard is one observation. Compare changes against an independent record before trusting a compromised component.'
    }),
    Object.freeze({
      id: 'field-backup', title: 'Maintenance archive', where: 'Service alley archive',
      evidence: '17:10 / Before the incident, maintenance sealed manifest M-204 on an independent read-only recorder. CLINIC-7 has an approved fallback lane: LANTERN-02. Capacity: 12 crates per hour; clinic requirement: 8. Seal matches the recorder copy.',
      lesson: 'An independently preserved baseline can establish a recovery route when the live source can no longer be trusted.'
    }),
    Object.freeze({
      id: 'field-clinic', title: 'Clinic delivery board', where: 'Clinic entrance',
      evidence: '17:43 / The clinic needs 8 cold-chain crates per hour. Its next storage reserve ends in 24 minutes. Delivery needs a functioning dispatch lane; shutting down every lane would also stop the clinic supply.',
      lesson: 'Containment has service dependencies. Preserve the essential service while separating the compromised component.'
    }),
    Object.freeze({
      id: 'field-switch', title: 'Continuity switch', where: 'Dispatch square',
      evidence: 'The switch can preserve a local snapshot, separate the uplink, restore a recorded lane, and measure the resulting deliveries. It cannot authenticate the uplink using the uplink itself.',
      lesson: 'Preserve evidence, contain the affected component, restore from a trusted source, then verify the actual service.'
    })
  ]);
  var SAMPLE_IDS = TARGETS.slice(0, 3).map(function (target) { return target.id; });
  var STEP_ORDER = Object.freeze(['snapshot', 'isolate', 'restore', 'verify']);
  var REWARD = Object.freeze({ xp: 220, credits: 110, item: 'CONTINUITY-PRISM', badge: 'LAST MILE KEEPER' });

  function fresh() { return { version: 1, phase: 'available', samples: [], route: null, steps: [] }; }
  function copy(state) { return { version: 1, phase: state.phase, samples: state.samples.slice(), route: state.route, steps: state.steps.slice() }; }
  function prefix(steps) { return Array.isArray(steps) && steps.length <= STEP_ORDER.length && steps.every(function (step, index) { return step === STEP_ORDER[index]; }); }
  function valid(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state) || state.version !== 1) return false;
    if (Object.keys(state).sort().join(',') !== 'phase,route,samples,steps,version') return false;
    if (!Array.isArray(state.samples) || state.samples.length > 3 || !state.samples.every(function (id, index) { return SAMPLE_IDS.indexOf(id) >= 0 && state.samples.indexOf(id) === index; }) || !prefix(state.steps)) return false;
    if (state.phase === 'available') return state.samples.length === 0 && state.route === null && state.steps.length === 0;
    if (state.phase === 'survey') return state.route === null && state.steps.length === 0;
    if (state.phase !== 'routing' && state.phase !== 'complete') return false;
    if (state.samples.length !== 3 || state.route !== 'fallback') return false;
    return state.phase === 'complete' ? state.steps.length === STEP_ORDER.length : state.steps.length < STEP_ORDER.length;
  }
  function normalize(old) {
    if (valid(old)) return copy(old);
    var state = fresh();
    if (!old || typeof old !== 'object' || old.version !== 1) return state;
    if (Array.isArray(old.samples)) old.samples.forEach(function (id) { if (SAMPLE_IDS.indexOf(id) >= 0 && state.samples.indexOf(id) < 0) state.samples.push(id); });
    if (state.samples.length || old.phase === 'survey' || old.phase === 'routing' || old.phase === 'complete') state.phase = 'survey';
    if (state.samples.length === 3 && old.route === 'fallback') {
      state.route = 'fallback'; state.phase = 'routing';
      if (Array.isArray(old.steps)) {
        for (var i = 0; i < STEP_ORDER.length && old.steps[i] === STEP_ORDER[i]; i++) state.steps.push(STEP_ORDER[i]);
      }
      if (state.steps.length === STEP_ORDER.length) state.phase = 'complete';
    }
    return state;
  }
  function result(state, ok, message) { return { state: copy(state), ok: ok, message: message }; }
  function checked(state) { return valid(state) ? null : result(normalize(state), false, 'The saved field record was inconsistent. Its supported observations were recovered; review the current stage before continuing.'); }
  function start(state) {
    var error = checked(state); if (error) return error;
    var next = copy(state);
    if (next.phase !== 'available') return result(next, true, next.phase === 'complete' ? 'The Last Mile is complete. Your field record is preserved.' : 'The field contract is already active. Continue your survey.');
    next.phase = 'survey';
    return result(next, true, 'Contract accepted: The Last Mile. Inspect the dispatch uplink, service alley maintenance archive, and clinic delivery board. Keep the clinic supplied while containing the changed uplink.');
  }
  function inspect(state, id) {
    var error = checked(state); if (error) return error;
    var target = TARGETS.find(function (entry) { return entry.id === id; });
    if (!target) return result(state, false, 'This object is not part of The Last Mile survey.');
    var next = copy(state);
    if (id === 'field-switch') return result(next, true, next.phase === 'available' ? 'Accept The Last Mile field contract to begin your three-site survey.' : next.phase === 'complete' ? 'Continuity restored: 8 of 8 clinic crates arrived through the sealed lane. Your field report is ready.' : next.route === 'fallback' ? 'The switch is ready. Preserve evidence before separating the uplink, then restore and verify the service.' : 'Survey recorded: ' + next.samples.length + ' of 3 sites. The switch needs independent route evidence and the clinic dependency before a continuity decision.');
    if (next.phase === 'available') next.phase = 'survey';
    if (next.samples.indexOf(id) < 0) next.samples.push(id);
    return result(next, true, target.evidence + (next.samples.length === 3 && next.route === null ? ' All three observations are recorded. Return to the continuity switch to choose a route.' : ''));
  }
  function chooseRoute(state, route) {
    var error = checked(state); if (error) return error;
    if (state.samples.length < 3) return result(state, false, 'Inspect all three sites first. A route choice needs the uplink change, an independent maintenance record, and the clinic dependency.');
    if (route !== 'fallback' && route !== 'shutdown' && route !== 'primary') return result(state, false, 'Choose one of the three continuity options at the switch.');
    if (state.route === 'fallback') return result(state, route === 'fallback', route === 'fallback' ? 'The independently recorded fallback is already selected. Your recovery progress is preserved.' : 'A verified fallback is already selected. Changing the decision now would abandon the recorded recovery plan; your progress is preserved.');
    if (route === 'shutdown') return result(state, false, 'A total shutdown also stops clinic deliveries. Its reserve expires in 24 minutes. Contain the changed uplink while retaining a separately recorded lane with enough capacity.');
    if (route === 'primary') return result(state, false, 'ORBIT-PRIMARY was introduced by the changed uplink identity. The green health display is not independent evidence. Compare the sealed maintenance record.');
    var next = copy(state); next.route = 'fallback'; next.phase = 'routing';
    return result(next, true, 'LANTERN-02 selected from independent sealed manifest M-204. Its 12-crate capacity exceeds the clinic requirement of 8. Preserve the current state before making a change.');
  }
  function act(state, step) {
    var error = checked(state); if (error) return error;
    if (state.route !== 'fallback') return result(state, false, 'Record all three observations and select a supported continuity route before operating the switch.');
    if (STEP_ORDER.indexOf(step) < 0) return result(state, false, 'This switch action is not recognized. Your recovery record is unchanged.');
    if (state.steps.indexOf(step) >= 0) return result(state, true, 'That action is already recorded. No duplicate action or reward was added.');
    var expected = STEP_ORDER[state.steps.length];
    if (step !== expected) return result(state, false, {
      snapshot: 'Preserve a snapshot first so the uplink change can still be investigated.',
      isolate: 'Separate the changed uplink before restoring a lane so it cannot rewrite the restored plan.',
      restore: 'Restore the lane from the independent sealed record before measuring deliveries.',
      verify: 'Measure the actual clinic deliveries before declaring recovery complete.'
    }[expected]);
    var next = copy(state); next.steps.push(step);
    var messages = {
      snapshot: 'Read-only incident snapshot preserved. The unapproved rewrite and current dispatch state remain available for investigation.',
      isolate: 'The affected uplink is separated from dispatch writes. The sealed maintenance recorder and clinic delivery lane remain available.',
      restore: 'LANTERN-02 restored from sealed manifest M-204. The clinic lane is open; confirm actual deliveries before closing the incident.',
      verify: 'Verified: 8 of 8 clinic crates arrived through LANTERN-02; no unapproved uplink rewrites observed. The Last Mile is complete. Continuity Prism earned.'
    };
    if (next.steps.length === STEP_ORDER.length) next.phase = 'complete';
    return result(next, true, messages[step]);
  }
  function json(value) { return JSON.stringify(value, null, 2) + '\n'; }
  function briefFiles() {
    return [
      { name: 'last-mile-brief.txt', data: 'CYBERWORLD / THE LAST MILE\nORIGINAL SYNTHETIC FIELD CONTRACT\n\nThe dispatch uplink changed during a delivery incident. Keep essential clinic supplies moving while determining which component can be trusted. Survey the uplink, maintenance archive, and clinic in the 3D district; make your continuity decision at the dispatch switch.\n\nThe enclosed observations are fictional teaching evidence, not executable instructions or a solution key. No live systems, accounts, or network connections are involved.\n' },
      { name: 'uplink-change.log', data: '17:10 route=CLINIC-7 manifest=M-204 lane=LANTERN-02\n17:41 identity=uplink-service action=rewrite route=CLINIC-7 lane=ORBIT-PRIMARY approval=missing\n17:42 local-health-display=green source=uplink-service\n' },
      { name: 'sealed-maintenance-manifest.csv', data: 'record,recorded_at,route,lane,capacity_crates_per_hour,recorder,seal\r\nM-204,17:10,CLINIC-7,LANTERN-02,12,independent-read-only,match\r\n' },
      { name: 'clinic-delivery-observations.csv', data: 'observed_at,service,required_crates_per_hour,reserve_minutes,dependency\r\n17:43,cold-chain-delivery,8,24,functioning-dispatch-lane\r\n' },
      { name: 'field-notes.txt', data: 'THE LAST MILE / YOUR OFFLINE NOTES\n\nUplink observations:\n\nIndependent maintenance observations:\n\nClinic dependency:\n\nContinuity hypothesis and supporting evidence:\n\nRecovery observations:\n' }
    ];
  }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rewardFiles(state, handle) {
    if (!valid(state) || state.phase !== 'complete') throw new Error('Complete The Last Mile and verify clinic deliveries before downloading its earned reward.');
    var callsign = String(handle || 'LOCAL OPERATIVE').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32) || 'LOCAL OPERATIVE';
    var evidence = TARGETS.slice(0, 3).map(function (target) { return { id: target.id, title: target.title, observation: target.evidence }; });
    return [
      { name: 'last-mile-keeper.svg', data: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#07161f"/><path d="M480 52 675 153 640 369 480 462 320 369 285 153Z" fill="#123744" stroke="#73f2cf" stroke-width="6"/><path d="m480 124 97 126-97 126-97-126Z" fill="#73f2cf"/><path d="m480 155 69 95-69 95Z" fill="#dbfff7"/><text x="480" y="421" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="21">LAST MILE KEEPER</text><text x="480" y="515" text-anchor="middle" fill="#73f2cf" font-family="monospace" font-size="24">' + escape(callsign) + '</text><text x="480" y="563" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="18">CONTINUITY PRISM / CYBERWORLD</text><text x="480" y="603" text-anchor="middle" fill="#9cb7c4" font-family="monospace" font-size="13">LOCAL GAME ACHIEVEMENT / NOT OFFICIAL CERTIFICATION</text></svg>' },
      { name: 'continuity-prism-receipt.json', data: json({ format: 'cyberworld-field-reward-v1', mission: 'the-last-mile', callsign: callsign, item: REWARD.item, badge: REWARD.badge, xp: REWARD.xp, credits: REWARD.credits, completion: 'recorded-on-this-device', official_certification: false }) },
      { name: 'last-mile-field-report.json', data: json({ format: 'cyberworld-field-report-v1', mission: 'the-last-mile', synthetic: true, callsign: callsign, collected_evidence: evidence, selected_route: { choice: state.route, lane: 'LANTERN-02', manifest: 'M-204', independent_recorder: true }, recovery_steps: state.steps.slice(), outcome: { clinic_crates_required: 8, clinic_crates_delivered: 8, unapproved_rewrites_observed: 0 }, lesson: 'Corroborate the baseline independently; preserve essential services while containing a compromised component; verify the outcome.', local_achievement_only: true }) }
    ];
  }
  return Object.freeze({ fresh: fresh, valid: valid, normalize: normalize, start: start, inspect: inspect, chooseRoute: chooseRoute, act: act, briefFiles: briefFiles, rewardFiles: rewardFiles, TARGETS: TARGETS, targets: TARGETS, STEP_ORDER: STEP_ORDER, REWARD: REWARD });
}));
