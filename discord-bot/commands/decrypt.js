/**
 * /decrypt — CTF-style decryption challenge: base64, ROT13, hex, Caesar cipher.
 * Educational cryptography mini-game with XP reward on correct answer.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');

// Each challenge: encoded message + plain answer + technique info
const CHALLENGES = [
  {
    type: 'BASE64',
    icon: '🔢',
    color: 0x00e8ff,
    encoded: 'Q1lCRVJXT1JMRF9GTENDIE9QRVJBVElWRV9BQ0NFU1NfR1JBTlRFRA==',
    answer: 'CYBERWORLD_FLLC OPERATIVE_ACCESS_GRANTED',
    hint: 'Base64 is not encryption — it\'s encoding. Every 3 bytes become 4 ASCII characters.',
    howTo: '```bash\necho "Q1lCRVJXT1JMRF9GTENDIE9QRVJBVElWRV9BQ0NFU1NfR1JBTlRFRA==" | base64 -d\n# Or: Python: import base64; base64.b64decode(s).decode()\n```',
    xp: 150,
    technique: 'Base64 is RFC 4648 encoding. Used in JWTs, email MIME, HTTP Basic Auth. Always check base64-looking strings in captured traffic.',
  },
  {
    type: 'ROT13',
    icon: '🔄',
    color: 0x00ff41,
    encoded: 'SHEVBF-VAG PLOREYBBEY YBS BCRENINGR',
    answer: 'FURIOS-INT CYBERWORLD LOG OPERATIVE',
    hint: 'Each letter is shifted 13 places. A→N, B→O, Z→M. Applying ROT13 twice returns the original.',
    howTo: '```bash\necho "SHEVBF-VAG PLOREYBBEY YBS BCRENINGR" | tr \'A-Za-z\' \'N-ZA-Mn-za-m\'\n# Or: Python: codecs.encode(s, \'rot_13\')\n```',
    xp: 100,
    technique: 'ROT13 is the simplest Caesar cipher variant. Often used in CTFs and forums to hide spoilers. Never use for actual security.',
  },
  {
    type: 'HEX',
    icon: '🟦',
    color: 0x0088ff,
    encoded: '46 55 52 49 4f 53 2d 49 4e 54 20 41 43 43 45 53 53 5f 47 52 41 4e 54 45 44',
    answer: 'FURIOS-INT ACCESS_GRANTED',
    hint: 'Each pair of hex digits (0-F) represents one byte (character). 0x46 = \'F\', 0x55 = \'U\'…',
    howTo: '```bash\necho "46 55 52 49 4f 53 2d 49 4e 54 20 41 43 43 45 53 53 5f 47 52 41 4e 54 45 44" | xxd -r -p\n# Or: Python: bytes.fromhex(s.replace(\' \',\'\')).decode()\n```',
    xp: 120,
    technique: 'Hex encoding maps binary to printable ASCII. Used in shellcode, packet captures, memory dumps. Essential for malware analysis.',
  },
  {
    type: 'CAESAR_7',
    icon: '🔠',
    color: 0xff8800,
    encoded: 'MBYPVZ-PUA ZVBSJVKL KHLTVU JVTWPSL',
    answer: 'FURIOS-INT SOULCODE DAEMON COMPILE',
    hint: 'Caesar cipher with shift 7. Each letter moved back 7 positions. Z→S, A→T, B→U…',
    howTo: '```python\n# Python: shift = 7\ns = "MBYPVZ-PUA ZVBSJVKL KHLTVU JVTWPSL"\nresult = \'\'.join(chr((ord(c) - 65 - 7 + 26) % 26 + 65) if c.isalpha() else c for c in s)\nprint(result)\n```',
    xp: 130,
    technique: 'Caesar cipher (substitution) was used by Julius Caesar for military comms. Trivially broken by frequency analysis — 26 possible shifts.',
  },
  {
    type: 'BINARY',
    icon: '💻',
    color: 0xff00ea,
    encoded: '01000110 01010101 01010010 01001001 01001111 01010011',
    answer: 'FURIOS',
    hint: 'Each group of 8 bits is one ASCII character. 01000110 = 70 decimal = \'F\'.',
    howTo: '```python\nbits = "01000110 01010101 01010010 01001001 01001111 01010011"\nresult = \'\'.join(chr(int(b, 2)) for b in bits.split())\nprint(result)  # FURIOS\n```',
    xp: 140,
    technique: 'Binary encoding is fundamental to all computing. Understanding bit manipulation is essential for exploit development and firmware analysis.',
  },
  {
    type: 'URL_ENCODE',
    icon: '🔗',
    color: 0x9900ff,
    encoded: '%46%55%52%49%4F%53%2D%49%4E%54%20%44%41%54%41%5F%45%58%46%49%4C',
    answer: 'FURIOS-INT DATA_EXFIL',
    hint: 'URL encoding replaces special characters with `%XX` where XX is the hex ASCII code. %46 = \'F\', %55 = \'U\'…',
    howTo: '```python\nimport urllib.parse\nprint(urllib.parse.unquote("%46%55%52%49%4F%53%2D%49%4E%54%20%44%41%54%41%5F%45%58%46%49%4C"))\n# Or: CyberChef > URL Decode\n```',
    xp: 110,
    technique: 'URL encoding (percent-encoding, RFC 3986) is abused by attackers to bypass WAF/IDS rules. Always decode before matching against patterns.',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decrypt')
    .setDescription('CTF-style decryption challenge — decode the message to earn XP (educational crypto)')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Cipher/encoding type (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '🔢 Base64 — standard encoding',          value: 'BASE64'    },
          { name: '🔄 ROT13 — Caesar shift-13',              value: 'ROT13'     },
          { name: '🟦 Hex — hexadecimal encoding',           value: 'HEX'       },
          { name: '🔠 Caesar-7 — shift cipher',              value: 'CAESAR_7'  },
          { name: '💻 Binary — 8-bit ASCII',                 value: 'BINARY'    },
          { name: '🔗 URL Encode — percent encoding',        value: 'URL_ENCODE'},
        )
    )
    .addStringOption(opt =>
      opt.setName('attempt')
        .setDescription('Your decoded answer — submit to earn XP!')
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(interaction, { SITE_URL }) {
    const typeKey = interaction.options.getString('type');
    const attempt = interaction.options.getString('attempt');

    const ch = typeKey ? CHALLENGES.find(c => c.type === typeKey) : CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];

    // If user submitted an answer attempt — check it
    if (attempt) {
      const clean     = attempt.toUpperCase().replace(/[^A-Z0-9_\-\s]/g, '').trim();
      const cleanAns  = ch.answer.toUpperCase().replace(/[^A-Z0-9_\-\s]/g, '').trim();
      const correct   = clean === cleanAns;

      const embed = new EmbedBuilder()
        .setColor(correct ? 0x00ff41 : 0xff003c)
        .setTitle(correct ? `✅ CORRECT — ${ch.type} DECRYPTED` : `❌ INCORRECT — ${ch.type} CHALLENGE`)
        .setDescription(
          correct
            ? `**⚡ +${ch.xp} XP awarded!** Mission intel successfully extracted.\n> *"${ch.answer}"*`
            : `Decryption attempt failed. Study the technique and try again.\n\nHint: ${ch.hint}`
        )
        .addFields(
          { name: '🔒 Encoded', value: `\`${ch.encoded}\``, inline: false },
          correct ? { name: '🔓 Decoded',  value: `\`${ch.answer}\``, inline: false } : { name: '💡 Hint', value: ch.hint, inline: false },
          { name: `📚 About ${ch.type}`, value: ch.technique, inline: false },
          { name: '🛠️ How to decode', value: ch.howTo, inline: false },
        )
        .setFooter({ text: `FURIOS-INT CryptoOps • ${correct ? '🏆 Challenge Cleared' : '⚠️ Try Again'} • CyberOS v2026.3` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // No attempt — just display the challenge
    const embed = new EmbedBuilder()
      .setColor(ch.color)
      .setTitle(`${ch.icon} DECRYPT CHALLENGE — ${ch.type}`)
      .setDescription(
        '```\n' +
        '╔══════════════════════════════════════╗\n' +
        '║  FURIOS-INT CRYPTOPS CHALLENGE       ║\n' +
        `║  Type: ${ch.type.padEnd(28)}║\n` +
        `║  Reward: ${String('+' + ch.xp + ' XP').padEnd(27)}║\n` +
        '╚══════════════════════════════════════╝\n' +
        '```'
      )
      .addFields(
        {
          name: '🔒 INTERCEPTED TRANSMISSION',
          value: `\`\`\`\n${ch.encoded}\n\`\`\``,
          inline: false,
        },
        { name: '💡 Hint', value: ch.hint, inline: false },
        { name: `📚 About ${ch.type}`, value: ch.technique, inline: false },
        { name: '🛠️ Decode Tools', value: ch.howTo, inline: false },
        {
          name: '📤 Submit Your Answer',
          value: `Run: \`/decrypt type:${ch.type} attempt:YOUR_DECODED_TEXT\`\nCorrect answer earns **+${ch.xp} XP**`,
          inline: false,
        },
      )
      .setFooter({ text: 'FURIOS-INT CryptoOps // Decode to earn XP • CyberOS v2026.3-FLLC' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🔑 CyberChef Decoder').setStyle(ButtonStyle.Link).setURL('https://gchq.github.io/CyberChef/'),
      new ButtonBuilder().setLabel('⚔️ War Games').setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/wargames.html`),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
