/**
 * /help — FLLC CyberWorld command directory, cyberpunk themed (24 commands)
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

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
        '║  24 Commands  •  Application: 1170817211837992981║\n' +
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
            '`/decrypt [type] [attempt]` — CTF-style decryption challenge (earn XP!)',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔵 BLUE_TEAM — Defensive Commands',
          value: [
            '`/status` — Live health check: all FLLC site pages + engine status',
            '`/defend [scenario]` — Randomized defensive playbook: IR, hardening, detection',
            '`/ioc [actor]` — Fresh IOCs: IPs, domains, hashes, YARA from threat intel',
            '`/alert <severity> <title> <desc>` — Post custom threat alert with response actions',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟣 OSINT_AGENT — Intelligence Commands',
          value: [
            '`/adversary <name>` — Deep-dive real-world APT: TTPs, tools, campaigns, IOCs',
            '`/apt [faction]` — CyberWorld APT faction: battle stats, territory, daemon roster',
            '`/ttp <technique>` — MITRE ATT&CK technique: detection, mitigation, examples',
            '`/signal <type> <message>` — Send encrypted operative signal / OSINT surface ping',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟢 RPG / GAME Commands',
          value: [
            '`/launch [game]` — Game invite with PLAY NOW buttons — works on mobile ✅',
            '`/mission [class]` — Randomized operative mission with objectives and loot',
            '`/daemon` — Encounter a SOULCODE daemon with lore, stats, and capture odds',
            '`/bounty [type]` — Active FLLC bounty board: APT takedowns, daemon captures, CTF',
            '`/rank` — Full rank progression chart: XP thresholds and perks',
            '`/leaderboard [filter]` — FLLC operative XP rankings by class',
            '`/profile [operative]` — Operative dossier: rank, XP, missions, daemons',
            '`/daily` — Claim daily XP ration + random intel drop (20h cooldown)',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🚩 CTF / HACKATHON',
          value: [
            '`/ctf [category]` — Random CTF challenge by category (web, crypto, pwn, forensics, misc)',
            '`/ctfguide [category]` — Step-by-step study guide for a CTF category',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚙️ Utility',
          value: '`/help` — This menu  •  `24 total commands`',
          inline: false,
        },
        {
          name: '🔗 Operative Network',
          value: [
            `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
            `[🕹 Arcade](${SITE_URL}/arcade.html)`,
            `[📡 Intel Hub](${SITE_URL}/intel.html)`,
            `[⚔️ War Games](${SITE_URL}/wargames.html)`,
            `[🚩 CTF Trail](${SITE_URL}/ctf-trail.html)`,
            `[🔑 Operative Login](${SITE_URL}/rpg/login.html)`,
            `[☠️ Adversary DB](${SITE_URL}/adversaries.html)`,
          ].join(' • '),
          inline: false,
        }
      )
      .setFooter({ text: 'FURIOS-INT // FLLC CyberWorld Operations Center • Built by Preston Furulie' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
      new ButtonBuilder().setLabel('🚩 CTF Trail').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/ctf-trail.html`),
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
