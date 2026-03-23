/**
 * /ctf — Full CTF challenge browser: 8 categories, randomized challenges with
 * real techniques, tools, and flag submission flow. FLLC cyberpunk themed.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

// ── Challenge database ────────────────────────────────────────────────────────
const CHALLENGES = {
  WEB: {
    icon: '🌐', color: 0x00e8ff,
    label: 'Web Exploitation',
    desc: 'HTTP, SQLi, XSS, LFI, SSRF, JWT, SSTI — attack and own web applications',
    challenges: [
      {
        name: 'COOKIE_MONSTER',
        difficulty: 'ROOKIE',
        xp: 100,
        scenario: 'A Flask app sets `role=guest` in a plain cookie. Admins see the flag. No signing, no encryption.',
        objective: 'Modify the cookie to `role=admin` and reload the page.',
        tools: ['Browser DevTools', 'Burp Suite', 'curl'],
        hint: 'Base64-decode the cookie, change the value, re-encode, and set it with DevTools → Application → Cookies.',
        technique: 'Insecure Direct Object Reference + cookie manipulation',
        flag: 'FLLC{cook1e_m0nster_0wned}',
        resources: ['PortSwigger Web Security Academy — Authentication', 'OWASP Testing Guide — Cookie Security'],
      },
      {
        name: 'SQLI_INITIATION',
        difficulty: 'ROOKIE',
        xp: 120,
        scenario: 'Login form with `SELECT * FROM users WHERE name=\'$input\'`. No parameterization.',
        objective: 'Bypass login using classic SQL injection to log in as admin without a password.',
        tools: ['Burp Suite', 'sqlmap', 'curl', 'Browser'],
        hint: 'Classic payload: `admin\' --` — comments out the password check entirely.',
        technique: 'SQL Injection — Authentication Bypass (OWASP A03)',
        flag: 'FLLC{sql_bypass_n0_p4ss_needed}',
        resources: ['PortSwigger SQLi Lab 1', 'OWASP SQLi Cheatsheet', 'HackTheBox Starting Point'],
      },
      {
        name: 'JWT_CRACKER',
        difficulty: 'OPERATIVE',
        xp: 250,
        scenario: 'API returns a JWT with `{"alg":"HS256","typ":"JWT"}`. The secret is a common word.',
        objective: 'Crack the JWT secret, forge a new token with `"role":"admin"`, access /admin endpoint.',
        tools: ['hashcat', 'jwt_tool', 'CyberChef', 'Burp Suite'],
        hint: 'Run `hashcat -a 0 -m 16500 <jwt> rockyou.txt` to crack HS256. Then use jwt_tool to forge.',
        technique: 'JWT Secret Cracking + Token Forgery',
        flag: 'FLLC{jwt_f0rg3d_4nd_rul3d}',
        resources: ['PortSwigger JWT Labs', 'jwt_tool GitHub', 'HackTricks JWT'],
      },
      {
        name: 'SSTI_SHADOW',
        difficulty: 'ELITE',
        xp: 450,
        scenario: 'Jinja2 template renders user input directly: `render_template_string(f"Hello {name}")`. RCE possible.',
        objective: 'Exploit SSTI to read /etc/passwd, then get the flag from /flag.txt.',
        tools: ['curl', 'Burp Suite', 'tplmap'],
        hint: 'Jinja2 SSTI RCE payload: `{{config.__class__.__init__.__globals__[\'os\'].popen(\'cat /flag.txt\').read()}}`',
        technique: 'Server-Side Template Injection → Remote Code Execution',
        flag: 'FLLC{ssti_2_rce_p0wn3d}',
        resources: ['HackTricks SSTI', 'PortSwigger SSTI Labs', 'tplmap GitHub'],
      },
      {
        name: 'SSRF_INTERNAL',
        difficulty: 'ELITE',
        xp: 400,
        scenario: 'Web app fetches URLs server-side. AWS metadata service accessible at 169.254.169.254.',
        objective: 'Use SSRF to steal IAM credentials from AWS metadata at `/latest/meta-data/iam/security-credentials/`.',
        tools: ['Burp Suite', 'curl', 'Collaborator'],
        hint: 'Try `url=http://169.254.169.254/latest/meta-data/` — redirect bypasses may be needed for filtered schemes.',
        technique: 'SSRF → Cloud Credential Theft (OWASP A10)',
        flag: 'FLLC{ssrf_stole_the_cloud_keys}',
        resources: ['PortSwigger SSRF Labs', 'HackTricks SSRF', 'OWASP SSRF Guide'],
      },
    ],
  },
  CRYPTO: {
    icon: '🔐', color: 0x9900ff,
    label: 'Cryptography',
    desc: 'Break ciphers, crack hashes, exploit weak crypto implementations',
    challenges: [
      {
        name: 'XOR_BASICS',
        difficulty: 'ROOKIE',
        xp: 80,
        scenario: 'Ciphertext: `1b 07 01 1d 1d 55 00 07`. Key is single byte. Flag starts with `FLLC{`.',
        objective: 'XOR each byte with the key to recover the plaintext flag.',
        tools: ['Python', 'CyberChef', 'xortool'],
        hint: 'XOR the first byte of ciphertext (0x1b) with first known char of flag (0x46 = "F"). Key = 0x1b ^ 0x46 = 0x5d. Apply to all bytes.',
        technique: 'XOR cipher brute-force using known-plaintext attack',
        flag: 'FLLC{xor_k3y_0x5d}',
        resources: ['CyberChef XOR module', 'xortool GitHub', 'Cryptohack.org XOR challenges'],
      },
      {
        name: 'RSA_SMALL_E',
        difficulty: 'OPERATIVE',
        xp: 300,
        scenario: 'RSA public key with e=3, small message. Ciphertext C = m^3 mod N. No padding.',
        objective: 'If m^3 < N, compute the cube root of C directly to recover the message.',
        tools: ['Python (gmpy2)', 'SageMath', 'RsaCtfTool'],
        hint: 'When m³ < N, cube root of C gives m directly: `import gmpy2; m, _ = gmpy2.iroot(C, 3)`. No modular arithmetic needed.',
        technique: 'RSA small exponent attack — cube root (e=3, no padding)',
        flag: 'FLLC{rsa_sm4ll_e_3_cube_root}',
        resources: ['Cryptohack RSA challenges', 'RsaCtfTool GitHub', 'Dan Boneh\'s Crypto Course'],
      },
      {
        name: 'CBC_PADDING_ORACLE',
        difficulty: 'ELITE',
        xp: 500,
        scenario: 'AES-CBC decrypt endpoint returns different errors for valid vs invalid PKCS7 padding.',
        objective: 'Use the padding oracle to decrypt the ciphertext block-by-block without the key.',
        tools: ['padbuster', 'Python (pwntools)', 'Burp Suite'],
        hint: 'Flip bytes in IV to get P2 XOR D(C2). P2 = D(C2) XOR C1. Byte-by-byte: set known suffix to 0x02, 0x03… Get oracle yes/no per byte.',
        technique: 'Padding Oracle Attack on AES-CBC (POODLE variant)',
        flag: 'FLLC{p4dding_0r4cl3_aes_cbc}',
        resources: ['PortSwigger Padding Oracle Labs', 'padbuster GitHub', 'Cryptopals Set 3 Challenge 17'],
      },
      {
        name: 'HASH_LENGTH_EXT',
        difficulty: 'ELITE',
        xp: 420,
        scenario: 'HMAC uses MD5(secret + message). You can append data and forge a valid MAC.',
        objective: 'Use hash length extension to append `&admin=true` to a signed message.',
        tools: ['hashpump', 'hash_extender', 'Python (hlextend)'],
        hint: 'Run: `hashpump -s <original_sig> -d <original_data> -a "&admin=true" -k <key_len>`. Submits forged hash.',
        technique: 'Hash Length Extension Attack on MD5/SHA1 (Merkle–Damgård construction)',
        flag: 'FLLC{h4sh_l3ngth_ext3ns10n_f0rg3d}',
        resources: ['hashpump GitHub', 'SkullSecurity Hash Extension', 'Cryptopals Set 4 Challenge 29'],
      },
    ],
  },
  FORENSICS: {
    icon: '🔬', color: 0x00ff41,
    label: 'Digital Forensics',
    desc: 'Analyze memory dumps, disk images, network captures, and file artifacts',
    challenges: [
      {
        name: 'PCAP_RECON',
        difficulty: 'ROOKIE',
        xp: 90,
        scenario: 'A `.pcap` file captures C2 traffic. The flag was transmitted in cleartext HTTP.',
        objective: 'Open in Wireshark, filter HTTP, find the GET request containing the flag.',
        tools: ['Wireshark', 'tshark', 'NetworkMiner'],
        hint: 'Wireshark filter: `http contains "FLLC{"`. Or: `tshark -r file.pcap -Y \'http\' -T fields -e http.file_data | grep FLLC`',
        technique: 'Network forensics — packet capture analysis',
        flag: 'FLLC{pcap_fl4g_in_pl41ntext_http}',
        resources: ['Wireshark official docs', 'CTF101 Forensics Guide', 'picoCTF forensics challenges'],
      },
      {
        name: 'MEMORY_PROCESS',
        difficulty: 'OPERATIVE',
        xp: 280,
        scenario: 'Windows memory dump. A suspicious process injected shellcode. Find the injected string.',
        objective: 'Use Volatility to list processes, dump memory of the suspicious process, grep for flag.',
        tools: ['Volatility 3', 'strings', 'grep', 'vol.py'],
        hint: 'Steps: `vol.py -f mem.dmp windows.pslist` → find PID → `vol.py -f mem.dmp windows.memmap --pid <PID> --dump` → `strings <dump> | grep FLLC`',
        technique: 'Memory forensics — process injection analysis with Volatility',
        flag: 'FLLC{v0lat1l1ty_f0und_the_inject10n}',
        resources: ['Volatility 3 docs', 'CTF101 Forensics', 'MemLabs GitHub challenges'],
      },
      {
        name: 'STEGO_LSB',
        difficulty: 'ROOKIE',
        xp: 110,
        scenario: 'A PNG image hides a message in the Least Significant Bits of each pixel.',
        objective: 'Extract the LSB-encoded hidden message using steghide or zsteg.',
        tools: ['zsteg', 'stegsolve', 'steghide', 'Python (Pillow)'],
        hint: '`zsteg -a image.png` — scans all LSB channels automatically. Or manual: read bit 0 of each R/G/B channel in order.',
        technique: 'Steganography — LSB (Least Significant Bit) extraction',
        flag: 'FLLC{lsb_st3g0_pix3l_hunt}',
        resources: ['zsteg GitHub', 'StegOnline tool', 'CTFtime stego resources'],
      },
      {
        name: 'DISK_AUTOPSY',
        difficulty: 'ELITE',
        xp: 480,
        scenario: 'A disk image (`.dd`) from a compromised Linux box. Deleted files contain evidence.',
        objective: 'Mount the image, recover deleted files with Autopsy/Sleuth Kit, find the flag in a deleted .txt file.',
        tools: ['Autopsy', 'Sleuth Kit (fls, icat)', 'testdisk', 'foremost'],
        hint: '`fls -d disk.dd` lists deleted files with inode numbers. `icat disk.dd <inode>` extracts the file content.',
        technique: 'Disk forensics — deleted file recovery using inode analysis',
        flag: 'FLLC{d3l3t3d_but_n0t_g0ne_disk_carve}',
        resources: ['Autopsy docs', 'Sleuth Kit tutorial', 'CTF101 Forensics Guide'],
      },
    ],
  },
  PWN: {
    icon: '💥', color: 0xff003c,
    label: 'Binary Exploitation (Pwn)',
    desc: 'Stack overflows, heap exploits, ROP chains, format strings — own the binary',
    challenges: [
      {
        name: 'STACK_SMASH_101',
        difficulty: 'ROOKIE',
        xp: 150,
        scenario: 'A 32-bit ELF binary with `gets()`. No stack canary, no PIE, no ASLR. `win()` function at 0x0804865a.',
        objective: 'Overwrite EIP with address of `win()` to print the flag.',
        tools: ['pwntools', 'GDB + peda/pwndbg', 'checksec', 'python'],
        hint: 'Find offset with `cyclic 100`, run, find crash offset with `cyclic -l <crash_value>`. Then: `payload = b"A"*offset + p32(0x0804865a)`',
        technique: 'Stack buffer overflow — return address overwrite',
        flag: 'FLLC{st4ck_sm4sh_eip_0v3rwr1tte}',
        resources: ['pwntools tutorial', 'pwn.college', 'LiveOverflow binary exploitation series'],
      },
      {
        name: 'FORMAT_STRING',
        difficulty: 'OPERATIVE',
        xp: 260,
        scenario: 'Binary calls `printf(user_input)` directly — classic format string vulnerability.',
        objective: 'Leak stack memory to find the flag stored on the stack, using `%p` or `%s` specifiers.',
        tools: ['pwntools', 'GDB', 'pwndbg'],
        hint: 'Send `%p.%p.%p.%p` to leak stack values. Use `%7$s` to print string at 7th stack parameter. Iterate until you see flag bytes.',
        technique: 'Format string vulnerability — stack read via `%p` / `%n` / `%s`',
        flag: 'FLLC{f0rm4t_str_l34k3d_the_fl4g}',
        resources: ['pwn.college format strings', 'how2heap', 'CTF101 Pwn Guide'],
      },
      {
        name: 'ROP_CHAIN',
        difficulty: 'ELITE',
        xp: 600,
        scenario: '64-bit ELF with stack canary + NX + no PIE. Need to call `system("/bin/sh")` via ROP gadgets.',
        objective: 'Build a ROP chain: `pop rdi; ret` → `/bin/sh` address → `system` PLT. Get a shell.',
        tools: ['ROPgadget', 'ropper', 'pwntools', 'GDB + pwndbg'],
        hint: '`ROPgadget --binary vuln --rop` finds gadgets. `pwntools.ROP(elf)` auto-generates chain. Key: `rop.call(\'system\', [next(elf.search(b\'/bin/sh\'))])`',
        technique: 'Return-Oriented Programming — NX bypass via ROP chain to system()',
        flag: 'FLLC{r0p_ch41n_nx_byp4ss_sh3ll}',
        resources: ['ROPemporium challenges', 'pwn.college ROP module', 'pwntools ROP docs'],
      },
    ],
  },
  REVERSE: {
    icon: '🔄', color: 0xff8800,
    label: 'Reverse Engineering',
    desc: 'Disassemble, decompile, patch — understand how software works from the binary',
    challenges: [
      {
        name: 'CRACKME_BASIC',
        difficulty: 'ROOKIE',
        xp: 100,
        scenario: 'A binary prompts for a password. Strings are stored unobfuscated in the binary.',
        objective: 'Run `strings` on the binary to find the hardcoded password. Submit it to get the flag.',
        tools: ['strings', 'Ghidra', 'objdump', 'ltrace'],
        hint: '`strings binary | grep -E "^[A-Za-z0-9_]{8,20}$"` — look for the password. Or `ltrace ./binary` intercepts strcmp calls.',
        technique: 'Static analysis — string extraction from ELF binary',
        flag: 'FLLC{str1ngs_r3v3al_all_s3cr3ts}',
        resources: ['Ghidra quickstart guide', 'pwn.college reverse engineering', 'crackmes.one'],
      },
      {
        name: 'ANTI_DEBUG_BYPASS',
        difficulty: 'OPERATIVE',
        xp: 320,
        scenario: 'Binary checks `ptrace(PTRACE_TRACEME)` return value and exits if debugger detected.',
        objective: 'Patch the anti-debug check (NOP the ptrace call or patch the branch), then extract the flag.',
        tools: ['GDB', 'Ghidra', 'radare2', 'patchelf', 'xxd'],
        hint: 'In GDB: set breakpoint before ptrace call, `set $eax=0` to fake "not being traced". In Ghidra: NOP the `JNZ` after the ptrace check.',
        technique: 'Anti-debug bypass — ptrace check patching',
        flag: 'FLLC{4nt1_d3bug_n0pp3d_0ut}',
        resources: ['Ghidra patching tutorial', 'The Art of Anti-Debugging', 'r2 patching guide'],
      },
      {
        name: 'VM_BYTECODE',
        difficulty: 'ELITE',
        xp: 550,
        scenario: 'Binary implements a custom VM with a 10-opcode instruction set. Bytecode validates the flag.',
        objective: 'Reverse the VM instruction set from Ghidra, understand the validation logic, derive the correct flag.',
        tools: ['Ghidra', 'x64dbg', 'Python', 'angr'],
        hint: 'angr symbolic execution: `proj = angr.Project(\'vm_binary\'); sm = proj.factory.simgr(); sm.explore(find=success_addr); sm.found[0].posix.dumps(0)` — auto-solves constraints.',
        technique: 'Custom VM reverse engineering + symbolic execution with angr',
        flag: 'FLLC{vm_r3v3rs3d_symb0lic_s0lv3d}',
        resources: ['angr docs', 'angr CTF challenges', 'Ghidra script Python API'],
      },
    ],
  },
  OSINT: {
    icon: '🔎', color: 0xffe700,
    label: 'OSINT',
    desc: 'Open-source intelligence — find the flag using only public information',
    challenges: [
      {
        name: 'SOCIAL_TRACE',
        difficulty: 'ROOKIE',
        xp: 70,
        scenario: 'A fictional operative "CyberGhost_88" posted a flag on a public platform. Find it.',
        objective: 'Use Google dorking and Sherlock to locate all accounts for "CyberGhost_88", find the flag.',
        tools: ['Sherlock', 'Google Dorks', 'Wayback Machine', 'OSINT Framework'],
        hint: 'Google dork: `"CyberGhost_88" site:pastebin.com OR site:github.com OR site:reddit.com`. Also try `sherlock CyberGhost_88`.',
        technique: 'OSINT — username pivoting across platforms',
        flag: 'FLLC{sh3rl0ck_f0und_the_gh0st}',
        resources: ['Sherlock GitHub', 'OSINT Framework', 'IntelTechniques.com'],
      },
      {
        name: 'IMAGE_GEOLOCATION',
        difficulty: 'OPERATIVE',
        xp: 200,
        scenario: 'An operative uploaded a photo. EXIF data was stripped, but background features reveal location.',
        objective: 'Identify the exact city and landmark from the image using reverse image search and map analysis.',
        tools: ['Google Reverse Image', 'GeoGuessr', 'Yandex Images', 'Google Maps'],
        hint: 'Check building architecture style, street signs, vegetation type, power pole design, sun angle for hemisphere. Use Google Street View to confirm.',
        technique: 'OSINT — visual geolocation via environmental feature analysis',
        flag: 'FLLC{g30l0c4t10n_confirmed_CITY}',
        resources: ['GeoGuessr Pro tips', 'Bellingcat geolocation guide', 'SunCalc.org'],
      },
    ],
  },
  STEGO: {
    icon: '🖼️', color: 0xff00ea,
    label: 'Steganography',
    desc: 'Hidden messages in images, audio, documents — find the invisible',
    challenges: [
      {
        name: 'AUDIO_SPECTROGRAM',
        difficulty: 'ROOKIE',
        xp: 90,
        scenario: 'An MP3 file sounds like white noise. Flag is visible in the spectrogram.',
        objective: 'Open in Sonic Visualiser or Audacity, switch to spectrogram view, read the flag.',
        tools: ['Audacity', 'Sonic Visualiser', 'Spectroid (mobile)'],
        hint: 'Audacity: View → Spectrogram. Set frequency scale to Linear, 0-8000 Hz. The text will be drawn in the high-frequency bands.',
        technique: 'Audio steganography — spectrogram visual encoding',
        flag: 'FLLC{sp3ctr0gr4m_h1dd3n_s0und}',
        resources: ['Audacity spectrogram tutorial', 'CTF audio steganography guide', 'Sonic Visualiser'],
      },
      {
        name: 'PDF_HIDDEN_LAYER',
        difficulty: 'OPERATIVE',
        xp: 220,
        scenario: 'A PDF appears blank on the surface. Multiple text layers hidden with white text on white.',
        objective: 'Extract all text layers from the PDF to reveal the hidden flag.',
        tools: ['pdftotext', 'pdf-parser.py', 'Strings', 'Adobe Acrobat'],
        hint: '`pdftotext file.pdf -` dumps all text including hidden. `strings file.pdf | grep FLLC`. Or: pdf-parser.py -f to show filtered content.',
        technique: 'PDF steganography — hidden layer / white-on-white text extraction',
        flag: 'FLLC{pdf_l4y3r_h1dd3n_t3xt}',
        resources: ['pdf-parser.py Didier Stevens', 'PDFStreamDumper', 'pdftotext man page'],
      },
    ],
  },
  MISC: {
    icon: '🎲', color: 0x00aaff,
    label: 'Miscellaneous',
    desc: 'Jail escapes, scripting puzzles, trivia, and unexpected categories',
    challenges: [
      {
        name: 'PYJAIL_ESCAPE',
        difficulty: 'OPERATIVE',
        xp: 250,
        scenario: 'A Python sandbox allows eval() but blocks `import`, `os`, `open`, and underscore characters.',
        objective: 'Escape the Python jail using built-in tricks to read /flag.txt.',
        tools: ['Python 3 (local test)', 'pwntools netcat'],
        hint: 'Use `__builtins__` via `[].__class__.__base__.__subclasses__()` to find `<_io.FileIO>`. Or try: `().__class__.__bases__[0].__subclasses__()[104]("/flag.txt").read()`.',
        technique: 'Python jail escape — subclass chain to access builtins',
        flag: 'FLLC{py_j41l_3sc4p3d_v14_subclass}',
        resources: ['HackTricks Python sandbox bypass', 'Python jail escapes gist', 'pwn.college jail series'],
      },
      {
        name: 'BASH_RESTRICTED',
        difficulty: 'OPERATIVE',
        xp: 230,
        scenario: 'SSH into a restricted bash (rbash). Standard commands blocked, PATH locked. Flag in /home/user/flag.txt.',
        objective: 'Escape restricted bash and read the flag.',
        tools: ['SSH', 'vim', 'awk', 'python3'],
        hint: 'If vim is available: `:!bash` or `:set shell=/bin/bash` then `:shell`. If awk: `awk \'BEGIN {system("/bin/bash")}\' `. Or via python3: `import pty; pty.spawn("/bin/bash")`.',
        technique: 'Restricted shell escape via editor or interpreter',
        flag: 'FLLC{rbash_3sc4p3d_v1m_0r_4wk}',
        resources: ['GTFOBins.io', 'HackTricks Restricted Shell Bypass', 'LOLBAS Project'],
      },
    ],
  },
};

const DIFFICULTIES = {
  'ROOKIE':    { icon: '🟢', color: 0x00ff41 },
  'OPERATIVE': { icon: '🟡', color: 0xffe700 },
  'ELITE':     { icon: '🔴', color: 0xff003c },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ctf')
    .setDescription('FLLC CTF challenge browser — 8 categories, 30+ challenges with real techniques and tools')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Challenge category (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '🌐 Web — SQLi, XSS, JWT, SSRF, SSTI',          value: 'WEB'      },
          { name: '🔐 Crypto — XOR, RSA, CBC, Hash attacks',       value: 'CRYPTO'   },
          { name: '🔬 Forensics — PCAP, Memory, Stego, Disk',      value: 'FORENSICS'},
          { name: '💥 Pwn — Buffer overflow, ROP, Format string',  value: 'PWN'      },
          { name: '🔄 Reverse — Disassembly, Anti-debug, VM',      value: 'REVERSE'  },
          { name: '🔎 OSINT — Social trace, Geolocation, Dorks',   value: 'OSINT'    },
          { name: '🖼️ Stego — LSB, Audio, PDF hidden layers',      value: 'STEGO'    },
          { name: '🎲 Misc — Pyjail, rbash, Script puzzles',       value: 'MISC'     },
        )
    )
    .addStringOption(opt =>
      opt.setName('difficulty')
        .setDescription('Challenge difficulty filter')
        .setRequired(false)
        .addChoices(
          { name: '🟢 ROOKIE — learning the basics',       value: 'ROOKIE'    },
          { name: '🟡 OPERATIVE — intermediate technique', value: 'OPERATIVE' },
          { name: '🔴 ELITE — advanced exploitation',      value: 'ELITE'     },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const catKey   = interaction.options.getString('category');
    const diffKey  = interaction.options.getString('difficulty');

    // Pick category
    const catKeys  = Object.keys(CHALLENGES);
    const selectedKey = catKey || catKeys[Math.floor(Math.random() * catKeys.length)];
    const cat      = CHALLENGES[selectedKey];

    // Filter by difficulty if set
    let pool = cat.challenges;
    if (diffKey) pool = pool.filter(c => c.difficulty === diffKey);
    if (!pool.length) pool = cat.challenges;

    // Pick random challenge from pool
    const ch = pool[Math.floor(Math.random() * pool.length)];
    const diff = DIFFICULTIES[ch.difficulty];

    // Category overview field
    const catOverview = catKeys.map(k => {
      const c = CHALLENGES[k];
      const total = c.challenges.length;
      const totalXp = c.challenges.reduce((a, b) => a + b.xp, 0);
      return `${c.icon} **${k}** — ${total} challenges • max ${totalXp} XP`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(cat.color)
      .setTitle(`${cat.icon} CTF CHALLENGE — ${selectedKey} // ${diff.icon} ${ch.difficulty}`)
      .setDescription(
        '```\n' +
        '╔═══════════════════════════════════════════════╗\n' +
        '║  FURIOS-INT CTF ARENA  //  CyberOS v2026.3    ║\n' +
        `║  Category: ${selectedKey.padEnd(33)}║\n` +
        `║  Challenge: ${ch.name.padEnd(32)}║\n` +
        `║  Reward: ${('+' + ch.xp + ' XP').padEnd(35)}║\n` +
        '╚═══════════════════════════════════════════════╝\n' +
        '```'
      )
      .addFields(
        { name: '📋 SCENARIO', value: ch.scenario, inline: false },
        { name: '🎯 OBJECTIVE', value: ch.objective, inline: false },
        { name: '🛠️ TOOLS', value: ch.tools.map(t => `\`${t}\``).join('  '), inline: false },
        { name: '💡 HINT', value: `||${ch.hint}||`, inline: false },
        { name: '⚙️ TECHNIQUE', value: `\`${ch.technique}\``, inline: false },
        { name: '📚 RESOURCES', value: ch.resources.map(r => `• ${r}`).join('\n'), inline: false },
        {
          name: '📤 SUBMIT FLAG',
          value: `Once solved, submit: \`/ctf\` challenge name \`${ch.name}\`\nFlag format: \`FLLC{...}\` — earns **+${ch.xp} XP**`,
          inline: false,
        },
        {
          name: '🗂️ ALL CTF CATEGORIES',
          value: catOverview,
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT CTF Arena • ${catKeys.length} categories • Use /ctfguide for detailed study guides` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🔑 CyberChef').setStyle(ButtonStyle.Link).setURL('https://gchq.github.io/CyberChef/'),
      new ButtonBuilder().setLabel('⚔️ FLLC CTF Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/ctf.html`),
      new ButtonBuilder().setLabel('📡 War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
