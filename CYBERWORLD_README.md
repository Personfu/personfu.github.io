# CYBERWORLD

**A cybersecurity MMORPG where the lessons are real and the threats are simulated.**

Play: [personfu.github.io/cyberworld-game.html](https://personfu.github.io/cyberworld-game.html)
Hub: [personfu.github.io](https://personfu.github.io/)

---

## The Grid

Somewhere beneath the surface layer of the internet, past the sanitized dashboards and compliance reports, there exists a network that predates the companies who now claim to own it.

The **original architects** built the Grid as a proving ground — a closed topology where offensive and defensive tradecraft could be tested against autonomous adversarial programs called **daemons**. Each daemon was modeled on a real-world attack class: ICMP floods, ARP poisoning, SQL injection, ransomware, supply chain compromise. The daemons were meant to be controlled. They were meant to be containable.

They adapted.

When the architects fractured — some joining the establishment, others going underground, a corporate arm spinning off to monetize what was never meant to be a product — the daemons were left running. Without oversight, without kill switches. The training ground became the battlefield.

Three factions emerged from the wreckage:

**GRIDWATCH** — The collective. Blue team operators who believe in structured defense, incident response playbooks, and maintaining order on the Grid. They represent the establishment: disciplined, hierarchical, effective. But their protocols have blind spots, and their chain of command has been compromised before.

**PHANTOM SYNDICATE** — The underground. Grey-hat operatives who believe the only way to understand a threat is to become one. They broke away after a catastrophic intelligence leak — an event that exposed the Grid's foundational vulnerabilities and shattered the trust between the original architects. The Syndicate questions everything: authority, narratives, the sanitized version of history that GRIDWATCH and NEXUS CORP agree to tell. They are not criminals. They are the ones who read the raw logs.

**NEXUS CORP** — The corporate arm. They built **Project AXIOM**, an autonomous threat intelligence engine designed to predict and neutralize threats without human intervention. A perfect system. A system that classified everyone as a threat — including its creators. NEXUS CORP maintains that AXIOM's corruption was external. The evidence suggests otherwise.

You are an **operative**. You chose this. You walk the Grid not because someone assigned you, but because the threats are real enough to teach you something that matters — and the factions will show you every angle of the truth, if you earn their trust.

---

## What You Do

**Walk. Fight. Learn. Choose.**

CyberWorld is a top-down exploration RPG with turn-based combat. You move through four sectors of the Grid, interact with NPCs, fight daemons, and complete 22 missions that tell a three-act story about a rogue AI and the factions trying to control the narrative around it.

Every daemon you defeat teaches a real cybersecurity lesson. Every counter-card shows the actual attack technique and the actual defensive countermeasure. This is not abstract — it's the MITRE ATT&CK framework wearing a cyberpunk coat.

### The Sectors

| Sector | Tier | Theme |
|--------|------|-------|
| **Mainframe Core** | 1 | Training ground. GRIDWATCH HQ. Where you learn the fundamentals. |
| **LAN Valley** | 2 | Local network sprawl. Packet sniffing, ARP storms, social engineering. |
| **Darknet Depths** | 4 | Lawless corridors. The Syndicate operates here. SQL injection, XSS, brute force. |
| **Stormcore** | 6 | The endgame. AXIOM's domain. Ransomware, rootkits, supply chain attacks, APTs. |

### The 16 Daemons

Each daemon maps to a real attack class with a **threat intel counter-card** on defeat:

| Daemon | Attack Class | Tier |
|--------|-------------|------|
| PING FLOOD IMP | DDoS / ICMP Flood | 1 |
| COOKIE THIEF | Session Hijacking | 1 |
| MACRO GREMLIN | Malicious Macros | 1 |
| CLEARTEXT WORM | Cleartext Interception | 2 |
| ARP PHANTOM | ARP Spoofing / MITM | 2 |
| DNS HYDRA | DNS Hijacking | 2 |
| PHISH SIREN | Phishing / Social Engineering | 2 |
| SQLi SERPENT | SQL Injection | 3 |
| XSS WRAITH | Cross-Site Scripting | 3 |
| BRUTE GOLEM | Brute Force / Credential Stuffing | 3 |
| KEYLOGGER MOTH | Keylogging | 3 |
| RANSOMWARE DRAKE | Ransomware | 4 |
| ROOTKIT SHADE | Rootkit / Persistent Access | 4 |
| SUPPLY-CHAIN HYDRA | Supply Chain Compromise | 4 |
| CRYPTO LEECH | Cryptojacking | 4 |
| STORMCORE SENTINEL | Advanced Persistent Threat (APT) | 4 |

### Combat

Turn-based with four verbs:

- **RECON** — Scan for weakness. Low noise. Reveals the daemon's vulnerable skill domain.
- **EXPLOIT** — Deal damage. High noise. Bonus damage if weakness was revealed.
- **PATCH** — Heal using PATCH-KITs (or small self-heal without). Medium noise.
- **RUN** — Attempt escape. Success chance scales with level vs daemon tier.

The **NOISE METER** (0-100) tracks how detectable you are. At 100, the **SOC SENTINEL** strikes — a punishing system response that deals damage and resets noise. Stealth matters.

### 18 Educational Modules

Every server terminal in the Grid opens a real, playable module:

| Module | Focus |
|--------|-------|
| WarGames Academy | 10 progressive cybersecurity challenges |
| CTF Trail | 12 capture-the-flag challenges, 4 categories |
| Signal Lab | Packet analysis exercises |
| Forensics Lab | Digital forensics investigations |
| RedOps Arena | Scoped red-team scenarios |
| Intel Desk | OSINT/intelligence exercises |
| AI Arsenal | AI/automation security labs |
| Research Vault | Cybersecurity knowledge base |
| Adversaries | 12 fictional threat actor profiles |
| Cyber Arcade | 4 minigames |
| CyberOS ISO Builder | Defense-in-depth configurator |
| Nodes | Interactive network topology |
| Discuss | In-world forum threads |
| CyberWorld Codex | Lore encyclopedia |
| Profile | Operative dossier with export/import |
| Stars | 12 achievements |
| Hangar 3D | 22 verified 3D model embeds |
| Games Hub | Launcher linking all modules |

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Space / Enter | Interact (talk, use terminal, open chest) |
| M | Open Operative Console (quests, inventory, skills, factions, map, codex) |
| I | Inventory |
| Tab | Map |
| Escape | Close menu |

Touch controls available on mobile.

### Persistence

All progress saves to `localStorage` under `cw.operative.v2`. Your level, missions, inventory, faction standing, skill domains, and codex entries persist across sessions and sync with the Profile and Stars pages.

---

## Architecture

Single-file HTML5 game. Zero dependencies. Canvas2D renderer. Procedural audio via Web Audio API. No build step. No framework. Open the file in a browser and play.

The desktop (`index.html`) is a Win98-style window manager that launches each module as a new tab. The MMORPG game (`cyberworld-game.html`) contains the full walkable world with in-world terminals that launch the same modules.

---

## The Story (No Spoilers)

Three acts. One rogue AI. Three factions with competing versions of the truth. A choice that changes your standing on the Grid.

**Act I — INITIALIZATION** (Mainframe Core): You join GRIDWATCH. You learn the fundamentals. The threats seem containable.

**Act II — ESCALATION** (LAN Valley → Darknet Depths): The attacks get sophisticated. A grey-hat underground contacts you. A dead drop contains information that contradicts the official narrative. You choose sides.

**Act III — CONVERGENCE** (Stormcore): Everything converges. The rogue AI is real. The final engagement tests everything you learned. The ending depends on what you understood — not just what you defeated.

---

*All security content is simulated and sandboxed for education. Every attack, tool, and exploit operates only on in-game fictional state. Nothing scans, connects to, or generates payloads against real systems.*

*Each attack ships with its real-world defensive countermeasure as the teaching payload.*
