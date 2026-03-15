# RV Health Care Platform

A full-stack healthcare platform connecting doctors and patients — prescriptions, diagnostics, live queue tracking, AI-powered results, secure messaging, and pharmacy routing. All in one elegant interface.

## What it does

```
DOCTOR                              PATIENT
  │                                   │
  ├─ Writes prescription ────────────►├─ Receives in app instantly
  │                                   ├─ Selects nearest pharmacy
  │                                   ├─ Gets "Ready for Pickup" alert 🔔
  │                                   │
  ├─ Schedules MRI ──────────────────►├─ Sees booking confirmed
  │                                   ├─ Live queue position (#3 of 8)
  │                                   ├─ Gets "You're Next!" alert
  │                                   │
  ├─ Uploads results ────────────────►├─ AI plain-English summary
  │   Claude generates summary         ├─ Full lab values on demand
  │                                   │
  └─ Approves refill ◄───────────────└─ One-tap refill request
```

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| AI        | Claude Haiku (plain-English result summaries)  |
| Backend   | Node.js · Express · SQLite (better-sqlite3)    |
| Frontend  | React 18 · Vite · Custom CSS Design System     |
| Scheduler | setInterval queue simulation + pharmacy timers |

## Project Structure

```
medeo-health/
├── backend/
│   └── src/
│       ├── db.js        # SQLite schema + seed data (doctors, patients, Rx, diagnostics)
│       ├── index.js     # Express API (prescriptions, diagnostics, messages, queue)
│       └── agent.js     # Claude Haiku — AI result summaries & medication instructions
└── frontend/
    └── src/
        ├── App.jsx                     # Role-based routing + user context
        ├── App.css                     # Complete design system (variables, components)
        ├── lib/api.js                  # Typed API client
        └── components/
            ├── Layout.jsx              # Sidebar + nav + demo user switcher
            ├── Messages.jsx            # Secure real-time messaging
            ├── doctor/
            │   ├── Dashboard.jsx       # Stats + activity overview
            │   ├── Prescriptions.jsx   # Write & manage prescriptions
            │   ├── Diagnostics.jsx     # Schedule MRI/CT/labs + upload results
            │   └── RefillRequests.jsx  # Approve / deny patient refill requests
            └── patient/
                ├── Dashboard.jsx       # Health summary + live queue cards
                ├── Prescriptions.jsx   # View Rx + pharmacy selector modal
                ├── Queue.jsx           # Live queue tracker with dots + progress
                └── Results.jsx         # AI plain-English results summaries
```

## Getting Started

### Backend

```bash
cd backend
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev    # API on :3003
```

> Without `ANTHROPIC_API_KEY`, a fallback summary is used. Everything else works normally.

### Frontend

```bash
cd frontend
npm install
npm run dev    # UI on :5174
```

Open [http://localhost:5174](http://localhost:5174)

## Demo

The app ships with pre-seeded data. Use the **user switcher** (bottom-left sidebar) to toggle between:

| User               | Role   | Demo highlights                         |
|--------------------|--------|-----------------------------------------|
| Dr. Sarah Mitchell | Doctor | Write prescriptions, schedule MRI       |
| Emma Rodriguez     | Patient| MRI in queue (#3), Atorvastatin ready 🔔|
| Michael Chen       | Patient| CT Scan scheduled, active prescriptions |

## Key Features

### For Doctors
- **Write Prescriptions** — medication autocomplete, dosage, frequency, refill authorization
- **Schedule Diagnostics** — MRI, CT, Blood Work etc. with facility and time
- **Upload Results** — Claude AI auto-generates a plain-English patient summary
- **Refill Requests** — one-tap approve or deny with reason tracking
- **Secure Messaging** — HIPAA-compliant chat with patients

### For Patients
- **Prescription Tracking** — see all medications and current status
- **Send to Pharmacy** — browse nearest pharmacies by distance, rating, hours
- **Ready for Pickup Alert** — animated notification when prescription is ready 🔔
- **Live Queue Tracker** — real-time position, estimated wait, progress bar and dot visualization
- **"You're Next!" Alert** — animated banner when they're first in queue
- **AI Results Summary** — plain-English translation of lab values and imaging findings
- **Refill Request** — one-tap request that notifies doctor immediately
- **Secure Messaging** — chat directly with doctor

## API Reference

```
GET  /api/dashboard/doctor/:id        Doctor stats + activity
GET  /api/dashboard/patient/:id       Patient health summary

GET  /api/prescriptions               List prescriptions (filter by doctor_id or patient_id)
POST /api/prescriptions               Create new prescription
POST /api/prescriptions/:id/send-to-pharmacy  Route to pharmacy (triggers 30s ready timer)
POST /api/prescriptions/:id/refill    Patient requests refill
PATCH /api/prescriptions/:id/mark-filled  Mark as picked up

GET  /api/refill-requests             List (filter by doctor_id)
PATCH /api/refill-requests/:id        Approve or deny

GET  /api/diagnostics                 List diagnostics
POST /api/diagnostics                 Schedule new diagnostic
PATCH /api/diagnostics/:id/results   Upload results → Claude generates summary
POST /api/diagnostics/:id/summarize  Re-generate AI summary

GET  /api/pharmacies                  Nearby pharmacies sorted by distance
GET  /api/messages                    Conversation thread (user_id + other_id)
POST /api/messages                    Send message
GET  /api/messages/contacts/:userId   Contact list with unread counts
```

## Design System

Built entirely with custom CSS — no UI library dependencies.

- **Colors**: Primary blue, teal for patients, semantic status colors
- **Components**: Cards, badges, avatars, modals, progress bars, queue dots
- **Typography**: Inter — clean, medical-grade readability
- **Animations**: Smooth transitions, pulse for live indicators, slide-up for modals
- **Responsive**: Fluid grid collapses gracefully on smaller screens
