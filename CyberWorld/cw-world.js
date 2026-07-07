/* THE GRID — CyberWorld's flagship game client.
 *
 * One cohesive, full-screen, living world that unifies everything: a canvas map
 * where you are the CORE and the five Academy skill-domains orbit as sectors you
 * fly into; real other players drift on the grid via Supabase presence; challenges
 * are nodes you breach; XP/level/credits are shown live with juice (particles,
 * floaters, level-up fanfare, screen flash); a synth sound engine (WebAudio, no
 * assets); a CRT-styled HUD; and integrated comms (live global chat).
 *
 * It reuses the Academy engine (challenge content + solving) and the NET layer
 * (presence + chat + cloud sync), replacing the scattered floating docks with a
 * single game. Framework-free, defensive, and it never touches the compiled bundle.
 * Press G to toggle; ESC exits to the desktop. */
(function () {
  'use strict';
  if (window.__cwWorldLoaded) return;
  window.__cwWorldLoaded = true;

  // ------------------------------------------------------------ helpers
  function loadJSON(k, f) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function xpForLevel(L) { return Math.floor(100 * Math.pow(1.35, L - 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rankFor(L) { return L >= 40 ? 'LEGEND' : L >= 30 ? 'PHANTOM' : L >= 22 ? 'ARCHITECT' : L >= 15 ? 'ELITE' : L >= 9 ? 'OPERATIVE' : L >= 4 ? 'AGENT' : 'ROOKIE'; }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var DOMAIN_COLORS = { crypto: '#00ffcc', web: '#ff2bd6', recon: '#4db5ff', forensics: '#ffb454', defense: '#7CFF6B' };
  var PLAZA_HOTSPOTS = [
    { id: 'academy', label: 'ACADEMY', title: 'Hacker Academy', icon: 'A', kind: 'academy', x: 0.18, y: 0.30, w: 230, h: 150, color: '#00ffcc', action: 'district:academy', desc: 'Enter Professor Cipher training hall.' },
    { id: 'field', label: 'FIELD ROUTE', title: 'Field Route Portal', icon: 'F', kind: 'portal', x: 0.50, y: 0.19, w: 230, h: 170, color: '#7CFF6B', action: 'district:field', desc: 'Walk into the live shard convoy staging bay.' },
    { id: 'net', label: 'NET CAFE', title: 'Net Cafe', icon: 'N', kind: 'cafe', x: 0.67, y: 0.29, w: 230, h: 150, color: '#ff2bd6', action: 'district:net', desc: 'Enter chat, roster, ranks, and faction tools.' },
    { id: 'console', label: 'SOC TOWER', title: 'SOC Tower', icon: 'S', kind: 'console', x: 0.32, y: 0.61, w: 220, h: 156, color: '#fcee09', action: 'district:soc', desc: 'Enter blue-team alert triage and mission control.' },
    { id: 'profile', label: 'PLAYER LAB', title: 'Player Lab', icon: 'L', kind: 'profile', x: 0.84, y: 0.49, w: 190, h: 150, color: '#4db5ff', action: 'district:lab', desc: 'Visit your room, badge shelf, tool rack, and dossier.' },
    { id: 'map', label: 'WORLD MAP', title: 'Network Map', icon: 'M', kind: 'gate', x: 0.79, y: 0.70, w: 250, h: 166, color: '#00ffcc', action: 'district:map', desc: 'Open the 11-zone CyberWorld network map.' }
  ];
  var PLAZA_ACTIVITIES = [
    { id: 'daily-cache', label: 'DAILY CACHE', title: 'Daily Cache', icon: '$', x: 0.50, y: 0.82, r: 30, color: '#fcee09', action: 'cache', desc: 'Claim one plaza credit cache per day.' },
    { id: 'emote-pad', label: 'EMOTE PAD', title: 'Signal Pad', icon: '*', x: 0.49, y: 0.52, r: 28, color: '#ff2bd6', action: 'emote', desc: 'Broadcast a visible room emote.' },
    { id: 'mission-board', label: 'MISSION BOARD', title: 'Mission Board', icon: '!', x: 0.60, y: 0.86, r: 27, color: '#ffb454', action: 'district:console', desc: 'Review active operations before launching.' },
    { id: 'relay-cave', label: 'RELAY CAVE', title: 'Dark Relay Cave', icon: 'D', x: 0.38, y: 0.67, r: 29, color: '#7CFF6B', action: 'district:relay', desc: 'Enter the watcher cave staging route.' },
    { id: 'storm-boss', label: 'STORM BOSS', title: 'Stormcore Raid Gate', icon: 'B', x: 0.90, y: 0.86, r: 31, color: '#ff2bd6', action: 'district:storm', desc: 'Inspect Stormcore boss gates and raid routes.' },
    { id: 'help-terminal', label: 'HELP TERMINAL', title: 'Plaza Guide', icon: '?', x: 0.80, y: 0.54, r: 27, color: '#7CFF6B', action: 'guide', desc: 'Get a quick tour of movement, chat, and kiosks.' }
  ];
  var PLAZA_NPCS = [
    { id: 'warden', name: 'Patch Warden', title: 'Route Marshal', x: 0.29, y: 0.31, color: '#ffb454',
      mission: 'mc-convoy',
      lines: [
        { test: 'mission:mc-convoy', text: 'Clean first run. Now the city trusts your routing. The Relay Cave opens when your tier catches up.' },
        { test: 'default', text: 'First contract: route the City Gate Convoy. Shards first, heat second. Every clean route cuts power from the Null Crown.' }
      ] },
    { id: 'mentor', name: 'Byte', title: 'Companion Unit', x: 0.64, y: 0.39, color: '#4db5ff',
      action: 'district:net',
      lines: [
        { test: 'level:4', text: 'You are past the basics. Your lab shelf is going to need more room for badges, tools, and field logs.' },
        { test: 'default', text: 'I am Byte, your chrome companion unit. I track chat, badges, missions, and every terminal worth clicking.' }
      ] },
    { id: 'relay', name: 'Relay Tech', title: 'Cave Scout', x: 0.34, y: 0.61, color: '#00ffcc',
      mission: 'dn-convoy',
      lines: [
        { test: 'mission:dn-convoy', text: 'Black Relay logs are in. Stormcore is the next wall, and it will not fold to button mashing.' },
        { test: 'level:5', text: 'The Relay Cave is live. Watchers hunt in pairs down there; pulse early and keep shield in reserve.' },
        { test: 'default', text: 'The Null Crown nests below the Relay Cave. Clear City Gate, train, then come back when you can survive watcher pairs.' }
      ] },
    { id: 'zero', name: 'Agent Zero', title: 'Onboarding Handler', x: 0.43, y: 0.47, color: '#ff2bd6',
      mission: 'soc-triage',
      lines: [
        { test: 'mission:soc-triage', text: 'Nice triage. Unknown node, repeated failed logins, after midnight: you escalated the right signal and restored the firewall rule.' },
        { test: 'mission:tut-ping', text: 'Your uplink is clean. Come to SOC Tower and triage the unknown-node login alert. No fail state, just evidence and judgment.' },
        { test: 'default', text: 'First prove your gateway ping with Professor Cipher. Then I will hand you the SOC alert drill and the Log Lens.' }
      ] },
    { id: 'cipher', name: 'Professor Cipher', title: 'Threat Architect', x: 0.51, y: 0.48, color: '#fcee09',
      action: 'district:academy',
      lines: [
        { test: 'mission:sc-raid', text: 'The Overseer is wounded. The Null Crown will try to hide behind identity noise and corrupted relays now.' },
        { test: 'mission:dn-cave', text: 'You mapped the cave. Next lesson: Stormcore does not need faster clicks. It needs calm evidence and timed shields.' },
        { test: 'mission:tut-ping', text: 'Good. You have a clean uplink. City Gate needs routes secured, then the Relay Cave opens below us.' },
        { test: 'default', text: 'Welcome to CyberWorld. The Null Crown feeds on rushed defenders. I teach operatives to slow down, verify, and take sectors back.' }
      ] }
  ];
  var NPC_LOOKS = {
    warden: { frame: 'runner', suit: '#ffb454', accent: '#fcee09', hair: '#3a2114', skin: '#b8785f', coat: '#1f1720' },
    mentor: { frame: 'bot', suit: '#d9f4ff', accent: '#4db5ff', hair: '#eef8ff', skin: '#d9f4ff', coat: '#14283a' },
    relay: { frame: 'ghost', suit: '#00ffcc', accent: '#7CFF6B', hair: '#0b1418', skin: '#8b5d50', coat: '#08231f' },
    zero: { frame: 'ghost', suit: '#ff2bd6', accent: '#00ffcc', hair: '#071018', skin: '#8b5d50', coat: '#10151f' },
    nova: { frame: 'runner', suit: '#7CFF6B', accent: '#00e8ff', hair: '#ff2bd6', skin: '#b8785f', coat: '#071827' },
    cipher: { frame: 'tinker', suit: '#fcee09', accent: '#00ffcc', hair: '#253044', skin: '#c69275', coat: '#162033' }
  };
  var PLAZA_CROWD = [
    { id: 'bot-patrol-a', name: 'GuardBot', title: 'Firewall Unit', x: 0.39, y: 0.30, dir: 1, look: { frame: 'bot', suit: '#dbe9f4', accent: '#00e8ff', hair: '#eef8ff', coat: '#183040' } },
    { id: 'bot-patrol-b', name: 'GuardBot', title: 'Firewall Unit', x: 0.54, y: 0.35, dir: -1, look: { frame: 'bot', suit: '#dbe9f4', accent: '#7CFF6B', hair: '#eef8ff', coat: '#183040' } },
    { id: 'blackhat', name: 'ZeroTrace', title: 'Rogue Signal', x: 0.71, y: 0.40, dir: -1, look: { frame: 'ghost', suit: '#171c24', accent: '#ff2bd6', hair: '#05070d', skin: '#a16b56', coat: '#0b1018' } },
    { id: 'cadet-a', name: 'Cadet', title: 'Academy', x: 0.24, y: 0.48, dir: 1, look: { frame: 'sentinel', suit: '#4db5ff', accent: '#00ffcc', hair: '#341a12', skin: '#b87962', coat: '#081827' } },
    { id: 'cipher-aide', name: 'Aide', title: 'Cipher Lab', x: 0.46, y: 0.27, dir: -1, look: { frame: 'tinker', suit: '#7CFF6B', accent: '#fcee09', hair: '#173018', skin: '#c08b68', coat: '#102018' } },
    { id: 'route-runner', name: 'Runner', title: 'Shard Courier', x: 0.58, y: 0.58, dir: 1, look: { frame: 'runner', suit: '#ff2bd6', accent: '#00e8ff', hair: '#130f1c', skin: '#8e5b4c', coat: '#160f26' } }
  ];
  var PLAZA_EMOTES = [
    'signals ready',
    'drops a firewall marker',
    'checks packet lanes',
    'flags the plaza board',
    'salutes the route crew'
  ];
  var DISTRICT_SCENES = {
    academy: {
      label: 'ACADEMY',
      title: 'Professor Cipher Academy',
      subtitle: 'Defensive method before speed',
      color: '#00ffcc',
      accent: '#fcee09',
      type: 'academy',
      objective: 'Train fundamentals, complete the first ping, and unlock clean field work.',
      nodes: [
        { id: 'cipher', kind: 'npc', label: 'PROFESSOR CIPHER', title: 'Threat Architect', x: 0.50, y: 0.43, color: '#fcee09', look: 'cipher', action: 'academy', desc: 'Open the Academy lessons and challenge deck.' },
        { id: 'ping', kind: 'terminal', label: 'PING GATEWAY', title: 'First Defensive Ping', x: 0.25, y: 0.62, color: '#00ffcc', action: 'mission:tut-ping', mission: 'tut-ping', desc: 'Professor Cipher checks your clean blue-team uplink.' },
        { id: 'scan', kind: 'terminal', label: 'PORT SCAN', title: 'Scan Open Ports', x: 0.75, y: 0.62, color: '#4db5ff', action: 'mission:tut-scan', mission: 'tut-scan', desc: 'Practice careful service discovery without drama.' },
        { id: 'return', kind: 'door', label: 'PLAZA DOOR', title: 'Return To City Gate', x: 0.09, y: 0.82, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    },
    field: {
      label: 'FIELD ROUTE',
      title: 'Shard Convoy Launch Bay',
      subtitle: 'Live movement route',
      color: '#7CFF6B',
      accent: '#00e8ff',
      type: 'field',
      objective: 'Choose a route, collect shards, manage trace heat, and exfil clean.',
      nodes: [
        { id: 'city-convoy', kind: 'portal', label: 'CITY CONVOY', title: 'Route The Data Convoy', x: 0.31, y: 0.58, color: '#7CFF6B', action: 'mission:mc-convoy', mission: 'mc-convoy', desc: 'The first real route through City Gate lanes.' },
        { id: 'black-relay', kind: 'portal', label: 'BLACK RELAY', title: 'Black Relay Convoy', x: 0.58, y: 0.45, color: '#00ffcc', action: 'mission:dn-convoy', mission: 'dn-convoy', desc: 'Watcher pairs sweep this route. Requires field discipline.' },
        { id: 'firewall-caves', kind: 'portal', label: 'FIREWALL CAVES', title: 'Stormcore Firewall Caves', x: 0.77, y: 0.66, color: '#ff2bd6', action: 'mission:sc-caves', mission: 'sc-caves', desc: 'Storm-lit shard route that opens the raid backdoor.' },
        { id: 'return', kind: 'door', label: 'PLAZA DOOR', title: 'Return To City Gate', x: 0.10, y: 0.84, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    },
    net: {
      label: 'NET CAFE',
      title: 'Net Cafe Social Terminal',
      subtitle: 'Crew, chat, ranks, factions',
      color: '#ff2bd6',
      accent: '#00e8ff',
      type: 'net',
      objective: 'Use the live roster and global comms to make the plaza feel occupied.',
      nodes: [
        { id: 'chat', kind: 'terminal', label: 'GLOBAL CHAT', title: 'Global Chat Terminal', x: 0.31, y: 0.57, color: '#ff2bd6', action: 'net', desc: 'Open live chat, faction roster, ranks, and crew tools.' },
        { id: 'crew', kind: 'npc', label: 'BYTE', title: 'Net Guide', x: 0.56, y: 0.42, color: '#4db5ff', look: 'mentor', action: 'net', desc: 'Byte tracks crews, factions, and live operatives.' },
        { id: 'emote', kind: 'terminal', label: 'SIGNAL PAD', title: 'Emote Signal Pad', x: 0.75, y: 0.67, color: '#fcee09', action: 'emote', desc: 'Broadcast a visible social signal into the room feed.' },
        { id: 'return', kind: 'door', label: 'PLAZA DOOR', title: 'Return To City Gate', x: 0.09, y: 0.82, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    },
    soc: {
      label: 'SOC TOWER',
      title: 'Blue-Team Operations Room',
      subtitle: 'Triage, contain, document',
      color: '#00e8ff',
      accent: '#7CFF6B',
      type: 'soc',
      objective: 'Work with Nova and Agent Zero to classify alerts, restore firewall rules, and unlock your lab.',
      nodes: [
        { id: 'nova', kind: 'npc', label: 'NOVA', title: 'SOC Lead', x: 0.36, y: 0.43, color: '#7CFF6B', look: 'nova', action: 'mission:soc-triage', mission: 'soc-triage', desc: 'Review the unknown-node failed-login alert and make the call.' },
        { id: 'triage', kind: 'terminal', label: 'ALERT TRIAGE', title: 'Alert Triage I', x: 0.56, y: 0.56, color: '#fcee09', action: 'mission:soc-triage', mission: 'soc-triage', desc: 'Flag the suspicious failed-login pattern and restore the firewall rule.' },
        { id: 'mission-control', kind: 'terminal', label: 'MISSION CONTROL', title: 'Ops Mission Console', x: 0.75, y: 0.42, color: '#00ffcc', action: 'console', desc: 'Open the full mission console, inventory, and combat deck.' },
        { id: 'lab-link', kind: 'door', label: 'PLAYER LAB', title: 'Player Lab Lift', x: 0.82, y: 0.78, color: '#4db5ff', action: 'district:lab', desc: 'Visit your personal lab, badge shelf, and tool rack.' },
        { id: 'return', kind: 'door', label: 'PLAZA ELEVATOR', title: 'Return To City Gate', x: 0.09, y: 0.83, color: '#ffb454', action: 'plaza', desc: 'Ride back to City Gate Plaza.' }
      ]
    },
    lab: {
      label: 'PLAYER LAB',
      title: 'Personal Sandbox Room',
      subtitle: 'Badges, tools, server rack, Byte dock',
      color: '#4db5ff',
      accent: '#ff2bd6',
      type: 'lab',
      objective: 'Use your room as the earned home base: inspect badges, tools, dossier, and the world map.',
      nodes: [
        { id: 'terminal', kind: 'terminal', label: 'CRT CONSOLE', title: 'Operator Console', x: 0.30, y: 0.56, color: '#ffb454', action: 'console', desc: 'Open missions, inventory, and field stats from your desk terminal.' },
        { id: 'tools', kind: 'terminal', label: 'TOOLS RACK', title: 'Log Lens Rack', x: 0.48, y: 0.42, color: '#00ffcc', action: 'console', desc: 'Log Lens equipped. Empty slots unlock through more quests.' },
        { id: 'badges', kind: 'terminal', label: 'BADGE SHELF', title: 'Badge Shelf', x: 0.70, y: 0.56, color: '#fcee09', action: 'console', desc: 'Starter, First Login, and Alert Triage badges live here once earned.' },
        { id: 'map', kind: 'portal', label: 'WORLD MAP', title: 'CyberWorld Network Map', x: 0.82, y: 0.40, color: '#00e8ff', action: 'district:map', desc: 'Open the 11-zone network topology map.' },
        { id: 'return', kind: 'door', label: 'PLAZA DOOR', title: 'Return To City Gate', x: 0.09, y: 0.83, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    },
    map: {
      label: 'WORLD MAP',
      title: 'CyberWorld Network Topology',
      subtitle: '3 / 11 districts currently connected',
      color: '#00ffcc',
      accent: '#fcee09',
      type: 'map',
      objective: 'Cyber Plaza, SOC Tower, and Player Lab are live. The rest are visible future district gates.',
      nodes: [
        { id: 'cyber-plaza', kind: 'portal', label: 'CYBER PLAZA', title: 'Cyber Plaza', x: 0.50, y: 0.52, color: '#00ffcc', action: 'plaza', desc: 'The social hub and routing center.' },
        { id: 'soc-tower', kind: 'portal', label: 'SOC TOWER', title: 'SOC Tower', x: 0.50, y: 0.26, color: '#00e8ff', action: 'district:soc', desc: 'Blue-team alert triage and operations.' },
        { id: 'player-lab', kind: 'portal', label: 'PLAYER LAB', title: 'Player Lab', x: 0.50, y: 0.11, color: '#fcee09', action: 'district:lab', desc: 'Your personal sandbox room and badge shelf.' },
        { id: 'red-lab', kind: 'portal', label: 'RED TEAM LAB', title: 'Red Team Lab', x: 0.74, y: 0.26, color: '#ff355f', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future safe attack-defense CTF district.' },
        { id: 'sysadmin', kind: 'portal', label: 'SYSADMIN ALLEY', title: 'SysAdmin Alley', x: 0.83, y: 0.46, color: '#ffb454', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future patching, permissions, and ticket queue district.' },
        { id: 'packet', kind: 'portal', label: 'PACKET HARBOR', title: 'Packet Harbor', x: 0.74, y: 0.70, color: '#fcee09', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future networks, routing, subnetting, DNS, and DHCP district.' },
        { id: 'osint', kind: 'portal', label: 'OSINT BAZAAR', title: 'OSINT Bazaar', x: 0.50, y: 0.82, color: '#7CFF6B', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future public-source investigation and evidence quality district.' },
        { id: 'cloud', kind: 'portal', label: 'CLOUD CITADEL', title: 'Cloud Citadel', x: 0.26, y: 0.70, color: '#4db5ff', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future identity, logs, storage, and posture district.' },
        { id: 'hardware', kind: 'portal', label: 'HARDWARE HANGAR', title: 'Hardware Hangar', x: 0.17, y: 0.46, color: '#b87962', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future device, firmware, sensor, and repair district.' },
        { id: 'museum', kind: 'portal', label: 'MALWARE MUSEUM', title: 'Malware Museum', x: 0.26, y: 0.26, color: '#ff2bd6', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future malware triage and behavior exhibit district.' },
        { id: 'space', kind: 'portal', label: 'SPACE SYSTEMS', title: 'Space Systems Command', x: 0.50, y: 0.94, color: '#d9f4ff', action: 'locked', locked: true, lockLabel: 'LOCKED', unlockText: 'Future orbital and satellite cybersecurity district.' }
      ]
    },
    console: {
      label: 'OPS CONSOLE',
      title: 'Mission Control Deck',
      subtitle: 'Campaign, inventory, combat',
      color: '#fcee09',
      accent: '#00ffcc',
      type: 'console',
      objective: 'Review the campaign ladder, loadout, missions, and combat encounters.',
      nodes: [
        { id: 'missions', kind: 'terminal', label: 'MISSIONS', title: 'Mission Console', x: 0.34, y: 0.55, color: '#fcee09', action: 'console', desc: 'Open the full mission, inventory, and combat console.' },
        { id: 'daily', kind: 'terminal', label: 'DAILY CACHE', title: 'Daily Cache Uplink', x: 0.58, y: 0.42, color: '#00ffcc', action: 'cache', desc: 'Claim a daily cache if the city reset is ready.' },
        { id: 'bosslog', kind: 'terminal', label: 'BOSS DOSSIER', title: 'Null Crown Dossier', x: 0.76, y: 0.67, color: '#ff2bd6', action: 'district:storm', desc: 'Inspect Stormcore boss gates and raid route requirements.' },
        { id: 'return', kind: 'door', label: 'PLAZA DOOR', title: 'Return To City Gate', x: 0.09, y: 0.83, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    },
    profile: {
      label: 'PROFILE',
      title: 'Operative Dossier Bay',
      subtitle: 'Identity, look, rank, starter gear',
      color: '#4db5ff',
      accent: '#00ffcc',
      type: 'profile',
      objective: 'Inspect the operative identity and reopen the creator path when needed.',
      nodes: [
        { id: 'dossier', kind: 'terminal', label: 'DOSSIER', title: 'Operative Profile', x: 0.32, y: 0.54, color: '#4db5ff', action: 'profile', desc: 'Open the profile page for your live operative.' },
        { id: 'creator', kind: 'terminal', label: 'CREATOR', title: 'Character Creator', x: 0.58, y: 0.42, color: '#00ffcc', action: 'creator', desc: 'Return to the character creator and path selection.' },
        { id: 'loadout', kind: 'terminal', label: 'LOADOUT', title: 'Starter Gear Audit', x: 0.76, y: 0.66, color: '#fcee09', action: 'console', desc: 'Review gear and starter items in the ops console.' },
        { id: 'return', kind: 'door', label: 'PLAZA DOOR', title: 'Return To City Gate', x: 0.09, y: 0.82, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    },
    relay: {
      label: 'RELAY CAVE',
      title: 'Dark Relay Cave Threshold',
      subtitle: 'Null Crown watcher nests',
      color: '#7CFF6B',
      accent: '#00ffcc',
      type: 'cave',
      objective: 'Descend only when your level and route discipline can survive watcher pairs.',
      nodes: [
        { id: 'scout', kind: 'npc', label: 'RELAY TECH', title: 'Cave Scout', x: 0.36, y: 0.44, color: '#00ffcc', look: 'relay', action: 'mission:dn-cave', mission: 'dn-cave', desc: 'Map watcher nests and build the cave route map.' },
        { id: 'convoy', kind: 'portal', label: 'BLACK RELAY', title: 'Black Relay Convoy', x: 0.59, y: 0.58, color: '#7CFF6B', action: 'mission:dn-convoy', mission: 'dn-convoy', desc: 'Run the hostile relay corridor.' },
        { id: 'matriarch', kind: 'portal', label: 'MATRIARCH', title: 'Relay Matriarch Boss', x: 0.77, y: 0.43, color: '#ff2bd6', action: 'mission:dn-matriarch', mission: 'dn-matriarch', desc: 'Challenge the watcher boss controlling the cave lattice.' },
        { id: 'return', kind: 'door', label: 'PLAZA LIFT', title: 'Return To City Gate', x: 0.10, y: 0.83, color: '#ffb454', action: 'plaza', desc: 'Ride the lift back to City Gate Plaza.' }
      ]
    },
    storm: {
      label: 'STORMCORE',
      title: 'Stormcore Raid Gate',
      subtitle: 'The Overseer holds the blackout loop',
      color: '#ff2bd6',
      accent: '#00e8ff',
      type: 'storm',
      objective: 'Open the map, breach Stormcore ICE, clear firewall caves, and face the Overseer.',
      nodes: [
        { id: 'map', kind: 'portal', label: 'SECTOR MAP', title: 'The Grid Sector Map', x: 0.28, y: 0.64, color: '#00e8ff', action: 'map', desc: 'Open the sector node map.' },
        { id: 'ice', kind: 'portal', label: 'ICE RAID', title: 'Stormcore Breach', x: 0.51, y: 0.47, color: '#ff2bd6', action: 'mission:sc-raid', mission: 'sc-raid', desc: 'Push through Stormcore ICE and tag the throne node.' },
        { id: 'overseer', kind: 'portal', label: 'OVERSEER', title: 'Overseer Blackout', x: 0.75, y: 0.63, color: '#fcee09', action: 'mission:sc-overseer', mission: 'sc-overseer', desc: 'Face the Stormcore Overseer in the campaign boss fight.' },
        { id: 'return', kind: 'door', label: 'PLAZA GATE', title: 'Return To City Gate', x: 0.09, y: 0.83, color: '#ffb454', action: 'plaza', desc: 'Walk back to City Gate Plaza.' }
      ]
    }
  };
  var WORLD_ASSET_URLS = {
    plaza: '/CyberWorld/assets/cyberworld/city-gate-plaza-art.png',
    operative: '/CyberWorld/assets/cyberworld/operative-sprite.svg',
    storybook: '/CyberWorld/assets/cyberworld/storybook-cyberworld-reference.png',
    shard: '/CyberWorld/assets/cyberworld/data-shard.svg',
    daemon: '/CyberWorld/assets/cyberworld/watcher-daemon.svg',
    gate: '/CyberWorld/assets/cyberworld/exfil-gate.svg'
  };
  var WORLD_ASSETS = {};
  Object.keys(WORLD_ASSET_URLS).forEach(function (key) {
    var img = new Image();
    img.src = WORLD_ASSET_URLS[key];
    WORLD_ASSETS[key] = img;
  });

  var SECTOR_DECKS = {
    crypto: {
      label: 'CIPHER VAULT',
      brief: 'Encoding, hashing, and evidence-preserving decrypt drills.',
      skyline: ['KEYSTORE', 'HASH STACK', 'SIGNAL WELL'],
      links: [
        { id: 'academy', label: 'ACADEMY', title: 'Cipher Lab', x: 0.18, y: 0.72, color: '#00ffcc', action: 'district:academy', desc: 'Open Professor Cipher training without leaving the world.' },
        { id: 'console', label: 'OPS CONSOLE', title: 'Mission Console', x: 0.82, y: 0.72, color: '#fcee09', action: 'district:console', desc: 'Review gear, rewards, and live campaign objectives.' }
      ]
    },
    web: {
      label: 'APPLICATION ALLEY',
      brief: 'Safe web bug labs, access-control reasoning, and service hardening.',
      skyline: ['AUTH GATE', 'API SPINE', 'WAF ROOF'],
      links: [
        { id: 'academy', label: 'WEB CLASS', title: 'Academy Web Wing', x: 0.18, y: 0.72, color: '#ff2bd6', action: 'district:academy', desc: 'Open safe web exploitation and remediation lessons.' },
        { id: 'net', label: 'NET CAFE', title: 'Crew Review', x: 0.82, y: 0.72, color: '#4db5ff', action: 'district:net', desc: 'Bring findings into comms, roster, and chat.' }
      ]
    },
    recon: {
      label: 'SIGNAL MARKET',
      brief: 'Recon, OSINT quality, exposure triage, and clean reporting.',
      skyline: ['OSINT BAZAAR', 'PACKET HARBOR', 'MAP TOWER'],
      links: [
        { id: 'map', label: 'WORLD MAP', title: 'Network Topology', x: 0.18, y: 0.72, color: '#00e8ff', action: 'district:map', desc: 'Open the 11-zone topology and locked district gates.' },
        { id: 'field', label: 'FIELD ROUTE', title: 'Signal Route', x: 0.82, y: 0.72, color: '#7CFF6B', action: 'district:field', desc: 'Run route movement, shards, pulse timing, and exfil.' }
      ]
    },
    forensics: {
      label: 'EVIDENCE DOCK',
      brief: 'Logs, timelines, captures, and artifact handling.',
      skyline: ['CASE VAULT', 'PCAP DOCK', 'TIMELINE LIFT'],
      links: [
        { id: 'lab', label: 'PLAYER LAB', title: 'Evidence Shelf', x: 0.18, y: 0.72, color: '#4db5ff', action: 'district:lab', desc: 'Open your badge shelf, tools rack, and dossier desk.' },
        { id: 'relay', label: 'RELAY CAVE', title: 'Cave Scout Route', x: 0.82, y: 0.72, color: '#7CFF6B', action: 'district:relay', desc: 'Inspect watcher nests and the Relay Matriarch gate.' }
      ]
    },
    defense: {
      label: 'SOC DEFENSE DECK',
      brief: 'Alert triage, containment, hardening, and detection logic.',
      skyline: ['SOC TOWER', 'FIREWALL CORE', 'INCIDENT BRIDGE'],
      links: [
        { id: 'soc', label: 'SOC TOWER', title: 'Blue-Team Ops', x: 0.18, y: 0.72, color: '#00e8ff', action: 'district:soc', desc: 'Work with Nova and Agent Zero on live alert triage.' },
        { id: 'storm', label: 'STORMCORE', title: 'Raid Gate', x: 0.82, y: 0.72, color: '#ff2bd6', action: 'district:storm', desc: 'Inspect boss requirements and Stormcore route gates.' }
      ]
    }
  };

  function getOp() {
    var g = loadJSON('cw.operative.v1', {}) || {};
    var net = loadJSON('cw.net.v1', {}) || {};
    return {
      callsign: g.callsign || net.callsign || 'OPERATIVE',
      faction: net.faction || 'GHOSTNET',
      level: Math.max(1, parseInt(g.level, 10) || 1),
      xp: Math.max(0, parseInt(g.xp, 10) || 0),
      credits: Math.max(0, parseInt(g.credits, 10) || 0),
      look: g.look || net.look || null,
      path: (g.flags && g.flags.path) || net.path || 'ghost'
    };
  }
  function gameplayState() {
    return loadJSON('cw.operative.v1', {}) || {};
  }
  function missionDone(id) {
    var g = gameplayState();
    return !!(g.completed && g.completed[id]);
  }
  function missionMeta(id) {
    if (!id) return null;
    try {
      var list = window.__cwGameplay && window.__cwGameplay.missions ? window.__cwGameplay.missions() : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
    } catch (e) {}
    return null;
  }
  function missionStatus(id) {
    var m = missionMeta(id);
    var op = getOp();
    if (missionDone(id)) return { state: 'done', label: 'CLEARED', reason: 'Mission already cleared.' };
    if (m && m.req && m.req.mission && !missionDone(m.req.mission)) {
      var prereq = missionMeta(m.req.mission);
      return { state: 'locked', label: 'REQ', reason: 'Requires ' + (prereq ? prereq.title : m.req.mission) + ' first.' };
    }
    if (m && m.req && m.req.level && op.level < m.req.level) {
      return { state: 'locked', label: 'LVL ' + m.req.level, reason: 'Requires LVL ' + m.req.level + '. Current LVL ' + op.level + '.' };
    }
    return { state: 'open', label: 'OPEN', reason: m ? m.brief : 'Ready.' };
  }
  function nodeStatus(node) {
    if (!node) return { state: 'open', label: 'OPEN', reason: '' };
    if (node.locked) return { state: 'locked', label: node.lockLabel || 'LOCKED', reason: node.unlockText || node.desc || 'Locked.' };
    if (node.mission) return missionStatus(node.mission);
    return { state: 'open', label: node.action === 'plaza' ? 'BACK' : 'OPEN', reason: node.desc || 'Ready.' };
  }
  function districtScene(id) {
    return DISTRICT_SCENES[id || W.district] || null;
  }
  function storyArc() {
    var op = getOp();
    if (!missionDone('tut-ping')) return 'Prologue - Professor Cipher';
    if (!missionDone('mc-convoy')) return 'Act I - City Gate Convoy';
    if (op.level < 5 || !missionDone('dn-convoy')) return 'Act II - Null Crown Relays';
    if (op.level < 6 || !missionDone('sc-raid')) return 'Act III - Stormcore Overseer';
    return 'Act IV - Hunt The Null Crown';
  }
  function passesDialogueTest(test) {
    if (!test || test === 'default') return true;
    var bits = String(test).split(':');
    if (bits[0] === 'mission') return missionDone(bits[1]);
    if (bits[0] === 'level') return getOp().level >= (parseInt(bits[1], 10) || 1);
    return false;
  }
  function npcDialogue(npc) {
    var lines = npc.lines || [{ test: 'default', text: npc.line || '' }];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].test !== 'default' && passesDialogueTest(lines[i].test)) return lines[i].text;
    }
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].test === 'default') return lines[j].text;
    }
    return npc.line || '';
  }

  // ------------------------------------------------------------ sound engine (WebAudio, no assets)
  var Audio2 = {
    ctx: null, master: null, drone: null, enabled: true,
    init: function () {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.enabled = loadJSON('cw.sound', true) !== false;
        this.startDrone();
      } catch (e) { this.ctx = null; }
    },
    resume: function () { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {} },
    setEnabled: function (on) {
      this.enabled = on;
      try { localStorage.setItem('cw.sound', JSON.stringify(on)); } catch (e) {}
      if (this.master) this.master.gain.value = on ? 0.5 : 0;
    },
    startDrone: function () {
      if (!this.ctx || this.drone) return;
      try {
        var o = this.ctx.createOscillator(), g = this.ctx.createGain(), o2 = this.ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 55.4;
        g.gain.value = 0.06;
        o.connect(g); o2.connect(g); g.connect(this.master);
        o.start(); o2.start();
        this.drone = { o: o, o2: o2, g: g };
      } catch (e) {}
    },
    blip: function (freq, dur, type) {
      if (!this.ctx || !this.enabled) return;
      try {
        var o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'square'; o.frequency.value = freq || 660;
        g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.22, this.ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + (dur || 0.12));
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + (dur || 0.12) + 0.02);
      } catch (e) {}
    },
    arp: function (notes, step) {
      if (!this.ctx || !this.enabled) return;
      var self = this; (notes || [523, 659, 784, 1047]).forEach(function (f, i) { setTimeout(function () { self.blip(f, 0.16, 'triangle'); }, i * (step || 70)); });
    },
    levelup: function () { this.arp([523, 659, 784, 1047, 1319], 90); }
  };

  // ------------------------------------------------------------ state
  var W = {
    root: null, canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
    view: 'plaza',       // 'plaza' | 'district' | 'grid' | 'sector'
    sector: null,        // active sector id
    district: null,      // active plaza district id
    trans: 1,            // transition progress 0..1
    sectors: [],         // computed sector layout
    nodes: [],           // computed node layout (current sector)
    sectorLinks: [],     // real portals/actions inside the current sector
    players: [],         // presence-driven other players
    particles: [],
    packets: [],
    hover: null,
    focus: null,
    keys: {},
    avatar: { x: 0, y: 0, tx: 0, ty: 0, ready: false, dir: 1 },
    plazaBubble: { text: '', until: 0, speaker: '' },
    emoteIndex: 0,
    t: 0,
    lastLevel: 1, lastDone: 0,
    booted: false, open: false, raf: null
  };

  // ------------------------------------------------------------ boot / mount
  function ensureMounted() {
    if (!document.body || document.getElementById('cwg-root')) return;
    var root = document.createElement('div'); root.id = 'cwg-root';
    root.innerHTML =
      '<canvas id="cwg-canvas"></canvas>' +
      '<div id="cwg-crt"></div>' +
      '<div id="cwg-flash"></div>' +
      '<div id="cwg-levelup"><div class="big">LEVEL UP</div><div class="sm" id="cwg-lu-sm">RANK ASCENDED</div></div>' +
      '<div id="cwg-tip"></div>' +
      // top HUD
      '<div class="cwg-hud" id="cwg-hud-top">' +
        '<div class="cwg-id"><div class="cwg-av" id="cwg-av">O</div>' +
        '<div class="cwg-id-main"><div class="nm" id="cwg-nm">OPERATIVE</div><div class="rk" id="cwg-rk">ROOKIE · GhostNet</div></div></div>' +
        '<div class="cwg-vitals">' +
          '<div class="cwg-vital hp"><span>HP</span><i><em id="cwg-hpfill"></em></i><b id="cwg-hptxt">980/980</b></div>' +
          '<div class="cwg-vital ep"><span>EP</span><i><em id="cwg-epfill"></em></i><b id="cwg-eptxt">640/640</b></div>' +
        '</div>' +
        '<div class="cwg-xpwrap"><div class="cwg-xprow"><span id="cwg-lvl">LVL 1</span><span id="cwg-xptxt">0/100 XP</span></div>' +
        '<div class="cwg-xpbar"><div class="cwg-xpfill" id="cwg-xpfill"></div></div></div>' +
        '<div class="cwg-stats">' +
          '<div class="cwg-stat cr"><b id="cwg-cr">0</b>CREDITS</div>' +
          '<div class="cwg-stat"><b id="cwg-nodes">0</b>BREACHED</div>' +
          '<div class="cwg-stat on"><b id="cwg-online">1</b>ONLINE</div>' +
        '</div>' +
        '<div class="cwg-topbtns">' +
          '<button class="cwg-tb" id="cwg-btn-plaza">PLAZA</button>' +
          '<button class="cwg-tb" id="cwg-btn-map">MAP</button>' +
          '<button class="cwg-tb" id="cwg-btn-console">CONSOLE</button>' +
          '<button class="cwg-tb" id="cwg-btn-ranks">RANKS</button>' +
          '<button class="cwg-tb" id="cwg-btn-snd" data-on="1"><span class="snd">🔊 SND</span></button>' +
          '<button class="cwg-tb exit" id="cwg-btn-exit">EXIT ▸</button>' +
        '</div>' +
      '</div>' +
      // breadcrumb
      '<div class="cwg-hud" id="cwg-crumb"><span id="cwg-crumb-txt">THE GRID // SECTOR SELECT</span></div>' +
      // side panel
      '<div class="cwg-hud" id="cwg-side"><div class="lbl" id="cwg-side-lbl">NEXT OBJECTIVE</div>' +
        '<div class="obj" id="cwg-obj">—</div><div class="objsub" id="cwg-objsub"></div>' +
        '<button class="go" id="cwg-obj-go">▸ ENGAGE</button>' +
        '<div class="breakdown" id="cwg-breakdown"></div></div>' +
      '<div class="cwg-hud" id="cwg-action"><div class="lbl" id="cwg-action-lbl">CITY GATE PLAZA</div>' +
        '<div class="obj" id="cwg-action-title">Walk to a kiosk</div><div class="objsub" id="cwg-action-sub">Click the plaza or use WASD / arrows to move.</div>' +
        '<button class="go" id="cwg-action-go">TALK</button></div>' +
      '<div class="cwg-hud" id="cwg-dock">' +
        '<button data-dock="inventory"><span class="ico">I</span><span>INVENTORY</span><small>1</small></button>' +
        '<button data-dock="skills"><span class="ico">S</span><span>SKILLS</span><small>2</small></button>' +
        '<button data-dock="loadout"><span class="ico">L</span><span>LOADOUT</span><small>3</small></button>' +
        '<button data-dock="map" class="primary"><span class="ico">M</span><span>MAP</span><small>4</small></button>' +
        '<button data-dock="missions"><span class="ico">!</span><span>MISSIONS</span><small>5</small></button>' +
        '<button data-dock="faction"><span class="ico">F</span><span>FACTION</span><small>6</small></button>' +
        '<button data-dock="shop"><span class="ico">$</span><span>SHOP</span><small>7</small></button>' +
      '</div>' +
      '<div class="cwg-hud" id="cwg-social">' +
        '<button data-social="emote" title="Broadcast an emote">EMOTE</button>' +
        '<button data-social="chat" title="Focus plaza chat">CHAT</button>' +
        '<button data-social="friends" title="Open NET roster">CREW</button>' +
        '<button data-social="cache" title="Claim daily cache">CACHE</button>' +
        '<button data-social="map" title="Open sector map">MAP</button>' +
      '</div>' +
      // comms
      '<div class="cwg-hud" id="cwg-comms"><div id="cwg-comms-feed"></div>' +
        '<div id="cwg-comms-bar"><input id="cwg-comms-input" maxlength="280" placeholder="broadcast to the grid…" autocomplete="off"><button id="cwg-comms-send">SEND</button></div></div>' +
      // boot
      '<div id="cwg-boot"><div class="cwg-boot-brand">CYBERWORLD</div><div class="cwg-boot-sub">FLLC GRID CLIENT v5.0</div>' +
        '<div class="cwg-bootlog" id="cwg-bootlog"></div>' +
        '<button id="cwg-jackin">▸ JACK IN</button></div>';
    document.body.appendChild(root);
    W.root = root;
    W.canvas = document.getElementById('cwg-canvas');
    W.ctx = W.canvas.getContext('2d');

    // relaunch button (visible when grid closed)
    if (!document.getElementById('cwg-relaunch')) {
      var rl = document.createElement('div'); rl.id = 'cwg-relaunch';
      rl.innerHTML = '<span>🌐</span><span>THE GRID</span>';
      rl.title = 'Enter THE GRID (G)';
      rl.addEventListener('click', function () { openWorld(); });
      document.body.appendChild(rl);
    }

    bindHud();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); W.open ? closeWorld() : openWorld(); }
      else if (W.open && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].indexOf(key) !== -1) { W.keys[key] = true; e.preventDefault(); }
      else if (e.key === 'Escape' && W.open && W.view === 'sector') { toGrid(); }
      else if (e.key === 'Escape' && W.open && W.view === 'grid') { toPlaza(); }
      else if (e.key === 'Escape' && W.open && W.view === 'district') { toPlaza(); }
      else if (e.key === 'Escape' && W.open) { closeWorld(); }
    });
    document.addEventListener('keyup', function (e) {
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].indexOf(key) !== -1) W.keys[key] = false;
    });
  }

  function bindHud() {
    document.getElementById('cwg-btn-exit').addEventListener('click', closeWorld);
    document.getElementById('cwg-btn-plaza').addEventListener('click', toPlaza);
    document.getElementById('cwg-btn-map').addEventListener('click', function () { toDistrict('map'); });
    document.getElementById('cwg-btn-ranks').addEventListener('click', function () { try { window.__cwNet && window.__cwNet.open(); } catch (e) {} Audio2.blip(520); });
    document.getElementById('cwg-btn-console').addEventListener('click', function () { try { window.__cwGameplay && window.__cwGameplay.open(); } catch (e) {} Audio2.blip(560); });
    document.getElementById('cwg-btn-snd').addEventListener('click', function () {
      var on = !Audio2.enabled; Audio2.setEnabled(on);
      this.dataset.on = on ? '1' : '0';
      this.querySelector('.snd').textContent = on ? '🔊 SND' : '🔈 MUTE';
      if (on) Audio2.blip(660);
    });
    document.getElementById('cwg-obj-go').addEventListener('click', function () { engageNext(); });
    document.getElementById('cwg-action-go').addEventListener('click', function () { activateFocus(); });
    document.querySelectorAll('#cwg-dock button').forEach(function (b) {
      b.addEventListener('click', function () { runPlazaDock(b.dataset.dock); });
    });
    document.querySelectorAll('#cwg-social button').forEach(function (b) {
      b.addEventListener('click', function () { runPlazaSocial(b.dataset.social); });
    });
    var send = function () {
      var inp = document.getElementById('cwg-comms-input'); if (!inp) return;
      var body = inp.value.trim(); if (!body) return; inp.value = '';
      Audio2.blip(720, 0.08);
      try { if (window.__cwNet && window.__cwNet.sendChat) window.__cwNet.sendChat(body, 'GLOBAL'); } catch (e) {}
      pushMsg({ callsign: getOp().callsign, faction: getOp().faction, body: body });
    };
    document.getElementById('cwg-comms-send').addEventListener('click', send);
    document.getElementById('cwg-comms-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); e.stopPropagation(); });

    // canvas interaction
    W.canvas.addEventListener('mousemove', onMove);
    W.canvas.addEventListener('click', onClick);
    W.canvas.addEventListener('mouseleave', function () { W.hover = null; hideTip(); });

    // live chat + presence
    try {
      if (window.__cwNet) {
        window.__cwNet.onChat && window.__cwNet.onChat(function (m) { pushMsg(m); Audio2.blip(880, 0.05, 'sine'); });
        window.__cwNet.onRoster && window.__cwNet.onRoster(function (list) { syncPlayers(list); });
      }
    } catch (e) {}
  }

  // ------------------------------------------------------------ boot sequence
  var BOOT_LINES = [
    'establishing uplink to FLLC grid ......... OK',
    'negotiating ICE handshake ................ OK',
    'decrypting operative session ............. OK',
    'loading Null Crown threat model .......... OK',
    'calibrating Professor Cipher channel ..... OK',
    'loading sector topology .................. OK',
    'syncing presence channel ................. OK',
    'calibrating neural interface ............. OK'
  ];
  function runBoot() {
    var log = document.getElementById('cwg-bootlog'); if (!log) return;
    if (sessionStorage.getItem('cwg.booted')) {
      log.innerHTML = 'session restored ......................... OK\n<span class="ok">GRID LINK ESTABLISHED</span>';
      document.getElementById('cwg-jackin').classList.add('ready');
      return;
    }
    var i = 0, txt = '';
    (function step() {
      if (i >= BOOT_LINES.length) {
        txt += '\n<span class="ok">GRID LINK ESTABLISHED</span>';
        log.innerHTML = txt;
        document.getElementById('cwg-jackin').classList.add('ready');
        return;
      }
      txt += (i ? '\n' : '') + BOOT_LINES[i];
      log.innerHTML = txt + '<span class="cwg-cursor"></span>';
      Audio2.blip(300 + Math.random() * 200, 0.03, 'square');
      i++;
      setTimeout(step, 260 + Math.random() * 120);
    })();
  }

  function jackIn() {
    Audio2.init(); Audio2.resume();
    Audio2.arp([392, 523, 659, 880], 80);
    sessionStorage.setItem('cwg.booted', '1');
    var boot = document.getElementById('cwg-boot');
    if (boot) { boot.style.transition = 'opacity .6s'; boot.style.opacity = '0'; setTimeout(function () { boot.classList.add('gone'); }, 620); }
    refreshData(true);
    toPlaza();
  }

  // ------------------------------------------------------------ open / close
  function openWorld() {
    ensureMounted();
    W.root.classList.add('on');
    W.open = true;
    document.getElementById('cwg-relaunch').classList.remove('show');
    resize();
    var boot = document.getElementById('cwg-boot');
    if (boot && !boot.classList.contains('gone')) { runBoot(); document.getElementById('cwg-jackin').onclick = jackIn; }
    else { refreshData(true); if (W.view !== 'sector') toPlaza(); }
    startLoop();
  }
  function closeWorld() {
    if (!W.root) return;
    W.root.classList.remove('on');
    W.open = false;
    document.getElementById('cwg-relaunch').classList.add('show');
    stopLoop();
  }

  // ------------------------------------------------------------ data
  function refreshData(recenter) {
    var op = getOp();
    // HUD identity
    var fx = { GHOSTNET: 'GhostNet', IRONWALL: 'IronWall', NULLSEC: 'NullSec', DAEMON: 'Daemon', NEUTRAL: 'Unaligned' }[op.faction] || 'GhostNet';
    setText('cwg-av', (op.callsign || 'O').charAt(0).toUpperCase());
    setText('cwg-nm', op.callsign);
    setText('cwg-rk', rankFor(op.level) + ' · ' + fx);
    setText('cwg-lvl', 'LVL ' + op.level);
    setText('cwg-cr', op.credits.toLocaleString());
    var maxHp = 900 + op.level * 80;
    var maxEp = 600 + op.level * 40;
    setText('cwg-hptxt', maxHp + '/' + maxHp);
    setText('cwg-eptxt', maxEp + '/' + maxEp);
    var hpFill = document.getElementById('cwg-hpfill'); if (hpFill) hpFill.style.width = '100%';
    var epFill = document.getElementById('cwg-epfill'); if (epFill) epFill.style.width = '100%';
    var need = xpForLevel(op.level), into = clamp(op.xp, 0, need);
    setText('cwg-xptxt', into + '/' + need + ' XP');
    var fill = document.getElementById('cwg-xpfill'); if (fill) fill.style.width = Math.round(into / need * 100) + '%';

    // world data from academy
    var wd = (window.__cwAcademy && window.__cwAcademy.worldData) ? window.__cwAcademy.worldData() : { domains: [] };
    W.wd = wd;
    var doneTotal = 0, total = 0;
    wd.domains.forEach(function (d) { doneTotal += d.done; total += d.total; });
    setText('cwg-nodes', doneTotal);

    // detect level up / new breaches for juice
    if (W.lastLevel && op.level > W.lastLevel) { fireLevelUp(op.level); }
    if (W.lastDone && doneTotal > W.lastDone) { /* breach fx handled on solve */ }
    W.lastLevel = op.level; W.lastDone = doneTotal;

    layoutSectors(recenter);
    renderSide();
    renderBreakdown();
  }

  function layoutSectors() {
    var wd = W.wd || { domains: [] };
    var n = wd.domains.length || 5;
    W.sectors = wd.domains.map(function (d, i) {
      var ang = -Math.PI / 2 + i * (Math.PI * 2 / n);
      return {
        id: d.id, name: d.name, icon: d.icon, done: d.done, total: d.total,
        color: DOMAIN_COLORS[d.id] || '#00ffcc',
        ang: ang, orbit: 0.30, // fraction of min(w,h)
        pulse: Math.random() * Math.PI * 2
      };
    });
  }

  function openSector(id) {
    if (!W.wd || !W.wd.domains) refreshData(true);
    var domains = (W.wd && W.wd.domains) || [];
    var d = domains.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    W.sector = id; W.district = null; W.view = 'sector'; W.trans = 0;
    W.focus = null;
    if (W.root) W.root.dataset.view = 'sector';
    setText('cwg-crumb-txt', 'THE GRID // ' + d.name);
    // lay nodes along an arc path
    W.nodes = d.nodes.map(function (nd, i) {
      return { id: nd.id, title: nd.title, tier: nd.tier, xp: nd.xp, done: nd.done, unlocked: nd.unlocked,
               color: DOMAIN_COLORS[id] || '#00ffcc', idx: i, total: d.nodes.length, pulse: Math.random() * 6 };
    });
    W.sectorLinks = sectorLinks(id);
    setActionPanel(null);
    Audio2.blip(440, 0.14, 'sawtooth');
    renderSide();
    renderBreakdown();
  }
  function toPlaza() {
    W.view = 'plaza';
    W.sector = null;
    W.district = null;
    W.sectorLinks = [];
    W.trans = 0;
    W.focus = null;
    if (W.root) W.root.dataset.view = 'plaza';
    setText('cwg-crumb-txt', 'CITY GATE PLAZA // OPEN WORLD');
    setActionPanel(null);
    Audio2.blip(420, 0.1);
    renderSide();
    renderBreakdown();
  }
  function toDistrict(id) {
    var scene = districtScene(id);
    if (!scene) return;
    W.view = 'district';
    W.sector = null;
    W.district = id;
    W.sectorLinks = [];
    W.trans = 0;
    W.focus = null;
    if (W.root) W.root.dataset.view = 'district';
    setText('cwg-crumb-txt', scene.label + ' // ' + scene.title.toUpperCase());
    setActionPanel(null);
    var p = districtSpawnPoint();
    W.avatar.x = p.x;
    W.avatar.y = p.y;
    W.avatar.tx = p.x;
    W.avatar.ty = p.y;
    W.avatar.ready = true;
    Audio2.arp([330, 440, 660], 55);
    sayInPlaza(scene.label, scene.subtitle);
    renderSide();
    renderBreakdown();
  }
  function toGrid() { W.view = 'grid'; W.sector = null; W.district = null; W.sectorLinks = []; W.focus = null; W.trans = 0; if (W.root) W.root.dataset.view = 'grid'; setText('cwg-crumb-txt', 'THE GRID // SECTOR SELECT'); setActionPanel(null); Audio2.blip(330, 0.12); renderSide(); renderBreakdown(); }

  function sectorDeck(id) {
    return SECTOR_DECKS[id] || {
      label: 'OPS DECK',
      brief: 'Challenge nodes and linked CyberWorld terminals.',
      skyline: ['NODE BRIDGE', 'OPS TOWER', 'PORTAL ARRAY'],
      links: []
    };
  }

  function sectorLinks(id) {
    var deck = sectorDeck(id);
    return (deck.links || []).map(function (link, idx) {
      return {
        id: link.id,
        label: link.label,
        title: link.title,
        x: link.x,
        y: link.y,
        color: link.color || DOMAIN_COLORS[id] || '#00ffcc',
        action: link.action,
        desc: link.desc,
        idx: idx,
        pulse: Math.random() * 6
      };
    });
  }

  // ------------------------------------------------------------ side panel / objectives
  function firstUnsolved() {
    var wd = W.wd || { domains: [] };
    for (var i = 0; i < wd.domains.length; i++) {
      var d = wd.domains[i];
      for (var j = 0; j < d.nodes.length; j++) {
        var nd = d.nodes[j];
        if (!nd.done && nd.unlocked) return { domain: d, node: nd };
      }
    }
    return null;
  }
  function engageNext() {
    if (W.view === 'district' && W.focus) {
      activateFocus();
      return;
    }
    if (W.view === 'sector' && W.sector) {
      var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0];
      var nd = d && d.nodes.filter(function (n) { return !n.done && n.unlocked; })[0];
      if (nd) { launchChallenge(nd.id); return; }
    }
    var nx = firstUnsolved();
    if (nx) { openSector(nx.domain.id); launchChallenge(nx.node.id); }
    else pushMsg({ callsign: 'GRID', faction: 'NEUTRAL', body: 'All sectors cleared, operative. Legend status.' });
  }
  function renderSide() {
    if (W.view === 'sector' && W.sector) {
      var sector = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0];
      if (!sector) return;
      var deck = sectorDeck(W.sector);
      var nextNode = sector.nodes.filter(function (n) { return !n.done && n.unlocked; })[0];
      setText('cwg-side-lbl', deck.label + ' // ' + sector.done + '/' + sector.total);
      if (nextNode) {
        setText('cwg-obj', nextNode.title);
        setText('cwg-objsub', 'Tier ' + nextNode.tier + ' / +' + nextNode.xp + ' XP / ' + deck.brief);
      } else {
        setText('cwg-obj', 'SECTOR CLEARED');
        setText('cwg-objsub', 'Every node breached. Use the linked portals for next progression.');
      }
      return;
    }
    if (W.view === 'plaza') {
      setText('cwg-side-lbl', 'CITY GATE PLAZA');
      setText('cwg-obj', storyArc());
      setText('cwg-objsub', 'Professor Cipher has flagged the Null Crown. Talk to NPCs, train, run routes, and unlock boss gates.');
    } else if (W.view === 'district' && districtScene()) {
      var scene = districtScene();
      setText('cwg-side-lbl', scene.label);
      setText('cwg-obj', scene.title);
      setText('cwg-objsub', scene.objective);
    } else if (W.view === 'sector' && W.sector) {
      var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0];
      setText('cwg-side-lbl', d.name + ' // ' + d.done + '/' + d.total);
      var nd = d.nodes.filter(function (n) { return !n.done && n.unlocked; })[0];
      if (nd) { setText('cwg-obj', nd.title); setText('cwg-objsub', 'TIER ' + nd.tier + ' · +' + nd.xp + ' XP'); }
      else { setText('cwg-obj', 'SECTOR CLEARED ✅'); setText('cwg-objsub', 'Every node breached.'); }
    } else {
      setText('cwg-side-lbl', 'NEXT OBJECTIVE');
      var nx = firstUnsolved();
      if (nx) { setText('cwg-obj', nx.node.title); setText('cwg-objsub', nx.domain.name + ' · TIER ' + nx.node.tier + ' · +' + nx.node.xp + ' XP'); }
      else { setText('cwg-obj', 'CAMPAIGN COMPLETE ✅'); setText('cwg-objsub', 'All challenges cleared.'); }
    }
  }
  function renderBreakdown() {
    var host = document.getElementById('cwg-breakdown'); if (!host) return;
    if (W.view === 'sector' && W.sector) {
      var rows = [];
      W.sectorLinks.forEach(function (link) {
        rows.push('<div class="brow portal"><span class="bi">' + esc((link.label || '?').charAt(0)) + '</span><span>' + esc(link.label) + '</span><span class="bp">PORTAL</span></div>');
      });
      W.nodes.slice(0, 9).forEach(function (node) {
        var state = node.done ? 'done' : (node.unlocked ? 'open' : 'locked');
        var label = node.done ? 'DONE' : (node.unlocked ? 'OPEN' : 'LOCKED');
        rows.push('<div class="brow ' + state + '"><span class="bi">T' + esc(node.tier) + '</span><span>' + esc(node.title) + '</span><span class="bp">' + label + '</span></div>');
      });
      host.innerHTML = rows.join('');
      return;
    }
    if (W.view === 'plaza') {
      host.innerHTML = PLAZA_HOTSPOTS.concat(PLAZA_ACTIVITIES).map(function (h) {
        return '<div class="brow"><span class="bi">' + h.icon + '</span><span>' + esc(h.label) + '</span><span class="bp">OPEN</span></div>';
      }).join('');
      return;
    }
    if (W.view === 'district' && districtScene()) {
      host.innerHTML = districtScene().nodes.map(function (node) {
        var status = nodeStatus(node);
        return '<div class="brow ' + esc(status.state) + '"><span class="bi">' + esc((node.label || '?').charAt(0)) + '</span><span>' + esc(node.label || node.title) + '</span><span class="bp">' + esc(status.label) + '</span></div>';
      }).join('');
      return;
    }
    var wd = W.wd || { domains: [] };
    host.innerHTML = wd.domains.map(function (d) {
      return '<div class="brow"><span class="bi">' + d.icon + '</span><span>' + esc(d.name.split(' ')[0]) + '</span><span class="bp">' + d.done + '/' + d.total + '</span></div>';
    }).join('');
  }

  // ------------------------------------------------------------ challenge launch + solve detection
  function launchChallenge(id) {
    Audio2.blip(600, 0.1);
    try { if (window.__cwAcademy && window.__cwAcademy.goChallenge) window.__cwAcademy.goChallenge(id); } catch (e) {}
    // academy window sits above the grid (z 90002 > 80000); poll for a solve
    var beforeDone = countDone();
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var now = countDone();
      if (now > beforeDone) { clearInterval(iv); onBreach(id); }
      if (tries > 600) clearInterval(iv); // ~5 min cap
    }, 500);
  }
  function countDone() {
    var g = loadJSON('cw.operative.v1', {}) || {};
    return g.completed ? Object.keys(g.completed).length : 0;
  }
  function onBreach(id) {
    Audio2.arp([659, 880, 1047], 70);
    refreshData();
    burstAt(centerX(), centerY(), 40, '#00ffcc');
    flash();
    floatText(centerX(), centerY() - 30, '+ NODE BREACHED');
  }

  // ------------------------------------------------------------ presence -> players
  function syncPlayers(list) {
    var me = null; try { me = (window.__cwNet && window.__cwNet.me) ? window.__cwNet.me() : null; } catch (e) {}
    var others = (list || []).filter(function (p) { return !me || p.callsign !== me.callsign; });
    setText('cwg-online', (list && list.length) || 1);
    // keep drifting positions stable across updates
    var prev = {}; W.players.forEach(function (p) { prev[p.key] = p; });
    W.players = others.slice(0, 24).map(function (p, i) {
      var key = p.device || p.callsign || ('p' + i);
      var ex = prev[key];
      return ex || {
        key: key, callsign: p.callsign || 'OP', level: p.level || 1, faction: p.faction,
        a: Math.random() * Math.PI * 2, r: 0.12 + Math.random() * 0.16, spd: 0.1 + Math.random() * 0.25,
        color: DOMAIN_COLORS[({ GHOSTNET: 'crypto', IRONWALL: 'recon', NULLSEC: 'web', DAEMON: 'forensics' }[p.faction] || 'crypto')] || '#9fe'
      };
    });
  }

  // ------------------------------------------------------------ comms
  function pushMsg(m) {
    var feed = document.getElementById('cwg-comms-feed'); if (!feed || !m) return;
    var fc = DOMAIN_COLORS[({ GHOSTNET: 'crypto', IRONWALL: 'recon', NULLSEC: 'web', DAEMON: 'forensics', DAEMONX: 'defense' }[m.faction] || 'crypto')] || '#00ffcc';
    var line = document.createElement('div'); line.className = 'cwg-msg';
    line.innerHTML = '<span class="cs" style="color:' + fc + '">' + esc(m.callsign || 'OP') + '</span>' + esc(m.body || '');
    feed.appendChild(line);
    while (feed.childElementCount > 6) feed.removeChild(feed.firstChild);
  }

  // ------------------------------------------------------------ FX
  function fireLevelUp(lvl) {
    Audio2.levelup();
    var b = document.getElementById('cwg-levelup'); if (b) { document.getElementById('cwg-lu-sm').textContent = 'RANK: ' + rankFor(lvl) + ' · LVL ' + lvl; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
    flash();
    burstAt(centerX(), centerY(), 80, '#ffb454');
  }
  function flash() { var f = document.getElementById('cwg-flash'); if (f) { f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); } }
  function floatText(x, y, txt) {
    var el = document.createElement('div'); el.className = 'cwg-float'; el.textContent = txt;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    W.root.appendChild(el); setTimeout(function () { el.remove(); }, 1300);
  }
  function burstAt(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
      W.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: color || '#00ffcc', size: 1 + Math.random() * 2 });
    }
  }

  // ------------------------------------------------------------ canvas geometry + render
  function resize() {
    if (!W.canvas) return;
    W.dpr = Math.min(2, window.devicePixelRatio || 1);
    W.w = window.innerWidth; W.h = window.innerHeight;
    W.canvas.width = W.w * W.dpr; W.canvas.height = W.h * W.dpr;
    W.canvas.style.width = W.w + 'px'; W.canvas.style.height = W.h + 'px';
    W.ctx.setTransform(W.dpr, 0, 0, W.dpr, 0, 0);
    // seed ambient particles once
    if (!W.particles.length) for (var i = 0; i < 70; i++) W.particles.push(ambient());
  }
  function ambient() { return { x: Math.random() * W.w, y: Math.random() * W.h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: -1, color: 'rgba(0,255,204,0.35)', size: Math.random() * 1.6 + 0.3, amb: true }; }
  function centerX() { return W.w / 2; }
  function centerY() { return W.h / 2 + 10; }
  function roundRect(c, x, y, w, h, r) {
    var rr = Math.min(r || 0, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.lineTo(x + w - rr, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr);
    c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr);
    c.quadraticCurveTo(x, y, x + rr, y);
    c.closePath();
  }
  function drawTextPill(c, text, x, y, color) {
    c.save();
    c.font = "700 13px 'Share Tech Mono',monospace";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var w = c.measureText(text).width + 34;
    c.fillStyle = 'rgba(2, 9, 14, 0.92)';
    c.strokeStyle = color || '#00ffcc';
    c.lineWidth = 1.5;
    roundRect(c, x - w / 2, y - 17, w, 34, 8);
    c.fill();
    c.stroke();
    c.fillStyle = color || '#00ffcc';
    c.fillText(text, x, y);
    c.restore();
  }

  function drawTalkBubble(c, x, y, text) {
    var label = text || '';
    var w = label ? 52 : 30;
    var h = label ? 24 : 20;
    c.save();
    c.fillStyle = 'rgba(245,252,255,0.94)';
    c.strokeStyle = 'rgba(1,8,14,0.9)';
    c.lineWidth = 2;
    roundRect(c, x - w / 2, y - h / 2, w, h, 6);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(x - 5, y + h / 2 - 1);
    c.lineTo(x - 12, y + h / 2 + 11);
    c.lineTo(x + 7, y + h / 2 - 1);
    c.closePath();
    c.fill();
    c.stroke();
    if (label) {
      c.fillStyle = '#061018';
      c.font = "700 10px 'Share Tech Mono',monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(label, x, y + 1);
    }
    c.restore();
  }

  function sectorPos(s) {
    var R = Math.min(W.w, W.h) * s.orbit;
    return { x: centerX() + Math.cos(s.ang) * R, y: centerY() + Math.sin(s.ang) * R };
  }
  function nodePos(nd) {
    // arc across the middle of the screen
    var pad = Math.min(W.w * 0.16, 220);
    var x = lerp(pad, W.w - pad, nd.total <= 1 ? 0.5 : nd.idx / (nd.total - 1));
    var y = centerY() + Math.sin(nd.idx / Math.max(1, nd.total - 1) * Math.PI) * -Math.min(W.h * 0.16, 140) + 20;
    return { x: x, y: y };
  }

  function draw() {
    var c = W.ctx; if (!c) return;
    W.t += 0.016;
    W.trans = Math.min(1, W.trans + 0.06);
    c.clearRect(0, 0, W.w, W.h);
    // background gradient
    var g = c.createRadialGradient(centerX(), centerY(), 20, centerX(), centerY(), Math.max(W.w, W.h) * 0.75);
    g.addColorStop(0, '#06131c'); g.addColorStop(1, '#01040a');
    c.fillStyle = g; c.fillRect(0, 0, W.w, W.h);
    drawGridLines(c);
    updateParticles(c);

    if (W.view === 'plaza') drawPlazaView(c);
    else if (W.view === 'district') drawDistrictView(c);
    else if (W.view === 'grid') drawGridView(c);
    else drawSectorView(c);

    if (W.view === 'grid' || W.view === 'plaza' || W.view === 'district') drawPlayers(c);
  }

  function drawGridLines(c) {
    c.strokeStyle = 'rgba(0,255,204,0.04)'; c.lineWidth = 1;
    var step = 44, off = (W.t * 6) % step;
    for (var x = -off; x < W.w; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, W.h); c.stroke(); }
    for (var y = -off; y < W.h; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(W.w, y); c.stroke(); }
  }

  function drawGridView(c) {
    var cx = centerX(), cy = centerY();
    // lines core -> sectors with flowing packets
    W.sectors.forEach(function (s) {
      var p = sectorPos(s);
      c.strokeStyle = 'rgba(0,255,204,0.18)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p.x, p.y); c.stroke();
      // packet dots
      for (var k = 0; k < 3; k++) {
        var tt = ((W.t * 0.35 + k / 3) % 1);
        var px = lerp(cx, p.x, tt), py = lerp(cy, p.y, tt);
        c.fillStyle = s.color; c.globalAlpha = 0.8;
        c.beginPath(); c.arc(px, py, 2.2, 0, 7); c.fill(); c.globalAlpha = 1;
      }
    });
    // sectors
    W.sectors.forEach(function (s) {
      var p = sectorPos(s); s.pulse += 0.05;
      var pct = s.total ? s.done / s.total : 0;
      var r = 30 + pct * 12 + Math.sin(s.pulse) * 2;
      var isHover = W.hover && W.hover.type === 'sector' && W.hover.id === s.id;
      // glow
      c.save(); c.shadowColor = s.color; c.shadowBlur = isHover ? 30 : 16;
      c.beginPath(); c.arc(p.x, p.y, r, 0, 7);
      c.fillStyle = 'rgba(3,12,18,0.92)'; c.fill();
      c.lineWidth = isHover ? 3 : 2; c.strokeStyle = s.color; c.stroke();
      c.restore();
      // progress ring
      c.beginPath(); c.arc(p.x, p.y, r + 5, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      c.strokeStyle = s.color; c.lineWidth = 3; c.stroke();
      // icon + label
      c.font = '20px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(s.icon, p.x, p.y - 2);
      c.font = "700 11px 'Share Tech Mono',monospace"; c.fillStyle = '#eafcff';
      c.fillText(s.name.split(' ')[0], p.x, p.y + r + 16);
      c.font = "9px 'Share Tech Mono',monospace"; c.fillStyle = s.color;
      c.fillText(s.done + '/' + s.total, p.x, p.y + r + 28);
      s._pos = p; s._r = r;
    });
    // core (you)
    var pr = 26 + Math.sin(W.t * 2) * 3;
    c.save(); c.shadowColor = '#00ffcc'; c.shadowBlur = 26;
    c.beginPath(); c.arc(cx, cy, pr, 0, 7); c.fillStyle = '#001'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#00ffcc'; c.stroke(); c.restore();
    c.font = '20px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🛰️', cx, cy);
    c.font = "700 10px 'Share Tech Mono',monospace"; c.fillStyle = '#00ffcc'; c.fillText('YOU // CORE', cx, cy + pr + 14);
  }

  function drawSectorView(c) {
    var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0]; if (!d) return;
    var col = DOMAIN_COLORS[W.sector] || '#00ffcc';
    // header
    c.font = "700 22px 'VT323',monospace"; c.textAlign = 'center'; c.fillStyle = col;
    c.fillText(d.icon + '  ' + d.name, centerX(), 96);
    // connective path
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.beginPath();
    W.nodes.forEach(function (nd, i) { var p = nodePos(nd); if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); });
    c.stroke();
    // flowing packets along path
    for (var seg = 0; seg < W.nodes.length - 1; seg++) {
      var a = nodePos(W.nodes[seg]), b = nodePos(W.nodes[seg + 1]);
      var tt = (W.t * 0.4 + seg * 0.2) % 1;
      c.fillStyle = col; c.globalAlpha = 0.6; c.beginPath(); c.arc(lerp(a.x, b.x, tt), lerp(a.y, b.y, tt), 2, 0, 7); c.fill(); c.globalAlpha = 1;
    }
    // nodes
    W.nodes.forEach(function (nd) {
      var p = nodePos(nd); nd.pulse += 0.06;
      var isHover = W.hover && W.hover.type === 'node' && W.hover.id === nd.id;
      var r = 20 + Math.sin(nd.pulse) * 1.5 + (isHover ? 4 : 0);
      c.save();
      if (nd.done) { c.shadowColor = '#00ff9c'; c.shadowBlur = 18; }
      else if (nd.unlocked) { c.shadowColor = col; c.shadowBlur = isHover ? 26 : 12; }
      else { c.shadowBlur = 0; }
      c.beginPath(); c.arc(p.x, p.y, r, 0, 7);
      c.fillStyle = nd.done ? 'rgba(0,40,24,0.95)' : (nd.unlocked ? 'rgba(4,14,20,0.95)' : 'rgba(10,10,14,0.9)');
      c.fill();
      c.lineWidth = 2; c.strokeStyle = nd.done ? '#00ff9c' : (nd.unlocked ? col : '#3a4650'); c.stroke();
      c.restore();
      c.font = '15px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(nd.done ? '✅' : (nd.unlocked ? '⚡' : '🔒'), p.x, p.y);
      c.font = "700 9px 'Share Tech Mono',monospace"; c.fillStyle = nd.unlocked ? '#eafcff' : '#5a6670';
      c.fillText('T' + nd.tier, p.x, p.y + r + 12);
      nd._pos = p; nd._r = r;
    });
  }

  function sectorNodePoint(nd, bounds) {
    var count = Math.max(1, nd.total || W.nodes.length || 1);
    var cols = Math.min(4, Math.max(1, count));
    var row = Math.floor(nd.idx / cols);
    var col = nd.idx % cols;
    var innerLeft = bounds.left + bounds.w * 0.19;
    var innerRight = bounds.left + bounds.w * 0.81;
    var x = cols <= 1 ? bounds.left + bounds.w / 2 : lerp(innerLeft, innerRight, col / Math.max(1, cols - 1));
    var y = bounds.top + bounds.h * 0.46 + row * 92;
    return { x: x, y: y };
  }

  function sectorLinkPoint(link, bounds) {
    return {
      x: bounds.left + bounds.w * clamp(link.x || 0.5, 0.08, 0.92),
      y: bounds.top + bounds.h * clamp(link.y || 0.72, 0.14, 0.90)
    };
  }

  function drawSectorGate(c, link, bounds) {
    var p = sectorLinkPoint(link, bounds);
    var hover = W.hover && W.hover.type === 'sectorLink' && W.hover.id === link.id;
    var focus = W.focus && W.focus.type === 'sectorLink' && W.focus.link && W.focus.link.id === link.id;
    link.pulse += 0.035;
    var color = link.color || '#00ffcc';
    var r = 38 + Math.sin(link.pulse) * 2 + (hover || focus ? 6 : 0);
    c.save();
    c.shadowColor = color;
    c.shadowBlur = hover || focus ? 30 : 18;
    c.strokeStyle = color;
    c.lineWidth = hover || focus ? 3 : 2;
    c.beginPath();
    c.ellipse(p.x, p.y, r * 0.78, r * 1.18, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(p.x, p.y, r * 0.42, r * 0.86, 0, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 0.26;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(p.x, p.y, r * 0.78, r * 1.18, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#eafcff';
    c.font = "700 11px 'Share Tech Mono',monospace";
    c.textAlign = 'center';
    c.fillText(link.label, p.x, p.y + r + 22);
    c.fillStyle = color;
    c.font = "700 9px 'Share Tech Mono',monospace";
    c.fillText('PORTAL', p.x, p.y + r + 35);
    c.restore();
    link._pos = p;
    link._r = r + 18;
  }

  function drawSectorMissionNode(c, nd, bounds) {
    var p = sectorNodePoint(nd, bounds);
    nd.pulse += 0.045;
    var hover = W.hover && W.hover.type === 'node' && W.hover.id === nd.id;
    var focus = W.focus && W.focus.type === 'node' && W.focus.nd && W.focus.nd.id === nd.id;
    var color = nd.color || '#00ffcc';
    var w = 154;
    var h = 66;
    c.save();
    c.shadowColor = nd.done ? '#00ff9c' : (nd.unlocked ? color : 'rgba(120,140,150,.45)');
    c.shadowBlur = hover || focus ? 26 : (nd.unlocked ? 13 : 2);
    c.fillStyle = nd.done ? 'rgba(0,40,24,0.95)' : (nd.unlocked ? 'rgba(4,14,20,0.96)' : 'rgba(8,10,15,0.92)');
    c.strokeStyle = nd.done ? '#00ff9c' : (nd.unlocked ? color : 'rgba(120,140,150,.55)');
    c.lineWidth = hover || focus ? 3 : 2;
    roundRect(c, p.x - w / 2, p.y - h / 2, w, h, 10);
    c.fill();
    c.stroke();
    c.fillStyle = nd.unlocked || nd.done ? '#eafcff' : '#687783';
    c.font = "700 10px 'Share Tech Mono',monospace";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var title = nd.title.length > 21 ? nd.title.slice(0, 20) + '.' : nd.title;
    c.fillText(title, p.x, p.y - 8);
    c.fillStyle = nd.done ? '#00ff9c' : (nd.unlocked ? color : '#7b8790');
    c.font = "700 9px 'Share Tech Mono',monospace";
    c.fillText((nd.done ? 'CLEARED' : nd.unlocked ? 'BREACH' : 'LOCKED') + ' / TIER ' + nd.tier, p.x, p.y + 14);
    c.restore();
    nd._pos = p;
    nd._r = Math.max(w, h) / 2;
  }

  function drawSectorView(c) {
    var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0];
    if (!d) return;
    var deck = sectorDeck(W.sector);
    var col = DOMAIN_COLORS[W.sector] || '#00ffcc';
    var marginLeft = clamp(W.w * 0.08, 76, 156);
    var marginRight = clamp(W.w * 0.20, 260, 340);
    var b = {
      left: marginLeft,
      top: clamp(W.h * 0.15, 96, 138),
      w: Math.max(420, W.w - marginLeft - marginRight),
      h: Math.max(430, W.h - clamp(W.h * 0.30, 220, 300))
    };
    b.bottom = b.top + b.h;
    c.save();
    c.fillStyle = 'rgba(2,7,12,0.54)';
    c.strokeStyle = 'rgba(0,255,204,0.20)';
    c.lineWidth = 1.4;
    roundRect(c, b.left, b.top, b.w, b.h, 22);
    c.fill();
    c.stroke();

    var floorTop = b.top + b.h * 0.31;
    c.fillStyle = 'rgba(2,18,25,0.62)';
    c.beginPath();
    c.moveTo(b.left + b.w * 0.12, floorTop);
    c.lineTo(b.left + b.w * 0.88, floorTop);
    c.lineTo(b.left + b.w * 0.96, b.bottom - 20);
    c.lineTo(b.left + b.w * 0.04, b.bottom - 20);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,232,255,0.14)';
    c.lineWidth = 1;
    for (var gx = 0; gx <= 8; gx++) {
      var tx = b.left + b.w * (0.10 + gx * 0.10);
      c.beginPath();
      c.moveTo(tx, floorTop);
      c.lineTo(lerp(b.left + b.w * 0.04, b.left + b.w * 0.96, gx / 8), b.bottom - 20);
      c.stroke();
    }
    for (var gy = 0; gy <= 5; gy++) {
      var y = lerp(floorTop, b.bottom - 20, gy / 5);
      c.beginPath();
      c.moveTo(lerp(b.left + b.w * 0.12, b.left + b.w * 0.04, gy / 5), y);
      c.lineTo(lerp(b.left + b.w * 0.88, b.left + b.w * 0.96, gy / 5), y);
      c.stroke();
    }

    var names = deck.skyline || [];
    for (var i = 0; i < 3; i++) {
      var bx = b.left + b.w * (0.21 + i * 0.29);
      var bw = b.w * 0.16;
      var bh = 78 + i * 18;
      c.fillStyle = 'rgba(4,12,20,0.94)';
      c.strokeStyle = i === 1 ? col : 'rgba(0,232,255,0.40)';
      roundRect(c, bx - bw / 2, floorTop - bh, bw, bh, 10);
      c.fill();
      c.stroke();
      c.fillStyle = i === 1 ? col : 'rgba(252,238,9,0.75)';
      for (var win = 0; win < 4; win++) c.fillRect(bx - bw / 2 + 18 + win * 22, floorTop - bh + 22 + (win % 2) * 16, 9, 9);
      c.fillStyle = '#eafcff';
      c.font = "700 9px 'Share Tech Mono',monospace";
      c.textAlign = 'center';
      c.fillText((names[i] || 'OPS NODE').slice(0, 18), bx, floorTop - bh - 12);
    }

    c.fillStyle = col;
    c.font = "700 28px 'VT323',monospace";
    c.textAlign = 'center';
    c.fillText(d.name, b.left + b.w / 2, b.top + 42);
    c.fillStyle = '#dffbff';
    c.font = "700 11px 'Share Tech Mono',monospace";
    c.fillText(deck.brief, b.left + b.w / 2, b.top + 66);
    c.fillStyle = '#fcee09';
    c.font = "700 10px 'Share Tech Mono',monospace";
    c.fillText(d.done + ' / ' + d.total + ' nodes breached - portals are live actions', b.left + b.w / 2, b.top + 84);

    W.sectorLinks.forEach(function (link) { drawSectorGate(c, link, b); });
    W.nodes.forEach(function (nd) { drawSectorMissionNode(c, nd, b); });

    c.strokeStyle = 'rgba(252,238,9,0.30)';
    c.setLineDash([9, 12]);
    W.sectorLinks.forEach(function (link) {
      if (!link._pos) return;
      W.nodes.forEach(function (nd) {
        if (!nd._pos || !nd.unlocked) return;
        c.beginPath();
        c.moveTo(link._pos.x, link._pos.y);
        c.lineTo(nd._pos.x, nd._pos.y);
        c.stroke();
      });
    });
    c.setLineDash([]);

    var op = getOp();
    drawAgentSprite(c, {
      x: b.left + b.w / 2,
      y: b.bottom - 72,
      scale: 0.88,
      look: op.look || { frame: 'ghost', suit: col, accent: '#ff2bd6', hair: '#0c1118', coat: '#08131c' },
      name: op.callsign,
      title: 'OPERATIVE'
    });
    c.restore();
  }

  function drawPlayers(c) {
    var cx = centerX(), cy = centerY(), R = Math.min(W.w, W.h);
    W.players.forEach(function (p) {
      p.a += p.spd * 0.01;
      var x = cx + Math.cos(p.a) * R * p.r, y = cy + Math.sin(p.a) * R * p.r * 0.7;
      c.save(); c.shadowColor = p.color; c.shadowBlur = 8;
      c.beginPath(); c.arc(x, y, 5, 0, 7); c.fillStyle = p.color; c.fill(); c.restore();
      c.font = "9px 'Share Tech Mono',monospace"; c.textAlign = 'center'; c.fillStyle = 'rgba(200,240,247,0.85)';
      c.fillText(p.callsign + ' L' + p.level, x, y - 10);
      // faint tether to core
      c.strokeStyle = 'rgba(0,255,204,0.05)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    });
  }

  function updateParticles(c) {
    for (var i = W.particles.length - 1; i >= 0; i--) {
      var p = W.particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.amb) {
        if (p.x < 0) p.x = W.w; if (p.x > W.w) p.x = 0; if (p.y < 0) p.y = W.h; if (p.y > W.h) p.y = 0;
        c.globalAlpha = 0.5; c.fillStyle = p.color; c.fillRect(p.x, p.y, p.size, p.size); c.globalAlpha = 1;
      } else {
        p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.02;
        if (p.life <= 0) { W.particles.splice(i, 1); continue; }
        c.globalAlpha = p.life; c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); c.globalAlpha = 1;
      }
    }
  }

  // ------------------------------------------------------------ interaction
  function hitTest(mx, my) {
    if (W.view === 'plaza') {
      for (var p = 0; p < PLAZA_NPCS.length; p++) {
        var npc = PLAZA_NPCS[p]; if (!npc._pos) continue;
        if (Math.hypot(mx - npc._pos.x, my - npc._pos.y) <= 30) return { type: 'npc', id: npc.id, npc: npc, x: npc._pos.x, y: npc._pos.y };
      }
      for (var a = 0; a < PLAZA_ACTIVITIES.length; a++) {
        var act = PLAZA_ACTIVITIES[a]; if (!act._pos) continue;
        if (Math.hypot(mx - act._pos.x, my - act._pos.y) <= act.r + 12) return { type: 'activity', id: act.id, activity: act, x: act._pos.x, y: act._pos.y };
      }
      for (var q = 0; q < PLAZA_HOTSPOTS.length; q++) {
        var h = PLAZA_HOTSPOTS[q]; if (!h._pos) continue;
        if (Math.abs(mx - h._pos.x) <= h._pos.w / 2 && Math.abs(my - h._pos.y) <= h._pos.h / 2 + 16) return { type: 'hotspot', id: h.id, hotspot: h, x: h._pos.x, y: h._pos.y };
      }
    } else if (W.view === 'district' && districtScene()) {
      var nodes = districtScene().nodes;
      for (var dn = 0; dn < nodes.length; dn++) {
        var node = nodes[dn]; if (!node._pos) continue;
        var radius = node.kind === 'npc' ? 44 : (node.kind === 'portal' ? 72 : 58);
        if (Math.hypot(mx - node._pos.x, my - node._pos.y) <= radius) {
          return { type: 'district', id: node.id, node: node, x: node._pos.x, y: node._pos.y };
        }
      }
    } else if (W.view === 'grid') {
      for (var i = 0; i < W.sectors.length; i++) {
        var s = W.sectors[i]; if (!s._pos) continue;
        if (Math.hypot(mx - s._pos.x, my - s._pos.y) <= (s._r || 30) + 6) return { type: 'sector', id: s.id, s: s, x: s._pos.x, y: s._pos.y };
      }
    } else {
      for (var sl = 0; sl < W.sectorLinks.length; sl++) {
        var link = W.sectorLinks[sl]; if (!link._pos) continue;
        if (Math.hypot(mx - link._pos.x, my - link._pos.y) <= (link._r || 54)) return { type: 'sectorLink', id: link.id, link: link, x: link._pos.x, y: link._pos.y };
      }
      for (var j = 0; j < W.nodes.length; j++) {
        var nd = W.nodes[j]; if (!nd._pos) continue;
        if (Math.hypot(mx - nd._pos.x, my - nd._pos.y) <= (nd._r || 20) + 6) return { type: 'node', id: nd.id, nd: nd, x: nd._pos.x, y: nd._pos.y };
      }
    }
    return null;
  }
  function onMove(e) {
    var r = W.canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var h = hitTest(mx, my);
    if (h && (!W.hover || W.hover.id !== h.id)) Audio2.blip(900, 0.03, 'sine');
    W.hover = h;
    W.canvas.style.cursor = h ? 'pointer' : 'crosshair';
    if (h) showTip(e.clientX, e.clientY, h); else hideTip();
  }
  function onClick(e) {
    Audio2.resume();
    var r = W.canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var h = hitTest(mx, my);
    if (!h) {
      if (W.view === 'plaza' || W.view === 'district') {
        var b = movementBounds();
        W.avatar.tx = clamp(mx, b.left + 34, b.right - 34);
        W.avatar.ty = clamp(my, b.top + 48, b.bottom - 34);
        W.focus = null;
        setActionPanel(null);
        return;
      }
      if (W.view === 'sector') { /* click empty to stay in sector */ }
      return;
    }
    if (h.type === 'hotspot') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + h.hotspot.h / 2 + 20;
      setActionPanel(h);
      sayInPlaza('System', h.hotspot.title + ' selected.');
    } else if (h.type === 'activity') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + h.activity.r + 28;
      setActionPanel(h);
      sayInPlaza('System', h.activity.title + ' selected.');
    } else if (h.type === 'npc') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + 38;
      setActionPanel(h);
      sayInPlaza(h.npc.name, npcDialogue(h.npc));
    } else if (h.type === 'district') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + (h.node.kind === 'npc' ? 70 : 86);
      setActionPanel(h);
      sayInPlaza(h.node.label || 'District', h.node.title + ' selected.');
    } else if (h.type === 'sector') { openSector(h.id); }
    else if (h.type === 'sectorLink') {
      setActionPanel(h);
      sayInPlaza(h.link.label, h.link.title + ' selected.');
    }
    else if (h.type === 'node') {
      setActionPanel(h);
      sayInPlaza('Node', h.nd.title + ' selected.');
    }
  }
  function showTip(cx, cy, h) {
    var tip = document.getElementById('cwg-tip'); if (!tip) return;
    if (h.type === 'sectorLink') {
      tip.innerHTML = '<div class="tt">' + esc(h.link.title) + '</div><div class="td">' + esc(h.link.desc) + '</div><div class="tr">PORTAL - click to inspect</div>';
      tip.style.display = 'block';
      var linkTw = tip.offsetWidth, linkTh = tip.offsetHeight;
      tip.style.left = clamp(cx + 14, 6, W.w - linkTw - 6) + 'px';
      tip.style.top = clamp(cy + 14, 6, W.h - linkTh - 6) + 'px';
      return;
    }
    if (h.type === 'node') {
      var node = h.nd;
      tip.innerHTML = '<div class="tt">' + esc(node.title) + '</div><div class="td">Tier ' + node.tier + ' / +' + node.xp + ' XP</div><div class="tr">' + (node.done ? 'CLEARED - click to review' : node.unlocked ? 'OPEN - click to inspect' : 'LOCKED') + '</div>';
      tip.style.display = 'block';
      var nodeTw = tip.offsetWidth, nodeTh = tip.offsetHeight;
      tip.style.left = clamp(cx + 14, 6, W.w - nodeTw - 6) + 'px';
      tip.style.top = clamp(cy + 14, 6, W.h - nodeTh - 6) + 'px';
      return;
    }
    if (h.type === 'hotspot') {
      tip.innerHTML = '<div class="tt">' + esc(h.hotspot.title) + '</div><div class="td">' + esc(h.hotspot.desc) + '</div><div class="tr">click to walk here</div>';
    } else if (h.type === 'activity') {
      tip.innerHTML = '<div class="tt">' + esc(h.activity.title) + '</div><div class="td">' + esc(h.activity.desc) + '</div><div class="tr">click to inspect</div>';
    } else if (h.type === 'npc') {
      tip.innerHTML = '<div class="tt">' + esc(h.npc.name) + '</div><div class="td">' + esc(npcDialogue(h.npc)) + '</div><div class="tr">click to talk</div>';
    } else if (h.type === 'district') {
      var status = nodeStatus(h.node);
      tip.innerHTML = '<div class="tt">' + esc(h.node.title) + '</div><div class="td">' + esc(status.state === 'locked' ? status.reason : h.node.desc) + '</div><div class="tr">' + esc(status.label + ' - click to inspect') + '</div>';
    } else if (h.type === 'sector') {
      tip.innerHTML = '<div class="tt">' + esc(h.s.name) + '</div><div class="td">' + h.s.done + ' / ' + h.s.total + ' nodes breached</div><div class="tr">▸ click to enter sector</div>';
    } else {
      var nd = h.nd;
      tip.innerHTML = '<div class="tt">' + esc(nd.title) + '</div><div class="td">Tier ' + nd.tier + ' · +' + nd.xp + ' XP</div><div class="tr">' + (nd.done ? '✅ breached — click to review' : nd.unlocked ? '⚡ click to breach' : '🔒 locked') + '</div>';
    }
    tip.style.display = 'block';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = clamp(cx + 14, 6, W.w - tw - 6) + 'px';
    tip.style.top = clamp(cy + 14, 6, W.h - th - 6) + 'px';
  }
  function hideTip() { var t = document.getElementById('cwg-tip'); if (t) t.style.display = 'none'; }

  // ------------------------------------------------------------ loop
  function startLoop() { if (W.raf) return; (function tick() { if (!W.open) { W.raf = null; return; } draw(); W.raf = requestAnimationFrame(tick); })(); }
  function stopLoop() { if (W.raf) { cancelAnimationFrame(W.raf); W.raf = null; } }

  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  // ------------------------------------------------------------ public API + boot
  function exposeWorldApi() {
    window.__cwWorld = { open: openWorld, close: closeWorld, refresh: function () { refreshData(); }, toGrid: toGrid, toPlaza: toPlaza, toDistrict: toDistrict, toSector: openSector, view: function () { return W.view; } };
  }

  function plazaArtReady() {
    var img = WORLD_ASSETS.plaza;
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function drawCoverImage(c, img, x, y, w, h) {
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var sw = w / scale;
    var sh = h / scale;
    var sx = (img.naturalWidth - sw) / 2;
    var sy = (img.naturalHeight - sh) / 2;
    c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawPlazaArt(c) {
    c.save();
    drawCoverImage(c, WORLD_ASSETS.plaza, 0, 0, W.w, W.h);
    var topShade = c.createLinearGradient(0, 0, 0, W.h * 0.28);
    topShade.addColorStop(0, 'rgba(0,4,10,0.36)');
    topShade.addColorStop(1, 'rgba(0,4,10,0)');
    c.fillStyle = topShade;
    c.fillRect(0, 0, W.w, W.h * 0.28);
    var bottomShade = c.createLinearGradient(0, W.h * 0.74, 0, W.h);
    bottomShade.addColorStop(0, 'rgba(0,4,10,0)');
    bottomShade.addColorStop(1, 'rgba(0,4,10,0.42)');
    c.fillStyle = bottomShade;
    c.fillRect(0, W.h * 0.74, W.w, W.h * 0.26);
    c.restore();
  }

  function drawPlazaAtmosphere(c) {
    c.save();
    c.globalCompositeOperation = 'screen';
    for (var i = 0; i < 18; i++) {
      var lane = i / 18;
      var x = (lane * W.w * 1.3 + W.t * (18 + i * 0.8)) % (W.w + 220) - 110;
      var y = W.h * (0.18 + ((i * 37) % 58) / 100);
      c.globalAlpha = 0.08 + (i % 3) * 0.03;
      c.strokeStyle = i % 2 ? '#00ffcc' : '#ff2bd6';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 86, y - 26);
      c.stroke();
    }
    c.globalAlpha = 0.22;
    c.strokeStyle = '#00e8ff';
    c.lineWidth = 1.4;
    for (var r = 0; r < 4; r++) {
      var px = (W.w * (0.18 + r * 0.21) + Math.sin(W.t * 0.9 + r) * 28);
      var py = W.h * (0.28 + r * 0.075) + Math.cos(W.t * 0.7 + r) * 9;
      c.beginPath();
      c.ellipse(px, py, 18 + r * 5, 5 + r, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 0.18 + Math.sin(W.t * 1.8) * 0.05;
    c.fillStyle = '#ff2bd6';
    c.beginPath();
    c.moveTo(W.w * 0.87, W.h * 0.10);
    c.lineTo(W.w * 0.90, W.h * 0.16);
    c.lineTo(W.w * 0.94, W.h * 0.12);
    c.lineTo(W.w * 0.92, W.h * 0.22);
    c.lineTo(W.w * 0.86, W.h * 0.22);
    c.lineTo(W.w * 0.84, W.h * 0.12);
    c.closePath();
    c.fill();
    c.restore();
  }

  function plazaBounds() {
    if (plazaArtReady()) return { left: 0, right: W.w, top: 0, bottom: W.h };
    var marginX = clamp(W.w * 0.08, 28, 112);
    var top = clamp(W.h * 0.16, 82, 132);
    var bottom = W.h - clamp(W.h * 0.16, 116, 168);
    return { left: marginX, right: W.w - marginX, top: top, bottom: bottom };
  }

  function artSpawnPoint() {
    return { x: W.w * 0.48, y: W.h * 0.535 };
  }

  function districtBounds() {
    var marginX = clamp(W.w * 0.10, 76, 172);
    var top = clamp(W.h * 0.17, 92, 148);
    var bottom = W.h - clamp(W.h * 0.15, 104, 150);
    return { left: marginX, right: W.w - marginX, top: top, bottom: bottom };
  }

  function movementBounds() {
    return W.view === 'district' ? districtBounds() : plazaBounds();
  }

  function districtSpawnPoint() {
    var b = districtBounds();
    return { x: (b.left + b.right) / 2, y: b.bottom - 56 };
  }

  function districtPoint(node, b) {
    return {
      x: lerp(b.left, b.right, node.x),
      y: lerp(b.top, b.bottom, node.y)
    };
  }

  function drawDistrictView(c) {
    initAvatar();
    updateAvatar();
    var scene = districtScene();
    if (!scene) { toPlaza(); return; }
    var b = districtBounds();
    if (W.root) W.root.dataset.art = 'district';
    drawDistrictRoom(c, scene, b);
    drawDistrictConnections(c, scene, b);
    drawDistrictNodes(c, scene, b);
    drawAvatar(c);
    drawPlazaBubble(c);
  }

  function drawDistrictRoom(c, scene, b) {
    var color = scene.color || '#00ffcc';
    var accent = scene.accent || '#ff2bd6';
    var cx = (b.left + b.right) / 2;
    var floorTop = b.top + (b.bottom - b.top) * 0.42;
    c.save();
    var bg = c.createRadialGradient(cx, floorTop, 20, cx, floorTop, Math.max(W.w, W.h) * 0.7);
    bg.addColorStop(0, 'rgba(8,24,34,0.96)');
    bg.addColorStop(0.58, scene.type === 'storm' ? 'rgba(30,4,30,0.95)' : 'rgba(4,15,24,0.95)');
    bg.addColorStop(1, '#01040a');
    c.fillStyle = bg;
    c.fillRect(0, 0, W.w, W.h);

    c.fillStyle = 'rgba(2, 9, 15, 0.88)';
    roundRect(c, b.left, b.top, b.right - b.left, b.bottom - b.top, 18);
    c.fill();
    c.strokeStyle = color;
    c.globalAlpha = 0.24;
    c.lineWidth = 1.5;
    c.stroke();
    c.globalAlpha = 1;

    c.fillStyle = 'rgba(1,6,11,0.82)';
    c.beginPath();
    c.moveTo(b.left + 18, b.top + 14);
    c.lineTo(b.right - 18, b.top + 14);
    c.lineTo(b.right - 72, floorTop + 22);
    c.lineTo(b.left + 72, floorTop + 22);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.stroke();

    c.fillStyle = 'rgba(2,12,18,0.88)';
    c.beginPath();
    c.moveTo(b.left + 72, floorTop);
    c.lineTo(b.right - 72, floorTop);
    c.lineTo(b.right - 12, b.bottom - 6);
    c.lineTo(b.left + 12, b.bottom - 6);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.stroke();

    c.strokeStyle = color;
    c.globalAlpha = 0.18;
    c.lineWidth = 1;
    for (var i = 0; i <= 8; i++) {
      var t = i / 8;
      var x1 = lerp(cx, b.left + 42, t);
      var x2 = lerp(cx, b.right - 42, t);
      c.beginPath(); c.moveTo(x1, floorTop); c.lineTo(b.left + t * (b.right - b.left), b.bottom - 10); c.stroke();
      if (i > 0) { c.beginPath(); c.moveTo(x2, floorTop); c.lineTo(b.right - t * (b.right - b.left), b.bottom - 10); c.stroke(); }
    }
    for (var r = 0; r < 7; r++) {
      var yy = lerp(floorTop + 16, b.bottom - 18, r / 6);
      c.globalAlpha = 0.08 + r * 0.018;
      c.beginPath();
      c.moveTo(lerp(cx, b.left + 18, r / 6), yy);
      c.lineTo(lerp(cx, b.right - 18, r / 6), yy);
      c.stroke();
    }
    c.globalAlpha = 1;

    c.font = "700 28px 'VT323',monospace";
    c.textAlign = 'center';
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 14;
    c.fillText(scene.label, cx, b.top + 46);
    c.font = "700 11px 'Share Tech Mono',monospace";
    c.fillStyle = '#dffbff';
    c.shadowBlur = 0;
    c.fillText(scene.subtitle, cx, b.top + 66);

    drawDistrictSetDressing(c, scene, b, floorTop, color, accent);
    c.restore();
  }

  function drawDistrictSetDressing(c, scene, b, floorTop, color, accent) {
    var cx = (b.left + b.right) / 2;
    c.save();
    c.globalCompositeOperation = 'screen';
    if (scene.type === 'storm') {
      c.strokeStyle = '#ff2bd6';
      c.lineWidth = 5;
      c.shadowColor = '#ff2bd6';
      c.shadowBlur = 34;
      c.beginPath(); c.ellipse(cx, floorTop - 4, 112 + Math.sin(W.t * 2) * 5, 58, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#fcee09';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx - 34, floorTop - 68); c.lineTo(cx, floorTop - 106); c.lineTo(cx + 34, floorTop - 68); c.stroke();
    } else if (scene.type === 'cave') {
      c.strokeStyle = '#7CFF6B';
      c.lineWidth = 3;
      c.shadowColor = '#7CFF6B';
      c.shadowBlur = 18;
      for (var rib = 0; rib < 5; rib++) {
        var rr = 78 + rib * 32 + Math.sin(W.t + rib) * 3;
        c.beginPath(); c.ellipse(cx, floorTop + 34, rr, 34 + rib * 9, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      }
    } else if (scene.type === 'field') {
      c.strokeStyle = '#7CFF6B';
      c.lineWidth = 2;
      c.shadowColor = '#7CFF6B';
      c.shadowBlur = 16;
      for (var lane = 0; lane < 4; lane++) {
        var y = floorTop + 28 + lane * 28;
        c.setLineDash([14, 12]);
        c.lineDashOffset = -W.t * (28 + lane * 4);
        c.beginPath(); c.moveTo(b.left + 92, y); c.lineTo(b.right - 92, y); c.stroke();
      }
      c.setLineDash([]);
    } else if (scene.type === 'soc') {
      c.shadowColor = '#00e8ff';
      c.shadowBlur = 12;
      for (var m = 0; m < 7; m++) {
        var mx = lerp(b.left + 106, b.right - 106, m / 6);
        var my = b.top + 96 + (m % 2) * 26;
        c.strokeStyle = m % 3 ? '#00e8ff' : '#7CFF6B';
        c.lineWidth = 1.5;
        roundRect(c, mx - 48, my, 96, 46, 5);
        c.stroke();
        c.fillStyle = m % 3 ? 'rgba(0,232,255,0.08)' : 'rgba(124,255,107,0.08)';
        c.fill();
        c.beginPath(); c.moveTo(mx - 34, my + 30); c.lineTo(mx - 14, my + 19); c.lineTo(mx + 5, my + 25); c.lineTo(mx + 36, my + 12); c.stroke();
      }
    } else if (scene.type === 'lab') {
      c.strokeStyle = '#4db5ff';
      c.lineWidth = 2;
      c.shadowColor = '#4db5ff';
      c.shadowBlur = 12;
      roundRect(c, b.right - 246, b.top + 86, 178, 86, 8);
      c.stroke();
      c.fillStyle = 'rgba(77,181,255,0.08)';
      c.fill();
      c.fillStyle = '#fcee09';
      for (var badge = 0; badge < 3; badge++) {
        c.beginPath(); c.arc(b.right - 214 + badge * 44, b.top + 122, 10, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#ff2bd6';
      roundRect(c, b.left + 82, b.top + 96, 150, 72, 7);
      c.stroke();
      c.fillStyle = 'rgba(255,43,214,0.08)';
      c.fill();
    } else if (scene.type === 'map') {
      var ref = WORLD_ASSETS.storybook;
      if (ref && ref.complete && ref.naturalWidth > 0) {
        c.globalAlpha = 0.24;
        drawCoverImage(c, ref, b.left + 40, b.top + 88, 260, 146);
        c.globalAlpha = 1;
        c.strokeStyle = '#fcee09';
        c.lineWidth = 1.5;
        roundRect(c, b.left + 40, b.top + 88, 260, 146, 8);
        c.stroke();
      }
      c.strokeStyle = '#00ffcc';
      c.lineWidth = 1.5;
      c.shadowColor = '#00ffcc';
      c.shadowBlur = 12;
      c.beginPath(); c.arc(cx, floorTop + 84, 138, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(cx, floorTop + 84, 86, 0, Math.PI * 2); c.stroke();
    } else {
      for (var p = 0; p < 4; p++) {
        var x = lerp(b.left + 130, b.right - 130, p / 3);
        c.strokeStyle = p % 2 ? accent : color;
        c.lineWidth = 1.5;
        roundRect(c, x - 48, b.top + 92 + (p % 2) * 18, 96, 54, 7);
        c.fillStyle = p % 2 ? 'rgba(255,43,214,0.08)' : 'rgba(0,255,204,0.08)';
        c.fill();
        c.stroke();
      }
    }
    c.restore();
  }

  function drawDistrictConnections(c, scene, b) {
    var start = districtSpawnPoint();
    c.save();
    c.setLineDash([8, 12]);
    c.lineDashOffset = -W.t * 38;
    c.lineWidth = 2;
    scene.nodes.forEach(function (node) {
      if (node.action === 'plaza') return;
      var p = districtPoint(node, b);
      c.strokeStyle = node.color || scene.color;
      c.globalAlpha = W.focus && W.focus.id === node.id ? 0.52 : 0.18;
      c.beginPath();
      c.moveTo(start.x, start.y);
      c.quadraticCurveTo((start.x + p.x) / 2, Math.min(start.y, p.y) - 38, p.x, p.y + 12);
      c.stroke();
    });
    c.restore();
  }

  function drawDistrictNodes(c, scene, b) {
    scene.nodes.forEach(function (node, i) {
      var p = districtPoint(node, b);
      node._pos = p;
      var hover = W.hover && W.hover.type === 'district' && W.hover.id === node.id;
      var focus = W.focus && W.focus.type === 'district' && W.focus.id === node.id;
      var status = nodeStatus(node);
      var locked = status.state === 'locked';
      var cleared = status.state === 'done';
      var color = locked ? '#60727c' : (cleared ? '#00ff9c' : (node.color || scene.color));
      c.save();
      c.globalAlpha = locked ? 0.58 : 1;
      if (node.kind === 'npc') {
        var look = NPC_LOOKS[node.look] || NPC_LOOKS[node.id] || NPC_LOOKS.mentor;
        drawAgentSprite(c, {
          x: p.x,
          y: p.y + 42,
          scale: 0.92,
          dir: i % 2 ? -1 : 1,
          seed: i * 2.1,
          look: look,
          hover: hover || focus,
          label: node.label,
          title: node.title,
          labelColor: color
        });
        drawTalkBubble(c, p.x + 28, p.y - 36, hover || focus ? 'TALK' : '');
      } else if (node.kind === 'portal') {
        c.shadowColor = color;
        c.shadowBlur = hover || focus ? 32 : 18;
        c.strokeStyle = color;
        c.lineWidth = hover || focus ? 4 : 2.4;
        c.beginPath(); c.ellipse(p.x, p.y, 46 + Math.sin(W.t * 4 + i) * 3, 68, 0, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.ellipse(p.x, p.y, 25, 42 + Math.sin(W.t * 5 + i) * 2, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(1,8,14,0.72)';
        c.beginPath(); c.ellipse(p.x, p.y + 54, 54, 13, 0, 0, Math.PI * 2); c.fill();
      } else if (node.kind === 'door') {
        c.shadowColor = color;
        c.shadowBlur = hover || focus ? 18 : 8;
        c.fillStyle = 'rgba(5,12,18,0.92)';
        c.strokeStyle = color;
        c.lineWidth = hover || focus ? 3 : 1.5;
        roundRect(c, p.x - 42, p.y - 60, 84, 100, 7); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.18)';
        c.beginPath(); c.moveTo(p.x, p.y - 54); c.lineTo(p.x, p.y + 34); c.stroke();
      } else {
        c.shadowColor = color;
        c.shadowBlur = hover || focus ? 22 : 10;
        c.fillStyle = 'rgba(2,10,16,0.92)';
        c.strokeStyle = color;
        c.lineWidth = hover || focus ? 3 : 1.6;
        roundRect(c, p.x - 56, p.y - 38, 112, 76, 8); c.fill(); c.stroke();
        c.fillStyle = color;
        c.globalAlpha = locked ? 0.28 : 0.18 + Math.sin(W.t * 3 + i) * 0.05;
        c.fillRect(p.x - 44, p.y - 25, 88, 36);
        c.globalAlpha = locked ? 0.58 : 1;
        c.fillStyle = '#eafcff';
        c.fillRect(p.x - 38, p.y + 21, 76, 5);
      }
      c.restore();

      if (node.kind !== 'npc') {
        c.save();
        c.font = "700 10px 'Share Tech Mono',monospace";
        c.textAlign = 'center';
        c.fillStyle = color;
        c.shadowColor = '#001018';
        c.shadowBlur = 5;
        c.fillText(node.label, p.x, p.y + 88);
        c.font = "700 9px 'Share Tech Mono',monospace";
        c.fillStyle = locked ? '#ffb454' : (cleared ? '#00ff9c' : '#dffbff');
        c.fillText(status.label, p.x, p.y + 101);
        c.restore();
      }

      if (hover || focus) {
        drawTextPill(c, node.title, p.x, Math.max(90, p.y - 88), color);
      }
    });
  }

  function drawOriginPadMask(c) {
    var p = artSpawnPoint();
    c.save();
    var veil = c.createRadialGradient(p.x, p.y - 48, 8, p.x, p.y - 32, 120);
    veil.addColorStop(0, 'rgba(3,13,22,1)');
    veil.addColorStop(0.58, 'rgba(3,13,22,0.96)');
    veil.addColorStop(1, 'rgba(3,13,22,0)');
    c.fillStyle = veil;
    c.fillRect(p.x - 128, p.y - 132, 256, 184);
    c.fillStyle = 'rgba(2,14,24,0.96)';
    roundRect(c, p.x - 78, p.y - 116, 156, 86, 10);
    c.fill();
    c.strokeStyle = 'rgba(0,232,255,0.28)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = 'rgba(0,232,255,0.08)';
    for (var i = 0; i < 5; i++) {
      c.fillRect(p.x - 66 + i * 28, p.y - 104, 14, 64);
    }
    c.strokeStyle = 'rgba(0,255,204,0.22)';
    for (var gy = -100; gy <= -42; gy += 14) {
      c.beginPath(); c.moveTo(p.x - 70, p.y + gy); c.lineTo(p.x + 70, p.y + gy); c.stroke();
    }
    c.globalCompositeOperation = 'screen';
    c.strokeStyle = 'rgba(0,255,204,0.42)';
    c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(p.x, p.y + 8, 36, 12, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,43,214,0.30)';
    c.beginPath(); c.ellipse(p.x, p.y - 1, 54, 17, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(0,232,255,0.22)';
    c.beginPath(); c.moveTo(p.x - 42, p.y + 8); c.lineTo(p.x + 42, p.y + 8); c.stroke();
    c.beginPath(); c.moveTo(p.x, p.y - 20); c.lineTo(p.x, p.y + 26); c.stroke();
    c.restore();
  }

  function initAvatar() {
    if (W.avatar.ready) return;
    var b = movementBounds();
    if (W.view === 'district') {
      var d = districtSpawnPoint();
      W.avatar.x = d.x;
      W.avatar.y = d.y;
    } else if (plazaArtReady()) {
      var p = artSpawnPoint();
      W.avatar.x = p.x;
      W.avatar.y = p.y;
    } else {
      W.avatar.x = (b.left + b.right) / 2;
      W.avatar.y = b.top + (b.bottom - b.top) * 0.56;
    }
    W.avatar.tx = W.avatar.x;
    W.avatar.ty = W.avatar.y;
    W.avatar.ready = true;
  }

  function plazaPoint(item) {
    var b = plazaBounds();
    return {
      x: lerp(b.left, b.right, item.x),
      y: lerp(b.top, b.bottom, item.y),
      w: item.w,
      h: item.h
    };
  }

  function drawPlazaView(c) {
    initAvatar();
    updateAvatar();
    var b = plazaBounds();
    var hasArt = plazaArtReady();
    if (W.root) W.root.dataset.art = hasArt ? 'plaza' : 'fallback';
    if (hasArt) {
      drawPlazaArt(c);
      drawOriginPadMask(c);
      drawPlazaAtmosphere(c);
    } else {
      drawPlazaSkyline(c, b);
      drawPlazaFloor(c, b);
    }
    drawPlazaRoutes(c, b, hasArt);
    drawPlazaHotspots(c, hasArt);
    drawPlazaActivities(c, hasArt);
    drawPlazaCrowd(c, hasArt);
    drawPlazaNpcs(c, hasArt);
    drawAvatar(c);
    drawPlazaBubble(c);
  }

  function drawPlazaSkyline(c, b) {
    c.save();
    var y = Math.max(74, b.top - 78);
    c.fillStyle = 'rgba(0, 8, 16, 0.88)';
    c.fillRect(0, 0, W.w, b.top + 36);
    for (var i = 0; i < 22; i++) {
      var bw = 42 + (i % 5) * 13;
      var bh = 44 + ((i * 31) % 72);
      var x = (i * 79 + Math.sin(i) * 28) % (W.w + 80) - 40;
      c.fillStyle = i % 3 === 0 ? 'rgba(7,22,35,0.95)' : 'rgba(3,15,28,0.95)';
      c.fillRect(x, y + 78 - bh, bw, bh);
      c.strokeStyle = i % 4 === 0 ? 'rgba(255,43,214,0.20)' : 'rgba(0,232,255,0.20)';
      c.strokeRect(x + 0.5, y + 78 - bh + 0.5, bw - 1, bh - 1);
      c.fillStyle = i % 4 === 0 ? 'rgba(255,43,214,0.55)' : 'rgba(252,238,9,0.45)';
      for (var wy = y + 88 - bh; wy < y + 60; wy += 17) {
        for (var wx = x + 8; wx < x + bw - 8; wx += 17) {
          if ((wx + wy + i) % 3) c.fillRect(wx, wy, 5, 7);
        }
      }
    }
    c.restore();
  }

  function drawPlazaFloor(c, b) {
    c.save();
    c.fillStyle = 'rgba(1, 8, 14, 0.72)';
    c.strokeStyle = 'rgba(0,255,204,0.2)';
    c.lineWidth = 1.5;
    roundRect(c, b.left, b.top, b.right - b.left, b.bottom - b.top, 18);
    c.fill();
    c.stroke();
    var cx = (b.left + b.right) / 2;
    var cy = b.top + (b.bottom - b.top) * 0.55;
    var grd = c.createRadialGradient(cx, cy, 12, cx, cy, Math.max(b.right - b.left, b.bottom - b.top) * 0.55);
    grd.addColorStop(0, 'rgba(0,255,204,0.18)');
    grd.addColorStop(0.42, 'rgba(255,43,214,0.07)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grd;
    c.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    c.strokeStyle = 'rgba(255,255,255,0.045)';
    for (var x = b.left + 30; x < b.right; x += 54) { c.beginPath(); c.moveTo(x, b.top); c.lineTo(x, b.bottom); c.stroke(); }
    for (var y = b.top + 30; y < b.bottom; y += 54) { c.beginPath(); c.moveTo(b.left, y); c.lineTo(b.right, y); c.stroke(); }
    c.strokeStyle = 'rgba(0,255,204,0.22)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(b.left + 40, cy); c.lineTo(b.right - 40, cy); c.stroke();
    c.beginPath(); c.moveTo(cx, b.top + 38); c.lineTo(cx, b.bottom - 38); c.stroke();
    c.fillStyle = 'rgba(252,238,9,0.08)';
    roundRect(c, cx - 125, cy - 42, 250, 84, 14);
    c.fill();
    c.fillStyle = 'rgba(0,232,255,0.09)';
    c.beginPath();
    c.ellipse(cx, cy + 4, 88 + Math.sin(W.t * 2) * 3, 30, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    drawTextPill(c, 'CITY GATE PLAZA', cx, b.top + 34, '#fcee09');
  }

  function drawPlazaRoutes(c, b, hasArt) {
    var cx = (b.left + b.right) / 2;
    var cy = b.top + (b.bottom - b.top) * 0.56;
    c.save();
    if (hasArt) {
      var moving = Math.hypot(W.avatar.tx - W.avatar.x, W.avatar.ty - W.avatar.y) > 8;
      if (moving) {
        c.setLineDash([9, 11]);
        c.lineDashOffset = -W.t * 46;
        c.lineWidth = 4;
        c.strokeStyle = 'rgba(0,232,255,0.82)';
        c.shadowColor = '#00e8ff';
        c.shadowBlur = 14;
        c.beginPath();
        c.moveTo(W.avatar.x, W.avatar.y + 10);
        c.quadraticCurveTo((W.avatar.x + W.avatar.tx) / 2, Math.min(W.avatar.y, W.avatar.ty) - 34, W.avatar.tx, W.avatar.ty);
        c.stroke();
        c.setLineDash([]);
      }
      c.strokeStyle = 'rgba(0,232,255,0.88)';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(W.avatar.tx, W.avatar.ty + 8, 26 + Math.sin(W.t * 7) * 2, 9, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
      return;
    }
    c.setLineDash([10, 13]);
    c.lineDashOffset = -W.t * 34;
    c.lineWidth = 2;
    PLAZA_HOTSPOTS.forEach(function (h) {
      var p = plazaPoint(h);
      c.strokeStyle = h.color.replace(')', ',0.26)');
      if (c.strokeStyle === h.color) c.strokeStyle = h.color;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(cx, cy);
      c.quadraticCurveTo((cx + p.x) / 2, cy - 48, p.x, p.y + p.h / 2 + 14);
      c.stroke();
    });
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.restore();
  }

  function drawPlazaHotspots(c, hasArt) {
    PLAZA_HOTSPOTS.forEach(function (h) {
      var p = plazaPoint(h);
      h._pos = p;
      var hover = W.hover && W.hover.type === 'hotspot' && W.hover.id === h.id;
      var focus = W.focus && W.focus.type === 'hotspot' && W.focus.id === h.id;
      if (hasArt) {
        var footY = p.y + p.h * 0.34;
        c.save();
        c.globalAlpha = hover || focus ? 1 : 0.48;
        c.shadowColor = h.color;
        c.shadowBlur = hover || focus ? 24 : 10;
        c.strokeStyle = h.color;
        c.lineWidth = hover || focus ? 3 : 1.5;
        c.beginPath();
        c.ellipse(p.x, footY, clamp(p.w * 0.28, 42, 78), 14, 0, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([5, 8]);
        c.lineDashOffset = -W.t * 22;
        c.strokeStyle = 'rgba(255,255,255,0.32)';
        c.beginPath();
        c.ellipse(p.x, footY, clamp(p.w * 0.36, 54, 98), 22, 0, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.restore();
        if (hover || focus) {
          drawTextPill(c, h.title, p.x, Math.max(80, p.y - p.h * 0.52), h.color);
        }
        return;
      }
      c.save();
      c.shadowColor = h.color;
      c.shadowBlur = hover || focus ? 28 : 14;
      c.fillStyle = focus ? 'rgba(12,24,28,0.98)' : 'rgba(3,14,20,0.9)';
      c.strokeStyle = h.color;
      c.lineWidth = hover || focus ? 3 : 1.5;
      roundRect(c, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 12);
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(p.x - p.w / 2 + 10, p.y - p.h / 2 + 10, p.w - 20, 10);
      c.fillStyle = 'rgba(0,0,0,0.24)';
      c.fillRect(p.x - p.w / 2 + 12, p.y + p.h / 2 - 22, p.w - 24, 13);
      if (h.kind === 'portal' || h.kind === 'gate') {
        c.strokeStyle = h.color;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(p.x, p.y + 4, Math.min(p.w, p.h) * 0.28 + Math.sin(W.t * 3) * 2, 0, Math.PI * 2);
        c.stroke();
      } else if (h.kind === 'academy' || h.kind === 'cafe') {
        c.fillStyle = h.color;
        for (var i = 0; i < 4; i++) c.fillRect(p.x - 54 + i * 28, p.y - 28, 13, 20);
      } else if (h.kind === 'console') {
        c.strokeStyle = h.color;
        c.beginPath();
        c.arc(p.x, p.y - 2, 25, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      c.fillStyle = h.color;
      c.font = "700 20px 'VT323',monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(h.icon, p.x, p.y - 10);
      c.font = "700 11px 'Share Tech Mono',monospace";
      c.fillStyle = '#eafcff';
      c.fillText(h.label, p.x, p.y + 15);
      c.strokeStyle = 'rgba(255,255,255,0.14)';
      c.beginPath(); c.arc(p.x, p.y + p.h / 2 + 12, 34, 0, Math.PI * 2); c.stroke();
    });
  }

  function drawPlazaActivities(c, hasArt) {
    PLAZA_ACTIVITIES.forEach(function (a) {
      var p = plazaPoint({ x: a.x, y: a.y, w: a.r * 2, h: a.r * 2 });
      a._pos = p;
      var hover = W.hover && W.hover.type === 'activity' && W.hover.id === a.id;
      var focus = W.focus && W.focus.type === 'activity' && W.focus.id === a.id;
      if (hasArt) {
        c.save();
        c.globalAlpha = hover || focus ? 1 : 0.58;
        c.shadowColor = a.color;
        c.shadowBlur = hover || focus ? 22 : 10;
        c.strokeStyle = a.color;
        c.lineWidth = hover || focus ? 3 : 1.5;
        c.beginPath();
        c.arc(p.x, p.y, a.r + Math.sin(W.t * 4) * 2, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = 'rgba(1,8,14,0.64)';
        c.beginPath();
        c.arc(p.x, p.y, 13, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = a.color;
        c.font = "700 16px 'VT323',monospace";
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(a.icon, p.x, p.y);
        c.restore();
        if (hover || focus) drawTextPill(c, a.title, p.x, p.y - a.r - 18, a.color);
        return;
      }
      c.save();
      c.shadowColor = a.color;
      c.shadowBlur = hover || focus ? 24 : 11;
      c.fillStyle = focus ? 'rgba(21,19,7,0.96)' : 'rgba(3,12,18,0.9)';
      c.strokeStyle = a.color;
      c.lineWidth = hover || focus ? 3 : 1.5;
      c.beginPath();
      c.arc(p.x, p.y, a.r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.beginPath();
      c.arc(p.x, p.y, a.r + 8 + Math.sin(W.t * 4) * 2, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = a.color;
      c.font = "700 17px 'VT323',monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(a.icon, p.x, p.y - 1);
      c.restore();
      c.font = "700 9px 'Share Tech Mono',monospace";
      c.textAlign = 'center';
      c.fillStyle = '#dffbff';
      c.fillText(a.label, p.x, p.y + a.r + 18);
    });
  }

  function drawAgentSprite(c, cfg) {
    cfg = cfg || {};
    var look = cfg.look || {};
    var x = cfg.x || 0;
    var y = cfg.y || 0;
    var scale = cfg.scale || 1;
    var dir = cfg.dir || 1;
    var seed = cfg.seed || 0;
    var variant = look.frame || cfg.variant || 'sentinel';
    var suit = look.suit || '#00ffcc';
    var accent = look.accent || '#4db5ff';
    var hair = look.hair || '#101827';
    var skin = look.skin || '#bd755b';
    var coat = look.coat || '#07111a';
    var moving = !!cfg.moving;
    var hover = !!cfg.hover;
    var bob = Math.sin(W.t * (moving ? 9.5 : 4.4) + seed) * (moving ? 2.4 : 1.1);
    var stride = moving ? Math.sin(W.t * 10.5 + seed) * 3.2 : Math.sin(W.t * 2.3 + seed) * 0.45;
    var lean = Math.sin(W.t * 6 + seed) * (moving ? 0.045 : 0.016);
    var bot = variant === 'bot';
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(x, y + bob);
    c.scale(scale * dir, scale);
    c.fillStyle = 'rgba(0,0,0,0.48)';
    c.beginPath(); c.ellipse(0, 11, hover ? 32 : 27, hover ? 10 : 8, 0, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'screen';
    c.strokeStyle = accent;
    c.globalAlpha = hover ? 0.72 : 0.42;
    c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, 9, 35, 11, 0, 0, Math.PI * 2); c.stroke();
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.rotate(lean);

    if (bot) {
      c.shadowColor = accent;
      c.shadowBlur = hover ? 16 : 8;
      c.fillStyle = '#07131b';
      roundRect(c, -21, -50, 42, 44, 8); c.fill();
      c.fillStyle = suit;
      roundRect(c, -17, -47, 34, 38, 6); c.fill();
      c.strokeStyle = '#1c3140';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = coat;
      roundRect(c, -11, -36, 22, 19, 4); c.fill();
      c.fillStyle = accent;
      c.fillRect(-7, -30, 14, 5);
      c.fillRect(-3, -22, 6, 5);
      c.fillStyle = '#eafcff';
      c.fillRect(-27, -43, 10, 24);
      c.fillRect(17, -43, 10, 24);
      c.fillStyle = accent;
      c.fillRect(-27, -22, 10, 5);
      c.fillRect(17, -22, 10, 5);
      c.fillStyle = '#f4fbff';
      c.fillRect(-14 + stride * 0.2, -12, 10, 24);
      c.fillRect(4 - stride * 0.2, -12, 10, 24);
      c.fillStyle = '#304b5c';
      c.fillRect(-15 + stride * 0.32, 11, 12, 5);
      c.fillRect(3 - stride * 0.32, 11, 12, 5);
      c.fillStyle = '#f4fbff';
      roundRect(c, -19, -77, 38, 31, 9); c.fill();
      c.strokeStyle = '#2b4555';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = '#082031';
      roundRect(c, -13, -68, 26, 10, 4); c.fill();
      c.fillStyle = accent;
      c.fillRect(-9, -65, 6, 3);
      c.fillRect(4, -65, 6, 3);
      c.strokeStyle = accent;
      c.beginPath(); c.moveTo(0, -77); c.lineTo(0, -86); c.stroke();
      c.fillStyle = '#fcee09';
      c.beginPath(); c.arc(0, -88, 3, 0, Math.PI * 2); c.fill();
    } else {
      c.shadowColor = accent;
      c.shadowBlur = hover ? 15 : 7;
      if (variant === 'ghost' || variant === 'runner') {
        c.fillStyle = variant === 'ghost' ? '#060b13' : coat;
        c.beginPath();
        c.moveTo(-23, -58);
        c.lineTo(23, -58);
        c.lineTo(29, -8);
        c.lineTo(12, 7);
        c.lineTo(0, -4);
        c.lineTo(-12, 7);
        c.lineTo(-29, -8);
        c.closePath();
        c.fill();
      }
      c.fillStyle = '#061018';
      c.fillRect(-13 + stride * 0.22, -13, 9, 27);
      c.fillRect(4 - stride * 0.22, -13, 9, 27);
      c.fillStyle = suit;
      c.fillRect(-14 + stride * 0.36, 12, 11, 5);
      c.fillRect(3 - stride * 0.36, 12, 11, 5);
      c.fillStyle = '#081722';
      c.fillRect(-27, -42, 9, 31);
      c.fillRect(18, -42, 9, 31);
      c.fillStyle = accent;
      c.fillRect(-26, -25, 4, 13);
      c.fillRect(22, -25, 4, 13);
      c.fillStyle = variant === 'sentinel' ? suit : coat;
      roundRect(c, -20, -51, 40, 45, 6); c.fill();
      c.strokeStyle = variant === 'sentinel' ? '#bdfcff' : suit;
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = '#020910';
      roundRect(c, -12, -36, 24, 24, 4); c.fill();
      c.fillStyle = accent;
      c.fillRect(-8, -31, 16, 5);
      c.fillRect(-3, -23, 6, 7);
      c.fillStyle = suit;
      c.fillRect(-18, -47, 5, 34);
      c.fillRect(13, -47, 5, 34);
      if (variant === 'sentinel') {
        c.fillStyle = 'rgba(220,245,255,0.92)';
        roundRect(c, -27, -48, 12, 22, 5); c.fill();
        roundRect(c, 15, -48, 12, 22, 5); c.fill();
        c.strokeStyle = accent;
        c.stroke();
      }
      if (variant === 'tinker') {
        c.strokeStyle = '#fcee09';
        c.lineWidth = 1.4;
        c.beginPath(); c.arc(24, -59, 8 + Math.sin(W.t * 5 + seed), 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#fcee09';
        c.fillRect(21, -62, 6, 6);
      }
      c.fillStyle = skin;
      roundRect(c, -14, -68, 28, 27, 8); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.42)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = hair;
      if (variant === 'ghost' || variant === 'runner') {
        c.beginPath();
        c.moveTo(-20, -63);
        c.quadraticCurveTo(0, -82, 20, -63);
        c.lineTo(15, -50);
        c.lineTo(-15, -50);
        c.closePath();
        c.fill();
      } else {
        c.fillRect(-18, -72, 36, 14);
        c.fillRect(-20, -64, 9, 12);
        c.fillRect(11, -64, 9, 11);
        c.fillRect(-10, -75, 14, 6);
      }
      c.fillStyle = accent;
      c.shadowColor = accent;
      c.shadowBlur = 7;
      c.fillRect(-10, -56, 20, 4);
      c.fillStyle = 'rgba(255,255,255,0.65)';
      c.fillRect(6, -55, 3, 2);
    }
    c.restore();
    if (cfg.label) {
      c.save();
      c.font = "700 " + (cfg.player ? 11 : 10) + "px 'Share Tech Mono',monospace";
      c.textAlign = 'center';
      c.fillStyle = cfg.labelColor || accent;
      c.shadowColor = '#001018';
      c.shadowBlur = 5;
      c.fillText(cfg.label, x, y - 76 * scale);
      if (cfg.title) {
        c.font = "700 8px 'Share Tech Mono',monospace";
        c.fillStyle = '#dffbff';
        c.fillText(cfg.title, x, y - 63 * scale);
      }
      c.restore();
    }
  }

  function drawPlazaCrowd(c, hasArt) {
    if (!hasArt) return;
    PLAZA_CROWD.forEach(function (agent, i) {
      var p = plazaPoint({ x: agent.x, y: agent.y, w: 1, h: 1 });
      var footY = p.y + 31;
      var scale = clamp(0.58 + p.y / Math.max(1, W.h) * 0.28, 0.62, 0.82);
      drawAgentSprite(c, {
        x: p.x,
        y: footY,
        scale: scale,
        dir: agent.dir || 1,
        seed: i * 1.7,
        look: agent.look,
        moving: false,
        label: false
      });
    });
  }

  function drawPlazaNpcs(c, hasArt) {
    PLAZA_NPCS.forEach(function (npc) {
      var p = plazaPoint({ x: npc.x, y: npc.y, w: 1, h: 1 });
      var footY = hasArt ? p.y + 31 : p.y + 16;
      npc._pos = { x: p.x, y: footY - 20 };
      var hover = W.hover && W.hover.type === 'npc' && W.hover.id === npc.id;
      var look = NPC_LOOKS[npc.id] || { frame: 'sentinel', suit: npc.color, accent: npc.color, hair: '#101827', coat: '#07111a' };
      var scale = hasArt ? clamp(0.62 + p.y / Math.max(1, W.h) * 0.25, 0.68, 0.86) : 0.82;
      if (hasArt) {
        drawAgentSprite(c, {
          x: p.x,
          y: footY,
          scale: scale,
          dir: npc.id === 'mentor' ? -1 : 1,
          seed: (npc.id.charCodeAt(0) || 1) * 0.1,
          look: look,
          hover: hover,
          label: npc.name,
          title: npc.title || 'NPC',
          labelColor: npc.color
        });
        drawTalkBubble(c, p.x + 26 * scale, footY - 82 * scale, hover ? 'TALK' : '');
        return;
      }
      drawAgentSprite(c, {
        x: p.x,
        y: footY,
        scale: scale,
        dir: npc.id === 'mentor' ? -1 : 1,
        seed: (npc.id.charCodeAt(0) || 1) * 0.1,
        look: look,
        hover: hover,
        label: npc.name,
        title: npc.title || 'NPC',
        labelColor: npc.color
      });
    });
  }

  function updateAvatar() {
    var b = movementBounds();
    var dx = (W.keys.ArrowRight || W.keys.d ? 1 : 0) - (W.keys.ArrowLeft || W.keys.a ? 1 : 0);
    var dy = (W.keys.ArrowDown || W.keys.s ? 1 : 0) - (W.keys.ArrowUp || W.keys.w ? 1 : 0);
    if (dx || dy) {
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      W.avatar.tx = clamp(W.avatar.x + dx * 18, b.left + 34, b.right - 34);
      W.avatar.ty = clamp(W.avatar.y + dy * 18, b.top + 48, b.bottom - 34);
      if (dx) W.avatar.dir = dx > 0 ? 1 : -1;
    }
    var vx = W.avatar.tx - W.avatar.x;
    var vy = W.avatar.ty - W.avatar.y;
    var d = Math.sqrt(vx * vx + vy * vy);
    if (d > 1) {
      var step = Math.min(d, 2.35);
      W.avatar.x += vx / d * step;
      W.avatar.y += vy / d * step;
      if (Math.abs(vx) > 0.5) W.avatar.dir = vx > 0 ? 1 : -1;
    }
    W.avatar.moving = d > 1.4 || !!(dx || dy);
  }

  function drawAvatar(c) {
    var op = getOp();
    if (op.look) { drawCustomAvatar(c, op.look, op.callsign); return; }
    var bob = Math.sin(W.t * 8) * 2;
    c.save();
    c.translate(W.avatar.x, W.avatar.y + bob);
    c.scale(W.avatar.dir, 1);
    c.shadowColor = '#00ffcc';
    c.shadowBlur = 22;
    if (WORLD_ASSETS.operative && WORLD_ASSETS.operative.complete) {
      c.drawImage(WORLD_ASSETS.operative, -34, -68, 68, 78);
    } else {
      c.fillStyle = '#00ffcc';
      c.fillRect(-13, -42, 26, 38);
    }
    c.restore();
    c.strokeStyle = 'rgba(0,255,204,0.7)';
    c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(W.avatar.x, W.avatar.y + 9, 34, 11, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(252,238,9,0.55)';
    c.beginPath(); c.arc(W.avatar.tx, W.avatar.ty, 10 + Math.sin(W.t * 7) * 2, 0, Math.PI * 2); c.stroke();
  }

  function drawCustomAvatar(c, look, callsign) {
    var stride = W.avatar.moving ? Math.sin(W.t * 12) * 2.4 : 0;
    var suit = look.suit || '#00ffcc';
    var accent = look.accent || '#ff2bd6';
    var playerLook = Object.assign({ frame: 'sentinel', skin: '#bd755b', coat: '#07111a' }, look || {});
    drawAgentSprite(c, {
      x: W.avatar.x,
      y: W.avatar.y,
      scale: 1,
      dir: W.avatar.dir,
      seed: 4.2,
      look: playerLook,
      moving: W.avatar.moving,
      hover: true,
      player: true,
      label: callsign || 'OPERATIVE',
      labelColor: suit
    });
    c.save();
    c.strokeStyle = suit;
    c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(W.avatar.x, W.avatar.y + 10, 27, 8, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = accent;
    c.beginPath(); c.arc(W.avatar.tx, W.avatar.ty, 10 + Math.sin(W.t * 7) * 2, 0, Math.PI * 2); c.stroke();
    if (W.avatar.moving) {
      c.strokeStyle = 'rgba(0,232,255,0.55)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(W.avatar.x - 13 + stride, W.avatar.y + 15);
      c.lineTo(W.avatar.x + 13 - stride, W.avatar.y + 15);
      c.stroke();
    }
    c.restore();
  }

  function drawPlazaBubble(c) {
    if (!W.plazaBubble.text || Date.now() > W.plazaBubble.until) return;
    var text = W.plazaBubble.speaker + ': ' + W.plazaBubble.text;
    var maxW = Math.min(520, W.w - 48);
    c.save();
    c.font = "700 11px 'Share Tech Mono',monospace";
    var metrics = c.measureText(text);
    var w = Math.min(maxW, metrics.width + 32);
    var x = clamp(W.avatar.x - w / 2, 18, W.w - w - 18);
    var y = clamp(W.avatar.y - 118, 82, W.h - 160);
    c.fillStyle = 'rgba(2,10,16,0.96)';
    c.strokeStyle = '#00ffcc';
    c.lineWidth = 1.5;
    roundRect(c, x, y, w, 42, 8);
    c.fill();
    c.stroke();
    c.fillStyle = '#eafcff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text.length > 86 ? text.slice(0, 83) + '...' : text, x + w / 2, y + 21);
    c.restore();
  }

  function setActionPanel(target) {
    var action = document.getElementById('cwg-action');
    if (!action) return;
    var go = document.getElementById('cwg-action-go');
    W.focus = target || null;
    if (!target) {
      var scene = districtScene();
      action.dataset.active = '0';
      if (W.view === 'sector' && W.sector) {
        setText('cwg-action-lbl', sectorDeck(W.sector).label);
        setText('cwg-action-title', 'Select a terminal or portal');
        setText('cwg-action-sub', 'Click a mission terminal to inspect it, or a portal gate to move to a real district.');
        if (go) go.textContent = 'SCAN';
      } else {
        setText('cwg-action-lbl', scene && W.view === 'district' ? scene.label : 'CITY GATE PLAZA');
        setText('cwg-action-title', scene && W.view === 'district' ? 'Walk to a terminal' : 'Walk to a kiosk');
        setText('cwg-action-sub', 'Click the floor or use WASD / arrows to move.');
        if (go) go.textContent = 'TALK';
      }
      return;
    }
    action.dataset.active = '1';
    if (target.type === 'sectorLink') {
      setText('cwg-action-lbl', 'SECTOR PORTAL');
      setText('cwg-action-title', target.link.title);
      setText('cwg-action-sub', target.link.desc);
      if (go) go.textContent = 'ENTER ' + target.link.label;
      return;
    }
    if (target.type === 'node') {
      setText('cwg-action-lbl', 'MISSION TERMINAL');
      setText('cwg-action-title', target.nd.title);
      setText('cwg-action-sub', target.nd.done ? 'Cleared. Open to review the training record.' : (target.nd.unlocked ? 'Ready: Tier ' + target.nd.tier + ' / +' + target.nd.xp + ' XP.' : 'Locked. Clear earlier terminals in this sector first.'));
      if (go) go.textContent = target.nd.done ? 'REVIEW NODE' : (target.nd.unlocked ? 'BREACH NODE' : 'LOCKED');
      return;
    }
    if (target.type === 'npc') {
      setText('cwg-action-lbl', 'OPERATIVE NEARBY');
      setText('cwg-action-title', target.npc.name);
      setText('cwg-action-sub', npcDialogue(target.npc));
      if (go) go.textContent = target.npc.mission ? 'START ASSIGNMENT' : 'TALK';
      return;
    }
    if (target.type === 'activity') {
      setText('cwg-action-lbl', 'PLAZA INTERACTIVE');
      setText('cwg-action-title', target.activity.title);
      setText('cwg-action-sub', target.activity.desc);
      if (go) go.textContent = target.activity.action.indexOf('mission:') === 0 ? 'ENTER ' + target.activity.label : 'ACTIVATE ' + target.activity.label;
      return;
    }
    if (target.type === 'district') {
      var status = nodeStatus(target.node);
      setText('cwg-action-lbl', districtScene() ? districtScene().label + ' INTERACTIVE' : 'DISTRICT INTERACTIVE');
      setText('cwg-action-title', target.node.title);
      setText('cwg-action-sub', status.state === 'locked' ? status.reason : target.node.desc);
      if (go) {
        if (target.node.action === 'plaza') go.textContent = 'RETURN TO PLAZA';
        else if (status.state === 'locked') go.textContent = status.label === 'LOCKED' ? 'LOCKED' : 'LOCKED ' + status.label;
        else if (target.node.action && target.node.action.indexOf('mission:') === 0) go.textContent = status.state === 'done' ? 'CLEARED' : 'START ' + target.node.label;
        else go.textContent = 'ACTIVATE ' + target.node.label;
      }
      return;
    }
    setText('cwg-action-lbl', 'INTERACTIVE KIOSK');
    setText('cwg-action-title', target.hotspot.title);
    setText('cwg-action-sub', target.hotspot.desc);
    if (go) go.textContent = 'ACTIVATE ' + target.hotspot.label;
  }

  function activateFocus() {
    if (!W.focus) {
      sayInPlaza('Guide', 'Click a building, NPC, or the floor. This is the social plaza hub.');
      return;
    }
    if (W.focus.type === 'npc') {
      var line = npcDialogue(W.focus.npc);
      sayInPlaza(W.focus.npc.name, line);
      pushMsg({ callsign: W.focus.npc.name, faction: 'NEUTRAL', body: line });
      Audio2.blip(640, 0.08, 'triangle');
      if (W.focus.npc.mission && (!missionDone(W.focus.npc.mission) || W.focus.npc.id === 'relay')) {
        setTimeout(function () { startGameplayMission(W.focus.npc.mission); }, 240);
      } else if (W.focus.npc.action) {
        runPlazaAction(W.focus.npc.action);
      }
      return;
    }
    var h = W.focus.hotspot || W.focus.activity;
    if (W.focus.type === 'district') {
      Audio2.blip(720, 0.08, 'triangle');
      runDistrictAction(W.focus.node);
      return;
    }
    if (W.focus.type === 'sectorLink') {
      Audio2.blip(720, 0.08, 'triangle');
      runSectorLinkAction(W.focus.link);
      return;
    }
    if (W.focus.type === 'node') {
      Audio2.blip(620, 0.08, 'triangle');
      runSectorNodeAction(W.focus.nd);
      return;
    }
    Audio2.blip(720, 0.08, 'triangle');
    runPlazaAction(h.action, h);
  }

  function sayInPlaza(speaker, text) {
    W.plazaBubble = { speaker: speaker || 'Guide', text: text || '', until: Date.now() + 3200 };
  }

  function startGameplayMission(id) {
    var status = missionStatus(id);
    if (status.state === 'locked') {
      sayInPlaza('System', status.reason);
      pushMsg({ callsign: 'System', faction: 'NEUTRAL', body: status.reason });
      Audio2.blip(160, 0.18, 'sawtooth');
      return;
    }
    if (status.state === 'done') {
      sayInPlaza('System', 'Mission already cleared. Use the console to review the record.');
      Audio2.blip(220, 0.12, 'triangle');
      return;
    }
    closeWorld();
    setTimeout(function () {
      try { window.__cwGameplay && window.__cwGameplay.startMission && window.__cwGameplay.startMission(id); } catch (e) {}
    }, 160);
  }

  function runDistrictAction(node) {
    if (!node || !node.action) return;
    var status = nodeStatus(node);
    if (status.state === 'locked' || node.action === 'locked') {
      sayInPlaza('Map', status.reason);
      pushMsg({ callsign: 'Map', faction: 'NEUTRAL', body: status.reason });
      Audio2.blip(160, 0.18, 'sawtooth');
      return;
    }
    if (status.state === 'done' && node.action.indexOf('mission:') === 0) {
      sayInPlaza(node.label, 'Cleared. Check the mission log for the reward trail and next unlock.');
      Audio2.blip(420, 0.1, 'triangle');
      return;
    }
    var action = node.action;
    if (action.indexOf('mission:') === 0) { startGameplayMission(action.split(':')[1]); return; }
    if (action.indexOf('district:') === 0) { toDistrict(action.split(':')[1]); return; }
    if (action === 'plaza') { toPlaza(); return; }
    if (action === 'academy') { try { window.__cwAcademy && window.__cwAcademy.open(); } catch (e) {} return; }
    if (action === 'net') { try { window.__cwNet && window.__cwNet.open(); } catch (e) {} return; }
    if (action === 'console') { try { window.__cwGameplay && window.__cwGameplay.open(); } catch (e) {} return; }
    if (action === 'creator') { try { window.__cwOnboarding && window.__cwOnboarding.open && window.__cwOnboarding.open('creator'); } catch (e) {} return; }
    if (action === 'profile') { window.open('/profile.html', '_blank', 'noopener'); return; }
    if (action === 'map') { toGrid(); return; }
    if (action === 'cache') { claimDailyCache(); return; }
    if (action === 'emote') { plazaEmote(); return; }
    sayInPlaza('System', node.title + ' is online.');
  }

  function runSectorLinkAction(link) {
    if (!link || !link.action) return;
    if (link.action.indexOf('district:') === 0) { toDistrict(link.action.split(':')[1]); return; }
    if (link.action.indexOf('mission:') === 0) { startGameplayMission(link.action.split(':')[1]); return; }
    if (link.action === 'plaza') { toPlaza(); return; }
    if (link.action === 'map') { toDistrict('map'); return; }
    if (link.action === 'console') { runPlazaAction('console'); return; }
    sayInPlaza('System', link.title + ' is online.');
  }

  function runSectorNodeAction(node) {
    if (!node) return;
    if (node.done || node.unlocked) {
      launchChallenge(node.id);
      return;
    }
    Audio2.blip(160, 0.2, 'sawtooth');
    floatText(node._pos ? node._pos.x : centerX(), node._pos ? node._pos.y - 20 : centerY(), 'LOCKED');
    sayInPlaza('System', 'Locked. Clear earlier terminals in this sector first.');
  }

  function runPlazaAction(action, source) {
    if (!action) return;
    if (action.indexOf('mission:') === 0) { startGameplayMission(action.split(':')[1]); return; }
    if (action.indexOf('district:') === 0) { toDistrict(action.split(':')[1]); return; }
    if (action === 'academy') { try { window.__cwAcademy && window.__cwAcademy.open(); } catch (e) {} return; }
    if (action === 'net') { try { window.__cwNet && window.__cwNet.open(); } catch (e) {} return; }
    if (action === 'console') { try { window.__cwGameplay && window.__cwGameplay.open(); } catch (e) {} return; }
    if (action === 'profile') { window.open('/profile.html', '_blank', 'noopener'); return; }
    if (action === 'map') { toGrid(); return; }
    if (action === 'field') { startGameplayMission('mc-convoy'); return; }
    if (action === 'cache') { claimDailyCache(); return; }
    if (action === 'emote') { plazaEmote(); return; }
    if (action === 'guide') {
      sayInPlaza('Guide', 'Click the ground to walk. Enter Academy, SOC Tower, Player Lab, Net Cafe, Relay Cave, or the World Map; use Space/Pulse in field routes.');
      pushMsg({ callsign: 'Guide', faction: 'NEUTRAL', body: 'City Gate Plaza connects Academy, Field Route, Net Cafe, SOC Tower, Player Lab, Relay Cave, and the 11-zone World Map.' });
      return;
    }
    if (source) sayInPlaza('System', source.title + ' is online.');
  }

  function claimDailyCache() {
    var key = 'cw.plaza.cacheDay';
    if (localStorage.getItem(key) === todayKey()) {
      sayInPlaza('Cache', 'Already claimed today. Come back after the next city reset.');
      Audio2.blip(180, 0.14, 'sawtooth');
      return;
    }
    localStorage.setItem(key, todayKey());
    try { window.__cwGameplay && window.__cwGameplay.gainCredits && window.__cwGameplay.gainCredits(125); } catch (e) {}
    try { window.__cwGameplay && window.__cwGameplay.gainItem && window.__cwGameplay.gainItem('PLAZA-CACHE', 1); } catch (e) {}
    sayInPlaza('Cache', '+125 credits and PLAZA-CACHE logged to inventory.');
    pushMsg({ callsign: 'Cache', faction: 'NEUTRAL', body: getOp().callsign + ' claimed the daily plaza cache.' });
    burstAt(W.avatar.x, W.avatar.y - 20, 32, '#fcee09');
  }

  function plazaEmote() {
    var op = getOp();
    var body = op.callsign + ' ' + PLAZA_EMOTES[W.emoteIndex % PLAZA_EMOTES.length] + '.';
    W.emoteIndex++;
    sayInPlaza(op.callsign, body.replace(op.callsign + ' ', ''));
    pushMsg({ callsign: 'EMOTE', faction: op.faction, body: body });
    burstAt(W.avatar.x, W.avatar.y - 34, 18, '#ff2bd6');
  }

  function runPlazaSocial(kind) {
    if (kind === 'emote') { plazaEmote(); return; }
    if (kind === 'chat') {
      var input = document.getElementById('cwg-comms-input');
      if (input) input.focus();
      sayInPlaza('Guide', 'Type in the plaza chat bar and press Enter.');
      return;
    }
    if (kind === 'friends') { runPlazaAction('net'); return; }
    if (kind === 'cache') { claimDailyCache(); return; }
    if (kind === 'map') { toDistrict('map'); }
  }

  function runPlazaDock(kind) {
    Audio2.blip(760, 0.06, 'triangle');
    if (kind === 'skills') { runPlazaAction('academy'); return; }
    if (kind === 'map') { toDistrict('map'); return; }
    if (kind === 'faction') { runPlazaAction('net'); return; }
    if (kind === 'shop') { claimDailyCache(); return; }
    if (kind === 'inventory' || kind === 'loadout' || kind === 'missions') {
      runPlazaAction('console');
      return;
    }
    sayInPlaza('System', 'Dock channel online.');
  }

  function boot() {
    ensureMounted();
    if (W.booted) return;
    W.booted = true;
    // Auto-enter the grid on first load unless suppressed.
    try {
      var p = new URLSearchParams(window.location.search || '');
      var suppress = p.get('nogrid') === '1';
      var legacy = p.get('legacy') === '1';
      var launch = (p.get('launch') || '').toLowerCase();
      var onboard = loadJSON('cw.onboarding.v1', {}) || {};
      var onboardingPending = !onboard.complete && p.get('skiponboarding') !== '1';
      // Don't hijack if the user explicitly deep-linked into the academy or another launch.
      var academyDeep = p.get('academy') === '1' || launch === 'academy';
      if (!suppress && !legacy && !academyDeep && !onboardingPending) {
        try { sessionStorage.removeItem('cwg.autoclosed'); } catch (e) {}
        setTimeout(openWorld, 600);
      } else {
        document.getElementById('cwg-relaunch').classList.add('show');
      }
    } catch (e) {}
    // periodic data refresh so grid reflects academy/net changes
    setInterval(function () { if (W.open) { refreshData(); try { if (window.__cwNet && window.__cwNet.roster) syncPlayers(window.__cwNet.roster()); } catch (e) {} } }, 4000);
  }

  // remember if user exits, so we don't re-hijack every soft refresh in the session
  var _closeOrig = closeWorld;
  closeWorld = function () { try { sessionStorage.setItem('cwg.autoclosed', '1'); } catch (e) {} _closeOrig(); };
  exposeWorldApi();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
  setTimeout(boot, 1600);
  // keep mounted through hydration
  setInterval(ensureMounted, 2500);
  try { new MutationObserver(function () { if (!document.getElementById('cwg-root')) ensureMounted(); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
