import path from 'node:path';
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

export interface DbConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

let pool: mysql.Pool | null = null;
let currentConfig: Required<DbConfig> = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'cafe_cash_db',
};

function getConfigFilePath(): string {
  let userDataDir = process.cwd();
  try {
    // Dynamic require for electron app in electron environment
    const electron = require('electron');
    if (electron && electron.app) {
      userDataDir = electron.app.getPath('userData');
    }
  } catch {
    // Fallback to process.cwd() outside electron
  }
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  return path.join(userDataDir, 'db_config.json');
}

export function loadSavedDbConfig(): Required<DbConfig> {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      currentConfig = {
        host: parsed.host || 'localhost',
        port: Number(parsed.port) || 3306,
        user: parsed.user ?? 'root',
        password: parsed.password ?? '',
        database: parsed.database || 'cafe_cash_db',
      };
    }
  } catch (err) {
    console.error('Error reading saved DB config:', err);
  }
  return currentConfig;
}

export function saveDbConfigFile(config: DbConfig): void {
  try {
    const filePath = getConfigFilePath();
    const merged = { ...loadSavedDbConfig(), ...config };
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    currentConfig = merged;
  } catch (err) {
    console.error('Error writing DB config file:', err);
  }
}

export function getLoadedDbConfig(): Required<DbConfig> {
  return loadSavedDbConfig();
}

export async function initDatabase(config: DbConfig = {}): Promise<mysql.Pool> {
  const savedCfg = loadSavedDbConfig();
  const cfg = { ...savedCfg, ...config };

  // 1. Connect without DB name first to ensure database exists
  let tempConn: mysql.Connection | null = null;
  try {
    tempConn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
    });

    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } catch (err: any) {
    console.error('Failed to create/connect to MySQL Database server:', err.message);
    throw new Error(`خطا در اتصال به سرور MySQL (WAMP/XAMPP): ${err.message}`);
  } finally {
    if (tempConn) {
      await tempConn.end();
    }
  }

  // Close existing pool if re-initializing
  if (pool) {
    try {
      await pool.end();
    } catch {
      // Ignore
    }
    pool = null;
  }

  // 2. Create connection pool to the database
  pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  currentConfig = cfg;

  // 3. Create tables if not exist
  const createTablesQueries = [
    `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role ENUM('accountant', 'manager') NOT NULL DEFAULT 'accountant',
      shift_assignment ENUM('morning', 'evening', 'both') NOT NULL DEFAULT 'both',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_date_shamsi VARCHAR(10) NOT NULL,
      shift_type ENUM('morning', 'evening') NOT NULL,
      accountant_id INT NOT NULL,
      system_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
      cash_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      status ENUM('open', 'submitted', 'locked') NOT NULL DEFAULT 'open',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      locked_by INT,
      locked_at DATETIME,
      FOREIGN KEY (accountant_id) REFERENCES users(id),
      FOREIGN KEY (locked_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS pos_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      pos_label VARCHAR(100) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS credit_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS card_to_card_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS shortage_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS surplus_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT NOT NULL,
      action VARCHAR(50) NOT NULL,
      changed_by INT NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      old_value TEXT,
      new_value TEXT,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  ];

  for (const query of createTablesQueries) {
    await pool.query(query);
  }

  // 4. Ensure at least one Manager exists — only if no manager exists at all in the database
  const [managerRows]: any = await pool.query(`SELECT id FROM users WHERE role = 'manager' LIMIT 1`);
  if (!managerRows || managerRows.length === 0) {
    const defaultPasswordHash = bcrypt.hashSync('12345678', 10);
    await pool.execute(
      `INSERT INTO users (phone_number, password_hash, full_name, role, shift_assignment, is_active)
       VALUES ('09335760392', ?, 'مدیر سیستم', 'manager', 'both', 1)`,
      [defaultPasswordHash]
    );
  }

  // 5. Ensure all existing accountants have shift_assignment = 'both' (no static shift lock)
  try {
    await pool.query(`UPDATE users SET shift_assignment = 'both'`);
  } catch {
    // Ignore if fails
  }

  // 6. Ensure notes column exists in shifts table
  try {
    await pool.query(`ALTER TABLE shifts ADD COLUMN notes TEXT`);
  } catch {
    // Ignore if column already exists
  }

  return pool;
}

export async function testAndUpdateDbConfig(newConfig: DbConfig): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await initDatabase(newConfig);
    saveDbConfigFile(newConfig);
    return { success: true, message: 'اتصال با دیتابیس MySQL (WAMP) با موفقیت برقرار و تنظیمات ذخیره شد.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'خطا در اتصال به دیتابیس MySQL' };
  }
}

export function getDb(): mysql.Pool {
  if (!pool) {
    throw new Error('MySQL Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

export function saveDatabase(): void {
  // MySQL handles persistence automatically to disk
}
