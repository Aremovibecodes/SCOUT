const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

async function testContentBounties() {
  try {
    const pageResponse = await fetch('https://superteam.fun/earn/all/');
    const html = await pageResponse.text();

    const buildIdMatch = html.match(/\/_next\/static\/([^\/]+)\/_buildManifest\.js/);
    if (!buildIdMatch) {
      console.log('Could not find build ID. First 1000 characters:');
      console.log(html.slice(0, 1000));
      return;
    }
    const buildId = buildIdMatch[1];
    console.log('Found build ID:', buildId);

    const dataUrl = 'https://superteam.fun/_next/data/' + buildId + '/earn/all.json?category=Content';
    const dataResponse = await fetch(dataUrl);
    const data = await dataResponse.json();

    console.log('Content bounty data preview:');
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testContentBounties();