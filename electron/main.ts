import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define global shims for CJS compatibility inside ES Module bundle
if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = __dirname;
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = __filename;
}
if (typeof (globalThis as any).exports === 'undefined') {
  (globalThis as any).exports = {};
}
if (typeof (globalThis as any).module === 'undefined') {
  (globalThis as any).module = { exports: (globalThis as any).exports };
}

import { initDatabase, getDb } from './db/index';
import { setupAuthHandlers } from './ipc/auth.handlers';
import { setupShiftHandlers } from './ipc/shift.handlers';
import { setupReportHandlers } from './ipc/report.handlers';
import { setupBackupHandlers } from './ipc/backup.handlers';
import { setupUpdateHandlers } from './ipc/update.handlers';
import { createAutoBackup } from './services/backup.service';

app.name = 'GerenFoodAccounting';

let mainWindow: BrowserWindow | null = null;

function getAppIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../public/icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1150,
    height: 800,
    minWidth: 950,
    minHeight: 680,
    title: 'GerenFoodAccounting',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Prevent new windows from opening inside Electron; redirect external URLs to default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent unauthorized in-window navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAllowed =
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

import { startHttpServer } from './httpServer';

app.whenReady().then(async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully with MySQL (WAMP Server).');
    createAutoBackup();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // Start HTTP API fallback server ONLY in dev mode for browser preview
  if (isDev) {
    try {
      startHttpServer();
    } catch (httpErr) {
      console.error('Failed to start HTTP server:', httpErr);
    }
  }

  // Setup IPC Handlers
  setupAuthHandlers();
  setupShiftHandlers();
  setupReportHandlers();
  setupBackupHandlers();
  setupUpdateHandlers();

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('check-database', async () => {
    try {
      const db = getDb();
      const [rows]: any = await db.query('SELECT COUNT(*) as count FROM users');
      const count = rows && rows.length > 0 ? (rows[0].count as number) : 0;
      return { success: true, userCount: count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
