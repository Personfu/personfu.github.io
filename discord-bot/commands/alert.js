/**
 * /alert — Post a custom cybersecurity threat alert to the channel (operatives + admins).
 * Cyberpunk-themed custom alert with severity classification and recommended actions.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const SEV_CONFIG = {
  CRITICAL: { color: 0xff003c, icon: '🔴', prefix: 'FLASH',  label: 'CRITICAL — IMMEDIATE ACTION REQUIRED' },
  HIGH:     { color: 0xff8800, icon: '🟠', prefix: 'URGENT', label: 'HIGH — ACT WITHIN 24 HOURS'           },
  MEDIUM:   { color: 0xffe700, icon: '🟡', prefix: 'NOTICE', label: 'MEDIUM — MONITOR AND ASSESS'           },
  LOW:      { color: 0x00ff41, icon: '🟢', prefix: 'INFO',   label: 'LOW — INFORMATIONAL'                  },
};

const RESPONSE_ACTIONS = {
  CRITICAL: [
    'Isolate affected systems from network immediately',
    'Escalate to SOC and senior incident response lead',
    'Activate emergency change control procedure',
    'Begin evidence preservation (memory dumps, logs)',
    'Notify stakeholders and legal if data breach suspected',
  ],
  HIGH: [
    'Assess exposure scope and affected systems',
    'Apply available mitigations within 24h',
    'Increase monitoring on affected attack surface',
    'Schedule emergency patch or configuration change',
  ],
  MEDIUM: [
    'Monitor for active exploitation in threat feeds',
    'Schedule patching in next maintenance window',
    'Review affected system configurations',
    'Update detection rules in SIEM',
  ],
  LOW: [
    'Log and track for trending analysis',
    'Include in next vulnerability management cycle',
    'No immediate action required',
  ],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Post a custom cybersecurity threat alert — classified by severity with response actions')
    .addStringOption(opt =>
      opt.setName('severity')
        .setDescription('Alert severity level')
        .setRequired(true)
        .addChoices(
          { name: '🔴 CRITICAL — immediate action required', value: 'CRITICAL' },
          { name: '🟠 HIGH — act within 24 hours',           value: 'HIGH'     },
          { name: '🟡 MEDIUM — monitor and assess',          value: 'MEDIUM'   },
          { name: '🟢 LOW — informational',                  value: 'LOW'      },
        )
    )
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Short alert title — e.g. "Active LockBit deployment detected"')
        .setRequired(true)
        .setMaxLength(80)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Alert details — what was detected, affected systems, source')
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption(opt =>
      opt.setName('cve')
        .setDescription('Related CVE ID if applicable — e.g. CVE-2024-3400')
        .setRequired(false)
        .setMaxLength(20)
    )
    .addStringOption(opt =>
      opt.setName('ioc')
        .setDescription('Key IOC (IP, domain, hash) — shortened, comma-separated')
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction, { SITE_URL }) {
    const sev    = interaction.options.getString('severity', true);
    const title  = interaction.options.getString('title', true).slice(0, 80);
    const desc   = interaction.options.getString('description', true).slice(0, 500);
    const cve    = interaction.options.getString('cve');
    const ioc    = interaction.options.getString('ioc');

    const cfg    = SEV_CONFIG[sev];
    const actions = RESPONSE_ACTIONS[sev];
    const alertId = `FLLC-${cfg.prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const ts      = new Date().toUTCString();

    // Validate CVE format if provided
    let cveStr = null;
    if (cve) {
      const clean = cve.toUpperCase().trim();
      cveStr = /^CVE-\d{4}-\d{4,}$/.test(clean)
        ? `[\`${clean}\`](https://nvd.nist.gov/vuln/detail/${clean})`
        : `\`${clean}\` *(unvalidated format)*`;
    }

    const embed = new EmbedBuilder()
      .setColor(cfg.color)
      .setTitle(`${cfg.icon} FURIOS-INT // ${cfg.label}`)
      .setDescription(
        '```\n' +
        `┌─ ALERT ID:   ${alertId}\n` +
        `├─ SEVERITY:   ${sev}\n` +
        `├─ TIMESTAMP:  ${ts}\n` +
        `└─ POSTED BY:  ${interaction.user.username.toUpperCase()}\n` +
        '```'
      )
      .addFields(
        { name: `${cfg.icon} ${title.toUpperCase()}`, value: desc, inline: false },
      );

    if (cveStr) embed.addFields({ name: '🔗 Related CVE', value: cveStr, inline: true });
    if (ioc) embed.addFields({
      name: '🔍 Key IOC',
      value: ioc.split(',').slice(0, 5).map(i => `\`${i.trim()}\``).join('\n'),
      inline: true,
    });

    embed
      .addFields({
        name: '📋 RECOMMENDED RESPONSE ACTIONS',
        value: actions.map((a, i) => `\`${i + 1}.\` ${a}`).join('\n'),
        inline: false,
      })
      .addFields({
        name: '🔗 FLLC Intelligence Resources',
        value: [
          `[📡 Intel Hub](${SITE_URL}/intel.html)`,
          `[☠️ Adversary DB](${SITE_URL}/adversaries.html)`,
          `[⚔️ War Games](${SITE_URL}/wargames.html)`,
        ].join(' • '),
        inline: false,
      })
      .setFooter({ text: `FURIOS-INT Security Operations Center // Alert ID: ${alertId}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
      ...(cve && /^CVE-\d{4}-\d{4,}$/i.test(cve.trim())
        ? [new ButtonBuilder().setLabel(`🔍 ${cve.toUpperCase().trim()}`).setStyle(ButtonStyle.Link).setURL(`https://nvd.nist.gov/vuln/detail/${cve.toUpperCase().trim()}`)]
        : []
      ),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
