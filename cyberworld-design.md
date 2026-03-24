# 🌐 CYBERWORLD: Complete Game Design Document

## Executive Summary
CyberWorld transforms CTF Trail from a linear challenge list into an **Oregon Trail-style survival game** where players manage resources while escorting data through a hostile internet. The core loop: **Recon → Decide → Risk Resources → Extract Intel → Advance**.

---

## 📋 Core Game Story

**Year:** 2030  
**Setting:** Post-quantum internet with legacy systems, AI filters, and old CVEs as weapons  
**Player Role:** Data Smuggler / Threat Operator  
**Objective:** Complete 20 nodes to escort data convoy to "EXFIL POINT" (final core)

**Narrative Arc:**
1. **Act I (Nodes 1-5):** Rookie tier - learn mechanics, discover signal interception  
2. **Act II (Nodes 6-15):** Operative tier - manage complexity, risk increases  
3. **Act III (Nodes 16-20):** Elite tier - perfect resource management or fail  

---

## 🎮 Core Game Loop (4 Steps)

```
1. ARRIVE AT NODE → Scenario briefing + environment setup
2. CHOOSE STRATEGY → Risk/Time/Detection tradeoff
3. EXTRACT FLAG → Execute task (must learn/solve)
4. SUFFER CONSEQUENCES → Resource drain, random events, detection rise
```

---

## 💎 Resources System

Players manage **4 interlinked resources** (displayed as meters):

### 🔋 Bandwidth (0-100)
- Limits scanning operations per node
- Resets partially between nodes
- **Risk:** Exceed = connection throttled, slow operations
- **Source:** Upgraded nodes, tool unlocks

### 🧠 Cognitive Load (0-100)
- Mental fatigue from repeated brute-force/analysis
- Accumulates across nodes
- **Risk:** >80 = mistakes (wrong flag attempts penalty)
- **Recovery:** Between-node downtime, narrative breaks

### 🕵️ Detection Level (0-100)
- Network visibility to defenders
- Some actions trigger detection spikes
- **Risk:** >75 = firewall activation (IP blocked)
- **Consequence:** Retry node from scratch
- **Recovery:** Use stealth strategies, wait between nodes

### 💾 Data Integrity (0-100)
- Flag corruption risk
- Some exploits/scans damage integrity
- **Risk:** <30 = flag becomes unreadable (garbage characters)
- **Source:** Careful approach vs aggressive attacks

---

## 🗺️ 20-Node Progression Map

### TIER 1: ROOKIE (Nodes 1-5, XP 100-160)

| Node | Type | Challenge | Narrative | Resource Focus |
|------|------|-----------|-----------|-----------------|
| 1 | CTF | Signal Drift | Intercept live stream on port 4444, stream cuts in 5s | Bandwidth |
| 2 | HACK | Port Scanner Tool | Build scanner for next node's subscan | Bandwidth |
| 3 | CTF | Dead Drop | Explore FTP dir, find flag artifact amid junk | Cognitive |
| 4 | HACK | Honeypot Listener | Deploy for defense training | Detection |
| 5 | CTF | Image Forensics | Extract steg data from compromised workstation | Integrity |

### TIER 2: OPERATIVE (Nodes 6-10, XP 150-200)

| Node | Type | Challenge | Narrative | Resource Focus |
|------|------|-----------|-----------|-----------------|
| 6 | CTF | SQL Injection | Bypass login on legacy DB, firewall + detection risk | Detection |
| 7 | HACK | Subdomain Enumerator | Optimize for stealth (limited requests) | Bandwidth |
| 8 | CTF | Buffer Overflow | Pwn binary, integrity loss if mistake | Integrity |
| 9 | HACK | Packet Sniffer | Build to intercept next node's traffic | Bandwidth |
| 10 | CTF | RSA Small Exponent | Recover plaintext from e=3 encryption | Cognitive |

### TIER 3: ELITE (Nodes 11-15, XP 195-270)

| Node | Type | Challenge | Narrative | Resource Focus |
|------|------|-----------|-----------|-----------------|
| 11 | CTF | Memory Forensics | Volatility analysis of dump, multiple wrong paths | Cognitive |
| 12 | HACK | CVE Dashboard | Real-time API scrape + filtering | Bandwidth |
| 13 | CTF | Reverse Engineering | Ghidra/strings analysis, detection if brute too hard | Detection |
| 14 | HACK | File Integrity Monitor | Blue team defense tool | Cognitive |
| 15 | CTF | Crypto Vault | Advanced RSA attacks, timing matters | Cognitive |

