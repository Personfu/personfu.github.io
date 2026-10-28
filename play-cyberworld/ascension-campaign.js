/* Codebreaker Ascension: deterministic original puzzles and local-only response. */
(function (root, factory) {
  'use strict';
  var data = typeof module === 'object' && module.exports ? require('./ascension-data.js') : root.CW_ASCENSION_DATA;
  var core = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = core;
  else core.attach(root);
}(typeof window !== 'undefined' ? window : globalThis, function (DATA) {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function upper(value) { return clean(value).replace(/\s+/g, ' ').toUpperCase(); }
  function hexBytes(value) {
    var s = clean(value).replace(/\s+/g, '');
    if (!s.length || s.length % 2 || !/^[0-9a-f]+$/i.test(s)) throw new Error('Use complete hexadecimal byte pairs.');
    return s.match(/../g).map(function (x) { return parseInt(x, 16); });
  }
  function fromHex(value) { return hexBytes(value).map(function (x) { return String.fromCharCode(x); }).join(''); }
  function recoverXor(c1, c2, plain) {
    var a = hexBytes(c1), b = hexBytes(c2);
    if (a.length !== b.length || plain.length !== a.length) throw new Error('The two byte strings and known plaintext must have equal lengths.');
    return a.map(function (x, i) { return String.fromCharCode(x ^ b[i] ^ plain.charCodeAt(i)); }).join('');
  }
  function boundsAccept(index, length, policy) {
    if (policy === 'inclusive') return Number.isInteger(index) && index >= 0 && index <= length;
    if (policy === 'upper-only') return Number.isInteger(index) && index < length;
    return policy === 'strict' && Number.isInteger(index) && index >= 0 && index < length;
  }
  function runBounds(policy) {
    return [-1, 0, 2, 3, 1.5].map(function (index) {
      var expected = index === 0 || index === 2;
      var actual = boundsAccept(index, 3, policy);
      return { index: index, expected: expected, actual: actual, passed: actual === expected };
    });
  }
  function validate(id, answer) {
    var a = answer || {};
    switch (id) {
      case 'route-zero': return clean(a.source) === '10.77.4.23' && clean(a.order).replace(/\s/g, '') === '1,2,3' && upper(a.message) === 'ROUTE OVERRIDE' && a.evidence === 'unauthorized';
      case 'trusted-package': return a.boundary === 'origin' && a.patch === 'both';
      case 'ghost-route': return clean(a.address) === '198.51.100.42' && a.cause === 'cache';
      case 'repeated-machine': return upper(a.message) === 'HOLD WEST' && a.failure === 'reuse';
      case 'bounds-of-trust': return a.policy === 'strict' && a.tested === 'true';
      case 'assembly-line': return a.edge === 'build-package' && clean(a.digest).toLowerCase() === DATA.missions[5].expectedDigest && a.compared === 'true';
      case 'hold-the-grid': return upper(a.order).replace(/\s/g, '') === 'B,A,C,D' && a.confidence === 'uncertain';
      default: return false;
    }
  }
  function coachGuide(id) { return DATA.coachGuides && DATA.coachGuides[id] ? copy(DATA.coachGuides[id]) : null; }
  function findingFeedback(id, answer) {
    var a = answer || {}, message = '';
    switch (id) {
      case 'route-zero':
        if (clean(a.source) !== '10.77.4.23') message = 'Start with the sender at 02, 12 and 22 seconds: 10.77.4.23. A repeating sender is only the first clue.';
        else if (clean(a.order).replace(/\s/g, '') !== '1,2,3') message = 'Use fragment numbers like page numbers: 1,2,3. Their arrival times are not the reading order.';
        else if (upper(a.message) !== 'ROUTE OVERRIDE') message = 'Try the decoder below the form. With order 1,2,3 it reads ROUTE OVERRIDE; copy that readable message.';
        else message = 'Your sender, order and message fit. For the final clue, choose the route-change log: authorized=false means the change was not permitted.';
        break;
      case 'trusted-package': message = a.boundary !== 'origin' ? 'The signature check is still present. Look for the missing TRUSTED_VENDOR origin check in the delivered version.' : 'Keep the origin check you found, and choose the repair requiring both a valid signature and trusted origin.'; break;
      case 'ghost-route': message = clean(a.address) !== '198.51.100.42' ? 'Use the newest owner record at 10:02: the current address is 198.51.100.42.' : 'The address is right. Resolver A saved an older answer and still has time left on its cache timer; that alone does not prove an attack.'; break;
      case 'repeated-machine': message = upper(a.message) !== 'HOLD WEST' ? 'Press the recovery workbench button. It reads HOLD WEST, so no byte arithmetic is needed by hand.' : 'The recovered message fits. The flaw is reuse of the same keystream / nonce, not hex or message length.'; break;
      case 'bounds-of-trust': message = a.policy !== 'strict' ? 'A three-route list has slots 0, 1 and 2. Choose the whole-number rule with index >= 0 and index < routes.length.' : 'The rule is right. Press Run boundary regression tests so the browser actually checks all five examples.'; break;
      case 'assembly-line':
        if (a.compared !== 'true') message = 'Press Compute SHA-256 for both artifacts first. The browser must calculate the two fingerprints before this finding is ready.';
        else if (clean(a.digest).toLowerCase() !== DATA.missions[5].expectedDigest) message = 'Copy the calculated fingerprint for abc, the reviewed source. You do not need to type or memorize it; the coach can copy it.';
        else message = 'The fingerprint fits. The reviewed build still says abc, while the delivered package says abd. Choose reviewed build → delivered package.';
        break;
      case 'hold-the-grid': message = upper(a.order).replace(/\s/g, '') !== 'B,A,C,D' ? 'Start with the changed package, then customer acceptance, token misuse and redirected deliveries: B,A,C,D.' : 'The timeline fits. Report the sponsor as uncertain; the evidence supports the technical chain but not a state sponsor.'; break;
      default: message = 'Open the coach for a worked example, or compare one clue at a time.';
    }
    return 'Finding not yet supported. ' + message + ' Nothing was lost; help is free.';
  }
  function emptyContainment() { return { snapshot: false, isolated: false, rotated: false, restored: false, verified: false }; }
  function respond(before, action, target) {
    var next = Object.assign(emptyContainment(), before || {}), ok = false, message = '';
    if (action === 'reset') return { state: emptyContainment(), ok: true, message: 'Simulation restored. Your evidence findings are retained.' };
    if (action === 'snapshot') { next.snapshot = true; ok = true; message = 'Capture and dispatcher logs preserved. Chain of custody recorded.'; }
    else if (target !== 'dispatcher') message = 'That would interrupt essential delivery traffic. Select DISPATCHER 23; no change was applied.';
    else if (action === 'isolate') {
      if (!next.snapshot) message = 'Preserve the supplied evidence first. This local exercise has time for a snapshot.';
      else { next.isolated = true; ok = true; message = 'Dispatcher isolated. The clean delivery lane remains open.'; }
    } else if (action === 'rotate') {
      if (!next.isolated) message = 'Isolate the compromised producer before replacing its scoped token.';
      else { next.rotated = true; ok = true; message = 'Route token revoked and replaced. The old token can no longer reconnect.'; }
    } else if (action === 'restore') {
      if (!next.rotated) message = 'Revoke the compromised route token before restoring the known-good manifest.';
      else { next.restored = true; ok = true; message = 'Known-good manifest restored. Ready to verify recovery.'; }
    } else if (action === 'verify') {
      if (!(next.snapshot && next.isolated && next.rotated && next.restored)) message = 'Recovery is incomplete. Preserve, isolate, rotate, and restore before verification.';
      else { next.verified = true; ok = true; message = 'Clean route verified. Essential deliveries arrived; no unauthorized updates observed.'; }
    }
    return { state: next, ok: ok, message: message || 'Choose a response action.' };
  }
  function freshSave() {
    return { version: 1, contentVersion: DATA.version, active: null, records: {}, completed: {}, journal: [], notes: '', overclock: 30, seenZero: false, academy: false, arcade: { best: 0 }, coach: true };
  }
  function normalizeSave(input) {
    var s = input && typeof input === 'object' ? input : {}, out = freshSave();
    out.active = DATA.missions.some(function (m) { return m.id === s.active; }) ? s.active : null;
    out.overclock = s.overclock == null ? out.overclock : Math.max(0, Math.min(100, Number(s.overclock) || 0));
    out.seenZero = s.seenZero === true; out.academy = s.academy === true;
    out.coach = s.coach !== false;
    out.notes = typeof s.notes === 'string' ? s.notes.slice(0, 12000) : '';
    out.arcade.best = Math.max(0, Math.min(8, Number(s.arcade && s.arcade.best) || 0));
    out.journal = Array.isArray(s.journal) ? s.journal.filter(function (j) { return j && typeof j.text === 'string'; }).slice(-100).map(function(j){return {at:typeof j.at==='string'?j.at.slice(0,40):'',text:j.text.slice(0,2000)};}) : [];
    DATA.missions.forEach(function (m) {
      if (s.completed && s.completed[m.id] === true) out.completed[m.id] = true;
      var r = s.records && s.records[m.id];
      if (!r || typeof r !== 'object') return;
      var allowedAnswer = {};
      ['source','order','message','evidence','boundary','patch','address','cause','failure','policy','tested','edge','digest','compared','confidence'].forEach(function (key) { if (r.answer && typeof r.answer[key] === 'string') allowedAnswer[key] = r.answer[key].slice(0,2048); });
      var safeContainment = emptyContainment();
      Object.keys(safeContainment).forEach(function (key) { safeContainment[key] = !!(r.containment && r.containment[key] === true); });
      out.records[m.id] = {
        stage: ['brief', 'puzzle', 'containment', 'debrief', 'complete'].indexOf(r.stage) >= 0 ? r.stage : 'brief',
        mistakes: Math.max(0, Math.min(999, Number(r.mistakes) || 0)), hints: Math.max(0, Math.min(3, Number(r.hints) || 0)),
        answer: allowedAnswer,
        containment: safeContainment, testsPassed: r.testsPassed === true, hashesCompared: r.hashesCompared === true
      };
      if (out.completed[m.id]) out.records[m.id].stage = 'complete';
    });
    return out;
  }
  function canStart(save, id) {
    var index = DATA.missions.findIndex(function (m) { return m.id === id; });
    return index >= 0 && (index === 0 || save.completed[DATA.missions[index - 1].id] === true);
  }
  function validImport(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s) || s.version !== 1 || s.contentVersion !== DATA.version) return false;
    if (JSON.stringify(s).length > 180000) return false;
    if (Object.keys(s).some(function(k){return ['version','contentVersion','active','records','completed','journal','notes','overclock','seenZero','academy','arcade','coach'].indexOf(k)<0;})) return false;
    if (s.coach !== undefined && typeof s.coach !== 'boolean') return false;
    if (s.active !== null && (typeof s.active !== 'string' || !DATA.missions.some(function(m){return m.id===s.active;}))) return false;
    if (typeof s.notes !== 'string' || s.notes.length > 12000 || !Array.isArray(s.journal) || s.journal.length > 100) return false;
    if (typeof s.overclock !== 'number' || !Number.isFinite(s.overclock) || s.overclock < 0 || s.overclock > 100) return false;
    if (typeof s.seenZero !== 'boolean' || typeof s.academy !== 'boolean') return false;
    if (!s.records || typeof s.records !== 'object' || Array.isArray(s.records) || !s.completed || typeof s.completed !== 'object' || Array.isArray(s.completed)) return false;
    if (!s.arcade || !Number.isInteger(s.arcade.best) || s.arcade.best < 0 || s.arcade.best > 8 || Object.keys(s.arcade).some(function(k){return k!=='best';})) return false;
    var ids=DATA.missions.map(function(m){return m.id;});
    if (Object.keys(s.completed).some(function(id){return ids.indexOf(id)<0||s.completed[id]!==true;}) || Object.keys(s.records).some(function(id){return ids.indexOf(id)<0;})) return false;
    if (s.journal.some(function(j){return !j || typeof j!=='object' || typeof j.at!=='string' || j.at.length>40 || typeof j.text!=='string' || j.text.length>2000 || Object.keys(j).some(function(k){return k!=='at'&&k!=='text';});})) return false;
    return Object.keys(s.records).every(function(id){var r=s.records[id];return r && typeof r==='object' && !Array.isArray(r) && ['brief','puzzle','containment','debrief','complete'].indexOf(r.stage)>=0 && Number.isInteger(r.mistakes) && r.mistakes>=0 && r.mistakes<=999 && Number.isInteger(r.hints) && r.hints>=0 && r.hints<=3 && typeof r.testsPassed==='boolean' && typeof r.hashesCompared==='boolean' && r.answer && typeof r.answer==='object' && !Array.isArray(r.answer) && Object.keys(r.answer).every(function(k){return ['source','order','message','evidence','boundary','patch','address','cause','failure','policy','tested','edge','digest','compared','confidence'].indexOf(k)>=0 && typeof r.answer[k]==='string' && r.answer[k].length<=2048;}) && r.containment && Object.keys(r.containment).length===5 && Object.keys(emptyContainment()).every(function(k){return typeof r.containment[k]==='boolean';}) && Object.keys(r).every(function(k){return ['stage','mistakes','hints','answer','containment','testsPassed','hashesCompared'].indexOf(k)>=0;});});
  }
  function summary(save) {
    var done = DATA.missions.filter(function (m) { return save.completed[m.id]; });
    return { count: done.length, xp: done.reduce(function (n, m) { return n + m.reward.xp; }, 0), credits: done.reduce(function (n, m) { return n + m.reward.credits; }, 0), inventory: done.map(function (m) { return m.reward.item; }), badges: done.map(function (m) { return m.badge; }) };
  }

  function attach(win) {
    if (win.__cwAscension) return;
    var doc = win.document, KEY = 'cw.ascension.v1', saved;
    try { saved = JSON.parse(win.localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    var state = normalizeSave(saved), modal, dialog, lastFocus, activeTab = 'missions', initialized = false;
    var animation = null, overclockTimer = null, overclockActive = false, saveOk = true, selectedNode = 'dispatcher', arcadeRun = null, coachSteps = {}, coachToolBusy = false;
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function emit() { doc.dispatchEvent(new win.CustomEvent('cw:ascension-state', { detail: publicState(), bubbles: true })); }
    function save() {
      try { win.localStorage.setItem(KEY, JSON.stringify(state)); saveOk = true; } catch (e) { saveOk = false; }
      emit();
    }
    function publicState() { return Object.assign(copy(state), summary(state), { overclockActive: overclockActive, saveOk: saveOk, next: nextMission().id }); }
    function record(id) {
      if (!state.records[id]) state.records[id] = { stage: 'brief', mistakes: 0, hints: 0, answer: {}, containment: emptyContainment(), testsPassed: false, hashesCompared: false };
      return state.records[id];
    }
    function nextMission() { return DATA.missions.find(function (m) { return !state.completed[m.id]; }) || DATA.missions[DATA.missions.length - 1]; }
    function mission(id) { return DATA.missions.find(function (m) { return m.id === id; }) || nextMission(); }
    function journal(text) { state.journal.push({ at: new Date().toISOString(), text: text }); state.journal = state.journal.slice(-100); }
    function button(label, action, value, extra) { return '<button type="button" class="cwas-btn" data-action="' + esc(action) + '"' + (value ? ' data-value="' + esc(value) + '"' : '') + (extra || '') + '>' + esc(label) + '</button>'; }
    function input(label, name, placeholder, value) { return '<label class="cwas-field">' + esc(label) + '<input name="' + esc(name) + '" autocomplete="off" spellcheck="false" placeholder="' + esc(placeholder || '') + '" value="' + esc(value || '') + '"></label>'; }
    function select(label, name, options, value) { return '<label class="cwas-field">' + esc(label) + '<select name="' + esc(name) + '"><option value="">Choose from the evidence…</option>' + options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; }
    function panel(title, body) { return '<section class="cwas-panel"><h3>' + esc(title) + '</h3>' + body + '</section>'; }
    function caseFiles(m) { return win.CW_ASCENSION_DOWNLOADS ? win.CW_ASCENSION_DOWNLOADS.controls(m, state.completed[m.id] === true) : ''; }
    function table(head, rows) { return '<div class="cwas-table-scroll"><table class="cwas-evidence"><thead><tr>' + head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
    function setCoach(enabled) { state.coach = enabled !== false; save(); return state.coach; }
    function coachToggle() {
      return '<div class="cwas-coach-toggle"><p><strong>' + (state.coach ? 'Coach is on' : 'Working solo') + '</strong> · ' + (state.coach ? 'Plain-language clues and tools, at your pace. Same rewards.' : 'The original evidence tools are available. Help is always free.') + '</p>' + button(state.coach ? 'Work solo / hide coach' : 'Turn coach on', 'coach-mode', state.coach ? 'expert' : 'coach') + '</div>';
    }
    function coachPanel(m) {
      var guide = coachGuide(m.id);
      if (!guide) return '';
      if (!state.coach) return coachToggle();
      var savedRecord = record(m.id), firstMissing = guide.steps.findIndex(function (item) {
        return (item.tool === 'bounds-test' && !savedRecord.testsPassed) || (item.tool === 'hash' && !savedRecord.hashesCompared) || Object.keys(item.fields).some(function (key) { return clean(savedRecord.answer[key]) !== item.fields[key]; });
      });
      var index = Math.max(0, Math.min(guide.steps.length - 1, Number.isInteger(coachSteps[m.id]) ? coachSteps[m.id] : firstMissing < 0 ? guide.steps.length - 1 : firstMissing)), step = guide.steps[index];
      return '<section class="cwas-panel cwas-coach" aria-label="Case coach"><div class="cwas-coach-header"><div><span class="cwas-eyebrow">YOUR COACH / NO TIMER</span><h3>' + esc(guide.goal) + '</h3></div>' + button('Work solo / hide coach', 'coach-mode', 'expert') + '</div><p>' + esc(guide.payoff) + '</p><div class="cwas-coach-steps"><span>CLUE ' + (index + 1) + ' OF ' + guide.steps.length + '</span><progress max="' + guide.steps.length + '" value="' + (index + 1) + '" aria-label="Worked clue ' + (index + 1) + ' of ' + guide.steps.length + '"></progress><article class="cwas-coach-step"><h4>' + esc(step.title) + '</h4><p>' + esc(step.text) + '</p><div class="cwas-actions">' + button(step.tool ? 'Use this clue + try the tool' : 'Use this clue', 'coach-use', String(index)) + (index > 0 ? button('Review the previous clue', 'coach-next', String(index - 1)) : '') + (index < guide.steps.length - 1 ? button('Show me the next step', 'coach-next', String(index + 1)) : button('Review my finding', 'coach-review') + '<p>All clues explained. Review your choices, then press <strong>Verify finding</strong> when ready. You can change any choice.</p>') + '</div></article><p id="cwas-coach-message" role="status" aria-live="polite">Read the explanation, then use the clue if you want a hand. Nothing is submitted for you.</p></div><details class="cwas-coach-terms"><summary>What do these words mean?</summary><dl>' + guide.terms.map(function (term) { return '<dt>' + esc(term[0]) + '</dt><dd>' + esc(term[1]) + '</dd>'; }).join('') + '</dl></details></section>';
    }
    async function useCoachStep(m, value, form) {
      var guide = coachGuide(m.id), index = Number(value);
      if (!state.coach || !guide || !form || !Number.isInteger(index) || index < 0 || index >= guide.steps.length) return;
      if (coachToolBusy) { status('The tool is still calculating. Its result will appear below in a moment.', true); return; }
      var step = guide.steps[index];
      Object.keys(step.fields).forEach(function (name) {
        var field = form.elements[name];
        if (!field || field.type === 'hidden') return;
        field.value = step.fields[name]; field.dispatchEvent(new win.Event('change', { bubbles: true }));
      });
      if (['decode-packets', 'xor', 'bounds-test', 'hash'].indexOf(step.tool) >= 0) {
        coachToolBusy = true;
        try { await handleAction(step.tool, ''); } finally { coachToolBusy = false; }
        if (!form.isConnected) return;
      }
      rememberForm();
      var message = doc.getElementById('cwas-coach-message');
      if (message) message.textContent = step.tool ? 'The tool ran on the supplied game evidence. Read its result below; you still choose when to verify your finding.' : 'Clue copied into the form. You can change it, ask for the next step, or verify when ready.';
      status('Coach helped with one clue. No answer was submitted and no reward was claimed.', true);
    }
    function containmentCoach(r) {
      var steps = [
        ['snapshot', 'Keep a copy first', 'Press 1 / Save evidence to keep a copy before making changes.'],
        ['isolated', 'Disconnect only the affected computer', 'Dispatcher 23 is already selected. Press 2 / Disconnect affected computer to stop it changing routes while the essential delivery network stays connected.'],
        ['rotated', 'Replace the stolen access token', 'Press 3 / Replace access pass. A token is a scoped access pass; replacing it stops the old pass reconnecting.'],
        ['restored', 'Put the trusted route back', 'Press 4 / Restore safe route to load the known-good delivery route.'],
        ['verified', 'Check that deliveries are healthy', 'Press 5 / Check deliveries to measure the result. A good repair needs a real check, not just a reassuring light.']
      ];
      var index = steps.findIndex(function (step) { return !r.containment[step[0]]; });
      return index < 0 ? '<strong>All five recovery steps are complete.</strong><p>Open the after-action report to collect your earned reward.</p>' : '<span class="cwas-eyebrow">COACH / NEXT ACTION ' + (index + 1) + ' OF 5</span><h3>' + esc(steps[index][1]) + '</h3><p>' + esc(steps[index][2]) + '</p><p>No timer. A wrong choice can be changed without losing your case.</p>';
    }
    function status(text, good) {
      var node = doc.getElementById('cwas-status');
      if (node) { node.textContent = text; node.dataset.tone = good ? 'good' : 'notice'; }
    }
    function ensureModal() {
      modal = doc.getElementById('cwas-modal');
      if (!modal) { modal = doc.createElement('div'); modal.id = 'cwas-modal'; doc.body.appendChild(modal); }
      modal.classList.add('cwas-modal'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'cwas-dialog-title');
      modal.hidden = true;
      modal.addEventListener('click', function (event) {
        var close = event.target.closest('[data-close]'); if (close) { closeModal(); return; }
        var action = event.target.closest('[data-action]'); if (action) handleAction(action.dataset.action, action.dataset.value || '');
      });
      modal.addEventListener('submit', submitPuzzle);
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
        if (e.key !== 'Tab') return;
        var focusable = Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]),input,textarea,select,a[href]')).filter(function (el) { return !el.hidden; });
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    function stopAnimation() { if (animation != null) win.cancelAnimationFrame(animation); animation = null; if (win.__cwResponse3D) win.__cwResponse3D.dispose(); }
    function show(title, html, tab) {
      if (!modal) ensureModal();
      stopAnimation();
      if (!modal.classList.contains('is-open')) lastFocus = doc.activeElement;
      modal.setAttribute('aria-labelledby', 'cwas-dialog-title');
      modal.removeAttribute('aria-label');
      modal.hidden = false; modal.classList.add('is-open');
      if (win.__cwWorld && win.__cwWorld.setMovement) win.__cwWorld.setMovement(0, 0);
      if (tab) activeTab = tab;
      modal.innerHTML = '<div class="cwas-dialog" tabindex="-1"><header class="cwas-dialog-header"><div><span class="cwas-eyebrow">CYBERDECK / SIMULATION</span><h2 id="cwas-dialog-title">' + esc(title) + '</h2></div><button type="button" class="cwas-close" data-close aria-label="Close CyberDeck">×</button></header><nav class="cwas-deck-tabs" aria-label="CyberDeck applications">' + [['missions','Operations'],['journal','Journal'],['inventory','Loadout'],['codex','Codex'],['map','Map'],['academy','Academy'],['arcade','Arcade']].map(function (t) { return '<button type="button" data-action="tab" data-value="' + t[0] + '"' + (activeTab === t[0] ? ' aria-current="page"' : '') + '>' + t[1] + '</button>'; }).join('') + '</nav><div class="cwas-dialog-content">' + html + '</div><div id="cwas-status" class="cwas-status" role="status" aria-live="polite">' + (saveOk ? 'Local progress saved. No external targets or live traffic.' : 'Storage unavailable. Keep this tab open to retain this session.') + '</div></div>';
      var content = modal.querySelector('.cwas-dialog-content');
      if (state.active && (html.indexOf('data-puzzle=') >= 0 || html.indexOf('cwas-case-top') >= 0 || html.indexOf('cwas-reward') >= 0)) content.insertAdjacentHTML(state.coach ? 'beforeend' : 'afterbegin', caseFiles(mission(state.active)));
      if (title === 'Operative / LOADOUT') content.insertAdjacentHTML('beforeend', panel('DOWNLOAD YOUR ACHIEVEMENTS', DATA.missions.filter(function (m) { return state.completed[m.id]; }).map(caseFiles).join('') || '<p>File a case to unlock its original badge, certificate, and module receipt.</p>'));
      dialog = modal.querySelector('.cwas-dialog'); dialog.focus();
    }
    function closeModal() {
      if (!modal) return;
      rememberForm(); stopAnimation(); modal.classList.remove('is-open'); modal.hidden = true;
      if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    }
    function rememberForm() {
      var form = modal && modal.querySelector('[data-puzzle]');
      if (!form || !state.active) return;
      record(state.active).answer = Object.fromEntries(new win.FormData(form).entries()); save();
    }
    function talkZero() {
      state.seenZero = true; if (!state.journal.some(function (j) { return j.text.indexOf('Agent Zero established') === 0; })) journal('Agent Zero established the Black Freight case: signed manifests, unauthorized routes.'); save();
      show('Agent Zero / FIRST CONTACT', '<div class="cwas-transmission"><span class="cwas-npc-portrait">Ø</span><blockquote>“The delivery board is confused. Let’s get the clinic supplies to the right place.”</blockquote><p>You do not need to know cybersecurity yet. We will find one repeating sender, let a tool read its message, then check a second clue. Your coach explains every step, and there is no timer.</p></div>' + panel('WHEN YOU ARE READY', '<p>SOC Tower is the city’s investigation room. You can explore first or open the first case now. Help is free, mistakes cost nothing, and your starter tools are enough.</p><div class="cwas-actions">' + button('Enter SOC Tower', 'enter-soc') + button('Open case with a coach', 'mission', nextMission().id) + button('Explore a little longer', 'close') + '</div>') + coachToggle(), 'missions');
    }
    function openDeck(tab) {
      rememberForm(); tab = tab || 'missions';
      if (tab === 'mission') { startMission(); return; }
      if (tab === 'inventory' || tab === 'profile' || tab === 'loadout') { showInventory(); return; }
      if (tab === 'journal' || tab === 'notes') { showJournal(); return; }
      if (tab === 'codex' || tab === 'liaisons') { showCodex(); return; }
      if (tab === 'map') { showMap(); return; }
      if (tab === 'academy') { showAcademy(); return; }
      if (tab === 'arcade') { showArcade(); return; }
      show('Black Freight / OPERATIONS', '<p class="cwas-lead">' + esc(DATA.premise) + '</p>' + coachToggle() + '<div class="cwas-progress"><span>' + summary(state).count + ' / 7 CITY CASES COMPLETE</span><progress max="7" value="' + summary(state).count + '"></progress></div><div class="cwas-mission-list">' + DATA.missions.map(function (m) { var locked = !canStart(state, m.id), done = state.completed[m.id], guide = coachGuide(m.id); return '<article class="cwas-mission-card' + (locked ? ' is-locked' : '') + '"><div><span class="cwas-eyebrow">CASE ' + m.act + ' / ' + (state.coach ? 'COACH AVAILABLE' : esc(m.skill)) + '</span><h3>' + esc(m.title) + '</h3><p>' + esc(state.coach && guide ? guide.goal : m.brief) + '</p><small>' + m.reward.xp + ' XP · ' + esc(m.reward.item) + '</small></div>' + button(done ? 'Review your success' : locked ? 'Complete the previous case first' : record(m.id).stage === 'brief' ? 'Open case' : 'Continue case', 'mission', m.id, locked ? ' disabled' : '') + '</article>'; }).join('') + '</div><p class="cwas-fine">' + esc(DATA.disclaimer) + '</p>', 'missions');
    }
    function startMission(id) {
      var m = mission(id || (state.active && !state.completed[state.active] ? state.active : null)), r = record(m.id);
      if (!canStart(state, m.id)) { openDeck('missions'); status('Verify the preceding act before opening this case.', false); return; }
      state.active = m.id; save();
      if (state.completed[m.id] || r.stage === 'debrief' || r.stage === 'complete') { showDebrief(m); return; }
      if (r.stage === 'containment') { showContainment(m); return; }
      if (r.stage === 'puzzle') { showPuzzle(m); return; }
      var guide = coachGuide(m.id);
      show('CASE ' + m.act + ' / ' + m.title, '<div class="cwas-case-top" data-case-brief><span class="cwas-case-id">GF-' + m.act + '</span><span>' + esc(m.npc) + '</span></div><h3>' + esc(state.coach && guide ? guide.goal : m.objective) + '</h3><p class="cwas-lead">' + esc(state.coach && guide ? guide.payoff : m.brief) + '</p>' + coachToggle() + panel('HOW THIS WORKS', '<p>Open the evidence, follow one clue at a time, then choose when to verify your finding. The tools do the calculations. There is no timer or penalty, and all characters and systems here are local game fiction.</p>') + '<div class="cwas-actions">' + button(state.coach ? 'Inspect evidence / learn with the coach' : 'Inspect evidence', 'investigate', m.id) + button('Return to world', 'close') + '</div>', 'missions');
    }
    function puzzleHtml(m, a) {
      if (m.kind === 'packets') return table(['Time / s', 'Source', 'Destination', 'Protocol', 'Seq', 'Payload'], m.packets.map(function (p) { return [p.time, p.src, p.dst, p.protocol, p.seq, p.payload]; })) + panel('ENDPOINT LOG', '<pre>' + esc(m.log) + '</pre>') + '<div class="cwas-form-grid">' + select('Repeating source', 'source', [['10.77.4.10','10.77.4.10'],['10.77.4.23','10.77.4.23'],['10.77.4.18','10.77.4.18']], a.source) + input('Fragment sequence order', 'order', 'e.g. 3,1,2', a.order) + input('Decoded message', 'message', 'Reassemble, then decode', a.message) + select('Independent corroboration', 'evidence', [['clock','The NTP synchronization'],['unauthorized','The unauthorized route-change log'],['dns','The DNS lookup alone']], a.evidence) + '</div>' + '<div class="cwas-workbench">' + button('Decode my ordered hex fragments', 'decode-packets') + '<output id="cwas-tool-result" aria-live="polite"></output></div>';
      if (m.kind === 'artifact') return '<div class="cwas-compare">' + panel('REVIEWED UPDATER', '<pre>' + esc(m.before) + '</pre>') + panel('DELIVERED UPDATER — VALID SIGNATURE', '<pre>' + esc(m.after) + '</pre>') + '</div><div class="cwas-form-grid">' + select('Removed boundary', 'boundary', [['signature','Signature verification'],['origin','Vendor origin validation'],['route','Route application']], a.boundary) + select('Recovery patch', 'patch', [['signature-only','Keep signature check only'],['both','Require valid signature AND trusted origin'],['disable','Disable all verification']], a.patch) + '</div>';
      if (m.kind === 'dns') return table(['Time', 'Observation', 'Name', 'Answer', 'Context'], m.records) + '<div class="cwas-form-grid">' + input('Current authoritative address', 'address', 'Read the newest authoritative record', a.address) + select('Best-supported explanation', 'cause', [['hijack','Confirmed DNS hijack'],['cache','Older cache entry still within TTL'],['malware','Confirmed resolver malware']], a.cause) + '</div>';
      if (m.kind === 'crypto') return panel('SUPPLIED TOY TELEMETRY', '<pre>Known P1: ' + esc(m.plain1) + '\nC1 (hex): ' + m.cipher1 + '\nC2 (hex): ' + m.cipher2 + '\nP2 = C1 XOR C2 XOR P1</pre>') + '<div class="cwas-workbench">' + button('Apply XOR recovery to supplied bytes', 'xor') + '<output id="cwas-tool-result" aria-live="polite"></output></div><div class="cwas-form-grid">' + input('Recovered P2', 'message', 'Use the byte workbench', a.message) + select('Why was recovery possible?', 'failure', [['hex','Hex encoding is secret'],['reuse','The same keystream / nonce was reused'],['length','All short messages are insecure']], a.failure) + '</div>';
      if (m.kind === 'bounds') return panel('TOY PARSER — NO EXECUTABLE INPUT', '<pre>' + esc(m.code) + '</pre>') + select('Replacement predicate', 'policy', [['inclusive','Number.isInteger(index) && index >= 0 && index <= routes.length'],['upper-only','Number.isInteger(index) && index < routes.length'],['strict','Number.isInteger(index) && index >= 0 && index < routes.length']], a.policy) + '<input type="hidden" name="tested" value="' + (record(m.id).testsPassed ? 'true' : 'false') + '"><div class="cwas-workbench">' + button('Run boundary regression tests', 'bounds-test') + '<output id="cwas-tool-result" aria-live="polite">' + (record(m.id).testsPassed ? 'All five edge cases passed in this session.' : 'Run your chosen predicate against -1, 0, 2, 3, and 1.5.') + '</output></div>';
      if (m.kind === 'supply') return panel('INDEPENDENTLY PRESERVED CHAIN', '<ol>' + m.chain.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol><p>Trusted SHA-256 manifest for reviewed build:</p><pre>' + m.expectedDigest + '</pre><p>The three-byte toy artifacts contain exactly the displayed letters, without a newline.</p>') + '<div class="cwas-workbench">' + button('Compute SHA-256 for both artifacts', 'hash') + '<output id="cwas-tool-result" aria-live="polite">' + (record(m.id).hashesCompared ? 'Both artifact digests were calculated; recompute to inspect them.' : '') + '</output></div><input type="hidden" name="compared" value="' + (record(m.id).hashesCompared ? 'true' : 'false') + '">' + input('Digest matching the reviewed source', 'digest', 'Copy the matching calculated digest', a.digest) + select('First evidenced mismatch', 'edge', [['vendor-build','Vendor -> reviewed build'],['build-package','Reviewed build -> delivered package'],['package-customer','Delivered package -> customer']], a.edge);
      return panel('CASE BOARD', '<ol>' + m.evidence.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>') + '<div class="cwas-form-grid">' + input('Chronological evidence order', 'order', 'Use letters separated by commas', a.order) + select('Sponsor attribution assessment', 'confidence', [['certain','A state sponsor is established'],['uncertain','Sponsor uncertain; technical chain supported'],['none','There was no incident']], a.confidence) + '</div>';
    }
    function showPuzzle(m) {
      var r = record(m.id);
      show('CASE ' + m.act + ' / ' + m.title, coachPanel(m) + '<p class="cwas-lead">' + esc(state.coach && coachGuide(m.id) ? coachGuide(m.id).goal : m.objective) + '</p><form data-puzzle="' + esc(m.id) + '">' + puzzleHtml(m, r.answer || {}) + '<div class="cwas-actions"><button type="submit" class="cwas-btn cwas-primary">Verify finding</button>' + button('Another clue / free hint', 'hint', m.id) + button('OVERCLOCK / highlight relationships', 'overclock') + '</div></form><div id="cwas-hint" class="cwas-hint" aria-live="polite">' + (r.hints ? esc(m.hints[r.hints - 1]) : 'Help is free and mistakes cost nothing. Close this case whenever you like; your entered clues are saved.') + '</div>', 'missions');
      if (m.kind === 'bounds') modal.querySelector('[name="policy"]').addEventListener('change', function () { r.testsPassed = false; modal.querySelector('[name="tested"]').value = 'false'; save(); });
    }
    function submitPuzzle(e) {
      var form = e.target.closest('[data-puzzle]'); if (!form) return;
      e.preventDefault(); var m = mission(form.dataset.puzzle), r = record(m.id), answer = Object.fromEntries(new win.FormData(form).entries());
      if (m.kind === 'bounds') answer.tested = r.testsPassed ? 'true' : 'false';
      if (m.kind === 'supply') answer.compared = r.hashesCompared ? 'true' : 'false';
      r.answer = answer;
      if (!validate(m.id, answer)) { r.mistakes++; save(); status(findingFeedback(m.id, answer), false); return; }
      r.stage = m.containment ? 'containment' : 'debrief'; state.overclock = Math.min(100, state.overclock + 45); journal('Verified ' + m.title + ': ' + m.skill + '.'); save();
      if (m.containment) showContainment(m); else showDebrief(m);
    }
    function showContainment(m) {
      var r = record(m.id); selectedNode = 'dispatcher';
      show(m.title + ' / RECOVERY', '<p class="cwas-lead">Keep the clinic deliveries moving. Repair the affected computer in five small steps.</p>' + (state.coach ? '<section id="cwas-recovery-coach" class="cwas-panel cwas-coach" aria-live="polite">' + containmentCoach(r) + '</section>' : '') + '<div class="cwas-response-arena"><canvas id="cwas-response-canvas" class="cwas-response-canvas" width="880" height="340" role="img" aria-label="Three-dimensional infrastructure response arena. Trusted archive and essential deliveries stay connected; dispatcher 23 feeds an unauthorized route. Target buttons provide equivalent selection."></canvas></div><div class="cwas-targets" role="group" aria-label="Response target">' + button(state.coach ? 'Affected computer / Dispatcher 23' : 'DISPATCHER 23 / affected', 'target', 'dispatcher', ' aria-pressed="true"') + button(state.coach ? 'Entire delivery network / keep online' : 'WHOLE SUBNET / essential traffic', 'target', 'subnet', ' aria-pressed="false"') + '</div><ol class="cwas-response-checklist">' + [['snapshot','Save evidence'],['isolated','Disconnect affected computer'],['rotated','Replace access pass'],['restored','Restore safe route'],['verified','Check deliveries']].map(function (step) { return '<li id="cwas-check-' + step[0] + '" class="' + (r.containment[step[0]] ? 'is-done' : '') + '">' + step[1] + '</li>'; }).join('') + '</ol><div class="cwas-actions">' + button(state.coach ? '1 / Save evidence' : '1 / SNAPSHOT', 'respond', 'snapshot') + button(state.coach ? '2 / Disconnect affected computer' : '2 / ISOLATE', 'respond', 'isolate') + button(state.coach ? '3 / Replace access pass' : '3 / ROTATE', 'respond', 'rotate') + button(state.coach ? '4 / Restore safe route' : '4 / RESTORE', 'respond', 'restore') + button(state.coach ? '5 / Check deliveries' : '5 / VERIFY', 'respond', 'verify') + button('OVERCLOCK', 'overclock') + button('Reset response', 'respond', 'reset') + '</div><p class="cwas-fine">The animated traffic is local simulation. Reading is never timed. Wrong actions are reversible and do not erase your case.</p>', 'missions');
      drawContainment(m);
    }
    function drawContainment(m) {
      var canvas = doc.getElementById('cwas-response-canvas'); if (!canvas) return;
      if (!win.__cwResponse3D) { status('The 3D response renderer is unavailable. Your saved case and accessible response controls remain ready.', false); return; }
      try {
        win.__cwResponse3D.mount(canvas, function () {
          var snapshot = win.__cwWorld && win.__cwWorld.snapshot ? win.__cwWorld.snapshot() : {};
          return Object.assign({}, record(m.id).containment, { selectedTarget: selectedNode, overclockActive: overclockActive, reducedMotion: snapshot.reducedMotion === true || !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) });
        }, { onSelect: function (target) { handleAction('target', target); } });
      } catch (e) { status('This browser could not initialize the WebGL 3D arena. Use the equivalent target and response controls below; your case remains saved.', false); }
    }
    function showDebrief(m) {
      var r = record(m.id), done = state.completed[m.id];
      show(m.title + ' / AFTER-ACTION', panel('WHAT YOU ESTABLISHED', '<p>' + esc(m.debrief) + '</p>') + panel('WHAT A DEFENDER WOULD DO', '<p>' + esc(m.defense) + '</p>') + '<div class="cwas-reward"><span class="cwas-eyebrow">' + (done ? 'REWARD RECORDED' : 'CASE READY TO FILE') + '</span><h3>' + m.reward.xp + ' XP · ' + m.reward.credits + ' CREDITS</h3><p>' + esc(m.reward.item) + ' / ' + esc(m.badge) + '</p></div><p>' + r.hints + ' hint layers used · ' + r.mistakes + ' revised findings · no penalty for learning</p><div class="cwas-actions">' + button(done ? 'Return to Plaza' : 'File case + claim reward', done ? 'return-plaza' : 'complete', m.id) + (done && summary(state).count < DATA.missions.length ? button('Open next operation', 'mission', nextMission().id) : '') + button('Related Codex', 'tab', 'codex') + '</div>', 'missions');
    }
    function complete(m) {
      var r = record(m.id);
      if (r.stage !== 'debrief' && !state.completed[m.id]) return;
      if (!state.completed[m.id]) {
        state.completed[m.id] = true; r.stage = 'complete'; state.overclock = Math.min(100, state.overclock + 25);
        journal('Case filed: ' + m.title + '. Earned ' + m.reward.item + ' and ' + m.badge + '.');
      }
      save(); syncRewards(); showDebrief(m); status('Case filed. XP, badge, and module are saved once. Return to Plaza or open the next operation.', true);
    }
    function syncRewards() {
      if (!win.__cwGameplay || typeof win.__cwGameplay.completeMission !== 'function') return;
      DATA.missions.forEach(function (m) { if (state.completed[m.id]) win.__cwGameplay.completeMission('ascension-' + m.id, m.reward); });
      if (win.__cwWorld && win.__cwWorld.refresh) win.__cwWorld.refresh();
    }
    function showInventory() {
      var s = summary(state), op = win.__cwGameplay && win.__cwGameplay.state ? win.__cwGameplay.state() : {};
      var gear = Object.keys(op.inventory || {}).filter(function (id) { return Number(op.inventory[id]) > 0; });
      show('Operative / LOADOUT', '<div class="cwas-stat-grid">' + panel('OPERATIVE', '<strong>' + esc(op.callsign || 'LOCAL OPERATIVE') + '</strong><p>Handles only. Your existing operative is preserved.</p>') + panel('CAMPAIGN RECORD', '<strong>' + s.xp + ' XP · ' + s.count + '/7</strong><p>' + s.credits + ' campaign credits earned</p>') + '</div>' + panel('EARNED CYBERDECK MODULES', s.inventory.length ? '<ul>' + s.inventory.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' : '<p>Your starter CyberDeck can solve every Foundation exercise. File Route Zero to earn the Traffic Lens.</p>') + panel('COMPLETE OPERATIVE INVENTORY', gear.length ? '<ul>' + gear.map(function (id) { return '<li>' + esc(id) + ' × ' + esc(op.inventory[id]) + '</li>'; }).join('') + '</ul><p>Existing CyberWorld gear remains available alongside Ascension rewards.</p>' : '<p>Your shared inventory will show acquired gear here.</p>') + panel('BADGE SHELF', s.badges.length ? '<ul>' + s.badges.map(function (badge) { return '<li>' + esc(badge) + '</li>'; }).join('') + '</ul>' : '<p>Your first badge is earned through evidence.</p>') + '<p class="cwas-fine">CyberWorld campaign badges are independent game achievements, not agency awards or certifications.</p>', 'inventory');
    }
    function showJournal() {
      show('Casebook / JOURNAL', '<ol class="cwas-journal">' + (state.journal.length ? state.journal.map(function (j) { return '<li><time>' + esc(j.at.slice(0,16).replace('T',' ')) + ' UTC</time><p>' + esc(j.text) + '</p></li>'; }).join('') : '<li>Meet Agent Zero to open the Black Freight case.</li>') + '</ol><label class="cwas-field">PRIVATE LOCAL CASE NOTES<textarea id="cwas-notes" maxlength="12000" rows="6" placeholder="Facts, hypotheses, questions…">' + esc(state.notes) + '</textarea></label>' + button('Save notes', 'save-notes'), 'journal');
    }
    function showCodex() {
      var unlocked = { encoding: true, packets: true };
      DATA.missions.forEach(function (m) { if (state.records[m.id] || state.completed[m.id]) m.codex.forEach(function (id) { unlocked[id] = true; }); });
      show('Intelligence Board / CODEX', '<p class="cwas-lead">Explore the city’s hacker lore and the public reporting behind its defensive lessons. This board is optional: no quiz or prior knowledge is needed to keep playing.</p><div class="cwas-agency-strip" aria-label="Public-agency inspirations for fictional liaisons"><span>FICTIONAL LIAISONS / INSPIRED BY</span>' + ['NSA','FBI','CIA','CISA','NIST','USCYBERCOM'].map(function (name) { return '<strong>' + esc(name) + '</strong>'; }).join('') + '</div><p class="cwas-fine">The Joint Cyber Response Grid, its Evidence Bureau, Assessment Office, NPCs and active adversaries are original fiction. Public institutions inspire educational roles; they do not sponsor the game.</p><div class="cwas-codex-grid">' + DATA.codex.filter(function (c) { return unlocked[c.id]; }).map(function (c) { return panel(c.title, '<p>' + esc(c.text) + '</p>'); }).join('') + '</div>' + panel('JOINT CYBER RESPONSE GRID / LIAISONS', DATA.liaisons.map(function (l) { return '<details><summary>' + esc(l.name + ' / ' + l.role) + '</summary><p>“' + esc(l.line) + '”</p><p>' + esc(l.office + ' · ' + l.inspiration) + '</p></details>'; }).join('')) + panel('YOUR FACTION IS AN APPROACH', DATA.factions.map(function (f) { return '<p><strong>' + esc(f.name) + '</strong> — ' + esc(f.role) + '</p>'; }).join('')) + researchSections() + '<p class="cwas-fine">' + esc(DATA.disclaimer) + '</p>', 'codex');
    }
    function researchSections() {
      return panel('SIMULATION / FICTIONAL THREAT MODELS', '<p>Morrow Exchange remains the original access broker in Black Freight. The following independent composite archetypes connect existing CyberWorld artwork to defensive practice; none is attributed to a real nation or organization.</p>' + DATA.simulationAdversaries.map(function (a) { var m=mission(a.mission);return '<details class="cwas-adversary"><summary>' + esc(a.name + ' / ' + a.role) + '</summary><div class="cwas-adversary-body"><img src="' + esc(a.image) + '" width="88" height="88" alt="Original CyberWorld ' + esc(a.name) + ' emblem"><div><span class="cwas-eyebrow">FICTIONAL COMPOSITE / SIMULATION</span><p>' + esc(a.method) + '</p><p><strong>Defensive response:</strong> ' + esc(a.defense) + '</p><p>' + esc(a.faction) + '</p>' + button('Practice / ' + m.title,'mission',m.id,canStart(state,m.id)?'':' disabled') + '</div></div></details>'; }).join('')) + panel('OPTIONAL RESEARCH / REAL-WORLD REFERENCE', '<p>These are attributed summaries of public reporting. Each card lists its source and retrieval date. They are reference snapshots, not live intelligence or identities for the fictional campaign’s villains. Reading them never unlocks or blocks a mission.</p><div class="cwas-threat-strip" aria-label="Optional research topics">' + DATA.researchDossiers.map(function (d) { return '<span>' + esc(d.name) + '</span>'; }).join('') + '</div>' + DATA.researchDossiers.map(function (d) { return '<details class="cwas-research-dossier"><summary>' + esc(d.name + ' / ' + d.id) + '</summary><span class="cwas-eyebrow">REAL-WORLD REFERENCE / OPTIONAL</span><p><strong>' + esc(d.context) + '</strong></p><p>' + esc(d.summary) + '</p><p>' + esc(d.lesson) + '</p><p><a href="' + esc(d.source) + '" target="_blank" rel="noopener noreferrer">Read ' + esc(d.sourceLabel) + ' reference ↗</a></p><small>Source: ' + esc(d.sourceLabel) + ' · Retrieved ' + esc(d.retrieved) + '</small></details>'; }).join(''));
    }
    function showMap() {
      show('The Grid / CONNECTED PLACES', '<p>Each destination below opens an existing playable space or CyberDeck application. Legacy routes remain part of the wider city.</p><div class="cwas-codex-grid">' + [['plaza','Cyber Plaza','Meet Agent Zero, explore terminals, and return to the world.'],['soc','SOC Tower','Black Freight evidence and defensive response.'],['academy','Hacker Academy','Training and the hexadecimal byte lab.'],['lab','Player Lab','Your earned modules and operative dossier.'],['net','Net Cafe','Existing multiplayer presence and comms.']].map(function (p) { return panel(p[1], '<p>' + p[2] + '</p>' + button('Travel', 'travel', p[0])); }).join('') + panel('Neon Arcade', '<p>Packet Sort is playable on your CyberDeck.</p>' + button('Play Packet Sort', 'tab', 'arcade')) + panel('Archive links', '<p><a href="../ctf-trail.html">Packet Trail / legacy operation</a></p><p><a href="../GovINT/">GovINT / separate research environment</a></p><p><a href="../adversaries.html">Public-reference adversary archive</a></p>') + '</div>', 'map');
    }
    function showAcademy() {
      show('Academy / BYTE LAB', '<p class="cwas-lead">A byte can be written as two hexadecimal digits. 41 represents ASCII A. No secret key is involved.</p>' + panel('PRACTICE BEFORE THE MISSION', '<p>Decode the synthetic status bytes <code>4f4b</code>. Use the workbench, then enter the message.</p>' + input('Hex bytes', 'labhex', '', '4f4b') + '<div class="cwas-actions">' + button('Decode bytes', 'lab-decode') + '</div><output id="cwas-lab-result" aria-live="polite"></output>' + input('Decoded status', 'labanswer', 'Two letters', '') + button(state.academy ? 'Practice again' : 'Check understanding', 'lab-check')) + '<p>The campaign does not require a separate Academy account or completion gate.</p>', 'academy');
    }
    function showArcade() {
      arcadeRun = null;
      show('Neon Arcade / PACKET SORT', '<p class="cwas-lead">Sort eight tiny messages into three jobs. No countdown, entry cost or previous knowledge needed.</p>' + panel('PERSONAL BEST', '<strong>' + state.arcade.best + ' / 8 CORRECT</strong><p>Saved on this device. Try a round, learn from a mix-up, then beat your own score.</p>') + panel('THREE JOBS TO REMEMBER', '<ul><li><strong>Address book / DNS:</strong> find the address for a name.</li><li><strong>Private web / HTTPS:</strong> carry encrypted website traffic.</li><li><strong>Clock / NTP:</strong> keep computers on the same time.</li></ul><p>Your coach gives a plain-language clue for each message. You can keep this guide open as you play.</p>') + '<div id="cwas-arcade-play">' + button('Play a free round', 'arcade-start') + '</div>', 'arcade');
    }
    function renderArcade() {
      var el=doc.getElementById('cwas-arcade-play');if(!el)return;
      if(arcadeRun.index===8){state.arcade.best=Math.max(state.arcade.best,arcadeRun.score);save();var best=modal.querySelector('.cwas-panel strong');if(best)best.textContent=state.arcade.best+' / 8 CORRECT';el.innerHTML=panel('RUN COMPLETE', '<h3>'+arcadeRun.score+' / 8 CORRECT</h3><p>DNS resolves names, HTTPS carries encrypted web traffic, and NTP synchronizes clocks. Ports are clues; inspect protocol evidence too.</p>'+button('Play again','arcade-start'));return;}
      var packet=arcadeRun.packets[arcadeRun.index];el.innerHTML=panel('MESSAGE '+(arcadeRun.index+1)+' / 8','<pre>'+esc(packet[0])+'</pre>'+(state.coach?'<p class="cwas-coach-step">Coach: '+esc(packet[2])+'</p>':'')+'<div class="cwas-actions">'+button('Address book / DNS','arcade-answer','DNS')+button('Private web / HTTPS','arcade-answer','HTTPS')+button('Clock / NTP','arcade-answer','NTP')+'</div><p role="status" aria-live="polite">'+esc(arcadeRun.feedback)+'</p>');
    }
    function toggleOverclock() {
      if(overclockActive){deactivateOverclock();return false;}
      if(state.overclock<25){status('OVERCLOCK needs 25 focus. Verify a finding to charge it; every mission remains solvable without it.',false);emit();return false;}
      state.overclock-=25;overclockActive=true;doc.documentElement.classList.add('cwas-overclock');
      if(win.__cwWorld&&win.__cwWorld.setOverclock)win.__cwWorld.setOverclock(true);
      overclockTimer=win.setTimeout(deactivateOverclock,12000);save();status('OVERCLOCK ACTIVE / 12 seconds. Traffic slows; sequence and trust relationships stand out.',true);return true;
    }
    function deactivateOverclock(){if(overclockTimer)win.clearTimeout(overclockTimer);overclockTimer=null;overclockActive=false;doc.documentElement.classList.remove('cwas-overclock');if(win.__cwWorld&&win.__cwWorld.setOverclock)win.__cwWorld.setOverclock(false);emit();}
    async function hashArtifacts(m) {
      var output=doc.getElementById('cwas-tool-result');if(!output)return;
      if(!win.crypto||!win.crypto.subtle){output.textContent='SHA-256 requires a secure browser context (HTTPS or localhost). Return through the site URL to use this workbench.';return;}
      try{var encoder=new win.TextEncoder();var digests=await Promise.all([m.sourceArtifact,m.customerArtifact].map(async function(text){var buffer=await win.crypto.subtle.digest('SHA-256',encoder.encode(text));return Array.from(new Uint8Array(buffer)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}));if(!output.isConnected)return;output.textContent='Reviewed source SHA-256: '+digests[0]+'\nCustomer bytes SHA-256: '+digests[1]+'\nThe digests '+(digests[0]===digests[1]?'match.':'differ.');record(m.id).hashesCompared=true;var field=modal.querySelector('[name="compared"]');if(field)field.value='true';save();}catch(e){output.textContent='The browser could not calculate this digest. Your case remains saved.';}
    }
    function handleAction(action,value) {
      var m=mission(state.active),r=record(m.id),form=modal&&modal.querySelector('[data-puzzle]'),output;
      if(action==='close'){closeModal();return;}
      if(action==='tab'){openDeck(value);return;}
      if(action==='mission'){rememberForm();startMission(value);return;}
      if(action==='coach-mode'){
        var wasBrief=modal&&modal.querySelector('[data-case-brief]');
        rememberForm();setCoach(value!=='expert');
        if(form)showPuzzle(m);else if(wasBrief)startMission(m.id);else openDeck('missions');
        return;
      }
      if(action==='coach-use'){useCoachStep(m,value,form);return;}
      if(action==='coach-review'){
        if(!form)return;
        var control=form.querySelector('select:not([disabled]),input:not([type="hidden"]):not([disabled]),textarea:not([disabled])');
        if(control){(control.closest('label')||control).scrollIntoView({block:'center',behavior:'auto'});control.focus({preventScroll:true});}
        status('Review your choices below. Press Verify finding when you are ready; nothing has been submitted for you.',true);
        return;
      }
      if(action==='coach-next'){
        var guide=coachGuide(m.id),next=Number(value);
        if(!state.coach||!form||!guide||!Number.isInteger(next)||next<0||next>=guide.steps.length)return;
        if(coachToolBusy){status('Let the tool finish calculating before opening the next clue.',true);return;}
        rememberForm();coachSteps[m.id]=next;showPuzzle(m);return;
      }
      if(action==='case-download'||action==='case-inspect'||action==='reward-download'){
        var downloads=win.CW_ASCENSION_DOWNLOADS, chosen=mission(value);
        if(!downloads||!DATA.missions.some(function(item){return item.id===value;})||!canStart(state,value)){status('Open an available case before accessing its files.',false);return;}
        if(action==='reward-download'){
          if(!state.completed[value]){status('File the case before downloading its earned badge and module.',false);return;}
          var operative=win.__cwGameplay&&win.__cwGameplay.state?win.__cwGameplay.state():{};
          downloads.download(win,'cyberworld-'+chosen.id+'-earned-rewards.zip',downloads.zip(downloads.reward(chosen,true,operative.callsign)),'application/zip');status('Earned badge, certificate, and module receipt downloaded. No account details or private notes are included.',true);return;
        }
        if(action==='case-download'){downloads.download(win,'cyberworld-'+chosen.id+'-mission.zip',downloads.zip(downloads.artifacts(chosen)),'application/zip');status('Mission evidence pack downloaded for offline analysis. Synthetic evidence; no answer key.',true);return;}
        rememberForm();show(chosen.title+' / EVIDENCE INSPECTOR','<p class="cwas-lead">Inspect the same bytes used in the downloadable mission pack. Search filters matching text lines; hex mode preserves every byte and its offset.</p><div id="cwas-evidence-inspector"></div><div class="cwas-actions">'+button('Return to case','mission',chosen.id)+'</div>','missions');downloads.mount(win,doc.getElementById('cwas-evidence-inspector'),chosen);return;
      }
      if(action==='enter-soc'){closeModal();if(win.__cwWorld&&win.__cwWorld.toDistrict)win.__cwWorld.toDistrict('soc');return;}
      if(action==='investigate'){r.stage='puzzle';if(m.id==='route-zero'&&state.overclock===0)state.overclock=30;save();showPuzzle(m);return;}
      if(action==='hint'){rememberForm();r.hints=Math.min(3,r.hints+1);save();doc.getElementById('cwas-hint').textContent=m.hints[r.hints-1];return;}
      if(action==='overclock'){toggleOverclock();return;}
      if(action==='decode-packets'){
        var order=clean(form.elements.order.value).split(',').map(function(n){return Number(n.trim());});output=doc.getElementById('cwas-tool-result');
        if(order.length!==3||new Set(order).size!==3||!order.every(function(n){return [1,2,3].indexOf(n)>=0;})){output.textContent='Enter each fragment sequence number once, separated by commas.';return;}
        var hex=order.map(function(n){return m.packets.find(function(p){return p.seq===n;}).payload;}).join('');output.textContent=hex+' → '+fromHex(hex);return;
      }
      if(action==='xor'){doc.getElementById('cwas-tool-result').textContent='P2 = '+recoverXor(m.cipher1,m.cipher2,m.plain1);return;}
      if(action==='bounds-test'){var results=runBounds(form.elements.policy.value);r.testsPassed=results.every(function(test){return test.passed;});form.elements.tested.value=r.testsPassed?'true':'false';doc.getElementById('cwas-tool-result').textContent=results.map(function(test){return 'index '+test.index+': '+(test.actual?'ACCEPT':'REJECT')+' / '+(test.passed?'PASS':'FAIL');}).join('\n');save();return;}
      if(action==='hash')return hashArtifacts(m);
      if(action==='target'){selectedNode=value;modal.querySelectorAll('[data-action="target"]').forEach(function(el){el.setAttribute('aria-pressed',String(el.dataset.value===value));});status(value==='dispatcher'?'Affected producer selected.':'Essential subnet selected. Consider the impact before applying a change.',value==='dispatcher');return;}
      if(action==='respond'){
        var wasVerified=r.containment.verified,response=respond(r.containment,value,selectedNode);r.containment=response.state;
        if(!response.ok)r.mistakes++;
        if(value==='reset'){r.stage='containment';var report=modal.querySelector('[data-action="debrief"]');if(report)report.remove();}
        save();Object.keys(r.containment).forEach(function(key){var node=doc.getElementById('cwas-check-'+key);if(node)node.classList.toggle('is-done',r.containment[key]);});
        var recoveryCoach=doc.getElementById('cwas-recovery-coach');if(recoveryCoach)recoveryCoach.innerHTML=containmentCoach(r);
        status(response.message,response.ok);
        if(r.containment.verified){r.stage='debrief';if(!wasVerified)journal('Recovery verified for '+m.title+': evidence preserved, affected producer isolated, token rotated, clean route restored.');save();if(!modal.querySelector('[data-action="debrief"]'))modal.querySelector('.cwas-actions').insertAdjacentHTML('beforeend',button('Open after-action report','debrief',m.id));}
        return;
      }
      if(action==='debrief'){if(record(value).stage==='debrief'||state.completed[value])showDebrief(mission(value));return;}
      if(action==='complete'){complete(mission(value));return;}
      if(action==='return-plaza'){closeModal();if(win.__cwWorld&&win.__cwWorld.toPlaza)win.__cwWorld.toPlaza();return;}
      if(action==='travel'){closeModal();if(win.__cwWorld){if(value==='plaza')win.__cwWorld.toPlaza();else win.__cwWorld.toDistrict(value);}return;}
      if(action==='save-notes'){state.notes=doc.getElementById('cwas-notes').value.slice(0,12000);save();status(saveOk?'Case notes saved on this device.':'Storage is unavailable; notes remain in this open session.',saveOk);return;}
      if(action==='lab-decode'){try{doc.getElementById('cwas-lab-result').textContent=fromHex(modal.querySelector('[name="labhex"]').value);}catch(e){doc.getElementById('cwas-lab-result').textContent=e.message;}return;}
      if(action==='lab-check'){if(upper(modal.querySelector('[name="labanswer"]').value)==='OK'){state.academy=true;save();status('Correct. 4f = O and 4b = K. Hex is a representation, not a secret.',true);}else status('Compare the decoded output with the byte values. Try the workbench.',false);return;}
      if(action==='arcade-start'){arcadeRun={index:0,score:0,feedback:'',packets:[['A manifest.grid.example / UDP query','DNS','Someone is asking for the address of a named service.'],['TLS application data / encrypted web session','HTTPS','The message describes an encrypted website connection.'],['Clock offset +3 ms / time synchronization','NTP','This computer is checking that its clock agrees with another clock.'],['AAAA relay.grid.example / name resolution','DNS','A name is being turned into a computer address.'],['TLS certificate / HTTP service session','HTTPS','A website is presenting its encrypted-connection certificate.'],['Stratum 2 time response','NTP','This is an answer from a time service.'],['NXDOMAIN / no such domain','DNS','The address book says it cannot find that name.'],['HTTP response inside a TLS session','HTTPS','A website response is travelling inside an encrypted connection.']]};renderArcade();return;}
      if(action==='arcade-answer'&&arcadeRun){var correct=arcadeRun.packets[arcadeRun.index][1];if(value===correct)arcadeRun.score++;arcadeRun.feedback=value===correct?'Nice, that message reached the right job.':"That one needed "+({DNS:'the address book / DNS',HTTPS:'the private web / HTTPS',NTP:'the clock / NTP'}[correct])+'. You learned a new clue; the next message is ready.';arcadeRun.index++;renderArcade();}
    }
    function intercept(e){
      if(e.__cwAscensionHandled)return;var d=e.detail||{},target=d.target||{},id=target.id||(target.npc&&target.npc.id)||(target.node&&target.node.id)||'',action=d.action||'';
      var handled=false;
      if(id==='zero'||action==='npc:zero'){handled=true;talkZero();}
      else if(action==='mission:soc-triage'||action==='console'||action==='mission:route-zero'||action==='ascension:mission'){handled=true;startMission();}
      else if(action==='academy'){handled=true;openDeck('academy');}
      else if(action==='ascension:arcade'){handled=true;openDeck('arcade');}
      if(handled){e.__cwAscensionHandled=true;e.preventDefault();}
    }
    function init(){if(initialized)return;initialized=true;ensureModal();win.addEventListener('cw:action',intercept);doc.addEventListener('cw:action',intercept);win.addEventListener('pagehide',function(){rememberForm();deactivateOverclock();});win.addEventListener('cw:view',function(e){var d=e.detail||{};if(d.district==='soc'&&!state.active&&!state.completed['route-zero']){journal('SOC Tower reached. Nova has the dispatcher capture ready.');save();}});var restoring=false;try{restoring=!!win.localStorage.getItem('cw.ascension.restore.pending.v1');}catch(e){}if(!restoring)syncRewards();emit();}
    function exportState(){return normalizeSave(copy(state));}
    function importState(incoming){if(!validImport(incoming))throw new Error('Unsupported or invalid campaign save. Use a CyberWorld Ascension version 1 export.');deactivateOverclock();state=normalizeSave(incoming);save();syncRewards();return publicState();}
    function reloadState(){var raw=null;try{raw=JSON.parse(win.localStorage.getItem(KEY)||'null');}catch(e){}deactivateOverclock();state=normalizeSave(raw);syncRewards();emit();return publicState();}
    function addFocus(amount){var n=Number(amount);if(!Number.isFinite(n))return state.overclock;state.overclock=Math.max(0,Math.min(100,state.overclock+n));save();return state.overclock;}
    function objective(){
      var count=summary(state).count;
      if(count===DATA.missions.length)return {title:'Black Freight / RESOLVED',description:'The technical chain is verified. The sponsor remains uncertain.',step:'Return to the Grid',hint:'Review your casebook, practice in the Arcade, or continue exploring.',index:'07 / 07'};
      var m=state.active&&!state.completed[state.active]?mission(state.active):nextMission(),r=state.records[m.id],stage=r?r.stage:'brief';
      if(!state.seenZero&&!state.active)return {title:'The wrong arrival',description:'Some city deliveries are going to the wrong place. You can learn as you play.',step:'Meet Agent Zero',hint:'Find Zero in Cyber Plaza, or read the incoming transmission. Your coach will explain the first case.',index:'01 / 07'};
      var guide=coachGuide(m.id),steps={brief:['Open a city case','Explore first, or open the case when you feel ready.'],puzzle:['Follow one clue at a time',state.coach&&guide?guide.goal:m.objective],containment:['Help the deliveries recover','Follow the five numbered recovery steps. The coach explains the next button.'],debrief:['Collect your reward','Read what you learned, then file the case to collect your earned module.'],complete:['Return to Cyber Plaza','Your progress is saved. The next operation is ready.']};
      return {title:m.title,description:state.coach&&guide?guide.goal:m.brief,step:steps[stage][0],hint:steps[stage][1],index:String(DATA.missions.indexOf(m)+1).padStart(2,'0')+' / 07'};
    }
    win.__cwAscension={openDeck:openDeck,startMission:startMission,talkZero:talkZero,state:publicState,objective:objective,init:init,toggleOverclock:toggleOverclock,addFocus:addFocus,setCoach:setCoach,close:closeModal,exportState:exportState,importState:importState,validateState:validImport,reloadState:reloadState,syncRewards:syncRewards};
    if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
  }
  return { attach:attach, validate:validate, findingFeedback:findingFeedback, coachGuide:coachGuide, respond:respond, freshSave:freshSave, normalizeSave:normalizeSave, validImport:validImport, canStart:canStart, summary:summary, fromHex:fromHex, recoverXor:recoverXor, runBounds:runBounds };
}));
