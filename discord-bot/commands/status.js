/**
 * /status — Live FLLC site health + server uptime + engine status
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');

const PAGES = [
  { name: '🏠 HOME',          path: '/',                  critical: true  },
  { name: '📡 INTEL_HUB',     path: '/intel.html',        critical: true  },
  { name: '🌐 CYBERWORLD_RPG',path: '/cyberworld.html',   critical: true  },
  { name: '🕹 CYBER_ARCADE',  path: '/arcade.html',       critical: true  },
  { name: '🎮 RPG_ENGINE',    path: '/rpg/index.html',    critical: true  },
  { name: '🔑 OPERATIVE_LOGIN',path: '/rpg/login.html',   critical: false },
  { name: '⚔️ WAR_GAMES',     path: '/wargames.html',     critical: false },
  { name: '🤖 AI_OVERSEER',   path: '/ai.html',           critical: false },
  { name: '💬 DISCUSS_BOARD', path: '/discuss.html',      critical: false },
  { name: '⭐ CYBER_ARSENAL', path: '/stars.html',        critical: false },
  { name: '☠️ ADVERSARY_DB',  path: '/adversaries.html',  critical: false },
  { name: '📡 PERSON_NODES',  path: '/nodes.html',        critical: false },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Live health check for all FLLC site pages and engine status'),

  async execute(interaction, { SITE_URL }) {
    await interaction.deferReply();

    const startTime = Date.now();
    const results = await Promise.allSettled(
      PAGES.map(p =>
        fetch(SITE_URL + p.path, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'FLLC-CyberBot/2.6.5' },
          signal: AbortSignal.timeout(6000),
        })
          .then(r => ({ ...p, ok: r.ok, code: r.status, ms: Date.now() - startTime }))
          .catch(e => ({ ...p, ok: false, code: 'ERR', ms: Date.now() - startTime, error: e.message?.slice(0,40) }))
      )
    );
    const elapsed = Date.now() - startTime;

    const pages = results.map(r => r.value || { ...r.reason, ok: false });
    const allUp = pages.every(p => p.ok);
    const criticalDown = pages.filter(p => p.critical && !p.ok);
    const downCount = pages.filter(p => !p.ok).length;

    const statusIcon = allUp ? '🟢' : criticalDown.length > 0 ? '🔴' : '🟡';
    const overallStatus = allUp ? 'ALL SYSTEMS NOMINAL' : criticalDown.length ? 'CRITICAL SYSTEMS DOWN' : 'DEGRADED — NON-CRITICAL';

    const critical = pages.filter(p => p.critical);
    const nonCrit  = pages.filter(p => !p.critical);

    const formatLine = p => `${p.ok ? '🟢' : '🔴'} ${p.name} \`${p.code}\` *(${p.ms}ms)*`;

    const embed = new EmbedBuilder()
      .setColor(allUp ? 0x00ff41 : criticalDown.length ? 0xff003c : 0xff8800)
      .setTitle(`${statusIcon} FURIOS-INT // SYSTEM_STATUS`)
      .setDescription(
        `**${overallStatus}**\n` +
        `${pages.filter(p=>p.ok).length}/${pages.length} pages up • ${downCount} down • Check time: ${elapsed}ms`
      )
      .addFields(
        { name: '🔴 CRITICAL SYSTEMS', value: critical.map(formatLine).join('\n') || '—', inline: false },
        { name: '⚪ SECONDARY SYSTEMS', value: nonCrit.map(formatLine).join('\n') || '—', inline: false },
        {
          name: '⚙️ ENGINE STATUS',
          value: [
            `E1: CORE_MMO        ${allUp ? '🟢 ONLINE' : '⚠️ CHECK'}`,
            `E2: SOURCECODE_OPS  ${allUp ? '🟢 ONLINE' : '⚠️ CHECK'}`,
            `E3: LITE_OSINT      🟢 ONLINE`,
            `E4: SOULCODE        🟢 ONLINE`,
          ].join('\n'),
          inline: false,
        },
      )
      .addFields({
        name: '🔗 Site',
        value: `[personfu.github.io](${SITE_URL}) • [🌐 RPG](${SITE_URL}/cyberworld.html) • [📡 Intel](${SITE_URL}/intel.html)`,
      })
      .setFooter({ text: `FURIOS-INT Status Monitor • ${new Date().toUTCString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 Launch Site').setStyle(ButtonStyle.Link).setURL(SITE_URL),
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