### TIER 4: CLASSIFIED (Nodes 16-20, XP 240-350)

| Node | Type | Challenge | Narrative | Resource Focus |
|------|------|-----------|-----------|-----------------|
| 16 | HACK | Packet Sniffer | Advanced Scapy with filtering | Bandwidth |
| 17 | CTF | Reverse Shell | Binary RE with obfuscation | Cognitive |
| 18 | HACK | MITRE ATT&CK Report | Threat intelligence automation | Cognitive |
| 19 | CTF | SSRF→Redis→RCE | **BOSS NODE** - Full chain, detection critical | All |
| 20 | HACK | CTF Platform | **FINAL BOSS** - Build working platform | All |

---

## 🎲 Between-Node Events (Random Encounters)

Triggered after solving each challenge:

### 🟢 Positive Events (30% chance)
- **Credential Cache Found:** +20 Bandwidth  
- **Packet Loss Window:** Detection meter drops 15%  
- **Legacy Backup Discovered:** +10 Data Integrity  
- **Firewall Rule Override:** -5 Detection for 2 turns

### 🟡 Neutral Events (40% chance)
- **Connection Unstable:** Next action takes +50% time  
- **Cache Cleared:** Lose 10% current Bandwidth  
- **Metadata Leaked:** +10 Detection  
- **API Rate Limit Hit:** Must wait 10 seconds

### 🔴 Negative Events (30% chance)
- **Firewall Spike:** +25 Detection immediately  
- **Intrusion Detection Alert:** Cognitive Load +20  
- **Data Corruption:** -15 Data Integrity  
- **Timeout Cascade:** Bandwidth drops to 50%

---

## 🔓 Tool Unlock System (Progressive Capabilities)

Players unlock tools by solving hackathon challenges:

| Challenge | Tool | Effect |
|-----------|------|--------|
| Challenge 2 | 🔎 Port Scanner | Unlock port scanning (Bandwidth cost reduced 40%) |
| Challenge 4 | 🛡️ Honeypot | Deploy trap nodes (Detection -5 for next 2 nodes) |
| Challenge 6 | 🌐 REST API | Build custom integrations (Bandwidth +15 permanently) |
| Challenge 7 | 🎯 Subdomain Enum | Fast DNS recon (Bandwidth cost reduced 30%) |
| Challenge 9 | 📡 Packet Sniffer | Deep packet inspection (Integrity +10 permanently) |
| Challenge 12 | 📊 CVE Dashboard | Real-time vuln scanning (Detection resistance +5) |
| Challenge 14 | 🔐 FIM | File monitoring (Integrity audit, +20 Data Integrity) |
| Challenge 16 | 🔍 Advanced Sniffer | L7 filtering (Cognitive Load -10 per complex analysis) |
| Challenge 18 | 🧠 MITRE Framework | Threat modeling (Reduce false paths in RE challenges) |
| Challenge 20 | ⚙️ Master Control | Platform automation (All Bandwidth costs -20%) |

---

## ⚡ Failure States & Consequences

### 🚫 Detection Blocked (>90 Detection)
- **Trigger:** Player hits >90 Detection
- **Consequence:** "IP BLOCKED — ISP resets connection"
- **Effect:** Must restart current node, lose 20% progress
- **Recovery:** Wait 3 game-turns before retry

### 💥 Data Corruption (Integrity <20)
- **Trigger:** Flag corruption accumulates
- **Consequence:** Flag becomes unreadable gibberish
- **Effect:** Correct flag no longer accepted
- **Recovery:** Re-solve challenge cleanly (fresh attempt)

### 🧠 Cognitive Breakdown (>95 Cognitive Load)
- **Trigger:** Too many failed attempts
- **Consequence:** "DECISION FATIGUE — Operative disoriented"
- **Effect:** All hint costs +200% for next 2 nodes
- **Recovery:** Complete a HACK node for mental reset

### ⏱️ Timeout (No progress in 60 seconds)
- **Trigger:** Inactivity
- **Consequence:** "Connection dropout — signal lost"
- **Effect:** Lose current node session, node repeats with -50% flag time
- **Recovery:** Reconnect (click node again)

---

## 🎯 Challenge Redesign Philosophy

**OLD:** Copy-paste mechanics  
**NEW:** Discovery + Consequence

