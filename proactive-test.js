const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { CommClient } = require('caspian-sdk');

const client = new CommClient();

async function testProactive() {
  console.log('Using Discord conversation ID:', process.env.DISCORD_CONVERSATION_ID);

  try {
    const result = await client.sendMessage(
      process.env.DISCORD_CONVERSATION_ID,
      "Scout here — testing proactive send on Discord.",
      null,
      null
    );
    console.log('Send result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Proactive send failed:', err);
  }
}

testProactive();