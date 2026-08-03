const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

async function testImmunefi() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/infosec-us-team/Immunefi-Bug-Bounty-Programs-Unofficial/main/projects.json');
    const data = await response.json();

    console.log('Total programs:', data.length);

    const p = data[0];
    console.log('project:', JSON.stringify(p.project));
    console.log('updatedDate:', p.updatedDate);
    console.log('launchDate:', p.launchDate);
    console.log('maxBounty:', p.maxBounty);
    console.log('inviteOnly:', p.inviteOnly);
    console.log('slug:', p.slug);
    console.log('productType:', JSON.stringify(p.productType));
    console.log('ecosystem:', JSON.stringify(p.ecosystem));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testImmunefi();