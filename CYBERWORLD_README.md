# 🌐 CYBERWORLD: Game Implementation Guide

## Quick Start

**Play:** https://personfu.github.io/cyberworld-game.html  
**Original CTF Trail:** https://personfu.github.io/ctf-trail.html  

---

## What is CyberWorld?

CyberWorld is an **Oregon Trail-style CTF game** where you escort a fragile data convoy across a hostile internet. Instead of static challenges, you:

1. **Manage 4 interconnected resources** that drain as you progress
2. **Navigate a 20-node network** from HOME_NODE → FINAL_CORE
3. **Risk detection, cognitive load, and data integrity** to extract flags
4. **Unlock tools** by completing hackathon challenges that become essential for later nodes
5. **Face random events** between nodes that force strategic decisions
6. **Survive failure states** where mistakes block you from progressing

---

## 🎮 Game Mechanics

### Resources (Real-Time Meters)

| Resource | Purpose | Drain | Recovery |
|----------|---------|-------|----------|
| 🔋 **Bandwidth** | Limits scanning operations | Each scan/probe | Between nodes, tool unlocks |
| 🧠 **Cognitive Load** | Mental fatigue from brute-force | Wrong attempts, hints | Time between nodes, HACK nodes |
| 🕵️ **Detection Level** | Network visibility to defenders | Actions trigger alerts | Stealth strategy, time |
| 💾 **Data Integrity** | Flag corruption risk | Aggressive exploits, mistakes | Careful approach, fresh attempts |

### Failure States (Game Over Scenarios)

| Condition | Trigger | Consequence | Recovery |
|-----------|---------|-------------|----------|
| **Detection Block** | Detection > 90% | IP blocked, node resets | Wait 3 game-turns, lose 20% progress |
| **Data Corruption** | Integrity < 20% | Flags become unreadable | Re-solve challenge cleanly |
| **Cognitive Breakdown** | Cognitive Load > 95% | Hint costs +200% | Complete a HACK node for reset |

---

## 📊 20-Node Progression Map

### TIER 1: ROOKIE (Nodes 1-5) — Learn Mechanics
| # | Name | Type | Narrative | Resource Focus |
|---|------|------|-----------|-----------------|
| 1 | Signal Drift | CTF | Intercept broadcast, decode base64 | Bandwidth |
| 2 | Port Scanner Tool | HACK | Build scanner for next node | Bandwidth |
| 3 | Dead Drop | CTF | Find artifact in FTP, decode Caesar | Cognitive |
| 4 | Honeypot Listener | HACK | Deploy defensive trap | Detection |
| 5 | Ghost File | CTF | Extract steganography | Integrity |

### TIER 2: OPERATIVE (Nodes 6-10) — Increase Complexity
| # | Name | Type | Narrative | Resource Focus |
|---|------|------|-----------|-----------------|
| 6 | SQL Junction | CTF | Bypass login, firewall risk | Detection |
| 7 | Blind Mapping | HACK | Optimize 30-query DNS enum | Bandwidth |
| 8 | Cipher Breach | CTF | RSA small exponent attack | Cognitive |
| 9 | Packet Echo | HACK | Advanced Scapy sniffer | Bandwidth |
| 10 | Memory Vault | CTF | Volatility forensics | Cognitive |

### TIER 3: ELITE (Nodes 11-15) — Master Resources
| # | Name | Type | Narrative | Resource Focus |
|---|------|------|-----------|-----------------|
| 11 | CVE Dashboard | HACK | Real-time NVD API scraping | Bandwidth |
| 12 | Reverse Engineer | CTF | Ghidra binary analysis | Cognitive |
| 13 | File Monitor | HACK | FIM daemon + persistence | Cognitive |
| 14 | Threat Model | HACK | MITRE ATT&CK automation | Cognitive |
| 15 | Buffer Overflow | CTF | Classic stack smash, RIP | Integrity |

