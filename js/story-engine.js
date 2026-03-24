(function () {
  'use strict';

  var STORY_STATE_KEY = 'cyberworld-story-state';
  var CTF_PROGRESS_KEY = 'cyberworld-ctf-progress';

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    Object.keys(source).forEach(function (key) {
      var src = source[key];
      if (Array.isArray(src)) {
        target[key] = src.slice();
        return;
      }
      if (src && typeof src === 'object') {
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = {};
        }
        deepMerge(target[key], src);
        return;
      }
      target[key] = src;
    });
    return target;
  }

  function fetchJson(path) {
    return fetch(path, { cache: 'no-cache' })
      .then(function (resp) {
        if (!resp.ok) {
          throw new Error('Unable to load ' + path + ': ' + resp.status);
        }
        return resp.json();
      })
      .catch(function () {
        return null;
      });
  }

  function deriveStatus(context) {
    var progress = safeJsonParse(localStorage.getItem(CTF_PROGRESS_KEY), null);
    if (!progress) return context;

    var solved = Number(progress.solvedCount || progress.solved || 0);
    if (solved >= 20) {
      context.operation.launchStatus = 'PAYLOAD DELIVERED';
      context.operation.chapter = 'Chapter 4 / Debrief and Reinforcement';
      context.operation.threatLevel = 'ELEVATED';
    } else if (solved >= 12) {
      context.operation.launchStatus = 'FINAL RELAY WINDOW';
      context.operation.chapter = 'Chapter 3 / Launch Chain Defense';
      context.operation.threatLevel = 'HIGH';
    } else if (solved >= 6) {
      context.operation.launchStatus = 'CONVOY IN TRANSIT';
      context.operation.chapter = 'Chapter 2 / Persistence Hunt';
      context.operation.threatLevel = 'SEVERE';
    } else if (solved > 0) {
      context.operation.launchStatus = 'ENTRY RELAY LOCKED';
      context.operation.chapter = 'Chapter 1 / Entry Vector';
      context.operation.threatLevel = 'CRITICAL';
    }

    context.runtime = context.runtime || {};
    context.runtime.nodesSolved = solved;
    return context;
  }

  function createEngine() {
    var base = deepMerge({}, window.StoryData || {});

    function load() {
      var sources = (base && base.dataSources) || {};
      var campaignPath = sources.campaign || 'data/campaign.json';
      var factionsPath = sources.factions || 'data/factions.json';
      var adversariesPath = sources.adversaries || 'data/adversaries.json';
      var locationsPath = sources.locations || 'data/locations.json';

      return Promise.all([
        fetchJson(campaignPath),
        fetchJson(factionsPath),
        fetchJson(adversariesPath),
        fetchJson(locationsPath)
      ]).then(function (parts) {
        var context = deepMerge({}, base);
        if (parts[0]) deepMerge(context, parts[0]);
        if (parts[1]) context.factions = parts[1].factions || [];
        if (parts[2]) context.adversaries = parts[2].adversaries || [];
        if (parts[3]) context.locations = parts[3].locations || [];

        var saved = safeJsonParse(localStorage.getItem(STORY_STATE_KEY), {});
        deepMerge(context, saved);
        return deriveStatus(context);
      });
    }

    function save(partial) {
      var current = safeJsonParse(localStorage.getItem(STORY_STATE_KEY), {});
      var merged = deepMerge(current, partial || {});
      localStorage.setItem(STORY_STATE_KEY, JSON.stringify(merged));
      return merged;
    }

    function getPageRole(pageKey, fallback) {
      var roles = (base && base.pageRoles) || {};
      return roles[pageKey] || fallback || '';
    }

    return {
      load: load,
      save: save,
      getPageRole: getPageRole
    };
  }

  window.StoryEngine = createEngine();
})();
