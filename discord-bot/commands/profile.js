/**
 * /profile — Operative dossier: class, XP rank, missions, daemons, toolkit
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const RANKS = [
  { min:     0, max:   999, rank: 'RECRUIT',           icon: '⬜' },
  { min:  1000, max:  2999, rank: 'OPERATIVE',         icon: '🟦' },
  { min:  3000, max:  5999, rank: 'AGENT',             icon: '🟩' },
  { min:  6000, max:  9999, rank: 'SPECIALIST',        icon: '🟨' },
  { min: 10000, max: 14999, rank: 'SENIOR_OPERATIVE',  icon: '🟧' },
  { min: 15000, max: 24999, rank: 'ELITE',             icon: '🟥' },
  { min: 25000, max: 49999, rank: 'MASTER',            icon: '🟪' },
  { min: 50000, max: Infinity, rank: 'GRANDMASTER',   icon: '💠' },
];

const CLASS_DATA = {
  RED_TEAM:    { icon: '⚔️', color: 0xff003c, engine: 'ENGINE 2: SOURCECODE', primary: ['nmap','Metasploit','Hydra','Empire','sqlmap'] },
  BLUE_TEAM:   { icon: '🛡️', color: 0x0088ff, engine: 'ENGINE 3: LITE OSINT', primary: ['Splunk','Wireshark','CSET','Velociraptor','Starkiller'] },
  OSINT_AGENT: { icon: '🔍', color: 0xff00ea, engine: 'ENGINE 4: SOULCODE',    primary: ['Maltego','FURY0s1nt','Recon-ng','spiderfoot','Sherlock'] },
  FULL_STACK:  { icon: '🌐', color: 0x00ff41, engine: 'ENGINE 1-4: UNIFIED',   primary: ['ALL TOOLS UNLOCKED'] },
};

const SAMPLE_OPERATIVES = [
  { name: 'R00T_K1NG',  class: 'RED_TEAM',    xp: 14820, missions: 47, daemons: 4, clearance: 5, joined: 'Jan 2024' },
  { name: 'PHANTOM_7',  class: 'OSINT_AGENT', xp: 13290, missions: 42, daemons: 3, clearance: 4, joined: 'Mar 2024' },
  { name: 'CRYPTS3C',   class: 'BLUE_TEAM',   xp: 11750, missions: 38, daemons: 4, clearance: 4, joined: 'Feb 2024' },
  { name: 'NULL_BYTE',  class: 'RED_TEAM',    xp: 10440, missions: 33, daemons: 2, clearance: 3, joined: 'Apr 2024' },
  { name: 'D4RK_FLUX',  class: 'FULL_STACK',  xp:  9810, missions: 31, daemons: 3, clearance: 3, joined: 'May 2024' },
  { name: 'GHOST_0PS',  class: 'RED_TEAM',    xp:  8920, missions: 28, daemons: 1, clearance: 3, joined: 'Jun 2024' },
  { name: 'WIRE_SHARK', class: 'BLUE_TEAM',   xp:  7340, missions: 24, daemons: 2, clearance: 2, joined: 'Aug 2024' },
  { name: 'AI_HUNTER',  class: 'OSINT_AGENT', xp:  6780, missions: 21, daemons: 4, clearance: 2, joined: 'Sep 2024' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View an operative\'s FLLC dossier — XP, rank, class, missions, daemons')
    .addStringOption(opt =>
      opt.setName('operative')
        .setDescription('Operative callsign (without brackets) — default: random known operative')
        .setRequired(false)
        .setMaxLength(32)
    ),

  async execute(interaction, { SITE_URL }) {
    const input = interaction.options.getString('operative');
    let op;

    if (input) {
      const clean = input.replace(/[<>"'&\[\]]/g, '').toUpperCase().trim();
      op = SAMPLE_OPERATIVES.find(o => o.name.toUpperCase() === clean);
      if (!op) {
        // Generate a profile for unknown callsign
        const classKeys = Object.keys(CLASS_DATA);
        op = {
          name: clean.slice(0, 20),
          class: classKeys[Math.floor(Math.random() * classKeys.length)],
          xp: Math.floor(Math.random() * 5000) + 100,
          missions: Math.floor(Math.random() * 20),
          daemons: Math.floor(Math.random() * 4),
          clearance: Math.floor(Math.random() * 3) + 1,
          joined: 'Unknown',
          generated: true,
        };
      }
    } else {
      op = SAMPLE_OPERATIVES[Math.floor(Math.random() * SAMPLE_OPERATIVES.length)];
    }

    const rankData   = RANKS.find(r => op.xp >= r.min && op.xp <= r.max) || RANKS[0];
    const classInfo  = CLASS_DATA[op.class]  || CLASS_DATA.FULL_STACK;
    const nextRank   = RANKS.find(r => r.min > op.xp);
    const xpToNext   = nextRank ? nextRank.min - op.xp : 0;
    const xpCap      = nextRank ? nextRank.min : op.xp;
    const xpPct      = Math.min(100, Math.floor(((op.xp - (RANKS.find(r=>r.rank===rankData.rank)?.min||0)) / (xpCap - (RANKS.find(r=>r.rank===rankData.rank)?.min||0)||1)) * 100));
    const xpBar      = '█'.repeat(Math.floor(xpPct / 10)) + '░'.repeat(10 - Math.floor(xpPct / 10));

    const daemonBar  = '◆'.repeat(op.daemons) + '◇'.repeat(Math.max(0, 6 - op.daemons));
    const clearBar   = '🔒'.repeat(op.clearance) + '⬜'.repeat(Math.max(0, 5 - op.clearance));

    const embed = new EmbedBuilder()
      .setColor(classInfo.color)
      .setTitle(`${classInfo.icon} OPERATIVE_DOSSIER // [${op.name}]`)
      .setDescription(
        `**Class:** \`${op.class}\`  //  ${classInfo.engine}\n` +
        `**Status:** ${op.generated ? '🔘 UNVERIFIED AGENT' : '🟢 VERIFIED OPERATIVE'}`
      )
      .addFields(
        {
          name: `${rankData.icon} RANK: ${rankData.rank}`,
          value: `XP: \`${op.xp.toLocaleString()}\`\n\`${xpBar}\` ${xpPct}%\n${nextRank ? `Next rank in **${xpToNext.toLocaleString()} XP**` : '**MAX RANK ACHIEVED**'}`,
          inline: false,
        },
        { name: '⚔️ Missions Completed', value: `**${op.missions}**`,           inline: true },
        { name: '◆ Daemons Captured',    value: `**${op.daemons}** ${daemonBar}`, inline: true },
        { name: '🔐 Clearance Level',    value: `Level **${op.clearance}** ${clearBar}`, inline: true },
        { name: '📅 Operative Since',    value: op.joined || 'Unknown',           inline: true },
        { name: '🛠️ Primary Toolkit',    value: classInfo.primary.map(t => `\`${t}\``).join('  '), inline: false },
      )
      .addFields({
        name: '🔗 Operative Portal',
        value: [
          `[🔑 Operative Login](${SITE_URL}/rpg/login.html)`,
          `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
          `[📡 PERSON_NODES](${SITE_URL}/nodes.html)`,
        ].join(' • '),
      })
      .setFooter({ text: `FURIOS-INT Personnel DB • CyberOS v2026.3-FLLC` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🔑 Operative Login').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/rpg/login.html`),
      new ButtonBuilder().setLabel('📡 Person Nodes').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/nodes.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
