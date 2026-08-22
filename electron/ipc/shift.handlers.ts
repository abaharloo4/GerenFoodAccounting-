import { ipcMain } from 'electron';
import { getTodayShift, saveShift, getAccountantShifts, getShiftDetails } from '../services/shift.service';

export function setupShiftHandlers() {
  ipcMain.handle('shifts:get-today', async (_, { accountantId, shiftDateShamsi, shiftType }) => {
    return await getTodayShift(accountantId, shiftDateShamsi, shiftType);
  });

  ipcMain.handle('shifts:get-details', async (_, { shiftId }) => {
    return await getShiftDetails(shiftId);
  });

  ipcMain.handle('shifts:save', async (_, payload) => {
    return await saveShift(payload);
  });

  ipcMain.handle('shifts:get-accountant-shifts', async (_, { accountantId }) => {
    return await getAccountantShifts(accountantId);
  });
}
