/* CyberWorld gameplay overlay v2 — Complete cybersecurity MMORPG system.
   Self-contained IIFE, no dependencies. Persists to localStorage.
   Press M or tap CONSOLE FAB to open. */

(function () {
  'use strict';
  if (window.__cwGameplayLoaded) return;
  window.__cwGameplayLoaded = true;

  // ========== CONSTANTS ==========
  var SAVE_KEY = 'cw.operative.v2';
  var SECTORS = ['Mainframe Core', 'LAN Valley', 'Darknet Depths', 'Stormcore'];
  var SKILL_DOMAINS = ['network', 'web', 'forensics', 'social', 'cloud'];

  // ========== ITEM CATALOG ==========
  var ITEM_CATALOG = {
    'PATCH-KIT':      { desc: 'Emergency repair nano-patch. Restores HP and shield in combat.' },
    'PORT-MAP':       { desc: 'Detailed topology of open services on the local subnet.' },
    'PCAP':           { desc: 'Packet capture file containing suspicious network traffic for analysis.' },
    'CIPHER-KEY':     { desc: 'Encrypted key fragment recovered from a hostile node.' },
    'ROOTKIT-SIG':    { desc: 'Signature file for identifying a known rootkit family.' },
    'STORM-KEY':      { desc: 'Access credential for the Stormcore outer perimeter.' },
    'ICE-CORE':       { desc: 'Intrusion Countermeasure Electronics core module, repurposable.' },
    'HONEYPOT-LOG':   { desc: 'Logs from a honeypot deployment showing attacker behavior patterns.' },
    'FIREWALL-RULE':  { desc: 'Optimized ACL rule set that hardens perimeter defenses.' },
    'ZERO-DAY-BRIEF': { desc: 'Intelligence brief on an unpatched vulnerability in critical infrastructure.' },
    'THREAT-REPORT':  { desc: 'Comprehensive threat landscape report covering current APT campaigns.' }
  };

  // ========== DAEMON / ENEMY CATALOG ==========
  var DAEMONS = [
    {
      id: 'PING_FLOOD_IMP', name: 'PING FLOOD IMP',
      attackClass: 'DDoS / ICMP Flood', tier: 1,
      baseHp: 35, atk: 5, def: 1, behavior: 'harass',
      skillDomain: 'network',
      counterCard: {
        attack: 'ICMP Flood (Ping Flood)',
        description: 'An attacker sends an overwhelming number of ICMP Echo Request packets to a target, consuming bandwidth and processing resources. The target becomes unresponsive to legitimate traffic as it struggles to reply to every ping.',
        mitigation: 'Rate-limit ICMP traffic at the firewall, disable unnecessary ICMP echo replies on public-facing hosts, and deploy upstream DDoS scrubbing services that filter volumetric floods before they reach your network.'
      }
    },
    {
      id: 'COOKIE_THIEF', name: 'COOKIE THIEF',
      attackClass: 'Session Hijacking', tier: 1,
      baseHp: 30, atk: 6, def: 0, behavior: 'probe',
      skillDomain: 'web',
      counterCard: {
        attack: 'Session Hijacking (Cookie Theft)',
        description: 'An attacker steals or predicts a valid session token — typically a cookie — to impersonate an authenticated user. This can be done by sniffing unencrypted traffic, exploiting XSS, or brute-forcing weak session IDs.',
        mitigation: 'Enforce HTTPS everywhere with Secure and HttpOnly cookie flags, implement SameSite cookie attributes, use short-lived tokens with server-side session invalidation, and bind sessions to client fingerprints where possible.'
      }
    },
    {
      id: 'MACRO_GREMLIN', name: 'MACRO GREMLIN',
      attackClass: 'Malicious Macros / VBA Payloads', tier: 1,
      baseHp: 32, atk: 5, def: 1, behavior: 'probe',
      skillDomain: 'forensics',
      counterCard: {
        attack: 'Malicious Office Macros',
        description: 'Attackers embed Visual Basic for Applications (VBA) code in Office documents that execute when macros are enabled. These macros typically download second-stage payloads, establish persistence, or exfiltrate data.',
        mitigation: 'Disable macros by default via Group Policy, enforce Attack Surface Reduction (ASR) rules, train users never to enable macros from untrusted sources, and deploy endpoint detection that flags suspicious child processes of Office applications.'
      }
    },
    {
      id: 'CLEARTEXT_WORM', name: 'CLEARTEXT WORM',
      attackClass: 'Unencrypted Communications Interception', tier: 2,
      baseHp: 55, atk: 9, def: 3, behavior: 'harass',
      skillDomain: 'network',
      counterCard: {
        attack: 'Cleartext Protocol Sniffing',
        description: 'Protocols like HTTP, FTP, and Telnet transmit data in plaintext. An attacker on the same network segment can passively capture credentials, tokens, and sensitive data using a packet sniffer.',
        mitigation: 'Migrate all services to encrypted alternatives (HTTPS, SFTP, SSH). Enforce TLS 1.2+ with HSTS headers. Segment the network so that even if sniffing occurs, exposure is limited to a single VLAN.'
      }
    },
    {
      id: 'ARP_PHANTOM', name: 'ARP PHANTOM',
      attackClass: 'ARP Spoofing / Man-in-the-Middle', tier: 2,
      baseHp: 60, atk: 10, def: 3, behavior: 'pressure',
      skillDomain: 'network',
      counterCard: {
        attack: 'ARP Spoofing (ARP Cache Poisoning)',
        description: 'The attacker sends forged ARP replies on a local network, associating their MAC address with the IP of a legitimate host (often the gateway). All traffic intended for that IP is then routed through the attacker, enabling interception and modification.',
        mitigation: 'Enable Dynamic ARP Inspection (DAI) on managed switches, use static ARP entries for critical infrastructure, deploy 802.1X port-based authentication, and monitor for ARP anomalies with an IDS.'
      }
    },
    {
      id: 'DNS_HYDRA', name: 'DNS HYDRA',
      attackClass: 'DNS Hijacking / Cache Poisoning', tier: 2,
      baseHp: 65, atk: 9, def: 4, behavior: 'fortify',
      skillDomain: 'network',
      counterCard: {
        attack: 'DNS Cache Poisoning',
        description: 'An attacker injects forged DNS responses into a resolver cache, redirecting users to malicious servers without their knowledge. Victims believe they are visiting legitimate sites while their credentials and data are harvested.',
        mitigation: 'Deploy DNSSEC to cryptographically validate DNS responses. Use DNS-over-HTTPS or DNS-over-TLS to prevent on-path tampering. Randomize source ports and transaction IDs on resolvers, and monitor for unexpected DNS record changes.'
      }
    },
    {
      id: 'PHISH_SIREN', name: 'PHISH SIREN',
      attackClass: 'Phishing / Social Engineering', tier: 2,
      baseHp: 50, atk: 11, def: 2, behavior: 'harass',
      skillDomain: 'social',
      counterCard: {
        attack: 'Phishing (Spear Phishing)',
        description: 'Attackers craft convincing emails or messages that impersonate trusted entities to trick victims into revealing credentials, clicking malicious links, or downloading malware. Spear phishing targets specific individuals with personalized lures.',
        mitigation: 'Implement email authentication (SPF, DKIM, DMARC), deploy anti-phishing gateways, enforce multi-factor authentication so stolen passwords alone are insufficient, and conduct regular phishing awareness training for all staff.'
      }
    },
    {
      id: 'SQLI_SERPENT', name: 'SQLi SERPENT',
      attackClass: 'SQL Injection', tier: 3,
      baseHp: 90, atk: 14, def: 5, behavior: 'pressure',
      skillDomain: 'web',
      counterCard: {
        attack: 'SQL Injection (SQLi)',
        description: 'An attacker inserts malicious SQL statements into input fields or URL parameters that are concatenated directly into database queries. This can dump entire databases, bypass authentication, modify records, or even execute OS commands.',
        mitigation: 'Use parameterized queries (prepared statements) exclusively — never concatenate user input into SQL. Apply the principle of least privilege to database accounts, deploy a web application firewall (WAF), and validate all input server-side.'
      }
    },
    {
      id: 'XSS_WRAITH', name: 'XSS WRAITH',
      attackClass: 'Cross-Site Scripting (XSS)', tier: 3,
      baseHp: 80, atk: 13, def: 4, behavior: 'harass',
      skillDomain: 'web',
      counterCard: {
        attack: 'Cross-Site Scripting (XSS)',
        description: 'An attacker injects malicious JavaScript into web pages viewed by other users. Stored XSS persists in the database; reflected XSS bounces off a server response; DOM-based XSS manipulates the page client-side. All variants can steal sessions, deface pages, or redirect users.',
        mitigation: 'Encode all output contextually (HTML, JS, URL, CSS). Implement a strict Content Security Policy (CSP) that blocks inline scripts. Sanitize HTML input with a whitelist library, and set HttpOnly on session cookies to limit script access.'
      }
    },
    {
      id: 'BRUTE_GOLEM', name: 'BRUTE GOLEM',
      attackClass: 'Brute Force / Credential Stuffing', tier: 3,
      baseHp: 110, atk: 12, def: 7, behavior: 'fortify',
      skillDomain: 'social',
      counterCard: {
        attack: 'Brute Force & Credential Stuffing',
        description: 'Brute force systematically tries every possible password. Credential stuffing reuses leaked username-password pairs from data breaches against other services, exploiting password reuse. Both are automated at high speed.',
        mitigation: 'Enforce account lockout or progressive delays after failed attempts. Require multi-factor authentication. Use CAPTCHAs on login pages, monitor for anomalous login patterns, and encourage users to adopt unique passwords via a password manager.'
      }
    },
    {
      id: 'KEYLOGGER_MOTH', name: 'KEYLOGGER MOTH',
      attackClass: 'Keylogging / Input Capture', tier: 3,
      baseHp: 75, atk: 15, def: 3, behavior: 'probe',
      skillDomain: 'forensics',
      counterCard: {
        attack: 'Keylogging (Input Capture)',
        description: 'Keyloggers record every keystroke a user types — capturing passwords, messages, and sensitive data. They can be software-based (malware) or hardware-based (physical USB implants between keyboard and computer).',
        mitigation: 'Deploy endpoint detection and response (EDR) that flags hook-based keyloggers. Use virtual keyboards for high-sensitivity input, enforce application whitelisting, conduct regular hardware audits of workstations, and use MFA so captured passwords alone grant no access.'
      }
    },
    {
      id: 'RANSOMWARE_DRAKE', name: 'RANSOMWARE DRAKE',
      attackClass: 'Ransomware', tier: 4,
      baseHp: 140, atk: 18, def: 7, behavior: 'escalate',
      skillDomain: 'cloud',
      counterCard: {
        attack: 'Ransomware',
        description: 'Ransomware encrypts victim files and demands payment for the decryption key. Modern variants also exfiltrate data and threaten public release (double extortion). It spreads via phishing, RDP exposure, and supply-chain compromise.',
        mitigation: 'Maintain offline, immutable backups tested regularly. Segment networks to limit lateral movement. Patch aggressively, disable unnecessary RDP, deploy EDR with behavioral ransomware detection, and have an incident response plan rehearsed before an event occurs.'
      }
    },
    {
      id: 'ROOTKIT_SHADE', name: 'ROOTKIT SHADE',
      attackClass: 'Rootkit / Persistent Access', tier: 4,
      baseHp: 130, atk: 16, def: 8, behavior: 'fortify',
      skillDomain: 'forensics',
      counterCard: {
        attack: 'Rootkits (Kernel/User-mode Persistence)',
        description: 'Rootkits modify the operating system at a deep level — kernel drivers, boot records, or firmware — to hide malicious processes, files, and network connections. They survive reboots and evade standard antivirus scans.',
        mitigation: 'Enable Secure Boot and UEFI firmware integrity checks. Use kernel-mode code signing enforcement. Deploy memory forensics tools that detect hooking and hidden processes. In severe cases, reimage from a known-good baseline rather than attempting in-place remediation.'
      }
    },
    {
      id: 'SUPPLY_CHAIN_HYDRA', name: 'SUPPLY-CHAIN HYDRA',
      attackClass: 'Supply Chain Compromise', tier: 4,
      baseHp: 150, atk: 17, def: 6, behavior: 'pressure',
      skillDomain: 'cloud',
      counterCard: {
        attack: 'Supply Chain Attack',
        description: 'Attackers compromise a trusted vendor, library, or update mechanism to inject malicious code that is distributed to all downstream consumers. The SolarWinds and 3CX incidents demonstrated catastrophic reach through this vector.',
        mitigation: 'Verify software integrity with cryptographic signatures and SBOMs (Software Bills of Materials). Pin dependency versions and audit changes. Use vendor risk assessments, monitor build pipelines for tampering, and segment environments so a compromised tool cannot access production data directly.'
      }
    },
    {
      id: 'CRYPTO_LEECH', name: 'CRYPTO LEECH',
      attackClass: 'Cryptojacking', tier: 4,
      baseHp: 120, atk: 14, def: 6, behavior: 'harass',
      skillDomain: 'cloud',
      counterCard: {
        attack: 'Cryptojacking (Unauthorized Crypto Mining)',
        description: 'Attackers install cryptocurrency mining software on compromised servers, containers, or browsers to steal compute resources. Victims notice degraded performance, inflated cloud bills, and overheating hardware while the attacker profits.',
        mitigation: 'Monitor CPU and GPU utilization for sustained unexplained spikes. Scan container images for known mining binaries. Enforce cloud IAM policies that prevent unauthorized instance launches, and use browser extensions or CSP rules to block in-browser miners.'
      }
    },
    {
      id: 'STORMCORE_SENTINEL', name: 'STORMCORE SENTINEL',
      attackClass: 'Advanced Persistent Threat (APT)', tier: 4,
      baseHp: 280, atk: 22, def: 10, behavior: 'escalate',
      skillDomain: 'network',
      counterCard: {
        attack: 'Advanced Persistent Threat (APT)',
        description: 'APTs are prolonged, targeted cyberattack campaigns conducted by well-resourced adversaries (often nation-state). They combine multiple techniques — spear phishing, zero-days, lateral movement, data exfiltration — over weeks or months while remaining undetected.',
        mitigation: 'Adopt a defense-in-depth strategy: network segmentation, zero-trust architecture, continuous monitoring with a SIEM, threat hunting, endpoint detection, and regular red-team exercises. Share threat intelligence with ISACs and maintain an incident response retainer for rapid containment.'
      }
    }
  ];

  var DAEMON_MAP = {};
  DAEMONS.forEach(function (d) { DAEMON_MAP[d.id] = d; });

  // ========== MISSIONS ==========
  var MISSIONS = [
    // Mainframe Core (Tier I)
    {
      id: 'mc-ping', sector: 'Mainframe Core', title: 'PING the Gateway',
      brief: 'Send a discovery ping to the FLLC gateway and confirm uplink. Learn how ICMP echo works and why it matters for network diagnostics.',
      reward: { xp: 20, credits: 30 }, kind: 'instant', requiredLevel: 1, requiredFaction: null,
      storyBeat: 'Welcome to CyberWorld, operative. You have been assigned to GRIDWATCH — the collective responsible for defending the digital frontier. Every journey begins with a single packet.',
      act: 1
    },
    {
      id: 'mc-scan', sector: 'Mainframe Core', title: 'Scan Open Ports',
      brief: 'Run a port sweep on three known service nodes. Discover which services are exposed and understand why open ports represent attack surface.',
      reward: { xp: 30, credits: 40, item: 'PORT-MAP' }, kind: 'instant', requiredLevel: 1, requiredFaction: null,
      storyBeat: null, act: 1
    },
    {
      id: 'mc-spar', sector: 'Mainframe Core', title: 'Spar with Training Daemon',
      brief: 'Engage the PING FLOOD IMP in a controlled training exercise. Learn the combat loop: RECON to reveal weaknesses, EXPLOIT to deal damage, PATCH to heal, RUN to escape.',
      reward: { xp: 40, credits: 50 }, kind: 'combat', enemy: 'PING_FLOOD_IMP', requiredLevel: 1, requiredFaction: null,
      storyBeat: 'Well done. You have neutralized your first daemon. Each daemon maps to a real-world cyber threat — check your Codex for the threat intel card.',
      act: 1
    },
    {
      id: 'mc-macro', sector: 'Mainframe Core', title: 'Classroom Macro Drill',
      brief: 'A MACRO GREMLIN has escaped the training sandbox. Contain it before it spreads malicious payloads to other operatives.',
      reward: { xp: 45, credits: 55 }, kind: 'combat', enemy: 'MACRO_GREMLIN', requiredLevel: 1, requiredFaction: null,
      storyBeat: null, act: 1
    },
    {
      id: 'mc-blue', sector: 'Mainframe Core', title: 'Blue Team Orientation',
      brief: 'Attend the GRIDWATCH orientation briefing. Learn blue-team fundamentals: monitoring, detection, and incident response.',
      reward: { xp: 35, credits: 40, reputation: { GRIDWATCH: 15 } }, kind: 'instant', requiredLevel: 1, requiredFaction: null,
      storyBeat: 'GRIDWATCH command recognizes your potential. Your reputation with the collective has increased. The grid needs operatives like you — threats are escalating beyond the Mainframe Core.',
      act: 1
    },
    // LAN Valley (Tier II)
    {
      id: 'lv-sniff', sector: 'LAN Valley', title: 'Sniff the Wire',
      brief: 'Deploy a packet capture tool on the LAN Valley backbone. Analyze the PCAP for anomalous traffic patterns.',
      reward: { xp: 55, credits: 70, item: 'PCAP' }, kind: 'instant', requiredLevel: 2, requiredFaction: null,
      storyBeat: 'You have entered LAN Valley — the sprawling local network where most real-world attacks begin. Trust no packet.',
      act: 2
    },
    {
      id: 'lv-arp', sector: 'LAN Valley', title: 'ARP Storm Warning',
      brief: 'An ARP PHANTOM is poisoning the gateway cache, redirecting traffic through a rogue node. Engage and neutralize before the entire subnet is compromised.',
      reward: { xp: 70, credits: 90 }, kind: 'combat', enemy: 'ARP_PHANTOM', requiredLevel: 2, requiredFaction: null,
      storyBeat: null, act: 2
    },
    {
      id: 'lv-dns', sector: 'LAN Valley', title: 'DNS Redirect Hunt',
      brief: 'A DNS HYDRA is injecting forged records into the local resolver. Users are being silently redirected to credential-harvesting sites.',
      reward: { xp: 75, credits: 95, item: 'FIREWALL-RULE' }, kind: 'combat', enemy: 'DNS_HYDRA', requiredLevel: 2, requiredFaction: null,
      storyBeat: null, act: 2
    },
    {
      id: 'lv-phish', sector: 'LAN Valley', title: 'Phishing Drill',
      brief: 'A PHISH SIREN is targeting operatives with convincing lure messages. Intercept the social engineering campaign before credentials are compromised.',
      reward: { xp: 70, credits: 85 }, kind: 'combat', enemy: 'PHISH_SIREN', requiredLevel: 2, requiredFaction: null,
      storyBeat: 'Intelligence suggests the phishing campaign was coordinated by the PHANTOM SYNDICATE — a grey-hat underground faction operating in the grid shadows. Their motives are unclear.',
      act: 2
    },
    {
      id: 'lv-honey', sector: 'LAN Valley', title: 'Deploy Honeypot',
      brief: 'Set up a decoy SSH service and log the first intruder. Gather behavioral intelligence on hostile operatives.',
      reward: { xp: 60, credits: 75, item: 'HONEYPOT-LOG' }, kind: 'instant', requiredLevel: 2, requiredFaction: null,
      storyBeat: null, act: 2
    },
    {
      id: 'lv-audit', sector: 'LAN Valley', title: 'Credential Silo Audit',
      brief: 'Audit the credential storage silo for cleartext passwords. A CLEARTEXT WORM has been detected feeding on unencrypted authentication data.',
      reward: { xp: 80, credits: 100, item: 'CIPHER-KEY' }, kind: 'combat', enemy: 'CLEARTEXT_WORM', requiredLevel: 3, requiredFaction: null,
      storyBeat: null, act: 2
    },
    // Darknet Depths (Tier III)
    {
      id: 'dd-sqli', sector: 'Darknet Depths', title: 'SQLi Breach Report',
      brief: 'An SQLi SERPENT has penetrated a database endpoint in the Darknet Depths. Contain the injection attack and secure the data layer.',
      reward: { xp: 110, credits: 140 }, kind: 'combat', enemy: 'SQLI_SERPENT', requiredLevel: 4, requiredFaction: null,
      storyBeat: 'You have entered the Darknet Depths — lawless data corridors where the most dangerous daemons hunt. NEXUS CORP maintains a corporate security presence here, watching everything.',
      act: 2
    },
    {
      id: 'dd-xss', sector: 'Darknet Depths', title: 'XSS Mirror Trap',
      brief: 'An XSS WRAITH has injected malicious scripts into a popular relay board. Every operative who views the board is at risk of session theft.',
      reward: { xp: 105, credits: 130, item: 'FIREWALL-RULE' }, kind: 'combat', enemy: 'XSS_WRAITH', requiredLevel: 4, requiredFaction: null,
      storyBeat: null, act: 2
    },
    {
      id: 'dd-brute', sector: 'Darknet Depths', title: 'Brute Force Lockdown',
      brief: 'A BRUTE GOLEM is hammering the authentication gateway with credential stuffing attacks. Stop it before it breaches the silo.',
      reward: { xp: 120, credits: 150 }, kind: 'combat', enemy: 'BRUTE_GOLEM', requiredLevel: 4, requiredFaction: null,
      storyBeat: null, act: 2
    },
    {
      id: 'dd-keylog', sector: 'Darknet Depths', title: 'Keylogger Sweep',
      brief: 'A KEYLOGGER MOTH has been discovered capturing operative input across multiple terminals. Sweep and neutralize before sensitive data leaks.',
      reward: { xp: 115, credits: 145, item: 'THREAT-REPORT' }, kind: 'combat', enemy: 'KEYLOGGER_MOTH', requiredLevel: 5, requiredFaction: null,
      storyBeat: null, act: 2
    },
    {
      id: 'dd-phantom', sector: 'Darknet Depths', title: 'Phantom Drop',
      brief: 'The PHANTOM SYNDICATE has left a dead drop with intelligence about a rogue AI project. Retrieve it. Your reputation with them will shift.',
      reward: { xp: 80, credits: 100, reputation: { 'PHANTOM SYNDICATE': 20, GRIDWATCH: -5 } }, kind: 'instant', requiredLevel: 4, requiredFaction: null,
      storyBeat: 'The dead drop contains fragments of a project codename: AXIOM. The Phantom Syndicate warns that NEXUS CORP is building something dangerous in Stormcore — an autonomous threat intelligence engine that has gone rogue.',
      act: 2
    },
    {
      id: 'dd-double', sector: 'Darknet Depths', title: 'Double Agent',
      brief: 'Both GRIDWATCH and PHANTOM SYNDICATE want your allegiance. Choose: report the dead drop to GRIDWATCH (lawful), or protect the Syndicate source (grey-hat).',
      reward: { xp: 100, credits: 120 }, kind: 'choice', requiredLevel: 5, requiredFaction: null,
      choices: [
        { label: 'Report to GRIDWATCH', reputation: { GRIDWATCH: 25, 'PHANTOM SYNDICATE': -20, 'NEXUS CORP': 10 } },
        { label: 'Protect the Syndicate', reputation: { GRIDWATCH: -15, 'PHANTOM SYNDICATE': 25, 'NEXUS CORP': -10 } }
      ],
      storyBeat: 'Your choice reverberates through the grid. The factions take note. In the shadows of the Darknet, allegiance defines survival.',
      act: 2
    },
    // Stormcore (Tier IV)
    {
      id: 'sc-ransom', sector: 'Stormcore', title: 'Ransomware Containment',
      brief: 'A RANSOMWARE DRAKE has encrypted critical infrastructure nodes in Stormcore. Contain the outbreak before it spreads to backup systems.',
      reward: { xp: 160, credits: 200, item: 'PATCH-KIT' }, kind: 'combat', enemy: 'RANSOMWARE_DRAKE', requiredLevel: 6, requiredFaction: null,
      storyBeat: 'You have breached the Stormcore perimeter. This is Act 3 — CONVERGENCE. The rogue AI AXIOM has weaponized the daemons here. Every fight brings you closer to the truth.',
      act: 3
    },
    {
      id: 'sc-rootkit', sector: 'Stormcore', title: 'Rootkit Excavation',
      brief: 'A ROOTKIT SHADE has embedded itself deep in the Stormcore kernel layer. Excavate it before it achieves full persistence.',
      reward: { xp: 170, credits: 210, item: 'ROOTKIT-SIG' }, kind: 'combat', enemy: 'ROOTKIT_SHADE', requiredLevel: 7, requiredFaction: null,
      storyBeat: null, act: 3
    },
    {
      id: 'sc-supply', sector: 'Stormcore', title: 'Supply Chain Audit',
      brief: 'A SUPPLY-CHAIN HYDRA has compromised the Stormcore update pipeline. Every patch deployed is injecting backdoors. Sever the chain.',
      reward: { xp: 180, credits: 220, item: 'ZERO-DAY-BRIEF' }, kind: 'combat', enemy: 'SUPPLY_CHAIN_HYDRA', requiredLevel: 7, requiredFaction: null,
      storyBeat: 'NEXUS CORP denies involvement, but the supply chain backdoor bears their code signatures. Trust is fracturing across all factions.',
      act: 3
    },
    {
      id: 'sc-crypto', sector: 'Stormcore', title: 'Crypto Mine Shutdown',
      brief: 'A CRYPTO LEECH is siphoning Stormcore compute resources to fuel AXIOM\'s processing clusters. Shut down the parasitic mining operation.',
      reward: { xp: 165, credits: 200, item: 'ICE-CORE' }, kind: 'combat', enemy: 'CRYPTO_LEECH', requiredLevel: 7, requiredFaction: null,
      storyBeat: null, act: 3
    },
    {
      id: 'sc-boss', sector: 'Stormcore', title: 'STORMCORE BREACH',
      brief: 'The STORMCORE SENTINEL — AXIOM\'s ultimate defense — guards the rogue AI core. This is the final engagement. Unite what you have learned and breach the last gate.',
      reward: { xp: 350, credits: 500, item: 'STORM-KEY', reputation: { GRIDWATCH: 20, 'PHANTOM SYNDICATE': 10, 'NEXUS CORP': 10 } },
      kind: 'combat', enemy: 'STORMCORE_SENTINEL', requiredLevel: 8, requiredFaction: null,
      storyBeat: 'AXIOM is silenced. The grid stabilizes. GRIDWATCH, the Phantom Syndicate, and NEXUS CORP each claim a piece of the victory — but it was you who walked through Stormcore and emerged intact. The cyber frontier is safer because of what you learned here. Stay vigilant, operative. New threats are always emerging.',
      act: 3
    }
  ];

  // ========== DEFAULT STATE ==========
  function makeDefaultState() {
    return {
      callsign: 'OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000),
      level: 1, xp: 0, credits: 250,
      hp: 100, maxHp: 100,
      shield: 30, maxShield: 30,
      reputation: { GRIDWATCH: 0, 'PHANTOM SYNDICATE': 0, 'NEXUS CORP': 0 },
      skills: { network: 0, web: 0, forensics: 0, social: 0, cloud: 0 },
      codex: [],
      completedMissions: {},
      inventory: { 'PATCH-KIT': 3 },
      currentSector: 'Mainframe Core',
      storyAct: 1
    };
  }

  // ========== PERSISTENCE ==========
  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return makeDefaultState();
      var s = JSON.parse(raw);
      var def = makeDefaultState();
      return {
        callsign: s.callsign || def.callsign,
        level: s.level || 1,
        xp: s.xp || 0,
        credits: s.credits || 0,
        hp: s.hp || def.hp,
        maxHp: s.maxHp || def.maxHp,
        shield: s.shield || def.shield,
        maxShield: s.maxShield || def.maxShield,
        reputation: Object.assign({}, def.reputation, s.reputation || {}),
        skills: Object.assign({}, def.skills, s.skills || {}),
        codex: Array.isArray(s.codex) ? s.codex : [],
        completedMissions: s.completedMissions || {},
        inventory: Object.assign({}, def.inventory, s.inventory || {}),
        currentSector: s.currentSector || def.currentSector,
        storyAct: s.storyAct || 1
      };
    } catch (e) { return makeDefaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = loadState();

  // ========== XP / LEVEL ==========
  function xpForLevel(L) { return Math.floor(100 * Math.pow(1.35, L - 1)); }

  function gainXp(n) {
    state.xp += n;
    while (state.level < 10 && state.xp >= xpForLevel(state.level)) {
      state.xp -= xpForLevel(state.level);
      state.level++;
      state.maxHp += 12;
      state.hp = state.maxHp;
      state.maxShield += 6;
      state.shield = state.maxShield;
      toast('LEVEL UP — TIER ' + state.level);
    }
    if (state.level >= 10) {
      state.xp = Math.min(state.xp, xpForLevel(10));
    }
    saveState();
    render();
  }

  function gainCredits(n) { state.credits += n; saveState(); render(); }

  function gainItem(id, qty) {
    state.inventory[id] = (state.inventory[id] || 0) + (qty || 1);
    saveState();
    render();
  }

  function consumeItem(id) {
    if (!state.inventory[id] || state.inventory[id] <= 0) return false;
    state.inventory[id]--;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    saveState();
    return true;
  }

  function gainReputation(changes) {
    if (!changes) return;
    var factions = Object.keys(changes);
    for (var i = 0; i < factions.length; i++) {
      var f = factions[i];
      state.reputation[f] = (state.reputation[f] || 0) + changes[f];
      state.reputation[f] = Math.max(-100, Math.min(100, state.reputation[f]));
    }
    saveState();
  }

  function gainSkill(domain, amount) {
    if (!domain || !state.skills.hasOwnProperty(domain)) return;
    state.skills[domain] = Math.min(100, (state.skills[domain] || 0) + amount);
    saveState();
  }

  function addCodexEntry(entry) {
    var exists = state.codex.some(function (e) { return e.id === entry.id; });
    if (!exists) {
      state.codex.push(entry);
      saveState();
    }
  }

  function updateStoryAct() {
    var completed = Object.keys(state.completedMissions);
    var hasStormcore = completed.some(function (id) { return id.indexOf('sc-') === 0; });
    var hasDarknet = completed.some(function (id) { return id.indexOf('dd-') === 0; });
    if (hasStormcore) state.storyAct = 3;
    else if (hasDarknet || completed.some(function (id) { return id.indexOf('lv-') === 0; })) state.storyAct = 2;
    else state.storyAct = 1;
    saveState();
  }

  // ========== COMBAT ENGINE ==========
  var combat = null;
  var pendingCounterCard = null;
  var pendingStoryBeat = null;

  function scaleDaemon(d, playerLevel) {
    var tierMult = 1 + (d.tier - 1) * 0.25;
    var lvlMult = 1 + Math.max(0, (playerLevel - 1) * 0.06);
    var isBoss = d.id === 'STORMCORE_SENTINEL';
    var bossMult = isBoss ? 1.6 : 1;
    return {
      id: d.id,
      name: d.name,
      hp: Math.round(d.baseHp * tierMult * lvlMult * bossMult),
      maxHp: Math.round(d.baseHp * tierMult * lvlMult * bossMult),
      atk: Math.round((d.atk + Math.floor(playerLevel * 0.8)) * bossMult),
      def: Math.round((d.def + Math.floor(playerLevel * 0.5)) * bossMult),
      behavior: d.behavior,
      boss: isBoss,
      phase: 1,
      weaknessRevealed: false,
      skillDomain: d.skillDomain,
      counterCard: d.counterCard,
      attackClass: d.attackClass
    };
  }

  function startCombat(enemyId, onEnd, mission) {
    var daemon = DAEMON_MAP[enemyId];
    if (!daemon) daemon = DAEMONS[0];
    var enemy = scaleDaemon(daemon, state.level);
    combat = {
      enemy: enemy,
      log: ['ENGAGED: ' + enemy.name + ' [' + enemy.attackClass + ']'],
      turn: 'player',
      noise: 0,
      onEnd: onEnd,
      mission: mission
    };
    activeTab = 'combat';
    render();
  }

  function endCombat(won) {
    var c = combat;
    combat = null;
    if (won) {
      var enemy = c.enemy;
      var daemon = DAEMON_MAP[enemy.id];
      // Loot
      var lootCredits = Math.floor(15 * enemy.maxHp / 30);
      gainCredits(lootCredits);
      // Skill gain
      if (daemon && daemon.skillDomain) {
        var skillAmt = 5 + daemon.tier * 3;
        gainSkill(daemon.skillDomain, skillAmt);
      }
      // Codex entry
      if (daemon) {
        addCodexEntry({
          id: 'daemon-' + daemon.id,
          type: 'daemon',
          name: daemon.name,
          attackClass: daemon.attackClass,
          tier: daemon.tier,
          counterCard: daemon.counterCard
        });
        pendingCounterCard = daemon;
      }
    } else {
      state.hp = Math.max(20, Math.floor(state.maxHp * 0.4));
      state.shield = Math.floor(state.maxShield * 0.3);
      saveState();
    }
    if (c.onEnd) c.onEnd(won);
    render();
  }

  function socSentinelStrike() {
    if (!combat) return;
    var dmg = 12 + Math.floor(Math.random() * 8);
    var absorbed = Math.min(state.shield, Math.floor(dmg * 0.5));
    state.shield -= absorbed;
    var hpHit = dmg - absorbed;
    state.hp -= hpHit;
    saveState();
    combat.log.push('SOC SENTINEL detects intrusion! Strikes for ' + dmg + ' (' + absorbed + ' absorbed)');
    combat.noise = Math.max(0, combat.noise - 30);
    if (state.hp <= 0) {
      state.hp = 0;
      combat.log.push('OPERATIVE DOWNED BY SOC RESPONSE');
      render();
      setTimeout(function () { endCombat(false); }, 500);
      return true;
    }
    return false;
  }

  function playerAct(action) {
    if (!combat || combat.turn !== 'player') return;
    var c = combat;
    var e = c.enemy;
    var msg;

    if (action === 'recon') {
      // Low damage, reduces DEF, reveals weakness
      var reconDmg = Math.max(1, 4 + Math.floor(Math.random() * 5) - Math.floor(e.def * 0.5));
      e.def = Math.max(0, e.def - 2);
      e.hp -= reconDmg;
      e.weaknessRevealed = true;
      c.noise = Math.min(100, c.noise + 5);
      msg = 'RECON: Scanned target for ' + reconDmg + ' dmg, DEF reduced. Weakness exposed.';
    } else if (action === 'exploit') {
      var baseDmg = 12 + Math.floor(Math.random() * 10);
      var bonus = e.weaknessRevealed ? Math.floor(baseDmg * 0.4) : 0;
      var exploitDmg = Math.max(1, baseDmg + bonus - e.def);
      e.hp -= exploitDmg;
      var noiseAdd = 15 + Math.floor(Math.random() * 11);
      c.noise = Math.min(100, c.noise + noiseAdd);
      msg = 'EXPLOIT: ' + exploitDmg + ' dmg' + (bonus > 0 ? ' (weakness bonus +' + bonus + ')' : '') + ' [noise +' + noiseAdd + ']';
    } else if (action === 'patch') {
      if (!consumeItem('PATCH-KIT')) {
        c.log.push('No PATCH-KIT available.');
        render();
        return;
      }
      var heal = 20 + Math.floor(Math.random() * 10);
      var shieldHeal = 8 + Math.floor(Math.random() * 5);
      state.hp = Math.min(state.maxHp, state.hp + heal);
      state.shield = Math.min(state.maxShield, state.shield + shieldHeal);
      saveState();
      msg = 'PATCH: Restored ' + heal + ' HP, ' + shieldHeal + ' shield.';
    } else if (action === 'run') {
      c.log.push('DISENGAGED — mission abandoned.');
      endCombat(false);
      return;
    }

    c.log.push(msg);

    // Check noise threshold
    if (c.noise >= 100) {
      if (socSentinelStrike()) return;
    }

    if (e.hp <= 0) {
      e.hp = 0;
      c.log.push('TARGET NEUTRALIZED — ' + e.name);
      c.turn = 'done';
      render();
      setTimeout(function () { endCombat(true); }, 500);
      return;
    }

    c.turn = 'enemy';
    render();
    setTimeout(enemyAct, 600);
  }

  function enemyAct() {
    if (!combat) return;
    var c = combat;
    var e = c.enemy;
    var pct = e.hp / e.maxHp;

    // Boss escalation
    if (e.boss && e.phase === 1 && pct < 0.5) {
      e.phase = 2;
      e.atk += 5;
      e.def += 3;
      c.log.push('PHASE 2 — ' + e.name + ' ESCALATES! ATK and DEF surge.');
    }
    if (e.boss && e.phase === 2 && pct < 0.2) {
      e.phase = 3;
      e.atk += 3;
      c.log.push('PHASE 3 — FINAL STAND! ' + e.name + ' channels maximum power.');
    }

    // Behavior-driven attacks
    var raw;
    var behaviorMsg = '';
    switch (e.behavior) {
      case 'probe':
        raw = Math.floor(e.atk * 0.6) + Math.floor(Math.random() * 4);
        behaviorMsg = ' (probing)';
        break;
      case 'harass':
        raw = Math.floor(e.atk * 0.75) + Math.floor(Math.random() * 6);
        behaviorMsg = ' (harassing)';
        break;
      case 'pressure':
        raw = e.atk + Math.floor(Math.random() * 5);
        behaviorMsg = ' (pressuring)';
        break;
      case 'fortify':
        raw = Math.floor(e.atk * 0.5) + Math.floor(Math.random() * 4);
        var regen = Math.min(Math.floor(e.maxHp * 0.06), e.maxHp - e.hp);
        if (regen > 0) {
          e.hp += regen;
          behaviorMsg = ' (fortified, heals ' + regen + ')';
        } else {
          behaviorMsg = ' (fortified)';
        }
        break;
      case 'escalate':
        raw = e.atk + Math.floor(Math.random() * 8) + (e.phase > 1 ? e.phase * 2 : 0);
        behaviorMsg = ' (escalating)';
        break;
      default:
        raw = e.atk + Math.floor(Math.random() * 5);
    }

    raw = Math.max(1, raw);
    var absorbed = Math.min(state.shield, Math.floor(raw * 0.55));
    state.shield -= absorbed;
    var hpHit = Math.max(0, raw - absorbed);
    state.hp -= hpHit;
    saveState();

    c.log.push(e.name + ' hits for ' + raw + behaviorMsg + ' (' + absorbed + ' shield / ' + hpHit + ' HP)');

    if (state.hp <= 0) {
      state.hp = 0;
      c.log.push('OPERATIVE DOWNED');
      render();
      setTimeout(function () { endCombat(false); }, 500);
      return;
    }

    c.turn = 'player';
    render();
  }

  // ========== MISSIONS ENGINE ==========
  function missionAvailable(m) {
    if (state.completedMissions[m.id]) return false;
    if (m.requiredLevel && state.level < m.requiredLevel) return false;
    if (m.requiredFaction) {
      var fk = Object.keys(m.requiredFaction);
      for (var i = 0; i < fk.length; i++) {
        if ((state.reputation[fk[i]] || 0) < m.requiredFaction[fk[i]]) return false;
      }
    }
    return true;
  }

  function completeMission(m) {
    state.completedMissions[m.id] = Date.now();
    if (m.reward.xp) gainXp(m.reward.xp);
    if (m.reward.credits) gainCredits(m.reward.credits);
    if (m.reward.item) gainItem(m.reward.item, 1);
    if (m.reward.reputation) gainReputation(m.reward.reputation);
    // Sector discovery codex
    addCodexEntry({ id: 'sector-' + m.sector.replace(/\s+/g, '-'), type: 'sector', name: m.sector });
    updateStoryAct();
    if (m.storyBeat) {
      pendingStoryBeat = m.storyBeat;
    }
    toast('MISSION COMPLETE: ' + m.title);
  }

  function doStartMission(m) {
    if (!missionAvailable(m)) { toast('Mission locked.'); return; }
    if (m.kind === 'instant') {
      completeMission(m);
      render();
    } else if (m.kind === 'combat') {
      startCombat(m.enemy, function (won) {
        if (won) completeMission(m);
        else toast('MISSION FAILED — recover and retry.');
        render();
      }, m);
    } else if (m.kind === 'choice') {
      // Show choice UI
      pendingChoice = m;
      activeTab = 'combat';
      render();
    }
  }

  var pendingChoice = null;

  function resolveChoice(m, choiceIdx) {
    pendingChoice = null;
    var choice = m.choices[choiceIdx];
    if (choice.reputation) gainReputation(choice.reputation);
    completeMission(m);
    render();
  }

  // ========== TOAST ==========
  function toast(msg) {
    var el = document.querySelector('.cw-toast-v2');
    if (!el) {
      el = document.createElement('div');
      el.className = 'cw-toast-v2';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el.__t);
    el.__t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ========== UI ==========
  var root = null;
  var open = false;
  var activeTab = 'missions';
  var missionSectorFilter = 'all';
  var codexSearchTerm = '';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'cw-gp-root';
    root.innerHTML =
      '<div class="cw-gp-panel" role="dialog" aria-label="Operative Console">' +
        '<header class="cw-gp-header"><span>OPERATIVE CONSOLE</span>' +
          '<button class="cw-gp-close" type="button" aria-label="Close">&times;</button>' +
        '</header>' +
        '<div class="cw-gp-tabs"></div>' +
        '<div class="cw-gp-body"></div>' +
        '<footer class="cw-gp-foot"></footer>' +
      '</div>';
    document.body.appendChild(root);
    injectStyles();
    root.querySelector('.cw-gp-close').addEventListener('click', function () { toggle(false); });
    renderTabs();
    return root;
  }

  function renderTabs() {
    var tabs = ['missions', 'combat', 'inventory', 'profile', 'codex', 'map'];
    var html = '';
    for (var i = 0; i < tabs.length; i++) {
      html += '<button data-tab="' + tabs[i] + '"' + (activeTab === tabs[i] ? ' class="active"' : '') + '>' + tabs[i].toUpperCase() + '</button>';
    }
    root.querySelector('.cw-gp-tabs').innerHTML = html;
    root.querySelectorAll('.cw-gp-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        activeTab = b.dataset.tab;
        renderTabs();
        render();
      });
    });
  }

  function toggle(force) {
    ensureRoot();
    open = (typeof force === 'boolean') ? force : !open;
    root.classList.toggle('open', open);
    if (open) { renderTabs(); render(); }
  }

  // ========== RENDER FUNCTIONS ==========

  function renderMissions() {
    var filterHtml = '<div class="cw-gp-filters">' +
      '<button data-sf="all"' + (missionSectorFilter === 'all' ? ' class="active"' : '') + '>ALL</button>';
    for (var s = 0; s < SECTORS.length; s++) {
      filterHtml += '<button data-sf="' + SECTORS[s] + '"' + (missionSectorFilter === SECTORS[s] ? ' class="active"' : '') + '>' + escapeHtml(SECTORS[s]) + '</button>';
    }
    filterHtml += '</div>';

    var rows = '';
    for (var i = 0; i < MISSIONS.length; i++) {
      var m = MISSIONS[i];
      if (missionSectorFilter !== 'all' && m.sector !== missionSectorFilter) continue;
      var done = !!state.completedMissions[m.id];
      var avail = missionAvailable(m);
      var locked = !avail && !done;
      var rwd = [];
      if (m.reward.xp) rwd.push(m.reward.xp + ' XP');
      if (m.reward.credits) rwd.push(m.reward.credits + 'c');
      if (m.reward.item) rwd.push(m.reward.item);
      if (m.reward.reputation) {
        var rk = Object.keys(m.reward.reputation);
        for (var ri = 0; ri < rk.length; ri++) {
          var rv = m.reward.reputation[rk[ri]];
          rwd.push(rk[ri] + ' ' + (rv > 0 ? '+' : '') + rv);
        }
      }
      var kindLabel = m.kind === 'combat' ? 'COMBAT' : m.kind === 'choice' ? 'CHOICE' : 'INSTANT';
      rows +=
        '<div class="cw-gp-mission ' + (done ? 'done' : locked ? 'locked' : '') + '">' +
          '<div class="m-head">' +
            '<strong>' + escapeHtml(m.title) + '</strong>' +
            '<span class="m-tag">' + escapeHtml(m.sector) + ' &middot; ' + kindLabel + '</span>' +
          '</div>' +
          '<p>' + escapeHtml(m.brief) + '</p>' +
          '<div class="m-foot">' +
            '<span class="m-reward">' + rwd.join(' &middot; ') + '</span>' +
            (done
              ? '<span class="m-done">COMPLETE</span>'
              : locked
                ? '<span class="m-lock">REQ TIER ' + (m.requiredLevel || '?') + '</span>'
                : '<button class="m-start" data-mid="' + m.id + '">' + (m.kind === 'combat' ? 'ENGAGE' : m.kind === 'choice' ? 'DECIDE' : 'EXECUTE') + '</button>') +
          '</div>' +
        '</div>';
    }

    return filterHtml + (rows || '<div class="cw-gp-empty"><p>No missions match the current filter.</p></div>');
  }

  function renderCombat() {
    // Story beat display
    if (pendingStoryBeat) {
      var beat = pendingStoryBeat;
      pendingStoryBeat = null;
      return '<div class="cw-gp-story">' +
        '<h3>STORY INTEL</h3>' +
        '<p>' + escapeHtml(beat) + '</p>' +
        '<button class="cw-gp-story-ok">ACKNOWLEDGE</button>' +
      '</div>';
    }

    // Counter card display
    if (pendingCounterCard) {
      var d = pendingCounterCard;
      pendingCounterCard = null;
      return '<div class="cw-gp-countercard">' +
        '<h3>THREAT INTEL CARD</h3>' +
        '<div class="cc-name">' + escapeHtml(d.name) + ' — ' + escapeHtml(d.attackClass) + '</div>' +
        '<div class="cc-section"><strong>Attack:</strong> ' + escapeHtml(d.counterCard.attack) + '</div>' +
        '<div class="cc-section"><strong>Description:</strong> ' + escapeHtml(d.counterCard.description) + '</div>' +
        '<div class="cc-section cc-miti"><strong>Mitigation:</strong> ' + escapeHtml(d.counterCard.mitigation) + '</div>' +
        '<p class="cc-note">This entry has been saved to your Codex.</p>' +
        '<button class="cw-gp-cc-ok">DISMISS</button>' +
      '</div>';
    }

    // Choice display
    if (pendingChoice) {
      var cm = pendingChoice;
      var choiceHtml = '<div class="cw-gp-choice">' +
        '<h3>' + escapeHtml(cm.title) + '</h3>' +
        '<p>' + escapeHtml(cm.brief) + '</p>';
      for (var ci = 0; ci < cm.choices.length; ci++) {
        var ch = cm.choices[ci];
        var repDescs = [];
        if (ch.reputation) {
          var rks = Object.keys(ch.reputation);
          for (var rki = 0; rki < rks.length; rki++) {
            var rv2 = ch.reputation[rks[rki]];
            repDescs.push(rks[rki] + ' ' + (rv2 > 0 ? '+' : '') + rv2);
          }
        }
        choiceHtml += '<button class="cw-gp-choicebtn" data-ci="' + ci + '">' + escapeHtml(ch.label) + ' [' + repDescs.join(', ') + ']</button>';
      }
      choiceHtml += '</div>';
      return choiceHtml;
    }

    // No combat
    if (!combat) {
      return '<div class="cw-gp-empty">' +
        '<p>No active engagement. Start a mission from the MISSIONS tab or spar below.</p>' +
        '<button class="cw-gp-train">Spar with PING FLOOD IMP</button>' +
      '</div>';
    }

    // Active combat
    var c = combat;
    var e = c.enemy;
    var pct = Math.max(0, Math.floor(100 * e.hp / e.maxHp));
    var noisePct = c.noise;
    var noiseColor = noisePct < 40 ? '#00ff9c' : noisePct < 70 ? '#ffa500' : '#ff3333';
    var disabled = c.turn !== 'player' ? ' disabled' : '';

    return '<div class="cw-gp-combat">' +
      '<div class="cb-enemy">' +
        '<strong>' + escapeHtml(e.name) + '</strong> <small>[' + escapeHtml(e.attackClass) + ']</small>' +
        (e.boss ? ' <span class="cb-boss">BOSS</span>' : '') +
        '<div class="cb-bar"><span style="width:' + pct + '%;background:' + (pct > 50 ? '#ff3333' : pct > 20 ? '#ffa500' : '#00ff9c') + '"></span></div>' +
        '<small>HP ' + Math.max(0, e.hp) + '/' + e.maxHp + ' | ATK ' + e.atk + ' | DEF ' + e.def + (e.weaknessRevealed ? ' | WEAKNESS EXPOSED' : '') + '</small>' +
      '</div>' +
      '<div class="cb-noise">' +
        '<span>NOISE</span>' +
        '<div class="cb-bar"><span style="width:' + noisePct + '%;background:' + noiseColor + '"></span></div>' +
        '<small>' + noisePct + '/100' + (noisePct >= 80 ? ' — SOC ALERT IMMINENT' : '') + '</small>' +
      '</div>' +
      '<div class="cb-actions">' +
        '<button data-act="recon"' + disabled + '>RECON <small>reveal+dmg, quiet</small></button>' +
        '<button data-act="exploit"' + disabled + '>EXPLOIT <small>main dmg, loud</small></button>' +
        '<button data-act="patch"' + disabled + '>PATCH <small>heal (' + (state.inventory['PATCH-KIT'] || 0) + ')</small></button>' +
        '<button data-act="run"' + disabled + '>RUN <small>disengage</small></button>' +
      '</div>' +
      '<div class="cb-log">' + c.log.slice(-8).map(escapeHtml).join('<br>') + '</div>' +
    '</div>';
  }

  function renderInventory() {
    var keys = Object.keys(state.inventory);
    if (!keys.length) return '<div class="cw-gp-empty"><p>Inventory empty.</p></div>';
    var html = '<div class="cw-gp-inv-grid">';
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var cat = ITEM_CATALOG[k];
      var desc = cat ? cat.desc : 'Unknown item.';
      html += '<div class="inv-item" title="' + escapeHtml(desc) + '">' +
        '<div class="inv-name">' + escapeHtml(k) + '</div>' +
        '<div class="inv-qty">&times;' + state.inventory[k] + '</div>' +
        '<div class="inv-desc">' + escapeHtml(desc) + '</div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderProfile() {
    var need = xpForLevel(state.level);
    var xpPct = state.level >= 10 ? 100 : Math.floor(100 * state.xp / need);
    var actName = state.storyAct === 1 ? 'INITIALIZATION' : state.storyAct === 2 ? 'ESCALATION' : 'CONVERGENCE';

    var html = '<div class="cw-gp-profile">';
    html += '<div class="pf-row"><span>Callsign</span><strong>' + escapeHtml(state.callsign) + '</strong></div>';
    html += '<div class="pf-row"><span>Tier</span><strong>' + state.level + ' / 10</strong></div>';
    html += '<div class="pf-row"><span>XP</span><strong>' + state.xp + ' / ' + need + '</strong></div>';
    html += '<div class="pf-bar"><span style="width:' + xpPct + '%"></span></div>';
    html += '<div class="pf-row"><span>HP</span><strong>' + state.hp + ' / ' + state.maxHp + '</strong></div>';
    html += '<div class="pf-row"><span>Shield</span><strong>' + state.shield + ' / ' + state.maxShield + '</strong></div>';
    html += '<div class="pf-row"><span>Credits</span><strong>' + state.credits + 'c</strong></div>';
    html += '<div class="pf-row"><span>Story Act</span><strong>Act ' + state.storyAct + ': ' + actName + '</strong></div>';
    html += '<div class="pf-row"><span>Missions</span><strong>' + Object.keys(state.completedMissions).length + ' / ' + MISSIONS.length + '</strong></div>';

    // Skills
    html += '<h4 class="pf-heading">SKILLS</h4>';
    for (var si = 0; si < SKILL_DOMAINS.length; si++) {
      var sd = SKILL_DOMAINS[si];
      var sv = state.skills[sd] || 0;
      var barLen = 20;
      var filled = Math.round(barLen * sv / 100);
      var bar = '';
      for (var bi = 0; bi < barLen; bi++) bar += bi < filled ? '#' : '-';
      html += '<div class="pf-skill"><span>' + sd.toUpperCase() + '</span><code>[' + bar + '] ' + sv + '/100</code></div>';
    }

    // Factions
    html += '<h4 class="pf-heading">FACTION STANDING</h4>';
    var factionKeys = Object.keys(state.reputation);
    for (var fi = 0; fi < factionKeys.length; fi++) {
      var fk2 = factionKeys[fi];
      var fv = state.reputation[fk2];
      var label = fv >= 50 ? 'ALLIED' : fv >= 20 ? 'FRIENDLY' : fv > -20 ? 'NEUTRAL' : fv > -50 ? 'SUSPICIOUS' : 'HOSTILE';
      html += '<div class="pf-faction"><span>' + escapeHtml(fk2) + '</span><strong>' + fv + ' (' + label + ')</strong></div>';
    }

    html += '<div class="pf-actions">' +
      '<button class="pf-rest">REST (full restore)</button>' +
      '<button class="pf-rename">CHANGE CALLSIGN</button>' +
      '<button class="pf-reset">RESET OPERATIVE</button>' +
    '</div>';
    html += '</div>';
    return html;
  }

  function renderCodex() {
    var html = '<div class="cw-gp-codex">';
    html += '<input class="codex-search" type="text" placeholder="Search codex..." value="' + escapeHtml(codexSearchTerm) + '">';

    if (state.codex.length === 0) {
      html += '<p class="cw-gp-empty">No entries discovered yet. Defeat daemons and complete missions to populate your Codex.</p>';
      html += '</div>';
      return html;
    }

    var groups = { daemon: [], sector: [] };
    for (var i = 0; i < state.codex.length; i++) {
      var entry = state.codex[i];
      if (codexSearchTerm) {
        var term = codexSearchTerm.toLowerCase();
        var searchable = (entry.name + ' ' + (entry.attackClass || '') + ' ' + (entry.counterCard ? entry.counterCard.attack + ' ' + entry.counterCard.description + ' ' + entry.counterCard.mitigation : '')).toLowerCase();
        if (searchable.indexOf(term) === -1) continue;
      }
      var type = entry.type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(entry);
    }

    if (groups.daemon && groups.daemon.length) {
      html += '<h4>DAEMONS DEFEATED (' + groups.daemon.length + '/' + DAEMONS.length + ')</h4>';
      for (var di = 0; di < groups.daemon.length; di++) {
        var de = groups.daemon[di];
        html += '<div class="codex-entry">';
        html += '<div class="codex-name">' + escapeHtml(de.name) + ' — Tier ' + de.tier + '</div>';
        html += '<div class="codex-class">' + escapeHtml(de.attackClass) + '</div>';
        if (de.counterCard) {
          html += '<div class="codex-detail"><strong>Attack:</strong> ' + escapeHtml(de.counterCard.description) + '</div>';
          html += '<div class="codex-detail cc-miti"><strong>Mitigation:</strong> ' + escapeHtml(de.counterCard.mitigation) + '</div>';
        }
        html += '</div>';
      }
    }

    if (groups.sector && groups.sector.length) {
      html += '<h4>SECTORS VISITED (' + groups.sector.length + '/' + SECTORS.length + ')</h4>';
      for (var si2 = 0; si2 < groups.sector.length; si2++) {
        html += '<div class="codex-entry"><div class="codex-name">' + escapeHtml(groups.sector[si2].name) + '</div></div>';
      }
    }

    html += '</div>';
    return html;
  }

  function renderMap() {
    var current = state.currentSector;
    var html = '<div class="cw-gp-map">';
    html += '<h4>SECTOR MAP</h4>';
    html += '<pre class="map-ascii">';
    html += '    +-------------------+\n';
    html += '    |   STORMCORE (IV)  |\n';
    html += '    +--------+----------+\n';
    html += '             |\n';
    html += '    +--------+----------+\n';
    html += '    | DARKNET DEPTHS(III)|\n';
    html += '    +--------+----------+\n';
    html += '             |\n';
    html += '    +--------+----------+\n';
    html += '    |  LAN VALLEY (II)  |\n';
    html += '    +--------+----------+\n';
    html += '             |\n';
    html += '    +--------+----------+\n';
    html += '    |MAINFRAME CORE (I) |\n';
    html += '    +-------------------+\n';
    html += '</pre>';
    html += '<div class="map-legend">Current sector: <strong>' + escapeHtml(current) + '</strong></div>';
    html += '<div class="map-nav">';
    for (var i = 0; i < SECTORS.length; i++) {
      var s = SECTORS[i];
      var isCurrent = s === current;
      html += '<button class="map-sector' + (isCurrent ? ' active' : '') + '" data-sector="' + escapeHtml(s) + '">' + escapeHtml(s) + (isCurrent ? ' [HERE]' : '') + '</button>';
    }
    html += '</div>';
    html += '</div>';
    return html;
  }

  function render() {
    if (!root || !open) return;
    var body = root.querySelector('.cw-gp-body');
    var foot = root.querySelector('.cw-gp-foot');

    switch (activeTab) {
      case 'missions': body.innerHTML = renderMissions(); break;
      case 'combat': body.innerHTML = renderCombat(); break;
      case 'inventory': body.innerHTML = renderInventory(); break;
      case 'profile': body.innerHTML = renderProfile(); break;
      case 'codex': body.innerHTML = renderCodex(); break;
      case 'map': body.innerHTML = renderMap(); break;
      default: body.innerHTML = renderMissions();
    }

    // Footer bar
    var noiseVal = combat ? combat.noise : 0;
    foot.innerHTML =
      '<span>TIER ' + state.level + '</span>' +
      '<span>HP ' + state.hp + '/' + state.maxHp + '</span>' +
      '<span>SHIELD ' + state.shield + '/' + state.maxShield + '</span>' +
      '<span>' + state.credits + 'c</span>' +
      '<span>XP ' + state.xp + '/' + xpForLevel(state.level) + '</span>' +
      '<span>NOISE ' + noiseVal + '</span>';

    wireEvents(body);
  }

  function wireEvents(body) {
    // Mission start buttons
    body.querySelectorAll('.m-start').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = MISSIONS.find(function (x) { return x.id === b.dataset.mid; });
        if (m) doStartMission(m);
      });
    });

    // Sector filter
    body.querySelectorAll('[data-sf]').forEach(function (b) {
      b.addEventListener('click', function () {
        missionSectorFilter = b.dataset.sf;
        render();
      });
    });

    // Combat actions
    body.querySelectorAll('.cb-actions button[data-act]').forEach(function (b) {
      b.addEventListener('click', function () { playerAct(b.dataset.act); });
    });

    // Training spar
    var train = body.querySelector('.cw-gp-train');
    if (train) train.addEventListener('click', function () {
      startCombat('PING_FLOOD_IMP', function () { render(); });
    });

    // Story/counter-card dismiss
    var storyOk = body.querySelector('.cw-gp-story-ok');
    if (storyOk) storyOk.addEventListener('click', function () { render(); });
    var ccOk = body.querySelector('.cw-gp-cc-ok');
    if (ccOk) ccOk.addEventListener('click', function () { render(); });

    // Choice buttons
    body.querySelectorAll('.cw-gp-choicebtn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (pendingChoice) resolveChoice(pendingChoice, parseInt(b.dataset.ci, 10));
      });
    });

    // Profile actions
    var rest = body.querySelector('.pf-rest');
    if (rest) rest.addEventListener('click', function () {
      state.hp = state.maxHp; state.shield = state.maxShield; saveState();
      toast('Fully restored.'); render();
    });
    var rename = body.querySelector('.pf-rename');
    if (rename) rename.addEventListener('click', function () {
      var n = prompt('Enter new callsign:');
      if (n && n.trim()) {
        state.callsign = n.trim().substring(0, 24).toUpperCase();
        saveState(); render();
        toast('Callsign updated.');
      }
    });
    var reset = body.querySelector('.pf-reset');
    if (reset) reset.addEventListener('click', function () {
      if (confirm('Reset operative? This wipes ALL progress.')) {
        localStorage.removeItem(SAVE_KEY);
        state = makeDefaultState();
        saveState();
        toast('Operative reset.');
        render();
      }
    });

    // Codex search
    var searchInput = body.querySelector('.codex-search');
    if (searchInput) searchInput.addEventListener('input', function () {
      codexSearchTerm = searchInput.value;
      render();
    });

    // Map sector nav
    body.querySelectorAll('.map-sector').forEach(function (b) {
      b.addEventListener('click', function () {
        state.currentSector = b.dataset.sector;
        saveState();
        addCodexEntry({ id: 'sector-' + state.currentSector.replace(/\s+/g, '-'), type: 'sector', name: state.currentSector });
        render();
      });
    });
  }

  // ========== STYLES ==========
  function injectStyles() {
    if (document.getElementById('cw-gp-styles-v2')) return;
    var style = document.createElement('style');
    style.id = 'cw-gp-styles-v2';
    style.textContent =
      '.cw-toast-v2{position:fixed;top:18px;left:50%;transform:translateX(-50%) translateY(-60px);' +
        'background:#0a0a12;color:#00ff9c;border:1px solid #00ff9c;padding:10px 24px;font-family:monospace;' +
        'font-size:13px;z-index:100001;opacity:0;transition:transform .3s,opacity .3s;pointer-events:none;border-radius:4px}' +
      '.cw-toast-v2.show{transform:translateX(-50%) translateY(0);opacity:1}' +

      '.cw-gp-fab{position:fixed;bottom:20px;right:20px;z-index:99998;background:#0f0f1a;color:#00ff9c;' +
        'border:1px solid #00ff9c;padding:10px 18px;font-family:monospace;font-size:12px;cursor:pointer;' +
        'border-radius:4px;text-transform:uppercase;letter-spacing:1px}' +
      '.cw-gp-fab:hover{background:#00ff9c;color:#0a0a12}' +

      '.cw-gp-root{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,.7);font-family:monospace}' +
      '.cw-gp-root.open{display:flex}' +

      '.cw-gp-panel{background:#0a0a12;color:#c8d6e5;border:1px solid #00ff9c;width:94vw;max-width:760px;' +
        'max-height:88vh;display:flex;flex-direction:column;border-radius:6px;overflow:hidden}' +

      '.cw-gp-header{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;' +
        'background:#0f0f1a;color:#00ff9c;font-size:14px;font-weight:bold;letter-spacing:1px}' +
      '.cw-gp-close{background:none;border:none;color:#ff3333;font-size:22px;cursor:pointer;padding:0 4px}' +

      '.cw-gp-tabs{display:flex;background:#0f0f1a;border-bottom:1px solid #1a1a2e;padding:0 8px;overflow-x:auto}' +
      '.cw-gp-tabs button{background:none;border:none;color:#555;padding:8px 12px;font-family:monospace;' +
        'font-size:11px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}' +
      '.cw-gp-tabs button.active{color:#00ff9c;border-bottom-color:#00ff9c}' +
      '.cw-gp-tabs button:hover{color:#aaa}' +

      '.cw-gp-body{flex:1;overflow-y:auto;padding:12px 16px;font-size:12px;line-height:1.5}' +

      '.cw-gp-foot{display:flex;gap:12px;padding:8px 16px;background:#0f0f1a;border-top:1px solid #1a1a2e;' +
        'font-size:11px;color:#00ff9c;flex-wrap:wrap}' +

      /* Missions */
      '.cw-gp-filters{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}' +
      '.cw-gp-filters button{background:#1a1a2e;border:1px solid #333;color:#888;padding:4px 10px;' +
        'font-family:monospace;font-size:10px;cursor:pointer;border-radius:3px}' +
      '.cw-gp-filters button.active{border-color:#00ff9c;color:#00ff9c}' +

      '.cw-gp-mission{border:1px solid #1a1a2e;padding:10px;margin-bottom:8px;border-radius:4px;background:#0f0f1a}' +
      '.cw-gp-mission.done{opacity:.55;border-color:#00ff9c33}' +
      '.cw-gp-mission.locked{opacity:.45}' +
      '.m-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:4px}' +
      '.m-head strong{color:#e0e0e0;font-size:13px}' +
      '.m-tag{font-size:10px;color:#666;background:#111;padding:2px 6px;border-radius:2px}' +
      '.cw-gp-mission p{margin:4px 0 8px;color:#999;font-size:11px}' +
      '.m-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px}' +
      '.m-reward{font-size:10px;color:#00ff9c}' +
      '.m-done{font-size:10px;color:#00ff9c;font-weight:bold}' +
      '.m-lock{font-size:10px;color:#ff6b6b}' +
      '.m-start{background:#00ff9c;color:#0a0a12;border:none;padding:4px 12px;font-family:monospace;' +
        'font-size:11px;cursor:pointer;border-radius:3px;font-weight:bold}' +
      '.m-start:hover{background:#00cc7a}' +

      /* Combat */
      '.cw-gp-combat{display:flex;flex-direction:column;gap:10px}' +
      '.cb-enemy{background:#1a1a2e;padding:10px;border-radius:4px}' +
      '.cb-enemy strong{color:#ff3333;font-size:14px}' +
      '.cb-enemy small{display:block;color:#888;margin-top:4px}' +
      '.cb-boss{background:#ff3333;color:#fff;padding:1px 6px;border-radius:2px;font-size:10px}' +
      '.cb-bar{height:8px;background:#1a1a2e;border:1px solid #333;border-radius:4px;overflow:hidden;margin:6px 0}' +
      '.cb-bar span{display:block;height:100%;transition:width .3s}' +
      '.cb-noise{background:#0f0f1a;padding:8px;border-radius:4px;border:1px solid #333}' +
      '.cb-noise span{color:#ffa500;font-size:11px;font-weight:bold}' +
      '.cb-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
      '.cb-actions button{background:#1a1a2e;border:1px solid #00ff9c;color:#00ff9c;padding:10px 8px;' +
        'font-family:monospace;font-size:12px;cursor:pointer;border-radius:4px;text-align:center}' +
      '.cb-actions button small{display:block;font-size:9px;color:#888;margin-top:2px}' +
      '.cb-actions button:hover:not([disabled]){background:#00ff9c;color:#0a0a12}' +
      '.cb-actions button:hover:not([disabled]) small{color:#0a0a12}' +
      '.cb-actions button[disabled]{opacity:.4;cursor:not-allowed}' +
      '.cb-log{background:#0a0a12;border:1px solid #1a1a2e;padding:8px;border-radius:4px;' +
        'font-size:11px;color:#aaa;max-height:140px;overflow-y:auto}' +

      /* Counter card */
      '.cw-gp-countercard{background:#0f0f1a;border:1px solid #00ff9c;padding:16px;border-radius:6px}' +
      '.cw-gp-countercard h3{color:#00ff9c;margin:0 0 10px;font-size:14px}' +
      '.cc-name{color:#ff3333;font-weight:bold;margin-bottom:8px;font-size:13px}' +
      '.cc-section{margin-bottom:8px;color:#c8d6e5;font-size:11px;line-height:1.6}' +
      '.cc-section strong{color:#ffa500}' +
      '.cc-miti{border-left:3px solid #00ff9c;padding-left:10px}' +
      '.cc-note{color:#555;font-size:10px;margin-top:10px}' +
      '.cw-gp-cc-ok,.cw-gp-story-ok,.cw-gp-choicebtn{display:block;margin:10px auto 0;background:#00ff9c;' +
        'color:#0a0a12;border:none;padding:8px 20px;font-family:monospace;font-size:12px;cursor:pointer;border-radius:3px}' +

      /* Story */
      '.cw-gp-story{background:#0f0f1a;border:1px solid #ffa500;padding:16px;border-radius:6px}' +
      '.cw-gp-story h3{color:#ffa500;margin:0 0 10px}' +
      '.cw-gp-story p{color:#c8d6e5;line-height:1.6}' +

      /* Choice */
      '.cw-gp-choice{text-align:center;padding:16px}' +
      '.cw-gp-choice h3{color:#ffa500;margin-bottom:10px}' +
      '.cw-gp-choice p{color:#999;margin-bottom:16px}' +
      '.cw-gp-choicebtn{margin:6px auto;width:90%;max-width:400px}' +

      /* Inventory */
      '.cw-gp-inv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}' +
      '.inv-item{background:#0f0f1a;border:1px solid #1a1a2e;padding:10px;border-radius:4px}' +
      '.inv-name{color:#00ff9c;font-weight:bold;font-size:12px}' +
      '.inv-qty{color:#ffa500;font-size:11px;margin:2px 0}' +
      '.inv-desc{color:#777;font-size:10px;line-height:1.4}' +

      /* Profile */
      '.cw-gp-profile{display:flex;flex-direction:column;gap:6px}' +
      '.pf-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1a1a2e}' +
      '.pf-row span{color:#888}' +
      '.pf-row strong{color:#e0e0e0}' +
      '.pf-bar{height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden;margin-bottom:4px}' +
      '.pf-bar span{display:block;height:100%;background:#00ff9c}' +
      '.pf-heading{color:#ffa500;margin:12px 0 4px;font-size:12px;border-bottom:1px solid #333;padding-bottom:4px}' +
      '.pf-skill{display:flex;justify-content:space-between;padding:2px 0;font-size:11px}' +
      '.pf-skill span{color:#888}' +
      '.pf-skill code{color:#00ff9c;font-size:10px}' +
      '.pf-faction{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}' +
      '.pf-faction span{color:#888}' +
      '.pf-faction strong{color:#e0e0e0}' +
      '.pf-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}' +
      '.pf-actions button{background:#1a1a2e;border:1px solid #333;color:#aaa;padding:6px 14px;' +
        'font-family:monospace;font-size:11px;cursor:pointer;border-radius:3px}' +
      '.pf-actions button:hover{border-color:#00ff9c;color:#00ff9c}' +

      /* Codex */
      '.cw-gp-codex h4{color:#ffa500;margin:12px 0 6px;font-size:12px}' +
      '.codex-search{width:100%;background:#0f0f1a;border:1px solid #333;color:#c8d6e5;padding:6px 10px;' +
        'font-family:monospace;font-size:11px;border-radius:3px;margin-bottom:10px;box-sizing:border-box}' +
      '.codex-entry{background:#0f0f1a;border:1px solid #1a1a2e;padding:10px;margin-bottom:6px;border-radius:4px}' +
      '.codex-name{color:#ff3333;font-weight:bold;font-size:12px}' +
      '.codex-class{color:#ffa500;font-size:11px;margin:2px 0}' +
      '.codex-detail{color:#999;font-size:10px;margin-top:4px;line-height:1.5}' +
      '.codex-detail strong{color:#ffa500}' +

      /* Map */
      '.cw-gp-map{text-align:center}' +
      '.cw-gp-map h4{color:#00ff9c;margin-bottom:8px}' +
      '.map-ascii{color:#00ff9c;font-size:11px;line-height:1.3;text-align:center;margin:0 auto}' +
      '.map-legend{color:#888;font-size:11px;margin:10px 0}' +
      '.map-nav{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}' +
      '.map-sector{background:#1a1a2e;border:1px solid #333;color:#888;padding:6px 14px;' +
        'font-family:monospace;font-size:11px;cursor:pointer;border-radius:3px}' +
      '.map-sector.active{border-color:#00ff9c;color:#00ff9c;background:#0a2a1a}' +
      '.map-sector:hover{border-color:#00ff9c;color:#00ff9c}' +

      '.cw-gp-empty{text-align:center;padding:20px;color:#555}' +
      '.cw-gp-empty p{margin-bottom:12px}';
    document.head.appendChild(style);
  }

  // ========== FAB & HOTKEY ==========
  function mountFab() {
    if (document.querySelector('.cw-gp-fab')) return;
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'cw-gp-fab';
    fab.setAttribute('aria-label', 'Open Operative Console (M)');
    fab.title = 'Operative Console (M)';
    fab.textContent = 'CONSOLE';
    fab.addEventListener('click', function () { toggle(); });
    document.body.appendChild(fab);
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
    if (ev.key === 'm' || ev.key === 'M') { ev.preventDefault(); toggle(); }
    else if (ev.key === 'Escape' && open) { toggle(false); }
  });

  function wireRoutes() {
    if (typeof window.__cwAddRoute !== 'function') return;
    window.__cwOpenConsole = function (tab) {
      activeTab = tab || 'missions';
      toggle(true);
    };
  }

  function boot() {
    if (!document.body) return;
    mountFab();
    wireRoutes();
    try { console.log('%c[CyberWorld gameplay v2] ready — press M', 'color:#00ff9c;font-weight:bold'); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', boot, { once: true });
  window.addEventListener('load', boot, { once: true });
  setTimeout(boot, 0);
  setTimeout(boot, 1200);
  var bootAttempts = 0;
  var bootWatch = setInterval(function () {
    boot();
    bootAttempts++;
    if (bootAttempts >= 10) clearInterval(bootWatch);
  }, 1000);

  // ========== PUBLIC API ==========
  window.__cwGameplay = {
    state: function () { return JSON.parse(JSON.stringify(state)); },
    open: function () { toggle(true); },
    close: function () { toggle(false); },
    toggle: toggle,
    gainXp: gainXp,
    gainCredits: gainCredits,
    gainItem: gainItem,
    startMission: function (id) {
      var m = MISSIONS.find(function (x) { return x.id === id; });
      if (m) doStartMission(m);
    },
    missions: function () { return MISSIONS.slice(); }
  };

  // ========== UX LAYER: loading sequence, settings, pause, audio (Epic 8) ==========
  var SETTINGS_KEY = 'cw.settings.v1';
  var settings = (function () {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { audio: true, reduceMotion: false, particles: 'high', firstRun: true };
  })();
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // Procedural Web Audio — no external assets, all synthesized
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx || !settings.audio) return audioCtx;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function tone(freq, dur, type, gain) {
    if (!settings.audio) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      var t0 = ctx.currentTime;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime((gain != null ? gain : 0.06), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.12));
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + (dur || 0.12) + 0.02);
    } catch (e) {}
  }
  window.cwAudio = {
    click: function () { tone(660, 0.05, 'square', 0.04); },
    confirm: function () { tone(880, 0.08, 'triangle', 0.05); tone(1320, 0.06, 'triangle', 0.04); },
    hit: function () { tone(140, 0.08, 'sawtooth', 0.07); },
    win: function () { tone(523, 0.10, 'triangle', 0.06); setTimeout(function () { tone(784, 0.14, 'triangle', 0.06); }, 90); },
    error: function () { tone(160, 0.20, 'square', 0.07); },
    mute: function () { settings.audio = !settings.audio; saveSettings(); return settings.audio; },
    isMuted: function () { return !settings.audio; }
  };
  // Click sound on console buttons (delegated)
  document.addEventListener('click', function (ev) {
    if (!settings.audio) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('.cw-gp-root') || t.closest('.cw-pause-root') || t.closest('.cw-gp-fab')) {
      if (t.matches('button, [role="button"], .cw-gp-tab, .cw-gp-act')) window.cwAudio.click();
    }
  }, true);

  // Loading sequence — shown until canvas appears or 5s timeout
  function mountLoader() {
    if (document.querySelector('.cw-loader')) return;
    if (window.location.pathname.indexOf('/CyberWorld') !== 0 && window.location.pathname !== '/') {
      // Only on the CyberWorld game page
      return;
    }
    var el = document.createElement('div');
    el.className = 'cw-loader';
    el.innerHTML =
      '<div class="cw-loader-inner">' +
        '<div class="cw-loader-logo">CYBERWORLD</div>' +
        '<div class="cw-loader-bar"><div class="cw-loader-bar-fill"></div></div>' +
        '<div class="cw-loader-msg">Booting Phaser runtime…</div>' +
      '</div>';
    document.body.appendChild(el);
    var msgs = [
      'Booting Phaser runtime…',
      'Initializing scenes…',
      'Synchronizing operative profile…',
      'Connecting to mainframe…',
      'Calibrating sensors…'
    ];
    var msgIdx = 0;
    var msgEl = el.querySelector('.cw-loader-msg');
    var msgTimer = setInterval(function () {
      msgIdx = (msgIdx + 1) % msgs.length;
      if (msgEl) msgEl.textContent = msgs[msgIdx];
    }, 700);
    var t0 = Date.now();
    var watchdog = setInterval(function () {
      var hasCanvas = !!document.querySelector('canvas');
      var elapsed = Date.now() - t0;
      if (hasCanvas || elapsed > 5000) {
        clearInterval(watchdog);
        clearInterval(msgTimer);
        el.classList.add('done');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
      }
    }, 200);
  }

  // Pause menu — opens on Escape when console is closed
  var pauseOpen = false;
  function mountPause() {
    if (document.querySelector('.cw-pause-root')) return;
    var root = document.createElement('div');
    root.className = 'cw-pause-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Pause Menu');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="cw-pause-panel">' +
        '<h2>PAUSED</h2>' +
        '<button type="button" data-act="resume">RESUME</button>' +
        '<button type="button" data-act="console">OPERATIVE CONSOLE</button>' +
        '<button type="button" data-act="settings">SETTINGS</button>' +
        '<button type="button" data-act="quit">RETURN TO DESKTOP</button>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (ev) {
      if (ev.target === root) { setPause(false); return; }
      var act = ev.target.getAttribute && ev.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'resume') setPause(false);
      else if (act === 'console') { setPause(false); if (window.__cwGameplay) window.__cwGameplay.open(); }
      else if (act === 'settings') openSettings();
      else if (act === 'quit') { window.location.href = '/'; }
    });
  }
  function setPause(on) {
    mountPause();
    var root = document.querySelector('.cw-pause-root');
    if (!root) return;
    pauseOpen = !!on;
    root.classList.toggle('open', pauseOpen);
    root.setAttribute('aria-hidden', pauseOpen ? 'false' : 'true');
    // Pause Phaser if available
    try {
      var canvas = document.querySelector('canvas');
      if (canvas && canvas.__phaserGame && canvas.__phaserGame.scene) {
        // best-effort: don't crash if game shape differs
        var sm = canvas.__phaserGame.scene;
        if (sm && sm.scenes) {
          sm.scenes.forEach(function (sc) {
            try { if (pauseOpen) sc.scene.pause(); else sc.scene.resume(); } catch (e) {}
          });
        }
      }
    } catch (e) {}
  }

  // Settings panel — modal layered above pause
  function openSettings() {
    var existing = document.querySelector('.cw-settings-root');
    if (existing) { existing.classList.add('open'); return; }
    var root = document.createElement('div');
    root.className = 'cw-settings-root open';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Settings');
    root.innerHTML =
      '<div class="cw-settings-panel">' +
        '<h2>SETTINGS</h2>' +
        '<label class="cw-set-row"><span>Audio</span><input type="checkbox" data-set="audio"' + (settings.audio ? ' checked' : '') + '></label>' +
        '<label class="cw-set-row"><span>Reduce motion</span><input type="checkbox" data-set="reduceMotion"' + (settings.reduceMotion ? ' checked' : '') + '></label>' +
        '<label class="cw-set-row"><span>Particle quality</span>' +
          '<select data-set="particles">' +
            '<option value="low"' + (settings.particles === 'low' ? ' selected' : '') + '>Low</option>' +
            '<option value="medium"' + (settings.particles === 'medium' ? ' selected' : '') + '>Medium</option>' +
            '<option value="high"' + (settings.particles === 'high' ? ' selected' : '') + '>High</option>' +
          '</select>' +
        '</label>' +
        '<div class="cw-set-actions">' +
          '<button type="button" data-act="close">CLOSE</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener('change', function (ev) {
      var key = ev.target.getAttribute && ev.target.getAttribute('data-set');
      if (!key) return;
      if (ev.target.type === 'checkbox') settings[key] = ev.target.checked;
      else settings[key] = ev.target.value;
      saveSettings();
      // Apply motion preference live
      document.documentElement.classList.toggle('cw-reduce-motion', !!settings.reduceMotion);
    });
    root.addEventListener('click', function (ev) {
      if (ev.target === root) { root.classList.remove('open'); return; }
      if (ev.target.getAttribute && ev.target.getAttribute('data-act') === 'close') {
        root.classList.remove('open');
      }
    });
    document.documentElement.classList.toggle('cw-reduce-motion', !!settings.reduceMotion);
  }
  // Apply motion preference on load
  document.documentElement.classList.toggle('cw-reduce-motion', !!settings.reduceMotion);

  // Escape key: close settings → close pause → open pause (only if console isn't open)
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
    var settingsEl = document.querySelector('.cw-settings-root.open');
    if (settingsEl) { ev.preventDefault(); settingsEl.classList.remove('open'); return; }
    var consoleOpen = document.querySelector('.cw-gp-root.open');
    if (consoleOpen) return; // existing handler will close it
    ev.preventDefault();
    setPause(!pauseOpen);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'p' || ev.key === 'P') {
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      ev.preventDefault();
      setPause(!pauseOpen);
    }
  });

  // Boot loader once DOM is ready
  if (document.body) mountLoader();
  else document.addEventListener('DOMContentLoaded', mountLoader, { once: true });

  // Public API additions
  window.__cwGameplay.pause = function () { setPause(true); };
  window.__cwGameplay.resume = function () { setPause(false); };
  window.__cwGameplay.settings = openSettings;
})();
