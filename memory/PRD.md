# FACTIONOPS — Torn Faction Activity Tracker

## Original Problem Statement
"i need a spread sheet that pulls Torn API and tracks when my faction is active and when my enemy faction is active."

## User Choices
- Build with mock data first; add Torn API key later
- Track full details: online status, status (hospital/jail/okay), last action, chain
- Poll every 30s
- Live grid + historical timeline chart
- Dark tactical/ops dashboard theme

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async). Endpoints under `/api`:
  - `GET /api/` health
  - `GET /api/settings` / `POST /api/settings` — single-doc settings (api_key masked, empty values preserved)
  - `GET /api/live` — pulls Torn faction basic+chain selections (or deterministic mock when `use_mock=true` or key is empty). Writes a snapshot on each call.
  - `GET /api/history?hours=N` — timeline data
  - `POST /api/history/seed?hours=N` — synthetic diurnal seed
  - `DELETE /api/history` — clear buffer
- **Frontend**: React + Tailwind + shadcn + Recharts. Tactical HUD (Rajdhani/JetBrains Mono, cyan/green/red accents on #050505, grid borders, zero border-radius).

## Core Requirements
- Live member grid for two factions (friendly + hostile) with online status, state (Okay/Hospital/Jail/Traveling/Abroad), level, last action.
- Faction summary KPIs: online, idle, hospital, chain current/max.
- Timeline chart (step line) with 1h/6h/24h/3d/7d windows showing active + hospital counts for both factions.
- 30s polling with visible countdown + manual Pull Now.
- Ops Config sheet to set Torn API key, faction IDs, names, mock toggle.

## Implemented (2026-02-06)
- Backend endpoints + mock generator + Torn API integration via httpx
- Mongo-backed snapshot buffer feeding the timeline
- Dashboard with header stats, dual faction panels, timeline, settings sheet, reseed, manual refresh
- Scanline grain overlay, blinking indicators, LED-glow online dots, HUD grid background
- API key masking + preserve-on-empty behavior verified

## Backlog (priority)
- P1: Hourly activity heatmap (hour-of-day × day-of-week bucketed from snapshots)
- P1: Alert when enemy active count crosses a threshold (desktop/sound notification)
- P2: Members-online delta diff since last pull (who just came online/went offline)
- P2: Chain watch widget — big countdown of enemy chain cooldown
- P2: Multi-faction watchlist (track >1 enemy at a time)
- P3: CSV export of raw snapshot buffer
