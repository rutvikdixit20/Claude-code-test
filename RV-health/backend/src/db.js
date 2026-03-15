import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../rvhealthcare.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    specialty TEXT,
    initials TEXT
  );

  CREATE TABLE IF NOT EXISTS pharmacies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    distance_km REAL NOT NULL,
    hours TEXT NOT NULL,
    rating REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    medication TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    refills_total INTEGER DEFAULT 0,
    refills_remaining INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    pharmacy_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id)
  );

  CREATE TABLE IF NOT EXISTS refill_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    FOREIGN KEY (patient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS diagnostics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    facility TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    status TEXT DEFAULT 'scheduled',
    queue_position INTEGER,
    queue_total INTEGER,
    notes TEXT,
    results TEXT,
    ai_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    status TEXT DEFAULT 'upcoming',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES users(id)
  );
`);

// Seed data only if empty
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  // Users
  const insertUser = db.prepare(
    'INSERT INTO users (name, role, email, specialty, initials) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('Dr. Sarah Mitchell', 'doctor', 'sarah.mitchell@rvhealthcare.com', 'Family Medicine', 'SM');
  insertUser.run('Dr. James Park', 'doctor', 'james.park@rvhealthcare.com', 'Radiology', 'JP');
  insertUser.run('Emma Rodriguez', 'patient', 'emma.rodriguez@rvhealthcare.com', null, 'ER');
  insertUser.run('Michael Chen', 'patient', 'michael.chen@rvhealthcare.com', null, 'MC');

  // Pharmacies
  const insertPharmacy = db.prepare(
    'INSERT INTO pharmacies (name, address, phone, distance_km, hours, rating) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertPharmacy.run('Shoppers Drug Mart', '120 King St W, Toronto', '(416) 555-0101', 0.4, 'Open 24/7', 4.5);
  insertPharmacy.run('Rexall Pharmacy', '88 Queen St E, Toronto', '(416) 555-0202', 0.9, '8am – 10pm', 4.3);
  insertPharmacy.run('Pharmasave', '245 Yonge St, Toronto', '(416) 555-0303', 1.2, '9am – 9pm', 4.6);
  insertPharmacy.run('Guardian Drugs', '55 Bloor St W, Toronto', '(416) 555-0404', 1.8, '9am – 8pm', 4.1);
  insertPharmacy.run('Metro Pharmacy', '300 Front St W, Toronto', '(416) 555-0505', 2.3, '8am – 11pm', 4.4);

  // Prescriptions
  const insertRx = db.prepare(`
    INSERT INTO prescriptions
    (doctor_id, patient_id, medication, dosage, frequency, duration, instructions, refills_total, refills_remaining, status, pharmacy_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  insertRx.run(1, 3, 'Metformin', '500mg', 'Twice daily', '90 days',
    'Take with food. Monitor blood glucose regularly.', 3, 3, 'active', null);
  insertRx.run(1, 3, 'Atorvastatin', '20mg', 'Once daily at bedtime', '90 days',
    'Avoid grapefruit juice. Report any muscle pain immediately.', 2, 2, 'ready_for_pickup', 1);
  insertRx.run(1, 3, 'Amoxicillin', '500mg', 'Three times daily', '10 days',
    'Complete the full course even if you feel better.', 0, 0, 'filled', 2);
  insertRx.run(1, 4, 'Lisinopril', '10mg', 'Once daily', '90 days',
    'Take at the same time each day. Monitor blood pressure.', 3, 3, 'active', null);
  insertRx.run(1, 4, 'Salbutamol Inhaler', '100mcg', 'As needed', 'Until further notice',
    '1–2 puffs when symptoms occur. Carry at all times.', 5, 4, 'sent_to_pharmacy', 3);

  // Diagnostics
  const insertDiag = db.prepare(`
    INSERT INTO diagnostics
    (doctor_id, patient_id, type, facility, scheduled_at, status, queue_position, queue_total, notes, results, ai_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  insertDiag.run(1, 3, 'MRI Scan', 'Toronto General Imaging', '2026-03-15 14:00', 'in_queue', 3, 8,
    'Brain MRI without contrast. Check for lesions.', null, null);
  insertDiag.run(1, 3, 'Blood Work', 'LifeLabs – King St', '2026-03-10 09:30', 'completed', null, null,
    'Fasting lipid panel, HbA1c, CBC, TSH.',
    'HbA1c: 6.2% | LDL: 3.1 mmol/L | HDL: 1.4 mmol/L | Total Cholesterol: 4.8 mmol/L | TSH: 2.1 mIU/L | WBC: 6.8 | RBC: 4.5 | Hemoglobin: 140 g/L',
    'Your blood sugar (HbA1c 6.2%) is in the pre-diabetic range — well-managed with your current medication. Your cholesterol is borderline high but trending in the right direction. TSH and CBC values are completely normal. Dr. Mitchell will review these at your next visit.'
  );
  insertDiag.run(1, 4, 'CT Scan', 'Sunnybrook Radiology', '2026-03-16 10:00', 'scheduled', null, null,
    'CT chest with contrast. Rule out pulmonary embolism.', null, null);

  // Messages
  const insertMsg = db.prepare(
    'INSERT INTO messages (sender_id, receiver_id, content, read, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  insertMsg.run(3, 1, 'Hi Dr. Mitchell, I had a question about the Metformin — I\'ve been feeling a bit nauseous. Is that normal?', 1, '2026-03-14 09:15:00');
  insertMsg.run(1, 3, 'Hi Emma, yes — nausea is a common side effect in the first few weeks. Try taking it with a larger meal, and it should settle down. If it persists after 2 weeks, let me know and we\'ll adjust the dose.', 1, '2026-03-14 10:02:00');
  insertMsg.run(3, 1, 'That makes sense, thank you! Also, my MRI is tomorrow — is there anything I need to prepare for?', 1, '2026-03-14 10:15:00');
  insertMsg.run(1, 3, 'Good reminder — remove all metal jewelry and piercings before arriving. No special diet needed. Get there 15 minutes early to complete the intake form. You\'ll hear the results through the app within 2–3 business days.', 0, '2026-03-14 10:30:00');

  // Appointments
  const insertAppt = db.prepare(`
    INSERT INTO appointments (doctor_id, patient_id, type, scheduled_at, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)`);
  insertAppt.run(1, 3, 'Follow-up Consultation', '2026-03-22 11:00', 'upcoming', 'Review blood work results and MRI findings.');
  insertAppt.run(1, 4, 'Annual Physical', '2026-03-18 09:00', 'upcoming', 'Comprehensive health check.');
  insertAppt.run(1, 3, 'Telehealth Visit', '2026-03-08 14:30', 'completed', 'Prescription renewal and medication review.');
}

export default db;
