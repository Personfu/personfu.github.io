(function () {
  'use strict';

  var TOKEN_KEY = 'cyberworld-auth-token';
  var API_KEY = 'cyberworld-api-base';
  var DEFAULT_API_BASE = localStorage.getItem(API_KEY) || 'http://localhost:8787';

  function getApiBase() {
    return (localStorage.getItem(API_KEY) || DEFAULT_API_BASE).replace(/\/$/, '');
  }

  function setApiBase(base) {
    if (!base) return;
    localStorage.setItem(API_KEY, String(base).replace(/\/$/, ''));
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

    return fetch(getApiBase() + path, fetchOptions).then(function (resp) {
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
