/**
 * /daily — Claim daily XP ration + random intel drop, cooldown via localStorage-style tracking in memory
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

// In-process cooldown tracking (resets on bot restart — for persistent cooldowns use a DB)
const cooldowns = new Map(); // userId → last claim timestamp
const COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 hours

const XP_DROPS = [
  { xp: 100, label: 'RECRUIT RATION',      icon: '⬜', msg: 'Standard operative ration received.' },
  { xp: 200, label: 'AGENT BONUS',         icon: '🟩', msg: 'Intel bonus attached to your daily ration.' },
  { xp: 350, label: 'HOT INTEL PACKAGE',   icon: '🟨', msg: 'Priority intel drop from FURIOS-INT HQ.' },
  { xp: 500, label: 'ELITE DROP',          icon: '🟧', msg: 'ELITE classification. Heavy intel payload inbound.' },
  { xp: 750, label: 'CRITICAL INTEL SURGE',icon: '🟥', msg: 'CRITICAL-tier intel surge authorized.' },
  { xp:1000, label: '★ LEGENDARY RATION',  icon: '💠', msg: 'LEGENDARY drop. You are the 1%. Check your clearance.' },
];

const INTEL_DROPS = [
  { type: 'TOOL_TIP',    content: '**`hashcat`** tip: Use `-a 6 -m 0 wordlist.txt ?d?d?d` to append 3 digits to every word — cracks 60% of corporate passwords.' },
  { type: 'OSINT_TIP',   content: '**OSINT**: Run `site:pastebin.com "targetdomain.com"` to find accidental credential pastes. Check hourly for fresh leaks.' },
  { type: 'CVE_ALERT',   content: '**CVE-2024-3400** [PAN-OS]: Unauthenticated RCE in GlobalProtect. PoC public. Patch now or isolate. CVSS 10.0.' },
  { type: 'MITRE_TIP',   content: '**MITRE T1059.001** (PowerShell): `Set-MpPreference -DisableRealtimeMonitoring $true` disables Windows Defender. Monitor for this.' },
  { type: 'BLUE_TIP',    content: '**Blue Team**: Canary tokens in `\\\\server\\shares\\HR\\salary_data.xlsx` catch lateral movement immediately. Free at canarytokens.org.' },
  { type: 'IOC',         content: '**FRESH IOC**: `185.220.101.47` — active Cobalt Strike C2 beacon server. Block at perimeter. Source: abuse.ch.' },
  { type: 'TOOL_TIP',    content: '**`nuclei`** tip: `nuclei -t cves/ -l targets.txt -severity critical,high -o results.txt` scans for 2000+ CVEs in minutes.' },
  { type: 'RPG_TIP',     content: '**SOULCODE TIP**: TROJAN_GHOST is weak to `BEHAVIORAL_ANALYSIS`. Use Cuckoo sandbox — static scan fails every time.' },
  { type: 'OSINT_TIP',   content: '**OSINT**: `theHarvester -d target.com -b all` harvests emails, subdomains, IPs and virtual hosts across 20+ sources simultaneously.' },
  { type: 'GAME_TIP',    content: '**WAR GAMES TIP**: Type `scan 10.0.0.1/24` in the terminal to discover all active hosts. Then `exploit [host]` to attempt pwn.' },
  { type: 'CVE_ALERT',   content: '**CVE-2025-0282** [Ivanti]: Stack buffer overflow. Ivanti VPN actively exploited in the wild before patch release. CVSS 9.0.' },
  { type: 'BLUE_TIP',    content: '**Splunk query** for Volt Typhoon LOLbin abuse: `index=windows EventCode=4688 (CommandLine="*certutil*" OR "*netsh*" OR "*wmic*")`' },
];

// Weighted XP selection (common outcomes more likely)
function rollXP() {
  const weights = [40, 25, 15, 10, 7, 3];
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return XP_DROPS[i];
  }
  return XP_DROPS[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily FLLC XP ration + random intel drop (20h cooldown)'),

  async execute(interaction, { SITE_URL }) {
    const uid  = interaction.user.id;
    const now  = Date.now();
    const last = cooldowns.get(uid) || 0;
    const diff = now - last;

    if (diff < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - diff;
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x555555)
          .setTitle('⏳ DAILY_RATION_COOLDOWN')
          .setDescription(`Your next ration is available in **${h}h ${m}m**.\n\nWhile you wait:\n• \`/mission\` — Get a new operation\n• \`/daemon\` — Encounter a SOULCODE entity\n• \`/scan nmap\` — Run recon\n• \`/adversary FANCY_BEAR\` — Study a threat actor`)
          .setFooter({ text: 'FURIOS-INT Daily Logistics' })],
        ephemeral: true,
      });
    }

    cooldowns.set(uid, now);

    const drop  = rollXP();
    const intel = INTEL_DROPS[Math.floor(Math.random() * INTEL_DROPS.length)];
    const streak = Math.floor(Math.random() * 14) + 1; // simulated streak
    const bonus  = streak >= 7 ? Math.floor(drop.xp * 0.5) : 0;
    const total  = drop.xp + bonus;

    const embed = new EmbedBuilder()
      .setColor(0x00ff41)
      .setTitle(`${drop.icon} DAILY RATION CLAIMED  //  FURIOS-INT`)
      .setDescription(drop.msg)
      .addFields(
        {
          name: '⚡ XP RECEIVED',
          value: [
            `Base drop: **+${drop.xp} XP**  \`${drop.label}\``,
            bonus ? `Streak bonus (day ${streak}): **+${bonus} XP**` : `Daily streak: **Day ${streak}**`,
            `**TOTAL: +${total} XP**`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `📡 INTEL DROP  //  TYPE: ${intel.type}`,
          value: intel.content,
          inline: false,
        },
        {
          name: '📋 DAILY MISSION BRIEFING',
          value: `Use \`/mission\` for today's operative assignment\nUse \`/daemon\` to encounter a SOULCODE entity\nUse \`/adversary\` to study your threat actor`,
          inline: false,
        },
        {
          name: '🔗 Operations',
          value: [
            `[🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html)`,
            `[⚔️ War Games](${SITE_URL}/wargames.html)`,
            `[📡 Intel Hub](${SITE_URL}/intel.html)`,
          ].join(' • '),
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT Daily Dispatch • Next ration: 20 hours • CyberOS v2026.3-FLLC` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🎮 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
