/* Shared internal authoring checks. Drafts never execute in the public game. */
(function (root, factory) {
  var validate = factory();
  if (typeof module === 'object' && module.exports) module.exports = validate;
  else root.validateCyberWorldContent = validate;
}(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  var kinds = ['packets','artifact','dns','crypto','bounds','supply','finale'];
  function plain(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function text(value, min, max) { return typeof value === 'string' && value.trim().length >= min && value.length <= max; }
  return function validate(data) {
    var errors = [], ids = new Set(), codexIds = new Set(), rewards = new Set();
    if (!plain(data) || !Number.isInteger(data.version) || !Array.isArray(data.missions) || !Array.isArray(data.codex)) return ['Use a versioned content object with missions[] and codex[].'];
    if (data.missions.length < 1 || data.missions.length > 500) errors.push('A content pack needs 1–500 authored missions.');
    data.codex.forEach(function (entry, index) {
      if (!plain(entry) || !text(entry.id,1,100) || codexIds.has(entry.id) || !text(entry.title,3,160) || !text(entry.text,30,12000)) errors.push('Codex entry ' + index + ' needs a unique id, title and substantive text.');
      if (entry) codexIds.add(entry.id);
    });
    data.missions.forEach(function (m,index) {
      var label = 'Mission ' + (m && m.id || index) + ': ';
      if (!plain(m)) { errors.push(label + 'must be an object.'); return; }
      if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(m.id) || ids.has(m.id)) errors.push(label + 'id must be unique and stable.'); ids.add(m.id);
      ['title','skill','npc'].forEach(function (key) { if (!text(m[key],3,200)) errors.push(label + 'missing ' + key + '.'); });
      ['brief','objective','debrief','defense'].forEach(function (key) { if (!text(m[key],30,12000)) errors.push(label + key + ' needs specific authored content.'); });
      if (!kinds.includes(m.kind)) errors.push(label + 'unregistered validator kind; no executable quest code is allowed.');
      if (!Array.isArray(m.hints) || m.hints.length !== 3 || m.hints.some(function (hint) { return !text(hint,15,1500); })) errors.push(label + 'needs three graduated hints.');
      if (!Array.isArray(m.codex) || !m.codex.length || m.codex.some(function (id) { return !codexIds.has(id); })) errors.push(label + 'has an unknown or missing Codex reference.');
      if (!plain(m.reward) || !Number.isInteger(m.reward.xp) || m.reward.xp < 0 || m.reward.xp > 5000 || !Number.isInteger(m.reward.credits) || m.reward.credits < 0 || m.reward.credits > 5000) errors.push(label + 'rewards must be bounded whole numbers.');
      if (m.reward && m.reward.item) { if (!/^[A-Z0-9][A-Z0-9-]{1,79}$/.test(m.reward.item) || rewards.has(m.reward.item)) errors.push(label + 'reward module must be a unique stable item.'); rewards.add(m.reward.item); }
      if (m.kind === 'packets' && (!Array.isArray(m.packets) || m.packets.length < 3 || m.packets.length > 100 || !text(m.log,10,12000))) errors.push(label + 'needs packet evidence and a corroborating log.');
      if (m.kind === 'artifact' && (!text(m.before,15,16000) || !text(m.after,15,16000))) errors.push(label + 'needs before/after artifacts.');
      if (m.kind === 'dns' && (!Array.isArray(m.records) || m.records.length < 2)) errors.push(label + 'needs timestamped records.');
      if (m.kind === 'crypto' && (!text(m.plain1,1,500) || !/^(?:[a-f0-9]{2})+$/i.test(m.cipher1) || !/^(?:[a-f0-9]{2})+$/i.test(m.cipher2) || m.cipher1.length !== m.cipher2.length || m.cipher1.length !== m.plain1.length * 2)) errors.push(label + 'known plaintext and ciphertext byte lengths must agree.');
      if (m.kind === 'supply' && (!text(m.sourceArtifact,1,20000) || !text(m.customerArtifact,1,20000) || m.sourceArtifact === m.customerArtifact)) errors.push(label + 'needs distinct preserved source/customer artifacts.');
      if (m.kind === 'finale' && (!Array.isArray(m.evidence) || m.evidence.length < 3)) errors.push(label + 'needs a reconstructable event chain.');
    });
    return errors;
  };
}));
