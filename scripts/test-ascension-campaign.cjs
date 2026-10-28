const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../CyberWorld/ascension-data.js');
const game = require('../CyberWorld/ascension-campaign.js');

assert.equal(data.missions.length, 7);
assert.equal(new Set(data.missions.map(m => m.id)).size, 7);
assert.equal(new Set(data.missions.map(m => m.kind)).size, 7, 'Each act has a different analytical task');
assert.deepEqual(data.factions.map(f => f.id), ['GHOSTNET', 'IRONWALL', 'NULLSEC', 'DAEMON']);
assert.deepEqual(data.researchDossiers.map(d => d.id), ['G0034','G0032','G0096','G0020','FBI-PSA-260515']);
const trustedReferences = {
  G0034: { source:'https://attack.mitre.org/groups/G0034/', sourceLabel:'MITRE ATT&CK', retrieved:'2026-10-18' },
  G0032: { source:'https://attack.mitre.org/groups/G0032/', sourceLabel:'MITRE ATT&CK', retrieved:'2026-10-18' },
  G0096: { source:'https://attack.mitre.org/groups/G0096/', sourceLabel:'MITRE ATT&CK', retrieved:'2026-10-18' },
  G0020: { source:'https://attack.mitre.org/groups/G0020/', sourceLabel:'MITRE ATT&CK', retrieved:'2026-10-27' },
  'FBI-PSA-260515': { source:'https://www.ic3.gov/PSA/2026/PSA260515', sourceLabel:'FBI / IC3', retrieved:'2026-10-27' }
};
for (const dossier of data.researchDossiers) {
  assert.deepEqual({source:dossier.source,sourceLabel:dossier.sourceLabel,retrieved:dossier.retrieved},trustedReferences[dossier.id]);
  assert.match(dossier.summary, dossier.sourceLabel === 'FBI / IC3' ? /FBI/ : /MITRE ATT&CK/);
  if (dossier.retrieved === '2026-10-27') assert.ok([dossier.context,dossier.summary,dossier.lesson].join(' ').split(/\s+/).length <= 80, 'New optional research cards stay brief');
}
assert.doesNotMatch(data.researchDossiers.find(d=>d.id==='G0020').summary,/\b(?:NSA|CIA|FBI)\b/,'The Equation reference does not invent agency attribution');
assert.match(data.researchDossiers.find(d=>d.id==='FBI-PSA-260515').lesson,/verify urgent or unusual requests/);
for (const composite of data.simulationAdversaries) {
  assert.ok(composite.defense && data.missions.some(m => m.id === composite.mission));
  assert.ok(fs.existsSync(path.resolve(__dirname,'../CyberWorld',composite.image)),'Existing original threat-model artwork must resolve');
}
for (const m of data.missions) {
  assert.ok(m.objective && m.brief && m.defense && m.debrief && m.hints.length === 3);
  assert.ok(m.reward.xp > 0 && m.reward.item && m.codex.every(id => data.codex.some(c => c.id === id)));
  assert.equal(game.validate(m.id, {}), false, `${m.id} must require an actual finding`);
}

