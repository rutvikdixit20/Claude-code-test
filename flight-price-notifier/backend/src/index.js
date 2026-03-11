import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import db from './db.js';
import { searchFlightPrices } from './flights.js';
import { analyzeAndRebook } from './agent.js';

const app = express();
app.use(cors());
app.use(express.json());

// ── Watched Trips ─────────────────────────────────────────────────────────────

app.get('/api/trips', (_req, res) => {
  const trips = db
    .prepare('SELECT * FROM watched_trips ORDER BY created_at DESC')
    .all();
  res.json(trips);
});

app.post('/api/trips', (req, res) => {
  const {
    label, origin, destination, depart_date, return_date,
    cabin = 'economy', passengers = 1, booked_price, booking_ref,
    cancellation_fee = 0, refundable = true,
  } = req.body;

  if (!label || !origin || !destination || !depart_date || !booked_price || !booking_ref) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = db.prepare(`
    INSERT INTO watched_trips
      (label, origin, destination, depart_date, return_date, cabin, passengers,
       booked_price, current_price, booking_ref, cancellation_fee, refundable)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    label, origin.toUpperCase(), destination.toUpperCase(), depart_date, return_date ?? null,
    cabin, passengers, booked_price, booked_price, booking_ref,
    cancellation_fee, refundable ? 1 : 0
  );

  // Seed initial price history
  db.prepare('INSERT INTO price_history (trip_id, price) VALUES (?, ?)').run(
    result.lastInsertRowid,
    booked_price
  );

  res.json(db.prepare('SELECT * FROM watched_trips WHERE id = ?').get(result.lastInsertRowid));
});

app.patch('/api/trips/:id', (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE watched_trips SET active = ? WHERE id = ?').run(
    active ? 1 : 0,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM watched_trips WHERE id = ?').get(req.params.id));
});

app.delete('/api/trips/:id', (req, res) => {
  db.prepare('DELETE FROM price_history WHERE trip_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rebook_events WHERE trip_id = ?').run(req.params.id);
  db.prepare('DELETE FROM agent_logs WHERE trip_id = ?').run(req.params.id);
  db.prepare('DELETE FROM watched_trips WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Price History ─────────────────────────────────────────────────────────────

app.get('/api/trips/:id/history', (req, res) => {
  const history = db
    .prepare('SELECT * FROM price_history WHERE trip_id = ? ORDER BY checked_at ASC')
    .all(req.params.id);
  res.json(history);
});

// ── Rebook Events ─────────────────────────────────────────────────────────────

app.get('/api/trips/:id/rebooks', (req, res) => {
  const events = db
    .prepare('SELECT * FROM rebook_events WHERE trip_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json(events);
});

// ── Agent Logs ────────────────────────────────────────────────────────────────

app.get('/api/trips/:id/logs', (req, res) => {
  const limit = parseInt(req.query.limit ?? '100');
  const logs = db
    .prepare('SELECT * FROM agent_logs WHERE trip_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(req.params.id, limit);
  res.json(logs.reverse());
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit ?? '100');
  const logs = db
    .prepare('SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit);
  res.json(logs.reverse());
});

// ── Manual trigger ────────────────────────────────────────────────────────────

app.post('/api/trips/:id/check', async (req, res) => {
  const trip = db.prepare('SELECT * FROM watched_trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  // Respond immediately — analysis runs async
  res.json({ ok: true, message: 'Price check started. Watch the logs.' });

  try {
    await runPriceCheck(trip);
  } catch (err) {
    console.error('Manual check failed:', err.message);
  }
});

// ── Price check + agent run ───────────────────────────────────────────────────

async function runPriceCheck(trip) {
  // 1. Get current market price
  const results = searchFlightPrices({
    origin: trip.origin,
    destination: trip.destination,
    depart_date: trip.depart_date,
    return_date: trip.return_date,
    cabin: trip.cabin,
    passengers: trip.passengers,
  });

  const cheapest = results.fares[0];
  const currentPrice = cheapest?.total_price ?? trip.current_price;

  // 2. Store price history
  db.prepare('INSERT INTO price_history (trip_id, price) VALUES (?, ?)').run(trip.id, currentPrice);

  // 3. Update current_price on trip
  db.prepare('UPDATE watched_trips SET current_price = ? WHERE id = ?').run(currentPrice, trip.id);

  const drop = trip.booked_price - currentPrice;

  // 4. Only invoke Claude agent if there's a meaningful drop (> $10)
  if (drop > 10 && trip.refundable) {
    const freshTrip = db.prepare('SELECT * FROM watched_trips WHERE id = ?').get(trip.id);
    await analyzeAndRebook(freshTrip);
  } else {
    db.prepare('INSERT INTO agent_logs (trip_id, level, message) VALUES (?, ?, ?)').run(
      trip.id,
      'info',
      drop <= 10
        ? `No meaningful price drop (drop: $${drop.toFixed(2)}). Skipping agent.`
        : 'Ticket is non-refundable. Skipping agent.'
    );
  }
}

// ── Cron: check all active trips every 6 hours ────────────────────────────────

async function runAllChecks() {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const trips = db.prepare('SELECT * FROM watched_trips WHERE active = 1').all();
  console.log(`[cron] Checking ${trips.length} active trip(s)...`);
  for (const trip of trips) {
    try {
      await runPriceCheck(trip);
    } catch (err) {
      console.error(`[cron] Trip ${trip.id} failed:`, err.message);
    }
  }
}

// Run at 6am, 12pm, 6pm, midnight
cron.schedule('0 0,6,12,18 * * *', runAllChecks);

// ── Mock price search (no Claude, just for frontend preview) ──────────────────
app.post('/api/search', (req, res) => {
  const { origin, destination, depart_date, return_date, cabin = 'economy', passengers = 1 } = req.body;
  if (!origin || !destination || !depart_date) {
    return res.status(400).json({ error: 'origin, destination, depart_date required' });
  }
  res.json(searchFlightPrices({ origin, destination, depart_date, return_date, cabin, passengers }));
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', (_req, res) => {
  const totalSavings = db
    .prepare('SELECT COALESCE(SUM(savings), 0) as total FROM rebook_events')
    .get().total;
  const rebooks = db.prepare('SELECT COUNT(*) as n FROM rebook_events').get().n;
  const activeTrips = db.prepare('SELECT COUNT(*) as n FROM watched_trips WHERE active = 1').get().n;
  res.json({ totalSavings, rebooks, activeTrips });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Flight Price Notifier API on :${PORT}`));
