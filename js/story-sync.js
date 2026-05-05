(function () {
  'use strict';

  function setText(selector, value) {
    if (value === undefined || value === null) return;
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (node) {
      node.textContent = String(value);
    });
  }

  function setList(selector, values, formatter) {
    var nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;
    nodes.forEach(function (node) {
      node.innerHTML = '';
      (values || []).forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = formatter ? formatter(item) : String(item);
        node.appendChild(li);
      });
    });
  }

  function joinTicker(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return items.join(' | ');
  }

  function buildIntelAdversaryLine(adversaries) {
    if (!Array.isArray(adversaries) || !adversaries.length) return '';
    var names = adversaries.map(function (a) { return a.name; }).join(', ');
    return 'ACTIVE STARSHIELD ADVERSARIES: ' + names;
  }

  function buildIntelMissionImpact(adversaries) {
    if (!Array.isArray(adversaries) || !adversaries.length) return '';
    var lines = adversaries.map(function (item) {
      var nodes = Array.isArray(item.affectedMissionNodes) ? item.affectedMissionNodes.join(', ') : 'unknown nodes';
      return item.name + ' -> ' + nodes;
    });
    return 'MISSION NODE IMPACT: ' + lines.join(' | ');
  }

  function renderListCards(selector, items) {
    var nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;

    nodes.forEach(function (node) {
      node.innerHTML = '';
      (items || []).forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        node.appendChild(li);
      });
    });
  }

  function renderIndexSupport(context) {
    var factions = Array.isArray(context.factions) ? context.factions : [];
    var locations = Array.isArray(context.locations) ? context.locations : [];
    var adversaries = Array.isArray(context.adversaries) ? context.adversaries : [];

    renderListCards('[data-story="faction-cards"]', factions.slice(0, 3).map(function (faction) {
      return faction.name + ': ' + faction.role;
    }));

    renderListCards('[data-story="route-cards"]', locations.slice(0, 4).map(function (location) {
      return location.name + ' -> ' + location.associatedCampaignMission + ' [' + location.riskLevel + ']';
    }));

    renderListCards('[data-story="critical-sectors"]', adversaries.slice(0, 4).map(function (adversary) {
      return adversary.name + ': ' + adversary.preferredAttackSurface;
    }));
  }

  function renderIntelWatch(context) {
    var grids = document.querySelectorAll('[data-story="intel-watch-grid"]');
    if (!grids.length) return;

    grids.forEach(function (grid) {
      grid.innerHTML = '';
      (context.adversaries || []).forEach(function (adversary) {
        var card = document.createElement('article');
        card.className = 'watch-card';

        var title = document.createElement('div');
        title.className = 'watch-title';
        title.textContent = adversary.name + ' [' + String(adversary.priority || 'tracked').toUpperCase() + ']';
        card.appendChild(title);

        [
          ['Sector Activity', adversary.preferredAttackSurface],
          ['Mission Nodes', (adversary.affectedMissionNodes || []).join(', ')],
          ['Recommended Tools', (adversary.recommendedTools || []).join(', ')],
          ['ATT&CK', (adversary.attackBehavior || []).join(', ')],
          ['Related CVEs', (adversary.relatedCVEs || []).join(', ')]
        ].forEach(function (line) {
          var row = document.createElement('div');
          row.className = 'watch-line';
          row.innerHTML = '<strong>' + line[0] + ':</strong> ' + (line[1] || 'None logged');
          card.appendChild(row);
        });

        grid.appendChild(card);
      });
    });
  }

  function renderAdversaryRegistry(context) {
    var registries = document.querySelectorAll('[data-story="adversary-registry"]');
    if (!registries.length) return;

    var solved = context.runtime && typeof context.runtime.nodesSolved === 'number'
      ? context.runtime.nodesSolved
      : 0;

    registries.forEach(function (registry) {
      registry.innerHTML = '';
      (context.adversaries || []).forEach(function (adversary, index) {
        var card = document.createElement('article');
        card.className = 'registry-card';

        var title = document.createElement('h3');
        title.textContent = adversary.name;
        card.appendChild(title);

        [
          ['First Seen', adversary.firstSeen],
          ['Alignment', adversary.factionAlignment],
          ['Attack Surface', adversary.preferredAttackSurface],
          ['Campaign Appearances', (adversary.campaignAppearances || []).join(', ')],
          ['Known Weaknesses', adversary.knownWeaknesses],
          ['Discovered by Player', solved > index ? 'YES' : 'NO']
        ].forEach(function (line) {
          var row = document.createElement('div');
          row.className = 'registry-line';
          row.innerHTML = '<strong>' + line[0] + ':</strong> ' + (line[1] || 'Unknown');
          card.appendChild(row);
        });

        registry.appendChild(card);
      });
    });
  }

  function applyStory(context) {
    var op = context.operation || {};
    var pageKey = document.body.getAttribute('data-story-page') || '';
    var role = (window.StoryEngine && window.StoryEngine.getPageRole(pageKey, '')) || '';

    setText('[data-story="operation-name"]', op.name);
    setText('[data-story="campaign-chapter"]', op.chapter);
    setText('[data-story="threat-level"]', op.threatLevel);
    setText('[data-story="primary-objective"]', op.primaryObjective);
    setText('[data-story="launch-status"]', op.launchStatus);
    setText('[data-story="campaign-brief"]', op.brief);
    setText('[data-story="ticker"]', joinTicker(op.ticker || []));
    setText('[data-story="page-role"]', role);
    setText('[data-story="current-chapter-title"]', context.currentChapterTitle || op.chapter || 'Signal Drift');
    setText('[data-story="current-threat-state"]', context.currentThreatState || 'Threat feed syncing...');
    setText('[data-story="current-mission-objective"]', context.currentMissionObjective || op.primaryObjective || 'Objective syncing...');
    setText('[data-story="faction-reputation-effects"]', context.factionReputationEffects || 'Faction effects syncing...');

    var metrics = context.launchMetrics || {};
    setText('[data-story="launch-window"]', metrics.launchWindow || op.launchStatus || 'T-UNKNOWN');
    setText('[data-story="uplink-integrity"]', (metrics.uplinkIntegrity !== undefined ? metrics.uplinkIntegrity : 0) + '%');
    setText('[data-story="relay-trust"]', (metrics.relayTrust !== undefined ? metrics.relayTrust : 0) + '%');
    setText('[data-story="adversary-pressure"]', (metrics.adversaryPressure !== undefined ? metrics.adversaryPressure : 0) + '%');

    setList('[data-story="world-events"]', context.worldEvents || []);

    var solved = context.runtime && typeof context.runtime.nodesSolved === 'number'
      ? context.runtime.nodesSolved
      : 0;
    setText('[data-story="nodes-solved"]', solved);

    if (document.body.getAttribute('data-story-page') === 'intel') {
      setText('[data-story="intel-adversaries"]', buildIntelAdversaryLine(context.adversaries));
      setText('[data-story="intel-mission-impact"]', buildIntelMissionImpact(context.adversaries));
    }

    if (document.body.getAttribute('data-story-page') === 'adversaries') {
      var discovery = solved > 0
        ? 'DISCOVERED_BY_PLAYER: ' + solved + ' nodes cleared in current operation.'
        : 'DISCOVERED_BY_PLAYER: Awaiting first node clear.';
      setText('[data-story="adversary-discovery"]', discovery);
    }

    if (document.body.getAttribute('data-story-page') === 'index') {
      renderIndexSupport(context);
    }

    if (document.body.getAttribute('data-story-page') === 'intel') {
      renderIntelWatch(context);
    }

    if (document.body.getAttribute('data-story-page') === 'adversaries') {
      renderAdversaryRegistry(context);
    }
  }

  function initStorySync() {
    if (!window.StoryEngine || typeof window.StoryEngine.load !== 'function') {
      return;
    }
    window.StoryEngine.load().then(function (context) {
      applyStory(context);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStorySync);
  } else {
    initStorySync();
  }
})();
