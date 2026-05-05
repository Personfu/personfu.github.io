/**
 * ci-post.js — CI-only runner: posts daily briefing then exits.
 * Invoked by .github/workflows/discord-bot.yml with CI_MODE=true.
 * Does NOT start cron or stay alive.
 */
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');
const fetch = require('node-fetch');

const TOKEN    = process.env.DISCORD_TOKEN;
const CH_ANN   = process.env.CHANNEL_ANNOUNCEMENTS;
const CH_CVE   = process.env.CHANNEL_CVE_ALERTS;
const SITE_URL = process.env.SITE_URL || 'https://personfu.github.io';
const NVD_KEY  = process.env.NVD_API_KEY || '';

if (!TOKEN) { console.error('[CI] DISCORD_TOKEN not set'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`[CI] Logged in as ${client.user.tag}`);
  try {
    await postBriefing();
    await postCVEs();
    console.log('[CI] All posts complete. Exiting.');
  } catch (e) {
    console.error('[CI] Post error:', e.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

async function postBriefing() {
  if (!CH_ANN) { console.log('[CI] CHANNEL_ANNOUNCEMENTS not configured — skipping briefing.'); return; }
  const ch = await client.channels.fetch(CH_ANN).catch(() => null);
  if (!ch) { console.log('[CI] Cannot fetch announcements channel.'); return; }

  const date = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const cves = await fetchCVEs(3).catch(() => []);

  const embed = new EmbedBuilder()
    .setColor(0x00ff41)
    .setTitle(`📋 DAILY OPERATIVE BRIEFING — ${date}`)
    .setDescription('FLLC CyberWorld daily intelligence summary & operations update')
    .addFields(
      { name: '⚡ SYSTEM STATUS', value: '🟢 All systems nominal • All 4 engines online', inline: true },
      { name: '🎮 RPG STATUS',    value: '🟢 6 APTs active • 4 Daemons live • War Games open', inline: true },
      { name: '\u200b', value: '\u200b' },
    );

  if (cves.length > 0) {
    const txt = cves.map(c => {
      const id    = c.cve?.id || '?';
      const sev   = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || c.metrics?.cvssMetricV2?.[0]?.baseSeverity || 'N/A';
      const score = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore    || c.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || '?';
      const desc  = (c.cve?.descriptions?.[0]?.value || '').slice(0, 100);
      return `**${id}** [${sev} ${score}] — ${desc}…`;
    }).join('\n\n');
    embed.addFields({ name: '🚨 TODAY\'s CRITICAL CVEs', value: txt.slice(0, 1024) });
  }

  embed.addFields({
    name: '🔗 Quick Access',
    value: `[🌐 RPG](${SITE_URL}/cyberworld.html) • [🕹 Arcade](${SITE_URL}/arcade.html) • [📡 Intel](${SITE_URL}/intel.html) • [⚔️ War Games](${SITE_URL}/wargames.html) • [☠️ Adversaries](${SITE_URL}/adversaries.html)`,
  }).setFooter({ text: `FURIOS-INT CyberOS v2026.3-FLLC • Automated Daily Briefing` }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
    new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
  );

  await ch.send({ embeds: [embed], components: [row] });
  console.log('[CI] Daily briefing posted.');
}

async function postCVEs() {
  if (!CH_CVE) { console.log('[CI] CHANNEL_CVE_ALERTS not configured — skipping CVE post.'); return; }
  const ch = await client.channels.fetch(CH_CVE).catch(() => null);
  if (!ch) return;

  const cves = await fetchCVEs(5, 'CRITICAL').catch(() => []);
  if (!cves.length) { console.log('[CI] No CRITICAL CVEs in last 24h.'); return; }

  const embed = new EmbedBuilder()
    .setColor(0xff003c)
    .setTitle(`🚨 CRITICAL CVE ALERT — ${new Date().toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}`)
    .setDescription(`**${cves.length}** CRITICAL CVEs published in last 24 hours — FURIOS-INT Intel Stream`);

  for (const c of cves.slice(0, 5)) {
    const id    = c.cve?.id || 'N/A';
    const desc  = (c.cve?.descriptions?.[0]?.value || 'No description').slice(0, 200);
    const score = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || c.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || 'N/A';
    embed.addFields({ name: `${id} [CVSS ${score}]`, value: desc });
  }

  embed.addFields({ name: '📡 Full Intel', value: `[Live CVE Search](${SITE_URL}/intel.html)` })
       .setFooter({ text: `Source: NVD API • FURIOS-INT • ${new Date().toUTCString()}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
  );

  await ch.send({ embeds: [embed], components: [row] });
  console.log(`[CI] Posted ${cves.length} CRITICAL CVEs.`);
}

async function fetchCVEs(limit = 5, severity = 'CRITICAL') {
  const now  = new Date();
  const from = new Date(now - 24 * 3600 * 1000).toISOString().replace('Z', '+00:00');
  const to   = now.toISOString().replace('Z', '+00:00');
  const key  = NVD_KEY ? `&apiKey=${NVD_KEY}` : '';
  const url  = `https://services.nvd.nist.gov/rest/json/cves/2.0?cvssV3Severity=${severity}&pubStartDate=${from}&pubEndDate=${to}&resultsPerPage=${limit}${key}`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'FLLC-CyberBot/2.6.5' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`NVD ${res.status}`);
  const data = await res.json();
  return data.vulnerabilities || [];
}

client.login(TOKEN).catch(e => { console.error('[CI] Login failed:', e.message); process.exit(1); });