### Challenge 1: Signal Drift (was Base64 Intercept)
- **OLD:** "Here's base64, decode it"
- **NEW:** 
  - Stream broadcasts on port 4444 for 5 real seconds
  - Multiple lines transmitted
  - Only one line contains valid base64
  - Noise + garbage data mixed in
  - Player must identify + decode manually or with pipeline
  - **Consequence:** Miss the window = Bandwidth spike detected

### Challenge 3: Dead Drop (was Caesar Cipher)
- **OLD:** "Brute force all shifts"
- **NEW:**
  - FTP directory listing with 20 files
  - Only ONE file is relevant intelligence
  - Other files are decoys / misleading
  - Player explores, identifies artifact
  - Then cracks cipher on FOUND file
  - **Consequence:** Trigger too many scans = Detection rises

### Challenge 19: SSRF→Redis→RCE (Redesigned)
- **OLD:** "Execute these exact curl commands"
- **NEW:**
  - SSRF vulnerability confirmed
  - Redis port confirmed internally
  - Player must DISCOVER exploit chain:
    - Set webroot via CONFIG
    - Write PHP payload
    - Configure persistence
    - Save DB
    - Access shell
  - Each step risks detection
  - Wrong order = service crash (restart node)
  - **Consequence:** Perfect execution = victory; mistakes = reset

---

## 🖥️ UI/UX Layout

### Header Section (Fixed, Always Visible)
```
[⚔️ CYBERWORLD OPERATOR CONSOLE]
┌─────────────────────────────────────────────────┐
│ Resource Meters (Real-time)                      │
│  🔋 BW: [████░░░░░] 60%     🕵️ DET: [██░░░░░░░] 20%
│  🧠 COG: [████░░░░░] 45%    💾 INT: [██████░░░░] 60%
└─────────────────────────────────────────────────┘
│ Detection Alert: [████░░░░░] 20% | STATUS: CLEAR
└─────────────────────────────────────────────────┘
```

### Main Game Area (2 Columns)

**LEFT COLUMN: Network Map**
```
[HOME_NODE] → [ISP_BACKBONE] → [GOV_ARCHIVE] → [DARK_RELAY] → [FINAL_CORE]
   ✅ CLEAR       🔴 CURRENT       ⚠️ DANGER       🔒 LOCKED      🔒 LOCKED
```

**RIGHT COLUMN: Challenge + Terminal**
```
┌─ ACTIVE NODE: 03_DEAD_DROP ─────────────────┐
│                                               │
│ [Narrative + Scenario Description]            │
│                                               │
│ ┌─ TERMINAL ──────────────────────────────┐ │
│ │ $ Waiting for your input...              │ │
│ │ > _                                      │ │ 
│ │ (Flag input below)                       │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ [Submit Flag] [Hint] [Walkthrough]            │
│                                               │
│ 🟢 Event Feed:                                │
│ • Flag captured: +160 XP                      │
│ • Detection spike: +5 (suspicious scanning)   │
│ • Next node available                         │
└───────────────────────────────────────────────┘
```

### Bottom Panel: Event Feed (Live Log)
```
[📡 INCIDENT LOG // Realtime Stream]
14:23:15 [INFO] Node 3 cleared. +160 XP
14:23:42 [WARN] Detection spike detected: +15 from scanning
14:24:10 [EVENT] 🟢 Credential cache discovered | +20 Bandwidth
14:24:15 [INFO] Moving to Node 4...
```

---

## 📊 Progression Stats

After each node, show:
- **Flags Captured:** X/20
- **Total XP:** Y/4145
- **Resources Used:** Bandwidth, Cognitive, Detection, Integrity costs
- **Events Triggered:** Random encounters that fired
- **Between-Node Choices:** (Option 1: Go Stealth | Option 2: Go Loud | Option 3: Pivot Route)

---

## 🧰 Hackathon Integration

Hackathon challenges **ARE survival gear**, not just extra tasks:

**Node 2 (Port Scanner)** → Unlocks "Fast Recon" for Node 7  
**Node 4 (Honeypot)** → Unlocks "Defense Warning" (Detection -5 on tactical retreat)  
**Node 6 (REST API)** → Unlocks "Custom Integ" (build one-off scripts efficiently)  
**Node 9 (Sniffer)** → Unlocks "L2-L7 Analysis" (see attack patterns)  
**Node 12 (CVE Dashboard)** → Unlocks "Vuln Library" (identify exploitable services)  
**Node 14 (FIM)** → Unlocks "Audit Evidence" (prove clean exfil)  
**Node 16 (Advanced Sniffer)** → Unlocks "Deep Inspect" (bypass obfuscation)  
**Node 18 (MITRE)** → Unlocks "Threat Model" (optimize attack chain)  
**Node 20 (Platform)** → Unlocks "Master Control" (unlimited Bandwidth for future runs)

