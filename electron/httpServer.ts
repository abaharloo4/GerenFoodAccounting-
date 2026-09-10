import http from 'node:http';
import { parse } from 'node:url';
import {
  loginUser,
  logoutUser,
  getCurrentUser,
  changePassword,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from './services/auth.service';
import { getTodayShift, saveShift, getAccountantShifts, getShiftDetails } from './services/shift.service';
import { getAllShiftsReport, lockShift, unlockShift, exportShiftsToCSV, exportShiftsToPDF } from './services/report.service';
import { getAuditLogs, getBackupData } from './services/backup.service';
import { checkForUpdates, downloadUpdate, installUpdate } from './services/update.service';
import { getLoadedDbConfig, testAndUpdateDbConfig } from './db/index';

const PORT = 3001;

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      url.hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function handleCORS(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const origin = req.headers.origin;
  if (origin) {
    if (isLocalOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
      return true;
    }
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Cross-Origin Forbidden' }));
    return false;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  return true;
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', (err) => reject(err));
  });
}

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    if (!handleCORS(req, res)) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    const query = parsedUrl.query || {};

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      // Auth routes
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await loginUser(body.phoneNumber, body.password);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        logoutUser();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname === '/api/auth/change-password' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await changePassword(body.oldPassword, body.newPassword);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/auth/current-user' && req.method === 'GET') {
        const user = await getCurrentUser();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, user }));
        return;
      }

      // User management routes
      if (pathname === '/api/users' && req.method === 'GET') {
        const result = await getAllUsers();
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/users' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await createUser(body);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname.startsWith('/api/users/') && pathname.endsWith('/status') && req.method === 'PUT') {
        const idStr = pathname.replace('/api/users/', '').replace('/status', '');
        const userId = Number(idStr);
        const body = await parseJsonBody(req);
        const result = await toggleUserStatus(userId, body.isActive);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
        const idStr = pathname.replace('/api/users/', '');
        const userId = Number(idStr);
        const body = await parseJsonBody(req);
        const result = await updateUser(userId, body);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
        const idStr = pathname.replace('/api/users/', '');
        const userId = Number(idStr);
        const result = await deleteUser(userId);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      // Shift routes
      if (pathname === '/api/shifts/today' && req.method === 'GET') {
        const accountantId = Number(query.accountantId) || 0;
        const shiftDateShamsi = String(query.shiftDateShamsi || '');
        const shiftType = (query.shiftType as any) || 'morning';
        const result = await getTodayShift(accountantId, shiftDateShamsi, shiftType);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/shifts/save' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await saveShift(body);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/shifts/details' && req.method === 'GET') {
        const shiftId = Number(query.shiftId) || 0;
        const result = await getShiftDetails(shiftId);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/shifts/accountant' && req.method === 'GET') {
        const accountantId = Number(query.accountantId) || 0;
        const result = await getAccountantShifts(accountantId);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      // Reports routes
      if (pathname === '/api/reports/shifts' && req.method === 'GET') {
        const filters = {
          startDateShamsi: query.startDateShamsi ? String(query.startDateShamsi) : undefined,
          endDateShamsi: query.endDateShamsi ? String(query.endDateShamsi) : undefined,
          shiftType: (query.shiftType as any) || 'all',
          accountantId: query.accountantId ? Number(query.accountantId) : undefined,
        };
        const result = await getAllShiftsReport(filters);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/reports/lock' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await lockShift(body.shiftId);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/reports/unlock' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await unlockShift(body.shiftId);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/reports/export-excel' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await exportShiftsToCSV(body);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/reports/export-pdf' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await exportShiftsToPDF(body);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      // DB Config routes
      if (pathname === '/api/db/config' && req.method === 'GET') {
        const config = getLoadedDbConfig();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, config }));
        return;
      }

      if (pathname === '/api/db/config' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await testAndUpdateDbConfig(body.config || body);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/backup/create' && (req.method === 'POST' || req.method === 'GET')) {
        const result = await getBackupData();
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/audit/logs' && req.method === 'GET') {
        const result = await getAuditLogs();
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      // Update routes
      if (pathname === '/api/update/check' && (req.method === 'GET' || req.method === 'POST')) {
        const currentVer = query.currentVersion ? String(query.currentVersion) : undefined;
        const result = await checkForUpdates(currentVer);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/update/download' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await downloadUpdate(body.downloadUrl);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/update/install' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await installUpdate(body.filePath);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      // 404 for unknown routes
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Route not found' }));
    } catch (err: any) {
      console.error('HTTP Server route error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[HTTP Server] Running on http://127.0.0.1:${PORT}/api for browser/Vite fallback.`);
  });
}
