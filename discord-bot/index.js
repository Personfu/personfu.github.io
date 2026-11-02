/**
 * ═══════════════════════════════════════════════════════════════════
 *  FLLC CYBERWORLD DISCORD BOT — index.js
 *  Application ID : 1170817211837992981
 *  Guild (Server)  : 1159996494691188765
 *  Built by Person Fu — CyberOS v2026.3-FLLC
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
const { fetchCVEs: nvdFetch } = require('./lib/nvd');
const { buildDailyBriefing, buildCVEAlert, buildCVEEmbed } = require('./lib/briefing');
const fs     = require('fs');
const path   = require('path');

// ─── Validate required env vars ───────────────────────────────────────────────
process.env.DISCORD_CLIENT_ID ||= '1170817211837992981';
process.env.DISCORD_GUILD_ID  ||= '1159996494691188765';
const REQUIRED = ['DISCORD_TOKEN'];
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
const NEXUS_API         = process.env.NEXUS_API_URL || 'https://personfugithubio-production.up.railway.app';
const ANNOUNCE_ON_BOOT  = /^(1|true|yes)$/i.test(process.env.ANNOUNCE_ON_BOOT || '');
const BRIEFING_IN_PROCESS = /^(1|true|yes)$/i.test(process.env.BRIEFING_IN_PROCESS || '');

const fetchCVEs = (limit, severity) => nvdFetch(limit, severity, { apiKey: NVD_KEY });

// ─── Bot client ───────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // GuildMembers is a *privileged* intent; requesting it without enabling
    // it in the Developer Portal makes login fail with "Used disallowed
    // intents". Nothing here needs it, so it is not requested.
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

  // Post boot message to general only when explicitly enabled — otherwise
  // every redeploy/restart spams #general.
  if (CH_GENERAL && ANNOUNCE_ON_BOOT) {
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
  // The GitHub Actions workflow (.github/workflows/discord-bot.yml) already
  // posts the daily briefing. Only post from this process when asked to, so
  // the channel does not get the same briefing twice.
  if (BRIEFING_IN_PROCESS) {
    cron.schedule('0 9 * * *', () => postDailyBriefing(), { timezone: 'UTC' });
  }

  // ── Cron: Hourly CVE monitor ───────────────────────────────────────────────
  cron.schedule('0 * * * *', () => postCriticalCVEs(), { timezone: 'UTC' });

  console.log(`[CRON] CVE monitor @ every hour${BRIEFING_IN_PROCESS ? ' | daily briefing @ 09:00 UTC' : ' (daily briefing handled by GitHub Actions)'}`);

  // Prime the CVE de-dup cache so the first hourly tick only posts new CVEs.
  postCriticalCVEs();
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
  if (!ch) { console.warn('[BRIEFING] CHANNEL_ANNOUNCEMENTS not set or not reachable — skipped.'); return; }

  let cves = [], cveError = null;
  try { cves = await fetchCVEs(3, 'CRITICAL'); }
  catch (e) { cveError = e; console.warn('[BRIEFING] NVD fetch failed:', e.message); }

  try {
    await ch.send(buildDailyBriefing(SITE_URL, cves, { cveError }));
    cves.forEach(v => postedCVEs.add(v.cve?.id));
    console.log(`[CRON] Daily briefing posted at ${new Date().toUTCString()}`);
  } catch (e) {
    console.error('[BRIEFING] send failed:', e.message);
  }
}

// ─── Hourly CVE Monitor ───────────────────────────────────────────────────────
// Only posts CVEs that have not been posted before by this process, so the
// channel is not flooded with the same 24h window every hour.
const postedCVEs = new Set();
let cveMonitorPrimed = false;

async function postCriticalCVEs() {
  const ch = await safeGetChannel(CH_CVE);
  if (!ch) return;

  try {
    const cves  = await fetchCVEs(20, 'CRITICAL');
    const fresh = cves.filter(v => v.cve?.id && !postedCVEs.has(v.cve.id));
    fresh.forEach(v => postedCVEs.add(v.cve.id));

    // First run after a restart: remember what already exists instead of
    // re-announcing it (the daily CI job / previous process covered it).
    if (!cveMonitorPrimed) { cveMonitorPrimed = true; return; }
    if (!fresh.length) return;

    await ch.send(buildCVEAlert(SITE_URL, fresh.slice(0, 5)));
    console.log(`[CVE-MONITOR] Posted ${Math.min(fresh.length, 5)} new CRITICAL CVEs.`);
  } catch (e) {
    console.warn('[CVE-MONITOR]', e.message);
  }

  // Keep memory bounded.
  if (postedCVEs.size > 5000) postedCVEs.clear();
}

// ─── Safe channel getter ──────────────────────────────────────────────────────
async function safeGetChannel(id) {
  if (!id) return null;
  try { return await client.channels.fetch(id); } catch { return null; }
}

// ─── HTTP health server (Railway healthcheck) ─────────────────────────────────
const http = require('http');
const HEALTH_PORT = Number(process.env.PORT || 3001);
http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true, service: 'furios-discord-bot',
      status: client.isReady() ? 'online' : 'connecting',
      uptime: Math.floor(process.uptime()),
      tag: client.user ? client.user.tag : null,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404); res.end();
  }
}).listen(HEALTH_PORT, '0.0.0.0', () => {
  console.log(`[HEALTH] HTTP health server on :${HEALTH_PORT}/health`);
});

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('[LOGIN FAILED]', err.message);
  process.exit(1);
});
