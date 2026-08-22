import { ipcMain } from 'electron';
import { createManualBackup, getAuditLogs } from '../services/backup.service';
import { getLoadedDbConfig, testAndUpdateDbConfig } from '../db/index';

export function setupBackupHandlers() {
  ipcMain.handle('backup:create-manual', async () => {
    return await createManualBackup();
  });

  ipcMain.handle('audit:get-logs', async () => {
    return await getAuditLogs();
  });

  ipcMain.handle('db:get-config', () => {
    return { success: true, config: getLoadedDbConfig() };
  });

  ipcMain.handle('db:update-config', async (_, { config }) => {
    return await testAndUpdateDbConfig(config);
  });
}
