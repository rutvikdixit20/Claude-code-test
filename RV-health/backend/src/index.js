import express from 'express';
import cors from 'cors';
import db from './db.js';
import { generateResultSummary, generateMedicationInstructions } from './agent.js';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Users ───────────────────────────────────────────────────────────────────
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/doctor/:id', (req, res) => {
  const doctorId = req.params.id;
  const activePatients = db.prepare(`
    SELECT COUNT(DISTINCT patient_id) as c FROM prescriptions WHERE doctor_id = ? AND status != 'expired'
  `).get(doctorId).c;

  const pendingRefills = db.prepare(`
    SELECT COUNT(*) as c FROM refill_requests rr
    JOIN prescriptions p ON rr.prescription_id = p.id
    WHERE p.doctor_id = ? AND rr.status = 'pending'
  `).get(doctorId).c;

  const todayDiagnostics = db.prepare(`
    SELECT COUNT(*) as c FROM diagnostics
    WHERE doctor_id = ? AND DATE(scheduled_at) = DATE('now')
  `).get(doctorId).c;

  const unreadMessages = db.prepare(`
    SELECT COUNT(*) as c FROM messages WHERE receiver_id = ? AND read = 0
  `).get(doctorId).c;

  const recentActivity = db.prepare(`
    SELECT p.*, u.name as patient_name FROM prescriptions p
    JOIN users u ON p.patient_id = u.id
    WHERE p.doctor_id = ? ORDER BY p.created_at DESC LIMIT 5
  `).all(doctorId);

  const upcomingDiagnostics = db.prepare(`
    SELECT d.*, u.name as patient_name FROM diagnostics d
    JOIN users u ON d.patient_id = u.id
    WHERE d.doctor_id = ? AND d.status IN ('scheduled','in_queue')
    ORDER BY d.scheduled_at ASC LIMIT 5
  `).all(doctorId);

  res.json({ activePatients, pendingRefills, todayDiagnostics, unreadMessages, recentActivity, upcomingDiagnostics });
});

app.get('/api/dashboard/patient/:id', (req, res) => {
  const patientId = req.params.id;

  const activePrescriptions = db.prepare(`
    SELECT COUNT(*) as c FROM prescriptions WHERE patient_id = ? AND status IN ('active','sent_to_pharmacy','ready_for_pickup')
  `).get(patientId).c;

  const unreadResults = db.prepare(`
    SELECT COUNT(*) as c FROM diagnostics WHERE patient_id = ? AND status = 'completed' AND results IS NOT NULL
  `).get(patientId).c;

  const upcomingDiagnostics = db.prepare(`
    SELECT d.*, u.name as doctor_name, u.specialty FROM diagnostics d
    JOIN users u ON d.doctor_id = u.id
    WHERE d.patient_id = ? AND d.status IN ('scheduled','in_queue')
    ORDER BY d.scheduled_at ASC
  `).all(patientId);

  const recentPrescriptions = db.prepare(`
    SELECT p.*, u.name as doctor_name FROM prescriptions p
    JOIN users u ON p.doctor_id = u.id
    WHERE p.patient_id = ? ORDER BY p.created_at DESC LIMIT 4
  `).all(patientId);

  const upcomingAppointments = db.prepare(`
    SELECT a.*, u.name as doctor_name, u.specialty FROM appointments a
    JOIN users u ON a.doctor_id = u.id
    WHERE a.patient_id = ? AND a.status = 'upcoming'
    ORDER BY a.scheduled_at ASC
  `).all(patientId);

  const unreadMessages = db.prepare(`
    SELECT COUNT(*) as c FROM messages WHERE receiver_id = ? AND read = 0
  `).get(patientId).c;

  res.json({ activePrescriptions, unreadResults, upcomingDiagnostics, recentPrescriptions, upcomingAppointments, unreadMessages });
});

// ─── Prescriptions ────────────────────────────────────────────────────────────
app.get('/api/prescriptions', (req, res) => {
  const { patient_id, doctor_id } = req.query;
  let query = `
    SELECT p.*,
      d.name as doctor_name, d.specialty as doctor_specialty,
      pt.name as patient_name,
      ph.name as pharmacy_name, ph.address as pharmacy_address
    FROM prescriptions p
    JOIN users d ON p.doctor_id = d.id
    JOIN users pt ON p.patient_id = pt.id
    LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
  `;
  const params = [];
  if (patient_id) { query += ' WHERE p.patient_id = ?'; params.push(patient_id); }
  else if (doctor_id) { query += ' WHERE p.doctor_id = ?'; params.push(doctor_id); }
  query += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/prescriptions', (req, res) => {
  const { doctor_id, patient_id, medication, dosage, frequency, duration, instructions, refills_total } = req.body;
  const result = db.prepare(`
    INSERT INTO prescriptions (doctor_id, patient_id, medication, dosage, frequency, duration, instructions, refills_total, refills_remaining)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(doctor_id, patient_id, medication, dosage, frequency, duration, instructions, refills_total || 0, refills_total || 0);

  const rx = db.prepare(`
    SELECT p.*, d.name as doctor_name, pt.name as patient_name
    FROM prescriptions p
    JOIN users d ON p.doctor_id = d.id
    JOIN users pt ON p.patient_id = pt.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);
  res.json(rx);
});

