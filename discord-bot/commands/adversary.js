/**
 * /adversary [name] — Full APT threat-actor profile from FLLC threat intelligence DB
 */
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const APT_DB = {
  'FANCY_BEAR': {
    alias: ['APT28','STRONTIUM','SOFACY','PAWN STORM'],
    nation: '🇷�� Russia — GRU Unit 26165',
    tier: 'EXTREME', color: 0xff003c,
    active: '2004–present',
    targets: ['Government','Military','Political','Energy','Media'],
    techniques: ['T1566 Phishing','T1078 Valid Accounts','T1059 Cmd Execution','T1190 Exploit Public App','T1071 App Layer Proto'],
    tools: ['X-Agent','Sofacy','Zebrocy','LoJax (UEFI rootkit)','HeadLace'],
    desc: 'Premier Russian military intelligence (GRU) cyber unit. Responsible for DNC breach (2016), WADA hack, and Bundestag infiltration. Known for UEFI-level persistence via LoJax — survives OS reinstall.',
    notableCampaigns: ['Operation Sofacy (2014)','DNC Breach (2016)','WADA/USADA (2016)','French Election (2017)','NATO phishing (2022+)'],
    iocs: ['185.220.101.x C2 ranges','*.locker-service[.]net','phish domains mimicking NATO/gov portals'],
  },
  'COZY_BEAR': {
    alias: ['APT29','NOBELIUM','The Dukes','MIDNIGHT BLIZZARD'],
    nation: '🇷🇺 Russia — SVR Foreign Intelligence',
    tier: 'EXTREME', color: 0xcc0000,
    active: '2008–present',
    targets: ['Government','Think Tanks','Healthcare','Tech','Supply Chain'],
    techniques: ['T1195 Supply Chain Compromise','T1550 Use Alt Auth Material','T1552 Unsecured Credentials','T1071 App Layer Proto','T1567 Exfil to Cloud'],
    tools: ['SUNBURST','Cobalt Strike','WellMess','BEATDROP','MagicWeb'],
    desc: 'Russian SVR unit behind the SolarWinds SUNBURST supply chain attack (2020) that compromised 18,000+ organizations including US Treasury and DHS. Uses OAuth token theft to bypass MFA.',
    notableCampaigns: ['SolarWinds SUNBURST (2020)','Microsoft Midnight Blizzard (2024)','Democratic Senate campaign breach (2016)'],
    iocs: ['avsvmcloud[.]com (SUNBURST C2)','*.microsoft-graph-services[.]com','Cobalt Strike malleable C2 profiles'],
  },
  'LAZARUS_GROUP': {
    alias: ['Labyrinth Chollima','HIDDEN COBRA','APT38','Zinc'],
    nation: '🇰🇵 North Korea — RGB Bureau 121',
    tier: 'EXTREME', color: 0xff00ea,
    active: '2009–present',
    targets: ['Finance','Cryptocurrency','Defense','Media','Healthcare'],
    techniques: ['T1059 Cmd Execution','T1105 Ingress Tool Transfer','T1071 App Layer Proto','T1565 Data Manipulation','T1485 Data Destruction'],
    tools: ['BLINDINGCAN','FALLCHILL','WannaCry','AppleJeus','MagicRAT','TraderTraitor'],
    desc: 'DPRK state-sponsored group responsible for $1.7B+ in crypto heists, the Sony Pictures hack, WannaCry ransomware, and supply chain attacks targeting macOS via trojanized trading apps.',
    notableCampaigns: ['Sony Pictures (2014)','SWIFT Bangladesh Bank $81M (2016)','WannaCry (2017)','Axie Infinity $625M (2022)','TraderTraitor (2024)'],
    iocs: ['185.224.137.x','*.coinbase-oracle[.]com','TraderTraitor malware hashes'],
  },
  'SANDWORM': {
    alias: ['Voodoo Bear','IRIDIUM','Seashell Blizzard','APT44'],
    nation: '🇷🇺 Russia — GRU Unit 74455',
    tier: '破壊的 DESTRUCTIVE', color: 0xff4400,
    active: '2009–present',
    targets: ['Critical Infrastructure','ICS/SCADA','Energy Grid','Government'],
    techniques: ['T1489 Service Stop','T1485 Data Destruction','T1499 Endpoint DoS','T1190 Exploit Public App'],
    tools: ['NotPetya','Industroyer/CRASHOVERRIDE','BlackEnergy','Industroyer2','CaddyWiper'],
    desc: 'The world\'s most destructive cyber unit. NotPetya caused $10B+ in global damage. Directly attacked Ukraine\'s power grid twice (2015, 2016) causing blackouts. Indicted by DOJ in 2020.',
    notableCampaigns: ['Ukraine Power Grid (2015+2016)','NotPetya (2017) — $10B damage','PyeongChang Olympics (2018)','Georgia elections (2019)','Viasat KA-SAT (2022)'],
    iocs: ['*.bigmoneytransfer[.]com','Industroyer2 artifacts','NotPetya PE hashes'],
  },
  'MUSTANG_PANDA': {
    alias: ['Bronze President','TA416','Earth Preta','STATELY TAURUS'],
    nation: '🇨🇳 China — MSS/PLA affiliated',
    tier: 'EXTREME', color: 0xffaa00,
    active: '2012–present',
    targets: ['Government','NGOs','Political Organizations','Europe','SEA','Africa'],
    techniques: ['T1566.001 Spear Phishing Attach.','T1204 User Execution','T1027 Obfuscated Files','T1071 App Layer Proto'],
    tools: ['PlugX','TONESHELL','TONEINS','PUBLOAD','MQsTTang'],
    desc: 'Chinese espionage group targeting EU political organizations, NGOs in Myanmar/Vietnam, and Pacific Island governments. Prolific PlugX PlugX variant operator with rapid exploitation of new CVEs.',
    notableCampaigns: ['EU political parties (2023)','Pacific Islands espionage (2022)','Vatican network targeting (2020)','Myanmar government (2021)'],
    iocs: ['*.topedition[.]org','*.kossymall[.]com','PlugX C2 on port 443/80'],
  },
  'CHARMING_KITTEN': {
    alias: ['APT35','Phosphorus','Mint Sandstorm','Yellow Garuda'],
    nation: '🇮�� Iran — IRGC',
    tier: 'HIGH', color: 0x00cc55,
    active: '2011–present',
    targets: ['Academia','Journalists','Dissidents','Nuclear Experts','Israel','US'],
    techniques: ['T1566 Phishing','T1539 Steal Web Session Cookie','T1598 Phishing for Info','T1071 App Layer Proto'],
    tools: ['CharmPower','HYPERSCRAPE','BellaCiao','Sponsor backdoor'],
    desc: 'Iranian IRGC unit conducting prolonged credential phishing campaigns against nuclear negotiators, journalists, and political opponents. Known for custom email-scraping malware HYPERSCRAPE.',
    notableCampaigns: ['Nuclear deal negotiator targeting (2021)','Israeli critical infrastructure (2022)','US presidential campaign phishing (2020)'],
    iocs: ['accounts-google-recover[.]com','*.icloud-recover[.]info','HYPERSCRAPE PE artifacts'],
  },
  'BITWISE_SPIDER': {
    alias: ['LockBit','Qilin','CARBON SPIDER affiliate'],
    nation: '🌐 Russia/EE — RaaS Consortium',
    tier: 'EXTREME', color: 0xff6600,
    active: '2019–present',
    targets: ['44 industries','111 countries','Healthcare','Legal','Finance'],
    techniques: ['T1486 Data Encrypted for Impact','T1490 Inhibit System Recovery','T1048 Exfil','T1195 Supply Chain'],
    tools: ['LockBit 3.0','Qilin (Rust)','StealBit exfiltrator','Cobalt Strike'],
    desc: 'Most prolific ransomware-as-a-service operation (44 industries, 111 countries). LockBit 3.0 introduced bug bounty program. Rust-based Qilin variant evades most AV. Affiliates recruit via darknet forums.',
    notableCampaigns: ['Royal Mail (2023)','Boeing (2023)','ICBC (2023)','LockBit infrastructure takedown + rebrand (2024)'],
    iocs: ['*.lockbit3-decryptor[.]com','StealBit mutex patterns','Qilin Rust binary hashes'],
  },
  'SCATTERED_SPIDER': {
    alias: ['UNC3944','Octo Tempest','0ktapus','Muddled Libra'],
    nation: '🌐 Anglophone cybercrime collective (US/UK/CA)',
    tier: 'EXTREME', color: 0x9900ff,
    active: '2022–present',
    targets: ['Telecom','Tech','Hospitality','Gaming','Cryptocurrency'],
    techniques: ['T1566 Vishing/SMS Phish','T1621 MFA Bypass','T1539 Cookie Theft','T1578 Cloud Infra Mod.'],
    tools: ['POORTRY driver','STONESTOP','ScreenConnect','Okta-bypass tooling'],
    desc: 'Native English-speaking Gen-Z threat actors conducting expert social engineering. Bypassed Okta MFA at MGM Resorts (2023) via 10-min phone call to IT help desk. Achieved $110M+ in ransomware gains.',
    notableCampaigns: ['Twilio SMS breach (2022)','MGM Resorts $110M (2023)','Caesars Entertainment (2023)','Coinbase (2024)'],
    iocs: ['0ktapus phishing kit patterns','POORTRY driver signatures','Pulseway/AnyDesk abuse'],
  },
  'VOLT_TYPHOON': {
    alias: ['Bronze Silhouette','Vanguard Panda','VOLTZITE'],
    nation: '🇨🇳 China — PLA/MSS pre-positioning',
    tier: 'CRITICAL', color: 0x00aaff,
    active: '2021–present',
    targets: ['US Critical Infrastructure','Guam military','Water/Power/Comms'],
    techniques: ['T1078 Valid Accounts','T1133 External Remote Services','T1003 OS Cred Dump','T1562 Impair Defenses'],
    tools: ['Living-off-the-land (LOLbins)','FRP proxy','Impacket','custom SOHO router malware'],
    desc: 'PRC pre-positioning threat actor — not stealing data but burrowing into US critical infrastructure for potential wartime disruption. Uses only LOLbins; generates no malware detections. Active in Guam comms infrastructure.',
    notableCampaigns: ['US critical infra pre-positioning (2021-present)','Guam telecom (2023)','CISA advisory AA24-038A'],
    iocs: ['LOLbin chains: certutil/netsh/wmic','SOHO router compromise patterns','FRP proxy traffic signatures'],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adversary')
    .setDescription('Deep-dive threat actor profile from FLLC APT Intelligence Database')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Threat actor name — e.g. FANCY_BEAR, LAZARUS_GROUP, SANDWORM')
        .setRequired(true)
        .addChoices(...Object.keys(APT_DB).map(k => ({ name: k, value: k })))
    ),

  async execute(interaction, { SITE_URL }) {
    const key = interaction.options.getString('name', true).toUpperCase().replace(/[\s-]/g, '_');
    const apt = APT_DB[key];

    if (!apt) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x555555)
          .setTitle(`☠️ ${key} — NOT IN FLLC DATABASE`)
          .setDescription(`Known actors: ${Object.keys(APT_DB).join(', ')}\nFull DB: [Adversary Intel](${SITE_URL}/adversaries.html)`)],
        ephemeral: true,
      });
    }

    const tierIcon = apt.tier.includes('破壊') ? '💥' : apt.tier === 'EXTREME' ? '🔴' : apt.tier === 'CRITICAL' ? '🔺' : '🟠';

    const embed = new EmbedBuilder()
      .setColor(apt.color)
      .setTitle(`☠️ ${key}  //  ${tierIcon} TIER_${apt.tier}`)
      .setDescription(`> ${apt.desc}`)
      .addFields(
        { name: '🌍 Nation / Sponsor',    value: apt.nation,                               inline: true  },
        { name: '⏱️ Active Since',         value: apt.active,                               inline: true  },
        { name: '🏷️ Aliases',              value: apt.alias.map(a => `\`${a}\``).join(' '), inline: false },
        { name: '🎯 Primary Targets',      value: apt.targets.join(' • '),                  inline: false },
        { name: '🛠️ Known Tools',          value: apt.tools.map(t => `\`${t}\``).join(', '), inline: false },
        { name: '🗺️ MITRE ATT&CK TTPs',   value: apt.techniques.map(t => `• \`${t}\``).join('\n'), inline: false },
        { name: '📰 Notable Campaigns',    value: apt.notableCampaigns.map(c => `• ${c}`).join('\n'), inline: false },
        { name: '🔍 IOC Signatures',       value: apt.iocs.map(i => `• \`${i}\``).join('\n'), inline: false },
      )
      .setFooter({ text: `FURIOS-INT OSINT // FLLC Adversary DB • ${new Date().toUTCString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('☠️ Full Adversary DB').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/adversaries.html`),
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
