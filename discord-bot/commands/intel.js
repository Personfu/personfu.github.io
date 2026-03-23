/**
 * /intel — Live CRITICAL CVE feed, FLLC branded with MITRE ATT&CK context
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const SEV_COLOR  = { CRITICAL: 0xff003c, HIGH: 0xff8800, MEDIUM: 0xffe700, LOW: 0x00e8ff };
const SEV_ICON   = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' };
const ATTACK_VEC = { NETWORK: '🌐 NETWORK', ADJACENT: '📡 ADJACENT', LOCAL: '💻 LOCAL', PHYSICAL: '🖐 PHYSICAL' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('intel')
    .setDescription('Pull latest CVEs from NVD — real-time threat intelligence feed')
    .addStringOption(opt =>
      opt.setName('severity')
        .setDescription('Filter by severity level (default: CRITICAL)')
        .setRequired(false)
        .addChoices(
          { name: '🔴 CRITICAL', value: 'CRITICAL' },
          { name: '🟠 HIGH',     value: 'HIGH'     },
          { name: '🟡 MEDIUM',   value: 'MEDIUM'   },
        )
    )
    .addIntegerOption(opt =>
      opt.setName('count')
        .setDescription('Number of CVEs to show (1-8, default 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(8)
    ),

  async execute(interaction, { SITE_URL, fetchCVEs, buildCVEEmbed }) {
    await interaction.deferReply();
    const sev   = interaction.options.getString('severity') ?? 'CRITICAL';
    const count = interaction.options.getInteger('count')   ?? 5;

    try {
      const cves = await fetchCVEs(count, sev);

      const color = SEV_COLOR[sev] || 0xff003c;
      const icon  = SEV_ICON[sev]  || '🔴';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${icon} FURIOS-INT // LIVE ${sev} CVE FEED`)
        .setDescription(
          `**${cves.length}** ${sev} vulnerabilities published in the last 24 hours\n` +
          `Source: [NVD National Vulnerability Database](https://nvd.nist.gov) • CIRCL.LU backup`
        );

      if (!cves.length) {
        embed.addFields({ name: '✅ INTEL_CLEAR', value: `No ${sev} CVEs published in the last 24 hours.` });
      } else {
        for (const v of cves.slice(0, count)) {
          const cve    = v.cve || v;
          const id     = cve.id || 'N/A';
          const desc   = (cve.descriptions?.[0]?.value || 'No description.').slice(0, 200);
          const score  = v.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
                      || v.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore  || '?';
          const vec    = v.metrics?.cvssMetricV31?.[0]?.cvssData?.attackVector || '';
          const vecStr = ATTACK_VEC[vec] || vec || '—';
          const pub    = cve.published ? new Date(cve.published).toLocaleDateString('en-US') : '?';

          embed.addFields({
            name:  `${icon} ${id}  [CVSS ${score}]  ${vecStr}`,
            value: `${desc}…\n*Published: ${pub}*`,
          });
        }
      }

      embed.addFields({
        name: '🔗 Full Intel Hub',
        value: `[Live CVE Search + Camera Feed + TTP Monitor](${SITE_URL}/intel.html)`,
      });
      embed.setFooter({ text: `FURIOS-INT Intel Stream • ${new Date().toUTCString()}` })
           .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
        new ButtonBuilder().setLabel('🔍 Search CVE').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xff4444)
          .setTitle('⚠️ NVD_API_ERROR')
          .setDescription(`\`\`\`\n${err.message.slice(0, 300)}\n\`\`\`\nFallback: [CIRCL CVE Search](https://cve.circl.lu)`)],
      });
    }
  },
};