// Every worked guide must lead to the genuine finding, without fabricating
// the tool-execution checks or completing a case on the player's behalf.
for (const m of data.missions) {
  const guide = game.coachGuide(m.id);
  assert.ok(guide && guide.goal && guide.payoff && guide.terms.length > 0, `${m.id} has plain-language context`);
  assert.ok(guide.steps.length >= 2 && guide.steps.length <= 5, `${m.id} has a short worked path`);
  const coached = {};
  for (const step of guide.steps) {
    assert.ok(step.title && step.text.length > 40, `${m.id} explains each clue before applying it`);
    assert.ok(!step.tool || ['decode-packets', 'xor', 'bounds-test', 'hash'].includes(step.tool));
    assert.ok(!Object.hasOwn(step.fields, 'tested') && !Object.hasOwn(step.fields, 'compared'), 'Guides cannot fabricate tool completion');
    Object.assign(coached, step.fields);
  }
  if (m.kind === 'bounds' || m.kind === 'supply') {
    assert.equal(game.validate(m.id, coached), false, `${m.id} still needs the actual tool to run`);
    coached[m.kind === 'bounds' ? 'tested' : 'compared'] = 'true';
  }
  assert.equal(game.validate(m.id, coached), true, `${m.id} coach describes a reproducible correct finding`);
  const untouched = game.freshSave();
  game.coachGuide(m.id).steps[0].fields.injected = 'not saved';
  assert.equal(game.coachGuide(m.id).steps[0].fields.injected, undefined, 'Returned guides cannot mutate authored content');
  assert.deepEqual(untouched.completed, {}, 'Reading or using a guide does not create campaign completion');
}
assert.equal(game.coachGuide('not-a-mission'), null);
assert.match(game.findingFeedback('route-zero', {}), /02, 12 and 22/);
assert.match(game.findingFeedback('route-zero', { source:'10.77.4.23', order:'1,2,3', message:'ROUTE OVERRIDE', evidence:'dns' }), /authorized=false/);
assert.match(game.findingFeedback('bounds-of-trust', {policy:'strict'}), /actually checks/);
assert.match(game.findingFeedback('assembly-line', {}), /calculate/);
for (const m of data.missions) assert.match(game.findingFeedback(m.id, {}), /Nothing was lost; help is free/);

const route = data.missions[0];
const assembled = route.packets.filter(p => typeof p.seq === 'number').sort((a,b) => a.seq-b.seq).map(p => p.payload).join('');
assert.equal(game.fromHex(assembled), 'ROUTE OVERRIDE');
assert.throws(() => game.fromHex('f'), /byte pairs/);
assert.throws(() => game.fromHex('<script>'), /byte pairs/);
const goodRoute = {source:'10.77.4.23',order:'1, 2, 3',message:' route override ',evidence:'unauthorized'};
assert.equal(game.validate('route-zero', goodRoute), true);
assert.equal(game.validate('route-zero', {...goodRoute,evidence:'dns'}), false, 'A timing pattern or DNS lookup alone cannot corroborate an intrusion');
assert.equal(game.validate('route-zero', {...goodRoute,order:'3,1,2'}), false, 'Arrival order is not fragment sequence order');
assert.equal(game.validate('trusted-package', {boundary:'origin',patch:'both'}), true);
assert.equal(game.validate('trusted-package', {boundary:'origin',patch:'signature-only'}), false);
assert.equal(game.validate('ghost-route', {address:'198.51.100.42',cause:'cache'}), true);
assert.equal(game.validate('ghost-route', {address:'198.51.100.42',cause:'hijack'}), false, 'Unexpired cached DNS is not proof of compromise');
const crypto = data.missions[3];
assert.equal(game.recoverXor(crypto.cipher1,crypto.cipher2,crypto.plain1), 'HOLD WEST');
assert.throws(() => game.recoverXor('00','0000','a'), /equal lengths/);
assert.equal(game.validate('repeated-machine', {message:'HOLD WEST',failure:'reuse'}), true);
assert.equal(game.validate('repeated-machine', {message:'HOLD WEST',failure:'hex'}), false);
assert.ok(game.runBounds('strict').every(t => t.passed));
assert.ok(game.runBounds('inclusive').some(t => t.index === 3 && !t.passed));
assert.ok(game.runBounds('upper-only').some(t => t.index === -1 && !t.passed));
assert.equal(game.validate('bounds-of-trust', {policy:'strict',tested:'false'}), false, 'A proposed patch still needs executed edge tests');
assert.equal(game.validate('bounds-of-trust', {policy:'strict',tested:'true'}), true);
const supply = data.missions[5];
assert.equal(createHash('sha256').update(supply.sourceArtifact).digest('hex'), supply.expectedDigest);
assert.notEqual(createHash('sha256').update(supply.customerArtifact).digest('hex'), supply.expectedDigest);
assert.equal(game.validate('assembly-line', {edge:'build-package',digest:supply.expectedDigest,compared:'true'}), true);
assert.equal(game.validate('assembly-line', {edge:'package-customer',digest:supply.expectedDigest,compared:'true'}), false);
assert.equal(game.validate('hold-the-grid', {order:'B,A,C,D',confidence:'uncertain'}), true);
assert.equal(game.validate('hold-the-grid', {order:'B,A,C,D',confidence:'certain'}), false, 'Unsupported sponsor certainty is not a successful intelligence assessment');

