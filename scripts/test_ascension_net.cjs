'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'CyberWorld', 'ascension-net.js'), 'utf8');
let time = 100000, timerId = 0, identityId = 0;
const clocks = new Map(), channels = [];
function schedule(fn, ms, interval) { const id = ++timerId; clocks.set(id, { fn, at: time + ms, interval }); return id; }
function tick(ms) {
  const end = time + ms;
  for (;;) {
    let first;
    for (const [id, timer] of clocks) if (timer.at <= end && (!first || timer.at < first[1].at)) first = [id, timer];
    if (!first) break;
    time = first[1].at;
    if (first[1].interval) first[1].at += first[1].interval; else clocks.delete(first[0]);
    first[1].fn();
  }
  time = end;
}
class Channel {
  constructor(name) { this.name = name; this.closed = false; channels.push(this); }
  postMessage(data) { channels.filter(other => other !== this && other.name === this.name && !other.closed).forEach(other => other.onmessage?.({ data: structuredClone(data) })); }
  close() { this.closed = true; }
}
function browser({ websocket = true, broadcast = true } = {}) {
  const sockets = [], events = new Map();
  class Socket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    send(data) { this.sent.push(JSON.parse(data)); }
    close() { this.readyState = 3; this.onclose?.(); }
    open() { this.readyState = 1; this.onopen?.(); }
    message(event, payload, extra = {}) { this.onmessage?.({ data: JSON.stringify({ topic: 'realtime:cw-ascension-plaza-v1', event, payload, ...extra }) }); }
    join() { this.open(); const join = this.sent.find(item => item.event === 'phx_join'); this.message('phx_reply', { status: 'ok' }, { ref: join.ref }); }
  }
  const window = { Date: class extends Date { static now() { return time; } }, crypto: { randomUUID: () => '00000000-0000-4000-8000-' + String(++identityId).padStart(12, '0') },
    navigator: { onLine: true }, WebSocket: websocket ? Socket : undefined, BroadcastChannel: broadcast ? Channel : undefined,
    setTimeout: (fn, ms) => schedule(fn, ms, 0), clearTimeout: id => clocks.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, ms), clearInterval: id => clocks.delete(id),
    addEventListener: (name, fn) => events.set(name, fn) };
  const context = vm.createContext({ window, Date: window.Date, console });
  vm.runInContext(source, context);
  return { window, api: window.__cwAscensionNet, sockets, events };
}

// Unsubscribed sockets never claim cloud connectivity or invent users.
const a = browser();
a.api.start({ callsign: 'SAME NAME', faction: 'IRONWALL', email: 'private@example.test', xp: 999999, role: '<script>' });
assert.equal(a.api.status().online, false);
assert.equal(a.api.status().label, 'THIS BROWSER');
assert.equal(a.api.peers().length, 0);
a.sockets[0].open();
assert.equal(a.api.status().online, false);
const join = a.sockets[0].sent[0];
assert.equal(join.payload.config.private, false);
assert.equal(join.payload.config.postgres_changes.length, 0);
assert.equal(join.payload.access_token, undefined);
a.sockets[0].message('phx_reply', { status: 'ok' }, { ref: join.ref });
assert.equal(a.api.status().label, 'LIVE GRID');
const track = a.sockets[0].sent.find(item => item.event === 'presence');
assert.equal(track.payload.payload.email, undefined);
assert.equal(track.payload.payload.xp, undefined);
assert.equal(track.payload.payload.role, 'script');
assert.equal(track.payload.payload.level, 1);

// Public metadata is display-only, bounded and keyed by session, never callsign.
const peerId = 'cw-remote-session-001';
a.sockets[0].message('presence_state', { [peerId]: { metas: [{ phx_ref: 'ref1', sessionId: peerId, callsign: 'SAME NAME', x: 4, z: 6, credits: 10000, email: 'secret@example.test' }] } });
assert.equal(a.api.peers().length, 1);
assert.equal(a.api.peers()[0].sessionId, peerId);
assert.equal(a.api.peers()[0].email, undefined);
assert.equal(a.api.peers()[0].credits, undefined);
a.sockets[0].message('broadcast', { event: 'position', payload: { sessionId: peerId, callsign: 'SAME NAME', x: 9e12, z: 8, xp: 100000 } });
assert.equal(a.api.peers()[0].x, 1);
assert.equal(a.api.peers()[0].z, 8);
a.sockets[0].message('broadcast', { event: 'position', payload: { sessionId: 'cw-unknown-session', x: 10 } });
assert.equal(a.api.peers().length, 1, 'Untracked broadcasts must not invent roster entries');

