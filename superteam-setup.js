const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

async function registerAgent() {
  try {
    const response = await fetch('https://superteam.fun/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'scout-income-agent' })
    });
    const data = await response.json();
    console.log('Full response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Registration failed:', err);
  }
}

registerAgent();