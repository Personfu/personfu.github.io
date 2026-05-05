/**
 * ═══════════════════════════════════════════════════════════════════
 *  FLLC CYBERWORLD DISCORD BOT — index.js
 *  Application ID : 1170817211837992981
 *  Guild (Server)  : 1159996494691188765
 *  Built by Preston Furulie — CyberOS v2026.3-FLLC
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Features:
 *   • Slash commands: /intel /cve /mission /status /leaderboard /daemon /help
 *   • Daily 09:00 UTC briefing posted to CHANNEL_ANNOUNCEMENTS
 *   • Hourly CVE monitor: posts CRITICAL CVEs to CHANNEL_CVE_ALERTS
 *   • Bot presence shows "Playing CyberWorld RPG"
 *   • Discord Activity embed link → cyberworld RPG
 */

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ActivityType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');
const cron   = require('node-cron');
const fetch  = require('node-fetch');
const fs     = require('fs');
const path   = require('path');

// ─── Validate required env vars ───────────────────────────────────────────────
const REQUIRED = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
for (const v of REQUIRED) {
  if (!process.env[v]) {
    console.error(`[BOOT] Missing required env var: ${v}`);
    process.exit(1);
  }
}

const GUILD_ID          = process.env.DISCORD_GUILD_ID;
const CH_INTEL          = process.env.CHANNEL_INTEL;
const CH_ANNOUNCE       = process.env.CHANNEL_ANNOUNCEMENTS;
const CH_CVE            = process.env.CHANNEL_CVE_ALERTS;
const CH_GENERAL        = process.env.CHANNEL_GENERAL;
const SITE_URL          = process.env.SITE_URL || 'https://personfu.github.io';
const NVD_KEY           = process.env.NVD_API_KEY || '';

