/**
 * ci-post.js — CI-only runner: posts the daily briefing (+ critical CVE alert)
 * then exits. Invoked by .github/workflows/discord-bot.yml.
 *
 * Uses the Discord REST API directly instead of logging in to the gateway:
 * no websocket, no intents, nothing that can hang the job. Exits non-zero
 * when a post fails so a broken bot shows up as a red workflow run instead
 * of a silent green one.
 *
 * Env:
 *   DISCORD_TOKEN           (required unless DRY_RUN=1)
 *   CHANNEL_ANNOUNCEMENTS   daily briefing target
 *   CHANNEL_CVE_ALERTS      critical CVE alert target (optional)
 *   NVD_API_KEY             optional, raises NVD rate limits
 *   SITE_URL                default https://personfu.github.io
 *   DRY_RUN=1               build the messages and print them, post nothing
 */
require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { fetchCVEs } = require('./lib/nvd');
const { buildDailyBriefing, buildCVEAlert } = require('./lib/briefing');

const TOKEN    = (process.env.DISCORD_TOKEN || '').trim();
const CH_ANN   = (process.env.CHANNEL_ANNOUNCEMENTS || '').trim();
const CH_CVE   = (process.env.CHANNEL_CVE_ALERTS || '').trim();
const SITE_URL = (process.env.SITE_URL || 'https://personfu.github.io').replace(/\/+$/, '');
const NVD_KEY  = process.env.NVD_API_KEY || '';
const DRY_RUN  = /^(1|true|yes)$/i.test(process.env.DRY_RUN || '');

// REST client is created up front; the config checks below only decide
// whether we proceed, they never gate how the credential is used.
const rest = new REST({ version: '10', timeout: 15_000 }).setToken(TOKEN || 'dry-run');

// Hard stop so a stuck network call can never burn a whole Actions job.
setTimeout(() => { console.error('[CI] Timed out after 120s.'); process.exit(1); }, 120_000).unref();

function serialize(payload) {
  return {
    embeds:     (payload.embeds || []).map(e => (e.toJSON ? e.toJSON() : e)),
    components: (payload.components || []).map(c => (c.toJSON ? c.toJSON() : c)),
  };
}

async function send(rest, channelId, payload, label) {
  const body = serialize(payload);
  if (DRY_RUN) {
    console.log(`[CI][DRY_RUN] ${label} → channel ${channelId || '(unset)'}\n${JSON.stringify(body, null, 2)}`);
    return;
  }
  try {
    await rest.post(Routes.channelMessages(channelId), { body });
    console.log(`[CI] ${label} posted to ${channelId}.`);
  } catch (e) {
    const hint = {
      401: 'DISCORD_TOKEN is invalid or was reset — update the repo secret.',
      403: 'Bot lacks View Channel / Send Messages / Embed Links in that channel.',
      404: 'Channel ID not found — check the CHANNEL_* secret/variable.',
    }[e.status] || '';
    throw new Error(`${label} failed (HTTP ${e.status ?? '?'}): ${e.message}${hint ? ` — ${hint}` : ''}`);
  }
}

(async () => {
  if (!DRY_RUN && !TOKEN) {
    console.error('[CI] DISCORD_TOKEN is not set. Add it under Settings → Secrets and variables → Actions.');
    process.exit(1);
  }
  if (!CH_ANN && !CH_CVE) {
    console.error('[CI] Neither CHANNEL_ANNOUNCEMENTS nor CHANNEL_CVE_ALERTS is set — nothing to post to.');
    process.exit(1);
  }

  if (!DRY_RUN) {
    try {
      const me = await rest.get(Routes.user('@me'));
      console.log(`[CI] Authenticated as ${me.username} (${me.id})`);
    } catch (e) {
      console.error(`[CI] Discord auth failed (HTTP ${e.status ?? '?'}): ${e.message}. Is DISCORD_TOKEN current?`);
      process.exit(1);
    }
  }

  let cves = [], cveError = null;
  try {
    cves = await fetchCVEs(5, 'CRITICAL', { apiKey: NVD_KEY });
    console.log(`[CI] NVD returned ${cves.length} CRITICAL CVE(s) for the last 24h.`);
  } catch (e) {
    cveError = e;
    console.warn(`[CI] NVD fetch failed — posting briefing without CVEs: ${e.message}`);
  }

  const failures = [];

  if (CH_ANN) {
    await send(rest, CH_ANN, buildDailyBriefing(SITE_URL, cves.slice(0, 3), { cveError }), 'Daily briefing')
      .catch(e => failures.push(e));
  } else {
    console.log('[CI] CHANNEL_ANNOUNCEMENTS not configured — skipping briefing.');
  }

  if (CH_CVE && cves.length) {
    await send(rest, CH_CVE, buildCVEAlert(SITE_URL, cves, '🚨 CRITICAL CVE ALERT — last 24h'), 'CVE alert')
      .catch(e => failures.push(e));
  } else if (CH_CVE) {
    console.log('[CI] No CRITICAL CVEs to alert on.');
  }

  if (failures.length) {
    failures.forEach(e => console.error(`[CI] ${e.message}`));
    process.exit(1);
  }
  console.log('[CI] Done.');
  process.exit(0);
})().catch(e => { console.error('[CI] Unexpected error:', e); process.exit(1); });
