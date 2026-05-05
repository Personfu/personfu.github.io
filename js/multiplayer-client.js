/* ============================================================
   FURIOS-INT // CYBERWORLD MULTIPLAYER CLIENT  v2.0
   ------------------------------------------------------------
   Senior-grade transport layer for the CyberWorld MMORPG /
   campaign synchronization service.

   FEATURES
   - AbortController-backed per-request timeouts (default 12s)
   - Exponential backoff with full jitter (network + 5xx retry)
   - 401 auto-refresh hook with single-flight de-duplication
   - In-flight request coalescing for idempotent GETs
   - Offline write queue (replays POSTs when navigator.onLine
     transitions back to true)
   - Typed event bus: 'online' / 'offline' / 'auth' / 'error'
   - Strict CSP (no eval / no inline) + structured error objects
   - Zero external deps; framework-agnostic (works in Phaser,
     vanilla pages, or service-worker context)

   PUBLIC API   (window.CyberworldMP)
     getApiBase() / setApiBase(url)
     getToken()   / setToken(token)
     clearAuth()
     isOnline()
     request(path, opts)            -> Promise<json>
     register({email, password, displayName})
     login({email, password})
     logout()
     me()
     gate(chapter)
     getProgress()
     saveProgress(payload)          // queued offline
     createCheckout()
     activateBasicMock()
     worldState()
     subscribe(event, handler)      -> off()
     drainQueue()                   // manual flush
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- configuration ---------- */
  var TOKEN_KEY      = 'cyberworld-auth-token';
  var REFRESH_KEY    = 'cyberworld-refresh-token';
  var API_KEY        = 'cyberworld-api-base';
  var QUEUE_KEY      = 'cyberworld-write-queue.v1';
  var PRODUCTION_API = 'https://personfugithubio-production.up.railway.app';
  var DEFAULT_TIMEOUT_MS = 12000;
  var MAX_RETRIES        = 3;
  var BASE_BACKOFF_MS    = 400;
  var MAX_BACKOFF_MS     = 4000;

  function trimBase(base) { return String(base || '').replace(/\/+$/, ''); }
  function isBrowser() { return typeof window !== 'undefined'; }

  /* ---------- event bus ---------- */
  var listeners = Object.create(null);
  function subscribe(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function off() { listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; }); };
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (_) {}
    });
  }

  /* ---------- API base resolution ---------- */
  function readConfiguredBase() {
    if (!isBrowser()) return PRODUCTION_API;
    try {
      var stored = localStorage.getItem(API_KEY);
      if (stored) return trimBase(stored);
    } catch (_) {}

    try {
      var query = new URLSearchParams(window.location.search).get('api');
      if (query) return trimBase(query);
    } catch (_) {}

    if (window.CYBERWORLD_MULTIPLAYER_API) return trimBase(window.CYBERWORLD_MULTIPLAYER_API);

    var meta = document.querySelector('meta[name="cyberworld-api-base"]');
    if (meta && meta.content) return trimBase(meta.content);

    if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
      return 'http://localhost:8787';
    }
    return PRODUCTION_API;
  }
  var DEFAULT_API_BASE = readConfiguredBase();

  function getApiBase() {
    try { return trimBase(localStorage.getItem(API_KEY) || DEFAULT_API_BASE); }
    catch (_) { return DEFAULT_API_BASE; }
  }
  function setApiBase(base) {
    if (!base) return;
    try { localStorage.setItem(API_KEY, trimBase(base)); } catch (_) {}
  }

  /* ---------- token management ---------- */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
  }
  function setToken(token) {
    try {
      if (!token) { localStorage.removeItem(TOKEN_KEY); }
      else        { localStorage.setItem(TOKEN_KEY, token); }
    } catch (_) {}
    emit('auth', { token: token || null });
  }
  function getRefresh() {
    try { return localStorage.getItem(REFRESH_KEY) || ''; } catch (_) { return ''; }
  }
  function setRefresh(t) {
    try {
      if (!t) localStorage.removeItem(REFRESH_KEY);
      else    localStorage.setItem(REFRESH_KEY, t);
    } catch (_) {}
  }
  function clearAuth() { setToken(''); setRefresh(''); }

  /* ---------- online state ---------- */
  function isOnline() {
    if (!isBrowser()) return true;
    return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  }
  if (isBrowser()) {
    window.addEventListener('online',  function () { emit('online', {}); drainQueue(); });
    window.addEventListener('offline', function () { emit('offline', {}); });
  }

  /* ---------- write queue ---------- */
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50))); } catch (_) {}
  }
  function enqueue(item) {
    var q = loadQueue();
    q.push(item);
    saveQueue(q);
  }
  var draining = false;
  function drainQueue() {
    if (draining) return Promise.resolve();
    if (!isOnline()) return Promise.resolve();
    var q = loadQueue();
    if (!q.length) return Promise.resolve();
    draining = true;
    var head = q.shift();
    saveQueue(q);
    return rawRequest(head.path, head.opts).catch(function () {})
      .then(function () {
        draining = false;
        if (loadQueue().length) return drainQueue();
      });
  }

  /* ---------- 401 single-flight refresh ---------- */
  var refreshing = null;
  function tryRefresh() {
    if (refreshing) return refreshing;
    var rt = getRefresh();
    if (!rt) return Promise.reject(new Error('no_refresh_token'));
    refreshing = rawRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: rt },
      _skipAuthRetry: true
    }).then(function (json) {
      if (json.token) setToken(json.token);
      if (json.refreshToken) setRefresh(json.refreshToken);
      refreshing = null;
      return json.token;
    }).catch(function (err) {
      refreshing = null;
      throw err;
    });
    return refreshing;
  }

  /* ---------- backoff with jitter ---------- */
  function backoffMs(attempt) {
    var exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempt));
    return Math.floor(Math.random() * exp); // full jitter
  }

  /* ---------- in-flight GET coalescing ---------- */
  var inflightGets = Object.create(null);

  /* ---------- low-level request ---------- */
  function rawRequest(path, options) {
    var opts = options || {};
    var method = (opts.method || 'GET').toUpperCase();
    var key    = method + ' ' + path + ' ' + (opts.body ? JSON.stringify(opts.body) : '');

    // Coalesce identical concurrent GETs
    if (method === 'GET' && inflightGets[key]) return inflightGets[key];

    var headers = Object.assign({}, opts.headers || {});
    var token = getToken();
    if (token && !opts._skipAuth) headers.Authorization = 'Bearer ' + token;
    if (!headers['Content-Type'] && opts.body && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    var ctrl = isBrowser() && typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;

    var fetchOpts = {
      method: method,
      headers: headers,
      body: (opts.body && typeof opts.body === 'object') ? JSON.stringify(opts.body) : opts.body,
      signal: ctrl ? ctrl.signal : undefined,
      credentials: opts.credentials || 'omit'
    };

    var attempt = opts._attempt || 0;
    var p = fetch(getApiBase() + path, fetchOpts)
      .then(function (resp) {
        if (timer) clearTimeout(timer);
        return resp.json().catch(function () { return {}; }).then(function (json) {
          if (resp.ok) return json;

          var err = new Error(json.error || ('request_failed_' + resp.status));
          err.status  = resp.status;
          err.payload = json;

          // 401 handling — try refresh once
          if (resp.status === 401 && !opts._skipAuthRetry && getRefresh()) {
            return tryRefresh().then(function () {
              var retryOpts = Object.assign({}, opts, { _skipAuthRetry: true, _attempt: 0 });
              return rawRequest(path, retryOpts);
            }).catch(function () { clearAuth(); throw err; });
          }
          // 429 / 5xx → retry with backoff
          if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES) {
            return new Promise(function (resolve) {
              setTimeout(function () {
                resolve(rawRequest(path, Object.assign({}, opts, { _attempt: attempt + 1 })));
              }, backoffMs(attempt));
            });
          }
          throw err;
        });
      })
      .catch(function (error) {
        if (timer) clearTimeout(timer);
        if (error && error.status) throw error;

        var aborted = error && error.name === 'AbortError';
        var net = new Error(aborted ? 'request_timeout' : 'network_unreachable');
        net.status  = 0;
        net.payload = { error: error && error.message ? error.message : 'Network request failed' };
        emit('error', { path: path, error: net });

        if (attempt < MAX_RETRIES && isOnline()) {
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve(rawRequest(path, Object.assign({}, opts, { _attempt: attempt + 1 })));
            }, backoffMs(attempt));
          });
        }
        throw net;
      });

    if (method === 'GET') {
      inflightGets[key] = p;
      p.then(function () { delete inflightGets[key]; }, function () { delete inflightGets[key]; });
    }
    return p;
  }

  /* ---------- queued request (offline-tolerant for writes) ---------- */
  function queuedRequest(path, opts) {
    var method = (opts && opts.method) || 'GET';
    if (method !== 'GET' && !isOnline()) {
      enqueue({ path: path, opts: opts });
      return Promise.resolve({ queued: true });
    }
    var p = rawRequest(path, opts);
    if (method !== 'GET') p.then(drainQueue).catch(function () {});
    return p;
  }

  /* ---------- public endpoints ---------- */
  function register(arg, password, displayName) {
    var body = typeof arg === 'object'
      ? arg
      : { email: arg, password: password, displayName: displayName };
    return rawRequest('/api/auth/register', { method: 'POST', body: body })
      .then(function (r) {
        if (r.token) setToken(r.token);
        if (r.refreshToken) setRefresh(r.refreshToken);
        return r;
      });
  }
  function login(arg, password) {
    var body = typeof arg === 'object' ? arg : { email: arg, password: password };
    return rawRequest('/api/auth/login', { method: 'POST', body: body })
      .then(function (r) {
        if (r.token) setToken(r.token);
        if (r.refreshToken) setRefresh(r.refreshToken);
        return r;
      });
  }
  function logout() {
    var t = getToken();
    if (!t) return Promise.resolve({ ok: true });
    return rawRequest('/api/auth/logout', { method: 'POST', body: {} })
      .catch(function () { /* swallow — logout must always succeed locally */ })
      .then(function () { clearAuth(); return { ok: true }; });
  }
  function me()         { return rawRequest('/api/auth/me'); }
  function gate(ch)     { return rawRequest('/api/gate?chapter=' + Number(ch || 1)); }
  function getProgress(){ return rawRequest('/api/progress'); }
  function saveProgress(payload) {
    return queuedRequest('/api/progress', { method: 'POST', body: payload || {} });
  }
  function createCheckout() {
    return rawRequest('/api/subscription/create-checkout', { method: 'POST' })
      .then(function (r) {
        if (r.checkoutUrl && r.mode !== 'mock' && isBrowser()) window.location.href = r.checkoutUrl;
        return r;
      });
  }
  function activateBasicMock() { return rawRequest('/api/subscription/activate-basic', { method: 'POST' }); }
  function worldState()        { return rawRequest('/api/world/state'); }

  /* ---------- expose ---------- */
  global.CyberworldMP = {
    getApiBase: getApiBase, setApiBase: setApiBase,
    getToken:   getToken,   setToken:   setToken,
    clearAuth:  clearAuth,
    isOnline:   isOnline,
    request:    rawRequest,
    register:   register,
    login:      login,
    logout:     logout,
    me:         me,
    gate:       gate,
    getProgress:    getProgress,
    saveProgress:   saveProgress,
    createCheckout: createCheckout,
    activateBasicMock: activateBasicMock,
    worldState:  worldState,
    subscribe:   subscribe,
    drainQueue:  drainQueue
  };

  // Best-effort drain on load
  if (isBrowser()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { drainQueue(); });
    } else {
      drainQueue();
    }
  }
})(typeof window !== 'undefined' ? window : this);
