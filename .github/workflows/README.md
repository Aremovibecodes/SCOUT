# Scout

An autonomous income-opportunity agent. Scout watches hackathons, bug bounties, and content bounties, filters them against your criteria, and proactively messages you the moment something matches — no app to open, no button to press.

## What it does

- Monitors three categories: hackathons (Devpost), bug bounties (Immunefi), content bounties (Superteam Earn)
- Filters by prize amount, deadline window, and recency
- Sends real-time alerts via Telegram and Discord, using one unified handler built on the [Caspian SDK](https://github.com/TryCaspian/caspian-sdk)
- Runs fully autonomously on a schedule via GitHub Actions — no server, no manual triggering
- Tracks what's already been reported so you're never alerted twice about the same opportunity

## How it works

1. A GitHub Actions workflow runs `scanner.js` every 3 hours
2. The scanner checks each source's live API, filters for new matches against your preferences
3. New matches get sent as a formatted message to Telegram and Discord in real time
4. Seen opportunities get saved back to the repo, so the agent remembers state across runs

## Tech stack

Node.js, Caspian SDK, GitHub Actions

## Preferences

Edit the config block at the top of `scanner.js`:

```javascript
const WANTED_CATEGORIES = ['hackathons', 'bugBounty', 'contentBounty'];
const MIN_PRIZE_USD = 0;
const MAX_DAYS_TO_DEADLINE = 30;
```

## What's next

- Additional sources per category (MLH for hackathons, more bug/content bounty platforms)
- "Why You?" match scoring — explaining why each opportunity was flagged, not just that it was
- Written preferences onboarding flow

## Built for

Caspian Buildathon, by Aremo.