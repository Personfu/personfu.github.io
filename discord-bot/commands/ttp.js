/**
 * /ttp [technique] — MITRE ATT&CK technique lookup with detection, mitigation, and examples.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const TTP_DB = {
  'T1059': {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    tactic: 'Execution',
    subtechniques: ['T1059.001 PowerShell','T1059.003 Windows Cmd','T1059.006 Python','T1059.007 JavaScript'],
    color: 0xff003c,
    desc: 'Adversaries abuse command interpreters to execute commands, scripts, or binaries. PowerShell is most abused on Windows; Bash on Linux. Living-off-the-land attacks use only built-in interpreters to evade AV.',
    usedBy: ['FANCY_BEAR','COZY_BEAR','LAZARUS_GROUP','SCATTERED_SPIDER'],
    detection: [
      'Sysmon EventID 1: monitor for `powershell.exe`, `cmd.exe`, `wscript.exe` with suspicious parent processes',
      'Alert on PowerShell with `-EncodedCommand`, `-Bypass`, `-NoProfile` flags',
      'AMSI (Antimalware Scan Interface) captures all PS scripts — enable and monitor',
    ],
    mitigation: [
      'Constrained Language Mode (CLM) for PowerShell',
      'AppLocker / WDAC to block unauthorized script hosts',
      'Script Block Logging (EventID 4104) captures deobfuscated PS',
    ],
    example: '`powershell.exe -NoP -Exec Bypass -EncodedCommand <base64>` — common Cobalt Strike stager',
    dataSource: 'Process Create (4688), Script Block (4104), Network Connect',
  },
  'T1566': {
    id: 'T1566',
    name: 'Phishing',
    tactic: 'Initial Access',
    subtechniques: ['T1566.001 Spear Phishing Attachment','T1566.002 Spear Phishing Link','T1566.003 Spear Phishing via Service'],
    color: 0xff8800,
    desc: 'Phishing is the #1 initial access vector. Adversaries craft emails impersonating trusted entities. Spear phishing targets specific individuals using OSINT-derived personalization to increase success rate.',
    usedBy: ['COZY_BEAR','CHARMING_KITTEN','FANCY_BEAR','SCATTERED_SPIDER'],
    detection: [
      'Email gateway: flag lookalike domains (edit-distance ≤ 2 from your domain)',
      'Sandbox all attachments: `.docm`, `.xlsm`, `.iso`, `.lnk` are high-risk extensions',
      'Alert on `winword.exe` spawning `cmd.exe` or `powershell.exe` (malicious macro sign)',
    ],
    mitigation: [
      'DMARC `p=reject` + DKIM + SPF on all sending domains',
      'User awareness training with simulated phishing (Microsoft Attack Simulator)',
      'Disable macros by default; allow only code-signed macros from trusted publishers',
    ],
    example: 'ISO → LNK → PowerShell: ISO file bypasses Mark-of-the-Web (MOTW) blocks. User mounts ISO, clicks LNK, launches stager.',
    dataSource: 'Email events, Process Create, Network Connect, File Create',
  },
  'T1078': {
    id: 'T1078',
    name: 'Valid Accounts',
    tactic: 'Initial Access / Persistence / Privilege Escalation',
    subtechniques: ['T1078.001 Default Accounts','T1078.002 Domain Accounts','T1078.003 Local Accounts','T1078.004 Cloud Accounts'],
    color: 0xff00ea,
    desc: 'Adversaries obtain and abuse legitimate credentials to bypass access controls. Credentials are sourced via phishing, credential dumping (Mimikatz), password spraying, or purchase on dark markets.',
    usedBy: ['COZY_BEAR','VOLT_TYPHOON','SCATTERED_SPIDER','FANCY_BEAR'],
    detection: [
      'Alert on logins from impossible travel (same user, two countries, < 1h apart)',
      'Monitor for off-hours logins and new device logins for privileged accounts',
      'Detect password spray: many failed logins across many accounts in short window',
    ],
    mitigation: [
      'Phishing-resistant MFA (FIDO2/Passkeys) — especially for admins',
      'Privileged Access Workstations (PAWs) for all admin access',
      'Regular credential audits: disable stale accounts, enforce rotation',
    ],
    example: 'SCATTERED_SPIDER called IT helpdesk and social-engineered Okta MFA reset — no exploit needed. Valid creds obtained.',
    dataSource: 'Authentication logs, Account Logon (4624/4625), Azure AD sign-in logs',
  },
  'T1486': {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    tactic: 'Impact',
    subtechniques: [],
    color: 0xff4400,
    desc: 'Ransomware encrypts victim data to extort payment or cause disruption. Modern ransomware (LockBit, Cl0p, BlackCat) uses AES-256 + RSA-2048 hybrid encryption. Average dwell time before detonation: 12 days.',
    usedBy: ['BITWISE_SPIDER','SANDWORM','Cl0p','BlackCat/ALPHV'],
    detection: [
      'Alert on bulk file renames (appended extensions) — Splunk: `index=fs rapid_file_rename`',
      'Monitor for `vssadmin delete shadows` and `bcdedit /set recoveryenabled no`',
      'Honeypot files in file shares: if modified, immediate ransomware alert',
    ],
    mitigation: [
      'Immutable backups (Veeam with hardened repo or air-gapped) — test recovery quarterly',
      'Network segmentation: blast radius containment if one segment hit',
      'WDAC / AppLocker: block unsigned executables from running on servers',
    ],
    example: 'LockBit 3.0: enumerates shares → encrypts 100k+ files in 45s → wipes VSS → drops ransom note in every folder.',
    dataSource: 'File system events, VSS event logs, Process Create (vssadmin.exe)',
  },
  'T1190': {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    tactic: 'Initial Access',
    subtechniques: [],
    color: 0x00e8ff,
    desc: 'Adversaries exploit vulnerabilities in public-facing applications (VPNs, web apps, email servers) for unauthenticated initial access. CVE-2024-3400 (PAN-OS), CVE-2023-4966 (Citrix Bleed), CVE-2021-40444 (MSHTML) are recent examples.',
    usedBy: ['VOLT_TYPHOON','FANCY_BEAR','LAZARUS_GROUP','TA577'],
    detection: [
      'Alert on WAF: blocked requests to admin/login endpoints with SQLi or path traversal payloads',
      'Monitor web server logs for unusual response sizes (>100x normal = potential exfil)',
      'EDR: alert on web server process spawning shells (e.g., `nginx` → `bash`)',
    ],
    mitigation: [
      'Patch SLA: CRITICAL CVEs patched within 24h, HIGH within 72h',
      'WAF with OWASP CRS rule set in front of all public applications',
      'Attack Surface Management (ASM): continuous external exposure scanning',
    ],
    example: 'CVE-2024-3400: single unauthenticated HTTP request achieves RCE on PAN-OS GlobalProtect. CVSS 10.0. PoC public in 24h.',
    dataSource: 'WAF logs, Web server logs, Process Create (webserver child process)',
  },
  'T1195': {
    id: 'T1195',
    name: 'Supply Chain Compromise',
    tactic: 'Initial Access',
    subtechniques: ['T1195.001 Compromise Software Dependencies','T1195.002 Compromise Software Supply Chain','T1195.003 Compromise Hardware Supply Chain'],
    color: 0x9900ff,
    desc: 'Supply chain attacks compromise trusted software or hardware before delivery. SolarWinds SUNBURST (18k+ victims), XZ Utils backdoor (CVE-2024-3094), and 3CX trojanized app show how a single compromise can reach millions.',
    usedBy: ['COZY_BEAR','LAZARUS_GROUP','MUSTANG_PANDA'],
    detection: [
      'Hash verification of software packages against published checksums before install',
      'SBOM (Software Bill of Materials) scanning — detect unexpected dependencies',
      'Alert on software updater process making unexpected network connections',
    ],
    mitigation: [
      'Vendor security assessments + contractual security requirements',
      'Code signing verification for all software and updates',
      'Isolated update staging environment for testing before production deployment',
    ],
    example: 'XZ Utils CVE-2024-3094: attacker spent 2 years contributing to open-source project before inserting backdoor that targeted OpenSSH on systemd systems.',
    dataSource: 'Software inventory, Network Connect (updater processes), Hash verification logs',
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ttp')
    .setDescription('Look up a MITRE ATT&CK technique — detection, mitigation, real-world examples')
    .addStringOption(opt =>
      opt.setName('technique')
        .setDescription('MITRE ATT&CK technique ID or name')
        .setRequired(true)
        .addChoices(
          { name: 'T1059 — Command & Scripting Interpreter',        value: 'T1059' },
          { name: 'T1566 — Phishing (spear phishing)',              value: 'T1566' },
          { name: 'T1078 — Valid Accounts (credential abuse)',       value: 'T1078' },
          { name: 'T1486 — Data Encrypted for Impact (ransomware)', value: 'T1486' },
          { name: 'T1190 — Exploit Public-Facing Application',      value: 'T1190' },
          { name: 'T1195 — Supply Chain Compromise',                value: 'T1195' },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const id  = interaction.options.getString('technique', true).toUpperCase();
    const ttp = TTP_DB[id];

    if (!ttp) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x555555)
          .setTitle(`❓ ${id} — Not in FURIOS-INT TTP Database`)
          .setDescription(`Available: ${Object.keys(TTP_DB).join(', ')}\n\nFull ATT&CK matrix: [attack.mitre.org](https://attack.mitre.org)`)],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(ttp.color)
      .setTitle(`🗺️ ${ttp.id} — ${ttp.name}`)
      .setURL(`https://attack.mitre.org/techniques/${ttp.id.replace('.', '/')}/`)
      .setDescription(
        `**Tactic:** \`${ttp.tactic}\`\n\n> ${ttp.desc}`
      )
      .addFields(
        ttp.subtechniques.length > 0
          ? { name: '🔗 Sub-Techniques', value: ttp.subtechniques.map(s => `\`${s}\``).join('\n'), inline: false }
          : { name: '🔗 Sub-Techniques', value: 'None defined', inline: true },
        { name: '👁️ Detection Methods', value: ttp.detection.map(d => `• ${d}`).join('\n'), inline: false },
        { name: '🛡️ Mitigations',       value: ttp.mitigation.map(m => `• ${m}`).join('\n'), inline: false },
        { name: '🌍 Used By',            value: ttp.usedBy.map(a => `\`${a}\``).join('  '), inline: false },
        { name: '📚 Real-World Example', value: `> ${ttp.example}`, inline: false },
        { name: '📊 Data Sources',       value: `\`${ttp.dataSource}\``, inline: false },
      )
      .setFooter({ text: `FURIOS-INT // MITRE ATT&CK v15 • ${new Date().toUTCString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('MITRE ATT&CK').setStyle(ButtonStyle.Link).setURL(`https://attack.mitre.org/techniques/${ttp.id}/`),
      new ButtonBuilder().setLabel('☠️ Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
