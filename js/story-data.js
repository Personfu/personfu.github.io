(function () {
  'use strict';

  var defaultStory = {
    operation: {
      id: 'operation-starshield',
      name: 'Operation Starshield',
      chapter: 'Chapter 3 / Launch Chain Defense',
      threatLevel: 'SEVERE',
      primaryObjective: 'Protect launch-critical payload fragments across compromised relay nodes',
      launchStatus: 'CONVOY IN TRANSIT',
      brief: 'Adversary coalitions are attacking uplink relays to block Starshield deployment. Every page reflects one surface of the same operation.',
      ticker: [
        'STARSHIELD CONVOY: ROUTE INTEGRITY 84%',
        'BLACK SPECTER: ACTIVE AGAINST EDGE RELAYS',
        'GRAY FANG: RANSOMWARE PRESSURE IN CIVIC STACK',
        'CINDER VEIL: SYNTHETIC INFLUENCE CAMPAIGN DETECTED',
        'FLLC OPERATIVES: ESCORTING PAYLOAD THROUGH HOSTILE NODES'
      ]
    },
    pageRoles: {
      index: 'Command desktop overview for operation-wide telemetry.',
      cyberworld: 'Narrative and progression hub for operative state and chapter flow.',
      'cyberworld-game': 'Terminal mission-control simulation for consequence-based node operations.',
      'ctf-trail': 'Guided launch-chain escort training path with sequential node execution.',
      intel: 'War-room threat telemetry linking CVEs, tactics, and active adversaries.',
      adversaries: 'Adversary registry and codex of hostile coalition pressure points.',
      arcade: 'Reflex and pattern-training modules that reinforce active campaign readiness.',
      wargames: 'Arena for mission rehearsal, script drills, and leaderboard competition.',
      research: 'Research and doctrine lab for techniques, reports, and mission theory.',
      nodes: 'Operative network coordination and signal relay for campaign collaboration.'
    },
    dataSources: {
      campaign: 'data/campaign.json',
      factions: 'data/factions.json',
      adversaries: 'data/adversaries.json',
      locations: 'data/locations.json'
    }
  };

  window.StoryData = defaultStory;
})();
