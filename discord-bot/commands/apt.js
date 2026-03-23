/**
 * /apt — CyberWorld APT faction data: game-lore battle stats, territory, active campaigns.
 * Unlike /adversary (real-world threat actors), this is focused on the in-game CyberWorld RPG factions.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const FACTIONS = {
  DARKNET_SYNDICATE: {
    color: 0xff003c,
    icon: '☠️',
    tier: 'ELITE',
    territory: 'DARKNET_DEPTHS sector',
    threat: 10,
    operatives: 847,
    active: true,
    specialization: 'Zero-Day Exploits / Daemon Summoning',
    campaign: 'OPERATION: GHOST_PROTOCOL — mass SOULCODE daemon deployment',
    weaknesses: ['INTEGRITY_CHECK','FORMAL_VERIFICATION'],
    strongVs: ['ENDPOINT_AV','SIGNATURE_SCAN'],
    daemons: ['ZERO_DAY_SPECTER','ROOTKIT_v3'],
    lore: 'The most feared faction in the CyberWorld grid. Born from the wreckage of three FBI-takedown botnet operations, DARKNET_SYNDICATE evolved into a decentralized autonomous threat — no single leader, no fixed C2, just consensus-based chaos. Their SOULCODE daemon summons are legendary.',
    loot: ['💎 ZERO_DAY_EXPLOIT.bin','🔑 DARKNET_ACCESS.key','⚡ +850 XP','🎖️ Shadow Council Badge'],
    battleTips: 'Deploy INTEGRITY_CHECK first — disables their STEALTH daemons. Avoid SIGNATURE_SCAN tools; they\'ve reverse-engineered every vendor signature database.',
  },
  LAZARUS_CELL: {
    color: 0xff00ea,
    icon: '🇰🇵',
    tier: 'EXTREME',
    territory: 'LAN_VALLEY sector',
    threat: 9,
    operatives: 1240,
    active: true,
    specialization: 'Crypto Heists / Supply Chain Attacks',
    campaign: 'OPERATION: TRADER_TRAITOR — targeting CyberWorld exchanges',
    weaknesses: ['BEHAVIORAL_ANALYSIS','IMMUTABLE_BACKUP'],
    strongVs: ['SIGNATURE_SCAN','ENDPOINT_AV'],
    daemons: ['TROJAN_GHOST','WORM_SLITHER'],
    lore: 'The CyberWorld\'s most profitable threat actor. LAZARUS_CELL has laundered over 40,000 SOULCOINS through compromised exchange nodes. They operate using trojanized trading apps and macOS supply chain vectors. Their TROJAN_GHOST daemons are nearly impossible to detect via static analysis.',
    loot: ['💰 CRYPTO_HEIST_WALLET.json','📦 SUPPLY_CHAIN_IMPLANT.pkg','⚡ +720 XP','🎖️ Crypto Phantom Badge'],
    battleTips: 'Sandbox everything — TROJAN_GHOST is immune to static scan but BEHAVIORAL_ANALYSIS in Cuckoo catches the backdoor within 3 seconds of execution.',
  },
  VOLT_GRID: {
    color: 0x00aaff,
    icon: '⚡',
    tier: 'CRITICAL',
    territory: 'SOC_TOWER sector',
    threat: 8,
    operatives: 560,
    active: true,
    specialization: 'Critical Infrastructure / LOLbin Evasion',
    campaign: 'OPERATION: GRID_POISON — pre-positioning in power grid nodes',
    weaknesses: ['BEHAVIORAL_HUNT','C2_TAKEDOWN'],
    strongVs: ['SIGNATURE_SCAN','ENDPOINT_AV'],
    daemons: ['WORM_SLITHER'],
    lore: 'VOLT_GRID never drops malware — they\'re invisible to every AV solution. They use only native OS tools (certutil, netsh, wmic) to tunnel C2 and maintain persistence. Patient, methodical, and pre-positioned in CyberWorld\'s power infrastructure for potential wartime use.',
    loot: ['🔌 GRID_ACCESS_CODES.txt','📊 INFRASTRUCTURE_MAP.svg','⚡ +580 XP','🎖️ Grid Phantom Badge'],
    battleTips: 'Hunt behavioral chains, not hashes. Deploy Splunk query: `EventCode=4688 (CommandLine="*certutil*" OR "*wmic*")` to expose their LOLbin abuse.',
  },
  PHANTOM_SPIDER: {
    color: 0x9900ff,
    icon: '🕷️',
    tier: 'HIGH',
    territory: 'MAINFRAME_CORE sector',
    threat: 7,
    operatives: 320,
    active: true,
    specialization: 'Social Engineering / Cloud Identity Attacks',
    campaign: 'OPERATION: CLOUD_HIJACK — Okta bypass at scale',
    weaknesses: ['FIDO2_MFA','ZERO_TRUST_ARCH'],
    strongVs: ['SMS_MFA','PASSWORD_POLICY'],
    daemons: ['BOTNET_SWARM'],
    lore: 'PHANTOM_SPIDER doesn\'t need exploits — they call your helpdesk. A 10-minute phone call to IT support is enough to bypass Okta MFA and own your cloud tenant. Their BOTNET_SWARM daemons provide overwhelming DDoS cover while they quietly exfil from S3.',
    loot: ['☁️ CLOUD_TENANT_DUMP.json','🔑 IAM_PRIVESC_CHAIN.md','⚡ +450 XP','🎖️ Spider King Badge'],
    battleTips: 'FIDO2 hardware keys are their kryptonite — completely immune to vishing/phishing MFA bypass. Zero Trust architecture removes the implicit trust they exploit.',
  },
  IRON_BEAR_UNIT: {
    color: 0xff4400,
    icon: '🐻',
    tier: '破壊的 DESTRUCTIVE',
    territory: 'AI_OVERSEER sector',
    threat: 10,
    operatives: 695,
    active: true,
    specialization: 'Destructive Wiper / ICS-SCADA Attacks',
    campaign: 'OPERATION: GRID_WIPE — deploying CaddyWiper across CyberWorld nodes',
    weaknesses: ['IMMUTABLE_BACKUP','NETWORK_SEGMENTATION'],
    strongVs: ['ENDPOINT_AV','RATE_LIMITING'],
    daemons: ['RANSOMWARE_PHANTOM'],
    lore: 'The most destructive unit in CyberWorld. IRON_BEAR_UNIT doesn\'t want ransom — they want to burn everything. Their RANSOMWARE_PHANTOM daemons encrypt AND destroy, targeting ICS/SCADA control systems to trigger real-world physical damage. Their NotPetya ancestor caused $10B damage in a single deploy.',
    loot: ['💀 WIPER_PAYLOAD_ANALYSIS.bin','🔬 ICS_VULN_REPORT.pdf','⚡ +900 XP','🎖️ Iron Destroyer Badge'],
    battleTips: 'Air-gapped immutable backups are your ONLY defense. Network segmentation prevents lateral spread. IRON_BEAR_UNIT ignores everything else.',
  },
  SCATTERED_WEB: {
    color: 0xffaa00,
    icon: '🌐',
    tier: 'HIGH',
    territory: 'LAN_VALLEY sector',
    threat: 7,
    operatives: 412,
    active: true,
    specialization: 'AI Injection / LLM Exploitation',
    campaign: 'OPERATION: AI_JAILBREAK — weaponizing LLM backdoors',
    weaknesses: ['INPUT_VALIDATION','SYSTEM_PROMPT_GUARD'],
    strongVs: ['SIGNATURE_SCAN','BEHAVIORAL_ANALYSIS'],
    daemons: ['TROJAN_GHOST','WORM_SLITHER'],
    lore: 'The newest faction — born in 2024 when LLMs became infrastructure. SCATTERED_WEB exploits AI-integrated applications through prompt injection, indirect retrieval attacks, and jailbreak payloads. They\'ve successfully exfiltrated system prompts from 40+ enterprise AI deployments.',
    loot: ['🤖 JAILBREAK_PAYLOAD_PACK.txt','📄 AI_VULN_REPORT_2026.pdf','⚡ +520 XP','🎖️ AI Hunter Badge'],
    battleTips: 'Input validation and system prompt guards. Deploy `garak` to test your LLM: `garak -m openai -p dan` — runs 40+ jailbreak categories in minutes.',
  },
};

const TIER_ICON = {
  'ELITE': '💠', 'EXTREME': '🔴', 'CRITICAL': '🔺', 'HIGH': '🟠', '破壊的 DESTRUCTIVE': '💥'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apt')
    .setDescription('CyberWorld APT faction intel — battle stats, territory, active campaigns, and daemon roster')
    .addStringOption(opt =>
      opt.setName('faction')
        .setDescription('APT faction to look up (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '☠️ DARKNET_SYNDICATE — zero-day specialists', value: 'DARKNET_SYNDICATE' },
          { name: '🇰🇵 LAZARUS_CELL — crypto heist operators',   value: 'LAZARUS_CELL'     },
          { name: '⚡ VOLT_GRID — LOLbin critical infra',        value: 'VOLT_GRID'         },
          { name: '🕷️ PHANTOM_SPIDER — cloud identity attacks',  value: 'PHANTOM_SPIDER'    },
          { name: '🐻 IRON_BEAR_UNIT — destructive wiper ops',   value: 'IRON_BEAR_UNIT'    },
          { name: '🌐 SCATTERED_WEB — AI injection faction',     value: 'SCATTERED_WEB'     },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const key     = interaction.options.getString('faction');
    const fKey    = key || Object.keys(FACTIONS)[Math.floor(Math.random() * Object.keys(FACTIONS).length)];
    const f       = FACTIONS[fKey];
    const tierIcon = TIER_ICON[f.tier] || '🔴';

    const threatBar = '█'.repeat(f.threat) + '░'.repeat(10 - f.threat);

    const embed = new EmbedBuilder()
      .setColor(f.color)
      .setTitle(`${f.icon} APT FACTION: ${fKey}  //  ${tierIcon} ${f.tier}`)
      .setDescription(`> ${f.lore}`)
      .addFields(
        {
          name: '📊 FACTION STATUS',
          value: [
            `**Territory:** \`${f.territory}\``,
            `**Threat Level:** \`${threatBar}\` ${f.threat}/10`,
            `**Active Operatives:** ${f.operatives.toLocaleString()}`,
            `**Status:** ${f.active ? '🔴 ACTIVE — HOSTILE' : '⚪ DORMANT'}`,
            `**Specialization:** \`${f.specialization}\``,
          ].join('\n'),
          inline: false,
        },
        {
          name: '🎯 ACTIVE CAMPAIGN',
          value: `\`${f.campaign}\``,
          inline: false,
        },
        {
          name: '✅ Weak To',
          value: f.weaknesses.map(w => `\`${w}\``).join('\n'),
          inline: true,
        },
        {
          name: '⚠️ Strong Vs',
          value: f.strongVs.map(s => `\`${s}\``).join('\n'),
          inline: true,
        },
        {
          name: '👹 Known Daemons',
          value: f.daemons.map(d => `\`${d}\``).join('  '),
          inline: false,
        },
        {
          name: '📦 Loot (on defeating faction)',
          value: f.loot.join('\n'),
          inline: false,
        },
        {
          name: '⚔️ Battle Strategy',
          value: `> ${f.battleTips}`,
          inline: false,
        },
        {
          name: '🌐 Engage This Faction',
          value: `[Launch CyberWorld RPG](${SITE_URL}/cyberworld.html) — navigate to \`${f.territory}\` to begin engagement`,
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT CyberWorld APT DB • SOULCODE Engine v2026.3` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('☠️ Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
