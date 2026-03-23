/**
 * /rank — Operative rank progression chart: XP thresholds, perks, and how to level up.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const RANKS = [
  {
    rank: 'RECRUIT',      icon: '⬜', min: 0,     max: 999,
    color: 0x555555,
    perks: ['Access to basic /scan and /intel commands','Daemon encounter (COMMON tier only)','1 daily mission slot'],
    unlocks: 'OPERATIVE at 1,000 XP',
  },
  {
    rank: 'OPERATIVE',    icon: '🟦', min: 1000,  max: 2999,
    color: 0x0088ff,
    perks: ['Unlock /cve deep-dive','UNCOMMON daemon encounters','2 daily mission slots','Access to /adversary DB'],
    unlocks: 'AGENT at 3,000 XP',
  },
  {
    rank: 'AGENT',        icon: '🟩', min: 3000,  max: 5999,
    color: 0x00ff41,
    perks: ['Unlock /exploit chains','RARE daemon encounters','3 daily mission slots','Priority loot rolls'],
    unlocks: 'SPECIALIST at 6,000 XP',
  },
  {
    rank: 'SPECIALIST',   icon: '🟨', min: 6000,  max: 9999,
    color: 0xffe700,
    perks: ['Unlock /defend playbooks','EPIC daemon encounters','4 daily mission slots','Faction bounty access','War Games Terminal unlocked'],
    unlocks: 'SENIOR_OPERATIVE at 10,000 XP',
  },
  {
    rank: 'SENIOR_OPERATIVE', icon: '🟧', min: 10000, max: 14999,
    color: 0xff8800,
    perks: ['Unlock /apt faction battles','LEGENDARY daemon encounters','5 daily mission slots','Custom operative callsign badge','C2 sinkhole access'],
    unlocks: 'ELITE at 15,000 XP',
  },
  {
    rank: 'ELITE',        icon: '🟥', min: 15000, max: 24999,
    color: 0xff003c,
    perks: ['Full /ttp library access','★ LEGENDARY+ daemon encounters','Unlimited mission slots','Red Team clearance level 5','Faction command access'],
    unlocks: 'MASTER at 25,000 XP',
  },
  {
    rank: 'MASTER',       icon: '🟪', min: 25000, max: 49999,
    color: 0x9900ff,
    perks: ['MYTHIC daemon encounters (0.1% chance)','War Council seat — vote on FLLC operations','Custom battle loadout','Leaderboard trophy display','Inner Circle briefing access'],
    unlocks: 'GRANDMASTER at 50,000 XP',
  },
  {
    rank: 'GRANDMASTER',  icon: '💠', min: 50000, max: Infinity,
    color: 0x00e8ff,
    perks: ['★ MYTHIC daemon encounters guaranteed weekly','All factions unlocked','Zero-Day Specter encounter enabled','Hall of Fame permanent badge','FURIOS-INT Council member','All clearance levels'],
    unlocks: '**MAX RANK — you are legend**',
  },
];

const XP_SOURCES = [
  { source: '⚔️ Complete Mission',        xp: '380–900 XP' },
  { source: '👹 Defeat Daemon',           xp: '75–9,999 XP' },
  { source: '🎯 Capture Daemon',          xp: '+50% bonus' },
  { source: '📋 Daily Ration (/daily)',   xp: '100–1,000 XP' },
  { source: '🔬 Complete /scan',          xp: '50–200 XP' },
  { source: '💀 Defeat APT Faction',      xp: '580–900 XP' },
  { source: '🔑 War Games Terminal',      xp: '150–500 XP' },
  { source: '🎖️ Daily Streak Bonus (7d)', xp: '+50% multiplier' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View the FLLC operative rank progression chart — XP thresholds, perks, and how to level up'),

  async execute(interaction, { SITE_URL }) {
    const rankChart = RANKS.map((r, i) => {
      const xpRange = r.max === Infinity
        ? `${r.min.toLocaleString()} XP+`
        : `${r.min.toLocaleString()} – ${r.max.toLocaleString()} XP`;
      return `${r.icon} **${r.rank}** — \`${xpRange}\``;
    }).join('\n');

    const xpTable = XP_SOURCES.map(s => `• ${s.source}: **${s.xp}**`).join('\n');

    const topRank   = RANKS[RANKS.length - 1];
    const eliteRank = RANKS.find(r => r.rank === 'ELITE');

    const embed = new EmbedBuilder()
      .setColor(0x00e8ff)
      .setTitle('📈 FLLC OPERATIVE RANK PROGRESSION CHART')
      .setDescription(
        '```\n' +
        '╔══════════════════════════════════════════════╗\n' +
        '║  FURIOS-INT RANK SYSTEM // CyberOS v2026.3   ║\n' +
        '║  8 Ranks  •  50,000 XP to Grandmaster        ║\n' +
        '╚══════════════════════════════════════════════╝\n' +
        '```'
      )
      .addFields(
        {
          name: '🏅 RANK TABLE',
          value: rankChart,
          inline: false,
        },
        {
          name: '⚡ XP SOURCES',
          value: xpTable,
          inline: false,
        },
        {
          name: `${topRank.icon} GRANDMASTER PERKS (${topRank.min.toLocaleString()} XP)`,
          value: topRank.perks.map(p => `• ${p}`).join('\n'),
          inline: false,
        },
        {
          name: `${eliteRank.icon} ELITE PERKS (${eliteRank.min.toLocaleString()} XP)`,
          value: eliteRank.perks.map(p => `• ${p}`).join('\n'),
          inline: false,
        },
        {
          name: '🚀 Fastest XP Routes',
          value: [
            '1. **Daily claim** (`/daily`) — up to 1,000 XP + 7-day streak bonus',
            '2. **Daemon capture** — MYTHIC capture gives 9,999 XP but 1% chance',
            '3. **Mission class filter** — `/mission class:RED_TEAM` for EXTREME (750+ XP) missions',
            '4. **APT faction battle** — defeat IRON_BEAR_UNIT for max 900 XP',
            '5. **Consistency** — 7-day streak = +50% all XP multiplier',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔗 Start Earning XP',
          value: [
            `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
            `[⚔️ War Games](${SITE_URL}/wargames.html)`,
            `[🔑 Operative Profile](${SITE_URL}/rpg/login.html)`,
          ].join(' • '),
          inline: false,
        },
      )
      .setFooter({ text: 'FURIOS-INT Rank Registry • CyberOS v2026.3-FLLC' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
      new ButtonBuilder().setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/nodes.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
