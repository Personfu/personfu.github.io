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
            '`/intel [severity] [count]` — Live CVE feed from NVD (last 24h)',
            '`/cve <id>` — Deep-dive a specific CVE: CVSS, vectors, MITRE ATT&CK',
            '`/scan <tool>` — Simulate nmap / masscan / nikto / gobuster / hydra / wireshark',
            '`/exploit [chain]` — Adversarial kill-chain simulation with MITRE mapping',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔵 BLUE_TEAM — Defensive Commands',
          value: [
            '`/status` — Live health check: all FLLC site pages + engine status',
            '`/defend [scenario]` — Randomized defensive playbook: IR, hardening, detection',
            '`/ioc [actor]` — Fresh IOCs: IPs, domains, hashes, YARA from threat intel feed',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟣 OSINT_AGENT — Intelligence Commands',
          value: [
            '`/adversary <name>` — Deep-dive APT profile: TTPs, tools, campaigns, IOCs',
            '`/ttp <technique>` — MITRE ATT&CK technique: detection, mitigation, examples',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟢 RPG / GAME Commands',
          value: [
            '`/launch [game]` — Send a game invitation with Play links (works on mobile)',
            '`/mission [class]` — Randomized operative mission with objectives and loot',
            '`/daemon` — Encounter a SOULCODE daemon with lore, stats, and capture odds',
            '`/leaderboard [filter]` — FLLC operative XP rankings by class',
            '`/profile [operative]` — Operative dossier: rank, XP, missions, daemons',
            '`/daily` — Claim daily XP ration + random intel drop (20h cooldown)',
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