// Movement coalesces to eight updates per second despite a fast render loop.
for (let i = 0; i < 100; i++) a.api.publishPosition({ x: i / 100, z: 2, xp: 100000 });
tick(124);
assert.equal(a.sockets[0].sent.filter(item => item.event === 'broadcast').length, 0);
tick(1);
const move = a.sockets[0].sent.find(item => item.event === 'broadcast');
assert.equal(move.payload.payload.x, 0.99);
assert.equal(move.payload.payload.xp, undefined);
for (let i = 0; i < 100; i++) { a.api.publishPosition({ x: i }); tick(10); }
assert.equal(a.sockets[0].sent.filter(item => item.event === 'broadcast').length, 9);

// A leave removes only the matching presence ref; refresh joins survive old leaves.
a.sockets[0].message('presence_diff', { joins: { [peerId]: { metas: [{ phx_ref: 'ref2', sessionId: peerId, callsign: 'SAME NAME' }] } }, leaves: { [peerId]: { metas: [{ phx_ref: 'ref1' }] } } });
assert.equal(a.api.peers().length, 1);
a.sockets[0].message('presence_diff', { leaves: { [peerId]: { metas: [{ phx_ref: 'ref2' }] } } });
assert.equal(a.api.peers().length, 0);

// Independent tabs with identical callsigns stay distinct in an honest local fallback.
const b = browser({ websocket: false });
b.api.start({ callsign: 'SAME NAME' });
const c = browser({ websocket: false });
c.api.start({ callsign: 'SAME NAME' });
assert.notEqual(b.api.status().sessionId, c.api.status().sessionId);
assert.equal(b.api.status().label, 'THIS BROWSER');
assert.ok(b.api.peers().some(peer => peer.sessionId === c.api.status().sessionId));
assert.equal(b.api.peers().every(peer => peer.transport === 'browser'), true);
assert.equal(c.window.__cwNet.roster().length, 3, 'Roster includes self and both real local tabs');
c.api.publishPosition({ x: 35, z: 42 }); tick(125);
assert.equal(b.api.peers().find(peer => peer.sessionId === c.api.status().sessionId).z, 42);

// Network loss immediately clears cloud peers; stop announces departure and clears timers.
a.sockets[0].message('presence_state', { [peerId]: { metas: [{ phx_ref: 'ref3', sessionId: peerId }] } });
a.sockets[0].close();
assert.equal(a.api.status().online, false);
assert.equal(a.api.status().label, 'THIS BROWSER');
assert.equal(a.api.peers().some(peer => peer.sessionId === peerId), false);
c.api.stop();
assert.equal(b.api.peers().some(peer => peer.sessionId === c.api.status().sessionId), false);
assert.equal(c.api.status().label, 'SOLO MODE');
const isolated = browser({ websocket: false, broadcast: false }); isolated.api.start();
assert.equal(isolated.api.status().label, 'SOLO MODE');
isolated.api.stop(); a.api.stop(); b.api.stop();
assert.equal(clocks.size, 0, 'Stopped clients must release all timers');

// Rejected joins stay local; handshake and heartbeat failures never leave ghosts.
const rejected = browser(); rejected.api.start(); rejected.sockets[0].open();
rejected.sockets[0].message('phx_reply', { status: 'error' }, { ref: rejected.sockets[0].sent[0].ref });
assert.equal(rejected.api.status().online, false);
rejected.api.stop();
const silent = browser(); silent.api.start(); tick(10000);
assert.equal(silent.api.status().connecting, false);
assert.match(silent.api.status().reason, /timed out/);
silent.api.stop();
const heartbeat = browser(); heartbeat.api.start(); heartbeat.sockets[0].join();
heartbeat.sockets[0].message('presence_state', { [peerId]: { metas: [{ sessionId: peerId, phx_ref: 'heartbeat-peer' }] } });
tick(20000);
assert.equal(heartbeat.api.status().online, true);
tick(20000);
assert.equal(heartbeat.api.status().online, false, 'An unanswered heartbeat disconnects the grid');
assert.equal(heartbeat.api.peers().length, 0);
heartbeat.api.stop();

// A crashed local tab disappears without requiring a leave announcement.
const survivor = browser({ websocket: false }); survivor.api.start();
channels.filter(channel => !channel.closed).forEach(channel => channel.onmessage?.({ data: { version: 1, type: 'state', peer: { sessionId: peerId, callsign: 'STALE TAB' } } }));
assert.equal(survivor.api.peers().length, 1);
tick(50000);
assert.equal(survivor.api.peers().length, 0);
survivor.api.stop();
tick(40000);
assert.equal(clocks.size, 0, 'Stopped clients cannot reconnect or retain active timers');
console.log('Ascension networking: subscription truth, privacy, actual tab discovery, session identity, bounded movement, departure and cleanup pass.');
