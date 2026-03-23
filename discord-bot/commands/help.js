/**
 * /help — FLLC CyberWorld command directory, cyberpunk themed
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all FLLC CyberWorld operative commands'),

  async execute(interaction, { SITE_URL }) {
    const embed = new EmbedBuilder()
      .setColor(0x00e8ff)
      .setTitle('⚡ FURIOS-INT // OPERATIVE_COMMAND_DIRECTORY')
      .setDescription(
        '```\n' +
        '╔══════════════════════════════════════════════════╗\n' +
        '║  CYBERWORLD BOT  //  CyberOS v2026.3-FLLC       ║\n' +
        '║  Application: 1170817211837992981                ║\n' +
        '║  Guild: FLLC CyberWorld Operations               ║\n' +
        '╚══════════════════════════════════════════════════╝\n' +
        '```'
      )
      .addFields(
        {
          name: '🔴 RED_TEAM — Offensive Commands',
          value: [
            '`/intel` — Live CRITICAL CVE feed from NVD (last 24h)',
            '`/cve [id]` — Full CVE lookup: CVSS, MITRE ATT&CK, exploit status',
            '`/scan [type]` — Simulate nmap/masscan/nikto/gobuster scan',
            '`/exploit [cve]` — Adversarial exploitation chain simulation',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔵 BLUE_TEAM — Defensive Commands',
          value: [
            '`/status` — Live health check: all FLLC site pages',
            '`/defend` — Generate a randomized defensive playbook',
            '`/ioc` — Get fresh Indicators of Compromise from threat feeds',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟣 OSINT_AGENT — Intelligence Commands',
          value: [
            '`/adversary [name]` — Deep-dive APT profile from FLLC threat DB',
            '`/ttp [technique]` — MITRE ATT&CK technique lookup',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟢 RPG / GAME Commands',
          value: [
            '`/mission` — Receive a randomized operative mission assignment',
            '`/daemon` — Encounter a SOULCODE daemon with capture options',
            '`/leaderboard` — FLLC operative XP rankings',
            '`/profile` — Your operative dossier: class, XP, missions, daemons',
            '`/daily` — Claim your daily XP ration + random intel drop',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚙️ Utility',
          value: '`/help` — This menu',
          inline: false,
        },
        {
          name: '🔗 Operative Network',
          value: [
            `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
            `[🕹 Arcade](${SITE_URL}/arcade.html)`,
            `[📡 Intel Hub](${SITE_URL}/intel.html)`,
            `[⚔️ War Games](${SITE_URL}/wargames.html)`,
            `[🔑 Operative Login](${SITE_URL}/rpg/login.html)`,
            `[☠️ Adversary DB](${SITE_URL}/adversaries.html)`,
          ].join(' • '),
          inline: false,
        }
      )
      .setFooter({ text: 'FURIOS-INT // FLLC CyberWorld Operations Center • Built by Preston Furulie' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
