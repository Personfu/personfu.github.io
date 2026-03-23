/**
 * /scan [type] — Simulated cybersecurity scan (educational/RPG gamification)
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const SCANS = {
  nmap: {
    icon: '🔭', name: 'NMAP PORT SCAN', color: 0x00e8ff,
    intro: 'Initiating TCP SYN stealth scan across /24 CIDR...',
    generate: () => {
      const openPorts = [];
      const COMMON = [21,22,23,25,53,80,110,135,139,143,443,445,3306,3389,5432,5900,8080,8443];
      COMMON.filter(() => Math.random() > 0.6).forEach(p => {
        const svc = { 21:'ftp',22:'ssh',23:'telnet',25:'smtp',53:'domain',80:'http',110:'pop3',
                       135:'msrpc',139:'netbios-ssn',143:'imap',443:'https',445:'microsoft-ds',
                       3306:'mysql',3389:'ms-wbt-server',5432:'postgresql',5900:'vnc',8080:'http-proxy',8443:'https-alt' };
        openPorts.push(`**${p}/tcp** open  ${svc[p] || 'unknown'}`);
      });
      if (!openPorts.length) openPorts.push('**443/tcp** open  https');
      return openPorts.slice(0, 8);
    },
    footer: 'Tool: nmap -sS -sV -O --script vuln',
  },
  nikto: {
    icon: '🕷️', name: 'NIKTO WEB VULN SCAN', color: 0xff8800,
    intro: 'Running Nikto v2.1.6 against target web service...',
    generate: () => {
      const findings = [
        'OSVDB-3268: /admin/: Directory indexing found',
        'OSVDB-3092: /backup.zip: Backup archive may contain sensitive data',
        'CVE-2023-44487: HTTP/2 RAPID RESET DoS — server unpatched',
        'X-Frame-Options header not present — clickjacking risk',
        'Server: Apache/2.4.51 — outdated version with known CVEs',
        'OSVDB-3233: /phpinfo.php: PHP info file exposes configuration',
        'No HSTS header — SSL stripping possible',
        'robots.txt found: /admin/, /api/internal/ exposed',
        'HTTP TRACE method enabled — XST risk',
        '/server-status: Apache server-status accessible',
      ];
      return findings.filter(() => Math.random() > 0.4).slice(0, 6);
    },
    footer: 'Tool: nikto -h target -ssl -Format txt',
  },
  gobuster: {
    icon: '🗂️', name: 'GOBUSTER DIR BRUTE-FORCE', color: 0x00ff41,
    intro: 'Launching directory enumeration with SecLists/Discovery...',
    generate: () => {
      const dirs = [
        '/admin (Status: 200, Size: 4821)',
        '/api (Status: 200, Size: 132)',
        '/backup (Status: 403, Size: 287)',
        '/config (Status: 301, Size: 0) → /config/',
        '/uploads (Status: 200, Size: 1024)',
        '/.env (Status: 200, Size: 512) ⚠️ EXPOSED',
        '/internal (Status: 401, Size: 194)',
        '/login (Status: 200, Size: 3291)',
        '/.git/HEAD (Status: 200, Size: 23) ⚠️ GIT EXPOSED',
        '/api/v1/users (Status: 200, Size: 9834)',
      ];
      return dirs.filter(() => Math.random() > 0.4).slice(0, 7);
    },
    footer: 'Tool: gobuster dir -u target -w /usr/share/seclists/Discovery/Web-Content/big.txt',
  },
  masscan: {
    icon: '📡', name: 'MASSCAN NETWORK SWEEP', color: 0xff00ea,
    intro: 'Performing 10k pps mass scan across target range...',
    generate: () => {
      const ips  = Array.from({length: 6}, (_, i) => `192.168.${Math.floor(Math.random()*10)}.${10+i*3}`);
      const ports = [22, 80, 443, 3389, 8080, 21];
      return ips.map((ip, i) => `Discovered open port **${ports[i]}/tcp** on \`${ip}\``);
    },
    footer: 'Tool: masscan -p1-65535 --rate=10000 --output-format grepable',
  },
  hydra: {
    icon: '🐲', name: 'HYDRA CREDENTIAL BRUTEFORCE', color: 0xff003c,
    intro: 'Hydra v9.5 launching parallel login attempts (SSH target)...',
    generate: () => {
      const lines = [
        '[22][ssh] login: admin  password: admin123 ✓ VALID CREDENTIAL',
        '[22][ssh] login: root   password: toor     ✗ FAILED',
        '[22][ssh] login: ubuntu password: ubuntu   ✓ VALID CREDENTIAL',
        '[22][ssh] login: admin  password: password ✗ FAILED (lockout: 1 attempt remain)',
        '[22][ssh] login: user   password: 123456   ✗ FAILED',
        '[22][ssh] login: test   password: test     ✓ VALID CREDENTIAL',
        '⚠️  WARNING: 3 valid credentials discovered',
        'Session stats: 2,400 attempts, 3 hits, elapsed: 14s',
      ];
      return lines.filter(() => Math.random() > 0.3).slice(0, 6);
    },
    footer: 'Tool: hydra -l admin -P /usr/share/wordlists/rockyou.txt -t 16 ssh://target (AUTHORIZED LAB ONLY)',
  },
  wireshark: {
    icon: '🦈', name: 'WIRESHARK PACKET CAPTURE', color: 0x0066ff,
    intro: 'Capturing live traffic on eth0 (display filter: tcp.flags.syn==1)...',
    generate: () => {
      const protocols = ['HTTP','HTTPS','DNS','FTP','SSH','Telnet','SMB','LDAP','Kerberos'];
      const ips = () => `10.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}`;
      return [
        `Frame 1: ${ips()} → ${ips()} TCP **SYN** [possible scan]`,
        `Frame 47: ${ips()} → 8.8.8.8 **DNS** Query: evil-c2-domain.ru`,
        `Frame 93: ${ips()} → ${ips()} **HTTP** GET /admin/config.php HTTP/1.1`,
        `Frame 114: ${ips()} → ${ips()} **Telnet** ⚠️ CLEARTEXT CREDENTIALS DETECTED`,
        `Frame 201: ${ips()} → ${ips()} **SMB** NTLM authentication (capture: hash)`,
        `Frame 322: Broadcast **ARP** who-has ${ips()} tell ${ips()} — ARP storm?`,
      ].filter(() => Math.random() > 0.2).slice(0, 5);
    },
    footer: 'Tool: tshark -i eth0 -w capture.pcap  |  Wireshark 4.x GUI analysis',
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Simulate a real cybersecurity scan tool — educational RPG recon')
    .addStringOption(opt =>
      opt.setName('tool')
        .setDescription('Scan tool to simulate')
        .setRequired(true)
        .addChoices(
          { name: '🔭 nmap — port & service scan',        value: 'nmap'      },
          { name: '🕷️ nikto — web vulnerability scan',    value: 'nikto'     },
          { name: '��️ gobuster — directory bruteforce',   value: 'gobuster'  },
          { name: '📡 masscan — network sweep',           value: 'masscan'   },
          { name: '🐲 hydra — credential brute-force',    value: 'hydra'     },
          { name: '🦈 wireshark — packet capture',        value: 'wireshark' },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const key  = interaction.options.getString('tool', true);
    const scan = SCANS[key];

    const results = scan.generate();
    const xpGained = 50 + Math.floor(Math.random() * 150);
    const vulnsFound = results.filter(r => r.includes('✓') || r.includes('⚠️') || r.includes('open')).length;

    const embed = new EmbedBuilder()
      .setColor(scan.color)
      .setTitle(`${scan.icon} ${scan.name}  //  FURIOS-INT RED_TEAM`)
      .setDescription(`\`\`\`\n${scan.intro}\n\`\`\``)
      .addFields(
        { name: '📋 SCAN RESULTS', value: results.map(r => `\`\`${r}\`\``).join('\n').slice(0,1024) },
        { name: '📊 Session Stats', value: [
          `🎯 Findings: **${vulnsFound}**`,
          `⚡ XP Gained: **+${xpGained} XP**`,
          `📡 Tool: \`${scan.footer.split(':')[1]?.trim().slice(0, 60) || key}\``,
        ].join('\n'), inline: false },
      )
      .addFields({
        name: '⚠️ Legal Notice',
        value: '*All scans are simulated for education. Only run real tools against authorized targets.*',
      })
      .addFields({
        name: '🔗 Continue Operations',
        value: `[⚔️ War Games Terminal](${SITE_URL}/wargames.html) • [🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
      })
      .setFooter({ text: `FURIOS-INT RED_TEAM // CyberOS v2026.3-FLLC • ${new Date().toUTCString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
