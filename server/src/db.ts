import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'fairride.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('rider', 'driver')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    license_plate TEXT,
    is_online INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    total_rides INTEGER DEFAULT 0,
    total_earnings REAL DEFAULT 0,
    socket_id TEXT
  );

  CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER NOT NULL REFERENCES users(id),
    driver_id INTEGER REFERENCES drivers(id),
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested'
      CHECK(status IN ('requested','accepted','in_progress','completed','cancelled')),
    distance_miles REAL,
    duration_minutes REAL,
    base_fare REAL,
    total_fare REAL,
    driver_earnings REAL,
    platform_fee REAL,
    surge_multiplier REAL DEFAULT 1.0,
    rider_rating INTEGER,
    driver_rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME
  );
`);

export default db;
