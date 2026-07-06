/* CyberWorld ACADEMY — the educational campaign engine.
 *
 * A full curriculum of interactive, safe, in-browser cybersecurity challenges the
 * player actually solves (crypto, web exploitation, recon, forensics, defense).
 * Each challenge teaches a real concept, checks a real solve, then explains why it
 * matters. Progress writes into the shared operative save (cw.operative.v1) so the
 * cloud layer (cw-net.js) syncs XP/level, logs completions to the global feed, and
 * unlocks achievements — the Academy is where XP is actually earned.
 *
 * Framework-free, defensive, Windows 98 / cyberpunk. Press A to open. */
(function () {
  'use strict';
  if (window.__cwAcademyLoaded) return;
  window.__cwAcademyLoaded = true;

  // ------------------------------------------------------------ shared state
  var OP_KEY = 'cw.operative.v1';
  function loadJSON(k, f) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function xpForLevel(L) { return Math.floor(100 * Math.pow(1.35, L - 1)); }

  function getOp() {
    var g = loadJSON(OP_KEY, null) || {};
    return {
      callsign: g.callsign || ('OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000)),
      level: Math.max(1, parseInt(g.level, 10) || 1),
      xp: Math.max(0, parseInt(g.xp, 10) || 0),
      credits: Math.max(0, parseInt(g.credits, 10) || 0),
      completed: g.completed || {}
    };
  }
  // Awards XP/credits and marks a challenge done, mirroring gameplay.js leveling so
  // cw-net's watcher syncs the change to the grid within a few seconds.
  function award(challengeId, xp, credits) {
    var g = loadJSON(OP_KEY, null) || {};
    g.callsign = g.callsign || ('OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000));
    g.level = Math.max(1, parseInt(g.level, 10) || 1);
    g.xp = Math.max(0, parseInt(g.xp, 10) || 0);
    g.credits = Math.max(0, parseInt(g.credits, 10) || 0);
    g.completed = g.completed || {};
    if (!g.completed[challengeId]) {
      g.xp += xp; g.credits += credits;
      while (g.xp >= xpForLevel(g.level)) { g.xp -= xpForLevel(g.level); g.level++; }
      g.completed[challengeId] = Date.now();
      saveJSON(OP_KEY, g);
    }
    // Nudge the in-memory gameplay engine if present so its HUD updates immediately.
    try { if (window.__cwGameplay && window.__cwGameplay.gainXp) { /* no-op: state is localStorage-backed */ } } catch (e) {}
    return g;
  }
  function isDone(id) { return !!(getOp().completed || {})[id]; }

  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function b64decode(s) { try { return decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))); } catch (e) { return atob(s.replace(/[^A-Za-z0-9+/=]/g, '')); } }
  function hexToStr(h) { h = h.replace(/[^0-9a-f]/gi, ''); var o = ''; for (var i = 0; i < h.length; i += 2) o += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return o; }
  function rot(s, n) { return s.replace(/[a-z]/gi, function (c) { var base = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - base + n) % 26 + base); }); }

  // ------------------------------------------------------------ curriculum
  var DOMAINS = [
    { id: 'crypto',    icon: '🔐', name: 'CRYPTOGRAPHY',     desc: 'Encoding, classical ciphers, hashing, and why encoding is not encryption.' },
    { id: 'web',       icon: '🕸️', name: 'WEB EXPLOITATION', desc: 'Injection, broken auth, access control, and the OWASP mindset.' },
    { id: 'recon',     icon: '📡', name: 'RECON & OSINT',     desc: 'Enumeration, service exposure, and information that leaks.' },
    { id: 'forensics', icon: '🔬', name: 'FORENSICS',         desc: 'Log analysis, packet capture, steganography, timelines.' },
    { id: 'defense',   icon: '🛡️', name: 'BLUE TEAM / DEFENSE', desc: 'Phishing, incident response, hardening, and controls.' }
  ];

  // Each challenge: id, domain, tier, title, scenario, learn, type, data, explain, xp, credits.
  var CH = [
    // ---------------- CRYPTO ----------------
    { id: 'cr-b64', domain: 'crypto', tier: 1, title: 'Signal Drift // Base64',
      scenario: 'You intercepted a beacon payload. It is not scrambled — just wrapped in a transport encoding. Decode it and read the flag.',
      learn: 'Base64 turns arbitrary bytes into 64 printable characters (A–Z a–z 0–9 + /). It is an ENCODING, not encryption: anyone can reverse it with no key. Padding "=" marks the end. Seeing "==" and only that alphabet is a strong tell.',
      type: 'decode', decoder: 'b64',
      data: { cipher: 'Q1d7YmFzZTY0X2lzX2VuY29kaW5nX25vdF9lbmNyeXB0aW9ufQ==' },
      answer: 'cw{base64_is_encoding_not_encryption}',
      explain: 'If a "secret" survives a round trip through a public transform with no key, it is not protected. Never store credentials Base64-encoded and call it secure.',
      xp: 60, credits: 40 },

    { id: 'cr-hex', domain: 'crypto', tier: 2, title: 'Raw Bytes // Hex',
      scenario: 'A memory dump fragment is shown as hexadecimal. Convert it back to ASCII to recover the marker.',
      learn: 'Hex represents each byte as two characters 00–ff. 0x41 = 65 = "A". Two hex digits = one byte. Forensics tools show data as hex constantly; reading it fluently is a core skill.',
      type: 'decode', decoder: 'hex',
      data: { cipher: '43577b6865785f72657665616c735f61736369697d' },
      answer: 'cw{hex_reveals_ascii}',
      explain: 'Malware strings, network payloads, and file signatures ("magic bytes" like 4D5A for PE, 89504E47 for PNG) are all read as hex. It is the lingua franca of low-level analysis.',
      xp: 70, credits: 45, req: { done: 'cr-b64' } },

    { id: 'cr-rot', domain: 'crypto', tier: 3, title: 'Caesar’s Ghost // ROT',
      scenario: 'An old-school operator left a note shifted by a fixed amount. Dial the wheel until it reads clean.',
      learn: 'A Caesar/ROT cipher shifts each letter by a fixed number. ROT13 shifts by 13 (its own inverse). There are only 25 shifts, so it is broken instantly by brute force. It hides nothing from an attacker.',
      type: 'decode', decoder: 'rot', rotUI: true,
      data: { cipher: 'PJ{pnrfne_fuvsg_guvegrra}' },
      answer: 'cw{caesar_shift_thirteen}',
      explain: 'Small keyspaces die to brute force. Modern crypto uses keyspaces so large (2^128+) that trying every key is physically impossible — that, not obscurity, is what makes it strong.',
      xp: 80, credits: 55, req: { done: 'cr-hex' } },

    { id: 'cr-xor', domain: 'crypto', tier: 4, title: 'Single-Byte XOR',
      scenario: 'This ciphertext was XORed against one repeating byte. Slide through the 256 possible keys until plaintext appears.',
      learn: 'XOR is reversible: (P ⊕ K) ⊕ K = P. A single-byte key has only 256 possibilities — trivially brute-forced. XOR is a building block of real ciphers, but alone with a short key it is weak.',
      type: 'xorbrute',
      data: { cipherHex: '697d515245587545444f7548535e4f75186b57' },
      answer: 'cw{xor_one_byte_2a}',
      explain: 'The winning key here is 0x2A. Reused/short keys break XOR (see the "two-time pad"). Stream ciphers must never reuse a keystream — that exact mistake broke WEP Wi-Fi.',
      xp: 95, credits: 70, req: { done: 'cr-rot' } },

    { id: 'cr-hashid', domain: 'crypto', tier: 2, title: 'Identify the Digest',
      scenario: 'Incident responders handed you a hash pulled from a leaked database. Which algorithm produced it?',
      learn: 'Hash length is a fingerprint. MD5 = 32 hex chars (128-bit). SHA-1 = 40. SHA-256 = 64. Hashes are one-way — you cannot "decrypt" them, only guess inputs and compare.',
      type: 'mcq',
      data: { prompt: 'Hash: 0d107d09f5bbe40cade3de5c71e9e9b7', opts: [
        { t: 'MD5 (128-bit, 32 hex chars)', ok: true },
        { t: 'SHA-1 (160-bit, 40 hex chars)' },
        { t: 'SHA-256 (256-bit, 64 hex chars)' },
        { t: 'bcrypt (starts with $2b$)' }
      ] },
      explain: 'Counting characters (this one is 32) identifies MD5. MD5 is broken for security use — collisions are cheap. Password hashes should use bcrypt/argon2 with a per-user salt.',
      xp: 65, credits: 45, req: { done: 'cr-b64' } },

    { id: 'cr-crack', domain: 'crypto', tier: 5, title: 'Dictionary Crack // SHA-256',
      scenario: 'A stolen SHA-256 password hash is on your bench. Because the user picked a common password, a wordlist will find it. Recover the plaintext.',
      learn: 'You cannot reverse a hash, but you can hash guesses and compare. Attackers run wordlists (rockyou.txt, etc.) at billions of guesses/sec. Unsalted fast hashes like SHA-256 are a gift to them. Try the classic weak passwords.',
      type: 'hashcrack',
      data: { target: 'f52fbd32b2b3b86ff88ef6c490628285f482af15ddcb29541f94bcf526a3f6c7',
              hint: 'Weak-password wordlist to try: password, 123456, letmein, hunter2, qwerty, admin' },
      answer: 'hunter2',
      explain: 'The password was "hunter2". Salting defeats precomputed rainbow tables; a slow hash (bcrypt/argon2) makes each guess expensive, turning a 1-second crack into centuries.',
      xp: 110, credits: 90, req: { done: 'cr-hashid' } },

    // ---------------- WEB ----------------
    { id: 'web-sqli', domain: 'web', tier: 1, title: 'Login Bypass // SQL Injection',
      scenario: 'This login builds its query by pasting your input straight into SQL. Get in WITHOUT valid credentials.',
      learn: "When input is concatenated into SQL, an attacker can inject syntax. The classic payload  ' OR '1'='1  turns the WHERE clause always-true. Try it in the password field and watch the query the server builds.",
      type: 'sqli',
      data: {},
      explain: "You bypassed auth by making the WHERE clause always true. The fix is PARAMETERIZED QUERIES (prepared statements): input is sent as data, never parsed as code. This is OWASP A03: Injection.",
      xp: 90, credits: 70 },

    { id: 'web-headers', domain: 'web', tier: 2, title: 'Missing Armor // Security Headers',
      scenario: 'Here is a live HTTP response. Select EVERY security header that is missing and should be added.',
      learn: 'Response headers harden a site: Content-Security-Policy limits where scripts load (anti-XSS), Strict-Transport-Security forces HTTPS, X-Content-Type-Options: nosniff stops MIME sniffing. Their ABSENCE is the finding.',
      type: 'multi',
      data: { prompt: 'HTTP/1.1 200 OK\nServer: nginx\nContent-Type: text/html\nSet-Cookie: sid=abc123',
        opts: [
          { t: 'Content-Security-Policy', ok: true },
          { t: 'Strict-Transport-Security', ok: true },
          { t: 'X-Content-Type-Options: nosniff', ok: true },
          { t: 'Content-Type (already present)' },
          { t: 'Server (already present)' }
        ] },
      explain: 'CSP, HSTS, and nosniff are all absent here. Also note the cookie lacks HttpOnly/Secure/SameSite. Defense in depth means layering these controls, not relying on one.',
      xp: 85, credits: 60, req: { done: 'web-sqli' } },

    { id: 'web-jwt', domain: 'web', tier: 3, title: 'Forged Token // JWT alg:none',
      scenario: 'A session token uses JWT. Decode it, inspect the header, and identify why it is trivially forgeable.',
      learn: 'A JWT is three Base64url parts: header.payload.signature. The header names the signing algorithm. If a server accepts alg:"none", it skips signature verification — anyone can change the payload (e.g. role:admin) and be trusted.',
      type: 'jwt',
      data: { token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJndWVzdCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzAwMDAwMDAwfQ.',
        opts: [
          { t: 'The header sets alg:"none", so the signature is not verified — the payload can be freely edited.', ok: true },
          { t: 'The token is Base64, so it is encrypted and safe.' },
          { t: 'The "iat" timestamp is in the past, so it expired.' },
          { t: 'It is missing a "kid" header field.' }
        ] },
      explain: 'alg:none (and algorithm-confusion, e.g. RS256→HS256) let attackers mint their own tokens. Servers must pin the expected algorithm and always verify the signature against a secret/public key.',
      xp: 100, credits: 80, req: { done: 'web-headers' } },

    { id: 'web-idor', domain: 'web', tier: 4, title: 'Someone Else’s Data // IDOR',
      scenario: 'Logged in as user 1043, you request /api/invoice?id=1043 and it works. You change the id to 1044 and receive ANOTHER customer’s invoice. What class of bug is this?',
      learn: 'IDOR (Insecure Direct Object Reference) = the app trusts a user-supplied identifier to fetch a resource WITHOUT checking that the resource belongs to the caller. Authentication happened; AUTHORIZATION did not.',
      type: 'mcq',
      data: { prompt: 'Best classification of the flaw:', opts: [
        { t: 'Broken Access Control — IDOR (no per-object authorization check)', ok: true },
        { t: 'SQL Injection' },
        { t: 'Cross-Site Scripting (XSS)' },
        { t: 'Denial of Service' }
      ] },
      explain: 'This is OWASP A01: Broken Access Control. Fix by checking ownership server-side on every object access (invoice.owner == currentUser), not by hiding IDs. Random UUIDs help but are not a substitute for the check.',
      xp: 105, credits: 80, req: { done: 'web-jwt' } },

    { id: 'web-traversal', domain: 'web', tier: 4, title: 'Escape the Web Root // Path Traversal',
      scenario: 'A file viewer loads /app/files/<name>. Craft a value for <name> that climbs out of the directory and reads the system password file /etc/passwd.',
      learn: 'Path traversal abuses ../ sequences to leave the intended folder. Each ../ goes up one directory. If the app does not canonicalize/validate the path, you can reach arbitrary files.',
      type: 'text',
      data: { prompt: 'Enter the <name> value (target: /etc/passwd):', placeholder: '../../...' },
      answers: ['../../../../etc/passwd', '../../../etc/passwd', '../../etc/passwd', '../../../../../etc/passwd'],
      matchContains: 'etc/passwd',
      explain: 'Any ../ chain ending in etc/passwd works because the app trusts the filename. Fix: resolve the absolute path and verify it stays within the allowed base directory; reject ".." outright.',
      xp: 95, credits: 70, req: { done: 'web-headers' } },

    // ---------------- RECON ----------------
    { id: 'rc-ports', domain: 'recon', tier: 1, title: 'Port Sweep // Exposure',
      scenario: 'An nmap scan of a server is shown. One open service transmits credentials in CLEARTEXT and should never face the internet. Pick it.',
      learn: 'Ports map to services: 22=SSH, 23=Telnet, 80=HTTP, 443=HTTPS, 3389=RDP. Telnet (23) sends everything, including passwords, unencrypted — a sniffer on the path reads it all.',
      type: 'mcq',
      data: { prompt: 'PORT   STATE  SERVICE\n22/tcp  open  ssh\n23/tcp  open  telnet\n443/tcp open  https\n3306/tcp open mysql\n\nWhich is the cleartext-credential risk to fix first?', opts: [
        { t: '23/tcp telnet — cleartext protocol, replace with SSH', ok: true },
        { t: '22/tcp ssh' },
        { t: '443/tcp https' },
        { t: '3306/tcp mysql' }
      ] },
      explain: 'Telnet is the classic finding: swap it for SSH. MySQL (3306) exposed to the internet is also bad, but Telnet leaks credentials by design. Reduce attack surface — close/ firewall everything not needed.',
      xp: 70, credits: 50 },

    { id: 'rc-b64log', domain: 'recon', tier: 2, title: 'Leaky Log // Encoded Note',
      scenario: 'A misconfigured debug endpoint dumps a log line, and someone Base64-encoded a note inside it thinking that hid it. Recover the flag.',
      learn: 'Sensitive data hidden with encoding still leaks. During recon, always try decoding anything that looks like Base64 — config dumps, cookies, tokens, error pages routinely expose secrets this way.',
      type: 'decode', decoder: 'b64',
      data: { cipher: 'bG9nYm9vazogbmlnaHRseSBzeW5jIG9rOyBmbGFnPUNXe1JFQ09OX01BU1RFUn0=' },
      answer: 'cw{recon_master}', matchContains: 'cw{recon_master}',
      explain: 'The decoded line contained flag=CW{RECON_MASTER}. Verbose errors and debug endpoints are an information-disclosure goldmine. Disable debug in production and scrub secrets from logs.',
      xp: 80, credits: 55, req: { done: 'rc-ports' } },

    { id: 'rc-regex', domain: 'recon', tier: 3, title: 'Extract the IOC',
      scenario: 'From this alert blob, extract the attacker’s IPv4 address (the indicator of compromise) and submit it exactly.',
      learn: 'IOCs (Indicators of Compromise) — IPs, domains, hashes — are pulled from noisy text with pattern matching. An IPv4 is four 0–255 octets separated by dots. Analysts script this with regex to process thousands of logs.',
      type: 'text',
      data: { prompt: 'ALERT: outbound C2 beacon\nsrc=10.0.0.5 dst=185.220.101.47:443 proto=tcp\nuser-agent="curl/7.68" bytes=4096\n\nEnter the external attacker IP:', placeholder: 'x.x.x.x' },
      answers: ['185.220.101.47'],
      explain: '185.220.101.47 is the external destination (10.0.0.5 is internal/private per RFC1918). Correctly separating internal from external addresses is essential before you block or escalate.',
      xp: 85, credits: 60, req: { done: 'rc-b64log' } },

    { id: 'rc-osint', domain: 'recon', tier: 3, title: 'What Leaks // OSINT',
      scenario: 'A target’s public developer profile is shown. Select EVERY item that a social engineer could weaponize.',
      learn: 'OSINT (Open-Source Intelligence) builds an attack from public breadcrumbs: reused usernames link accounts across sites; email formats reveal the corporate scheme; a birthday feeds password guesses and pretexts.',
      type: 'multi',
      data: { prompt: 'Public profile:\n• username "j.reeves" (also on GitHub, Reddit)\n• email j.reeves@acme-corp.com\n• "Happy 30th to me! 🎂 05/14"\n• favorite color: teal',
        opts: [
          { t: 'Reused username links accounts across sites', ok: true },
          { t: 'Email reveals the corporate address format (first.last@)', ok: true },
          { t: 'Birthday enables pretexting & password guesses', ok: true },
          { t: 'Favorite color: teal' }
        ] },
      explain: 'Username reuse, the email pattern, and the birthday are all exploitable; favorite color is noise. Attackers correlate these into a convincing pretext. Minimize your public footprint and use unique usernames.',
      xp: 90, credits: 65, req: { done: 'rc-regex' } },

    // ---------------- FORENSICS ----------------
    { id: 'fo-loghunt', domain: 'forensics', tier: 1, title: 'Needle in the Log',
      scenario: 'Six access-log lines. Exactly one is an attack. Click the malicious request.',
      learn: 'Web access logs record every request. Attacks hide among noise: SQLi (’ OR 1=1), path traversal (../), and shell attempts stand out once you know the signatures. Click the line that is clearly hostile.',
      type: 'loghunt',
      data: { lines: [
        '200 GET /index.html',
        '200 GET /css/site.css',
        "500 GET /product?id=1'%20OR%20'1'='1",
        '304 GET /favicon.ico',
        '200 POST /api/login',
        '200 GET /about'
      ], answer: 2 },
      explain: "Line 3 is a SQL injection probe (' OR '1'='1) and it triggered a 500 — a strong sign the payload reached the database. Sudden 500s on odd query strings are a top hunting signal in log review.",
      xp: 80, credits: 55 },

    { id: 'fo-stego', domain: 'forensics', tier: 2, title: 'Hidden in Plain Sight // Acrostic',
      scenario: 'This intercepted memo looks innocent. The message is hidden using the FIRST letter of each line. Read down the left edge and submit what it spells.',
      learn: 'Steganography hides data inside ordinary-looking content. A classic text trick is the acrostic: the real message is the first letter of every line. Whitespace, image LSBs, and metadata are other common carriers.',
      type: 'text',
      data: { prompt: 'MEMO:\nControl systems nominal.\nWeather clear over sector.\nBrief the night shift.\nRotate the perimeter watch.\nEmail me the daily count.\nActivate backup uplink.\nCheck the cold storage.\nHold at readiness.\n\nRead the first letter of each line — what word/flag does it spell?',
        placeholder: 'CW...' },
      answers: ['cwbreach', 'cw breach', 'cwbreach'], matchContains: 'cwbreach',
      explain: 'First letters spell C-W-B-R-E-A-C-H → "CWBREACH". Stego evades keyword filters because nothing looks secret. Defenders inspect entropy, metadata, and structure — not just visible text.',
      xp: 90, credits: 65, req: { done: 'fo-loghunt' } },

    { id: 'fo-pcap', domain: 'forensics', tier: 3, title: 'Cleartext Capture // PCAP',
      scenario: 'A packet capture shows an HTTP (not HTTPS) login POST. The credentials are right there in the payload. Submit the captured password.',
      learn: 'Without TLS, anyone on the network path (rogue AP, ARP spoofer, ISP) can read traffic. Tools like Wireshark reconstruct HTTP bodies directly. HTTPS exists precisely to stop this passive capture.',
      type: 'text',
      data: { prompt: 'POST /login HTTP/1.1\nHost: portal.acme.local\nContent-Type: application/x-www-form-urlencoded\n\nusername=admin&password=Spr1ng2024!&remember=1\n\nEnter the captured password:', placeholder: 'password value' },
      answers: ['spr1ng2024!'], caseInsensitive: true,
      explain: 'The password "Spr1ng2024!" traveled in cleartext. Enforce HTTPS everywhere (HSTS), and treat any plaintext-protocol credential as already compromised once captured.',
      xp: 95, credits: 70, req: { done: 'fo-stego' } },

    { id: 'fo-timeline', domain: 'forensics', tier: 4, title: 'Reconstruct the Attack',
      scenario: 'Five evidence events are scrambled. Put them in the order they actually happened, from initial access to impact.',
      learn: 'Timeline reconstruction orders artifacts into the attack story. A typical intrusion: phishing → credential use → lateral movement / privilege escalation → data staging → exfiltration. Correct sequence drives root-cause and scope.',
      type: 'order',
      data: { steps: [
        'Phishing email opened; malicious macro runs',
        'Stolen VPN credentials used to log in',
        'Attacker moves laterally to the file server',
        'Sensitive files compressed into a staging archive',
        'Archive exfiltrated to an external IP'
      ] },
      explain: 'Access → credential use → lateral movement → staging → exfiltration. Mapping events to a kill-chain / MITRE ATT&CK order reveals where detection failed and what to contain first.',
      xp: 110, credits: 85, req: { done: 'fo-pcap' } },

    // ---------------- DEFENSE ----------------
    { id: 'de-phish', domain: 'defense', tier: 1, title: 'Spot the Phish',
      scenario: 'An "IT Support" email lands in your inbox. Select EVERY red flag that marks it as phishing.',
      learn: 'Phishing exploits urgency and trust. Red flags: lookalike/mismatched sender domains, artificial time pressure, requests for credentials, and links whose visible text differs from their real destination.',
      type: 'multi',
      data: { prompt: 'From: IT-Support@acme-corp-secure.com\nSubject: URGENT: verify in 24h or account DELETED\n"Click here to confirm your password immediately:\n acme-login.com/verify" (real link: 193.42.x.x)',
        opts: [
          { t: 'Lookalike sender domain (acme-corp-secure.com, not acme-corp.com)', ok: true },
          { t: 'Artificial urgency / deadline threat', ok: true },
          { t: 'Asks you to confirm your password', ok: true },
          { t: 'Link text differs from the real destination (raw IP)', ok: true },
          { t: 'It was addressed to you by name' }
        ] },
      explain: 'The domain, urgency, credential request, and mismatched link are all classic phishing tells. Real IT never asks for your password. Report, do not click; hover links to reveal the true destination.',
      xp: 80, credits: 60 },

    { id: 'de-ir', domain: 'defense', tier: 2, title: 'Incident Response // Order the Phases',
      scenario: 'Ransomware just detonated on three hosts. Put the incident-response phases in the correct order.',
      learn: 'The SANS/NIST lifecycle: Preparation → Identification → Containment → Eradication → Recovery → Lessons Learned. You contain (isolate hosts) BEFORE eradicating, and recover only after the threat is removed.',
      type: 'order',
      data: { steps: [
        'Preparation — plans, backups, and tooling ready in advance',
        'Identification — confirm and scope the incident',
        'Containment — isolate affected hosts from the network',
        'Eradication — remove malware and close the entry vector',
        'Recovery — restore from clean backups and monitor',
        'Lessons Learned — post-incident review and improvements'
      ] },
      explain: 'Contain before you eradicate: pulling infected hosts off the network stops spread while you clean. Recovering before eradication just reinfects. Lessons Learned feeds back into Preparation.',
      xp: 100, credits: 75, req: { done: 'de-phish' } },

    { id: 'de-mfa', domain: 'defense', tier: 3, title: 'Stop Credential Stuffing',
      scenario: 'Attackers are replaying millions of username/password pairs from an unrelated breach against your login. Which control most directly defeats this?',
      learn: 'Credential stuffing reuses passwords leaked elsewhere. Even correct passwords fail if a second factor is required. MFA (something you have/are) is the single highest-impact control against stolen-password attacks.',
      type: 'mcq',
      data: { prompt: 'Best primary defense:', opts: [
        { t: 'Require multi-factor authentication (MFA)', ok: true },
        { t: 'Force a 60-day password rotation policy' },
        { t: 'Add a CAPTCHA font that is harder to read' },
        { t: 'Hide the login page at a secret URL' }
      ] },
      explain: 'MFA breaks the attack even when the password is correct. Rotation and security-by-obscurity are weak; pair MFA with breached-password checks, rate limiting, and lockouts for defense in depth.',
      xp: 95, credits: 70, req: { done: 'de-ir' } },

    { id: 'de-least', domain: 'defense', tier: 4, title: 'Least Privilege',
      scenario: 'A web app’s database account can DROP tables and read every schema, but the app only ever runs SELECT/INSERT on two tables. What principle is violated and what is the fix?',
      learn: 'Least privilege: every account/process gets only the access it needs, nothing more. Over-privileged service accounts turn a small bug into a full compromise — an SQLi on an admin DB user can wipe everything.',
      type: 'mcq',
      data: { prompt: 'Correct response:', opts: [
        { t: 'Violates least privilege — give the app a scoped account (SELECT/INSERT on those tables only)', ok: true },
        { t: 'Nothing wrong — broad access is more convenient' },
        { t: 'Fix it by using a longer database password' },
        { t: 'Fix it by hiding the connection string in the HTML' }
      ] },
      explain: 'Scope the DB account to exactly what the app needs. Then an injection or logic bug is contained — the attacker inherits only minimal rights. Apply the same to cloud IAM, OS users, and API tokens.',
      xp: 115, credits: 90, req: { done: 'de-mfa' } },

    { id: 'de-detect', domain: 'defense', tier: 5, title: 'Detection Engineering // Login Spray',
      scenario: 'Your SIEM receives identity logs from the portal. Build a reliable alert for password spraying without firing on one forgetful user.',
      learn: 'A strong detection looks for one source or actor trying many accounts in a short window, then separates that from one user mistyping a password. Correlate by source IP, user count, failure count, and a later success. Keep the window bounded so the rule is explainable and tunable.',
      type: 'multi',
      data: { prompt: 'Select EVERY signal that belongs in the detection logic:',
        opts: [
          { t: 'Many failed logins from the same source IP in a short time window', ok: true },
          { t: 'Failures spread across many distinct usernames', ok: true },
          { t: 'A successful login from the same source after the failures', ok: true },
          { t: 'Only one user account mistyped a password twice' },
          { t: 'A bounded time window such as 10 minutes', ok: true }
        ] },
      explain: 'Password-spray detection is a correlation problem: high distinct-user failures plus a bounded window, then escalation if a success follows. Tune thresholds by environment and suppress known scanners or trusted identity infrastructure.',
      xp: 125, credits: 95, req: { done: 'de-least' } }
  ];

  function chById(id) { for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return CH[i]; return null; }
  function chOfDomain(d) { return CH.filter(function (c) { return c.domain === d; }).sort(function (a, b) { return a.tier - b.tier; }); }
  function chUnlocked(c) {
    if (!c.req) return true;
    if (c.req.done && !isDone(c.req.done)) return false;
    if (c.req.level && getOp().level < c.req.level) return false;
    return true;
  }

  // ------------------------------------------------------------ toast (reuse cw-net's if present)
  function toast(msg, kind) {
    var host = document.getElementById('cwnet-toasts');
    if (!host) { host = document.createElement('div'); host.id = 'cwnet-toasts'; document.body.appendChild(host); }
    var t = document.createElement('div'); t.className = 'cwnet-toast' + (kind ? ' ' + kind : ''); t.innerHTML = msg;
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3600);
    setTimeout(function () { t.remove(); }, 4200);
  }

  // ------------------------------------------------------------ UI shell
  var view = { screen: 'overview', domain: null, challenge: null };

  function ensureMounted() {
    if (!document.body) return;
    mountDock();
    mountWin();
  }
  function mountDock() {
    if (document.getElementById('cwa-dock')) return;
    var d = document.createElement('div'); d.id = 'cwa-dock';
    d.innerHTML = '<span class="cwa-dock-ic">🎓</span><span>ACADEMY</span><span class="cwa-dock-prog" id="cwa-dock-prog">0/' + CH.length + '</span>';
    d.title = 'CyberWorld Academy — learn & earn (A)';
    d.addEventListener('click', function () { toggle(true); });
    document.body.appendChild(d);
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); toggle(); }
    });
    refreshDockProg();
  }
  function refreshDockProg() {
    var p = document.getElementById('cwa-dock-prog');
    if (!p) return;
    var done = CH.filter(function (c) { return isDone(c.id); }).length;
    p.textContent = done + '/' + CH.length;
  }
  function mountWin() {
    if (document.getElementById('cwa-win')) return;
    var w = document.createElement('div'); w.id = 'cwa-win';
    w.innerHTML =
      '<div class="cwa-title"><h2>🎓 CYBERWORLD ACADEMY</h2>' +
      '<span class="cwa-lvlpill" id="cwa-lvlpill">LVL 1</span>' +
      '<button class="cwa-x" title="Close (A)">✕</button></div>' +
      '<div class="cwa-menubar">' +
        '<button class="cwa-mbtn active" data-screen="overview">CAMPAIGN</button>' +
        '<button class="cwa-mbtn" data-screen="dispatches">DISPATCHES</button>' +
      '</div>' +
      '<div class="cwa-body">' +
        '<div class="cwa-screen active" data-screen="overview" id="cwa-overview"></div>' +
        '<div class="cwa-screen" data-screen="track" id="cwa-track"></div>' +
        '<div class="cwa-screen" data-screen="challenge" id="cwa-challenge"></div>' +
        '<div class="cwa-screen" data-screen="dispatches" id="cwa-dispatches"></div>' +
      '</div>';
    document.body.appendChild(w);
    w.querySelector('.cwa-x').addEventListener('click', function () { toggle(false); });
    w.querySelectorAll('.cwa-mbtn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.screen === 'dispatches') { showScreen('dispatches'); loadDispatches(); }
        else { view.screen = 'overview'; showScreen('overview'); renderOverview(); }
        w.querySelectorAll('.cwa-mbtn').forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
    makeDraggable(w, w.querySelector('.cwa-title'));
    renderOverview();
  }
  function toggle(force) {
    ensureMounted();
    var w = document.getElementById('cwa-win'); if (!w) return;
    var show = force === undefined ? !w.classList.contains('open') : force;
    w.classList.toggle('open', show);
    if (show) { updateLvlPill(); renderOverview(); showScreen(view.screen === 'challenge' ? 'challenge' : 'overview'); }
  }
  function showScreen(name) {
    view.screen = name;
    var w = document.getElementById('cwa-win'); if (!w) return;
    w.querySelectorAll('.cwa-screen').forEach(function (s) { s.classList.toggle('active', s.dataset.screen === name); });
  }
  function updateLvlPill() {
    var op = getOp(); var p = document.getElementById('cwa-lvlpill');
    if (p) p.textContent = 'LVL ' + op.level;
  }

  // ------------------------------------------------------------ screens
  function renderOverview() {
    var host = document.getElementById('cwa-overview'); if (!host) return;
    var op = getOp();
    var doneCount = CH.filter(function (c) { return isDone(c.id); }).length;
    var totalXp = CH.reduce(function (a, c) { return a + (isDone(c.id) ? c.xp : 0); }, 0);
    var html = '<div class="cwa-hero"><div class="k">FLLC HACKER ACADEMY // MAINFRAME CORE</div>' +
      '<h1>Field Training Campaign</h1>' +
      '<p>Real, hands-on cybersecurity challenges — decode ciphers, break weak auth, hunt through logs, and think like a defender. Every solve is graded, explained, and pays XP straight into your operative on the live grid.</p>' +
      '<div class="cwa-overall">' +
        '<div class="cwa-ostat"><b>' + doneCount + '/' + CH.length + '</b><span>CHALLENGES</span></div>' +
        '<div class="cwa-ostat"><b>' + op.level + '</b><span>OPERATIVE LVL</span></div>' +
        '<div class="cwa-ostat"><b>' + totalXp.toLocaleString() + '</b><span>ACADEMY XP</span></div>' +
      '</div></div><div class="cwa-domains">';
    DOMAINS.forEach(function (d) {
      var list = chOfDomain(d.id);
      var done = list.filter(function (c) { return isDone(c.id); }).length;
      var pct = Math.round(done / list.length * 100);
      html += '<div class="cwa-domain" data-domain="' + d.id + '">' +
        '<div class="dh"><span class="di">' + d.icon + '</span><span class="dn">' + d.name + '</span></div>' +
        '<div class="dd">' + esc(d.desc) + '</div>' +
        '<div class="cwa-pbar"><div class="cwa-pfill" style="width:' + pct + '%"></div></div>' +
        '<div class="cwa-pmeta"><span>' + done + '/' + list.length + ' cleared</span><span>' + pct + '%</span></div>' +
      '</div>';
    });
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('.cwa-domain').forEach(function (el) {
      el.addEventListener('click', function () { openTrack(el.dataset.domain); });
    });
    updateLvlPill(); refreshDockProg();
  }

  function openTrack(domainId) {
    view.domain = domainId;
    var host = document.getElementById('cwa-track'); if (!host) return;
    var d = DOMAINS.filter(function (x) { return x.id === domainId; })[0];
    var list = chOfDomain(domainId);
    var html = '<div class="cwa-track"><span class="cwa-back" id="cwa-track-back">← CAMPAIGN</span>' +
      '<h1 style="color:#eafcff;font-size:18px;margin:0 0 4px">' + d.icon + ' ' + d.name + '</h1>' +
      '<p style="color:var(--cwa-text);font-size:12px;margin-bottom:14px">' + esc(d.desc) + '</p>' +
      '<div class="cwa-clist">';
    list.forEach(function (c) {
      var done = isDone(c.id); var unlocked = chUnlocked(c) || done;
      var status = done ? '✅' : unlocked ? '▶' : '🔒';
      html += '<div class="cwa-crow ' + (done ? 'done' : unlocked ? '' : 'locked') + '" data-id="' + c.id + '">' +
        '<div class="cwa-cstatus">' + status + '</div>' +
        '<div class="cwa-cinfo"><div class="ct">' + esc(c.title) + '</div>' +
        '<div class="cs">' + (unlocked ? esc(c.scenario.slice(0, 90)) + (c.scenario.length > 90 ? '…' : '') : 'Locked — clear the previous challenge to unlock.') + '</div></div>' +
        '<span class="cwa-ctier">T' + c.tier + '</span>' +
        '<span class="cwa-crew">+' + c.xp + ' XP</span></div>';
    });
    html += '</div></div>';
    host.innerHTML = html;
    document.getElementById('cwa-track-back').addEventListener('click', function () { showScreen('overview'); renderOverview(); });
    host.querySelectorAll('.cwa-crow').forEach(function (row) {
      row.addEventListener('click', function () {
        var c = chById(row.dataset.id);
        if (!c) return;
        if (!isDone(c.id) && !chUnlocked(c)) { toast('🔒 Locked — clear the previous challenge first', 'warn'); return; }
        openChallenge(c.id);
      });
    });
    showScreen('track');
  }

  // ------------------------------------------------------------ challenge renderer
  function openChallenge(id) {
    var c = chById(id); if (!c) return;
    view.challenge = id;
    var host = document.getElementById('cwa-challenge'); if (!host) return;
    var d = DOMAINS.filter(function (x) { return x.id === c.domain; })[0];
    var done = isDone(c.id);

    var html = '<div class="cwa-chal">' +
      '<span class="cwa-back" id="cwa-chal-back">← ' + d.name + '</span>' +
      '<h1>' + esc(c.title) + (done ? ' ✅' : '') + '</h1>' +
      '<div class="dom">' + d.icon + ' ' + d.name + ' · TIER ' + c.tier + ' · +' + c.xp + ' XP / +' + c.credits + ' cr</div>' +
      '<div class="cwa-sec"><div class="lbl">📡 SCENARIO</div><p>' + esc(c.scenario) + '</p></div>' +
      '<div class="cwa-sec learn"><div class="lbl">📘 FIELD MANUAL</div><p>' + esc(c.learn) + '</p></div>' +
      '<div class="cwa-sec"><div class="lbl">⚡ CHALLENGE</div><div id="cwa-interactive"></div></div>' +
      '<div class="cwa-verdict" id="cwa-verdict"></div>' +
      '<div class="cwa-nav"><button class="cwa-btn ghost" id="cwa-chal-back2">← Back</button>' +
      '<span id="cwa-next-wrap"></span></div>' +
      '</div>';
    host.innerHTML = html;
    document.getElementById('cwa-chal-back').addEventListener('click', function () { openTrack(c.domain); });
    document.getElementById('cwa-chal-back2').addEventListener('click', function () { openTrack(c.domain); });
    renderInteractive(c, done);
    showScreen('challenge');
  }

  function showVerdict(c, ok) {
    var v = document.getElementById('cwa-verdict'); if (!v) return;
    v.className = 'cwa-verdict show ' + (ok ? 'ok' : 'no');
    if (ok) {
      v.innerHTML = '<b>✅ SOLVED — +' + c.xp + ' XP / +' + c.credits + ' cr</b><div class="why"><b>Why it matters:</b> ' + esc(c.explain) + '</div>';
      var nextWrap = document.getElementById('cwa-next-wrap');
      var nextC = nextChallenge(c);
      if (nextWrap && nextC) {
        var btn = document.createElement('button'); btn.className = 'cwa-btn primary'; btn.textContent = 'NEXT →';
        btn.addEventListener('click', function () { openChallenge(nextC.id); });
        nextWrap.innerHTML = ''; nextWrap.appendChild(btn);
      }
    } else {
      v.innerHTML = '<b>❌ Not quite — review the field manual and try again.</b>';
    }
  }
  function nextChallenge(c) {
    var list = chOfDomain(c.domain);
    var idx = list.findIndex(function (x) { return x.id === c.id; });
    for (var i = idx + 1; i < list.length; i++) { return list[i]; }
    return null;
  }

  function solve(c) {
    if (isDone(c.id)) { showVerdict(c, true); return; }
    award(c.id, c.xp, c.credits);
    toast('🎓 Academy: <b>' + esc(c.title) + '</b> +' + c.xp + ' XP', 'ok');
    updateLvlPill(); refreshDockProg();
    showVerdict(c, true);
    // log to global feed immediately if the net layer is online
    try { if (window.__cwNet && window.__cwNet.logMission) window.__cwNet.logMission(c.id, c.title, c.xp); } catch (e) {}
    try { if (window.__cwNet && window.__cwNet.sync) { var sp = window.__cwNet.sync(); if (sp && sp.catch) sp.catch(function () {}); } } catch (e) {}
  }

  function checkText(c, val) {
    var n = c.caseInsensitive ? String(val).trim().toLowerCase() : norm(val);
    if (c.matchContains && (c.caseInsensitive ? n.indexOf(c.matchContains.toLowerCase()) : norm(n).indexOf(norm(c.matchContains))) !== -1) return true;
    var answers = c.answers || (c.answer ? [c.answer] : []);
    for (var i = 0; i < answers.length; i++) {
      var a = c.caseInsensitive ? String(answers[i]).trim().toLowerCase() : norm(answers[i]);
      if (n === a) return true;
    }
    return false;
  }

  function renderInteractive(c, done) {
    var host = document.getElementById('cwa-interactive'); if (!host) return;

    // ---------- decode (b64/hex/rot) with a live tool + answer box ----------
    if (c.type === 'decode') {
      var toolHtml = '<div class="cwa-mono">' + esc(c.data.cipher) + '</div><div class="cwa-tool">';
      if (c.rotUI) {
        toolHtml += '<label>SHIFT WHEEL: <span id="cwa-rot-val">13</span></label>' +
          '<input type="range" class="cwa-slider" id="cwa-rot" min="0" max="25" value="13">' +
          '<div class="cwa-out" id="cwa-rot-out"></div>';
      } else {
        toolHtml += '<button class="cwa-btn ghost" id="cwa-dec-run">RUN ' + (c.decoder === 'hex' ? 'HEX→ASCII' : 'BASE64 DECODE') + '</button>' +
          '<div class="cwa-out" id="cwa-dec-out">—</div>';
      }
      toolHtml += '<label>SUBMIT THE RECOVERED FLAG/TEXT:</label><div class="cwa-answer-row">' +
        '<input class="cwa-input" id="cwa-ans" placeholder="CW{...}" ' + (done ? 'disabled' : '') + '>' +
        '<button class="cwa-btn primary" id="cwa-submit" ' + (done ? 'disabled' : '') + '>SUBMIT</button></div></div>';
      host.innerHTML = toolHtml;
      if (c.rotUI) {
        var rng = document.getElementById('cwa-rot'), out = document.getElementById('cwa-rot-out'), lbl = document.getElementById('cwa-rot-val');
        var upd = function () { lbl.textContent = rng.value; out.textContent = rot(c.data.cipher, parseInt(rng.value, 10)); };
        rng.addEventListener('input', upd); upd();
      } else {
        document.getElementById('cwa-dec-run').addEventListener('click', function () {
          document.getElementById('cwa-dec-out').textContent = c.decoder === 'hex' ? hexToStr(c.data.cipher) : b64decode(c.data.cipher);
        });
      }
      wireSubmit(c, function () { return checkText(c, document.getElementById('cwa-ans').value); });
      if (done) prefill(c);
      return;
    }

    // ---------- plain text answer ----------
    if (c.type === 'text') {
      host.innerHTML = '<div class="cwa-mono">' + esc(c.data.prompt) + '</div><div class="cwa-tool">' +
        '<div class="cwa-answer-row"><input class="cwa-input" id="cwa-ans" placeholder="' + esc(c.data.placeholder || '') + '" ' + (done ? 'disabled' : '') + '>' +
        '<button class="cwa-btn primary" id="cwa-submit" ' + (done ? 'disabled' : '') + '>SUBMIT</button></div></div>';
      wireSubmit(c, function () { return checkText(c, document.getElementById('cwa-ans').value); });
      if (done) prefill(c);
      return;
    }

    // ---------- xor brute ----------
    if (c.type === 'xorbrute') {
      host.innerHTML = '<div class="cwa-mono">CIPHER (hex): ' + esc(c.data.cipherHex) + '</div><div class="cwa-tool">' +
        '<label>XOR KEY: 0x<span id="cwa-xk-hex">00</span> (<span id="cwa-xk-dec">0</span>)</label>' +
        '<input type="range" class="cwa-slider" id="cwa-xk" min="0" max="255" value="0">' +
        '<div class="cwa-out" id="cwa-xk-out"></div>' +
        '<label>SUBMIT THE RECOVERED PLAINTEXT:</label><div class="cwa-answer-row">' +
        '<input class="cwa-input" id="cwa-ans" placeholder="CW{...}" ' + (done ? 'disabled' : '') + '>' +
        '<button class="cwa-btn primary" id="cwa-submit" ' + (done ? 'disabled' : '') + '>SUBMIT</button></div></div>';
      var bytes = []; var h = c.data.cipherHex.replace(/[^0-9a-f]/gi, '');
      for (var i = 0; i < h.length; i += 2) bytes.push(parseInt(h.substr(i, 2), 16));
      var xk = document.getElementById('cwa-xk');
      var upd2 = function () {
        var k = parseInt(xk.value, 10);
        document.getElementById('cwa-xk-hex').textContent = ('0' + k.toString(16)).slice(-2).toUpperCase();
        document.getElementById('cwa-xk-dec').textContent = k;
        document.getElementById('cwa-xk-out').textContent = bytes.map(function (b) { var v = b ^ k; return (v >= 32 && v < 127) ? String.fromCharCode(v) : '.'; }).join('');
      };
      xk.addEventListener('input', upd2); upd2();
      wireSubmit(c, function () { return checkText(c, document.getElementById('cwa-ans').value); });
      if (done) prefill(c);
      return;
    }

    // ---------- hashcrack (async SHA-256) ----------
    if (c.type === 'hashcrack') {
      host.innerHTML = '<div class="cwa-mono">TARGET SHA-256:\n' + esc(c.data.target) + '\n\n' + esc(c.data.hint) + '</div><div class="cwa-tool">' +
        '<label>TRY A PASSWORD (it gets hashed and compared):</label><div class="cwa-answer-row">' +
        '<input class="cwa-input" id="cwa-ans" placeholder="guess" ' + (done ? 'disabled' : '') + '>' +
        '<button class="cwa-btn primary" id="cwa-submit" ' + (done ? 'disabled' : '') + '>CRACK</button></div>' +
        '<div class="cwa-out" id="cwa-hash-out">—</div></div>';
      var submitFn = function () {
        var guess = document.getElementById('cwa-ans').value;
        sha256hex(guess).then(function (hx) {
          var out = document.getElementById('cwa-hash-out');
          if (out) out.textContent = 'sha256("' + guess + '") = ' + hx;
          if (hx === c.data.target.toLowerCase()) solve(c);
          else showVerdict(c, false);
        });
      };
      var btn = document.getElementById('cwa-submit');
      if (btn && !done) {
        btn.addEventListener('click', submitFn);
        document.getElementById('cwa-ans').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitFn(); e.stopPropagation(); });
      }
      if (done) prefill(c);
      return;
    }

    // ---------- mcq (single) ----------
    if (c.type === 'mcq') {
      renderChoice(c, host, false, done); return;
    }
    // ---------- multi ----------
    if (c.type === 'multi') {
      renderChoice(c, host, true, done); return;
    }

    // ---------- sqli login ----------
    if (c.type === 'sqli') {
      host.innerHTML = '<div class="cwa-login">' +
        '<label class="cwa-tool" style="color:var(--cwa-text);font-size:11px">Target login (input is concatenated straight into SQL):</label>' +
        '<div style="margin-top:8px"><input class="cwa-input" id="cwa-u" placeholder="username" style="margin-bottom:6px" ' + (done ? 'disabled' : '') + '>' +
        '<input class="cwa-input" id="cwa-p" placeholder="password" ' + (done ? 'disabled' : '') + '></div>' +
        '<div class="sqlprev" id="cwa-sql"></div>' +
        '<div style="margin-top:10px"><button class="cwa-btn primary" id="cwa-login-btn" ' + (done ? 'disabled' : '') + '>AUTHENTICATE</button></div></div>';
      var u = document.getElementById('cwa-u'), p = document.getElementById('cwa-p'), sqlv = document.getElementById('cwa-sql');
      var buildSql = function () {
        sqlv.textContent = "SELECT * FROM users WHERE user='" + (u.value || '') + "' AND pass='" + (p.value || '') + "';";
      };
      u.addEventListener('input', buildSql); p.addEventListener('input', buildSql); buildSql();
      if (!done) document.getElementById('cwa-login-btn').addEventListener('click', function () {
        var payload = (u.value + ' ' + p.value);
        var bypass = /'\s*or\s*'?\d*'?\s*=\s*'?\d*/i.test(payload) || /'\s*or\s*1\s*=\s*1/i.test(payload) || /'\s*(--|#)/.test(payload) || /'\s*or\s+true/i.test(payload);
        if (bypass) { solve(c); } else { toast('Access denied — try a tautology like <b>’ OR ’1’=’1</b>', 'warn'); showVerdict(c, false); }
      });
      if (done) prefill(c);
      return;
    }

    // ---------- jwt ----------
    if (c.type === 'jwt') {
      host.innerHTML = '<div class="cwa-mono">TOKEN:\n' + esc(c.data.token) + '</div><div class="cwa-tool">' +
        '<button class="cwa-btn ghost" id="cwa-jwt-dec">DECODE HEADER + PAYLOAD</button>' +
        '<div class="cwa-out" id="cwa-jwt-out">—</div>' +
        '<label>Now identify the critical flaw:</label><div class="cwa-opts" id="cwa-opts"></div></div>';
      document.getElementById('cwa-jwt-dec').addEventListener('click', function () {
        var parts = c.data.token.split('.');
        var out = 'HEADER:  ' + safeJwt(parts[0]) + '\nPAYLOAD: ' + safeJwt(parts[1]) + '\nSIGNATURE: ' + (parts[2] ? parts[2] : '(empty)');
        document.getElementById('cwa-jwt-out').textContent = out;
      });
      renderOpts(c, document.getElementById('cwa-opts'), false, done);
      if (done) document.getElementById('cwa-jwt-out').textContent = 'HEADER: {"alg":"none","typ":"JWT"}';
      return;
    }

    // ---------- loghunt ----------
    if (c.type === 'loghunt') {
      var lh = '<div class="cwa-loghunt">';
      c.data.lines.forEach(function (ln, i) { lh += '<div class="cwa-logline" data-i="' + i + '">' + esc(ln) + '</div>'; });
      lh += '</div>';
      host.innerHTML = lh;
      if (!done) host.querySelectorAll('.cwa-logline').forEach(function (el) {
        el.addEventListener('click', function () {
          if (parseInt(el.dataset.i, 10) === c.data.answer) { el.classList.add('picked'); solve(c); }
          else { el.style.borderColor = '#c44'; showVerdict(c, false); }
        });
      });
      if (done) { var ok = host.querySelector('.cwa-logline[data-i="' + c.data.answer + '"]'); if (ok) ok.classList.add('picked'); showVerdict(c, true); }
      return;
    }

    // ---------- order ----------
    if (c.type === 'order') {
      var stepsHtml = '<div class="cwa-order" id="cwa-order"></div>' +
        '<button class="cwa-btn primary" id="cwa-order-check" style="margin-top:10px" ' + (done ? 'disabled' : '') + '>CHECK ORDER</button>';
      host.innerHTML = stepsHtml;
      var order = done ? c.data.steps.map(function (_, i) { return i; }) : shuffle(c.data.steps.map(function (_, i) { return i; }));
      var render = function () {
        var box = document.getElementById('cwa-order'); box.innerHTML = '';
        order.forEach(function (si, pos) {
          var row = document.createElement('div'); row.className = 'cwa-ostep';
          row.innerHTML = '<span class="n">' + (pos + 1) + '</span><span class="txt">' + esc(c.data.steps[si]) + '</span>' +
            '<span class="mv"><button data-dir="-1" data-pos="' + pos + '">▲</button><button data-dir="1" data-pos="' + pos + '">▼</button></span>';
          box.appendChild(row);
        });
        box.querySelectorAll('button').forEach(function (b) {
          b.addEventListener('click', function () {
            if (done) return;
            var pos = parseInt(b.dataset.pos, 10), dir = parseInt(b.dataset.dir, 10), np = pos + dir;
            if (np < 0 || np >= order.length) return;
            var tmp = order[pos]; order[pos] = order[np]; order[np] = tmp; render();
          });
        });
      };
      render();
      if (!done) document.getElementById('cwa-order-check').addEventListener('click', function () {
        var correct = order.every(function (si, pos) { return si === pos; });
        if (correct) solve(c); else showVerdict(c, false);
      });
      if (done) showVerdict(c, true);
      return;
    }

    host.innerHTML = '<div class="cwa-empty">This challenge type is unavailable.</div>';
  }

  function renderChoice(c, host, multi, done) {
    host.innerHTML = '<div class="cwa-mono">' + esc(c.data.prompt) + '</div>' +
      '<div class="cwa-opts" id="cwa-opts"></div>' +
      '<button class="cwa-btn primary" id="cwa-choice-submit" style="margin-top:10px" ' + (done ? 'disabled' : '') + '>SUBMIT ANSWER</button>';
    renderOpts(c, document.getElementById('cwa-opts'), multi, done);
    if (!done) document.getElementById('cwa-choice-submit').addEventListener('click', function () {
      var opts = host.querySelectorAll('.cwa-opt');
      var ok = true;
      opts.forEach(function (o, i) {
        var sel = o.classList.contains('sel'); var correct = !!c.data.opts[i].ok;
        if (sel !== correct) ok = false;
        if (correct) o.classList.add('correct'); else if (sel) o.classList.add('wrong');
      });
      if (ok) solve(c); else showVerdict(c, false);
    });
    if (done) { host.querySelectorAll('.cwa-opt').forEach(function (o, i) { if (c.data.opts[i].ok) o.classList.add('correct'); }); showVerdict(c, true); }
  }
  function renderOpts(c, box, multi, done) {
    if (!box) return; box.innerHTML = '';
    c.data.opts.forEach(function (opt, i) {
      var o = document.createElement('div'); o.className = 'cwa-opt'; o.dataset.i = i;
      o.innerHTML = '<span class="box"></span><span>' + esc(opt.t) + '</span>';
      if (!done) o.addEventListener('click', function () {
        if (!multi) box.querySelectorAll('.cwa-opt').forEach(function (x) { x.classList.remove('sel'); x.querySelector('.box').textContent = ''; });
        var on = o.classList.toggle('sel');
        o.querySelector('.box').textContent = on ? '✓' : '';
        // jwt uses immediate single-select grading
        if (c.type === 'jwt' && on) {
          var correct = !!c.data.opts[i].ok;
          box.querySelectorAll('.cwa-opt').forEach(function (x, j) { if (c.data.opts[j].ok) x.classList.add('correct'); else if (x.classList.contains('sel')) x.classList.add('wrong'); });
          if (correct) solve(c); else showVerdict(c, false);
        }
      });
      box.appendChild(o);
    });
  }

  function wireSubmit(c, checkFn) {
    var btn = document.getElementById('cwa-submit'); if (!btn) return;
    var run = function () { if (checkFn()) solve(c); else showVerdict(c, false); };
    btn.addEventListener('click', run);
    var inp = document.getElementById('cwa-ans');
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); e.stopPropagation(); });
  }
  function prefill(c) {
    var inp = document.getElementById('cwa-ans');
    if (inp && (c.answer || (c.answers && c.answers[0]))) { inp.value = c.answer || c.answers[0]; }
    showVerdict(c, true);
  }

  function safeJwt(part) { try { return b64decode(part.replace(/-/g, '+').replace(/_/g, '/')); } catch (e) { return '(decode error)'; } }
  function sha256hex(str) {
    try {
      var enc = new TextEncoder().encode(str);
      return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    } catch (e) { return Promise.resolve(''); }
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ------------------------------------------------------------ GitHub connector: Dispatches
  var REPO = 'Personfu/personfu.github.io';
  function loadDispatches() {
    var host = document.getElementById('cwa-dispatches'); if (!host) return;
    host.innerHTML = '<div class="cwa-disp"><h3>📡 GRID DISPATCHES</h3>' +
      '<div class="sub">Live from the CyberWorld source repository via the GitHub API — recent patches and open community contracts.</div>' +
      '<div id="cwa-commits"><div class="cwa-empty">Fetching latest patches…</div></div>' +
      '<h3 style="margin-top:8px">📝 OPEN CONTRACTS (ISSUES)</h3>' +
      '<div id="cwa-issues"><div class="cwa-empty">Fetching open contracts…</div></div></div>';

    var cached = sessionStorage.getItem('cwa.dispatch');
    if (cached) { try { paintDispatch(JSON.parse(cached)); return; } catch (e) {} }

    Promise.all([
      fetch('https://api.github.com/repos/' + REPO + '/commits?per_page=6').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('https://api.github.com/repos/' + REPO + '/issues?state=open&per_page=6').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (res) {
      var data = { commits: res[0] || [], issues: res[1] || [] };
      try { sessionStorage.setItem('cwa.dispatch', JSON.stringify(data)); } catch (e) {}
      paintDispatch(data);
    });
  }
  function paintDispatch(data) {
    var ch = document.getElementById('cwa-commits'), ih = document.getElementById('cwa-issues');
    if (ch) {
      if (!data.commits || !data.commits.length) ch.innerHTML = '<div class="cwa-empty">No patches available (GitHub API rate limit or offline).</div>';
      else ch.innerHTML = '<div class="cwa-disp-list">' + data.commits.slice(0, 6).map(function (c) {
        var msg = (c.commit && c.commit.message ? c.commit.message : '').split('\n')[0];
        var who = c.commit && c.commit.author ? c.commit.author.name : 'unknown';
        var sha = c.sha ? c.sha.slice(0, 7) : '';
        return '<div class="cwa-disp-item"><a href="' + esc(c.html_url || '#') + '" target="_blank" rel="noopener">' + esc(msg) + '</a>' +
          '<div class="meta"><span class="sha">' + esc(sha) + '</span> · ' + esc(who) + '</div></div>';
      }).join('') + '</div>';
    }
    if (ih) {
      var issues = (data.issues || []).filter(function (i) { return !i.pull_request; });
      if (!issues.length) ih.innerHTML = '<div class="cwa-empty">No open contracts right now.</div>';
      else ih.innerHTML = '<div class="cwa-disp-list">' + issues.slice(0, 6).map(function (i) {
        return '<div class="cwa-disp-item"><a href="' + esc(i.html_url || '#') + '" target="_blank" rel="noopener">#' + i.number + ' ' + esc(i.title) + '</a>' +
          '<div class="meta">by ' + esc(i.user ? i.user.login : '?') + ' · ' + ((i.comments || 0)) + ' comments</div></div>';
      }).join('') + '</div>';
    }
  }

  // ------------------------------------------------------------ drag
  function makeDraggable(win, handle) {
    var down = false, dx = 0, dy = 0;
    handle.addEventListener('mousedown', function (e) {
      if (e.target.closest('.cwa-x')) return;
      down = true; var r = win.getBoundingClientRect();
      win.style.transform = 'none'; win.style.left = r.left + 'px'; win.style.top = r.top + 'px';
      dx = e.clientX - r.left; dy = e.clientY - r.top; e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!down) return;
      win.style.left = Math.max(0, Math.min(e.clientX - dx, window.innerWidth - 80)) + 'px';
      win.style.top = Math.max(0, Math.min(e.clientY - dy, window.innerHeight - 40)) + 'px';
    });
    document.addEventListener('mouseup', function () { down = false; });
  }

  // ------------------------------------------------------------ public API + feed hook
  window.__cwAcademy = {
    open: function () { toggle(true); },
    close: function () { toggle(false); },
    goOverview: function () { toggle(true); showScreen('overview'); renderOverview(); },
    goChallenge: function (id) { var c = chById(id); if (!c) return false; toggle(true); openChallenge(id); return true; },
    challengeName: function (id) { var c = chById(id); return c ? c.title : null; },
    progress: function () { return { done: CH.filter(function (c) { return isDone(c.id); }).length, total: CH.length }; },
    challenges: function () { return CH.map(function (c) { return { id: c.id, title: c.title, xp: c.xp }; }); },
    // Rich world data for the game client (THE GRID): domains + per-challenge state.
    worldData: function () {
      return {
        domains: DOMAINS.map(function (d) {
          var list = chOfDomain(d.id);
          return {
            id: d.id, icon: d.icon, name: d.name, desc: d.desc,
            done: list.filter(function (c) { return isDone(c.id); }).length,
            total: list.length,
            nodes: list.map(function (c) {
              return { id: c.id, title: c.title, tier: c.tier, xp: c.xp, credits: c.credits,
                       done: isDone(c.id), unlocked: chUnlocked(c) || isDone(c.id) };
            })
          };
        })
      };
    }
  };

  // ------------------------------------------------------------ deep-link auto-open
  function checkAutoOpen() {
    try {
      var p = new URLSearchParams(window.location.search || '');
      var launch = (p.get('launch') || '').toLowerCase();
      if (p.get('academy') === '1' || launch === 'academy') {
        setTimeout(function () { toggle(true); }, 900);
        var chId = p.get('challenge');
        if (chId && chById(chId)) setTimeout(function () { window.__cwAcademy.goChallenge(chId); }, 1300);
      }
    } catch (e) {}
  }

  // ------------------------------------------------------------ boot + hydration resilience
  ensureMounted();
  checkAutoOpen();
  document.addEventListener('DOMContentLoaded', ensureMounted, { once: true });
  window.addEventListener('load', ensureMounted, { once: true });
  setTimeout(ensureMounted, 1500);
  setInterval(function () { ensureMounted(); refreshDockProg(); }, 2000);
  try { new MutationObserver(function () { if (!document.getElementById('cwa-dock')) ensureMounted(); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
