import { ipcMain, shell } from 'electron';
import { checkForUpdates, downloadUpdate, installUpdate } from '../services/update.service';

export function setupUpdateHandlers() {
  ipcMain.handle('check-for-updates', async (_event, customCurrentVersion?: string) => {
    return checkForUpdates(customCurrentVersion);
  });

  ipcMain.handle('download-update', async (event, downloadUrl: string) => {
    return downloadUpdate(downloadUrl, (progress) => {
      try {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('update-download-progress', progress);
        }
      } catch {
        // Ignore if window was closed
      }
    });
  });

  ipcMain.handle('install-update', async (_event, filePath: string) => {
    return installUpdate(filePath);
  });

  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'آدرس نامعتبر است.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
