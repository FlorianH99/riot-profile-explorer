# Riot Profile Explorer

A small full-stack site for looking up League of Legends player data with Riot's public APIs.

## What it does

- Searches by Riot ID: `gameName#tagLine`
- Uses the correct platform route plus auto-mapped regional route
- Pulls account, summoner, ranked, champion mastery, and recent match data
- Keeps a raw JSON inspector on the page so you can inspect payload shape directly

## Setup

1. Install dependencies:
   - `npm install`
2. Create `.env` in the project root:
   - `RIOT_API_KEY=RGAPI-your-key-here`
   - `PORT=5050`
3. Start the app:
   - `npm run dev`

The Vite client runs on `http://localhost:5173` and proxies API requests to the local Node server on port `5050`.

## Notes

- Riot development keys expire every 24 hours.
- The backend proxy keeps the key out of browser code.
- This app is aimed at local or personal use unless you upgrade your Riot app access tier.
