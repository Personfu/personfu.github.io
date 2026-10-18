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
assert.deepEqual(data.researchDossiers.map(d => d.id), ['G0034','G0032','G0096']);
for (const dossier of data.researchDossiers) {
  assert.equal(dossier.source, `https://attack.mitre.org/groups/${dossier.id}/`);
  assert.equal(dossier.retrieved, '2026-10-18');
  assert.match(dossier.summary, /MITRE ATT&CK/);
}
for (const composite of data.simulationAdversaries) {
  assert.ok(composite.defense && data.missions.some(m => m.id === composite.mission));
  assert.ok(fs.existsSync(path.resolve(__dirname,'../CyberWorld',composite.image)),'Existing original threat-model artwork must resolve');
}
for (const m of data.missions) {
  assert.ok(m.objective && m.brief && m.defense && m.debrief && m.hints.length === 3);
  assert.ok(m.reward.xp > 0 && m.reward.item && m.codex.every(id => data.codex.some(c => c.id === id)));
  assert.equal(game.validate(m.id, {}), false, `${m.id} must require an actual finding`);
}

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
