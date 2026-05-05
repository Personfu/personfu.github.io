/**
 * /cve [id] — Full CVE deep-dive: CVSS, vector, MITRE ATT&CK, exploit status, references
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

const SEV_COLOR  = { CRITICAL: 0xff003c, HIGH: 0xff8800, MEDIUM: 0xffe700, LOW: 0x00ff41, NONE: 0x555555 };
const SEV_ICON   = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢', NONE: '⚪' };
const ATTACK_VEC = { NETWORK: '🌐 NETWORK', ADJACENT_NETWORK: '📡 ADJACENT', LOCAL: '💻 LOCAL', PHYSICAL: '🖐 PHYSICAL' };
const SCOPE      = { UNCHANGED: '🔒 UNCHANGED', CHANGED: '⚠️ CHANGED' };
const IMPACT_LVL = { NONE: '—', LOW: '▪ LOW', HIGH: '▮ HIGH', COMPLETE: '▮▮ COMPLETE' };

// Map CVSS impact descriptions to MITRE ATT&CK tactics (heuristic)
function guessAttackTactics(desc) {
  const d = (desc || '').toLowerCase();
  const tactics = [];
  if (/execut|rce|code|command|shell|inject/.test(d))        tactics.push('T1059 Command Execution');
  if (/privilege|escalat|root|admin|elevat/.test(d))          tactics.push('T1078 Valid Accounts / T1068 Exploit for Privilege Escalation');
  if (/bypass|authent|access control|unauthori/.test(d))      tactics.push('T1550 Use Alternate Auth Material');
  if (/dos|denial|crash|exhaust|flood/.test(d))               tactics.push('T1499 Endpoint DoS');
  if (/exfil|data.*leak|sensitiv.*data|disclos/.test(d))      tactics.push('T1048 Exfiltration Over Alt Protocol');
  if (/sql|inject/.test(d))                                    tactics.push('T1190 Exploit Public-Facing Application');
  if (/xss|script|html inject/.test(d))                        tactics.push('T1059.007 JS via Browser');
  if (/buffer|overflow|heap|stack/.test(d))                    tactics.push('T1203 Exploitation for Client Execution');
  if (/traversal|path.*inclus|lfi|rfi/.test(d))               tactics.push('T1083 File and Directory Discovery');
  if (!tactics.length)                                          tactics.push('T1190 Exploit Public-Facing Application');
  return tactics.slice(0, 3);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cve')
    .setDescription('Deep-dive a specific CVE: CVSS scores, attack vectors, MITRE ATT&CK mapping')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('CVE ID — e.g. CVE-2024-3400  or  CVE-2025-0282')
        .setRequired(true)
        .setMinLength(8)
        .setMaxLength(20)
    ),

  async execute(interaction, { SITE_URL, NVD_KEY }) {
    await interaction.deferReply();

    const raw = interaction.options.getString('id', true).toUpperCase().trim();
    if (!/^CVE-\d{4}-\d{4,}$/.test(raw)) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xff4444)
          .setTitle('⚠️ INVALID_CVE_FORMAT')
          .setDescription('Expected format: `CVE-YYYY-NNNNN`\nExample: `CVE-2024-3400`')],
      });
    }

    try {
      const keyParam = NVD_KEY ? `&apiKey=${NVD_KEY}` : '';
      const url  = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(raw)}${keyParam}`;
      const res  = await fetch(url, {
        headers: { 'User-Agent': 'FLLC-CyberBot/2.6.5' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
      const data  = await res.json();
      const vuln  = data.vulnerabilities?.[0];

      if (!vuln) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0x555555)
            .setTitle(`🔍 ${raw} — NOT FOUND`)
            .setDescription('CVE not found in NVD. Check ID or try [CIRCL](https://cve.circl.lu).')],
        });
      }

      const cve    = vuln.cve;
      const id     = cve.id;
      const desc   = cve.descriptions?.[0]?.value || 'No description available.';
      const pub    = cve.published    ? new Date(cve.published).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'})    : 'N/A';
      const mod    = cve.lastModified ? new Date(cve.lastModified).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : 'N/A';

      // Prefer CVSSv3.1 over CVSSv2
      const m31    = vuln.metrics?.cvssMetricV31?.[0];
      const m2     = vuln.metrics?.cvssMetricV2?.[0];
      const cvss   = m31 || m2;
      const score  = cvss?.cvssData?.baseScore  || 'N/A';
      const sev    = m31?.cvssData?.baseSeverity || m2?.baseSeverity || 'NONE';
      const vec    = m31?.cvssData?.attackVector || m2?.cvssData?.accessVector || '';
      const vecStr = ATTACK_VEC[vec] || vec || '—';
      const ac     = m31?.cvssData?.attackComplexity || m2?.cvssData?.accessComplexity || '—';
      const pr     = m31?.cvssData?.privilegesRequired !== undefined ? m31.cvssData.privilegesRequired : (m2?.cvssData?.authentication || '—');
      const ui     = m31?.cvssData?.userInteraction  || '—';
      const scope  = SCOPE[m31?.cvssData?.scope]     || '—';
      const ci     = m31?.cvssData?.confidentialityImpact || m2?.cvssData?.confidentialityImpact || '—';
      const ii     = m31?.cvssData?.integrityImpact     || m2?.cvssData?.integrityImpact     || '—';
      const ai2    = m31?.cvssData?.availabilityImpact   || m2?.cvssData?.availabilityImpact  || '—';

      const cvssVer = m31 ? 'CVSSv3.1' : m2 ? 'CVSSv2.0' : 'N/A';
      const color   = SEV_COLOR[sev] || 0x555555;
      const icon    = SEV_ICON[sev]  || '⚪';

      const tactics = guessAttackTactics(desc);

      // Weaknesses (CWEs)
      const cwes = (cve.weaknesses || [])
        .flatMap(w => w.description || [])
        .filter(d => d.lang === 'en')
        .map(d => d.value)
        .slice(0, 3)
        .join(', ') || 'N/A';

      // References — top 3
      const refs = (cve.references || [])
        .slice(0, 3)
        .map(r => `[${new URL(r.url).hostname}](${r.url})`)
        .join('\n') || 'None';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${icon} ${id}  —  ${sev}  [CVSS ${score}]`)
        .setURL(`https://nvd.nist.gov/vuln/detail/${id}`)
        .setDescription(`> ${desc.slice(0, 500)}`)
        .addFields(
          { name: '📊 CVSS Score',        value: `**${score}** (${cvssVer})`,    inline: true },
          { name: '🔥 Severity',           value: `${icon} **${sev}**`,           inline: true },
          { name: '📅 Published',          value: pub,                            inline: true },
          { name: '🌐 Attack Vector',      value: vecStr,                         inline: true },
          { name: '🔧 Attack Complexity',  value: ac,                             inline: true },
          { name: '🔑 Privileges Req.',    value: pr,                             inline: true },
          { name: '👤 User Interaction',   value: ui,                             inline: true },
          { name: '🔒 Scope',              value: scope,                          inline: true },
          { name: '📅 Last Modified',      value: mod,                            inline: true },
          { name: '💥 Confidentiality',    value: ci,                             inline: true },
          { name: '✏️ Integrity',           value: ii,                             inline: true },
          { name: '⚡ Availability',       value: ai2,                            inline: true },
          { name: '🧩 Weaknesses (CWE)',   value: `\`${cwes}\``,                 inline: false },
          { name: '🗺️ MITRE ATT&CK Tactics', value: tactics.map(t => `• \`${t}\``).join('\n'), inline: false },
          { name: '🔗 References',         value: refs,                           inline: false },
        )
        .setFooter({ text: `Source: NVD API | FURIOS-INT Intel • ${new Date().toUTCString()}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('NVD Entry').setStyle(ButtonStyle.Link).setURL(`https://nvd.nist.gov/vuln/detail/${id}`),
        new ButtonBuilder().setLabel('CIRCL Lookup').setStyle(ButtonStyle.Link).setURL(`https://cve.circl.lu/cve/${id}`),
        new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xff4444)
          .setTitle('⚠️ LOOKUP_FAILED')
          .setDescription(`\`\`\`\n${err.message.slice(0, 300)}\n\`\`\``)],
      });
    }
  },
};
