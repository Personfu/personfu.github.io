/**
 * /bounty — Active FLLC operative bounty board: wanted threat actors, daemon capture bounties, CTF prizes.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

// Active bounties — rotated periodically
const BOUNTIES = [
  {
    type: 'APT_TAKEDOWN',
    icon: '🎯',
    priority: 'CRITICAL',
    color: 0xff003c,
    target: 'IRON_BEAR_UNIT',
    description: 'IRON_BEAR_UNIT has deployed CaddyWiper across 3 CyberWorld infrastructure nodes. Take down their RANSOMWARE_PHANTOM daemon and destroy their C2 in AI_OVERSEER sector.',
    objectives: [
      'Defeat RANSOMWARE_PHANTOM daemon (LEGENDARY tier)',
      'Navigate to AI_OVERSEER sector in CyberWorld RPG',
      'Destroy IRON_BEAR_UNIT C2 node using IMMUTABLE_BACKUP exploit',
      'Exfil 500 SOULCOINS of WIPER_PAYLOAD data',
    ],
    reward: {
      xp: 900,
      items: ['💎 RANSOMWARE_KEY_PARTIAL.bin', '🎖️ Iron Destroyer Badge', '🔒 CLEARANCE_LEVEL +1', '💰 500 SOULCOINS'],
      expires: '72 hours',
    },
    difficulty: 'EXTREME',
    claimedBy: null,
    posted: '2026-03-23',
  },
  {
    type: 'DAEMON_CAPTURE',
    icon: '👹',
    priority: 'HIGH',
    color: 0xff00ea,
    target: 'ZERO_DAY_SPECTER (★ MYTHIC)',
    description: 'ZERO_DAY_SPECTER has been sighted in DARKNET_DEPTHS. The first operative to capture this MYTHIC daemon will be immortalized in the FLLC Hall of Fame.',
    objectives: [
      'Locate ZERO_DAY_SPECTER in DARKNET_DEPTHS sector',
      'Possess MATHEMATICAL_PROOF capture item',
      'Successfully capture (1% base capture rate)',
      'Report to FLLC Operations Command',
    ],
    reward: {
      xp: 9999,
      items: ['★ MYTHIC SPECTER CARD', '🏆 Hall of Fame permanent badge', '💎 GRANDMASTER fast-track', '🔑 Full CLEARANCE unlock'],
      expires: 'Open bounty — until captured',
    },
    difficulty: '★ MYTHIC',
    claimedBy: null,
    posted: '2026-03-01',
  },
  {
    type: 'CTF_CHALLENGE',
    icon: '🏁',
    priority: 'HIGH',
    color: 0x00ff41,
    target: 'PHANTOM_SIGNAL CTF — find the flag',
    description: 'Hidden flag embedded in FLLC CyberWorld network. Solve 5 reconnaissance challenges across intel.html, cyberworld.html, wargames.html to find the final SHA-256 hash.',
    objectives: [
      'Complete /scan nmap on target 10.0.0.1/24',
      'Decode the base64 string in /decrypt type:BASE64',
      'Find the hidden IPv6 in intel.html source code',
      'Solve War Games terminal mission OP_SHADOWNET',
      'Submit final flag: FLLC{SHA256_OF_ALL_FINDINGS}',
    ],
    reward: {
      xp: 750,
      items: ['🏁 CTF Champion Badge', '🔬 Zero Day Researcher title', '⚡ +750 XP', '📋 CTF Write-up credit'],
      expires: '7 days',
    },
    difficulty: 'HIGH',
    claimedBy: null,
    posted: '2026-03-20',
  },
  {
    type: 'INTEL_COLLECTION',
    icon: '📡',
    priority: 'MEDIUM',
    color: 0x00aaff,
    target: 'LAZARUS_CELL C2 Infrastructure',
    description: 'LAZARUS_CELL has established a new C2 cluster in LAN_VALLEY. Collect IOC signatures from their WORM_SLITHER and TROJAN_GHOST daemons to compile a threat intelligence report.',
    objectives: [
      'Defeat TROJAN_GHOST daemon in LAN_VALLEY sector',
      'Capture WORM_SLITHER daemon using ISOLATION_CAGE',
      'Collect 3 unique IOC signatures',
      'Submit /ioc report to FURIOS-INT Command',
    ],
    reward: {
      xp: 420,
      items: ['🗂️ THREAT_INTEL_DOSSIER', '🔍 IOC Analyst Badge', '⚡ +420 XP', '📡 Intel Hub premium access'],
      expires: '48 hours',
    },
    difficulty: 'HIGH',
    claimedBy: null,
    posted: '2026-03-22',
  },
  {
    type: 'FACTION_HUNT',
    icon: '⚔️',
    priority: 'MEDIUM',
    color: 0xff8800,
    target: 'PHANTOM_SPIDER cloud ops in MAINFRAME_CORE',
    description: 'PHANTOM_SPIDER is executing CLOUD_HIJACK in MAINFRAME_CORE. Disrupt their BOTNET_SWARM deployment before they seize the sector\'s IAM infrastructure.',
    objectives: [
      'Defeat BOTNET_SWARM daemon (EPIC tier)',
      'Navigate to MAINFRAME_CORE sector',
      'Deploy FIDO2_MFA counter-measure',
      'Exfil PHANTOM_SPIDER\'s IAM configuration map',
    ],
    reward: {
      xp: 520,
      items: ['☁️ Cloud Defender Badge', '🔑 MAINFRAME_CORE access key', '⚡ +520 XP', '🛡️ ZERO_TRUST badge'],
      expires: '36 hours',
    },
    difficulty: 'HIGH',
    claimedBy: null,
    posted: '2026-03-23',
  },
];

const DIFF_COLORS = { 'EXTREME': 0xff003c, '★ MYTHIC': 0xffffff, 'HIGH': 0xff8800, 'MEDIUM': 0xffe700 };
const DIFF_ICON   = { 'EXTREME': '🔴', '★ MYTHIC': '🔮', 'HIGH': '🟠', 'MEDIUM': '🟡', 'CRITICAL': '💥' };
const PRI_ICON    = { 'CRITICAL': '🚨', 'HIGH': '⚠️', 'MEDIUM': '📋' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bounty')
    .setDescription('View the FLLC active operative bounty board — APT takedowns, daemon captures, and CTF prizes')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Filter bounty type (default: all active)')
        .setRequired(false)
        .addChoices(
          { name: '🎯 APT Takedown — faction kill missions',       value: 'APT_TAKEDOWN'     },
          { name: '👹 Daemon Capture — rare catch bounties',        value: 'DAEMON_CAPTURE'   },
          { name: '🏁 CTF Challenge — capture-the-flag events',    value: 'CTF_CHALLENGE'     },
          { name: '📡 Intel Collection — IOC and OSINT bounties',  value: 'INTEL_COLLECTION'  },
          { name: '⚔️ Faction Hunt — territory control missions',  value: 'FACTION_HUNT'      },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const filter = interaction.options.getString('type');
    const list   = filter ? BOUNTIES.filter(b => b.type === filter) : BOUNTIES;

    if (!list.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x555555)
          .setTitle('📋 NO ACTIVE BOUNTIES')
          .setDescription('No bounties match this filter. Check back after next FLLC Op cycle.')],
        ephemeral: true,
      });
    }

    // Show top bounty in detail, rest as summary
    const top = list[0];
    const embed = new EmbedBuilder()
      .setColor(top.color)
      .setTitle(`${top.icon} BOUNTY BOARD — ${filter || 'ALL ACTIVE OPERATIONS'}`)
      .setDescription(
        '```\n' +
        '╔══════════════════════════════════════════╗\n' +
        '║  FURIOS-INT OPERATIVE BOUNTY DISPATCH    ║\n' +
        '║  Claim by completing all objectives      ║\n' +
        '╚══════════════════════════════════════════╝\n' +
        '```'
      );

    for (const b of list.slice(0, 3)) {
      embed.addFields({
        name: `${PRI_ICON[b.priority]} [${b.priority}] ${b.target}  //  ${DIFF_ICON[b.difficulty]} ${b.difficulty}`,
        value: [
          b.description.slice(0, 150) + '…',
          `**Objectives:** ${b.objectives.length} phases`,
          `**Reward:** ⚡ +${b.reward.xp} XP • ${b.reward.items.slice(0, 2).join(' • ')}`,
          `**Expires:** ${b.reward.expires}`,
          `**Posted:** ${b.posted}`,
        ].join('\n'),
        inline: false,
      });
    }

    embed.addFields(
      {
        name: '📊 Bounty Summary',
        value: [
          `🚨 CRITICAL: ${BOUNTIES.filter(b => b.priority === 'CRITICAL').length}`,
          `⚠️ HIGH: ${BOUNTIES.filter(b => b.priority === 'HIGH').length}`,
          `📋 MEDIUM: ${BOUNTIES.filter(b => b.priority === 'MEDIUM').length}`,
          `💰 Total XP available: ${BOUNTIES.reduce((a, b) => a + b.reward.xp, 0).toLocaleString()} XP`,
        ].join('  •  '),
        inline: false,
      },
      {
        name: '🎮 How to Claim',
        value: '1. Complete all listed objectives in CyberWorld RPG or War Games Terminal\n2. Screenshot your completion proof\n3. Post in `#bounty-claims` with `/mission` ID',
        inline: false,
      },
      {
        name: '🔗 Begin Operations',
        value: [
          `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
          `[⚔️ War Games](${SITE_URL}/wargames.html)`,
          `[📡 Intel Hub](${SITE_URL}/intel.html)`,
        ].join(' • '),
        inline: false,
      },
    )
    .setFooter({ text: `FURIOS-INT Bounty Command • ${BOUNTIES.length} active bounties • CyberOS v2026.3-FLLC` })
    .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
      new ButtonBuilder().setLabel('☠️ Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
