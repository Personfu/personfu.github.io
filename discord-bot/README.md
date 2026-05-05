# ⚡ FLLC CyberWorld Discord Bot

**Application ID:** `1170817211837992981`  
**Guild (Server) ID:** `1159996494691188765`  
**Built by:** Preston Furulie — CyberOS v2026.3-FLLC

---

## Slash Commands

### 🔴 RED_TEAM — Offensive Intelligence
| Command | Description |
|---|---|
| `/intel [severity] [count]` | Live CVE feed from NVD — CRITICAL/HIGH/MEDIUM, up to 8 results |
| `/cve CVE-YYYY-NNNNN` | Full CVE deep-dive: CVSSv3.1, attack vector, MITRE ATT&CK TTPs, references |
| `/scan [tool]` | Simulate nmap / nikto / gobuster / masscan / hydra / wireshark — gamified recon |

### 🔵 BLUE_TEAM — Defensive Operations  
| Command | Description |
|---|---|
| `/status` | Live health check all FLLC site pages + 4 engine status |

### 🟣 OSINT_AGENT — Intelligence
| Command | Description |
|---|---|
| `/adversary [name]` | Full APT threat actor profile: aliases, tools, TTPs, campaigns, IOCs |

### 🟢 RPG / GAME
| Command | Description |
|---|---|
| `/mission [class]` | Randomized operative mission: objectives, tools, loot drops, XP reward |
| `/daemon` | Encounter a SOULCODE daemon: full lore, combat moves, capture rate (weighted rarity) |
| `/leaderboard [filter]` | FLLC operative XP rankings with class filter, streaks, badges |
| `/profile [operative]` | Operative dossier: rank, class, XP bar, missions, daemons, toolkit |
| `/daily` | Claim daily XP ration + random intel tip (20h cooldown) |

### ⚙️ Utility
| Command | Description |
|---|---|
| `/help` | Full command directory with site links |

---

## Automated Broadcasts

| Schedule | Channel | Content |
|---|---|---|
| Daily 09:00 UTC | `CHANNEL_ANNOUNCEMENTS` | Daily briefing: top CVEs, system status, site links |
| Every hour | `CHANNEL_CVE_ALERTS` | CRITICAL CVEs from NVD API |
| On bot boot | `CHANNEL_GENERAL` | Online embed with all hub links |

GitHub Actions also posts the daily briefing via `ci-post.js` (stateless, exits after posting).

---

## Setup

### 1. Install dependencies
```bash
cd discord-bot
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — fill in DISCORD_TOKEN and channel IDs
```

Required `.env` values:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=1170817211837992981
DISCORD_GUILD_ID=1159996494691188765
CHANNEL_INTEL=YOUR_INTEL_CHANNEL_ID
CHANNEL_ANNOUNCEMENTS=YOUR_ANNOUNCEMENTS_CHANNEL_ID
CHANNEL_CVE_ALERTS=YOUR_CVE_ALERTS_CHANNEL_ID
CHANNEL_GENERAL=YOUR_GENERAL_CHANNEL_ID
NVD_API_KEY=               # optional — higher NVD rate limits
```

Get your bot token: https://discord.com/developers/applications/1170817211837992981/bot

### 3. Deploy slash commands (run once, then on command changes)
```bash
npm run deploy
```

### 4. Start the bot
```bash
npm start
```

---

## GitHub Actions — Automated Daily Post

See `.github/workflows/discord-bot.yml`. Add these as **GitHub Secrets**:
- `DISCORD_TOKEN`
- `CHANNEL_ANNOUNCEMENTS`
- `CHANNEL_CVE_ALERTS`
- `CHANNEL_GENERAL`
- `CHANNEL_INTEL`
- `NVD_API_KEY` (optional)

Set these as **Repository Variables** (or they use defaults):
- `DISCORD_CLIENT_ID` → `1170817211837992981`
- `DISCORD_GUILD_ID` → `1159996494691188765`

---

## Bot Permissions

Add to server `1159996494691188765` with these permissions:
- `Send Messages`, `Embed Links`, `Read Message History`, `View Channels`, `Use Application Commands`

**OAuth2 Invite URL:**
```
https://discord.com/oauth2/authorize?client_id=1170817211837992981&permissions=274877975552&scope=bot+applications.commands
```

---

## Site Links

| Page | URL |
|---|---|
| 🌐 CyberWorld RPG | https://personfu.github.io/cyberworld.html |
| 🕹 Arcade | https://personfu.github.io/arcade.html |
| 📡 Intel Hub | https://personfu.github.io/intel.html |
| ⚔️ War Games | https://personfu.github.io/wargames.html |
| 🔑 Operative Login | https://personfu.github.io/rpg/login.html |
| ☠️ Adversary DB | https://personfu.github.io/adversaries.html |
| 📡 Person Nodes | https://personfu.github.io/nodes.html |
| 🤖 AI Overseer | https://personfu.github.io/ai.html |
