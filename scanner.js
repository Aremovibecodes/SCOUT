require('dotenv').config();
const { CommClient } = require('caspian-sdk');
const fs = require('fs');

const WANTED_CATEGORIES = ['hackathons', 'bugBounty', 'contentBounty'];
const MIN_PRIZE_USD = 0;
const MAX_DAYS_TO_DEADLINE = 30;
const MAX_DAYS_SINCE_UPDATE = 7;

const SEEN_FILE = 'seen.json';

function loadSeen() {
  try {
    return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveSeen(seenIds) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seenIds, null, 2));
}

function parsePrizeAmount(prizeStr) {
  if (!prizeStr) return 0;
  const cleaned = prizeStr.replace(/<[^>]+>/g, '').replace(/,/g, '');
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function parseDaysLeft(timeLeftStr) {
  if (!timeLeftStr) return null;
  const dayMatch = timeLeftStr.match(/(\d+)\s*days?\s*left/i);
  if (dayMatch) return parseInt(dayMatch[1]);
  const monthMatch = timeLeftStr.match(/(\d+)\s*months?\s*left/i);
  if (monthMatch) return parseInt(monthMatch[1]) * 30;
  return null;
}

const client = new CommClient();

async function checkHackathons(seenIds) {
  try {
    const response = await fetch('https://devpost.com/api/hackathons?status[]=open');
    const data = await response.json();
    const hackathons = data.hackathons;

    const matches = hackathons.filter(function(h) {
      const prize = parsePrizeAmount(h.prize_amount);
      const daysLeft = parseDaysLeft(h.time_left_to_submission);
      const meetsBudget = prize >= MIN_PRIZE_USD;
      const withinWindow = daysLeft !== null && daysLeft <= MAX_DAYS_TO_DEADLINE;
      const notSeenYet = !seenIds.includes('hackathon-' + h.id);
      return meetsBudget && withinWindow && notSeenYet;
    });

    console.log('Hackathon matches found:', matches.length);
    matches.forEach(function(h) {
      console.log('-', h.title, '|', h.prize_amount.replace(/<[^>]+>/g, ''), '|', h.time_left_to_submission);
      seenIds.push('hackathon-' + h.id);
    });

    return matches.map(function(h) {
      return {
        category: 'Hackathon',
        title: h.title,
        prize: h.prize_amount.replace(/<[^>]+>/g, ''),
        deadline: h.time_left_to_submission,
        sponsor: h.organization_name,
        link: h.url
      };
    });
  } catch (err) {
    console.error('Hackathon check failed:', err);
    return [];
  }
}

async function checkBugBounty(seenIds) {
  try {
    const response = await fetch('https://raw.githubusercontent.com/infosec-us-team/Immunefi-Bug-Bounty-Programs-Unofficial/main/projects.json');
    const programs = await response.json();

    const now = new Date();
    const matches = programs.filter(function(p) {
      const updated = new Date(p.updatedDate);
      const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);
      const isRecent = daysSinceUpdate <= MAX_DAYS_SINCE_UPDATE;
      const meetsBudget = p.maxBounty >= MIN_PRIZE_USD;
      const isOpenToAll = p.inviteOnly === false;
      const notSeenYet = !seenIds.includes('bugbounty-' + p.slug);
      return isRecent && meetsBudget && isOpenToAll && notSeenYet;
    });

    console.log('Bug bounty matches found:', matches.length);
    matches.forEach(function(p) {
      console.log('-', p.project, '| max bounty:', p.maxBounty, '| updated:', p.updatedDate);
      seenIds.push('bugbounty-' + p.slug);
    });

    return matches.map(function(p) {
      return {
        category: 'Bug Bounty',
        title: p.project,
        prize: 'up to $' + p.maxBounty,
        deadline: 'ongoing, updated ' + p.updatedDate.slice(0, 10),
        sponsor: p.project,
        link: 'https://immunefi.com/bug-bounty/' + p.slug + '/'
      };
    });
  } catch (err) {
    console.error('Bug bounty check failed:', err);
    return [];
  }
}

async function checkContentBounty(seenIds) {
  try {
    const response = await fetch('https://superteam.fun/api/listings?context=all&tab=all&category=Content&status=open&sortBy=Date&order=asc&region=&sponsor=');
    const listings = await response.json();

    const now = new Date();
    const matches = listings.filter(function(listing) {
      const deadline = new Date(listing.deadline);
      const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
      const meetsBudget = listing.rewardAmount >= MIN_PRIZE_USD;
      const withinWindow = daysLeft > 0 && daysLeft <= MAX_DAYS_TO_DEADLINE;
      const notSeenYet = !seenIds.includes(listing.id);
      return meetsBudget && withinWindow && notSeenYet;
    });

    console.log('Content bounty matches found:', matches.length);
    matches.forEach(function(m) {
      console.log('-', m.title, '|', m.rewardAmount, m.token, '| deadline:', m.deadline);
      seenIds.push(m.id);
    });

    return matches.map(function(listing) {
      return {
        category: 'Content Bounty',
        title: listing.title,
        prize: listing.rewardAmount + ' ' + listing.token,
        deadline: listing.deadline,
        sponsor: listing.sponsor.name,
        link: 'https://superteam.fun/listing/' + listing.slug
      };
    });
  } catch (err) {
    console.error('Content bounty check failed:', err);
    return [];
  }
}
function formatAlert(result) {
  return '🚨 New ' + result.category + '\n\n' +
    result.title + '\n' +
    'Prize: ' + result.prize + '\n' +
    'Deadline: ' + result.deadline + '\n' +
    'Sponsor: ' + result.sponsor + '\n' +
    result.link;
}

async function sendAlerts(results) {
  for (const result of results) {
    const message = formatAlert(result);
    try {
      await client.sendMessage(process.env.TELEGRAM_CONVERSATION_ID, message, null, null);
      console.log('Sent to Telegram:', result.title);
    } catch (err) {
      console.error('Telegram send failed:', err.message || err);
    }
    try {
      await client.sendMessage(process.env.DISCORD_CONVERSATION_ID, message, null, null);
      console.log('Sent to Discord:', result.title);
    } catch (err) {
      console.error('Discord send failed:', err.message || err);
    }
  }
}   
async function main() {
  const seenIds = loadSeen();
  let allResults = [];

  if (WANTED_CATEGORIES.includes('hackathons')) {
    const results = await checkHackathons(seenIds);
    allResults = allResults.concat(results);
  }
  if (WANTED_CATEGORIES.includes('bugBounty')) {
    const results = await checkBugBounty(seenIds);
    allResults = allResults.concat(results);
  }
  if (WANTED_CATEGORIES.includes('contentBounty')) {
    const results = await checkContentBounty(seenIds);
    allResults = allResults.concat(results);
  }

  console.log('TOTAL new matches this run:', allResults.length);
  saveSeen(seenIds);
  await sendAlerts(allResults);
}

main();