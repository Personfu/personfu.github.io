/* ============================================================
   FURIOS-INT // STORY SYNC  v2.0  ::  Personfu  ::  2026
   ------------------------------------------------------------
   Renders the Operation Starshield campaign context onto every
   page tagged with data-story-* attributes.

   SECURITY HARDENING (v2)
   - Removed every innerHTML assignment that took JSON-sourced
     strings.  All fields are now written via textContent /
     element constructors, eliminating reflected-XSS hazards
     even if data/*.json is ever tampered with locally.
   - Robust against missing fields / malformed input.
   - O(1) DOM clearing via replaceChildren() (with fallback).
   - All accessors are null-safe; nothing throws on partial data.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  function $$ (sel, root) { return (root || document).querySelectorAll(sel); }

  function clear(node) {
    if (!node) return;
    if (typeof node.replaceChildren === 'function') node.replaceChildren();
    else { while (node.firstChild) node.removeChild(node.firstChild); }
  }

  function setText(selector, value) {
    if (value === undefined || value === null) return;
    $$(selector).forEach(function (node) { node.textContent = String(value); });
  }

  function setList(selector, values, formatter) {
    var nodes = $$(selector);
    if (!nodes.length) return;
    nodes.forEach(function (node) {
      clear(node);
      (values || []).forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = formatter ? formatter(item) : String(item);
        node.appendChild(li);
      });
    });
  }

  function appendField(parent, label, value, cls) {
    var row = document.createElement('div');
    row.className = cls || 'registry-line';
    var strong = document.createElement('strong');
    strong.textContent = label + ':';
    row.appendChild(strong);
    row.appendChild(document.createTextNode(' ' + (value || 'Unknown')));
    parent.appendChild(row);
    return row;
  }

  /* ---------- intel feed builders ---------- */
  function joinTicker(items) {
    return Array.isArray(items) && items.length ? items.join(' | ') : '';
  }
  function buildIntelAdversaryLine(adversaries) {
    if (!Array.isArray(adversaries) || !adversaries.length) return '';
    return 'ACTIVE STARSHIELD ADVERSARIES: ' + adversaries.map(function (a) { return a.name; }).join(', ');
  }
  function buildIntelMissionImpact(adversaries) {
    if (!Array.isArray(adversaries) || !adversaries.length) return '';
    var lines = adversaries.map(function (item) {
      var nodes = Array.isArray(item.affectedMissionNodes) ? item.affectedMissionNodes.join(', ') : 'unknown nodes';
      return item.name + ' -> ' + nodes;
    });
    return 'MISSION NODE IMPACT: ' + lines.join(' | ');
  }

  /* ---------- card renderers (DOM-safe) ---------- */
  function renderListCards(selector, items) {
    var nodes = $$(selector);
    if (!nodes.length) return;
    nodes.forEach(function (node) {
      clear(node);
      (items || []).forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = String(item == null ? '' : item);
        node.appendChild(li);
      });
    });
  }

  function renderIndexSupport(context) {
    var factions    = Array.isArray(context.factions)    ? context.factions    : [];
    var locations   = Array.isArray(context.locations)   ? context.locations   : [];
    var adversaries = Array.isArray(context.adversaries) ? context.adversaries : [];

    renderListCards('[data-story="faction-cards"]', factions.slice(0, 3).map(function (f) {
      return f.name + ': ' + f.role;
    }));
    renderListCards('[data-story="route-cards"]', locations.slice(0, 4).map(function (l) {
      return l.name + ' -> ' + l.associatedCampaignMission + ' [' + l.riskLevel + ']';
    }));
    renderListCards('[data-story="critical-sectors"]', adversaries.slice(0, 4).map(function (a) {
      return a.name + ': ' + a.preferredAttackSurface;
    }));
  }

  function renderIntelWatch(context) {
    var grids = $$('[data-story="intel-watch-grid"]');
    if (!grids.length) return;
    grids.forEach(function (grid) {
      clear(grid);
      (context.adversaries || []).forEach(function (a) {
        var card = document.createElement('article');
        card.className = 'watch-card';

        var title = document.createElement('div');
        title.className = 'watch-title';
        title.textContent = a.name + ' [' + String(a.priority || 'tracked').toUpperCase() + ']';
        card.appendChild(title);

        appendField(card, 'Sector Activity',     a.preferredAttackSurface,         'watch-line');
        appendField(card, 'Mission Nodes',       (a.affectedMissionNodes || []).join(', ') || 'None logged', 'watch-line');
        appendField(card, 'Recommended Tools',   (a.recommendedTools     || []).join(', ') || 'None logged', 'watch-line');
        appendField(card, 'ATT&CK',              (a.attackBehavior       || []).join(', ') || 'None logged', 'watch-line');
        appendField(card, 'Related CVEs',        (a.relatedCVEs          || []).join(', ') || 'None logged', 'watch-line');

        grid.appendChild(card);
      });
    });
  }

  function renderAdversaryRegistry(context) {
    var registries = $$('[data-story="adversary-registry"]');
    if (!registries.length) return;
    var solved = (context.runtime && typeof context.runtime.nodesSolved === 'number')
      ? context.runtime.nodesSolved
      : 0;

    registries.forEach(function (registry) {
      clear(registry);
      (context.adversaries || []).forEach(function (a, idx) {
        var card = document.createElement('article');
        card.className = 'registry-card';

        var title = document.createElement('h3');
        title.textContent = a.name;
        card.appendChild(title);

        appendField(card, 'First Seen',            a.firstSeen);
        appendField(card, 'Alignment',             a.factionAlignment);
        appendField(card, 'Attack Surface',        a.preferredAttackSurface);
        appendField(card, 'Campaign Appearances', (a.campaignAppearances || []).join(', ') || 'Unknown');
        appendField(card, 'Known Weaknesses',      a.knownWeaknesses);
        appendField(card, 'Discovered by Player',  solved > idx ? 'YES' : 'NO');

        registry.appendChild(card);
      });
    });
  }

  /* ---------- top-level apply ---------- */
  function applyStory(context) {
    var op      = context.operation || {};
    var pageKey = (document.body && document.body.getAttribute('data-story-page')) || '';
    var role    = (window.StoryEngine && typeof window.StoryEngine.getPageRole === 'function')
      ? window.StoryEngine.getPageRole(pageKey, '')
      : '';

    setText('[data-story="operation-name"]',         op.name);
    setText('[data-story="campaign-chapter"]',       op.chapter);
    setText('[data-story="threat-level"]',           op.threatLevel);
    setText('[data-story="primary-objective"]',      op.primaryObjective);
    setText('[data-story="launch-status"]',          op.launchStatus);
    setText('[data-story="campaign-brief"]',         op.brief);
    setText('[data-story="ticker"]',                 joinTicker(op.ticker || []));
    setText('[data-story="page-role"]',              role);
    setText('[data-story="current-chapter-title"]',  context.currentChapterTitle || op.chapter || 'Signal Drift');
    setText('[data-story="current-threat-state"]',   context.currentThreatState  || 'Threat feed syncing...');
    setText('[data-story="current-mission-objective"]', context.currentMissionObjective || op.primaryObjective || 'Objective syncing...');
    setText('[data-story="faction-reputation-effects"]', context.factionReputationEffects || 'Faction effects syncing...');

    var metrics = context.launchMetrics || {};
    setText('[data-story="launch-window"]',     metrics.launchWindow || op.launchStatus || 'T-UNKNOWN');
    setText('[data-story="uplink-integrity"]',  (metrics.uplinkIntegrity     !== undefined ? metrics.uplinkIntegrity     : 0) + '%');
    setText('[data-story="relay-trust"]',       (metrics.relayTrust          !== undefined ? metrics.relayTrust          : 0) + '%');
    setText('[data-story="adversary-pressure"]',(metrics.adversaryPressure   !== undefined ? metrics.adversaryPressure   : 0) + '%');

    setList('[data-story="world-events"]', context.worldEvents || []);

    var solved = (context.runtime && typeof context.runtime.nodesSolved === 'number')
      ? context.runtime.nodesSolved
      : 0;
    setText('[data-story="nodes-solved"]', solved);

    if (pageKey === 'intel') {
      setText('[data-story="intel-adversaries"]',      buildIntelAdversaryLine(context.adversaries));
      setText('[data-story="intel-mission-impact"]',   buildIntelMissionImpact(context.adversaries));
      renderIntelWatch(context);
    }

    if (pageKey === 'adversaries') {
      var discovery = solved > 0
        ? 'DISCOVERED_BY_PLAYER: ' + solved + ' nodes cleared in current operation.'
        : 'DISCOVERED_BY_PLAYER: Awaiting first node clear.';
      setText('[data-story="adversary-discovery"]', discovery);
      renderAdversaryRegistry(context);
    }

    if (pageKey === 'index') renderIndexSupport(context);
  }

  /* ---------- bootstrap ---------- */
  function initStorySync() {
    if (!window.StoryEngine || typeof window.StoryEngine.load !== 'function') return;
    window.StoryEngine.load().then(applyStory).catch(function () { /* swallow — page renders with defaults */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStorySync);
  } else {
    initStorySync();
  }
})();
