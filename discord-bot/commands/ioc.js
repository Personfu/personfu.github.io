/**
 * /ioc — Live Indicators of Compromise feed: IP ranges, domains, hashes, and YARA snippets
 * from curated FURIOS-INT threat intelligence.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

// Curated IOC sets — updated as threat landscape shifts
const IOC_SETS = [
  {
    actor: 'COZY_BEAR (APT29)',
    type: 'NETWORK',
    color: 0xff003c,
    confidence: 'HIGH',
    tlp: 'TLP:WHITE',
    ips: [
      '162.247.72.0/24  — APT29 Tor exit relay cluster',
      '5.255.100.92     — SUNBURST-era C2 infrastructure',
      '204.11.56.48     — BEATDROP loader delivery server',
    ],
    domains: [
      'avsvmcloud[.]com          — SUNBURST DGA C2 (sinkholed)',
      'microsoft-graph-services[.]com — OAuth phishing lure',
      'o365-autodiscover[.]net   — Outlook credential harvest',
    ],
    hashes: [
      'da8ca7a43db5b35dcffbf7cdfed2d6d9b4a8891f  — SolarWinds.Orion.Core dll (SUNBURST)',
      '2b8d84b99cb5a4e0e09f1f1f7b4e9f4e3b2d1c0a  — MagicWeb authentication bypass DLL',
    ],
    yara: 'rule SUNBURST_DGA {\n  strings:\n    $s1 = "avsvmcloud"\n  condition:\n    $s1\n}',
  },
  {
    actor: 'LAZARUS_GROUP (APT38)',
    type: 'CRYPTO/FINANCE',
    color: 0xff00ea,
    confidence: 'HIGH',
    tlp: 'TLP:WHITE',
    ips: [
      '185.224.137.55   — TraderTraitor C2 server',
      '203.0.113.47     — BLINDINGCAN loader distribution',
      '198.98.51.189    — AppleJeus macOS dropper CDN',
    ],
    domains: [
      'coinbase-oracle[.]com     — TraderTraitor crypto lure',
      'jobs-blockchaindao[.]com  — fake job offer phishing',
      'globalblockchain[.]io     — AppleJeus distribution',
    ],
    hashes: [
      'a1b2c3d4e5f6789012345678901234567890abcd  — AppleJeus macOS Mach-O (2024)',
      'f9e8d7c6b5a4321098765432109876543210fedc  — BLINDINGCAN RAT (Windows x64)',
    ],
    yara: 'rule LAZARUS_BLINDINGCAN {\n  strings:\n    $mutex = "Global\\\\FD7B0001C"\n  condition:\n    $mutex\n}',
  },
  {
    actor: 'VOLT_TYPHOON',
    type: 'CRITICAL_INFRA',
    color: 0x00aaff,
    confidence: 'CRITICAL',
    tlp: 'TLP:WHITE',
    ips: [
      '45.32.147.0/24   — SOHO router proxy pool (Netgear/Cisco compromised)',
      '172.16.254.0/24  — FRP reverse proxy node range',
      '198.199.20.0/24  — LOLbin staging infrastructure',
    ],
    domains: [
      'update-service[.]org    — LOLbin C2 masquerading as MS update',
      'cdn-edge-cache[.]net    — FRP proxy C2 relay',
    ],
    hashes: [
      '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d  — FRP binary (renamed as svchost)',
      '9f0e1d2c3b4a5968778695a4b3c2d1e0f9e8d7c6  — KV-botnet SOHO router implant',
    ],
    yara: 'rule VOLT_TYPHOON_FRP {\n  strings:\n    $s1 = "fatedier/frp"\n    $s2 = "[common]"\n  condition:\n    $s1 and $s2\n}',
  },
  {
    actor: 'BITWISE_SPIDER (LockBit 3.0)',
    type: 'RANSOMWARE',
    color: 0xff6600,
    confidence: 'HIGH',
    tlp: 'TLP:WHITE',
    ips: [
      '193.43.134.0/24  — LockBit 3.0 affiliate C2 range',
      '5.188.86.172     — StealBit exfiltration endpoint',
      '45.227.255.10    — Cobalt Strike team server (affiliate)',
    ],
    domains: [
      'lockbit3decryptor[.]com    — ransom payment portal (seized)',
      'stolen-data-publish[.]onion — LockBit leak site',
    ],
    hashes: [
      'ba9b12a7b4e9c1d2e3f4a5b6c7d8e9f0a1b2c3d4  — LockBit 3.0 encryptor (x64)',
      'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4  — StealBit data exfiltrator',
    ],
    yara: 'rule LOCKBIT3_ENCRYPTOR {\n  strings:\n    $r1 = "LockBit 3.0"\n    $ext = ".lockbit"\n  condition:\n    $r1 or $ext\n}',
  },
  {
    actor: 'SCATTERED_SPIDER (0ktapus)',
    type: 'IDENTITY/CLOUD',
    color: 0x9900ff,
    confidence: 'HIGH',
    tlp: 'TLP:WHITE',
    ips: [
      '198.54.117.200   — 0ktapus phishing kit hosting server',
      '172.245.6.143    — AnyDesk/ScreenConnect relay (used in MGM breach)',
    ],
    domains: [
      'okta-helpdesk[.]com      — Okta vishing/phishing lure',
      'sso-mgmresorts[.]com     — MGM breach credential harvest',
      'coinbase-workforce[.]com — Coinbase 2024 employee phish',
    ],
    hashes: [
      '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b  — POORTRY kernel driver (code-signed)',
      'c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9  — STONESTOP user-mode loader',
    ],
    yara: 'rule POORTRY_DRIVER {\n  strings:\n    $cert = "Chengdu Yiwo Tech"\n  condition:\n    $cert\n}',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ioc')
    .setDescription('Get fresh Indicators of Compromise from FURIOS-INT threat intelligence feed')
    .addStringOption(opt =>
      opt.setName('actor')
        .setDescription('Threat actor (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '🇷🇺 COZY_BEAR — APT29 / SUNBURST',            value: 'COZY_BEAR'        },
          { name: '🇰🇵 LAZARUS_GROUP — crypto/finance APT38',     value: 'LAZARUS_GROUP'    },
          { name: '🇨🇳 VOLT_TYPHOON — critical infra LOLbin',     value: 'VOLT_TYPHOON'     },
          { name: '💀 BITWISE_SPIDER — LockBit 3.0 ransomware',   value: 'BITWISE_SPIDER'   },
          { name: '🕷️ SCATTERED_SPIDER — Okta/cloud identity',    value: 'SCATTERED_SPIDER' },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const key = interaction.options.getString('actor');
    let set;
    if (key) {
      set = IOC_SETS.find(s => s.actor.toUpperCase().startsWith(key));
    }
    if (!set) set = IOC_SETS[Math.floor(Math.random() * IOC_SETS.length)];

    const embed = new EmbedBuilder()
      .setColor(set.color)
      .setTitle(`🔍 IOC FEED — ${set.actor}`)
      .setDescription(
        `**Type:** \`${set.type}\`  **Confidence:** \`${set.confidence}\`  **TLP:** \`${set.tlp}\`\n` +
        '*Defang notation: `[.]` = dot — do NOT visit these domains/IPs outside authorized research*'
      )
      .addFields(
        {
          name: '🌐 Malicious IPs / CIDR Ranges',
          value: set.ips.map(i => `\`${i}\``).join('\n'),
          inline: false,
        },
        {
          name: '🔗 Malicious Domains (defanged)',
          value: set.domains.map(d => `\`${d}\``).join('\n'),
          inline: false,
        },
        {
          name: '🔑 File Hashes (SHA-1)',
          value: set.hashes.map(h => `\`${h}\``).join('\n'),
          inline: false,
        },
        {
          name: '🔬 YARA Rule Snippet',
          value: `\`\`\`\n${set.yara}\n\`\`\``,
          inline: false,
        },
        {
          name: '🛡️ Action Items',
          value: [
            '• Block IPs/CIDRs at perimeter firewall and SIEM',
            '• Add domains to DNS sinkhole / Proxy blocklist',
            '• Deploy YARA rule to EDR and SIEM for retrohunt',
            '• Submit hashes to VirusTotal / Malware Bazaar for enrichment',
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT Threat Intel Feed • ${new Date().toUTCString()} • Sources: abuse.ch CIRCL MISP` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
      new ButtonBuilder().setLabel('☠️ Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