---

## 🔐 Dynamic Flag System

**Instead of hardcoded flags, generate them at runtime:**

```javascript
// Example for Node 1: Signal Drift
function generateSignalDriftFlag() {
  const adjectives = ['QUANTUM', 'CIPHER', 'GHOST', 'SHADOW', 'ZERO'];
  const nouns = ['DRIFT', 'SURGE', 'PULSE', 'FLUX', 'CASCADE'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `FLAG{${adj}_${noun}_${Date.now() % 99999}}`;
}

// Server-side stores in session:
sessionFlags = {
  node_1: generateSignalDriftFlag(),
  node_3: generateDeadDropFlag(),
  ...
};

// Client submits answer, server validates against session flag
```

This allows:
- Hints that are **relative** ("third word should be QUANTUM variant")
- Prevents flag spoiling in view-source
- Enables daily/weekly flag rotation

---

## 📈 XP & Difficulty Scaling

**Rookie (1-5):** 100-160 XP per node | Low resource drain  
**Operative (6-10):** 150-200 XP per node | Medium drain  
**Elite (11-15):** 195-270 XP per node | High drain  
**Classified (16-20):** 240-350 XP per node | Critical drain  

**Bonus XP for:**
- Solving with <30% hint usage: +25% XP
- No detection spikes: +15% XP
- Resource efficiency: +10% XP

---

## 🎬 Narrative Breakpoints

Story beats between tiers:

**After Node 5 (End Rookie):**
> "You've made first contact. The network knows you're here. Next tier requires PRECISION. Mistakes will be noticed."

**After Node 10 (Mid-Game):**
> "CLASSIFIED ALERT: Defenders are adapting. Your patterns are being studied. The deep nodes ahead are monitored."

**After Node 15 (Pre-Boss):**
> "One final gauntlet. The core systems are fortified. **One IP block = mission failure.** Ready?"

**Node 19-20 (Final Gauntlet):**
> "You've reached the hardened core. Deploy all tools. This is EXFIL or nothing."

**Victory (All 20 Complete):**
> "DATA EXFILTRATED. Operative safely out of hostile cyberspace. FURIOS-INT debriefing scheduled. Well done."

---

## 🚀 Phase 2: 80 More Nodes (Subscriber Tier)

After core 20, unlock subscriber/advanced path with 80+ new challenges:

- **Tier 5 (Real Exploits):** CVE-2024 variants (LLM jailbreaks, browser vulns)
- **Tier 6 (APT Simulation):** Multi-stage attack chains
- **Tier 7 (Defense Evasion):** OSINT obfuscation, C2 infrastructure
- **Tier 8 (Threat Intel):** Real-world TTPs from public advisories
- **Tier 9 (Incident Response):** Forensic analysis at scale
- **Tier 10 (System Masters):** Building resilient infrastructure

---

## 🎭 Windows 98 Cyberpunk Aesthetic

- **Colors:** Cyan (#00e8ff), Green (#00ff41), Pink (#ff00ea), Orange (#ffa500), Red (#ff4444)
- **Fonts:** VT323 (retro terminal), Pixelify Sans (title), JetBrains Mono (code)
- **Effects:** CRT scanlines, glitch animations, neon glow text-shadow
- **Audio:** 8-bit chiptune background (optional), terminal beep sounds
- **UI Elements:** Windows 98 taskbar aesthetic, beveled buttons, system fonts

---

## ✅ Success Metrics

Player demonstrates:
1. **Strategic thinking** (resource allocation across 20 nodes)
2. **Technical skills** (solves CTF + builds HACK tools)
3. **Persistence** (manages detection/fatigue/corruption)
4. **Creativity** (discovers exploit chains, not just copy-paste)
5. **Learning** (uses hints strategically, improves efficiency)

---

## 📝 Implementation Roadmap

**Phase 1a (Week 1):** Architecture + UI Framework  
**Phase 1b (Week 2):** Resource System + Game State  
**Phase 1c (Week 3):** Challenge Remapping + Dynamic Flags  
**Phase 1d (Week 4):** Events + Failure States + Polish  
**Phase 2 (Month 2):** 80+ Advanced Nodes + Subscriber Features  
**Phase 3 (Month 3):** Leaderboards + Daily Challenges + Community Challenges  

---

This is CYBERWORLD. Ready to operate?
