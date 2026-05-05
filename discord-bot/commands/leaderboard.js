/**
 * /leaderboard — Full FLLC operative rankings with class breakdown and badges
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const OPERATIVES = [
  { rank:1,  name:'[R00T_K1NG]',    class:'RED_TEAM',    xp:14820, missions:47, daemons:4, clearance:5, streak:31, badge:'🥇 SHADOW_SOVEREIGN' },
  { rank:2,  name:'[PHANTOM_7]',    class:'OSINT_AGENT', xp:13290, missions:42, daemons:3, clearance:4, streak:24, badge:'🥈 GHOST_ANALYST'     },
  { rank:3,  name:'[CRYPTS3C]',     class:'BLUE_TEAM',   xp:11750, missions:38, daemons:4, clearance:4, streak:19, badge:'🥉 IRON_SENTINEL'     },
  { rank:4,  name:'[NULL_BYTE]',    class:'RED_TEAM',    xp:10440, missions:33, daemons:2, clearance:3, streak:15, badge:'4️⃣ EXPLOIT_HUNTER'   },
  { rank:5,  name:'[D4RK_FLUX]',    class:'FULL_STACK',  xp: 9810, missions:31, daemons:3, clearance:3, streak:12, badge:'5️⃣ FULL_STACK_GHOST' },
  { rank:6,  name:'[GHOST_0PS]',    class:'RED_TEAM',    xp: 8920, missions:28, daemons:1, clearance:3, streak:10, badge:'6️⃣ MALWARE_HUNTER'   },
  { rank:7,  name:'[WIRE_SHARK]',   class:'BLUE_TEAM',   xp: 7340, missions:24, daemons:2, clearance:2, streak: 8, badge:'7️⃣ PACKET_GUARDIAN'  },
  { rank:8,  name:'[AI_HUNTER]',    class:'OSINT_AGENT', xp: 6780, missions:21, daemons:4, clearance:2, streak: 7, badge:'8️⃣ PROMPT_INJECTOR'  },
  { rank:9,  name:'[ZERO_TRACE]',   class:'FULL_STACK',  xp: 5600, missions:18, daemons:1, clearance:2, streak: 5, badge:'9️⃣ ZERO_TRACE'       },
  { rank:10, name:'[HEX_VIPER]',    class:'RED_TEAM',    xp: 4210, missions:14, daemons:0, clearance:1, streak: 3, badge:'🔟 VIPER_STRIKE'      },
];

const CLASS_ICONS = { RED_TEAM:'⚔️', BLUE_TEAM:'🛡️', OSINT_AGENT:'🔍', FULL_STACK:'🌐' };
const CLASS_COLORS = { RED_TEAM:0xff003c, BLUE_TEAM:0x0088ff, OSINT_AGENT:0xff00ea, FULL_STACK:0x00ff41 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View FLLC operative XP rankings with class breakdown, streaks, and badges')
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Filter by operative class')
        .setRequired(false)
        .addChoices(
          { name: '⚔️ RED_TEAM',    value: 'RED_TEAM'    },
          { name: '🛡️ BLUE_TEAM',   value: 'BLUE_TEAM'   },
          { name: '🔍 OSINT_AGENT', value: 'OSINT_AGENT' },
          { name: '🌐 FULL_STACK',  value: 'FULL_STACK'  },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const filter = interaction.options.getString('filter');
    const list   = filter ? OPERATIVES.filter(o => o.class === filter) : OPERATIVES;
    const color  = filter ? (CLASS_COLORS[filter] || 0xffe700) : 0xffe700;
    const title  = filter
      ? `🏆 ${CLASS_ICONS[filter]} ${filter} LEADERBOARD`
      : '🏆 FLLC OPERATIVE LEADERBOARD  //  ALL CLASSES';

    const rows = list.slice(0, 10).map(op => {
      const cls = CLASS_ICONS[op.class] || '?';
      return (
        `${op.badge}\n` +
        `${op.name}  ${cls}\`${op.class}\`\n` +
        `**${op.xp.toLocaleString()} XP** • ${op.missions} missions • ${op.daemons}/4 daemons • 🔥${op.streak}d streak`
      );
    }).join('\n\n');

    // Class totals
    const classTotals = Object.keys(CLASS_ICONS).map(cls => {
      const members = OPERATIVES.filter(o => o.class === cls);
      const totalXP = members.reduce((a, b) => a + b.xp, 0);
      return `${CLASS_ICONS[cls]} ${cls}: ${members.length} ops / ${totalXP.toLocaleString()} XP`;
    }).join('\n');

    const topOp = list[0];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        '```\n' +
        '╔══════════════════════════════════════════╗\n' +
        '║  FURIOS-INT OPERATIVE RANKING SYSTEM     ║\n' +
        '║  Ranked by XP • Updated live             ║\n' +
        '╚══════════════════════════════════════════╝\n' +
        '```'
      )
      .addFields(
        { name: '📊 RANKINGS', value: rows.slice(0, 1024), inline: false },
        { name: '🏅 CLASS STANDINGS', value: classTotals, inline: false },
        {
          name: `🔝 CURRENT #1: ${topOp?.name || '—'}`,
          value: topOp
            ? `${CLASS_ICONS[topOp.class]} ${topOp.class} • ${topOp.xp.toLocaleString()} XP • ${topOp.badge}`
            : 'No operatives found.',
          inline: false,
        },
        {
          name: '🚀 Climb the ranks',
          value: [
            `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html) — earn XP defeating APTs & capturing daemons`,
            `[⚔️ War Games](${SITE_URL}/wargames.html) — complete terminal missions`,
            `[🔑 Operative Login](${SITE_URL}/rpg/login.html) — create/view your profile`,
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT Rankings • CyberOS v2026.3-FLLC • ${new Date().toUTCString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('🔑 My Profile').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/rpg/login.html`),
      new ButtonBuilder().setLabel('📡 Person Nodes').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/nodes.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