### TIER 4: CLASSIFIED (Nodes 16-20) — Perfect Execution
| # | Name | Type | Narrative | Resource Focus |
|---|------|------|-----------|-----------------|
| 16 | Advanced Sniffer | HACK | L7 filtering (HTTP/DNS/TLS) | Bandwidth |
| 17 | Obfuscation Breach | CTF | Dynamic RE vs obfuscated code | Cognitive |
| 18 | Incident Response | CTF | Log analysis + timeline | Cognitive |
| 19 🏆 | SSRF→Redis→RCE | CTF | **BOSS** — Full chain exploit | All |
| 20 🏆 | CTF Platform | HACK | **FINAL BOSS** — Build platform | All |

---

## 🔧 Tool Unlock System

Solving HACK nodes unlocks tools that reduce resource costs:

| Node | Tool | Effect |
|------|------|--------|
| 2 | 🔎 Port Scanner | Bandwidth cost -40% for scanning |
| 4 | 🛡️ Honeypot | Detection -5 for next 2 nodes |
| 7 | 🎯 Subdomain Enum | Bandwidth cost -30% for DNS |
| 9 | 📡 Packet Sniffer | Data Integrity +10 permanently |
| 11 | 📊 CVE Dashboard | Detection resistance +5 |
| 13 | 🔐 FIM | Data Integrity +20 (audit evidence) |
| 16 | 🔍 Advanced Sniffer | Cognitive Load -10 per analysis |
| 18 | 🧠 MITRE Framework | False paths -20% in RE |
| 20 | ⚙️ Master Control | All Bandwidth costs -20% |

---

## 🎲 Between-Node Random Events

After solving each challenge, one of these fires (weighted):

### 🟢 POSITIVE (30%)
- **Credential Cache Found:** +20 Bandwidth
- **Packet Loss Window:** Detection -15%
- **Legacy Backup Discovered:** +10 Data Integrity
- **Firewall Rule Override:** -5 Detection

### 🟡 NEUTRAL (40%)
- **Connection Unstable:** Next action +50% time cost
- **Cache Cleared:** Bandwidth -10%
- **Metadata Leaked:** +10 Detection
- **Rate Limit Hit:** Wait 10 seconds

### 🔴 NEGATIVE (30%)
- **Firewall Spike:** +25 Detection
- **IDS Alert:** Cognitive Load +20
- **Data Corruption Risk:** -15 Integrity
- **Timeout Cascade:** Bandwidth → 50%

---

## 🎯 Challenge Design Philosophy

### Before CyberWorld
```
Challenge: "Here is Base64 ciphertext. Decode it."
Engagement: Copy → Paste → Done (1 minute)
Learning: Minimal
```

### After CyberWorld
```
Scenario: "Intercept live stream on port 4444 (5-second window)"
Content: Multiple lines, only 1 valid; noise mixed in
Player Must: Identify pattern, decode, extract flag manually
Engagement: Signal analysis + time pressure + consequence
Learning: Real network interception, stream parsing
```

---

## 🏗️ Technical Implementation

### Dynamic Flag Generation
All flags are **procedurally generated at runtime** per session:

```javascript
function generateSessionFlags() {
  CHALLENGES.forEach(ch => {
    GAME_STATE.sessionFlags[ch.id] = ch.generateFlag();
  });
}
```

This prevents:
- Spoilers in page source
- Hardcoded flag leaks
- Allows daily/weekly flag rotation

### Resource State Machine
```
Player Action → Resource Cost Calculation →
  Check Thresholds (>90 Detection? <20 Integrity?) →
  Trigger Failure State if violated →
  Update Meters in Real-Time →
  Log Event to Incident Feed
```

### Challenge State Progression
```
Load Node → Display Narrative & Scenario →
  Player Submits Answer →
  Validate Against Session Flag →
  Award XP + Update Resource Drains →
  Check Victory (20/20 nodes?) →
  Show Next Button if Solved
```

---

## 📈 Progression Curve

