/**
 * /signal — Encrypted operative communication: send/receive intel drops, OSINT pings,
 * and faction messages. Flavors FLLC inter-operative comms with cyberpunk aesthetic.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

// Signal types: encrypted message formats with flavor
const SIGNAL_TYPES = {
  INTEL: {
    icon: '📡',
    color: 0x00e8ff,
    prefix: 'SIGINT_BURST',
    classification: 'UNCLASSIFIED // FLLC OPERATIVE EYES ONLY',
    header: 'FURIOS-INT INTELLIGENCE TRANSMISSION',
  },
  MISSION: {
    icon: '🎯',
    color: 0xff8800,
    prefix: 'OPORD_SIGNAL',
    classification: 'CLASSIFIED // RED_TEAM CLEARANCE REQUIRED',
    header: 'OPERATIVE MISSION SIGNAL',
  },
  ALERT: {
    icon: '🚨',
    color: 0xff003c,
    prefix: 'FLASH_ALERT',
    classification: 'URGENT // ALL OPERATIVES',
    header: 'FURIOS-INT PRIORITY ALERT',
  },
  GHOST: {
    icon: '👻',
    color: 0x9900ff,
    prefix: 'GHOST_SIGNAL',
    classification: 'BLACK // EYES ONLY',
    header: 'SHADOW OPERATIVE TRANSMISSION',
  },
};

// Simple XOR-style cipher display (visual only — not real crypto, educational)
function fakeEncrypt(text) {
  return Buffer.from(text).toString('base64');
}

// Simulate OSINT lookup results for a handle/domain
function generateOsintResult(query) {
  const findings = [
    `🔎 Surface web indexed: ${Math.floor(Math.random() * 450 + 50)} results`,
    `📧 Email leaks found: ${Math.floor(Math.random() * 3)} (HaveIBeenPwned + Dehashed)`,
    `🌐 Associated domains: ${Math.floor(Math.random() * 5 + 1)} registered`,
    `💬 Social footprint: ${['Twitter/X', 'GitHub', 'LinkedIn', 'Reddit', 'Telegram'][Math.floor(Math.random() * 5)]} active`,
    `📍 Location inference: ${['US', 'EU', 'UNKNOWN', 'HIDDEN (VPN/Tor)'][Math.floor(Math.random() * 4)]}`,
    `🔑 Password database hits: ${Math.floor(Math.random() * 8)} (rotate credentials now)`,
    `🕸️ Dark web mentions: ${Math.floor(Math.random() * 3)} (Tor2Web, Ahmia)`,
    `⚠️ Threat score: ${Math.floor(Math.random() * 40 + 10)}/100`,
  ];
  return findings.filter(() => Math.random() > 0.3).slice(0, 5);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signal')
    .setDescription('Send encrypted operative intel signal — FLLC inter-op comms, OSINT ping, or ghost message')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Signal type')
        .setRequired(true)
        .addChoices(
          { name: '📡 INTEL — intelligence transmission to team',   value: 'INTEL'  },
          { name: '🎯 MISSION — operational orders signal',          value: 'MISSION'},
          { name: '🚨 ALERT — priority threat alert broadcast',      value: 'ALERT'  },
          { name: '👻 GHOST — classified shadow operative signal',   value: 'GHOST'  },
          { name: '🔎 OSINT — quick surface OSINT ping on a target', value: 'OSINT'  },
        )
    )
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Your signal message or target for OSINT (max 200 chars)')
        .setRequired(true)
        .setMaxLength(200)
    )
    .addUserOption(opt =>
      opt.setName('recipient')
        .setDescription('Operative to direct this signal to (optional)')
        .setRequired(false)
    ),

  async execute(interaction, { SITE_URL }) {
    const type      = interaction.options.getString('type', true);
    const message   = interaction.options.getString('message', true);
    const recipient = interaction.options.getUser('recipient');
    const sender    = interaction.user;

    // OSINT mode — generate fake surface scan
    if (type === 'OSINT') {
      const cleanTarget = message.replace(/[<>"']/g, '').slice(0, 50);
      const results     = generateOsintResult(cleanTarget);
      const embed = new EmbedBuilder()
        .setColor(0x00ff41)
        .setTitle(`🔎 OSINT SURFACE SCAN — \`${cleanTarget}\``)
        .setDescription(
          `**Operator:** <@${sender.id}>\n` +
          '**Source:** FURY0s1nt passive scan layer\n' +
          '**Disclaimer:** *Simulated educational OSINT. Never perform real OSINT without authorization.*'
        )
        .addFields(
          { name: '📊 SCAN RESULTS', value: results.join('\n'), inline: false },
          {
            name: '🛠️ Real OSINT Tools',
            value: '`sherlock` `theHarvester` `Maltego` `Recon-ng` `SpiderFoot` `IntelligenceX`',
            inline: false,
          },
          {
            name: '📋 Next Steps',
            value: '1. Cross-reference findings with breach databases\n2. Map social graph with Maltego transforms\n3. Check dark web via Ahmia + Tor2Web\n4. Produce attribution report with confidence score',
            inline: false,
          },
          {
            name: '⚠️ Legal',
            value: '*OSINT on real targets must be authorized. This is a simulated educational result.*',
            inline: false,
          },
        )
        .setFooter({ text: `FURIOS-INT OSINT Layer • ${new Date().toUTCString()}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
        new ButtonBuilder().setLabel('☠️ Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Signal message mode
    const sigDef   = SIGNAL_TYPES[type];
    const msgId    = `SIG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`;
    const encoded  = fakeEncrypt(message);
    const ts       = new Date().toUTCString();

    const embed = new EmbedBuilder()
      .setColor(sigDef.color)
      .setTitle(`${sigDef.icon} ${sigDef.header}`)
      .setDescription(
        '```\n' +
        `┌─ ${sigDef.classification}\n` +
        `├─ SIGNAL_ID: ${msgId}\n` +
        `├─ TIMESTAMP: ${ts}\n` +
        `├─ FROM: ${sender.username.toUpperCase()}\n` +
        `└─ TO: ${recipient ? recipient.username.toUpperCase() : 'ALL_OPERATIVES'}\n` +
        '```'
      )
      .addFields(
        {
          name: '📨 PLAINTEXT TRANSMISSION',
          value: message,
          inline: false,
        },
        {
          name: '🔒 BASE64 ENCODED',
          value: `\`${encoded.slice(0, 100)}${encoded.length > 100 ? '…' : ''}\``,
          inline: false,
        },
        {
          name: '📡 SIGNAL METADATA',
          value: [
            `**Type:** \`${sigDef.prefix}\``,
            `**Signal ID:** \`${msgId}\``,
            `**Sender:** <@${sender.id}>`,
            recipient ? `**Recipient:** <@${recipient.id}>` : '**Broadcast:** All operatives',
            `**Classification:** \`${sigDef.classification}\``,
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT Signal Corps // ${sigDef.prefix} • CyberOS v2026.3-FLLC` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
