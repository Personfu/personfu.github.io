(function () {
  'use strict';

  window.CYBERWORLD_EXPANDED = {
    nexusDistricts: [
      { name: 'Signal Plaza', theme: 'Social hub for operative meetups and live mission callouts.' },
      { name: 'Patch Bazaar', theme: 'Trade crafted modules, exploit signatures, and cosmetic shell skins.' },
      { name: 'Faction Ring', theme: 'Sentinel, Corsair, Ghostline, and FLLC halls with reputation contracts.' },
      { name: 'Companion Conservatory', theme: 'Repair and evolve rescued constructs, daemons, and packet familiars.' },
      { name: 'Intel Atrium', theme: 'Realtime CVE walls and adversary surge maps.' },
      { name: 'Arcade Deck', theme: 'Simulation cabinets and score contests tied to live ops.' },
      { name: 'Route Forge', theme: 'Assemble convoy route kits and trust-anchor bundles.' },
      { name: 'Ops Amphitheater', theme: 'Community briefings, seasonal announcements, and raid prep events.' }
    ],
    chapterBreakdown: [
      { id: 1, title: 'Signal Drift', pitch: 'Recover first launch-auth fragment from a dying relay.', gameplay: 'Decode, recon, and trust-chain verification.' },
      { id: 2, title: 'Blind Mapping', pitch: 'Build scanner stacks to map unstable convoy paths.', gameplay: 'Routing, scanner crafting, dark-relay decisions.' },
      { id: 3, title: 'Dead Drop', pitch: 'Recover stale credentials and hidden timing coordinates.', gameplay: 'Stego, SQL bypass, forensic memory extraction.' },
      { id: 4, title: 'Launch Chain', pitch: 'Defend telemetry validators and escort final package.', gameplay: 'Incident response, threat modeling, convoy defense.' },
      { id: 5, title: 'Continuity Wars', pitch: 'Premium chapter: counterstrike hostile archive hijack attempts.', gameplay: 'Raid nodes, coordinated lobbies, high-risk exfil missions.' },
      { id: 6, title: 'Orbital Covenant', pitch: 'Premium chapter: establish post-launch trust mesh for civic recovery.', gameplay: 'Faction diplomacy, infrastructure rebuild contracts, elite war games.' }
    ],
    companionCatalog: [
      { tier: 'Common', name: 'Relay Wisp', bonus: '+5% scan speed in unstable nodes' },
      { tier: 'Common', name: 'Patch Mite', bonus: '+3 integrity during defensive ops' },
      { tier: 'Rare', name: 'Signal Hound', bonus: '+8% adversary trail detection' },
      { tier: 'Rare', name: 'Cipher Finch', bonus: '+10% decode challenge efficiency' },
      { tier: 'Epic', name: 'Ghost Lynx', bonus: '-12 detection in dark routes' },
      { tier: 'Epic', name: 'Sentinel Shell', bonus: '+15 validator hardening output' },
      { tier: 'Legendary', name: 'Founder Archive Construct', bonus: 'Unlocks hidden lore chains and launch shortcuts' },
      { tier: 'Legendary', name: 'Polymorph Storm Drake', bonus: 'Adaptive boost based on current threat pressure' }
    ],
    contracts: [
      { code: 'NX-OPS-101', type: 'Escort', reward: '2200 credits + relay token', text: 'Move launch-auth shard through Salt Typhoon shadow route.' },
      { code: 'NX-OPS-118', type: 'Defense', reward: '2800 credits + integrity module', text: 'Patch compromised telemetry mirror before countdown drift.' },
      { code: 'NX-OPS-133', type: 'Intel', reward: '1700 credits + faction rep', text: 'Correlate CVE chain with current adversary pressure map.' },
      { code: 'NX-OPS-149', type: 'Forensics', reward: '3000 credits + companion stabilizer', text: 'Extract process timeline from launch validator memory dump.' },
      { code: 'NX-OPS-177', type: 'Raid Prep', reward: '4200 credits + war-game key', text: 'Stage multi-operative rehearsal for final uplink defense.' },
      { code: 'NX-OPS-205', type: 'Premium', reward: '5600 credits + covenant shard', text: 'Chapter 5 continuity mission against archive hijack convoy.' }
    ],
    worldIncidents: [
      'GovArchive mirror drift exceeds safe threshold by 11%.',
      'Lazarus proxy wallets observed funding black-market relay brokers.',
      'Volt Typhoon persistence traces found in dormant telecom firmware.',
      'Sandworm-style timing offsets detected in launch rehearsal logs.',
      'Nexus market enters partial lockdown for uplink hardening shift.',
      'Sentinel emergency contract posted for route validator triage.',
      'Ghostline scouts report hostile AI signatures in Relay Graveyard.',
      'Corsair route-runners offering risky fast lane to Orbital Uplink.'
    ],
    premiumOps: [
      { name: 'Continuity Siege', chapter: 5, rule: 'Subscription required', detail: 'Defend continuity archive replicas from synchronized ransomware swarms.' },
      { name: 'Orbital Trust Mesh', chapter: 5, rule: 'Subscription required', detail: 'Rebuild trust anchors across contested uplink satellites.' },
      { name: 'Civic Recovery Relay', chapter: 6, rule: 'Subscription required', detail: 'Escort post-launch civic seed models through insurgent subnet storms.' },
      { name: 'Foundry of Signals', chapter: 6, rule: 'Subscription required', detail: 'Craft and deploy clean-room standards to recovering regions.' }
    ]
  };
})();
