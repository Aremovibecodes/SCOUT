require('dotenv').config();
const { CommClient } = require('caspian-sdk');

const client = new CommClient();

client.onMessage(function(message) {
  console.log('Message keys:', Object.keys(message));
  try {
    console.log('Full message:', JSON.stringify(message, function(key, value) {
      return typeof value === 'function' ? undefined : value;
    }, 2));
  } catch (err) {
    console.log('Could not stringify:', err.message);
  }
});

client.listen();