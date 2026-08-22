import bcrypt from 'bcryptjs';
import { getDb } from '../db/index';

export interface UserDTO {
  id: number;
  phone_number: string;
  full_name: string;
  role: 'accountant' | 'manager';
  shift_assignment?: 'morning' | 'evening' | 'both';
  is_active: number;
  created_at: string;
}

let activeSessionUser: UserDTO | null = null;

function normalizeInput(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => '٠١٢٣۴٥٦٧٨٩'.indexOf(d).toString());
}

async function getOrRestoreActiveUser(): Promise<UserDTO | null> {
  return activeSessionUser;
}

export async function loginUser(
  phoneNumber: string,
  password: string
): Promise<{ success: boolean; user?: UserDTO; error?: string }> {
  try {
    const cleanPhone = normalizeInput(phoneNumber);
    const cleanPassword = normalizeInput(password);

    if (!cleanPhone || !cleanPassword) {
      return { success: false, error: 'لطفاً شماره تماس و رمز عبور را وارد کنید.' };
    }

    const db = getDb();
    const [rows]: any = await db.execute(
      `SELECT id, phone_number, password_hash, full_name, role, is_active, created_at, shift_assignment
       FROM users WHERE phone_number = ?`,
      [cleanPhone]
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: 'شماره تماس یا رمز عبور اشتباه است.' };
    }

    const userRow = rows[0];

    if (userRow.is_active === 0) {
      return { success: false, error: 'حساب کاربری شما غیرفعال شده است. با مدیر تماس بگیرید.' };
    }

    const isPasswordValid = bcrypt.compareSync(cleanPassword, userRow.password_hash);
    if (!isPasswordValid) {
      return { success: false, error: 'شماره تماس یا رمز عبور اشتباه است.' };
    }

    const user: UserDTO = {
      id: userRow.id,
      phone_number: userRow.phone_number,
      full_name: userRow.full_name,
      role: userRow.role,
      is_active: userRow.is_active,
      created_at: userRow.created_at,
      shift_assignment: userRow.shift_assignment || 'both',
    };

    activeSessionUser = user;
    return { success: true, user };
  } catch (err: any) {
    console.error('loginUser exception:', err);
    return { success: false, error: `خطا در اتصال به دیتابیس MySQL: ${err.message}` };
  }
}

export function logoutUser(): void {
  activeSessionUser = null;
}

export async function getCurrentUser(): Promise<UserDTO | null> {
  return await getOrRestoreActiveUser();
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getOrRestoreActiveUser();
    if (!currentUser) {
      return { success: false, error: 'کاربر جاری وارد سیستم نشده است.' };
    }

    const cleanOld = normalizeInput(oldPassword);
    const cleanNew = normalizeInput(newPassword);

    if (!cleanOld || !cleanNew) {
      return { success: false, error: 'رمز عبور فعلی و جدید الزامی هستند.' };
    }

    const db = getDb();
    const [rows]: any = await db.execute(`SELECT password_hash FROM users WHERE id = ?`, [currentUser.id]);
    if (!rows || rows.length === 0) {
      return { success: false, error: 'کاربر یافت نشد.' };
    }

    const currentPasswordHash = rows[0].password_hash;
    const isOldValid = bcrypt.compareSync(cleanOld, currentPasswordHash);
    if (!isOldValid) {
      return { success: false, error: 'رمز عبور فعلی نامعتبر است.' };
    }

    const newPasswordHash = bcrypt.hashSync(cleanNew, 10);
    await db.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newPasswordHash, currentUser.id]);

    return { success: true };
  } catch (err: any) {
    console.error('changePassword exception:', err);
    return { success: false, error: `خطا در تغییر رمز عبور: ${err.message}` };
  }
}

export async function getAllUsers(): Promise<{ success: boolean; users?: UserDTO[]; error?: string }> {
  try {
    const currentUser = await getOrRestoreActiveUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر امکان مشاهده کاربران را دارد.' };
    }

    const db = getDb();
    const [rows]: any = await db.query(
      `SELECT id, phone_number, full_name, role, is_active, created_at, shift_assignment
       FROM users
       ORDER BY id DESC`
    );

    if (!rows || rows.length === 0) {
      return { success: true, users: [] };
    }

    const users: UserDTO[] = rows.map((row: any) => ({
      id: row.id,
      phone_number: row.phone_number,
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      created_at: row.created_at,
      shift_assignment: row.shift_assignment || 'both',
    }));

    return { success: true, users };
  } catch (err: any) {
    console.error('getAllUsers exception:', err);
    return { success: false, error: `خطا در دریافت لیست کاربران: ${err.message}` };
  }
}

