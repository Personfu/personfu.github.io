/**
 * /ctfguide — Per-category CTF study guide: tools, methodology, tips, real platforms.
 * FLLC CyberWorld operative training material.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const GUIDES = {
  WEB: {
    icon: '🌐',
    color: 0x00e8ff,
    title: 'Web Exploitation',
    tldr: 'Attack web applications through HTTP vulnerabilities: injection, broken auth, misconfigurations, and logic flaws.',
    methodology: [
      '**1. Recon** — Spider the app (`ffuf`, `gobuster`), check robots.txt, view source, map all endpoints',
      '**2. Auth Testing** — Try default creds, cookie manipulation, JWT attacks, session fixation',
      '**3. Injection** — Test every input for SQLi (`sqlmap`), XSS, SSTI, command injection, XXE',
      '**4. Logic Flaws** — Test price manipulation, forced browsing, IDOR, privilege escalation',
      '**5. SSRF/CSRF** — Check URL parameters fetched server-side, test missing CSRF tokens',
    ],
    essentialTools: [
      '`Burp Suite Community` — intercept, replay, fuzz HTTP requests',
      '`sqlmap` — automated SQL injection detection and exploitation',
      '`ffuf` / `gobuster` — directory and parameter brute-forcing',
      '`jwt_tool` — decode, crack, and forge JWT tokens',
      '`nikto` — automated web vulnerability scanner',
      '`tplmap` — server-side template injection (SSTI) scanner',
    ],
    keyVulns: [
      '**SQLi** — `\' OR 1=1--`, `UNION SELECT`, time-based blind',
      '**XSS** — `<script>alert(1)</script>`, DOM-based, stored, reflected',
      '**JWT** — `alg:none`, HS256→RS256 confusion, secret cracking',
      '**SSTI** — `{{7*7}}`, `${7*7}`, `<%= 7*7 %>` — triggers per engine',
      '**SSRF** — `url=http://169.254.169.254/`, redirect bypass',
      '**LFI** — `../../../../etc/passwd`, PHP wrappers `php://filter`',
    ],
    platforms: ['PortSwigger Web Security Academy (free!)', 'HackTheBox Web challenges', 'OWASP WebGoat', 'DVWA (local)'],
    quickRef: '**OWASP Top 10 2021**: A01 Broken Access Control · A02 Crypto Failures · A03 Injection · A04 Insecure Design · A05 Security Misconfiguration',
  },

  CRYPTO: {
    icon: '🔐',
    color: 0x9900ff,
    title: 'Cryptography',
    tldr: 'Break cryptographic implementations through mathematical weaknesses, not brute force. CTF crypto rarely requires actually cracking AES.',
    methodology: [
      '**1. Identify** — What algorithm? What mode? Classic cipher, modern crypto, hash?',
      '**2. Analyze** — Is there a known attack? Small key/exponent? Oracle available? Reused nonce?',
      '**3. Classic** — Caesar, Vigenère, substitution: use frequency analysis',
      '**4. RSA** — Small e? Common factor? Wiener attack? Broadcast? Coppersmith?',
      '**5. Symmetric** — ECB mode? Padding oracle? Known-plaintext? Bit flipping?',
      '**6. Hash** — Length extension? Collision? Preimage? MD5/SHA1 weakness?',
    ],
    essentialTools: [
      '`CyberChef` — Swiss Army knife: encode/decode/analyze all formats',
      '`hashcat` — GPU hash cracking, JWT HS256 cracking',
      '`SageMath` — mathematical crypto attacks (RSA, ECC, lattice)',
      '`RsaCtfTool` — automated RSA attack suite (25+ attack methods)',
      '`cryptography` (Python pip) — implement attacks manually',
      '`gmpy2` — fast arbitrary precision arithmetic for RSA attacks',
    ],
    keyVulns: [
      '**RSA e=3** — cube root attack when m³ < N',
      '**RSA common factor** — `gcd(N1, N2)` if primes shared',
      '**AES-ECB** — deterministic blocks, rearrange to bypass',
      '**AES-CBC** — padding oracle, bit flip in IV/CT',
      '**Reused nonce (CTR/GCM)** — XOR two ciphertexts to recover keystream',
      '**Hash length extension** — MD5/SHA1: hashpump',
    ],
    platforms: ['Cryptohack.org (best free crypto CTF learning)', 'Cryptopals challenges', 'CryptoHack Discord', 'CTFtime crypto'],
    quickRef: '**Never** brute-force AES. CTF crypto challenges have mathematical flaws. Ask: "what\'s the structural weakness?" not "what\'s the key?"',
  },

  FORENSICS: {
    icon: '🔬',
    color: 0x00ff41,
    title: 'Digital Forensics',
    tldr: 'Extract hidden information from files, memory, disk images, and network captures. Think like a detective.',
    methodology: [
      '**1. File Identification** — `file`, `xxd` to check magic bytes; never trust the extension',
      '**2. Metadata** — `exiftool` for images/docs; `strings` for any binary; `binwalk` for embedded files',
      '**3. Network** — Wireshark: filter by protocol, follow TCP/UDP streams, export objects',
      '**4. Memory** — Volatility: pslist → cmdline → filescan → dump artifacts',
      '**5. Steganography** — `zsteg`, `steghide`, `stegsolve`, spectrogram for audio',
      '**6. File Recovery** — `foremost`, `testdisk`, `photorec`, Autopsy for disk images',
    ],
    essentialTools: [
      '`Wireshark` / `tshark` — network capture analysis',
      '`Volatility 3` — memory forensics framework',
      '`binwalk` — embedded file extraction (firmware, stego)',
      '`exiftool` — metadata extraction from any file type',
      '`zsteg` — PNG/BMP LSB steganography detector',
      '`Autopsy` / `Sleuth Kit` — disk image forensics',
      '`foremost` — file carving from raw disk/memory',
    ],
    keyVulns: [
      '**PCAP** — filter HTTP/DNS/FTP, export objects, look for cleartext',
      '**Image stego** — LSB, alpha channel, EXIF comment, appended data',
      '**Memory** — process injection, network artifacts, registry hives in RAM',
      '**Deleted files** — inode recovery with fls/icat (Sleuth Kit)',
      '**Archive trick** — ZIP with comment, RAR hidden stream, 7z password',
      '**PDF/DOCX** — hidden text layers, macros, attached files',
    ],
    platforms: ['picoCTF (beginner friendly)', 'CTF101 Forensics guide', 'Blue Team Labs Online', 'DFIR.training'],
    quickRef: '**First steps always**: `file <thing>`, `strings <thing> | grep -i flag`, `xxd <thing> | head -20`, `binwalk <thing>`. Never overlook metadata.',
  },

  PWN: {
    icon: '💥',
    color: 0xff003c,
    title: 'Binary Exploitation (Pwn)',
    tldr: 'Exploit memory corruption vulnerabilities in compiled binaries to gain code execution or leak secrets.',
    methodology: [
      '**1. Recon** — `checksec --file=binary` to identify mitigations (canary/NX/PIE/RELRO)',
      '**2. Disassemble** — Ghidra or `objdump -d` to understand logic; find dangerous functions',
      '**3. Find Vuln** — `gets()`, `scanf("%s")`, `strcpy()` = overflow; `printf(input)` = format string',
      '**4. Exploit Dev** — Find offset (`cyclic` + crash), control EIP/RIP, build payload',
      '**5. Bypass Mitigs** — Canary → leak it. PIE → leak address. NX → ROP chain. ASLR → ret2plt',
      '**6. Get Shell** — ret2win / ret2system / shellcode / ROP to execve',
    ],
    essentialTools: [
      '`pwntools` — Python exploit framework (must-have)',
      '`GDB + pwndbg` — dynamic analysis, heap inspection, pattern search',
      '`ROPgadget` / `ropper` — find ROP gadgets in binary',
      '`Ghidra` / `IDA Free` — decompilation and disassembly',
      '`checksec` — binary mitigation checker',
      '`one_gadget` — find `execve("/bin/sh")` one-gadget in libc',
    ],
    keyVulns: [
      '**Buffer overflow** — overwrite return address, local vars, heap chunks',
      '**Format string** — `%p` leaks, `%n` writes, ASLR bypass via stack leak',
      '**Use after free** — heap exploitation, tcache poisoning',
      '**ret2libc** — call system("/bin/sh") using libc base leak',
      '**ROP chain** — bypass NX: string gadgets to control registers',
      '**Heap overflow** — overwrite metadata, fake chunks, fastbin dup',
    ],
    platforms: ['pwn.college (structured curriculum)', 'pwnable.kr', 'ROPemporium', 'how2heap', 'pwntools docs'],
    quickRef: '**checksec output**: `Canary: yes` → leak it via format string. `NX: enabled` → ROP, no shellcode. `PIE: enabled` → need base address leak first.',
  },

  REVERSE: {
    icon: '🔄',
    color: 0xff8800,
    title: 'Reverse Engineering',
    tldr: 'Understand software behavior from its compiled form — disassemble, decompile, trace, and patch.',
    methodology: [
      '**1. Static First** — `file`, `strings`, `objdump -d`, check imports/exports',
      '**2. Decompile** — Ghidra `main()` first; look for strcmp, flag validation logic',
      '**3. Dynamic** — `ltrace` (library calls) and `strace` (syscalls) to see runtime behavior',
      '**4. Identify Pattern** — Is it checking char by char? Scrambling your input? XORing?',
      '**5. Patch or Solve** — Patch branch (`JNZ` → `JZ`), or mathematically reverse the validation',
      '**6. Automate** — `angr` symbolic execution for complex constraint solving',
    ],
    essentialTools: [
      '`Ghidra` (free, NSA) — decompiler, disassembler, scripting',
      '`IDA Free` — industry standard disassembler',
      '`x64dbg` / `GDB` — dynamic debugging',
      '`ltrace` / `strace` — trace library/syscall behavior',
      '`angr` — symbolic execution framework for automated solving',
      '`radare2` — command-line RE framework',
      '`patchelf` — patch ELF binaries in-place',
    ],
    keyVulns: [
      '**Hardcoded strings** — `strings binary | grep -E "FLLC|flag|key"` often wins',
      '**strcmp/memcmp** — `ltrace` shows both arguments in plaintext',
      '**XOR transform** — identify repeating XOR key from known-plaintext',
      '**Anti-debug** — ptrace check: patch JNZ or set $eax=0 in GDB',
      '**Obfuscation** — dynamic unpacking: let it unpack then dump memory',
      '**Custom VM** — reverse opcode table, then symbolically execute',
    ],
    platforms: ['crackmes.one', 'pwn.college RE module', 'Flare-On challenges (hard)', 'HackTheBox RE challenges'],
    quickRef: '**Always run ltrace first**: `ltrace ./binary $(python3 -c "print(\'A\'*20)")`— intercepts strcmp arguments and often reveals the expected password.',
  },

  OSINT: {
    icon: '🔎',
    color: 0xffe700,
    title: 'OSINT (Open Source Intelligence)',
    tldr: 'Find the flag using only publicly available information. Think like an investigator, not a hacker.',
    methodology: [
      '**1. Seed** — What do you know? Username, email, image, company, domain, phone?',
      '**2. Pivot** — Each piece of info leads to the next. Username → platforms → posts → real name',
      '**3. Social** — Search all platforms (Sherlock), check old posts (Wayback Machine), Reddit history',
      '**4. Technical** — WHOIS, Shodan, Certificate Transparency logs, GitHub org leaks',
      '**5. Visual** — Reverse image search (Google, Yandex), spectrogram, EXIF location',
      '**6. Document** — Screenshot everything; targets change/delete posts once CTF starts',
    ],
    essentialTools: [
      '`Sherlock` — username search across 300+ platforms',
      '`theHarvester` — email, subdomain, host OSINT from search engines',
      '`Maltego CE` — graph-based OSINT mapping',
      '`Shodan` — search internet-exposed devices and services',
      '`Recon-ng` — modular web reconnaissance framework',
      '`Wayback Machine` — archived web pages (web.archive.org)',
      '`Censys` — certificate and infrastructure search',
    ],
    keyVulns: [
      '**Username pivoting** — same handle across platforms = cross-reference data',
      '**Metadata leaks** — EXIF GPS coordinates, author name in Office docs',
      '**Git leaks** — `git log --all`, `truffleHog`, `.git` exposed on web server',
      '**Google Dorks** — `site:`, `filetype:`, `intext:`, `intitle:` to narrow results',
      '**LinkedIn** — company org charts reveal internal structure',
      '**Certificate transparency** — `crt.sh` reveals all subdomains',
    ],
    platforms: ['TraceLabs OSINT CTF (social good)', 'HackTheBox OSINT challenges', 'gralhix.com/osint-exercises', 'CTF101 OSINT'],
    quickRef: '**Core Google dorks**: `"target_name" filetype:pdf`, `site:linkedin.com "company name"`, `"target" -site:twitter.com`, `cache:target.com`',
  },

  STEGO: {
    icon: '🖼️',
    color: 0xff00ea,
    title: 'Steganography',
    tldr: 'Find messages hidden in plain sight: images, audio, documents, and binary files.',
    methodology: [
      '**1. Quick Check** — `strings file`, `exiftool file`, `binwalk file` — 30% of CTF stego solved here',
      '**2. Image Tools** — `zsteg`, `stegsolve`, `steghide extract`, check alpha channel',
      '**3. Visual** — Stegsolve bit planes (R0, G0, B0), color filter analysis',
      '**4. Audio** — Spectrogram (Audacity/Sonic Visualiser), DTMF tones, Morse in audio',
      '**5. Watermark/LSB** — `zsteg -a` scans all bit combinations; `openstego` for watermarks',
      '**6. Format tricks** — PNG IDAT extra data, JPEG comment field, ZIP inside image',
    ],
    essentialTools: [
      '`zsteg` — PNG/BMP LSB/MSB steganography analysis',
      '`stegsolve` — Java image analysis tool (bit planes, color filters)',
      '`steghide` — embed/extract from JPEG/BMP with passphrase',
      '`Audacity` / `Sonic Visualiser` — audio spectrogram analysis',
      '`binwalk` — detect and extract embedded files',
      '`foremost` — carve files from binary data',
      '`StegOnline` — web-based bit plane analysis tool',
    ],
    keyVulns: [
      '**LSB** — least significant bit in R/G/B/A channels; `zsteg -a` finds it',
      '**EXIF** — hidden text in GPS, comment, author fields',
      '**Appended data** — extra bytes after EOF: `binwalk -e` extracts',
      '**Audio spectrogram** — visual text encoded at specific frequencies',
      '**DTMF tones** — phone dial tones encoding digits/characters',
      '**Whitespace** — SNOW (spaces/tabs encode binary), zero-width chars',
    ],
    platforms: ['picoCTF stego challenges', 'AperiSolve.com (online multi-tool)', 'StegOnline.georgeom.net', 'CTFtime stego'],
    quickRef: '**Stego speedrun**: 1) `exiftool img.png` 2) `strings img.png` 3) `zsteg -a img.png` 4) `steghide extract -sf img.png` 5) `binwalk -e img.png` — covers 80% of CTF stego.',
  },

  MISC: {
    icon: '🎲',
    color: 0x00aaff,
    title: 'Miscellaneous CTF',
    tldr: 'Jail escapes, scripting challenges, math puzzles, and novelty categories that don\'t fit elsewhere.',
    methodology: [
      '**1. Understand the sandbox** — What language? What\'s blocked? What\'s allowed?',
      '**2. Python jail** — Check builtins, try `__class__.__mro__`, find `subprocess` subclass',
      '**3. Bash/rbash** — Check PATH, allowed commands; GTFOBins for editor/interpreter escapes',
      '**4. Scripting puzzles** — Automate with Python: pwntools, requests, beautiful soup',
      '**5. Math challenges** — Number theory, modular arithmetic, polynomial interpolation',
      '**6. Trivia/Misc** — Check FLLC Discord, source code comments, challenge description carefully',
    ],
    essentialTools: [
      '`pwntools` — socket/netcat interaction, packing/unpacking',
      '`GTFOBins.io` — Unix binaries for restricted shell escape',
      '`requests` + `beautifulsoup` — web scraping/automation',
      '`Python 3 REPL` — test jail escape payloads locally',
      '`SageMath` — advanced math: polynomials, lattices, number theory',
      '`angr` — constraint solver (works for misc binary puzzles too)',
    ],
    keyVulns: [
      '**Python builtins** — `__builtins__.__dict__[\'eval\']`, MRO subclass chain',
      '**Bash escape** — `vi/vim :!bash`, `awk BEGIN{system("/bin/sh")}`, `python3 -c "import pty;pty.spawn(\'/bin/sh\')"`, `find . -exec /bin/sh \\;`',
      '**Symbolic execution** — angr solves complex input constraints automatically',
      '**Unicode/encoding** — decode non-obvious encodings: Morse, Braille, DNA, Wingdings',
      '**Git log** — `git log --all --oneline` in a challenge repo often reveals flag in an old commit',
      '**Source comments** — read every <!-- comment --> and JS console carefully',
    ],
    platforms: ['picoCTF Misc', 'CTFtime.org', 'Hack The Box', 'ångstromCTF', 'DamCTF'],
    quickRef: '**GTFOBins.io** is the Misc bible. If you have access to any binary (`find`, `awk`, `python`, `vim`, `less`, `man`, `more`, `nano`) there is likely an escape.',
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ctfguide')
    .setDescription('FLLC CTF study guide — methodology, tools, and techniques per category')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('CTF category to study')
        .setRequired(true)
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
    ),

  async execute(interaction, { SITE_URL }) {
    const catKey = interaction.options.getString('category', true);
    const g      = GUIDES[catKey];

    const embed = new EmbedBuilder()
      .setColor(g.color)
      .setTitle(`${g.icon} CTF STUDY GUIDE — ${g.title.toUpperCase()}`)
      .setDescription(
        '```\n' +
        '╔══════════════════════════════════════════════════╗\n' +
        '║  FURIOS-INT OPERATIVE TRAINING // CTF ACADEMY    ║\n' +
        `║  Module: ${g.title.padEnd(38)}║\n` +
        '╚══════════════════════════════════════════════════╝\n' +
        '```\n' +
        `> ${g.tldr}`
      )
      .addFields(
        {
          name: '📋 METHODOLOGY (in order)',
          value: g.methodology.join('\n'),
          inline: false,
        },
        {
          name: '🛠️ ESSENTIAL TOOLS',
          value: g.essentialTools.join('\n'),
          inline: false,
        },
        {
          name: '🎯 KEY VULNERABILITY PATTERNS',
          value: g.keyVulns.join('\n'),
          inline: false,
        },
        {
          name: '⚡ QUICK REFERENCE',
          value: `> ${g.quickRef}`,
          inline: false,
        },
        {
          name: '🌐 PRACTICE PLATFORMS',
          value: g.platforms.map(p => `• ${p}`).join('\n'),
          inline: false,
        },
        {
          name: '🎮 Try a Challenge',
          value: `Run \`/ctf category:${catKey}\` to get a randomized ${g.icon} ${catKey} challenge with XP reward`,
          inline: false,
        },
        {
          name: '🔗 FLLC Resources',
          value: [
            `[🏁 CTF Hub](${SITE_URL}/ctf.html)`,
            `[⚔️ War Games](${SITE_URL}/wargames.html)`,
            `[📡 Intel Hub](${SITE_URL}/intel.html)`,
          ].join(' • '),
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT CTF Academy // ${g.title} • Use /ctf to practice • CyberOS v2026.3-FLLC` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🔑 CyberChef').setStyle(ButtonStyle.Link).setURL('https://gchq.github.io/CyberChef/'),
      new ButtonBuilder().setLabel('🏁 FLLC CTF Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/ctf.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
