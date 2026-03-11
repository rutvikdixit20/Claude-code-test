# Moving Helper Coordinator

A full-stack app that turns the chaos of moving into a structured, deadline-driven checklist. Enter your move date and instantly get a pre-populated timeline covering:

- **Planning** — budget, movers, time off
- **Sorting & Packing** — room-by-room with labeled boxes
- **Utilities** — electricity, gas, water, internet transfers
- **Admin** — DMV, bank, USPS forwarding, subscriptions, employer
- **Move Day** — final walkthrough, keys, meter readings

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, CSS Modules |
| Backend | Node.js, Express |
| Database | SQLite (via better-sqlite3) |

## Project Structure

```
moving-helper/
├── backend/
│   └── src/
│       ├── index.js     # Express API routes
│       ├── db.js        # SQLite setup + schema
│       └── tasks.js     # Default task generator
└── frontend/
    └── src/
        ├── App.jsx      # Root layout + sidebar
        ├── components/
        │   ├── TaskBoard.jsx         # Task list with filters + progress
        │   └── NewMoveModal.jsx      # Create move form
        ├── hooks/useMove.js          # API-connected state hooks
        └── lib/api.js                # Fetch helpers
```

## Getting Started

**Backend:**
```bash
cd backend
npm install
npm run dev        # API on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # UI on http://localhost:5173
```

## Features

- **Auto-generated checklist** — 28 tasks seeded from your move date, each with a calculated deadline
- **Progress bar** — visual completion tracking across all categories
- **Due date badges** — color-coded: upcoming (blue), urgent ≤3 days (orange), overdue (red)
- **Filter view** — show All / Pending / Done tasks
- **Custom tasks** — add anything not in the default list
- **Multiple moves** — manage relocations from the sidebar

## API Endpoints

```
GET    /api/moves                 List all moves
POST   /api/moves                 Create move (seeds default tasks)
DELETE /api/moves/:id             Delete move + all tasks

GET    /api/moves/:id/tasks       List tasks for a move
POST   /api/moves/:id/tasks       Add custom task
PATCH  /api/tasks/:id             Update task (toggle complete, edit fields)
DELETE /api/tasks/:id             Delete task
```
