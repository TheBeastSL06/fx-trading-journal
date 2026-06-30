# FX Trading Journal

A fully online trading journal PWA for tracking FX trades (GBPUSD, EURUSD, XAUUSD, Others), with a Google Sheets backend. Optimized for desktop and mobile.

## Features

- **Dashboard** — Win rate, profit factor, net P&L, equity curve ($), daily/weekly/monthly summaries, pair/session/direction breakdowns.
- **Trade Log** — Add/edit/delete trades with Pair, Session (London/NY), Direction, Lot Size, Risk (R + $), Reward (R + $), Result, Notes. Filterable table.
- **Settings** — Configure Google Sheets connection, set initial balance, log deposits/withdrawals, view account history.
- **PWA** — Installable on desktop & mobile. No offline caching (always fetches fresh data).

## Setup

### 1. Google Sheet

Create a new Google Sheet with two tabs:

**`Trades`** — header row:
```
ID | Date | Time | Pair | Session | Direction | LotSize | RiskR | RiskUSD | RewardR | RewardUSD | Result | Notes
```

**`Account`** — header row:
```
ID | Type | Date | Amount | Notes
```

### 2. Apps Script Backend

1. In your Sheet, go to **Extensions → Apps Script**.
2. Delete the boilerplate code and paste in the contents of [`apps-script.js`](./apps-script.js) from this repo.
3. Click **Deploy → New deployment**.
4. Select type: **Web app**.
5. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize the permissions, and copy the **Web app URL**.

> Whenever you edit the script later, redeploy as a **new version** (Deploy → Manage deployments → Edit → New version) — the URL stays the same.

### 3. Connect the App

1. Open the app → **Settings** tab.
2. Paste your Web App URL into **Google Apps Script URL**.
3. Click **Save Configuration**.
4. Set your **Initial Balance** and start date, then save.

### 4. Host on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages** in your repo.
3. Set source to your main branch, root folder.
4. Your app will be live at `https://<username>.github.io/<repo>/`.
5. Visit on mobile → browser menu → **Add to Home Screen** to install as a PWA.

## Tech Stack

- Vanilla HTML/CSS/JS (no build step, no frameworks)
- Chart.js for visualizations
- Google Apps Script + Google Sheets as the database/API
- GitHub Pages for hosting

## File Structure

```
/
├── index.html
├── manifest.json
├── apps-script.js       ← paste into Google Apps Script
├── css/style.css
├── js/
│   ├── config.js
│   ├── api.js
│   ├── utils.js
│   ├── dashboard.js
│   ├── journal.js
│   ├── settings.js
│   └── app.js
└── icons/icon.svg
```

## Notes

- All risk/reward values are entered manually as both R-multiple and $ amount — they are not auto-calculated from each other.
- The equity curve plots cumulative $ balance including deposits/withdrawals and trade P&L, in chronological order.
- This is a fully online app — no offline support, no service worker, no caching headaches when you update files.
