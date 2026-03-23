/**
 * /daemon — Encounter a SOULCODE daemon with full lore, battle options, capture challenge
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const DAEMONS = [
  {
    name: 'ROOTKIT_v3', type: 'MALWARE', element: 'STEALTH',
    level: 5, color: 0x00e8ff, rarity: 'UNCOMMON',
    hp: 80, maxHp: 80,
    captureRate: 65, xpReward: 120,
    desc: 'A kernel-level daemon that survived 3 antivirus generations. Hooks syscalls NtOpenProcess and NtQueryDirectoryFile to hide its presence. Evolved from Azazel LD_PRELOAD rootkit. Whispers in ring-0.',
    weakTo: 'INTEGRITY_CHECK (Tripwire)', strongVs: 'SIGNATURE_SCAN',
    moves: [
      { name: 'SYSCALL_HOOK',  power: 35, type: 'STEALTH',   effect: 'Hides attacker processes from ps/top' },
      { name: 'KERNEL_INJECT', power: 45, type: 'MALWARE',   effect: 'Injects shellcode into kernel memory' },
      { name: 'LOG_WIPE',      power: 25, type: 'EVASION',   effect: 'Clears /var/log/auth.log and syslog' },
      { name: 'PROCESS_HIDE',  power: 30, type: 'STEALTH',   effect: 'Removes PID from /proc enumeration' },
    ],
    lore: 'First observed in the DARKNET_DEPTHS in 2019. Believed to have evolved from leaked Hacking Team source code.',
    captureItem: 'INTEGRITY_PROBE',
  },
  {
    name: 'WORM_SLITHER', type: 'WORM', element: 'NETWORK',
    level: 3, color: 0x00ff41, rarity: 'COMMON',
    hp: 55, maxHp: 55,
    captureRate: 80, xpReward: 75,
    desc: 'A self-replicating daemon that spreads through SMB shares like digital kudzu. Uses EternalBlue derivatives for propagation. Drops MIRAI-variant payloads on vulnerable IoT devices. Multiplies endlessly.',
    weakTo: 'NETWORK_SEGMENTATION (VLAN isolation)', strongVs: 'ENDPOINT_AV',
    moves: [
      { name: 'SMB_SPREAD',    power: 25, type: 'NETWORK',   effect: 'Propagates to 3 adjacent hosts' },
      { name: 'PAYLOAD_DROP',  power: 35, type: 'MALWARE',   effect: 'Installs MIRAI bot on target' },
      { name: 'REPLICATE',     power: 20, type: 'WORM',      effect: 'Creates 2 clones with 50% HP' },
      { name: 'PORT_SCAN',     power: 15, type: 'RECON',     effect: 'Reveals weaknesses in network' },
    ],
    lore: 'Spawned from EternalBlue exploit code leaked by ShadowBrokers. Has no known creator — it evolved on its own.',
    captureItem: 'ISOLATION_CAGE',
  },
  {
    name: 'TROJAN_GHOST', type: 'TROJAN', element: 'DECEPTION',
    level: 8, color: 0xff88cc, rarity: 'RARE',
    hp: 120, maxHp: 120,
    captureRate: 40, xpReward: 280,
    desc: 'Disguises itself as legitimate software — a PDF reader, a VPN client, a game mod. Opens a persistent reverse shell while displaying the fake application. Used by LAZARUS_GROUP in TraderTraitor campaigns targeting macOS devs.',
    weakTo: 'BEHAVIORAL_ANALYSIS (Cuckoo sandbox)', strongVs: 'SIGNATURE_SCAN',
    moves: [
      { name: 'BACKDOOR_OPEN',  power: 50, type: 'TROJAN',    effect: 'Establishes persistent C2 connection' },
      { name: 'DATA_EXFIL',     power: 40, type: 'EXFIL',     effect: 'Steals credentials from keychain/vault' },
      { name: 'DISGUISE',       power: 0,  type: 'EVASION',   effect: 'Becomes undetectable for 1 round' },
      { name: 'C2_CONNECT',     power: 35, type: 'NETWORK',   effect: 'Calls back to DPRK-controlled server' },
    ],
    lore: 'GHOST was first caught in a LAZARUS_GROUP supply chain attack against crypto exchanges. It has 47 known variants.',
    captureItem: 'SANDBOX_TRAP',
  },
  {
    name: 'BOTNET_SWARM', type: 'BOTNET', element: 'DISTRIBUTED',
    level: 12, color: 0xffff00, rarity: 'EPIC',
    hp: 200, maxHp: 200,
    captureRate: 25, xpReward: 520,
    desc: 'A sentient 400,000-node botnet. Each packet is a neuron firing across a dark internet of compromised cameras, routers, and hospital devices. The Swarm thinks in distributed consensus. Orchestrating a 1.5Tbps DDoS is casual.',
    weakTo: 'C2_TAKEDOWN (FBI Sinkhole)', strongVs: 'RATE_LIMITING',
    moves: [
      { name: 'DDOS_FLOOD',    power: 80, type: 'NETWORK',   effect: '1.5 Tbps assault — downs any service' },
      { name: 'CRED_STUFF',    power: 45, type: 'BRUTE',     effect: 'Tests 10M credential pairs per second' },
      { name: 'NODE_RECRUIT',  power: 0,  type: 'BOTNET',    effect: 'Recruits 50 new bots to the swarm' },
      { name: 'SWARM_SURGE',   power: 65, type: 'DISTRIBUTED',effect: 'All nodes attack simultaneously' },
    ],
    lore: 'The Swarm has survived 3 FBI takedowns. Each time it migrated C2 infrastructure to a new blockchain-based domain generation algorithm.',
    captureItem: 'C2_SINKHOLE',
  },
  {
    name: 'RANSOMWARE_PHANTOM', type: 'RANSOMWARE', element: 'DESTRUCTIVE',
    level: 15, color: 0xff4444, rarity: 'LEGENDARY',
    hp: 300, maxHp: 300,
    captureRate: 10, xpReward: 900,
    desc: 'The apex predator of the cyber realm. Spreads via phishing email, exploits print spooler, deletes shadow copies, encrypts 100,000 files in 45 seconds. Has collected $340M in ransom. The PHANTOM leaves no trace — only a QR code.',
    weakTo: 'IMMUTABLE_BACKUP (Veeam / air-gap)', strongVs: 'ENDPOINT_AV',
    moves: [
      { name: 'FILE_ENCRYPT',    power: 100, type: 'DESTRUCT',  effect: 'Encrypts ALL accessible files instantly' },
      { name: 'SHADOW_DELETE',   power: 60,  type: 'EVASION',   effect: 'Destroys all VSS shadow copies' },
      { name: 'PROPAGATE',       power: 70,  type: 'WORM',      effect: 'Spreads laterally to adjacent networks' },
      { name: 'RANSOM_NOTE',     power: 0,   type: 'PSYCH',     effect: 'Displays ransom demand in 47 languages' },
    ],
    lore: 'PHANTOM is the evolved form of BITWISE_SPIDER\'s LockBit 3.0. It submitted a bug bounty report to itself.',
    captureItem: 'QUANTUM_VAULT',
  },
  {
    name: 'ZERO_DAY_SPECTER', type: 'EXPLOIT', element: 'UNKNOWN',
    level: 20, color: 0xffffff, rarity: '★ MYTHIC',
    hp: 999, maxHp: 999,
    captureRate: 1, xpReward: 9999,
    desc: 'A living zero-day exploit. No CVE assigned. No signature. No patch. It exists in the space between protocol specs and implementations — a ghost haunting the undefined behavior. Observed once by NSA analysts who then went dark.',
    weakTo: 'FORMAL VERIFICATION (mathematical proof)', strongVs: 'EVERYTHING',
    moves: [
      { name: 'UNDEFINED_BEHAVIOR', power: 999, type: 'UNKNOWN', effect: 'Triggers undefined behavior in target CPU' },
      { name: 'MEMORY_CORRUPTION',  power: 200, type: 'EXPLOIT', effect: 'Arbitrary read/write anywhere in memory' },
      { name: 'PRIVILEGE_ESCALATE', power: 150, type: 'PRIVESC', effect: 'Instant ring-0 from ring-3' },
      { name: 'VANISH',             power: 0,   type: 'EVASION', effect: 'Becomes undetectable permanently' },
    ],
    lore: 'Some say it was written by a mathematician who found a flaw in boolean algebra itself. It has never been captured.',
    captureItem: 'MATHEMATICAL_PROOF',
  },
];

const RARITY_COLORS = { COMMON: '⚪', UNCOMMON: '🟢', RARE: '🔵', EPIC: '🟣', LEGENDARY: '🟡', '★ MYTHIC': '🔮' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daemon')
    .setDescription('Encounter a SOULCODE daemon — lore, stats, moves, and capture challenge'),

  async execute(interaction, { SITE_URL }) {
    // Weighted random: mythic very rare
    const weights = [25, 30, 20, 15, 8, 2];
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) { rand -= weights[i]; if (rand <= 0) { idx = i; break; } }
    const d = DAEMONS[idx];

    const rarIcon   = RARITY_COLORS[d.rarity] || '⚪';
    const hpBar     = '█'.repeat(Math.floor(d.hp / (d.maxHp / 10))) + '░'.repeat(10 - Math.floor(d.hp / (d.maxHp / 10)));
    const movesList = d.moves.map(m => `\`${m.name}\` *(${m.type} / PWR ${m.power})* — ${m.effect}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(d.color)
      .setTitle(`◆ DAEMON ENCOUNTERED: ${d.name}  ${rarIcon} ${d.rarity}`)
      .setDescription(`*${d.desc}*`)
      .addFields(
        { name: '📋 ENTITY DATA',   value: [
          `**Type:** \`${d.type}\`  **Element:** \`${d.element}\`  **Level:** \`${d.level}\``,
          `**HP:** \`${hpBar}\` ${d.hp}/${d.maxHp}`,
          `**Capture Rate:** ${d.captureRate}%  **XP on Defeat:** ${d.xpReward}`,
        ].join('\n'), inline: false },
        { name: '⚡ COMBAT MOVES', value: movesList, inline: false },
        { name: '✅ Weak To',      value: `\`${d.weakTo}\``,       inline: true },
        { name: '⚠️ Strong Vs',    value: `\`${d.strongVs}\``,     inline: true },
        { name: '🔒 Capture Item', value: `\`${d.captureItem}\``,  inline: true },
        { name: '📖 LORE',         value: `> ${d.lore}`,           inline: false },
        { name: '🎮 Capture This Daemon',
          value: `Launch [🌐 CyberWorld RPG](${SITE_URL}/cyberworld.html) — navigate to daemon location and use SCAN_DEPLOY!\n*Capture rate: ${d.captureRate}% • Required item: \`${d.captureItem}\`*`,
          inline: false },
      )
      .setFooter({ text: `SOULCODE Engine v2026.3 // FURIOS-INT • ${new Date().toUTCString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🌐 CyberWorld RPG').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/cyberworld.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
