require('dotenv').config();
const { CommClient } = require('caspian-sdk');

const client = new CommClient();

async function testProactive() {
  try {
   const result = await client.sendMessage(
  process.env.TELEGRAM_CONVERSATION_ID,
  "Scout here — this is a test of a proactive, unprompted message.",
  null,
  null
);
    console.log('Send result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Proactive send failed:', err.message || err);
  }
}

testProactive();