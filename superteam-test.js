const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

async function testListings() {
  try {
    const response = await fetch('https://superteam.fun/api/agents/listings/live?take=5', {
      headers: { 'Authorization': 'Bearer ' + process.env.SUPERTEAM_API_KEY }
    });
    const data = await response.json();
    console.log('Full response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

testListings();