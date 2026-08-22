import { ipcMain } from 'electron';
import { getAllShiftsReport, lockShift, unlockShift, exportShiftsToCSV, exportShiftsToPDF } from '../services/report.service';

export function setupReportHandlers() {
  ipcMain.handle('reports:get-shifts', async (_, filters) => {
    return await getAllShiftsReport(filters || {});
  });

  ipcMain.handle('reports:lock-shift', async (_, { shiftId }) => {
    return await lockShift(shiftId);
  });

  ipcMain.handle('reports:unlock-shift', async (_, { shiftId }) => {
    return await unlockShift(shiftId);
  });

  ipcMain.handle('reports:export-excel', async (_, filters) => {
    return await exportShiftsToCSV(filters || {});
  });

  ipcMain.handle('reports:export-pdf', async (_, filters) => {
    return await exportShiftsToPDF(filters || {});
  });
}

