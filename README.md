# MRomih Automations — 24/7 Revenue Scout & Autonomous CEO Brain

Autonomous, $0-budget cloud intelligence engine powering MRomih Automations.

## Architecture

1. **24/7 Cloud Opportunity Scout (`scout.js`):**
   - Runs every 30 minutes via `.github/workflows/scout_cron.yml`.
   - Scans Algora USD escrow bounties, Opire rewards (`https://api.opire.dev/rewards`), and official n8n Community Jobs (`https://community.n8n.io/c/jobs/13.json`).
   - Verifies 0 competing pull requests and issues open status.
   - Pushes verified opportunity leads to `@RomihCO_bot` with `⚡ Action Required` advisory steps.

2. **Autonomous CEO Brain (`brain.js`):**
   - Runs every 48 hours via `.github/workflows/ceo-brain.yml` (`0 9 */2 * *`) + `workflow_dispatch`.
   - Ingests `telemetry.json`, live community job market trends, bounties, and current agency storefronts.
   - Leverages Google Gemini Flash API (`gemini-3.5-flash-lite`) as Chief Operating Officer & Growth Strategist.
   - Dispatches a formatted `🟢 [CEO BRAIN — GROWTH PUSH]` directive to `@RomihCO_bot` featuring Situation Diagnosis, #1 48-hour client acquisition action, and a ready-to-copy execution prompt.

## Secrets Configuration
Configured securely via GitHub Actions Secrets (zero plaintext credentials in repo):
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `GEMINI_API_KEY`
- `GH_PAT`
