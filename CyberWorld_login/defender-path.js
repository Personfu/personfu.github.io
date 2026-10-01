/* CyberWorld Defender Path: fictional, browser-only decision cases. */
(function (root) {
  'use strict';

  const CASES = [
    {
      id: 'd01', stage: '01 // First contact', range: '0–19', title: 'The urgent message', type: 'multi',
      objective: 'Decide which observations justify stopping an unexpected account-change request.',
      evidence: [
        'From: "Neon City Helpdesk" <relay@support-neon.invalid>',
        'Reply-To: recovery@neon-city-reset.invalid',
        'Body: "Approve your replacement authenticator in the next 8 minutes. Do not call the helpdesk."',
        'The normal helpdesk number is printed in the employee directory, not in this message.'
      ],
      prompt: 'Select the two strongest reasons to verify through an independent channel.',
      choices: [
        ['reply', 'The reply address is a different, unverified domain.'],
        ['pressure', 'The message demands an unrequested MFA change and discourages independent contact.'],
        ['greeting', 'It uses a friendly display name.'],
        ['clock', 'It contains a time limit, which alone proves compromise.']
      ], expected: ['reply', 'pressure'], hint: 'Separate a concrete identity mismatch from persuasion cues that could appear in legitimate mail.',
      why: 'A display name is not proof of origin. The mismatched reply domain plus an unrequested authenticator change warrant verification. Urgency alone is not conclusive.',
      counter: 'Use the helpdesk number from a trusted directory; report the message without opening its links.'
    },
    {
      id: 'd02', stage: '01 // First contact', range: '0–19', title: 'Where does the URL end?', type: 'single',
      objective: 'Read the hostname before trusting a sign-in page.',
      evidence: ['The fictional employer owns the exact parent domain neon.city.invalid.', 'Subdomains under that parent are company-controlled in this simulation.'],
      prompt: 'Which URL has a hostname under neon.city.invalid?',
      choices: [
        ['real', 'https://login.neon.city.invalid/session'],
        ['prefix', 'https://neon.city.invalid.login-check.invalid/session'],
        ['at', 'https://neon.city.invalid@sign-in.invalid/session'],
        ['lookalike', 'https://neon-city.invalid/session']
      ], expected: 'real', hint: 'In a URL, inspect the hostname between https:// and the next slash; text before @ can be user information.',
      why: 'Only login.neon.city.invalid ends with the exact owned parent domain. Prefixes, lookalikes, and user-info text do not make another host first-party.',
      counter: 'Navigate from a trusted bookmark or manually typed known domain; let a password manager help reveal origin mismatches.'
    },
    {
      id: 'd03', stage: '02 // Operations', range: '20–39', title: 'Three clocks, one incident', type: 'order',
      objective: 'Normalize evidence to UTC before constructing a timeline.',
      evidence: [
        'Identity provider: 09:04 UTC — unfamiliar session created.',
        'Endpoint: 02:07 PDT (UTC−7) — new browser process starts.',
        'Change system: 11:11 CEST (UTC+2) — privileged role granted.',
        'Proxy: 09:15 UTC — unusual download begins.'
      ],
      prompt: 'Choose the events in chronological order (earliest first).',
      items: [
        ['idp', 'Identity session · 09:04 UTC'],
        ['endpoint', 'Browser process · 02:07 PDT'],
        ['role', 'Role grant · 11:11 CEST'],
        ['proxy', 'Download · 09:15 UTC']
      ], expected: ['idp', 'endpoint', 'role', 'proxy'], hint: '02:07 PDT is 09:07 UTC; 11:11 CEST is 09:11 UTC.',
      why: 'The normalized sequence is 09:04, 09:07, 09:11, and 09:15 UTC. A timeline built from local clock strings would mislead the analyst.',
      counter: 'Record raw timestamps and offsets; correlate normalized copies while preserving original evidence.'
    },
    {
      id: 'd04', stage: '02 // Operations', range: '20–39', title: 'Contain without erasing', type: 'multi',
      objective: 'Protect the account while preserving enough evidence to understand the event.',
      evidence: ['A fictional employee confirms they did not approve the new session or role grant.', 'The session is active. Audit logs are still being written.'],
      prompt: 'Select the three actions that belong in a measured first response.',
      choices: [
        ['revoke', 'Revoke active sessions and reset credentials through the verified identity process.'],
        ['preserve', 'Preserve timestamped identity and endpoint logs with provenance.'],
        ['scope', 'Check other accounts for the same indicators before declaring the incident contained.'],
        ['delete', 'Delete the audit logs to remove the attacker’s traces.'],
        ['broadcast', 'Publish the employee’s account details to the entire company.']
      ], expected: ['revoke', 'preserve', 'scope'], hint: 'Contain access, preserve evidence, and determine scope; do not destroy the record or expose a person.',
      why: 'Revocation limits further use, preservation supports investigation, and scoping tests whether the incident extends beyond one account.',
      counter: 'Document each action and time; use an incident process with privacy controls and a route to restore legitimate access.'
    },
    {
      id: 'd05', stage: '03 // Investigation', range: '40–59', title: 'Find the right sensor', type: 'match',
      objective: 'Ask the telemetry source that can actually support each claim.',
      evidence: ['The case asks whether a sign-in succeeded, a binary ran, and a domain was resolved.', 'No single dashboard is authoritative for every part of the story.'],
      prompt: 'Match each investigative question to its best first evidence source.',
      items: [
        ['sign-in', 'Did an interactive sign-in succeed?'],
        ['binary', 'Did a named executable run on the workstation?'],
        ['domain', 'Did the host resolve an unusual domain?']
      ],
      choices: [['idp', 'Identity-provider audit'], ['edr', 'Endpoint process telemetry'], ['dns', 'DNS resolver log']],
      expected: { 'sign-in': 'idp', binary: 'edr', domain: 'dns' },
      hint: 'Identity, process execution, and name resolution come from different systems.',
      why: 'An IdP can establish the sign-in, endpoint telemetry can establish process execution, and a resolver log can establish a DNS lookup. None alone proves every step.',
      counter: 'Corroborate across independent sources and record retention gaps, clock skew, and collection limitations.'
    },
    {
      id: 'd06', stage: '03 // Investigation', range: '40–59', title: 'Evidence chain', type: 'order',
      objective: 'Separate evidence preservation from analysis and keep an auditable chain.',
      evidence: ['A fictional workstation may contain a relevant log bundle.', 'Analysts must work from a copy; the original should remain unmodified.'],
      prompt: 'Put the evidence-handling actions in the safest order.',
      items: [
        ['record', 'Record collector, device, time, and scope.'],
        ['copy', 'Acquire a read-only copy using the approved process.'],
        ['hash', 'Hash and inventory the collected copy.'],
        ['analyze', 'Analyze a working duplicate and note transformations.']
      ], expected: ['record', 'copy', 'hash', 'analyze'],
      hint: 'First establish provenance, then acquire, verify, and work on a duplicate.',
      why: 'Provenance and integrity checks make later findings defensible. Analysis on the original can contaminate what the record is meant to preserve.',
      counter: 'Use documented collection procedures, access controls, and repeatable analysis notes; do not claim more certainty than the artifacts allow.'
    },
    {
      id: 'd07', stage: '04 // Engineering', range: '60–79', title: 'The base-rate trap', type: 'numeric',
      objective: 'Estimate alert precision before promising that a detector is production-ready.',
      evidence: [
        'In a fictional 100,000-event test, exactly 100 events are truly malicious.',
        'The detector catches 90% of malicious events and falsely flags 1% of benign events.'
      ],
      prompt: 'About what percentage of all flagged events are truly malicious? Enter one decimal place.',
      expected: 8.3, tolerance: 0.15, unit: '%', hint: 'True positives = 90. False positives = 1% of 99,900. Precision = TP / (TP + FP).',
      why: 'There are 90 true positives and 999 false positives. Precision is 90 / 1,089 ≈ 8.3%, despite 90% detection sensitivity.',
      counter: 'Pilot detections against representative base rates, quantify review burden, and tune with analysts before auto-blocking.'
    },
    {
      id: 'd08', stage: '04 // Engineering', range: '60–79', title: 'A narrower rule', type: 'multi',
      objective: 'Build a review-worthy detection from independent signals, not a single noisy attribute.',
      evidence: ['Normal on-call admins sometimes travel. Approved privilege changes have change tickets.', 'The incident pattern was a new device shortly after an unscheduled privileged role grant.'],
      prompt: 'Select the three conditions for a high-priority review rule.',
      choices: [
        ['grant', 'A privileged role grant occurs.'],
        ['device', 'The granted account signs in from a newly observed device within 10 minutes.'],
        ['ticket', 'No approved change ticket links to the grant.'],
        ['country', 'The sign-in comes from a different country, even if everything else is normal.'],
        ['anylogin', 'Any employee signs in.']
      ], expected: ['grant', 'device', 'ticket'], hint: 'Look for a sequence with an authorization context; travel alone is too noisy.',
      why: 'Correlating a role grant, a new device, and missing approval is more specific than geolocation or any login by itself. It remains a review signal, not proof.',
      counter: 'Document exceptions, monitor false positives, and require human validation before disruptive response.'
    },
    {
      id: 'd09', stage: '05 // Research studio', range: '80–100', title: 'Does the control help?', type: 'single',
      objective: 'Choose an evaluation that can distinguish an intervention from background changes.',
      evidence: ['A new sign-in warning will be introduced. Attack patterns and seasonal traffic also change over time.', 'The team wants to know whether the warning reduces completed risky approvals.'],
      prompt: 'Which study design gives the strongest feasible evidence of effect?',
      choices: [
        ['rollout', 'Pre-register the outcome, randomize a staged rollout where ethical, and compare groups over the same period.'],
        ['before', 'Compare last month with this month without accounting for other changes.'],
        ['stories', 'Collect only positive user stories after release.'],
        ['blocks', 'Count warnings displayed and call every warning a prevented compromise.']
      ], expected: 'rollout', hint: 'Think about counterfactuals: what would have happened without the warning during the same period?',
      why: 'A concurrent comparison and pre-registered outcome reduce temporal confounding and cherry-picking. Even then, measure harms and limitations.',
      counter: 'Use privacy-preserving data, ethical review where warranted, and a rollback criterion for user harm.'
    },
    {
      id: 'd10', stage: '05 // Research studio', range: '80–100', title: 'A reproducible claim', type: 'multi',
      objective: 'Publish a finding that another defender can inspect and challenge.',
      evidence: ['A detection appears promising on a small fictional sample.', 'No live targets or confidential records may be published.'],
      prompt: 'Select the three elements a defensible report should include.',
      choices: [
        ['method', 'A versioned dataset description, transforms, inclusion rules, and method.'],
        ['uncertainty', 'Error rates, confidence bounds, limitations, and plausible alternative explanations.'],
        ['safe', 'A synthetic reproduction plus safe defensive mitigation and responsible disclosure route.'],
        ['victims', 'Raw private victim records to prove authenticity.'],
        ['certainty', 'Only successful examples and an unconditional claim of zero false positives.']
      ], expected: ['method', 'uncertainty', 'safe'], hint: 'Reproducibility, uncertainty, privacy, and a defensive outcome all matter.',
      why: 'A research-grade security claim needs transparent methods, limits, and a safe reproduction. Exposing private records or hiding failures weakens both ethics and validity.',
      counter: 'Keep sensitive evidence access-controlled and disclose through an agreed vendor or coordinated channel.'
    }
  ];

  function grade(challenge, answer) {
    if (answer == null) return false;
    if (challenge.type === 'single') return answer === challenge.expected;
    if (challenge.type === 'numeric') return Number.isFinite(answer) && Math.abs(answer - challenge.expected) <= challenge.tolerance;
    if (challenge.type === 'multi') {
      return Array.isArray(answer) && answer.length === challenge.expected.length &&
        [...answer].sort().join('|') === [...challenge.expected].sort().join('|');
    }
    if (challenge.type === 'order') return Array.isArray(answer) && answer.join('|') === challenge.expected.join('|');
    if (challenge.type === 'match') {
      return challenge.items.every(function (item) { return answer[item[0]] === challenge.expected[item[0]]; });
    }
    return false;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { CASES, grade };
  if (!root.document) return;

  const document = root.document;
  const STORE = 'cyberworld.defender-path.v1';
  const list = document.getElementById('mission-list');
  const panel = document.getElementById('case-panel');
  let solved = new Set();
  try {
    const saved = JSON.parse(root.localStorage.getItem(STORE) || '[]');
    if (Array.isArray(saved)) solved = new Set(saved.filter(function (id) { return CASES.some(function (c) { return c.id === id; }); }));
  } catch (_) { /* Private browsing may disable storage; play remains available. */ }
  let active = CASES.some(function (c) { return '#' + c.id === root.location.hash; }) ? root.location.hash.slice(1) : CASES[0].id;

  function elem(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function persist() { try { root.localStorage.setItem(STORE, JSON.stringify([...solved])); } catch (_) { /* In-memory progress only. */ } }
  function progress() {
    const n = solved.size;
    document.getElementById('progress-label').textContent = n + ' / ' + CASES.length + ' CASES';
    document.getElementById('progress-percent').textContent = (n * 10) + '% complete';
    document.getElementById('progress-fill').style.width = (n * 10) + '%';
    document.getElementById('progress-meter').setAttribute('aria-valuenow', String(n * 10));
  }
  function renderList() {
    list.replaceChildren();
    let stage = '';
    CASES.forEach(function (c) {
      if (c.stage !== stage) { stage = c.stage; list.append(elem('h3', 'stage', stage + ' · ' + c.range)); }
      const button = elem('button', 'mission');
      button.type = 'button';
      button.setAttribute('aria-current', String(c.id === active));
      button.append(elem('span', '', c.title), elem('span', 'done', solved.has(c.id) ? '✓' : '○'));
      button.addEventListener('click', function () { select(c.id, 'nav'); });
      list.append(button);
    });
  }
  function select(id, focusTarget) {
    if (!CASES.some(function (c) { return c.id === id; })) return;
    active = id;
    if (root.location.hash !== '#' + id) root.history.replaceState(null, '', '#' + id);
    renderList(); renderCase();
    const target = focusTarget === 'case' ? panel.querySelector('h2') : list.querySelector('.mission[aria-current="true"]');
    if (target) {
      if (focusTarget === 'case') target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
  function showFeedback(ok, c, message) {
    const prior = panel.querySelector('.feedback');
    if (prior) prior.remove();
    const box = elem('div', 'feedback ' + (ok ? 'ok' : 'bad'));
    box.setAttribute('role', 'status');
    box.append(elem('h3', '', ok ? 'CASE CLOSED // evidence seal recorded' : 'NOT YET // re-check the artifact'));
    box.append(elem('p', '', message));
    if (ok) box.append(elem('p', '', 'Defensive takeaway: ' + c.counter));
    panel.append(box);
  }
  function renderCase() {
    const c = CASES.find(function (item) { return item.id === active; });
    panel.replaceChildren();
    const head = elem('div', 'case-head');
    const titleBox = elem('div');
    titleBox.append(elem('div', 'tag', c.stage + ' · path ' + c.range + ' · ' + c.id.toUpperCase()), elem('h2', '', c.title));
    head.append(titleBox, elem('div', 'tag', solved.has(c.id) ? '✓ COMPLETED' : '◉ OPEN CASE'));
    panel.append(head, elem('p', 'objective', c.objective));
    const artifact = elem('section', 'artifact');
    artifact.append(elem('h3', '', 'Evidence packet // synthetic'));
    const evidenceList = elem('ul');
    c.evidence.forEach(function (line) { evidenceList.append(elem('li', '', line)); });
    artifact.append(evidenceList); panel.append(artifact);

    const form = elem('form', 'question');
    form.noValidate = true;
    form.append(elem('h3', '', 'Decision console'), elem('p', 'prompt', c.prompt));
    if (c.type === 'single' || c.type === 'multi') {
      const choices = elem('div', 'choices');
      c.choices.forEach(function (choice) {
        const label = elem('label', 'choice');
        const input = elem('input');
        input.type = c.type === 'single' ? 'radio' : 'checkbox';
        input.name = 'decision'; input.value = choice[0];
        label.append(input, elem('span', '', choice[1])); choices.append(label);
      });
      form.append(choices);
    } else if (c.type === 'order' || c.type === 'match') {
      const labels = c.type === 'order' ? c.items : c.choices;
      const rows = c.type === 'order' ? c.items.map(function (_, index) { return [String(index + 1), 'Position ' + (index + 1)]; }) : c.items;
      rows.forEach(function (row) {
        const field = elem('div', 'fieldrow');
        const label = elem('label', '', row[1]);
        const select = elem('select'); select.name = row[0]; select.id = c.id + '-' + row[0];
        label.htmlFor = select.id;
        const empty = elem('option', '', 'Choose…'); empty.value = ''; select.append(empty);
        labels.forEach(function (option) { const item = elem('option', '', option[1]); item.value = option[0]; select.append(item); });
        field.append(label, select); form.append(field);
      });
    } else if (c.type === 'numeric') {
      const field = elem('div', 'fieldrow');
      const label = elem('label', '', 'Estimated precision (' + c.unit + ')'); label.htmlFor = c.id + '-number';
      const input = elem('input'); input.type = 'number'; input.name = 'estimate'; input.id = label.htmlFor; input.min = '0'; input.max = '100'; input.step = '0.1'; input.inputMode = 'decimal';
      field.append(label, input); form.append(field);
    }
    const actions = elem('div', 'actions');
    const submit = elem('button', 'primary', 'CHECK DECISION'); submit.type = 'submit'; actions.append(submit);
    const hint = elem('button', '', 'SHOW HINT'); hint.type = 'button';
    hint.addEventListener('click', function () {
      const existing = panel.querySelector('.hint');
      if (existing) existing.remove(); else panel.append(elem('p', 'hint', 'Hint: ' + c.hint));
    });
    actions.append(hint);
    const index = CASES.findIndex(function (item) { return item.id === c.id; });
    if (index < CASES.length - 1) {
      const next = elem('button', '', 'NEXT CASE →'); next.type = 'button';
      next.addEventListener('click', function () { select(CASES[index + 1].id, 'case'); }); actions.append(next);
    }
    form.append(actions);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      let answer;
      if (c.type === 'single') answer = form.querySelector('input[name="decision"]:checked')?.value || null;
      else if (c.type === 'multi') answer = [...form.querySelectorAll('input[name="decision"]:checked')].map(function (input) { return input.value; });
      else if (c.type === 'order') answer = c.items.map(function (_, index) { return form.elements[String(index + 1)].value; });
      else if (c.type === 'match') answer = Object.fromEntries(c.items.map(function (item) { return [item[0], form.elements[item[0]].value]; }));
      else if (c.type === 'numeric') answer = form.elements.estimate.value.trim() ? Number(form.elements.estimate.value) : null;
      const incomplete = answer == null || (Array.isArray(answer) && (!answer.length || answer.some(function (value) { return !value; }))) ||
        (c.type === 'match' && Object.values(answer).some(function (value) { return !value; }));
      if (incomplete) { showFeedback(false, c, 'Make a selection for every required field.'); return; }
      if (c.type === 'order' && new Set(answer).size !== answer.length) { showFeedback(false, c, 'Use each event exactly once.'); return; }
      if (grade(c, answer)) {
        solved.add(c.id); persist(); progress(); renderList();
        showFeedback(true, c, c.why);
      } else showFeedback(false, c, 'The evidence does not support that decision. ' + c.hint);
    });
    panel.append(form);
    if (solved.has(c.id)) showFeedback(true, c, c.why);
  }

  root.addEventListener('hashchange', function () {
    const id = root.location.hash.slice(1);
    if (CASES.some(function (c) { return c.id === id; })) { active = id; renderList(); renderCase(); }
  });
  progress(); renderList(); renderCase();
})(typeof window !== 'undefined' ? window : globalThis);
