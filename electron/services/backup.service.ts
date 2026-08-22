import fs from 'fs';
import { dialog } from 'electron';
import { getDb } from '../db/index';

export interface AuditLogItem {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  old_value?: string;
  new_value?: string;
}

export function createAutoBackup(): void {
  // MySQL handles automatic background data durability
}

export async function getBackupData(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const db = getDb();
    const [users]: any = await db.query(`SELECT * FROM users`);
    const [shifts]: any = await db.query(`SELECT * FROM shifts`);
    const [posEntries]: any = await db.query(`SELECT * FROM pos_entries`);
    const [creditEntries]: any = await db.query(`SELECT * FROM credit_entries`);
    const [cardToCardEntries]: any = await db.query(`SELECT * FROM card_to_card_entries`);
    const [shortageEntries]: any = await db.query(`SELECT * FROM shortage_entries`);
    const [surplusEntries]: any = await db.query(`SELECT * FROM surplus_entries`);
    const [auditLog]: any = await db.query(`SELECT * FROM audit_log`);

    const backupData = {
      exported_at: new Date().toISOString(),
      tables: {
        users,
        shifts,
        pos_entries: posEntries,
        credit_entries: creditEntries,
        card_to_card_entries: cardToCardEntries,
        shortage_entries: shortageEntries,
        surplus_entries: surplusEntries,
        audit_log: auditLog,
      },
    };

    return { success: true, data: backupData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createManualBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const res = await getBackupData();
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'خطا در استخراج اطلاعات دیتابیس' };
    }

    const saveDialog = await dialog.showSaveDialog({
      title: 'ذخیره نسخه پشتیبان دیتابیس (JSON/SQL Dump)',
      defaultPath: `پشتیبان_صندوق_کافه_${Date.now()}.json`,
      filters: [{ name: 'JSON Backup (*.json)', extensions: ['json'] }],
    });

    if (saveDialog.canceled || !saveDialog.filePath) {
      return { success: false, error: 'عملیات لغو شد.' };
    }

    fs.writeFileSync(saveDialog.filePath, JSON.stringify(res.data, null, 2), 'utf8');
    return { success: true, filePath: saveDialog.filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAuditLogs(): Promise<{ success: boolean; logs?: AuditLogItem[]; error?: string }> {
  try {
    const db = getDb();
    const query = `
      SELECT a.id, a.entity_type, a.entity_id, a.action, a.changed_by, u.full_name as changed_by_name, a.changed_at
      FROM audit_log a
      LEFT JOIN users u ON a.changed_by = u.id
      ORDER BY a.id DESC
      LIMIT 500
    `;
    const [rows]: any = await db.query(query);
    if (!rows || rows.length === 0) {
      return { success: true, logs: [] };
    }

    const logs: AuditLogItem[] = rows.map((row: any) => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      changed_by: row.changed_by,
      changed_by_name: row.changed_by_name || 'کاربر',
      changed_at: row.changed_at,
    }));

    return { success: true, logs };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