| Tier | Nodes | Avg XP/Node | Resource Drain | Difficulty |
|------|-------|-------------|-----------------|------------|
| Rookie | 1-5 | 130 | Low | Intro mechanics |
| Operative | 6-10 | 171 | Medium | Complexity rises |
| Elite | 11-15 | 230 | High | Precision required |
| Classified | 16-20 | 270 | Critical | Perfect execution |

**Total XP:** ~4,400 across all 20 nodes

---

## 🎨 UI/UX Architecture

### Header (Fixed, Always Visible)
- Title: "🌐 CYBERWORLD — Data Convoy Escort"
- Real-time resource meters with percentage fills
- Live status indicator

### Main Layout (Responsive 2-column)
**LEFT SIDEBAR (300px)**
- 📡 Network Map (clickable nodes)
- 🔧 Tools Grid (unlocked tools tracker)

**RIGHT MAIN AREA (1fr)**
- Challenge panel (narrative + scenario + flag input)
- Walkthrough section (collapsible)
- Event log (real-time incidents)

### Bottom
- Taskbar with quick links
- Clock

### Mobile
- Single column layout
- Sticky sidebar
- Compact meters

---

## 🚀 Phase 2: Subscriber Tier (80+ Nodes)

Future expansion with:

**Tier 5 (Real Exploits):** CVE-2024 variants, LLM jailbreaks  
**Tier 6 (APT Simulation):** Multi-stage attack chains  
**Tier 7 (Defense Evasion):** OSINT obfuscation, C2 infrastructure  
**Tier 8 (Threat Intel):** Real-world TTPs from advisories  
**Tier 9 (Incident Response):** Forensic analysis at scale  
**Tier 10 (System Masters):** Building resilient infrastructure  

---

## 📝 Development Timeline

**Phase 1a (DONE):** Architecture + UI Framework  
**Phase 1b (IN PROGRESS):** Resource System + Game State  
**Phase 1c (TODO):** Challenge Balancing + Beta Testing  
**Phase 1d (TODO):** Random Events + Polish  
**Phase 2 (TODO Month 2):** 80+ Advanced Nodes  
**Phase 3 (TODO Month 3):** Leaderboards + Daily Challenges  

---

## 🎭 Narrative Breakpoints (Story Beats)

**After Node 5 (End Rookie):**
> "You've made first contact. The network knows you're here. Next tier requires PRECISION. Mistakes will be noticed."

**After Node 10 (Mid-Game):**
> "CLASSIFIED ALERT: Defenders are adapting. Your patterns are being studied. Deep nodes ahead are MONITORED."

**After Node 15 (Pre-Boss):**
> "One final gauntlet. Core systems are FORTIFIED. One IP block = MISSION FAILURE."

**After Node 20 (Victory):**
> "DATA EXFILTRATED. Operative safely out of hostile cyberspace. FURIOS-INT debriefing scheduled. Well done."

---

## 🧠 For Educators

CyberWorld teaches:
1. **Systems Thinking** — Resource management across a complex system
2. **Risk vs Reward** — Each action has consequence trade-offs
3. **Technical Depth** — Real tools (Ghidra, Volatility, Scapy, Flask)
4. **Strategic Planning** — Which nodes matter most? Minimize detection?
5. **Incident Response** — Timeline reconstruction, forensics
6. **Defense Mindset** — Build tools before they're needed (FIM, honeypot)

---

## 🔗 Files

- **cyberworld-game.html** — Main game (20 nodes, all mechanics)
- **ctf-trail.html** — Original linear CTF trail (preserved)
- **cyberworld-design.md** — Full design document
- **index.html** — Main landing page with desktop icons

---

## 🎯 Success Metrics

Player demonstrates:
✅ Strategic thinking (resource allocation)  
✅ Technical skills (CTF + hackathon challenges)  
✅ Persistence (manages detection/fatigue/corruption)  
✅ Creativity (discovers exploit chains vs copy-paste)  
✅ Learning (uses hints strategically, improves efficiency)  

---

**Ready to operate?**

Start mission at: https://personfu.github.io/cyberworld-game.html