app.post('/api/prescriptions/:id/send-to-pharmacy', (req, res) => {
  const { pharmacy_id } = req.body;
  db.prepare(`UPDATE prescriptions SET status = 'sent_to_pharmacy', pharmacy_id = ? WHERE id = ?`)
    .run(pharmacy_id, req.params.id);

  // Simulate "ready for pickup" after 30 seconds
  setTimeout(() => {
    db.prepare(`UPDATE prescriptions SET status = 'ready_for_pickup' WHERE id = ? AND status = 'sent_to_pharmacy'`)
      .run(req.params.id);
  }, 30000);

  const rx = db.prepare(`
    SELECT p.*, ph.name as pharmacy_name, ph.address as pharmacy_address
    FROM prescriptions p LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
    WHERE p.id = ?
  `).get(req.params.id);
  res.json(rx);
});

app.post('/api/prescriptions/:id/refill', (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });
  if (rx.refills_remaining <= 0) return res.status(400).json({ error: 'No refills remaining' });

  const existing = db.prepare(`
    SELECT * FROM refill_requests WHERE prescription_id = ? AND status = 'pending'
  `).get(req.params.id);
  if (existing) return res.status(400).json({ error: 'Refill request already pending' });

  const result = db.prepare(`
    INSERT INTO refill_requests (prescription_id, patient_id) VALUES (?, ?)
  `).run(req.params.id, rx.patient_id);
  res.json(db.prepare('SELECT * FROM refill_requests WHERE id = ?').get(result.lastInsertRowid));
});

app.patch('/api/prescriptions/:id/mark-filled', (req, res) => {
  db.prepare(`UPDATE prescriptions SET status = 'filled' WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// ─── Refill Requests ──────────────────────────────────────────────────────────
app.get('/api/refill-requests', (req, res) => {
  const { doctor_id } = req.query;
  const requests = db.prepare(`
    SELECT rr.*, p.medication, p.dosage, p.frequency,
      pt.name as patient_name, pt.initials as patient_initials
    FROM refill_requests rr
    JOIN prescriptions p ON rr.prescription_id = p.id
    JOIN users pt ON rr.patient_id = pt.id
    WHERE p.doctor_id = ?
    ORDER BY rr.requested_at DESC
  `).all(doctor_id);
  res.json(requests);
});

app.patch('/api/refill-requests/:id', (req, res) => {
  const { status } = req.body;
  db.prepare(`
    UPDATE refill_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, req.params.id);

  if (status === 'approved') {
    const rr = db.prepare('SELECT * FROM refill_requests WHERE id = ?').get(req.params.id);
    db.prepare(`
      UPDATE prescriptions SET refills_remaining = refills_remaining - 1, status = 'active'
      WHERE id = ? AND refills_remaining > 0
    `).run(rr.prescription_id);
  }
  res.json(db.prepare('SELECT * FROM refill_requests WHERE id = ?').get(req.params.id));
});

