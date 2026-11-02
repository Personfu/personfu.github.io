/**
 * lib/briefing.js — message builders shared by the long-running bot
 * (index.js) and the GitHub Actions one-shot poster (ci-post.js), so the
 * two never drift apart again.
 */
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { cveInfo, truncate } = require('./nvd');

function linkButton(label, url) {
  return new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url);
}

/**
 * Daily briefing embed.
 * @param {string} siteUrl
 * @param {Array}  cves     NVD vulnerability records (may be empty)
 * @param {object} [extra]  { cveError } — set when the CVE feed was unreachable
 */
function buildDailyBriefing(siteUrl, cves, extra = {}) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff41)
    .setTitle(`📋 DAILY OPERATIVE BRIEFING — ${date}`)
    .setURL(`${siteUrl}/intel.html`)
    .setDescription('FLLC CyberWorld daily threat intelligence & operations summary.');

  if (cves.length) {
    const txt = cves.map(v => {
      const c = cveInfo(v);
      return `**[${c.id}](${c.url})** · ${c.severity} ${c.score}\n${truncate(c.desc, 140)}`;
    }).join('\n\n');
    embed.addFields({ name: `🚨 Critical CVEs — last 24h (${cves.length})`, value: truncate(txt, 1024) });
  } else if (extra.cveError) {
    embed.addFields({ name: '🚨 Critical CVEs', value: '_NVD feed unreachable this run — check the Intel Hub for live data._' });
  } else {
    embed.addFields({ name: '🚨 Critical CVEs', value: 'No new CRITICAL CVEs published in the last 24 hours. ✅' });
  }

  embed.addFields({
    name: '🔗 Quick Links',
    value: `[🌐 CyberWorld RPG](${siteUrl}/cyberworld.html) • [🕹 Arcade](${siteUrl}/arcade.html) • ` +
           `[📡 Intel Hub](${siteUrl}/intel.html) • [⚔️ War Games](${siteUrl}/wargames.html)`,
  })
    .setFooter({ text: 'FURIOS-INT CyberOS • Daily Briefing • /help for commands' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    linkButton('🌐 Launch RPG', `${siteUrl}/cyberworld.html`),
    linkButton('📡 Intel Hub', `${siteUrl}/intel.html`),
    linkButton('⚔️ War Games', `${siteUrl}/wargames.html`),
  );

  return { embeds: [embed], components: [row] };
}

/** Critical-CVE alert embed. */
function buildCVEAlert(siteUrl, cves, title = '🚨 CRITICAL CVE ALERT') {
  const embed = new EmbedBuilder()
    .setColor(0xff003c)
    .setTitle(title)
    .setDescription(`**${cves.length}** new CRITICAL ${cves.length === 1 ? 'vulnerability' : 'vulnerabilities'} published on NVD.`)
    .setFooter({ text: 'Source: NIST NVD • FURIOS-INT' })
    .setTimestamp();

  for (const v of cves.slice(0, 5)) {
    const c = cveInfo(v);
    embed.addFields({ name: `${c.id} · CVSS ${c.score}`, value: `${truncate(c.desc, 220)}\n[NVD entry](${c.url})` });
  }

  const row = new ActionRowBuilder().addComponents(
    linkButton('📡 Full Intel Hub', `${siteUrl}/intel.html`),
  );
  return { embeds: [embed], components: [row] };
}

/** Generic CVE results embed used by /intel. */
function buildCVEEmbed(cves, title) {
  const embed = new EmbedBuilder()
    .setColor(0xff003c)
    .setTitle(title || '🔍 CVE RESULTS')
    .setFooter({ text: 'Source: NIST NVD' })
    .setTimestamp();
  if (!cves.length) {
    embed.setDescription('No matching CVEs published in the last 24 hours.');
    return embed;
  }
  for (const v of cves.slice(0, 5)) {
    const c = cveInfo(v);
    embed.addFields({ name: `${c.id}  [${c.severity} ${c.score}]`, value: `${truncate(c.desc, 200)}\n[NVD entry](${c.url})` });
  }
  return embed;
}

module.exports = { buildDailyBriefing, buildCVEAlert, buildCVEEmbed };