// ─── Bot client ───────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── Load slash commands ──────────────────────────────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  if ('data' in cmd && 'execute' in cmd) {
    client.commands.set(cmd.data.name, cmd);
    console.log(`[CMD] Loaded: /${cmd.data.name}`);
  }
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`[ONLINE] ${c.user.tag} — Guild: ${GUILD_ID}`);

  c.user.setPresence({
    activities: [{
      name: 'CyberWorld RPG // FURIOS-INT',
      type: ActivityType.Playing,
      url: `${SITE_URL}/cyberworld.html`,
    }],
    status: 'online',
  });

  // Post boot message to general if configured
  if (CH_GENERAL) {
    const ch = await safeGetChannel(CH_GENERAL);
    if (ch) {
      const embed = new EmbedBuilder()
        .setColor(0x00e8ff)
        .setTitle('⚡ FURIOS-INT BOT ONLINE')
        .setDescription('CyberWorld Operative Network is live.\nUse `/help` for available commands.')
        .addFields(
          { name: '🌐 RPG',     value: `[Launch CyberWorld](${SITE_URL}/cyberworld.html)`, inline: true },
          { name: '🕹 Arcade',  value: `[Play Games](${SITE_URL}/arcade.html)`,            inline: true },
          { name: '📡 Intel',   value: `[Live CVE Feed](${SITE_URL}/intel.html)`,          inline: true },
        )
        .setFooter({ text: `CyberOS v2026.3-FLLC • ${new Date().toUTCString()}` });
      await ch.send({ embeds: [embed] }).catch(() => {});
    }
  }

  // ── Cron: Daily briefing at 09:00 UTC ──────────────────────────────────────
  cron.schedule('0 9 * * *', () => postDailyBriefing(), { timezone: 'UTC' });

  // ── Cron: Hourly CVE monitor ───────────────────────────────────────────────
  cron.schedule('0 * * * *', () => postCriticalCVEs(), { timezone: 'UTC' });

  console.log('[CRON] Daily briefing @ 09:00 UTC | CVE monitor @ every hour');
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction, { SITE_URL, NVD_KEY, fetchCVEs, buildCVEEmbed });
  } catch (err) {
    console.error(`[ERROR] /${interaction.commandName}:`, err);
    const msg = { content: '⚠️ Command error. Try again.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ─── Daily Briefing ──────────────────────────────────────────────────────────
async function postDailyBriefing() {
  const ch = await safeGetChannel(CH_ANNOUNCE);
  if (!ch) return;

  const date = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const cves = await fetchCVEs(3).catch(() => []);

  const embed = new EmbedBuilder()
    .setColor(0x00ff41)
    .setTitle(`📋 DAILY OPERATIVE BRIEFING — ${date}`)
    .setDescription('FLLC CyberWorld daily threat intelligence & operations summary')
    .setThumbnail('https://personfu.github.io/favicon.ico')
    .addFields({ name: '⚡ SITE STATUS', value: '🟢 All systems nominal', inline: true })
    .addFields({ name: '🎮 RPG STATUS',  value: '🟢 6 APTs active | 4 Daemons live', inline: true })
    .addFields({ name: '\u200b', value: '\u200b', inline: false });

  if (cves.length > 0) {
    const cveText = cves.map(c => {
      const sev = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity
               || c.metrics?.cvssMetricV2?.[0]?.baseSeverity || 'N/A';
      const score = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
                 || c.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || '?';
      const id = c.cve?.id || 'UNKNOWN';
      const desc = (c.cve?.descriptions?.[0]?.value || '').slice(0, 120);
      return `**${id}** [${sev} ${score}]\n${desc}…`;
    }).join('\n\n');
    embed.addFields({ name: '🚨 TOP CRITICAL CVEs', value: cveText.slice(0, 1024) });
  }

  embed.addFields(
    { name: '🔗 Quick Links', value:
      `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html) • [🕹 Arcade](${SITE_URL}/arcade.html) • [📡 Intel Hub](${SITE_URL}/intel.html) • [⚔️ War Games](${SITE_URL}/wargames.html)`
    }
  ).setFooter({ text: 'FURIOS-INT CyberOS v2026.3-FLLC | Daily Briefing' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🌐 Launch RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
    new ButtonBuilder().setLabel('🕹 Arcade').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/arcade.html`),
    new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
  );

  await ch.send({ embeds: [embed], components: [row] }).catch(console.error);
  console.log(`[CRON] Daily briefing posted at ${new Date().toUTCString()}`);
}

// ─── Hourly CVE Monitor ───────────────────────────────────────────────────────
async function postCriticalCVEs() {
  const ch = await safeGetChannel(CH_CVE);
  if (!ch) return;

  try {
    const cves = await fetchCVEs(5, 'CRITICAL');
    if (!cves.length) return;

    const embed = new EmbedBuilder()
      .setColor(0xff003c)
      .setTitle('🚨 CRITICAL CVE ALERT — HOURLY MONITOR')
      .setDescription(`${cves.length} CRITICAL vulnerabilities detected in last 24 hours`)
      .setFooter({ text: `Source: NVD API | ${new Date().toUTCString()}` });

    for (const c of cves.slice(0, 5)) {
      const id    = c.cve?.id || 'N/A';
      const desc  = (c.cve?.descriptions?.[0]?.value || 'No description').slice(0, 200);
      const score = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
                 || c.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || 'N/A';
      embed.addFields({ name: `${id} [${score}]`, value: desc });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('📡 Full Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    );
    await ch.send({ embeds: [embed], components: [row] }).catch(() => {});
  } catch (e) {
    console.warn('[CVE-MONITOR]', e.message);
  }
}

// ─── NVD CVE fetch helper ─────────────────────────────────────────────────────
async function fetchCVEs(limit = 5, severity = 'CRITICAL') {
  const now  = new Date();
  const from = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().replace('Z', '+00:00');
  const to   = now.toISOString().replace('Z', '+00:00');
  const key  = NVD_KEY ? `&apiKey=${NVD_KEY}` : '';
  const url  = `https://services.nvd.nist.gov/rest/json/cves/2.0?cvssV3Severity=${severity}&pubStartDate=${from}&pubEndDate=${to}&resultsPerPage=${limit}${key}`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'FLLC-CyberBot/2.6.5' } });
  if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
  const data = await res.json();
  return data.vulnerabilities?.map(v => v) || [];
}

// ─── CVE embed builder (shared with commands) ─────────────────────────────────
function buildCVEEmbed(cves, title) {
  const embed = new EmbedBuilder()
    .setColor(0xff003c)
    .setTitle(title || '🔍 CVE RESULTS')
    .setFooter({ text: `Source: NVD | ${new Date().toUTCString()}` });
  if (!cves.length) {
    embed.setDescription('No matching CVEs found.');
    return embed;
  }
  for (const c of cves.slice(0, 5)) {
    const id    = c.cve?.id || 'N/A';
    const desc  = (c.cve?.descriptions?.[0]?.value || 'No description').slice(0, 200);
    const score = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
               || c.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || 'N/A';
    const sev   = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity
               || c.metrics?.cvssMetricV2?.[0]?.baseSeverity || '?';
    embed.addFields({ name: `${id}  [${sev} ${score}]`, value: desc });
  }
  return embed;
}

// ─── Safe channel getter ──────────────────────────────────────────────────────
async function safeGetChannel(id) {
  if (!id) return null;
  try { return await client.channels.fetch(id); } catch { return null; }
}

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('[LOGIN FAILED]', err.message);
  process.exit(1);
});
