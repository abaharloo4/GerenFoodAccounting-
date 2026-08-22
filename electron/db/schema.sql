-- Schema for Cafe Cash Accounting App

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('accountant', 'manager')) NOT NULL DEFAULT 'accountant',
  shift_assignment TEXT CHECK(shift_assignment IN ('morning', 'evening', 'both')) NOT NULL DEFAULT 'both',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_date_shamsi TEXT NOT NULL,
  shift_type TEXT CHECK(shift_type IN ('morning', 'evening')) NOT NULL,
  accountant_id INTEGER NOT NULL,
  system_sales REAL NOT NULL DEFAULT 0,
  cash_amount REAL NOT NULL DEFAULT 0,
  status TEXT CHECK(status IN ('open', 'submitted', 'locked')) NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  locked_by INTEGER,
  locked_at TEXT,
  FOREIGN KEY (accountant_id) REFERENCES users(id),
  FOREIGN KEY (locked_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pos_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  pos_label TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credit_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_to_card_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shortage_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS surplus_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  old_value TEXT,
  new_value TEXT,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
