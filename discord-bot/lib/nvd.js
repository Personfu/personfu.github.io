/**
 * lib/nvd.js — shared NVD (NIST) CVE helpers used by index.js, ci-post.js
 * and the slash commands.
 *
 * NOTE: query params MUST be URL-encoded. The previous inline helper built
 * `pubStartDate=...+00:00` by hand; the raw `+` decodes to a space and NVD
 * answered 404 on every request, so no CVE data was ever posted.
 */
const fetch = require('node-fetch');

const NVD_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const UA      = 'FLLC-CyberBot/2.7.0 (+https://personfu.github.io)';

/** NVD wants ISO-8601 with millis and no trailing Z (UTC assumed). */
function nvdDate(d) {
  return d.toISOString().replace('Z', '');
}

/**
 * Fetch CVEs published in the last `hours` hours, newest first.
 * @param {number} limit      max results to return
 * @param {string} severity   LOW | MEDIUM | HIGH | CRITICAL | ALL
 * @param {object} [opts]     { apiKey, hours, timeoutMs }
 */
async function fetchCVEs(limit = 5, severity = 'CRITICAL', opts = {}) {
  const apiKey    = opts.apiKey ?? process.env.NVD_API_KEY ?? '';
  const hours     = opts.hours ?? 24;
  const timeoutMs = opts.timeoutMs ?? 15000;

  const now  = new Date();
  const from = new Date(now.getTime() - hours * 3600 * 1000);

  const params = new URLSearchParams({
    pubStartDate: nvdDate(from),
    pubEndDate:   nvdDate(now),
    // Pull a wider page so we can sort newest-first locally (NVD returns
    // oldest-first and has no sort parameter).
    resultsPerPage: String(Math.min(Math.max(limit * 10, 50), 2000)),
  });
  const sev = String(severity || '').toUpperCase();
  if (sev && sev !== 'ALL') params.set('cvssV3Severity', sev);

  const headers = { 'User-Agent': UA };
  if (apiKey) headers.apiKey = apiKey; // NVD 2.0 expects the key as a header

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${NVD_URL}?${params}`, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        throw new Error(`NVD HTTP ${res.status}`);
      }
      if (!res.ok) throw Object.assign(new Error(`NVD HTTP ${res.status}`), { fatal: true });
      const data = await res.json();
      const vulns = data.vulnerabilities || [];
      vulns.sort((a, b) => String(b.cve?.published || '').localeCompare(String(a.cve?.published || '')));
      return vulns.slice(0, limit);
    } catch (e) {
      lastErr = e;
      if (e.fatal) break;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Pull the useful bits out of an NVD vulnerability record. */
function cveInfo(v) {
  const c   = v.cve || {};
  const m31 = c.metrics?.cvssMetricV31?.[0]?.cvssData || c.metrics?.cvssMetricV30?.[0]?.cvssData;
  const m2  = c.metrics?.cvssMetricV2?.[0];
  const desc = (c.descriptions || []).find(d => d.lang === 'en')?.value
            || c.descriptions?.[0]?.value || 'No description';
  return {
    id:       c.id || 'UNKNOWN',
    severity: m31?.baseSeverity || m2?.baseSeverity || 'N/A',
    score:    m31?.baseScore ?? m2?.cvssData?.baseScore ?? '?',
    desc,
    url:      `https://nvd.nist.gov/vuln/detail/${c.id}`,
  };
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

module.exports = { fetchCVEs, cveInfo, truncate };