// ─── Diagnostics ──────────────────────────────────────────────────────────────
app.get('/api/diagnostics', (req, res) => {
  const { patient_id, doctor_id } = req.query;
  let query = `
    SELECT d.*,
      dr.name as doctor_name, dr.specialty as doctor_specialty,
      pt.name as patient_name
    FROM diagnostics d
    JOIN users dr ON d.doctor_id = dr.id
    JOIN users pt ON d.patient_id = pt.id
  `;
  const params = [];
  if (patient_id) { query += ' WHERE d.patient_id = ?'; params.push(patient_id); }
  else if (doctor_id) { query += ' WHERE d.doctor_id = ?'; params.push(doctor_id); }
  query += ' ORDER BY d.scheduled_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/diagnostics', (req, res) => {
  const { doctor_id, patient_id, type, facility, scheduled_at, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO diagnostics (doctor_id, patient_id, type, facility, scheduled_at, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(doctor_id, patient_id, type, facility, scheduled_at, notes);

  const diag = db.prepare(`
    SELECT d.*, dr.name as doctor_name, pt.name as patient_name
    FROM diagnostics d
    JOIN users dr ON d.doctor_id = dr.id
    JOIN users pt ON d.patient_id = pt.id
    WHERE d.id = ?
  `).get(result.lastInsertRowid);
  res.json(diag);
});

app.patch('/api/diagnostics/:id/queue', (req, res) => {
  const { status, queue_position, queue_total } = req.body;
  db.prepare(`
    UPDATE diagnostics SET status = ?, queue_position = ?, queue_total = ? WHERE id = ?
  `).run(status, queue_position, queue_total, req.params.id);
  res.json(db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(req.params.id));
});

app.patch('/api/diagnostics/:id/results', async (req, res) => {
  const { results } = req.body;
  const diag = db.prepare(`
    SELECT d.*, pt.name as patient_name FROM diagnostics d
    JOIN users pt ON d.patient_id = pt.id WHERE d.id = ?
  `).get(req.params.id);
  if (!diag) return res.status(404).json({ error: 'Diagnostic not found' });

  db.prepare(`UPDATE diagnostics SET results = ?, status = 'completed' WHERE id = ?`)
    .run(results, req.params.id);

  let ai_summary = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      ai_summary = await generateResultSummary(diag.type, results, diag.patient_name);
      db.prepare(`UPDATE diagnostics SET ai_summary = ? WHERE id = ?`).run(ai_summary, req.params.id);
    } catch (e) {
      console.error('AI summary error:', e.message);
    }
  }

  res.json(db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(req.params.id));
});

app.post('/api/diagnostics/:id/summarize', async (req, res) => {
  const diag = db.prepare(`
    SELECT d.*, pt.name as patient_name FROM diagnostics d
    JOIN users pt ON d.patient_id = pt.id WHERE d.id = ?
  `).get(req.params.id);
  if (!diag || !diag.results) return res.status(400).json({ error: 'No results to summarize' });

  if (!process.env.ANTHROPIC_API_KEY) {
    const fallback = `Your ${diag.type} results are ready. Dr. Mitchell will review these findings with you at your next appointment and explain what they mean for your health.`;
    db.prepare('UPDATE diagnostics SET ai_summary = ? WHERE id = ?').run(fallback, req.params.id);
    return res.json({ ai_summary: fallback });
  }

  try {
    const summary = await generateResultSummary(diag.type, diag.results, diag.patient_name);
    db.prepare('UPDATE diagnostics SET ai_summary = ? WHERE id = ?').run(summary, req.params.id);
    res.json({ ai_summary: summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Simulate queue advancement (in_queue diagnostics tick every 45s)
setInterval(() => {
  const inQueue = db.prepare(`SELECT * FROM diagnostics WHERE status = 'in_queue' AND queue_position > 1`).all();
  for (const d of inQueue) {
    db.prepare(`UPDATE diagnostics SET queue_position = queue_position - 1 WHERE id = ?`).run(d.id);
  }
  const next = db.prepare(`SELECT * FROM diagnostics WHERE status = 'in_queue' AND queue_position = 1`).all();
  for (const d of next) {
    setTimeout(() => {
      db.prepare(`UPDATE diagnostics SET status = 'in_progress', queue_position = 0 WHERE id = ?`).run(d.id);
    }, 20000);
  }
}, 45000);

// ─── Pharmacies ───────────────────────────────────────────────────────────────
app.get('/api/pharmacies', (req, res) => {
  res.json(db.prepare('SELECT * FROM pharmacies ORDER BY distance_km ASC').all());
});

// ─── Messages ─────────────────────────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  const { user_id, other_id } = req.query;
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.initials as sender_initials, u.role as sender_role
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(user_id, other_id, other_id, user_id);

  // Mark received messages as read
  db.prepare(`UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ?`)
    .run(user_id, other_id);

  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  const result = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)
  `).run(sender_id, receiver_id, content);

  const msg = db.prepare(`
    SELECT m.*, u.name as sender_name, u.initials as sender_initials, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
  `).get(result.lastInsertRowid);
  res.json(msg);
});

app.get('/api/messages/contacts/:userId', (req, res) => {
  const userId = req.params.userId;
  const contacts = db.prepare(`
    SELECT DISTINCT u.id, u.name, u.role, u.specialty, u.initials,
      (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND read = 0) as unread,
      (SELECT content FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message
    FROM messages m
    JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id)
    WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
  `).all(userId, userId, userId, userId, userId, userId);
  res.json(contacts);
});

// ─── Appointments ─────────────────────────────────────────────────────────────
app.get('/api/appointments', (req, res) => {
  const { patient_id, doctor_id } = req.query;
  let query = `
    SELECT a.*, d.name as doctor_name, d.specialty, pt.name as patient_name
    FROM appointments a
    JOIN users d ON a.doctor_id = d.id
    JOIN users pt ON a.patient_id = pt.id
  `;
  const params = [];
  if (patient_id) { query += ' WHERE a.patient_id = ?'; params.push(patient_id); }
  else if (doctor_id) { query += ' WHERE a.doctor_id = ?'; params.push(doctor_id); }
  query += ' ORDER BY a.scheduled_at ASC';
  res.json(db.prepare(query).all(...params));
});

// ─── Patients (for doctor) ────────────────────────────────────────────────────
app.get('/api/patients', (req, res) => {
  const patients = db.prepare(`SELECT * FROM users WHERE role = 'patient'`).all();
  res.json(patients);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`RV Health Care API running on :${PORT}`));
