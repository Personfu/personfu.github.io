/* =============================================================
 *  mission-extras.js  ·  FLLC mission enrichment layer
 * -------------------------------------------------------------
 *  Decorates WAR_GAMES / FORENSICS / RED_OPS mission cards with
 *  MITRE ATT&CK technique chips and tool references — without
 *  touching the original engine or mission databases.
 *
 *  Drop into a page AFTER wargames-engine.js + WG.init().
 *  Pass {scope:'wargames'|'forensics'|'redops'} to MissionExtras.attach
 *  along with the mountId. Keeps appearance identical when no extras
 *  are defined for a given mission id.
 * ============================================================= */
(function () {
  'use strict';

  // ----- Extra metadata keyed by mission id (id is unique per scope) -----
  // Schema: { mitre:[{id,name}], tools:[string], links:[{label,href}], lab_real:string }
  var EXTRAS = {
    // ---------- WAR_GAMES (m01-m12) ----------
    m01: { mitre:[{id:'T1592.004',name:'Gather Victim Host Information: Client Configurations'}], tools:['view-source:','curl -s','grep'], links:[{label:'OWASP A05',href:'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/'}] },
    m02: { mitre:[{id:'T1078',name:'Valid Accounts'},{id:'T1190',name:'Exploit Public-Facing Application'}], tools:['Burp Suite','curl --data','PHP CLI'], links:[{label:'OWASP A07',href:'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/'}] },
    m03: { mitre:[{id:'T1083',name:'File and Directory Discovery'},{id:'T1190',name:'Exploit Public-Facing Application'}], tools:['ffuf','wfuzz','curl'], links:[{label:'OWASP A01 — LFI',href:'https://owasp.org/www-community/attacks/Path_Traversal'}] },
    m04: { mitre:[{id:'T1059.007',name:'Command and Scripting Interpreter: JavaScript'}], tools:['DevTools Console','jsbeautifier','crypto.subtle'], links:[{label:'PortSwigger XSS',href:'https://portswigger.net/web-security/cross-site-scripting'}] },
    m05: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'},{id:'T1505.003',name:'Server Software Component: Web Shell'}], tools:['sqlmap','Burp Repeater','UNION SELECT'], links:[{label:'PortSwigger SQLi',href:'https://portswigger.net/web-security/sql-injection'}] },
    m06: { mitre:[{id:'T1059.007',name:'Command and Scripting Interpreter: JavaScript'}], tools:['Burp','XSS Hunter','BeEF'], links:[{label:'OWASP XSS',href:'https://owasp.org/www-community/attacks/xss/'}] },
    m07: { mitre:[{id:'T1110.001',name:'Brute Force: Password Guessing'}], tools:['hydra','wfuzz','crackmapexec'], links:[{label:'PortSwigger',href:'https://portswigger.net/web-security/authentication/password-based'}] },
    m08: { mitre:[{id:'T1027',name:'Obfuscated Files or Information'},{id:'T1140',name:'Deobfuscate/Decode Files'}], tools:['CyberChef','xxd','python -c'], links:[{label:'CyberChef',href:'https://gchq.github.io/CyberChef/'}] },
    m09: { mitre:[{id:'T1552.001',name:'Unsecured Credentials: Credentials In Files'},{id:'T1213.003',name:'Data from Information Repositories: Code Repositories'}], tools:['gitleaks','trufflehog','git log -p'], links:[{label:'gitleaks',href:'https://github.com/gitleaks/gitleaks'}] },
    m10: { mitre:[{id:'T1556.005',name:'Modify Authentication Process: Reversible Encryption'}], tools:['jwt_tool','python jose','hashcat -m 16500'], links:[{label:'PortSwigger JWT',href:'https://portswigger.net/web-security/jwt'}] },
    m11: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'},{id:'T1090.001',name:'Proxy: Internal Proxy'}], tools:['Burp Collaborator','curl gopher://','SSRF Sheriff'], links:[{label:'OWASP A10 — SSRF',href:'https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/'}] },
    m12: { mitre:[{id:'T1611',name:'Escape to Host'},{id:'T1068',name:'Exploit for Privilege Escalation'}], tools:['gtfobins','LinPEAS','linux-exploit-suggester'], links:[{label:'GTFOBins',href:'https://gtfobins.github.io/'}] },

    // ---------- FORENSICS (f01-f12) ----------
    f01: { mitre:[{id:'T1071.001',name:'Application Layer Protocol: Web Protocols'}], tools:['Wireshark','tshark -Y','NetworkMiner'] },
    f02: { mitre:[{id:'T1110.003',name:'Brute Force: Password Spraying'}], tools:['journalctl','grep auth.log','lnav'] },
    f03: { mitre:[{id:'T1059.004',name:'Command and Scripting Interpreter: Unix Shell'}], tools:['~/.bash_history','HISTTIMEFORMAT','auditd'] },
    f04: { mitre:[{id:'T1547.001',name:'Boot or Logon Autostart Execution: Registry Run Keys'}], tools:['Autopsy','RegRipper','MFTECmd'] },
    f05: { mitre:[{id:'T1213',name:'Data from Information Repositories'}], tools:['sqlite3','undark','sqliteparser'] },
    f06: { mitre:[{id:'T1071.004',name:'Application Layer Protocol: DNS'}], tools:['Zeek','passivedns','tshark -Y "dns"'] },
    f07: { mitre:[{id:'T1003.001',name:'OS Credential Dumping: LSASS Memory'}], tools:['Volatility 3','vol -f mem.raw windows.malfind','pypykatz'] },
    f08: { mitre:[{id:'T1485',name:'Data Destruction'}], tools:['fls','icat','tsk_recover'] },
    f09: { mitre:[{id:'T1027.002',name:'Obfuscated Files or Information: Software Packing'}], tools:['CAPA','Detect It Easy','ghidra'] },
    f10: { mitre:[{id:'T1059.001',name:'Command and Scripting Interpreter: PowerShell'}], tools:['EVTX-Hammer','Hayabusa','Sigma'] },
    f11: { mitre:[{id:'T1218.011',name:'System Binary Proxy Execution: Rundll32'}], tools:['YARA','capa','strings -n 8'] },
    f12: { mitre:[{id:'T1486',name:'Data Encrypted for Impact'}], tools:['hayabusa','pestudio','x64dbg'] },

    // ---------- RED_OPS (r01-r12) ----------
    r01: { mitre:[{id:'T1595.002',name:'Active Scanning: Vulnerability Scanning'}], tools:['nmap -sV','rustscan','nuclei -t cves/'] },
    r02: { mitre:[{id:'T1078',name:'Valid Accounts'}], tools:['Burp Suite','hydra','crackmapexec'] },
    r03: { mitre:[{id:'T1556',name:'Modify Authentication Process'}], tools:['jwt_tool','python jose','Burp Repeater'] },
    r04: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'},{id:'T1090.001',name:'Proxy: Internal Proxy'}], tools:['Burp Collaborator','curl gopher://','SSRF Sheriff'] },
    r05: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'}], tools:['XXEinjector','Burp','curl --data-binary'] },
    r06: { mitre:[{id:'T1059.007',name:'Command and Scripting Interpreter: JavaScript'}], tools:['XSStrike','dalfox','BeEF'] },
    r07: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'}], tools:['tplmap','sstimap','Burp'] },
    r08: { mitre:[{id:'T1505.003',name:'Server Software Component: Web Shell'}], tools:['sqlmap --os-shell','weevely','msfvenom'] },
    r09: { mitre:[{id:'T1059.007',name:'Command and Scripting Interpreter: JavaScript'}], tools:['Burp','prototype-pollution-PoC','Node.js debug'] },
    r10: { mitre:[{id:'T1059',name:'Command and Scripting Interpreter'}], tools:['ysoserial','marshalsec','PHPGGC'] },
    r11: { mitre:[{id:'T1059.001',name:'Command and Scripting Interpreter: PowerShell'}], tools:['ysoserial.net','SharpHound','Rubeus'] },
    r12: { mitre:[{id:'T1558.003',name:'Steal or Forge Kerberos Tickets: Kerberoasting'},{id:'T1003.006',name:'OS Credential Dumping: DCSync'}], tools:['Rubeus','mimikatz','BloodHound'] },

    // ---------- CTF_TRAIL (n01-n20 — story nodes) ----------
    n01: { mitre:[{id:'T1592',name:'Gather Victim Host Information'}], tools:['theHarvester','recon-ng','Maltego'] },
    n02: { mitre:[{id:'T1071.001',name:'Application Layer Protocol: Web Protocols'}], tools:['ffuf','gobuster','wfuzz'] },
    n03: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'}], tools:['nuclei','Burp','sqlmap'] },
    n04: { mitre:[{id:'T1556',name:'Modify Authentication Process'}], tools:['jwt_tool','python jose'] },
    n05: { mitre:[{id:'T1110',name:'Brute Force'}], tools:['hydra','medusa','patator'] },
    n06: { mitre:[{id:'T1190',name:'Exploit Public-Facing Application'},{id:'T1059.007',name:'Command and Scripting Interpreter: JavaScript'}], tools:['Burp','sqlmap','xsshunter'] },
    n07: { mitre:[{id:'T1046',name:'Network Service Discovery'}], tools:['nmap','masscan','rustscan'] },
    n08: { mitre:[{id:'T1552.004',name:'Unsecured Credentials: Private Keys'}], tools:['RsaCtfTool','openssl','sage'] },
    n09: { mitre:[{id:'T1574.001',name:'Hijack Execution Flow: DLL Search Order'}], tools:['ProcMon','Procexp','Sysinternals'] },
    n10: { mitre:[{id:'T1027',name:'Obfuscated Files or Information'}], tools:['CyberChef','Ghidra','strings'] },
    n11: { mitre:[{id:'T1083',name:'File and Directory Discovery'},{id:'T1005',name:'Data from Local System'}], tools:['Volatility 3','rekall','autopsy'] },
    n12: { mitre:[{id:'T1003.001',name:'OS Credential Dumping: LSASS Memory'}], tools:['mimikatz','pypykatz','procdump'] },
    n13: { mitre:[{id:'T1071.004',name:'Application Layer Protocol: DNS'}], tools:['Wireshark','tshark','dnscat2'] },
    n14: { mitre:[{id:'T1505.003',name:'Server Software Component: Web Shell'}], tools:['weevely','antSword','msfvenom'] },
    n15: { mitre:[{id:'T1486',name:'Data Encrypted for Impact'}], tools:['no-more-ransom','volatility','YARA'] },
    n16: { mitre:[{id:'T1611',name:'Escape to Host'}], tools:['cdk','botb','kdigger'] },
    n17: { mitre:[{id:'T1496',name:'Resource Hijacking'}], tools:['kubescape','peirates','kube-hunter'] },
    n18: { mitre:[{id:'T1098.001',name:'Account Manipulation: Additional Cloud Credentials'}], tools:['ScoutSuite','Pacu','aws-cli'] },
    n19: { mitre:[{id:'T1041',name:'Exfiltration Over C2 Channel'}], tools:['Cobalt Strike sim','Sliver','Mythic'] },
    n20: { mitre:[{id:'T1499',name:'Endpoint Denial of Service'},{id:'T1190',name:'Exploit Public-Facing Application'}], tools:['Caldera','Atomic Red Team','PurpleSharp'] }
  };

  var STYLE_INJECTED = false;
  function injectStyles() {
    if (STYLE_INJECTED) return; STYLE_INJECTED = true;
    var s = document.createElement('style');
    s.textContent = [
      '.mx-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;align-items:center;}',
      '.mx-lbl{font-family:"VT323",monospace;font-size:11px;letter-spacing:1px;color:#7c9aa3;margin-right:4px;}',
      '.mx-att{font-family:"VT323",monospace;font-size:11px;padding:1px 5px;border:1px solid rgba(0,232,255,0.35);color:#00e8ff;text-decoration:none;letter-spacing:0.5px;}',
      '.mx-att:hover{background:rgba(0,232,255,0.12);border-color:#00e8ff;}',
      '.mx-tool{font-family:"VT323",monospace;font-size:11px;padding:1px 5px;border:1px dashed rgba(0,255,65,0.3);color:#00ff41;letter-spacing:0.5px;}',
      '.mx-link{font-family:"VT323",monospace;font-size:11px;padding:1px 5px;border:1px solid rgba(255,0,234,0.35);color:#ff00ea;text-decoration:none;letter-spacing:0.5px;}',
      '.mx-link:hover{background:rgba(255,0,234,0.12);}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildAttCkLink(id) {
    // ATT&CK URLs: https://attack.mitre.org/techniques/T1078/  or  /T1078/001 (sub-technique)
    var parts = id.split('.');
    var path = parts[0];
    if (parts.length === 2) path += '/' + parts[1];
    return 'https://attack.mitre.org/techniques/' + path + '/';
  }

  function decorateCard(card) {
    if (!card || card.dataset.mxDone) return;
    var mid = card.dataset.mid; if (!mid) return;
    var ex = EXTRAS[mid]; if (!ex) { card.dataset.mxDone = '1'; return; }
    card.dataset.mxDone = '1';

    var anchor = card.querySelector('.wg-mmeta');
    if (!anchor) return;

    // MITRE row
    if (ex.mitre && ex.mitre.length) {
      var row = document.createElement('div'); row.className = 'mx-row';
      var lbl = document.createElement('span'); lbl.className = 'mx-lbl'; lbl.textContent = 'MITRE_ATT&CK';
      row.appendChild(lbl);
      ex.mitre.forEach(function (t) {
        var a = document.createElement('a');
        a.className = 'mx-att'; a.href = buildAttCkLink(t.id);
        a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = t.id;
        a.title = t.name;
        row.appendChild(a);
      });
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
      anchor = row;
    }
    // Tools row
    if (ex.tools && ex.tools.length) {
      var row2 = document.createElement('div'); row2.className = 'mx-row';
      var lbl2 = document.createElement('span'); lbl2.className = 'mx-lbl'; lbl2.textContent = 'TOOLING';
      row2.appendChild(lbl2);
      ex.tools.forEach(function (t) {
        var sp = document.createElement('span'); sp.className = 'mx-tool'; sp.textContent = t;
        row2.appendChild(sp);
      });
      anchor.parentNode.insertBefore(row2, anchor.nextSibling);
      anchor = row2;
    }
    // External links row
    if (ex.links && ex.links.length) {
      var row3 = document.createElement('div'); row3.className = 'mx-row';
      var lbl3 = document.createElement('span'); lbl3.className = 'mx-lbl'; lbl3.textContent = 'REF';
      row3.appendChild(lbl3);
      ex.links.forEach(function (l) {
        var a = document.createElement('a'); a.className = 'mx-link';
        a.href = l.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = l.label; row3.appendChild(a);
      });
      anchor.parentNode.insertBefore(row3, anchor.nextSibling);
    }
  }

  function decorateAll(root) {
    var cards = (root || document).querySelectorAll('.wg-mission[data-mid]');
    cards.forEach(decorateCard);
  }

  function attach(opts) {
    injectStyles();
    var mount = (opts && opts.mountId) ? document.getElementById(opts.mountId) : document.body;
    if (!mount) return;
    decorateAll(mount);
    // observe for re-renders
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('wg-mission')) decorateCard(n);
          else decorateAll(n);
        });
      });
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  // Auto-attach if a mission mount id appears as a global hint
  document.addEventListener('DOMContentLoaded', function () {
    injectStyles();
    // common mount ids used across pages
    ['wg-mission-mount','fx-mount','rx-mount'].forEach(function (id) {
      if (document.getElementById(id)) attach({ mountId: id });
    });
  });

  window.MissionExtras = { attach: attach, EXTRAS: EXTRAS };
})();