let response = game.respond({}, 'isolate', 'dispatcher');
assert.equal(response.ok, false, 'This exercise requires an evidence snapshot before isolation');
response = game.respond(response.state,'snapshot','dispatcher');
const preserved = JSON.stringify(response.state);
const broadBlock = game.respond(response.state,'isolate','subnet');
assert.equal(broadBlock.ok,false);
assert.equal(JSON.stringify(broadBlock.state),preserved,'A mistaken subnet-wide block should not apply destructive state');
assert.equal(game.respond(response.state,'verify','dispatcher').ok,false);
for (const action of ['isolate','rotate','restore','verify']) {
  response=game.respond(response.state,action,'dispatcher');
  assert.equal(response.ok,true,`${action} valid sequence should pass`);
}
assert.equal(response.state.verified,true);
assert.equal(game.respond(response.state,'reset','dispatcher').state.verified,false);

const save=game.freshSave();
assert.equal(game.validImport(save),true);
assert.equal(save.coach,true,'New players start with the coach enabled');
const legacy = {...save}; delete legacy.coach;
assert.equal(game.validImport(legacy),true,'Existing version-1 exports remain valid without a coach preference');
assert.equal(game.normalizeSave(legacy).coach,true,'Existing players can use help without recreating their operative');
assert.equal(game.normalizeSave({...save,coach:false}).coach,false,'Working solo persists through normalized export/import');
assert.equal(game.validImport({...save,coach:'yes'}),false,'Imported settings must be real booleans');
assert.equal(game.validImport({...save,coach:{value:true}}),false);
assert.equal(game.canStart(save,'route-zero'),true);
assert.equal(game.canStart(save,'trusted-package'),false);
save.completed['route-zero']=true;
assert.equal(game.canStart(save,'trusted-package'),true);
assert.equal(game.summary(save).xp,180);
save.completed['route-zero']=true;
assert.equal(game.summary(save).xp,180,'Repeated completion cannot duplicate campaign XP');
assert.equal(game.validImport({...save,version:2}),false);
assert.equal(game.validImport({...save,authToken:'secret'}),false,'Exports accept only allowlisted game fields');
assert.equal(game.validImport({...save,notes:'x'.repeat(12001)}),false);
assert.equal(game.validImport({...save,overclock:Infinity}),false);
assert.equal(game.validImport({...save,completed:{'unknown-mission':true}}),false);
const normalized=game.normalizeSave({overclock:99999,notes:'x'.repeat(13000),journal:[{text:'restored'}],records:{'route-zero':{stage:'not-a-stage',answer:{source:10,secret:'x'},containment:{isolated:'yes'}}}});
assert.equal(normalized.overclock,100);
assert.equal(normalized.notes.length,12000);
assert.equal(normalized.records['route-zero'].stage,'brief');
assert.deepEqual(normalized.records['route-zero'].answer,{});
assert.equal(normalized.records['route-zero'].containment.isolated,false);
assert.equal(game.validImport(normalized),true,'Normalized legacy/corrupt local state is safe to export again');

const script=fs.readFileSync(path.join(__dirname,'../CyberWorld/ascension-campaign.js'),'utf8');
assert.doesNotMatch(script,/\beval\s*\(|new Function|XMLHttpRequest|WebSocket|\bfetch\s*\(/,'Campaign exercises do not execute user code or contact external targets');
console.log('Ascension: seven original puzzle types, cryptographic fixtures, recovery ordering, save validation, and local-only exercise boundary verified.');
