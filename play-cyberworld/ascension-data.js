/* Original CyberWorld scenario data. Every address and artifact is synthetic. */
(function (root, factory) {
  'use strict';
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.CW_ASCENSION_DATA = data;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  return {
    version: 1,
    title: 'CODEBREAKER ASCENSION',
    subtitle: 'OPERATION BLACK FREIGHT',
    tagline: 'The signature was valid. The route was wrong.',
    disclaimer: 'CyberWorld is an independent educational game. Real agencies may be referenced for education; no agency sponsors or endorses this game. CyberWorld Codebreaker is an original campaign, separate from the official NSA Codebreaker Challenge.',
    premise: 'Deliveries are going to the wrong places. Help the city work out why, one small clue at a time. Your coach explains the tools as you use them. There is no timer, and mistakes cost nothing.',
    factions: [
      { id: 'GHOSTNET', name: 'GHOSTNET', role: 'Source evaluation, reconnaissance, and evidence relationships.' },
      { id: 'IRONWALL', name: 'IRONWALL', role: 'Containment, resilient infrastructure, and service continuity.' },
      { id: 'NULLSEC', name: 'NULLSEC', role: 'Cryptography, reverse engineering, and reproducible research.' },
      { id: 'DAEMON', name: 'DAEMON', role: 'Automation, programming, and experimental systems.' }
    ],
    simulationAdversaries: [
      { id: 'gray-fang', name: 'Gray Fang', image: 'assets/cyberworld/watcher-daemon.svg', role: 'Disruption collective', method: 'This fictional composite pressures dispatch infrastructure by corrupting route state and interfering with recovery.', defense: 'Segment critical services, preserve route logs, protect recovery copies, and verify continuity after isolation.', mission: 'route-zero', faction: 'IRONWALL / defensive response' },
      { id: 'cinder-veil', name: 'Cinder Veil', image: 'assets/cyberworld/sentinel-ice.svg', role: 'Supply-chain infiltrator', method: 'This fictional composite hides a changed authorization policy inside a correctly signed package.', defense: 'Compare behavior and independently recorded artifact digests. Review build provenance and enforce origin authorization.', mission: 'assembly-line', faction: 'NULLSEC + DAEMON / research and verification' },
      { id: 'black-specter', name: 'Black Specter', image: 'assets/cyberworld/firewall-tower.svg', role: 'Access and identity broker', method: 'This fictional composite reuses scoped credentials and plants misleading attribution clues around rented infrastructure.', defense: 'Revoke affected tokens, correlate independent evidence, and distinguish technical findings from sponsor hypotheses.', mission: 'hold-the-grid', faction: 'GHOSTNET / evidence and assessment' }
    ],
    researchDossiers: [
      { id: 'G0034', name: 'Sandworm Team', context: 'GRU attribution in public reporting', source: 'https://attack.mitre.org/groups/G0034/', sourceLabel: 'MITRE ATT&CK', retrieved: '2026-10-18', summary: 'MITRE ATT&CK describes Sandworm Team as a destructive threat group publicly attributed to Russia\'s GRU Unit 74455. Its record documents infrastructure disruption and destructive activity. This is a sourced description of a group, not a claim about Russian people or any actor in Black Freight.', lesson: 'CyberWorld defender practice: protect recovery paths and critical services; evaluate disruption indicators alongside independent evidence.' },
      { id: 'G0032', name: 'Lazarus Group', context: 'DPRK / RGB attribution in public reporting', source: 'https://attack.mitre.org/groups/G0032/', sourceLabel: 'MITRE ATT&CK', retrieved: '2026-10-18', summary: 'MITRE ATT&CK identifies Lazarus Group as a North Korean state-sponsored threat group attributed to the Reconnaissance General Bureau. MITRE notes that the name is often an umbrella for several operators and that overlapping personnel, tooling, and infrastructure complicate precise attribution.', lesson: 'CyberWorld defender practice: inspect artifact behavior and identity changes, preserve provenance, and avoid treating a shared tool as proof of one operator.' },
      { id: 'G0096', name: 'APT41', context: 'China-nexus assessment in public reporting', source: 'https://attack.mitre.org/groups/G0096/', sourceLabel: 'MITRE ATT&CK', retrieved: '2026-10-18', summary: 'MITRE ATT&CK reports researchers\' assessment of APT41 as a Chinese state-sponsored espionage group that also conducts financially motivated operations. Its entry describes targeting across multiple industries and partial overlap with other public group names. These are attributed research assessments, not universal statements about a country.', lesson: 'CyberWorld defender practice: verify software provenance, review unusual service and account behavior, and keep motivation hypotheses separate from observed facts.' },
      { id: 'G0020', name: 'Equation', context: 'Public reporting / advanced intrusion tools', source: 'https://attack.mitre.org/groups/G0020/', sourceLabel: 'MITRE ATT&CK', retrieved: '2026-10-27', summary: 'MITRE ATT&CK describes Equation as using several remote-access tools, zero-day exploits and capabilities to rewrite some hard-drive firmware. This entry records published capabilities; it does not assign an agency identity to the group.', lesson: 'Defender practice: maintain asset inventories, check firmware integrity and recovery paths, and review unusual remote access.' },
      { id: 'FBI-PSA-260515', name: 'ShinyHunters', context: 'FBI advisory / 15 May 2026', source: 'https://www.ic3.gov/PSA/2026/PSA260515', sourceLabel: 'FBI / IC3', retrieved: '2026-10-27', summary: 'The FBI’s May 2026 advisory describes ShinyHunters as a cybercrime group focused on large data breaches and extortion. It warns that pressure messages and claims of access may be deceptive.', lesson: 'Defender practice: verify urgent or unusual requests through a different, previously trusted contact method before responding.' }
    ],
    liaisons: [
      { name: 'Agent Zero', office: 'Joint Cyber Response Grid', role: 'Case coordinator', line: 'The manifest says the delivery arrived tomorrow. Usually that is accounting.', inspiration: 'Original fictional coordination center.' },
      { name: 'Nova', office: 'Continuity Desk', role: 'Incident response', line: 'Contain the dispatcher. The hospital deliveries still need a route.', inspiration: 'CISA-inspired infrastructure coordination.' },
      { name: 'Hex', office: 'Cipher Annex', role: 'Cryptographic research', line: 'A signature proves which key signed a thing. It does not prove the thing was wise.', inspiration: 'NSA-inspired cryptography and network analysis.' },
      { name: 'Sable', office: 'Evidence Bureau', role: 'Evidence preservation', line: 'Please do not improve the evidence before you copy it.', inspiration: 'FBI-inspired digital evidence discipline.' },
      { name: 'Mira', office: 'Assessment Office', role: 'Source and confidence review', line: 'Three matching stories can still share one unreliable source.', inspiration: 'CIA-inspired strategic assessment and source evaluation.' },
      { name: 'Patch', office: 'Resilience Lab', role: 'Recovery engineering', line: 'The backup worked. I documented this historical event.', inspiration: 'NIST-inspired risk and control assessment.' },
      { name: 'Orbit', office: 'Defensive Operations Cell', role: 'Exercise coordination', line: 'We are defending a simulation. The coordination still matters.', inspiration: 'USCYBERCOM-inspired defensive exercise planning.' }
    ],
    codex: [
      { id: 'packets', title: 'Packets and evidence', text: 'Timing helps identify a stream. Reassembly uses sequence information, not visual arrival order. Periodicity alone is not proof of malicious activity.' },
      { id: 'encoding', title: 'Encoding is not encryption', text: 'Hexadecimal represents bytes as text. Decoding it requires no secret. Encryption protects content using a key.' },
      { id: 'trust', title: 'Signed does not mean safe', text: 'A valid signature can identify a signing key and detect changes. A compromised build can still produce a correctly signed malicious package.' },
      { id: 'dns', title: 'DNS caches', text: 'A recursive resolver can return an older cached answer until its TTL expires. Compare authoritative records, cache age, and timestamps before concluding a hijack.' },
      { id: 'crypto', title: 'Repeated keystreams', text: 'Reusing a stream-cipher keystream exposes relationships between plaintexts: C1 XOR C2 = P1 XOR P2. Use established cryptography with unique nonces and authenticated encryption.' },
      { id: 'bounds', title: 'Bounds and validation', text: 'For a zero-based array of length n, valid integer indices satisfy 0 <= index < n. Validate before reading and test both endpoints and invalid inputs.' },
      { id: 'supply', title: 'Supply-chain verification', text: 'Compare artifact digests across independently preserved stages. A signature does not establish that the build used the intended source or that a dependency was trustworthy.' },
      { id: 'attribution', title: 'Confidence is a finding', text: 'Infrastructure overlap can have several explanations. Distinguish observed facts, hypotheses, and attribution confidence. Uncertainty is an acceptable conclusion.' },
      { id: 'containment', title: 'Contain, preserve, recover', text: 'Preserve evidence where practical, isolate affected assets, revoke compromised credentials, restore from a trusted version, and monitor recovery. Balance containment with essential services.' }
    ],
    coachGuides: {
      'route-zero': {
        goal: 'Find the computer that changed a delivery route without permission.',
        payoff: 'You will keep the clinic deliveries moving and earn your first Traffic Lens.',
        terms: [['Packet', 'A small piece of a message sent between computers.'], ['Source', 'The computer that sent a message.'], ['Sequence', 'The number that tells you where a message fragment belongs.'], ['Hex', 'A way to write bytes as pairs of letters and numbers. The decoder reads it for you.']],
        steps: [
          { title: 'Spot the repeating sender', text: 'Look for 02, 12 and 22 seconds. Each message is ten seconds apart, and all three come from 10.77.4.23. A pattern is a clue, not proof that someone did something wrong.', fields: { source: '10.77.4.23' } },
          { title: 'Put the pieces in number order', text: 'The fragments arrived out of order. Their sequence numbers are like page numbers: read 1, then 2, then 3. Enter 1,2,3; you do not have to memorize the byte strings.', fields: { order: '1,2,3' } },
          { title: 'Let the decoder read the message', text: 'The decoder joins those pieces and reads ROUTE OVERRIDE. That means a request to replace the normal route. Use the clue to run the decoder and copy its readable message.', fields: { message: 'ROUTE OVERRIDE' }, tool: 'decode-packets' },
          { title: 'Check a second piece of evidence', text: 'The endpoint log says authorized=false: the route changed without permission. Choose that log as your supporting clue. A name lookup or clock update alone would not prove this.', fields: { evidence: 'unauthorized' } }
        ]
      },
      'trusted-package': {
        goal: 'Find the safety check that disappeared from an update.',
        payoff: 'You will repair the update checks and earn Static Diff.',
        terms: [['Signature', 'A check showing which key signed a file and whether it changed afterward.'], ['Origin', 'Where an update is allowed to come from.']],
        steps: [
          { title: 'Compare the two versions', text: 'Both versions still check the signature. The delivered version removed the line that checks TRUSTED_VENDOR. That missing safety check is vendor origin validation.', fields: { boundary: 'origin' } },
          { title: 'Keep both safety checks', text: 'A signed file can still do the wrong thing. The repair should require a valid signature AND the trusted origin before applying an update.', fields: { patch: 'both' } }
        ]
      },
      'ghost-route': {
        goal: 'Find the current address and explain why one computer remembers an older one.',
        payoff: 'You will avoid shutting down a healthy service and earn Resolver Map.',
        terms: [['DNS', 'The address book that turns a service name into an address.'], ['Authoritative', 'The service owner’s current address record.'], ['Cache / TTL', 'A saved answer and the time it is allowed to be reused.']],
        steps: [
          { title: 'Read the newest owner record', text: 'At 10:02 the owner updated the address to 198.51.100.42. Resolver B asked again and got that new address. That is the current address to report.', fields: { address: '198.51.100.42' } },
          { title: 'Explain the old answer', text: 'Resolver A saved its answer at 10:00. Its timer still has 160 seconds left, so it can legitimately return the old answer for now. Choose the older cache entry, not a confirmed attack.', fields: { cause: 'cache' } }
        ]
      },
      'repeated-machine': {
        goal: 'Use the recovery tool to read a message from a deliberately broken toy encoder.',
        payoff: 'You will learn one encryption mistake and earn Cipher Prism.',
        terms: [['Plaintext', 'A message you can read.'], ['Ciphertext', 'The encoded or encrypted version.'], ['Keystream / nonce', 'Encryption ingredients that must follow the chosen system’s reuse rules.'], ['XOR', 'A byte-combining operation. The workbench does the calculation here.']],
        steps: [
          { title: 'Try the recovery workbench', text: 'One original message is already known. Because this toy system reused its keystream, the tool can recover the other message: HOLD WEST. You do not need to calculate the bytes by hand.', fields: { message: 'HOLD WEST' }, tool: 'xor' },
          { title: 'Name the actual mistake', text: 'The weakness is reusing the same keystream, not writing the data in hex or making a short message. Choose the reused keystream / nonce explanation.', fields: { failure: 'reuse' } }
        ]
      },
      'bounds-of-trust': {
        goal: 'Keep the toy parser from reading a route slot that does not exist.',
        payoff: 'You will run real local checks and earn Boundary Guard.',
        terms: [['Index', 'A slot number. The first slot is 0, so three routes use slots 0, 1 and 2.'], ['Predicate', 'A yes-or-no rule deciding whether an input is allowed.'], ['Regression test', 'A repeatable check that helps a repaired bug stay repaired.']],
        steps: [
          { title: 'Allow only real route slots', text: 'There are three routes: slots 0, 1 and 2. A safe rule accepts whole numbers at least 0 and strictly below routes.length. Choose the rule with index < routes.length and the lower-bound check.', fields: { policy: 'strict' } },
          { title: 'Test the repair', text: 'Now test -1, 0, 2, 3 and 1.5. Only 0 and 2 should pass. Use this clue to run the actual local test tool; choosing a rule alone does not count as testing it.', fields: {}, tool: 'bounds-test' }
        ]
      },
      'assembly-line': {
        goal: 'Find where a package stopped matching the reviewed file.',
        payoff: 'You will compare real local fingerprints and earn Provenance Lens.',
        terms: [['Hash / digest', 'A reproducible fingerprint calculated from a file’s exact bytes.'], ['SHA-256', 'The fingerprint tool used in this exercise.'], ['Provenance', 'The record of where a file came from and how it was built.']],
        steps: [
          { title: 'Calculate the fingerprints', text: 'The reviewed file is abc and the customer file is abd. Use this clue to calculate both SHA-256 fingerprints in your browser. Changing even one letter changes the result.', fields: {}, tool: 'hash' },
          { title: 'Keep the reviewed fingerprint', text: 'The trusted record matches abc. Copy the fingerprint for that reviewed source into the report. The coach can copy it for you; no one expects you to memorize a long digest.', fields: { digest: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' } },
          { title: 'Find the first changed link', text: 'Source and reviewed build both say abc. The delivered package is already abd, and the customer received abd too. The first change is reviewed build → delivered package.', fields: { edge: 'build-package' } }
        ]
      },
      'hold-the-grid': {
        goal: 'Tell the story in order, protect the deliveries and separate facts from guesses.',
        payoff: 'You will finish Black Freight and earn Grid Keeper.',
        terms: [['Attack chain', 'The sequence of changes that led to a problem.'], ['Attribution', 'An assessment of who was responsible.'], ['Confidence', 'How strongly the available evidence supports a conclusion.']],
        steps: [
          { title: 'Build the timeline', text: 'First the package changed (B). Then customers accepted it (A). Its route token changed deliveries without permission (C), and deliveries were redirected (D). The order is B,A,C,D.', fields: { order: 'B,A,C,D' } },
          { title: 'Leave the unsupported guess out', text: 'The technical chain is supported, but rented servers and language clues do not establish a state sponsor. “Sponsor uncertain; technical chain supported” is a good, complete finding.', fields: { confidence: 'uncertain' } }
        ]
      }
    },
    missions: [
      {
        id: 'route-zero', act: 'I', title: 'Route Zero', skill: 'Network forensics', npc: 'Agent Zero + Nova',
        brief: 'Plaza transit signs are showing impossible deliveries. Correlate the dispatcher capture with the route log before taking anything offline.',
        objective: 'Identify the repeating source, reassemble its fragments, and find corroborating evidence.',
        kind: 'packets', reward: { xp: 180, credits: 90, item: 'TRAFFIC-LENS' }, badge: 'PACKET WHISPERER',
        packets: [
          { time: '00.4', src: '10.77.4.10', dst: '192.0.2.53:53', protocol: 'DNS', seq: '-', payload: 'A manifest.grid.example' },
          { time: '02.0', src: '10.77.4.23', dst: '203.0.113.77:443', protocol: 'SIM', seq: 3, payload: '52494445' },
          { time: '07.6', src: '10.77.4.10', dst: '198.51.100.42:443', protocol: 'HTTPS', seq: '-', payload: 'manifest check: OK' },
          { time: '12.0', src: '10.77.4.23', dst: '203.0.113.77:443', protocol: 'SIM', seq: 1, payload: '524f55544520' },
          { time: '14.3', src: '10.77.4.18', dst: '192.0.2.12:123', protocol: 'NTP', seq: '-', payload: 'clock synchronized' },
          { time: '22.0', src: '10.77.4.23', dst: '203.0.113.77:443', protocol: 'SIM', seq: 2, payload: '4f564552' }
        ],
        log: '22:17:22 dispatcher-23 route.change actor=route-token-7 authorized=false target=west-yard',
        hints: ['Compare gaps between messages from the same source.', 'The suspicious source appears at 02, 12, and 22 seconds. Sequence numbers order the fragments.', 'Select 10.77.4.23, order 1,2,3, decode hex to ASCII, then corroborate with the unauthorized route-change log.'],
        debrief: 'The ten-second pattern was a lead, not a verdict. Sequence-ordered fragments revealed ROUTE OVERRIDE, and the endpoint log independently confirmed an unauthorized route change. You preserved the evidence and removed the dispatcher foothold while legitimate deliveries continued.',
        defense: 'Investigate periodic traffic with endpoint context. Isolate the affected producer, revoke scoped credentials, restore trusted configuration, and monitor clean traffic.', codex: ['packets', 'encoding', 'containment'], containment: true
      },
      {
        id: 'trusted-package', act: 'II', title: 'A Trusted Package', skill: 'Static analysis', npc: 'Hex', kind: 'artifact',
        brief: 'Both updater versions have valid signatures. Compare the route-validation logic. Which trust boundary changed?',
        objective: 'Identify the removed check and choose the patch that preserves both signature and origin validation.',
        before: 'function accept(update) {\n  if (!validSignature(update)) return false;\n  if (update.origin !== TRUSTED_VENDOR) return false;\n  return applyRoute(update);\n}',
        after: 'function accept(update) {\n  if (!validSignature(update)) return false;\n  // origin policy moved to a later release\n  return applyRoute(update);\n}',
        reward: { xp: 210, credits: 100, item: 'STATIC-DIFF' }, badge: 'TRUST BUT VERIFY',
        hints: ['The signature check still exists in both versions.', 'A valid signature does not replace an origin policy.', 'The removed boundary is vendor origin validation. Restore it before applying the update.'],
        debrief: 'The signing key had not changed. The origin guard had. A valid signature authenticated an artifact whose behavior crossed an unintended boundary.',
        defense: 'Require code review and tests for policy changes; preserve signed provenance and enforce the intended authorization boundary.', codex: ['trust']
      },
      {
        id: 'ghost-route', act: 'III', title: 'Roads Without Cities', skill: 'DNS investigation', npc: 'Nova', kind: 'dns',
        brief: 'One resolver sends dispatchers to an old address. Compare its cache with the current authoritative record before escalating a DNS compromise.',
        objective: 'Determine the current authoritative address and explain the resolver discrepancy.',
        records: [
          ['10:00:00', 'Authoritative', 'manifest.grid.example', '198.51.100.17', 'TTL 300'],
          ['10:02:00', 'Authoritative update', 'manifest.grid.example', '198.51.100.42', 'TTL 300'],
          ['10:02:20', 'Resolver A cache', 'manifest.grid.example', '198.51.100.17', 'cached 10:00:00; TTL remaining 160'],
          ['10:02:20', 'Resolver B fresh query', 'manifest.grid.example', '198.51.100.42', 'TTL 300']
        ], reward: { xp: 230, credits: 110, item: 'RESOLVER-MAP' }, badge: 'FALSE POSITIVE AVOIDED',
        hints: ['Read when Resolver A cached its answer.', 'Its original TTL has not expired; compare a fresh query.', 'The current address is 198.51.100.42. Resolver A still holds a valid, older cache entry.'],
        debrief: 'Resolver A had a stale but unexpired cached answer. This discrepancy alone was not evidence of an attacker. Avoiding an unsupported incident kept the investigation focused.',
        defense: 'Plan record changes around TTLs and verify authoritative data. Cache clearing can aid diagnosis, but it does not prove or resolve an intrusion.', codex: ['dns', 'attribution']
      },
      {
        id: 'repeated-machine', act: 'IV', title: 'The Machine That Repeats', skill: 'Cryptographic reasoning', npc: 'Hex', kind: 'crypto',
        brief: 'A toy telemetry encoder reused the same keystream for two messages. One plaintext was logged. Recover the other from the supplied bytes.',
        objective: 'Compute P2 = C1 XOR C2 XOR P1, then identify why the scheme failed.',
        plain1: 'STATUS OK', cipher1: '4af67c318143916b18', cipher2: '51ed7121f447f47707',
        reward: { xp: 260, credits: 120, item: 'CIPHER-PRISM' }, badge: 'KEY INSIGHT',
        hints: ['XORing a value with itself cancels it.', 'The shared keystream cancels when C1 and C2 are XORed. XOR with P1 to recover P2.', 'Use the recovery workbench. The message is HOLD WEST; the failure is a reused keystream/nonce.'],
        debrief: 'You recovered a message without guessing a secret because the toy encoder reused its keystream. This illustrates a cryptographic misuse, not a weakness in correctly deployed modern encryption.',
        defense: 'Use reviewed authenticated-encryption libraries and satisfy their key and nonce requirements. Never invent a production cipher from this training example.', codex: ['crypto', 'encoding']
      },
      {
        id: 'bounds-of-trust', act: 'V', title: 'Bounds of Trust', skill: 'Safe vulnerability research', npc: 'Patch', kind: 'bounds',
        brief: 'The local route parser accepts an index equal to the route count. Repair the toy boundary predicate and exercise its edge cases.',
        objective: 'Reject negative, noninteger, and out-of-range indices before reading a route.',
        code: 'const routes = ["NORTH", "EAST", "WEST"];\nif (index <= routes.length) {\n  return routes[index];\n}',
        reward: { xp: 290, credits: 130, item: 'BOUNDARY-GUARD' }, badge: 'EDGE CASE',
        hints: ['A three-element array has indices 0, 1, and 2.', 'The upper bound must be exclusive. Negative and fractional inputs also need rejection.', 'Select Number.isInteger(index) && index >= 0 && index < routes.length, and run all five tests.'],
        debrief: 'The patched predicate accepted valid indices and rejected the negative, fractional, and length-boundary cases. The exercise ran only over three synthetic strings inside your browser.',
        defense: 'Validate type and range before access; add regression tests and use memory-safe interfaces for production parsers.', codex: ['bounds']
      },
      {
        id: 'assembly-line', act: 'VI', title: 'The Dependency', skill: 'Artifact provenance', npc: 'Sable + Hex', kind: 'supply',
        brief: 'A package carries a valid signing certificate. Compare independently preserved source and customer bytes to locate the first evidenced mismatch.',
        objective: 'Hash both toy artifacts, compare the trusted manifest, and identify the mismatching edge.',
        sourceArtifact: 'abc', customerArtifact: 'abd', expectedDigest: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        chain: ['Vendor source: abc', 'Reviewed build output: abc', 'Signed package delivered: abd', 'Customer installed: abd'],
        reward: { xp: 320, credits: 140, item: 'PROVENANCE-LENS' }, badge: 'CHAIN OF CUSTODY',
        hints: ['Identical bytes produce identical SHA-256 digests.', 'The reviewed build output agrees with the trusted manifest. The delivered package does not.', 'Compute both digests. The first evidenced mismatch is build -> package; a valid signature alone does not resolve it.'],
        debrief: 'The independently recorded build digest matched abc. Customers received abd. The first evidenced mismatch was between reviewed build and delivered package. The certificate alone could not establish trustworthy build provenance.',
        defense: 'Verify independently recorded digests and provenance, protect build identities, review dependencies, and retain recovery artifacts.', codex: ['supply', 'trust']
      },
      {
        id: 'hold-the-grid', act: 'VII', title: 'Hold the Grid', skill: 'Incident response and assessment', npc: 'Joint Cyber Response Grid', kind: 'finale',
        brief: 'Morrow Exchange is a fictional access broker; the supplied evidence does not establish a state sponsor. Reconstruct the operation, protect critical deliveries, and report defensible confidence.',
        objective: 'Order the observed attack chain and distinguish technical findings from uncertain sponsorship.',
        evidence: [
          'A: Customer dispatchers accepted the altered signed package.',
          'B: The reviewed build and delivered package digests first diverged.',
          'C: Dispatcher route tokens issued unauthorized manifest changes.',
          'D: Essential deliveries were redirected from approved lanes.',
          'Context: conflicting language markers and rented infrastructure overlap; no independent sponsor evidence.'
        ], reward: { xp: 420, credits: 200, item: 'GRID-KEEPER' }, badge: 'CYBERWORLD CODEBREAKER',
        hints: ['Start at the earliest independently observed divergence.', 'The sequence is package divergence, customer acceptance, token misuse, then impact.', 'Order B,A,C,D and select uncertain sponsor attribution. Then preserve, isolate, rotate, and verify the recovery graph.'],
        debrief: 'You reconstructed the trust failure, contained the affected branch, and preserved a path for essential freight. The technical chain is supported; a state sponsor is not. Good intelligence records that difference. The Grid remains open, and an unclaimed orbital relay is still transmitting.',
        defense: 'Coordinate evidence preservation, targeted isolation, credential rotation, trusted recovery, and recurrence monitoring. Record confidence and remaining gaps.', codex: ['attribution', 'containment'], containment: true
      }
    ]
  };
}));
