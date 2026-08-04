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

function chunkAlertMessage(results, maxLength) {
  const chunks = [];
  const header = "🚨 Scout found " + results.length + " new opportunit" + (results.length === 1 ? "y" : "ies") + "\n\n";
  let current = header;

  results.forEach(function(r) {
    let entry = "📁 " + r.category + "\n";
    entry += r.title + "\n";
    entry += "Sponsor: " + r.sponsor + "\n";
    entry += "Prize: " + r.prize + "\n";
    entry += "Deadline: " + r.deadline + "\n";
    entry += "Link: " + r.link + "\n\n";

    if ((current + entry).length > maxLength) {
      chunks.push(current);
      current = entry;
    } else {
      current += entry;
    }
  });

  if (current.length > 0) chunks.push(current);
  return chunks;
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

    matches.forEach(function(h) { seenIds.push('hackathon-' + h.id); });

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

    matches.forEach(function(p) { seenIds.push('bugbounty-' + p.slug); });

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

    matches.forEach(function(m) { seenIds.push(m.id); });

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

async function main() {
  const seenIds = loadSeen();
  let allResults = [];

  if (WANTED_CATEGORIES.includes('hackathons')) {
    allResults = allResults.concat(await checkHackathons(seenIds));
  }
  if (WANTED_CATEGORIES.includes('bugBounty')) {
    allResults = allResults.concat(await checkBugBounty(seenIds));
  }
  if (WANTED_CATEGORIES.includes('contentBounty')) {
    allResults = allResults.concat(await checkContentBounty(seenIds));
  }

  console.log('TOTAL new matches this run:', allResults.length);

  if (allResults.length > 0) {
    console.log('Using Telegram conv ID:', process.env.TELEGRAM_CONVERSATION_ID);
    console.log('Using Discord conv ID:', process.env.DISCORD_CONVERSATION_ID);

    const chunks = chunkAlertMessage(allResults, 1500);
    console.log('Sending', chunks.length, 'chunk(s) per channel...');

    for (let i = 0; i < chunks.length; i++) {
      try {
        await client.sendMessage(process.env.TELEGRAM_CONVERSATION_ID, chunks[i], null, null);
        console.log('Telegram chunk', i + 1, 'sent OK');
      } catch (err) {
        console.error('Telegram chunk', i + 1, 'FAILED:', err.message || err);
      }

      try {
        await client.sendMessage(process.env.DISCORD_CONVERSATION_ID, chunks[i], null, null);
        console.log('Discord chunk', i + 1, 'sent OK');
      } catch (err) {
        console.error('Discord chunk', i + 1, 'FAILED:', err.message || err);
      }
    }
  } else {
    console.log('No new matches - no alert sent.');
  }

  saveSeen(seenIds);
}

main();