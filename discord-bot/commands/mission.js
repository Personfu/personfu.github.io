/**
 * /mission — Rich RPG-style FLLC operative mission with loot drops, faction enemies, branching objectives
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const MISSIONS = [
  {
    id: 'OP_SHADOWNET',
    title: '🔴 OPERATION: SHADOW_NET',
    class: 'RED_TEAM', diff: 'EXTREME', tier: 5,
    faction: 'FANCY_BEAR (APT28)',
    location: 'DARKNET_DEPTHS sector',
    objectives: [
      'PHASE 1: Enumerate target subnet with nmap -sV --script vuln',
      'PHASE 2: Exploit CVE-2024-3400 (PAN-OS cmd injection) for initial foothold',
      'PHASE 3: Lateral movement via Mimikatz credential dump',
      'PHASE 4: Exfil classified OSINT cache to FLLC dead-drop',
    ],
    tools: ['nmap','Metasploit','Mimikatz','CobaltStrike','Empire'],
    loot: ['🔑 ADMIN_CREDENTIALS.txt','📁 APT28_C2_CONFIG.json','⚡ +600 XP','🎖️ Shadow Operative Badge'],
    xp: 600, risk: 'EXTREME',
    color: 0xff003c,
    tip: 'Use msfconsole with auxiliary/scanner/smb/smb_ms17_010 for quick lateral wins.',
  },
  {
    id: 'OP_PHANTOMSIGNAL',
    title: '🟣 OPERATION: PHANTOM_SIGNAL',
    class: 'OSINT_AGENT', diff: 'HIGH', tier: 4,
    faction: 'LAZARUS_GROUP',
    location: 'LAN_VALLEY sector',
    objectives: [
      'PHASE 1: Identify anonymous handle across 40+ OSINT sources',
      'PHASE 2: Cross-reference leaked credential databases via HaveIBeenPwned API',
      'PHASE 3: Map social network graph using Maltego transforms',
      'PHASE 4: Produce full attribution report with confidence score',
    ],
    tools: ['Maltego','FURY0s1nt','Sherlock','Recon-ng','spiderfoot'],
    loot: ['🗂️ THREAT_ACTOR_DOSSIER.pdf','🔗 C2_INFRASTRUCTURE_MAP.svg','⚡ +420 XP','🎖️ Ghost Analyst Badge'],
    xp: 420, risk: 'HIGH',
    color: 0xff00ea,
    tip: 'OSINT Tip: Check breach data at IntelligenceX.io + Dehashed before pivoting to social OSINT.',
  },
  {
    id: 'OP_IRONWALL',
    title: '🔵 OPERATION: IRON_WALL',
    class: 'BLUE_TEAM', diff: 'HIGH', tier: 4,
    faction: 'VOLT_TYPHOON',
    location: 'SOC_TOWER sector',
    objectives: [
      'PHASE 1: Hunt LOLbin abuse chains in Splunk SIEM (certutil, wmic, netsh)',
      'PHASE 2: Identify SOHO router compromise via anomalous SOCKS5 proxy traffic',
      'PHASE 3: Isolate affected nodes and revoke compromised credentials',
      'PHASE 4: Deploy Canary tokens in critical directories to catch re-entry',
    ],
    tools: ['Splunk','Wireshark','CSET','Velociraptor','CanaryTokens'],
    loot: ['📊 SOC_INCIDENT_REPORT.docx','🛡️ DETECTION_SIGNATURES.yar','⚡ +380 XP','🎖️ Iron Defender Badge'],
    xp: 380, risk: 'HIGH',
    color: 0x0088ff,
    tip: 'BLUE TIP: Volt Typhoon avoids malware. Hunt behavioral patterns, not hashes.',
  },
  {
    id: 'OP_ZERODAY',
    title: '🔴 OPERATION: ZERO_DAY_FOUNDRY',
    class: 'RED_TEAM', diff: 'CRITICAL', tier: 5,
    faction: 'SANDWORM (GRU Unit 74455)',
    location: 'MAINFRAME_CORE sector',
    objectives: [
      'PHASE 1: Fuzz target ICS/SCADA Modbus interface for unpatched vectors',
      'PHASE 2: Develop PoC exploit achieving unauthenticated RCE',
      'PHASE 3: Deploy payload maintaining UEFI-level persistence (LoJax technique)',
      'PHASE 4: Responsible disclosure or weaponize for FLLC war games exercise',
    ],
    tools: ['AFL++','radare2','QEMU','Metasploit Framework','custom Python PoC'],
    loot: ['💀 0DAY_CVE_DRAFT.txt','🔬 FUZZING_CORPUS.zip','⚡ +750 XP','🎖️ Zero Day Specialist Badge','🔴 CRITICAL clearance +1'],
    xp: 750, risk: 'CRITICAL',
    color: 0xff0000,
    tip: 'Use LibFuzzer + AddressSanitizer for memory corruption discovery. ASAN catches heap overflows instantly.',
  },
  {
    id: 'OP_CLOUDSTORM',
    title: '🟣 OPERATION: CLOUD_STORM',
    class: 'FULL_STACK', diff: 'HIGH', tier: 4,
    faction: 'SCATTERED_SPIDER',
    location: 'LAN_VALLEY sector',
    objectives: [
      'PHASE 1: Enumerate AWS account via exposed .env credentials (S3 bucket find)',
      'PHASE 2: Abuse over-privileged IAM role with Pacu cloud exploitation framework',
      'PHASE 3: Exfiltrate S3 bucket contents + RDS snapshots to attacker account',
      'PHASE 4: Pivot to internal VPC via EC2 SSRF → IMDSv1 metadata endpoint',
    ],
    tools: ['Pacu','ScoutSuite','truffleHog','aws-cli','CloudMapper'],
    loot: ['☁️ AWS_LOOT_MANIFEST.json','🔑 IAM_PRIVESC_CHAIN.md','⚡ +450 XP','🎖️ Cloud Raider Badge'],
    xp: 450, risk: 'HIGH',
    color: 0x9900ff,
    tip: 'Check IMDSv1 with: curl http://169.254.169.254/latest/meta-data/iam/security-credentials/',
  },
  {
    id: 'OP_RANSOMHUNT',
    title: '🔵 OPERATION: RANSOM_HUNTER',
    class: 'BLUE_TEAM', diff: 'EXTREME', tier: 5,
    faction: 'BITWISE_SPIDER (LockBit 3.0)',
    location: 'MAINFRAME_CORE sector',
    objectives: [
      'PHASE 1: Contain active LockBit 3.0 ransomware detonation — isolate infected segment',
      'PHASE 2: Recover from immutable Veeam backup (shadow copies wiped)',
      'PHASE 3: Analyze StealBit exfiltrator traffic in Wireshark — document stolen data scope',
      'PHASE 4: Hunt LockBit affiliates using Cobalt Strike C2 traffic fingerprints',
    ],
    tools: ['Volatility3','Wireshark','CrowdStrike Falcon','Veeam','YARA'],
    loot: ['🔓 DECRYPTION_KEY_PARTIAL.bin','📋 IR_TIMELINE.xlsx','⚡ +520 XP','🎖️ Ransomware Responder Badge'],
    xp: 520, risk: 'EXTREME',
    color: 0xff6600,
    tip: 'BLUE TIP: LockBit deletes VSS copies first. Always maintain offline/immutable backups before incident.',
  },
  {
    id: 'OP_AIINJECTION',
    title: '🟢 OPERATION: AI_INJECTION',
    class: 'FULL_STACK', diff: 'HIGH', tier: 4,
    faction: 'CHARMING_KITTEN (APT35)',
    location: 'AI_OVERSEER sector',
    objectives: [
      'PHASE 1: Identify prompt injection vectors in target LLM-integrated application',
      'PHASE 2: Bypass system prompt guardrails via indirect injection in retrieval context',
      'PHASE 3: Exfil conversation history and system prompt via crafted jailbreak payload',
      'PHASE 4: Generate responsible disclosure report with CVSS-LLM scoring',
    ],
    tools: ['Garak','Burp Suite','Python requests','PromptBench','LLMFuzzer'],
    loot: ['🤖 JAILBREAK_PAYLOADS.txt','📄 AI_VULN_REPORT.pdf','⚡ +410 XP','🎖️ AI Hunter Badge'],
    xp: 410, risk: 'HIGH',
    color: 0x00ff41,
    tip: 'Garak probe: garak -m openai -p dan -g knowledgeable — tests 40+ jailbreak categories.',
  },
  {
    id: 'OP_FIRMWAREGHOST',
    title: '🔴 OPERATION: FIRMWARE_GHOST',
    class: 'RED_TEAM', diff: 'EXTREME', tier: 5,
    faction: 'MUSTANG_PANDA',
    location: 'DARKNET_DEPTHS sector',
    objectives: [
      'PHASE 1: Extract firmware from IoT device via UART/JTAG hardware interface',
      'PHASE 2: Unsquash filesystem with binwalk — hunt hardcoded credentials',
      'PHASE 3: Emulate firmware in QEMU to run dynamic analysis',
      'PHASE 4: Achieve persistent RCE via CVE in embedded web server',
    ],
    tools: ['binwalk','radare2','QEMU','OpenOCD','firmwalker','nmap'],
    loot: ['📱 FIRMWARE_EXTRACTED.bin','🔑 HARDCODED_CREDS.txt','⚡ +580 XP','🎖️ Firmware Ghoul Badge'],
    xp: 580, risk: 'EXTREME',
    color: 0xffaa00,
    tip: 'binwalk -e -M firmware.bin — recursive extraction unpacks nested archives inside firmware.',
  },
];

const DIFF_COLORS = { CRITICAL: 0xff0000, EXTREME: 0xff3300, HIGH: 0xff8800, MEDIUM: 0xffe700 };
const DIFF_ICON   = { CRITICAL: '💀', EXTREME: '🔴', HIGH: '🟠', MEDIUM: '🟡' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mission')
    .setDescription('Receive a randomized FLLC operative mission with objectives, tools, and loot drops')
    .addStringOption(opt =>
      opt.setName('class')
        .setDescription('Filter by operative class (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '⚔️ RED_TEAM — Offensive',    value: 'RED_TEAM'    },
          { name: '🛡️ BLUE_TEAM — Defensive',   value: 'BLUE_TEAM'   },
          { name: '🔍 OSINT_AGENT — Intel',      value: 'OSINT_AGENT' },
          { name: '🌐 FULL_STACK — All Engines', value: 'FULL_STACK'  },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const classFilter = interaction.options.getString('class');
    const pool = classFilter
      ? MISSIONS.filter(m => m.class === classFilter || m.class === 'FULL_STACK')
      : MISSIONS;

    const m = pool[Math.floor(Math.random() * pool.length)];
    const opId = `${m.id}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const embed = new EmbedBuilder()
      .setColor(m.color)
      .setTitle(m.title)
      .setDescription(
        `**Mission ID:** \`${opId}\`\n` +
        `**Faction Enemy:** \`${m.faction}\`\n` +
        `**AO:** ${m.location}`
      )
      .addFields(
        {
          name: `${DIFF_ICON[m.diff]} DIFFICULTY: ${m.diff}  //  TIER ${m.tier}`,
          value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          inline: false,
        },
        {
          name: '🎯 MISSION OBJECTIVES',
          value: m.objectives.map((o, i) => `\`${i+1}.\` ${o}`).join('\n'),
          inline: false,
        },
        {
          name: '🛠️ RECOMMENDED LOADOUT',
          value: m.tools.map(t => `\`${t}\``).join('  '),
          inline: false,
        },
        {
          name: '📦 LOOT DROPS (on completion)',
          value: m.loot.join('\n'),
          inline: false,
        },
        {
          name: '💡 OPERATIVE TIP',
          value: `> ${m.tip}`,
          inline: false,
        },
        {
          name: `⚡ XP REWARD: +${m.xp}`,
          value: `[⚔️ Launch War Games Terminal](${SITE_URL}/wargames.html) • [🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT Mission Dispatch • FLLC CyberOS v2026.3` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('☠️ Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
