(function () {
  'use strict';

  var TOKEN_KEY = 'cyberworld-auth-token';
  var API_KEY = 'cyberworld-api-base';

  function trimBase(base) {
    return String(base || '').replace(/\/$/, '');
  }

  function readConfiguredBase() {
    var stored = localStorage.getItem(API_KEY);
    if (stored) return trimBase(stored);

    var query = new URLSearchParams(window.location.search).get('api');
    if (query) return trimBase(query);

    if (window.CYBERWORLD_MULTIPLAYER_API) {
      return trimBase(window.CYBERWORLD_MULTIPLAYER_API);
    }

    var meta = document.querySelector('meta[name="cyberworld-api-base"]');
    if (meta && meta.content) return trimBase(meta.content);

    if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
      return 'http://localhost:8787';
    }

    return trimBase(window.location.origin);
  }

  var DEFAULT_API_BASE = readConfiguredBase();

  function getApiBase() {
    return trimBase(localStorage.getItem(API_KEY) || DEFAULT_API_BASE);
  }

  function setApiBase(base) {
    if (!base) return;
    localStorage.setItem(API_KEY, trimBase(base));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  }

  function request(path, options) {
    var opts = options || {};
    var headers = opts.headers || {};
    var token = getToken();
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }
    if (!headers['Content-Type'] && opts.body && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    var fetchOptions = {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body && typeof opts.body === 'object' ? JSON.stringify(opts.body) : opts.body
    };

    return fetch(getApiBase() + path, fetchOptions)
      .catch(function (error) {
        var networkError = new Error('Unable to reach multiplayer service at ' + getApiBase() + '.');
        networkError.status = 0;
        networkError.payload = { error: error && error.message ? error.message : 'Network request failed' };
        throw networkError;
      })
      .then(function (resp) {
        return resp.json().catch(function () { return {}; }).then(function (json) {
          if (!resp.ok) {
            var err = new Error(json.error || ('Request failed: ' + resp.status));
            err.status = resp.status;
            err.payload = json;
            throw err;
          }
          return json;
        });
      });
  }

  function register(email, password, displayName) {
    return request('/api/auth/register', {
      method: 'POST',
      body: { email: email, password: password, displayName: displayName }
    }).then(function (result) {
      if (result.token) setToken(result.token);
      return result;
    });
  }

  function login(email, password) {
    return request('/api/auth/login', {
      method: 'POST',
      body: { email: email, password: password }
    }).then(function (result) {
      if (result.token) setToken(result.token);
      return result;
    });
  }

  function me() {
    return request('/api/auth/me', { method: 'GET' });
  }

  function gate(chapter) {
    return request('/api/gate?chapter=' + Number(chapter || 1), { method: 'GET' });
  }

  function getProgress() {
    return request('/api/progress', { method: 'GET' });
  }

  function saveProgress(payload) {
    return request('/api/progress', { method: 'POST', body: payload || {} });
  }

  function createCheckout() {
    return request('/api/subscription/create-checkout', { method: 'POST' });
  }

  function activateBasicMock() {
    return request('/api/subscription/activate-basic', { method: 'POST' });
  }

  function worldState() {
    return request('/api/world/state', { method: 'GET' });
  }

  window.CyberworldMP = {
    getApiBase: getApiBase,
    setApiBase: setApiBase,
    getToken: getToken,
    setToken: setToken,
    request: request,
    register: register,
    login: login,
    me: me,
    gate: gate,
    getProgress: getProgress,
    saveProgress: saveProgress,
    createCheckout: createCheckout,
    activateBasicMock: activateBasicMock,
    worldState: worldState
  };
})();
