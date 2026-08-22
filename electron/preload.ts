import { contextBridge, ipcRenderer } from 'electron';
import type { UserDTO } from './services/auth.service';
import type { ShiftFullRecord, ShiftSaveInput, AccountantShiftRecord } from './services/shift.service';
import type { ShiftReportFilter, ShiftReportItem } from './services/report.service';
import type { AuditLogItem } from './services/backup.service';
import type { DbConfig } from './db/index';
import type { UpdateInfo, DownloadProgress } from './services/update.service';

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  checkDatabase: () => Promise<{ success: boolean; userCount?: number; error?: string }>;
  login: (phoneNumber: string, password: string) => Promise<{ success: boolean; user?: UserDTO; error?: string }>;
  logout: () => Promise<{ success: boolean }>;
  getCurrentUser: () => Promise<UserDTO | null>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Promise<{ success: boolean; users?: UserDTO[]; error?: string }>;
  createUser: (userData: {
    phone_number: string;
    password: string;
    full_name: string;
    role?: 'accountant' | 'manager';
    shift_assignment?: 'morning' | 'evening' | 'both';
  }) => Promise<{ success: boolean; user?: UserDTO; error?: string }>;
  updateUser: (
    userId: number,
    userData: {
      phone_number: string;
      full_name: string;
      shift_assignment?: 'morning' | 'evening' | 'both';
      password?: string;
    }
  ) => Promise<{ success: boolean; user?: UserDTO; error?: string }>;
  deleteUser: (targetUserId: number) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (targetUserId: number, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
  getTodayShift: (accountantId: number, shiftDateShamsi: string, shiftType: 'morning' | 'evening') => Promise<{ success: boolean; shift?: ShiftFullRecord; existingShiftType?: 'morning' | 'evening'; takenByOthers?: string[]; error?: string }>;
  getShiftDetails: (shiftId: number) => Promise<{ success: boolean; shift?: ShiftFullRecord; error?: string }>;
  saveShift: (payload: ShiftSaveInput) => Promise<{ success: boolean; shiftId?: number; error?: string }>;
  getAccountantShifts: (accountantId: number) => Promise<{ success: boolean; shifts?: AccountantShiftRecord[]; error?: string }>;
  getShiftsReport: (filters?: ShiftReportFilter) => Promise<{ success: boolean; shifts?: ShiftReportItem[]; error?: string }>;
  lockShift: (shiftId: number) => Promise<{ success: boolean; error?: string }>;
  unlockShift: (shiftId: number) => Promise<{ success: boolean; error?: string }>;
  exportShiftsToExcel: (filters?: ShiftReportFilter) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  exportShiftsToPDF: (filters?: ShiftReportFilter) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  createManualBackup: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getAuditLogs: () => Promise<{ success: boolean; logs?: AuditLogItem[]; error?: string }>;
  getDbConfig: () => Promise<{ success: boolean; config?: DbConfig; error?: string }>;
  updateDbConfig: (config: DbConfig) => Promise<{ success: boolean; message?: string; error?: string }>;
  checkForUpdates: (customCurrentVersion?: string) => Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string }>;
  downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  installUpdate: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateProgress: (callback: (progress: DownloadProgress) => void) => () => void;
}

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkDatabase: () => ipcRenderer.invoke('check-database'),
  login: (phoneNumber, password) => ipcRenderer.invoke('auth:login', { phoneNumber, password }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
  changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('auth:change-password', { oldPassword, newPassword }),
  getAllUsers: () => ipcRenderer.invoke('users:get-all'),
  createUser: (userData) => ipcRenderer.invoke('users:create', userData),
  updateUser: (userId, userData) => ipcRenderer.invoke('users:update', { userId, userData }),
  deleteUser: (targetUserId) => ipcRenderer.invoke('users:delete', { targetUserId }),
  toggleUserStatus: (targetUserId, isActive) => ipcRenderer.invoke('users:toggle-active', { targetUserId, isActive }),
  getTodayShift: (accountantId, shiftDateShamsi, shiftType) => ipcRenderer.invoke('shifts:get-today', { accountantId, shiftDateShamsi, shiftType }),
  getShiftDetails: (shiftId) => ipcRenderer.invoke('shifts:get-details', { shiftId }),
  saveShift: (payload) => ipcRenderer.invoke('shifts:save', payload),
  getAccountantShifts: (accountantId) => ipcRenderer.invoke('shifts:get-accountant-shifts', { accountantId }),
  getShiftsReport: (filters) => ipcRenderer.invoke('reports:get-shifts', filters),
  lockShift: (shiftId) => ipcRenderer.invoke('reports:lock-shift', { shiftId }),
  unlockShift: (shiftId) => ipcRenderer.invoke('reports:unlock-shift', { shiftId }),
  exportShiftsToExcel: (filters) => ipcRenderer.invoke('reports:export-excel', filters),
  exportShiftsToPDF: (filters) => ipcRenderer.invoke('reports:export-pdf', filters),
  createManualBackup: () => ipcRenderer.invoke('backup:create-manual'),
  getAuditLogs: () => ipcRenderer.invoke('audit:get-logs'),
  getDbConfig: () => ipcRenderer.invoke('db:get-config'),
  updateDbConfig: (config) => ipcRenderer.invoke('db:update-config', { config }),
  checkForUpdates: (customCurrentVersion) => ipcRenderer.invoke('check-for-updates', customCurrentVersion),
  downloadUpdate: (downloadUrl) => ipcRenderer.invoke('download-update', downloadUrl),
  installUpdate: (filePath) => ipcRenderer.invoke('install-update', filePath),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  onUpdateProgress: (callback) => {
    const handler = (_event: any, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => {
      ipcRenderer.removeListener('update-download-progress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
