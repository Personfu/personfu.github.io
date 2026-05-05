/**
 * /launch — Send a FLLC CyberWorld game invitation embed with mobile-friendly Play buttons.
 * Works on all platforms (mobile, desktop) via ButtonStyle.Link which opens in the browser.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const GAMES = [
  {
    key: 'cyberworld',
    label: '🌐 CyberWorld RPG',
    path: '/cyberworld.html',
    color: 0x00ff41,
    icon: '🌐',
    desc: 'Hack APT factions, capture SOULCODE daemons, and dominate the operative leaderboard in the full browser RPG.',
    status: '🟢 ONLINE — 6 APT factions active • 4 Daemons roaming',
    xpNote: 'Earn XP defeating enemies and completing missions',
  },
  {
    key: 'arcade',
    label: '🕹 Cyber Arcade',
    path: '/arcade.html',
    color: 0x00e8ff,
    icon: '🕹',
    desc: 'Mini-games, retro hacking challenges, and quick-play cyber ops.',
    status: '🟢 ONLINE — All arcade modules live',
    xpNote: 'Quick XP for arcade high scores',
  },
  {
    key: 'wargames',
    label: '⚔️ War Games Terminal',
    path: '/wargames.html',
    color: 0xff8800,
    icon: '⚔️',
    desc: 'Command-line war games terminal — run nmap, exploit hosts, complete Red/Blue team missions.',
    status: '🟢 ONLINE — Terminal ready',
    xpNote: 'Max XP for completing full terminal missions',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('launch')
    .setDescription('Launch a FLLC CyberWorld game — sends a play invite with mobile-ready links')
    .addStringOption(opt =>
      opt.setName('game')
        .setDescription('Which game to launch (default: CyberWorld RPG)')
        .setRequired(false)
        .addChoices(
          { name: '🌐 CyberWorld RPG — full operative RPG',    value: 'cyberworld' },
          { name: '🕹 Cyber Arcade — quick-play mini-games',   value: 'arcade'     },
          { name: '⚔️ War Games Terminal — hacking missions',  value: 'wargames'   },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const choice = interaction.options.getString('game') ?? 'cyberworld';
    const game   = GAMES.find(g => g.key === choice) || GAMES[0];
    const url    = `${SITE_URL}${game.path}`;

    const embed = new EmbedBuilder()
      .setColor(game.color)
      .setTitle('🎮 GAME INVITATION — FLLC CyberWorld')
      .setDescription(
        `**${game.icon} ${game.label}**\n\n${game.desc}`
      )
      .addFields(
        { name: '📡 Server Status', value: game.status,  inline: false },
        { name: '⚡ XP',            value: game.xpNote,  inline: true  },
        { name: '👤 Invited by',    value: `<@${interaction.user.id}>`, inline: true },
        {
          name: '📱 Mobile Users',
          value: 'Tap **PLAY NOW** below — opens in your browser. Full game works on any device.',
          inline: false,
        },
      )
      .setFooter({ text: 'FURIOS-INT // FLLC CyberOS v2026.3 — Play on any device' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('▶  PLAY NOW')
        .setStyle(ButtonStyle.Link)
        .setURL(url),
      new ButtonBuilder()
        .setLabel('🌐 CyberWorld RPG')
        .setStyle(ButtonStyle.Link)
        .setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder()
        .setLabel('🕹 Arcade')
        .setStyle(ButtonStyle.Link)
        .setURL(`${SITE_URL}/arcade.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