export async function createUser(data: {
  phone_number: string;
  password: string;
  full_name: string;
  role?: 'accountant' | 'manager';
  shift_assignment?: 'morning' | 'evening' | 'both';
}): Promise<{ success: boolean; user?: UserDTO; error?: string }> {
  try {
    const currentUser = await getOrRestoreActiveUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر امکان ثبت کاربر جدید را دارد.' };
    }

    const cleanPhone = normalizeInput(data.phone_number);
    const cleanPassword = normalizeInput(data.password);

    if (!cleanPhone || !cleanPassword || !data.full_name) {
      return { success: false, error: 'تمام فیلدها الزامی هستند.' };
    }

    const db = getDb();

    // Check if exists
    const [check]: any = await db.execute(`SELECT id FROM users WHERE phone_number = ?`, [cleanPhone]);
    if (check && check.length > 0) {
      return { success: false, error: 'کاربری با این شماره تماس قبلاً ثبت شده است.' };
    }

    const passwordHash = bcrypt.hashSync(cleanPassword, 10);
    const role = data.role || 'accountant';
    const shiftAssignment = data.shift_assignment || 'both';

    const [result]: any = await db.execute(
      `INSERT INTO users (phone_number, password_hash, full_name, role, shift_assignment, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [cleanPhone, passwordHash, data.full_name.trim(), role, shiftAssignment]
    );

    const newId = result.insertId;
    const [userRows]: any = await db.execute(
      `SELECT id, phone_number, full_name, role, is_active, created_at, shift_assignment
       FROM users WHERE id = ?`,
      [newId]
    );

    const row = userRows[0];
    const createdUser: UserDTO = {
      id: row.id,
      phone_number: row.phone_number,
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      created_at: row.created_at,
      shift_assignment: row.shift_assignment || 'both',
    };

    return { success: true, user: createdUser };
  } catch (err: any) {
    console.error('createUser exception:', err);
    return { success: false, error: `خطا در ثبت کاربر در دیتابیس MySQL: ${err.message}` };
  }
}

export async function updateUser(
  userId: number,
  data: {
    phone_number: string;
    full_name: string;
    shift_assignment?: 'morning' | 'evening' | 'both';
    password?: string;
  }
): Promise<{ success: boolean; user?: UserDTO; error?: string }> {
  try {
    const currentUser = await getOrRestoreActiveUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر امکان ویرایش کاربر را دارد.' };
    }

    const cleanPhone = normalizeInput(data.phone_number);
    const cleanPassword = data.password ? normalizeInput(data.password) : '';

    if (!cleanPhone || !data.full_name.trim()) {
      return { success: false, error: 'نام و شماره تماس الزامی هستند.' };
    }

    const db = getDb();

    // Check phone uniqueness
    const [check]: any = await db.execute(`SELECT id FROM users WHERE phone_number = ? AND id != ?`, [cleanPhone, userId]);
    if (check && check.length > 0) {
      return { success: false, error: 'کاربر دیگری با این شماره تماس ثبت شده است.' };
    }

    const shiftAssignment = data.shift_assignment || 'both';

    if (cleanPassword) {
      const passwordHash = bcrypt.hashSync(cleanPassword, 10);
      await db.execute(
        `UPDATE users
         SET phone_number = ?, full_name = ?, shift_assignment = ?, password_hash = ?
         WHERE id = ?`,
        [cleanPhone, data.full_name.trim(), shiftAssignment, passwordHash, userId]
      );
    } else {
      await db.execute(
        `UPDATE users
         SET phone_number = ?, full_name = ?, shift_assignment = ?
         WHERE id = ?`,
        [cleanPhone, data.full_name.trim(), shiftAssignment, userId]
      );
    }

    const [userRows]: any = await db.execute(
      `SELECT id, phone_number, full_name, role, is_active, created_at, shift_assignment
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return { success: false, error: 'کاربر یافت نشد.' };
    }

    const row = userRows[0];
    const updatedUser: UserDTO = {
      id: row.id,
      phone_number: row.phone_number,
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      created_at: row.created_at,
      shift_assignment: row.shift_assignment || 'both',
    };

    return { success: true, user: updatedUser };
  } catch (err: any) {
    console.error('updateUser exception:', err);
    return { success: false, error: `خطا در ویرایش کاربر در دیتابیس MySQL: ${err.message}` };
  }
}

export async function deleteUser(targetUserId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getOrRestoreActiveUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر امکان حذف حسابدار را دارد.' };
    }

    if (currentUser.id === targetUserId) {
      return { success: false, error: 'امکان حذف حساب کاربری خودتان وجود ندارد.' };
    }

    const db = getDb();

    // Check if target user has registered shifts
    const [shiftCheck]: any = await db.execute(`SELECT id FROM shifts WHERE accountant_id = ?`, [targetUserId]);
    if (shiftCheck && shiftCheck.length > 0) {
      return {
        success: false,
        error: 'این حسابدار دارای شیفت‌های مالی ثبت‌شده در سیستم است. جهت حفظ صحت گزارشات امکان حذف وجود ندارد؛ می‌توانید حساب او را غیرفعال کنید.',
      };
    }

    await db.execute(`DELETE FROM users WHERE id = ?`, [targetUserId]);

    return { success: true };
  } catch (err: any) {
    console.error('deleteUser exception:', err);
    return { success: false, error: `خطا در حذف کاربر: ${err.message}` };
  }
}

export async function toggleUserStatus(targetUserId: number, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getOrRestoreActiveUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'دسترسی غیرمجاز.' };
    }

    if (currentUser.id === targetUserId) {
      return { success: false, error: 'امکان تغییر وضعیت حساب کاربری خودتان وجود ندارد.' };
    }

    const db = getDb();
    await db.execute(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, targetUserId]);

    return { success: true };
  } catch (err: any) {
    console.error('toggleUserStatus exception:', err);
    return { success: false, error: `خطا در تغییر وضعیت کاربر: ${err.message}` };
  }
}
