import type { ElectronAPI } from '../../electron/preload';
import type { DbConfig } from '../../electron/db/index';

const HTTP_BASE = 'http://localhost:3001/api';

async function httpFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${HTTP_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

export const apiBridge: ElectronAPI = {
  getAppVersion: async () => {
    if (window.api) return window.api.getAppVersion();
    return '1.0.0 (Browser Mode)';
  },

  checkDatabase: async () => {
    if (window.api) return window.api.checkDatabase();
    try {
      const cfgRes = await httpFetch<{ success: boolean; config?: DbConfig }>('/db/config');
      return { success: cfgRes.success };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  login: async (phoneNumber: string, password: string) => {
    if (window.api) return window.api.login(phoneNumber, password);
    return httpFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    });
  },

  logout: async () => {
    if (window.api) return window.api.logout();
    return httpFetch('/auth/logout', { method: 'POST' });
  },

  getCurrentUser: async () => {
    if (window.api) return window.api.getCurrentUser();
    try {
      const res = await httpFetch<{ success: boolean; user?: any }>('/auth/current-user');
      return res.user || null;
    } catch {
      return null;
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    if (window.api) return window.api.changePassword(oldPassword, newPassword);
    return httpFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  getAllUsers: async () => {
    if (window.api) return window.api.getAllUsers();
    return httpFetch('/users');
  },

  createUser: async (userData) => {
    if (window.api) return window.api.createUser(userData);
    return httpFetch('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId, userData) => {
    if (window.api) return window.api.updateUser(userId, userData);
    return httpFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (targetUserId) => {
    if (window.api) return window.api.deleteUser(targetUserId);
    return httpFetch(`/users/${targetUserId}`, { method: 'DELETE' });
  },

  toggleUserStatus: async (targetUserId, isActive) => {
    if (window.api) return window.api.toggleUserStatus(targetUserId, isActive);
    return httpFetch(`/users/${targetUserId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  getTodayShift: async (accountantId, shiftDateShamsi, shiftType) => {
    if (window.api) return window.api.getTodayShift(accountantId, shiftDateShamsi, shiftType);
    const params = new URLSearchParams({
      accountantId: String(accountantId),
      shiftDateShamsi,
      shiftType,
    });
    return httpFetch(`/shifts/today?${params.toString()}`);
  },

  getShiftDetails: async (shiftId) => {
    if (window.api) return window.api.getShiftDetails(shiftId);
    return httpFetch(`/shifts/details?shiftId=${shiftId}`);
  },

  saveShift: async (payload) => {
    if (window.api) return window.api.saveShift(payload);
    return httpFetch('/shifts/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAccountantShifts: async (accountantId) => {
    if (window.api) return window.api.getAccountantShifts(accountantId);
    return httpFetch(`/shifts/accountant?accountantId=${accountantId}`);
  },

  getShiftsReport: async (filters) => {
    if (window.api) return window.api.getShiftsReport(filters);
    const params = new URLSearchParams();
    if (filters?.startDateShamsi) params.append('startDateShamsi', filters.startDateShamsi);
    if (filters?.endDateShamsi) params.append('endDateShamsi', filters.endDateShamsi);
    if (filters?.shiftType) params.append('shiftType', filters.shiftType);
    if (filters?.accountantId) params.append('accountantId', String(filters.accountantId));
    return httpFetch(`/reports/shifts?${params.toString()}`);
  },

  lockShift: async (shiftId) => {
    if (window.api) return window.api.lockShift(shiftId);
    return httpFetch('/reports/lock', {
      method: 'POST',
      body: JSON.stringify({ shiftId }),
    });
  },

  unlockShift: async (shiftId) => {
    if (window.api) return window.api.unlockShift(shiftId);
    return httpFetch('/reports/unlock', {
      method: 'POST',
      body: JSON.stringify({ shiftId }),
    });
  },

  exportShiftsToExcel: async (filters) => {
    if (window.api) return window.api.exportShiftsToExcel(filters);
    return httpFetch('/reports/export-excel', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    });
  },

  exportShiftsToPDF: async (filters) => {
    if (window.api) return window.api.exportShiftsToPDF(filters);
    return httpFetch('/reports/export-pdf', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    });
  },

  createManualBackup: async () => {
    if (window.api) return window.api.createManualBackup();
    try {
      const res = await httpFetch<{ success: boolean; data?: any; error?: string }>('/backup/create', { method: 'POST' });
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `پشتیبان_صندوق_کافه_${Date.now()}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, filePath: filename };
      }
      return { success: false, error: res.error || 'خطا در دریافت فایل پشتیبان' };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در برقراری ارتباط با سرور جهت دریافت پشتیبان' };
    }
  },

  getAuditLogs: async () => {
    if (window.api) return window.api.getAuditLogs();
    return httpFetch('/audit/logs');
  },

  getDbConfig: async () => {
    if (window.api) return window.api.getDbConfig();
    return httpFetch('/db/config');
  },

  updateDbConfig: async (config) => {
    if (window.api) return window.api.updateDbConfig(config);
    return httpFetch('/db/config', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  },

  checkForUpdates: async (customCurrentVersion) => {
    if (window.api) return window.api.checkForUpdates(customCurrentVersion);
    const params = customCurrentVersion ? `?currentVersion=${encodeURIComponent(customCurrentVersion)}` : '';
    return httpFetch(`/update/check${params}`);
  },

  downloadUpdate: async (downloadUrl) => {
    if (window.api) return window.api.downloadUpdate(downloadUrl);
    return httpFetch('/update/download', {
      method: 'POST',
      body: JSON.stringify({ downloadUrl }),
    });
  },

  installUpdate: async (filePath) => {
    if (window.api) return window.api.installUpdate(filePath);
    return httpFetch('/update/install', {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    });
  },

  openExternalUrl: async (url) => {
    if (window.api) return window.api.openExternalUrl(url);
    window.open(url, '_blank');
    return { success: true };
  },

  onUpdateProgress: (callback) => {
    if (window.api && window.api.onUpdateProgress) {
      return window.api.onUpdateProgress(callback);
    }
    return () => {};
  },
};
