/* CyberWorld Ascension: ephemeral guest presence, never authoritative game state.
 * Uses Supabase's documented public Realtime protocol; no Auth, database, reward,
 * billing or admin endpoint is called. Public peers are untrusted display data.
 * Protocol: https://supabase.com/docs/guides/realtime/protocol (v1 JSON frames).
 */
(function (global) {
  'use strict';
  if (global.__cwAscensionNet) return;
  var TOPIC = 'realtime:cw-ascension-plaza-v1';
  var ENDPOINT = 'wss://byjiuxpljjgnejwrhtnq.supabase.co/realtime/v1/websocket?apikey=sb_publishable_bvW5FctJrdM3jGdbW6QOiw_klgzmfvy&vsn=1.0.0';
  var MAX_PEERS = 128, TTL = 45000, POSITION_MS = 125;
  var running = false, subscribed = false, socket = null, local = null;
  var cloudPeers = new Map(), localPeers = new Map(), presence = new Map();
  var listeners = [], rosterListeners = [], timers = [], retry = null, connectionTimer = null;
  var ref = 0, joinRef = '', trackRef = '', heartbeatRef = '', retryCount = 0;
  var sessionId = '', profile = {}, position = {}, pendingPosition = false;
  var reason = 'Not connected', connecting = false;

  function now() { return Date.now(); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function text(value, fallback, length) {
    var clean = typeof value === 'string' ? value.replace(/[^a-zA-Z0-9 _.-]/g, '').trim().slice(0, length) : '';
    return clean || fallback;
  }
  function number(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(-100000, Math.min(100000, value)) * 100) / 100 : fallback;
  }
  function identity(value) {
    value = value || {};
    return { callsign: text(value.callsign, 'GUEST', 24), faction: text(value.faction || value.agency, 'NEUTRAL', 24),
      role: text(value.role || value.path, 'OPERATIVE', 24), color: /^#[0-9a-f]{6}$/i.test(value.color || '') ? value.color : '#00e5cc' };
  }
  function coordinates(value) {
    value = value || {};
    function unit(v) { return typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(1, v)) * 10000) / 10000 : 0; }
    return { x: unit(value.x), y: unit(value.y), z: number(value.z, 0),
      zone: text(value.zone || value.region, 'plaza', 32), facing: number(value.facing, 0), moving: value.moving === true };
  }
  function validId(value) { return typeof value === 'string' && /^cw-[a-zA-Z0-9-]{8,80}$/.test(value); }
  function newId() {
    try { return 'cw-' + global.crypto.randomUUID(); }
    catch (_) { return 'cw-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 14); }
  }
  function me() { return Object.assign({ sessionId: sessionId, id: sessionId, device: sessionId, guest: true, level: 1 }, profile, position); }
  function activeMap() { return subscribed ? cloudPeers : localPeers; }
  function peers() { return Array.from(activeMap().values()).filter(function (peer) { return peer.sessionId !== sessionId; }).map(copy); }
  function status() {
    var mode = subscribed ? 'cloud' : running && local ? 'browser' : 'solo';
    return { mode: mode, label: mode === 'cloud' ? 'LIVE GRID' : mode === 'browser' ? 'THIS BROWSER' : 'SOLO MODE',
      online: subscribed, connecting: connecting, peers: peers().length, sessionId: sessionId, reason: reason };
  }
  function roster() { return running ? [me()].concat(peers()) : []; }
  function emit() {
    var snapshot = Object.assign(status(), { roster: roster(), players: peers() });
    listeners.slice().forEach(function (fn) { try { fn(copy(snapshot)); } catch (_) {} });
    rosterListeners.slice().forEach(function (fn) { try { fn(roster()); } catch (_) {} });
  }
  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn); fn(Object.assign(status(), { roster: roster(), players: peers() }));
    return function () { listeners = listeners.filter(function (other) { return other !== fn; }); };
  }
  function accept(map, data, transport) {
    if (!data || !validId(data.sessionId) || data.sessionId === sessionId) return false;
    if (!map.has(data.sessionId) && map.size >= MAX_PEERS) return false;
    map.set(data.sessionId, Object.assign({ sessionId: data.sessionId, id: data.sessionId, device: data.sessionId,
      guest: true, level: 1, transport: transport, receivedAt: now() }, identity(data), coordinates(data)));
    return true;
  }
  function send(event, payload, topic) {
    if (!socket || socket.readyState !== 1) return '';
    var next = String(++ref);
    try { socket.send(JSON.stringify({ topic: topic || TOPIC, event: event, payload: payload || {}, ref: next, join_ref: topic === 'phoenix' ? null : joinRef })); return next; }
    catch (_) { disconnect('Connection interrupted'); return ''; }
  }
  function track() { if (subscribed) trackRef = send('presence', { type: 'presence', event: 'track', payload: me() }); }
  function localSend(type) {
    if (!local) return;
    try { local.postMessage({ version: 1, type: type, peer: me() }); } catch (_) {}
  }
  function prune() {
    var changed = false;
    [cloudPeers, localPeers].forEach(function (map) {
      map.forEach(function (peer, id) { if (now() - peer.receivedAt > TTL) { map.delete(id); changed = true; } });
    });
    if (changed) emit();
  }
  function openLocal() {
    if (typeof global.BroadcastChannel !== 'function') return;
    try {
      local = new global.BroadcastChannel('cw-ascension-plaza-v1');
      local.onmessage = function (message) {
        var data = message.data;
        if (!running || !data || data.version !== 1 || !data.peer || !validId(data.peer.sessionId)) return;
        if (data.type === 'leave') { if (localPeers.delete(data.peer.sessionId)) emit(); return; }
        if (data.type !== 'hello' && data.type !== 'state') return;
        if (accept(localPeers, data.peer, 'browser') && !subscribed) emit();
        if (data.type === 'hello') localSend('state');
      };
      localSend('hello');
    } catch (_) { local = null; }
  }
  function clearCloud() { cloudPeers.clear(); presence.clear(); }
  function scheduleReconnect() {
    if (!running || retry || (global.navigator && global.navigator.onLine === false)) return;
    retry = global.setTimeout(function () { retry = null; connect(); }, Math.min(30000, 5000 * Math.pow(2, Math.min(retryCount++, 3))));
  }
  function disconnect(message) {
    var previous = socket;
    socket = null; subscribed = false; connecting = false; heartbeatRef = ''; clearCloud();
    if (connectionTimer) global.clearTimeout(connectionTimer); connectionTimer = null;
    reason = message || 'Grid unavailable; local play continues';
    if (previous) { previous.onopen = previous.onmessage = previous.onclose = previous.onerror = null; try { previous.close(); } catch (_) {} }
    emit(); scheduleReconnect();
  }
  function applyPresence(payload, isState) {
    if (isState) { clearCloud(); }
    var joins = isState ? payload : payload.joins || {};
    Object.keys(joins || {}).slice(0, MAX_PEERS).forEach(function (id) {
      if (!validId(id)) return;
      if (!presence.has(id) && presence.size >= MAX_PEERS + 1) return;
      var metas = joins[id] && joins[id].metas;
      if (!Array.isArray(metas)) return;
      var existing = presence.get(id) || [];
      metas.slice(-4).forEach(function (meta) {
        if (!meta || meta.sessionId !== id) return;
        existing = existing.filter(function (old) { return old.phx_ref !== meta.phx_ref; });
        existing.push(Object.assign({ sessionId: id, phx_ref: String(meta.phx_ref || '').slice(0, 128) }, identity(meta), coordinates(meta)));
      });
      presence.set(id, existing.slice(-4));
      if (existing.length) accept(cloudPeers, existing[existing.length - 1], 'cloud');
    });
    if (!isState) Object.keys(payload.leaves || {}).forEach(function (id) {
      var left = payload.leaves[id] && payload.leaves[id].metas || [];
      var remaining = (presence.get(id) || []).filter(function (meta) { return !left.some(function (gone) { return gone.phx_ref === meta.phx_ref; }); });
      if (!remaining.length) { presence.delete(id); cloudPeers.delete(id); }
      else { presence.set(id, remaining); accept(cloudPeers, remaining[remaining.length - 1], 'cloud'); }
    });
    emit();
  }
  function receive(message) {
    if (typeof message.data !== 'string' || message.data.length > 131072) return;
    var data; try { data = JSON.parse(message.data); } catch (_) { return; }
    if (!data || typeof data !== 'object') return;
    if (data.topic === 'phoenix' && data.event === 'phx_reply' && data.ref === heartbeatRef) { heartbeatRef = ''; return; }
    if (data.topic !== TOPIC) return;
    var payload = data.payload || {};
    if (data.event === 'phx_reply') {
      if (data.ref === joinRef) {
        if (payload.status !== 'ok') { disconnect('Public grid unavailable; local play continues'); return; }
        if (connectionTimer) global.clearTimeout(connectionTimer); connectionTimer = null;
        subscribed = true; connecting = false; retryCount = 0; reason = 'Public guest presence connected'; track(); emit();
      } else if (data.ref === trackRef && payload.status === 'error') disconnect('Guest presence unavailable; local play continues');
      return;
    }
    if (data.event === 'phx_close' || data.event === 'phx_error' || (data.event === 'system' && payload.status === 'error')) { disconnect('Grid disconnected; local play continues'); return; }
    if (!subscribed) return;
    if (data.event === 'presence_state') applyPresence(payload, true);
    if (data.event === 'presence_diff') applyPresence(payload, false);
    if (data.event === 'broadcast' && payload.event === 'position' && payload.payload && presence.has(payload.payload.sessionId)) {
      if (accept(cloudPeers, payload.payload, 'cloud')) emit();
    }
  }
  function connect() {
    if (!running || socket) return;
    if ((global.navigator && global.navigator.onLine === false) || typeof global.WebSocket !== 'function') { reason = 'Network unavailable; local play continues'; emit(); return; }
    connecting = true; reason = 'Connecting to public grid'; emit();
    var next; try { next = new global.WebSocket(ENDPOINT); } catch (_) { disconnect('Grid unavailable; local play continues'); return; }
    socket = next;
    next.onopen = function () {
      if (socket !== next || !running) return;
      joinRef = String(++ref);
      try { next.send(JSON.stringify({ topic: TOPIC, event: 'phx_join', ref: joinRef, join_ref: joinRef,
        payload: { config: { broadcast: { self: false, ack: false }, presence: { enabled: true, key: sessionId }, postgres_changes: [], private: false } } })); }
      catch (_) { disconnect('Could not join public grid'); }
    };
    next.onmessage = function (message) { if (socket === next) receive(message); };
    next.onclose = next.onerror = function () { if (socket === next) disconnect('Grid disconnected; local play continues'); };
    connectionTimer = global.setTimeout(function () { if (running && socket === next && !subscribed) disconnect('Grid connection timed out; local play continues'); }, 10000);
  }
  function publishPosition(snapshot) {
    if (!running) return;
    position = coordinates(snapshot); pendingPosition = true;
  }
  function start(nextProfile) {
    profile = identity(nextProfile);
    if (running) { track(); localSend('state'); emit(); return status(); }
    running = true; sessionId = newId(); position = coordinates(nextProfile); pendingPosition = false;
    openLocal(); connect();
    timers.push(global.setInterval(function () {
      if (!pendingPosition) return;
      pendingPosition = false; localSend('state');
      if (subscribed) send('broadcast', { type: 'broadcast', event: 'position', payload: me() });
    }, POSITION_MS));
    timers.push(global.setInterval(function () { localSend('state'); prune(); }, 5000));
    timers.push(global.setInterval(track, 15000));
    timers.push(global.setInterval(function () {
      if (!subscribed) return;
      if (heartbeatRef) { disconnect('Grid heartbeat timed out; local play continues'); return; }
      heartbeatRef = send('heartbeat', {}, 'phoenix');
    }, 20000));
    emit(); return status();
  }
  function stop() {
    running = false; localSend('leave');
    if (subscribed) send('phx_leave', {});
    if (retry) global.clearTimeout(retry); retry = null;
    timers.forEach(global.clearInterval); timers = [];
    if (local) { try { local.close(); } catch (_) {} local = null; }
    disconnect('Not connected'); localPeers.clear(); emit();
  }
  var api = { start: start, stop: stop, status: status, peers: peers, me: function () { return copy(me()); }, onChange: onChange, publishPosition: publishPosition };
  global.__cwAscensionNet = api;
  // Compatibility for the old world renderer. No old account or cloud-save API
  // is replaced, and this adapter cannot award or accept competitive progress.
  if (!global.__cwNet) global.__cwNet = {
    roster: roster, onRoster: function (fn) { if (typeof fn === 'function') { rosterListeners.push(fn); fn(roster()); } },
    me: api.me, online: function () { return subscribed; }, status: status,
    state: function () { return { me: api.me(), online: subscribed, roster: roster().length, mode: status().mode }; },
    positions: function () { var map = {}; peers().forEach(function (peer) { map[peer.sessionId] = peer; }); return map; },
    onChat: function () {}, open: function () {}, close: function () {}
  };
  if (global.addEventListener) {
    global.addEventListener('offline', function () { if (running) disconnect('Offline; local play continues'); });
    global.addEventListener('online', function () { if (running) { if (retry) global.clearTimeout(retry); retry = null; connect(); } });
    global.addEventListener('pagehide', stop);
  }
})(window);
