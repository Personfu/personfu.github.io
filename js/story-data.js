(function () {
  'use strict';

  var defaultStory = {
    operation: {
      id: 'operation-starshield',
      name: 'Operation Starshield',
      chapter: 'Chapter 1 / Signal Drift',
      threatLevel: 'CRITICAL',
      primaryObjective: 'Recover launch-auth fragments and hold relay trust until Starshield uplink handoff.',
      launchStatus: 'T-MINUS 6 DAYS',
      brief: 'The Starshield launch chain is under attack across relay, telecom, archive, and validator layers.',
      ticker: [
        'STARSHIELD UPLINK STABLE',
        'VOLT TYPHOON PRE-POSITIONING DETECTED IN RELAY LAYER',
        'LAZARUS ACTIVITY NEAR ESCROW VAULT',
        'FLLC REQUEST: ALL OPERATIVES REPORT TO NEXUS'
      ]
    },
    launchObjective: 'Secure telemetry, recover trust anchors, restore route integrity, and defend the orbital uplink.',
    worldStatus: {
      currentThreatState: 'Coordinated hostile pressure around launch-critical infrastructure.',
      currentMissionObjective: 'Recover fragment A1 from a degraded relay before link collapse.',
      factionReputationEffects: 'Faction standing alters mission pricing, route access, and support responses.',
      launchMetrics: {
        launchWindow: 'T-6 DAYS',
        uplinkIntegrity: 82,
        relayTrust: 68,
        adversaryPressure: 74
      },
      worldEvents: [
        'Telemetry drift detected over GovArchive.',
        'Lazarus funding proxies in black-market exchanges.',
        'Volt Typhoon signatures observed in relay firmware.'
      ]
    },
    pageRoles: {
      index: 'Front door to Operation Starshield with live conflict telemetry and mission hook.',
      cyberworld: 'MMORPG world hub for chapter state, faction impact, destinations, and launch readiness.',
      'cyberworld-game': 'Mission-control runtime for playable chapter nodes in the Starshield convoy.',
      'ctf-trail': 'Campaign route board: each challenge secures one launch-chain dependency.',
      intel: 'War room mapping adversary campaigns to affected nodes, techniques, and CVEs.',
      adversaries: 'Collectible threat codex documenting groups, signatures, and campaign appearances.',
      arcade: 'FLLC rec deck and simulation bay for training drills tied to live operations.',
      wargames: 'High-risk operations, seasonal incidents, raid-style scenarios, and red-team simulations.',
      research: 'Lore and technical archive for recovered docs, architecture notes, and incident history.',
      nodes: 'Network atlas of places, ownership, risk levels, mission links, and activity options.'
    },
    dataSources: {
      campaign: 'data/campaign.json',
      factions: 'data/factions.json',
      adversaries: 'data/adversaries.json',
      locations: 'data/locations.json'
    }
  };

  window.CYBERWORLD_STORY = {
    operation: defaultStory.operation.name,
    tagline: 'Escort the data. Defend the launch.',
    nexusIntro: 'The Nexus is the last neutral sanctuary in CyberWorld, where FLLC operatives prepare for missions into hostile network territory.',
    currentThreat: defaultStory.worldStatus.currentThreatState,
    launchObjective: defaultStory.launchObjective
  };

  window.StoryData = defaultStory;
})();
