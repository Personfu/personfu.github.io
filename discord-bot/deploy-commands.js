/**
 * deploy-commands.js
 * Registers all slash commands with Discord for guild 1159996494691188765.
 * Run once: `node deploy-commands.js`
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1170817211837992981';
const GUILD_ID  = process.env.DISCORD_GUILD_ID  || '1159996494691188765';

if (!TOKEN) { console.error('DISCORD_TOKEN not set'); process.exit(1); }

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  if ('data' in cmd) commands.push(cmd.data.toJSON());
}

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash commands to guild ${GUILD_ID}…`);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log(`✓ Deployed ${data.length} commands.`);
    data.forEach(c => console.log(`  /${c.name}`));
  } catch (err) {
    console.error('Deploy error:', err);
  }
})();
