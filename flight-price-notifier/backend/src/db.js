import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS watched_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    depart_date TEXT NOT NULL,
    return_date TEXT,
    cabin TEXT NOT NULL DEFAULT 'economy',
    passengers INTEGER NOT NULL DEFAULT 1,
    booked_price REAL NOT NULL,
    current_price REAL NOT NULL,
    booking_ref TEXT NOT NULL,
    cancellation_fee REAL NOT NULL DEFAULT 0,
    refundable INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    price REAL NOT NULL,
    checked_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES watched_trips(id)
  );

  CREATE TABLE IF NOT EXISTS rebook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    old_price REAL NOT NULL,
    new_price REAL NOT NULL,
    savings REAL NOT NULL,
    new_booking_ref TEXT NOT NULL,
    agent_reasoning TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES watched_trips(id)
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER,
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
