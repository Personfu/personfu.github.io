/**
 * /defend — Generate a randomized defensive security playbook based on current threats.
 * Blue-team oriented: incident response, hardening, and detection engineering.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

const PLAYBOOKS = [
  {
    name: 'RANSOMWARE_IR',
    title: '🔵 PLAYBOOK: RANSOMWARE INCIDENT RESPONSE',
    threat: 'BITWISE_SPIDER / LockBit 3.0',
    color: 0x0088ff,
    phases: [
      { name: '1️⃣  DETECT',     steps: ['Alert: high-entropy file writes in Splunk `index=endpoint EventCode=4663`','Check: `vssadmin list shadows` — if empty, ransomware likely active','EDR: isolate affected endpoint from network immediately'] },
      { name: '2️⃣  CONTAIN',    steps: ['Network: block SMB (445) and RDP (3389) at perimeter — stop lateral spread','AD: disable compromised accounts identified in BloodHound output','Firewall: block all outbound to unknown IPs until IOCs cleared'] },
      { name: '3️⃣  ERADICATE',  steps: ['Forensics: Volatility3 memory dump before reimaging','Remove: wipe and reimage affected hosts from gold image','Patch: apply missing patches that enabled initial access'] },
      { name: '4️⃣  RECOVER',    steps: ['Restore from Veeam immutable backup (air-gap copy preferred)','Rotate: ALL credentials exposed on affected systems','Verify: restore integrity before reconnecting to production'] },
      { name: '5️⃣  LESSONS',    steps: ['Deploy: Canary tokens in critical file shares for early detection','Enable: WDAC / AppLocker to block unknown executables','Add: Splunk alert for `shadow copy deletion` events'] },
    ],
    tools: ['Volatility3','CrowdStrike Falcon','Veeam','Splunk','BloodHound'],
    tip: 'LockBit 3.0 deletes VSS first. Always maintain offline/immutable backups. WDAC is the strongest ransomware control.',
  },
  {
    name: 'PHISHING_DEFENSE',
    title: '🔵 PLAYBOOK: PHISHING CAMPAIGN DEFENSE',
    threat: 'COZY_BEAR / CHARMING_KITTEN credential phishing',
    color: 0x00aaff,
    phases: [
      { name: '1️⃣  DETECT',     steps: ['Email gateway: flag lookalike domains within edit-distance 2 of your domain','SIEM: alert on `office.com` auth from new country + new device','Proxy: block `.zip` domain TLD — abused heavily for phishing'] },
      { name: '2️⃣  CONTAIN',    steps: ['Revoke: session tokens for targeted accounts immediately','MFA: re-enroll affected users with phishing-resistant FIDO2 key','Block: sender domain + IP in email gateway and firewall'] },
      { name: '3️⃣  ERADICATE',  steps: ['Purge: remove phishing emails from all mailboxes via eDiscovery sweep','Hunt: check for OAuth app consent grants made by targeted users','Audit: Azure AD sign-in logs for suspicious IP/location combos'] },
      { name: '4️⃣  RECOVER',    steps: ['Reset: credentials for all users who clicked or engaged with phish','Harden: deploy Conditional Access policy requiring FIDO2 for admins','Enable: Attack Simulation Training for ongoing phishing awareness'] },
      { name: '5️⃣  LESSONS',    steps: ['Implement DMARC/DKIM/SPF with `p=reject` policy','Add: anomalous login detection rules in Defender XDR','Deploy: canary inbox for detecting mass phish campaigns'] },
    ],
    tools: ['Microsoft Defender XDR','Proofpoint TAP','Azure AD Conditional Access','FIDO2 keys','eDiscovery'],
    tip: 'Phishing-resistant MFA (FIDO2 / passkeys) completely defeats credential phishing. Prioritize admin accounts first.',
  },
  {
    name: 'APT_HUNT',
    title: '🔵 PLAYBOOK: ADVANCED PERSISTENT THREAT HUNT',
    threat: 'VOLT_TYPHOON / FANCY_BEAR living-off-the-land',
    color: 0x00cc88,
    phases: [
      { name: '1️⃣  HYPOTHESIS',  steps: ['Focus: LOLbin abuse chains — certutil, netsh, wmic, regsvr32, mshta','Hunt: Splunk `EventCode=4688 CommandLine="*certutil*" OR "*wmic*"`','Timeline: correlate process trees across all endpoints for anomaly'] },
      { name: '2️⃣  HUNT',        steps: ['Run Velociraptor artifact `Windows.Detection.BinaryRename` — attackers rename LOLbins','Check: unusual LSASS memory access via `EventCode=10` (Sysmon)','Network: hunt SOCKS5 proxy traffic from SOHO routers in Zeek logs'] },
      { name: '3️⃣  VALIDATE',    steps: ['Triage: all hosts with outbound connections to new external IPs in 30d','Sandbox: upload suspicious binaries to CAPEv2 for dynamic analysis','Correlate: DNS to threat intel feeds — check against abuse.ch'] },
      { name: '4️⃣  RESPOND',     steps: ['Quarantine: hosts with confirmed C2 beaconing','Credential reset: all accounts with LSASS access anomalies','Block: all C2 IOCs at DNS sinkholes and firewall egress'] },
      { name: '5️⃣  IMPROVE',     steps: ['Deploy: additional Sysmon rules for LOLbin parent-child anomalies','Enable: DNS-over-HTTPS logging for covert channel detection','Add: CanaryTokens in admin shares to catch lateral movement'] },
    ],
    tools: ['Velociraptor','Splunk','Sysmon','Zeek','CAPEv2 sandbox','Canary Tokens'],
    tip: 'Volt Typhoon generates ZERO malware. Hunt behavior, not hashes. Focus on process anomalies and LOLbin chains.',
  },
  {
    name: 'CLOUD_HARDENING',
    title: '🔵 PLAYBOOK: CLOUD SECURITY HARDENING',
    threat: 'SCATTERED_SPIDER / cloud IAM abuse',
    color: 0x5566ff,
    phases: [
      { name: '1️⃣  ASSESS',      steps: ['Run ScoutSuite: `scout aws` — baseline all misconfigs across IAM/S3/EC2','Check: `aws iam get-account-summary` for root MFA and unused roles','Audit: find overprivileged roles with `PrincipalMapper` — visualize IAM graph'] },
      { name: '2️⃣  IAM HARDEN', steps: ['Enforce: SCPs blocking `iam:*` and `sts:AssumeRole` outside org boundary','Require: FIDO2 MFA for all IAM users; disable access keys for root','Enable: AWS CloudTrail + GuardDuty in ALL regions — log everything'] },
      { name: '3️⃣  DATA',        steps: ['S3: block public access org-wide (`aws s3control put-public-access-block`)','KMS: encrypt all S3 buckets + RDS instances with customer-managed keys','Enable: Macie for sensitive data discovery across all S3 buckets'] },
      { name: '4️⃣  NETWORK',     steps: ['IMDSv2 only: `aws ec2 modify-instance-metadata-options --http-tokens required`','VPC: restrict security groups — no `0.0.0.0/0` inbound on port 22/3389','WAF: deploy AWS WAF with managed CRS rule set on all public endpoints'] },
      { name: '5️⃣  DETECT',      steps: ['GuardDuty: enable all threat intelligence feeds including S3 Protection','SIEM: stream CloudTrail to Splunk — alert on `ConsoleLoginWithoutMFA`','Lambda: auto-remediation for `0.0.0.0/0` SG rules using Config Rules'] },
    ],
    tools: ['ScoutSuite','PrincipalMapper','AWS GuardDuty','AWS Macie','AWS Config','Prowler'],
    tip: 'Disable IMDSv1 org-wide — it is the most exploited SSRF vector in AWS. One command fixes it across your fleet.',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('defend')
    .setDescription('Generate a randomized Blue Team defensive playbook — IR, hardening, detection engineering')
    .addStringOption(opt =>
      opt.setName('scenario')
        .setDescription('Defensive scenario (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '💀 Ransomware IR — LockBit 3.0 response',    value: 'RANSOMWARE_IR'    },
          { name: '📧 Phishing Defense — credential phishing',  value: 'PHISHING_DEFENSE' },
          { name: '🕵️ APT Hunt — LOLbin/Volt Typhoon',          value: 'APT_HUNT'         },
          { name: '☁️ Cloud Hardening — AWS IAM / SSRF',        value: 'CLOUD_HARDENING'  },
        )
    ),

  async execute(interaction, { SITE_URL }) {
    const key  = interaction.options.getString('scenario');
    const pb   = key ? PLAYBOOKS.find(p => p.name === key) : PLAYBOOKS[Math.floor(Math.random() * PLAYBOOKS.length)];

    const fields = pb.phases.map(phase => ({
      name: phase.name,
      value: phase.steps.map(s => `• ${s}`).join('\n').slice(0, 1024),
      inline: false,
    }));

    const embed = new EmbedBuilder()
      .setColor(pb.color)
      .setTitle(pb.title)
      .setDescription(`**Active Threat:** \`${pb.threat}\``)
      .addFields(
        ...fields,
        { name: '🛠️ Recommended Tools', value: pb.tools.map(t => `\`${t}\``).join('  '), inline: false },
        { name: '💡 Blue Team Tip',      value: `> ${pb.tip}`, inline: false },
        {
          name: '🔗 FLLC Intel Resources',
          value: [
            `[📡 Intel Hub](${SITE_URL}/intel.html)`,
            `[☠️ Adversary DB](${SITE_URL}/adversaries.html)`,
            `[⚔️ War Games](${SITE_URL}/wargames.html)`,
          ].join(' • '),
          inline: false,
        },
      )
      .setFooter({ text: `FURIOS-INT BLUE_TEAM // CyberOS v2026.3-FLLC • ${new Date().toUTCString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('📡 Intel Hub').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/intel.html`),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
