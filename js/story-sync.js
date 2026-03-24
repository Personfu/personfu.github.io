(function () {
  'use strict';

  function setText(selector, value) {
    if (value === undefined || value === null) return;
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (node) {
      node.textContent = String(value);
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

    var solved = context.runtime && typeof context.runtime.nodesSolved === 'number'
      ? context.runtime.nodesSolved
      : 0;
    setText('[data-story="nodes-solved"]', solved);

    if (document.body.getAttribute('data-story-page') === 'intel') {
      setText('[data-story="intel-adversaries"]', buildIntelAdversaryLine(context.adversaries));
    }

    if (document.body.getAttribute('data-story-page') === 'adversaries') {
      var discovery = solved > 0
        ? 'DISCOVERED_BY_PLAYER: ' + solved + ' nodes cleared in current operation.'
        : 'DISCOVERED_BY_PLAYER: Awaiting first node clear.';
      setText('[data-story="adversary-discovery"]', discovery);
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
