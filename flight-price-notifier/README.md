# Flight Price Drop Notifier — Auto-Rebook Agent

An AI agent that watches your booked flights and **automatically rebooks** when a cheaper refundable fare appears — powered by **Claude Opus 4.6** with adaptive thinking and tool use.

## How it works

```
You book a flight at $580 → Agent monitors prices → Price drops to $420
→ Claude reasons: "Net savings = $580 - $420 - $50 cancel fee = $110 → rebook"
→ Old booking cancelled, new ticket issued automatically
→ You're notified, no action needed
```

## Tech Stack

| Layer | Tech |
|-------|------|
| AI Agent | Claude Opus 4.6 · Adaptive thinking · Tool use |
| Backend | Node.js · Express · SQLite |
| Scheduler | node-cron (checks every 6 hours) |
| Frontend | React · Vite · CSS Modules |

## Project Structure

```
flight-price-notifier/
├── backend/src/
│   ├── index.js      # Express API + cron scheduler
│   ├── db.js         # SQLite schema (trips, price history, rebook events, agent logs)
│   ├── agent.js      # Claude Opus 4.6 agentic loop (adaptive thinking + streaming)
│   └── flights.js    # Mock flight price engine (replace with real API)
└── frontend/src/
    ├── App.jsx        # Dashboard with stats + trip grid
    └── components/
        ├── AddTripModal.jsx  # Add watched flight + live price preview
        └── TripDetail.jsx    # Price chart, agent logs, rebook history
```

## Getting Started

```bash
# Backend
cd backend
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev   # API on :3002

# Frontend (new terminal)
cd frontend
npm install
npm run dev    # UI on :5173
```

## Claude Agent

The agent (`agent.js`) uses three tools in an agentic loop:

| Tool | Description |
|------|-------------|
| `search_flights` | Get current fares for a route/date |
| `get_cancellation_fee` | Get the change fee for an existing booking |
| `rebook_flight` | Cancel old booking and issue new ticket |

**Rebooking criteria (enforced by Claude):**
- Net savings > $20 (price drop minus cancellation fee)
- Ticket must be refundable
- Claude explains its reasoning in the agent logs

## API Endpoints

```
GET  /api/trips               List all watched flights
POST /api/trips               Add a flight to watch (auto-seeded with mock price)
DEL  /api/trips/:id           Remove a watched flight

POST /api/trips/:id/check     Trigger immediate Claude agent analysis
GET  /api/trips/:id/history   Price history for a trip
GET  /api/trips/:id/rebooks   Rebook events for a trip
GET  /api/trips/:id/logs      Agent logs for a trip

POST /api/search              Search current prices (no Claude)
GET  /api/stats               Totals: active trips, rebooks, $ saved
```

## Replacing the Mock Flight API

`flights.js` uses a deterministic price engine for demo purposes. To use real flight data, replace `searchFlightPrices()` in `flights.js` with calls to:
- **Amadeus** — `amadeus.shopping.flightOffersSearch.get(...)`
- **Skyscanner API** — via RapidAPI
- **Google Flights** — via SerpAPI

The agent tools (`TOOLS` in `agent.js`) are already structured to match real airline API responses.
