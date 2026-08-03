const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { CommClient } = require('caspian-sdk');

const client = new CommClient();

async function setup() {
  try {
    const telegram = await client.connectTelegram({ botToken: process.env.TELEGRAM_BOT_TOKEN });
    console.log('Telegram connected. Full response:', JSON.stringify(telegram, null, 2));

    const discord = await client.installDiscord({ displayName: 'Scout' });
    console.log('Discord setup. Full response:', JSON.stringify(discord, null, 2));
  } catch (err) {
    console.error('Setup failed:', err);
  }
}

setup();