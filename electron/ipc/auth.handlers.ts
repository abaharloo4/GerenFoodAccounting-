import { ipcMain } from 'electron';
import { loginUser, logoutUser, getCurrentUser, getAllUsers, createUser, updateUser, deleteUser, toggleUserStatus, changePassword } from '../services/auth.service';

export function setupAuthHandlers() {
  ipcMain.handle('auth:login', async (_, { phoneNumber, password }) => {
    return await loginUser(phoneNumber, password);
  });

  ipcMain.handle('auth:logout', () => {
    logoutUser();
    return { success: true };
  });

  ipcMain.handle('auth:get-current-user', async () => {
    return await getCurrentUser();
  });

  ipcMain.handle('auth:change-password', async (_, { oldPassword, newPassword }) => {
    return await changePassword(oldPassword, newPassword);
  });

  ipcMain.handle('users:get-all', async () => {
    return await getAllUsers();
  });

  ipcMain.handle('users:create', async (_, userData) => {
    return await createUser(userData);
  });

  ipcMain.handle('users:update', async (_, { userId, userData }) => {
    return await updateUser(userId, userData);
  });

  ipcMain.handle('users:delete', async (_, { targetUserId }) => {
    return await deleteUser(targetUserId);
  });

  ipcMain.handle('users:toggle-active', async (_, { targetUserId, isActive }) => {
    return await toggleUserStatus(targetUserId, isActive);
  });
}
