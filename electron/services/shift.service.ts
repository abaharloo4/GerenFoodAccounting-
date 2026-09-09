import { getDb } from '../db/index';
import { getCurrentUser } from './auth.service';
import { calculateShiftReconciliation } from './calculation.service';

export interface PosItem {
  id?: number;
  pos_label: string;
  amount: number;
}

export interface NamedItem {
  id?: number;
  description: string;
  amount: number;
}

export interface ShiftFullRecord {
  id: number;
  shift_date_shamsi: string;
  shift_type: 'morning' | 'evening';
  accountant_id: number;
  accountant_name?: string;
  system_sales: number;
  cash_amount: number;
  status: 'open' | 'submitted' | 'locked';
  notes?: string;
  pos_entries: PosItem[];
  credit_entries: NamedItem[];
  card_to_card_entries: NamedItem[];
  shortage_entries: NamedItem[];
  surplus_entries: NamedItem[];
  created_at: string;
  updated_at: string;
  locked_by?: number;
  locked_at?: string;
}

export interface ShiftSaveInput {
  shift_date_shamsi: string;
  shift_type: 'morning' | 'evening';
  system_sales: number;
  cash_amount: number;
  notes?: string;
  accountant_id?: number;
  pos_entries: { pos_label: string; amount: number }[];
  credit_entries: { description: string; amount: number }[];
  card_to_card_entries: { description: string; amount: number }[];
  shortage_entries: { description: string; amount: number }[];
  surplus_entries: { description: string; amount: number }[];
}

export async function getTodayShift(
  accountantId: number,
  shiftDateShamsi: string,
  shiftType: 'morning' | 'evening'
): Promise<{ success: boolean; shift?: ShiftFullRecord; existingShiftType?: 'morning' | 'evening'; takenByOthers?: string[]; error?: string }> {
  try {
    const db = getDb();

    // Query all recorded shifts for this date across all accountants
    const [allShiftsForDate]: any = await db.execute(
      `SELECT shift_type, accountant_id FROM shifts WHERE shift_date_shamsi = ?`,
      [shiftDateShamsi]
    );

    const myShiftRow = allShiftsForDate.find((r: any) => r.accountant_id === accountantId);
    const existingShiftType = myShiftRow ? myShiftRow.shift_type : undefined;

    const takenByOthers: string[] = allShiftsForDate
      .filter((r: any) => r.accountant_id !== accountantId)
      .map((r: any) => r.shift_type);

    const targetType = existingShiftType || shiftType;

    const [rows]: any = await db.execute(
      `SELECT s.id, s.shift_date_shamsi, s.shift_type, s.accountant_id, u.full_name as accountant_name,
              s.system_sales, s.cash_amount, s.status, s.notes, s.created_at, s.updated_at, s.locked_by, s.locked_at
       FROM shifts s
       LEFT JOIN users u ON s.accountant_id = u.id
       WHERE s.shift_date_shamsi = ? AND s.accountant_id = ? AND s.shift_type = ?`,
      [shiftDateShamsi, accountantId, targetType]
    );

    if (!rows || rows.length === 0) {
      return { success: true, shift: undefined, existingShiftType, takenByOthers };
    }

    const row = rows[0];
    const shiftId = row.id;

    const [posRows]: any = await db.execute(`SELECT id, pos_label, amount FROM pos_entries WHERE shift_id = ?`, [shiftId]);
    const [creditRows]: any = await db.execute(`SELECT id, description, amount FROM credit_entries WHERE shift_id = ?`, [shiftId]);
    const [cardToCardRows]: any = await db.execute(`SELECT id, description, amount FROM card_to_card_entries WHERE shift_id = ?`, [shiftId]);
    const [shortageRows]: any = await db.execute(`SELECT id, description, amount FROM shortage_entries WHERE shift_id = ?`, [shiftId]);
    const [surplusRows]: any = await db.execute(`SELECT id, description, amount FROM surplus_entries WHERE shift_id = ?`, [shiftId]);

    const pos_entries: PosItem[] = posRows.map((r: any) => ({ id: r.id, pos_label: r.pos_label, amount: Number(r.amount) }));
    const credit_entries: NamedItem[] = creditRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));
    const card_to_card_entries: NamedItem[] = cardToCardRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));
    const shortage_entries: NamedItem[] = shortageRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));
    const surplus_entries: NamedItem[] = surplusRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));

    const shiftRecord: ShiftFullRecord = {
      id: shiftId,
      shift_date_shamsi: row.shift_date_shamsi,
      shift_type: row.shift_type,
      accountant_id: row.accountant_id,
      accountant_name: row.accountant_name,
      system_sales: Number(row.system_sales),
      cash_amount: Number(row.cash_amount),
      status: row.status,
      notes: row.notes || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      locked_by: row.locked_by,
      locked_at: row.locked_at,
      pos_entries,
      credit_entries,
      card_to_card_entries,
      shortage_entries,
      surplus_entries,
    };

    return { success: true, shift: shiftRecord, existingShiftType: row.shift_type, takenByOthers };
  } catch (err: any) {
    console.error('getTodayShift exception:', err);
    return { success: false, error: err.message };
  }
}

export async function getShiftDetails(shiftId: number): Promise<{ success: boolean; shift?: ShiftFullRecord; error?: string }> {
  try {
    const db = getDb();
    const [rows]: any = await db.execute(
      `SELECT s.id, s.shift_date_shamsi, s.shift_type, s.accountant_id, u.full_name as accountant_name,
              s.system_sales, s.cash_amount, s.status, s.notes, s.created_at, s.updated_at, s.locked_by, s.locked_at
       FROM shifts s
       LEFT JOIN users u ON s.accountant_id = u.id
       WHERE s.id = ?`,
      [shiftId]
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: 'شیفت مورد نظر یافت نشد.' };
    }

    const row = rows[0];

    const [posRows]: any = await db.execute(`SELECT id, pos_label, amount FROM pos_entries WHERE shift_id = ?`, [shiftId]);
    const [creditRows]: any = await db.execute(`SELECT id, description, amount FROM credit_entries WHERE shift_id = ?`, [shiftId]);
    const [cardToCardRows]: any = await db.execute(`SELECT id, description, amount FROM card_to_card_entries WHERE shift_id = ?`, [shiftId]);
    const [shortageRows]: any = await db.execute(`SELECT id, description, amount FROM shortage_entries WHERE shift_id = ?`, [shiftId]);
    const [surplusRows]: any = await db.execute(`SELECT id, description, amount FROM surplus_entries WHERE shift_id = ?`, [shiftId]);

    const pos_entries: PosItem[] = posRows.map((r: any) => ({ id: r.id, pos_label: r.pos_label, amount: Number(r.amount) }));
    const credit_entries: NamedItem[] = creditRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));
    const card_to_card_entries: NamedItem[] = cardToCardRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));
    const shortage_entries: NamedItem[] = shortageRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));
    const surplus_entries: NamedItem[] = surplusRows.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) }));

    const shiftRecord: ShiftFullRecord = {
      id: shiftId,
      shift_date_shamsi: row.shift_date_shamsi,
      shift_type: row.shift_type,
      accountant_id: row.accountant_id,
      accountant_name: row.accountant_name,
      system_sales: Number(row.system_sales),
      cash_amount: Number(row.cash_amount),
      status: row.status,
      notes: row.notes || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      locked_by: row.locked_by,
      locked_at: row.locked_at,
      pos_entries,
      credit_entries,
      card_to_card_entries,
      shortage_entries,
      surplus_entries,
    };

    return { success: true, shift: shiftRecord };
  } catch (err: any) {
    console.error('getShiftDetails exception:', err);
    return { success: false, error: err.message };
  }
}

export async function saveShift(input: ShiftSaveInput): Promise<{ success: boolean; shiftId?: number; error?: string }> {
  try {
    let currentUser = await getCurrentUser();

    // If backend session lost but frontend sent accountant_id, restore from DB
    if (!currentUser && input.accountant_id) {
      try {
        const dbPool = getDb();
        const [rows]: any = await dbPool.execute(
          `SELECT id, phone_number, full_name, role, is_active, created_at, shift_assignment
           FROM users WHERE id = ? AND is_active = 1`,
          [input.accountant_id]
        );
        if (rows && rows.length > 0) {
          const row = rows[0];
          currentUser = {
            id: row.id,
            phone_number: row.phone_number,
            full_name: row.full_name,
            role: row.role,
            is_active: row.is_active,
            created_at: row.created_at,
            shift_assignment: row.shift_assignment || 'both',
          };
        }
      } catch (lookupErr) {
        console.error('Failed to lookup accountant by id:', lookupErr);
      }
    }

    if (!currentUser) {
      return { success: false, error: 'کاربر وارد نشده است. لطفاً دوباره وارد شوید.' };
    }

    // Role-based target assignment: Accountants can only save for themselves
    const targetAccountantId = currentUser.role === 'manager' && input.accountant_id
      ? input.accountant_id
      : currentUser.id;
    const assignedAccountantId = targetAccountantId;
    const dbPool = getDb();

    // Check if shift is already taken by another accountant for this date and shift_type
    const [existingShifts]: any = await dbPool.execute(
      `SELECT id, accountant_id FROM shifts WHERE shift_date_shamsi = ? AND shift_type = ?`,
      [input.shift_date_shamsi, input.shift_type]
    );

    if (existingShifts && existingShifts.length > 0) {
      const existing = existingShifts[0];
      if (existing.accountant_id !== assignedAccountantId) {
        return {
          success: false,
          error: `شیفت ${input.shift_type === 'morning' ? 'صبح' : 'عصر'} برای تاریخ ${input.shift_date_shamsi} قبلاً توسط حسابدار دیگری ثبت شده است.`
        };
      }
    }

    const conn = await dbPool.getConnection();

    try {
      await conn.beginTransaction();

      // Check if shift already exists
      const [existingRows]: any = await conn.execute(
        `SELECT id, accountant_id, status FROM shifts
         WHERE shift_date_shamsi = ? AND shift_type = ?`,
        [input.shift_date_shamsi, input.shift_type]
      );

      let shiftId = 0;

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        shiftId = existing.id;
        const existingAccountant = existing.accountant_id;
        const status = existing.status;

        if (status === 'locked') {
          await conn.rollback();
          conn.release();
          return { success: false, error: 'این شیفت توسط مدیر قفل شده است و امکان ویرایش ندارد.' };
        }

        if (currentUser.role === 'accountant' && existingAccountant !== targetAccountantId) {
          await conn.rollback();
          conn.release();
          return { success: false, error: 'شما فقط امکان ویرایش شیفت خودتان را دارید.' };
        }

        // Update main shift record
        await conn.execute(
          `UPDATE shifts
           SET system_sales = ?, cash_amount = ?, notes = ?, accountant_id = ?, updated_at = NOW()
           WHERE id = ?`,
          [input.system_sales || 0, input.cash_amount || 0, input.notes || '', targetAccountantId, shiftId]
        );

        // Clear child entries for clean overwrite
        await conn.execute(`DELETE FROM pos_entries WHERE shift_id = ?`, [shiftId]);
        await conn.execute(`DELETE FROM credit_entries WHERE shift_id = ?`, [shiftId]);
        await conn.execute(`DELETE FROM card_to_card_entries WHERE shift_id = ?`, [shiftId]);
        await conn.execute(`DELETE FROM shortage_entries WHERE shift_id = ?`, [shiftId]);
        await conn.execute(`DELETE FROM surplus_entries WHERE shift_id = ?`, [shiftId]);
      } else {
        // Create new shift
        const [result]: any = await conn.execute(
          `INSERT INTO shifts (shift_date_shamsi, shift_type, accountant_id, system_sales, cash_amount, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
          [input.shift_date_shamsi, input.shift_type, targetAccountantId, input.system_sales || 0, input.cash_amount || 0, input.notes || '']
        );
        shiftId = result.insertId;
        console.log(`[saveShift] Created new shift ID=${shiftId} for accountant_id=${targetAccountantId}`);
      }

      // Insert pos entries
      if (input.pos_entries && input.pos_entries.length > 0) {
        for (const p of input.pos_entries) {
          if (p.pos_label.trim() && p.amount > 0) {
            await conn.execute(`INSERT INTO pos_entries (shift_id, pos_label, amount) VALUES (?, ?, ?)`, [shiftId, p.pos_label.trim(), p.amount]);
          }
        }
      }

      // Insert credit entries
      if (input.credit_entries && input.credit_entries.length > 0) {
        for (const c of input.credit_entries) {
          if (c.description.trim() && c.amount > 0) {
            await conn.execute(`INSERT INTO credit_entries (shift_id, description, amount) VALUES (?, ?, ?)`, [shiftId, c.description.trim(), c.amount]);
          }
        }
      }

      // Insert card to card entries
      if (input.card_to_card_entries && input.card_to_card_entries.length > 0) {
        for (const cc of input.card_to_card_entries) {
          if (cc.description.trim() && cc.amount > 0) {
            await conn.execute(`INSERT INTO card_to_card_entries (shift_id, description, amount) VALUES (?, ?, ?)`, [shiftId, cc.description.trim(), cc.amount]);
          }
        }
      }

      // Insert shortage entries
      if (input.shortage_entries && input.shortage_entries.length > 0) {
        for (const s of input.shortage_entries) {
          if (s.description.trim() && s.amount > 0) {
            await conn.execute(`INSERT INTO shortage_entries (shift_id, description, amount) VALUES (?, ?, ?)`, [shiftId, s.description.trim(), s.amount]);
          }
        }
      }

      // Insert surplus entries
      if (input.surplus_entries && input.surplus_entries.length > 0) {
        for (const s of input.surplus_entries) {
          if (s.description.trim() && s.amount > 0) {
            await conn.execute(`INSERT INTO surplus_entries (shift_id, description, amount) VALUES (?, ?, ?)`, [shiftId, s.description.trim(), s.amount]);
          }
        }
      }

      // Record audit log
      await conn.execute(
        `INSERT INTO audit_log (entity_type, entity_id, action, changed_by)
         VALUES ('shift', ?, 'save', ?)`,
        [shiftId, currentUser.id]
      );

      await conn.commit();
      conn.release();

      console.log(`[saveShift] Successfully saved shift ID=${shiftId}`);
      return { success: true, shiftId };
    } catch (innerErr: any) {
      await conn.rollback();
      conn.release();
      console.error('saveShift transaction error:', innerErr);
      throw innerErr;
    }
  } catch (err: any) {
    console.error('saveShift exception:', err);
    return { success: false, error: err.message };
  }
}

export interface AccountantShiftRecord {
  id: number;
  shift_date_shamsi: string;
  shift_type: 'morning' | 'evening';
  system_sales: number;
  cash_amount: number;
  total_pos: number;
  total_credit: number;
  total_card_to_card: number;
  total_known_shortage: number;
  total_known_surplus: number;
  unknown_remainder: number;
  status: 'open' | 'submitted' | 'locked';
  created_at: string;
}

export async function getAccountantShifts(accountantId: number): Promise<{ success: boolean; shifts?: AccountantShiftRecord[]; error?: string }> {
  try {
    const db = getDb();


    const [rows]: any = await db.execute(
      `SELECT id, shift_date_shamsi, shift_type, system_sales, cash_amount, status, created_at
       FROM shifts
       WHERE accountant_id = ?
       ORDER BY shift_date_shamsi DESC, id DESC`,
      [accountantId]
    );

    if (!rows || rows.length === 0) {
      return { success: true, shifts: [] };
    }

    const shifts: AccountantShiftRecord[] = [];
    const shiftIds: number[] = rows.map((r: any) => Number(r.id));
    const placeholders = shiftIds.map(() => '?').join(',');

    const [allPosRows]: any = await db.query(
      `SELECT shift_id, amount FROM pos_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allCreditRows]: any = await db.query(
      `SELECT shift_id, amount FROM credit_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allCardToCardRows]: any = await db.query(
      `SELECT shift_id, amount FROM card_to_card_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allShortageRows]: any = await db.query(
      `SELECT shift_id, amount FROM shortage_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allSurplusRows]: any = await db.query(
      `SELECT shift_id, amount FROM surplus_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );

    const posByShift = new Map<number, any[]>();
    const creditByShift = new Map<number, any[]>();
    const cardToCardByShift = new Map<number, any[]>();
    const shortageByShift = new Map<number, any[]>();
    const surplusByShift = new Map<number, any[]>();

    for (const id of shiftIds) {
      posByShift.set(id, []);
      creditByShift.set(id, []);
      cardToCardByShift.set(id, []);
      shortageByShift.set(id, []);
      surplusByShift.set(id, []);
    }

    for (const r of allPosRows || []) posByShift.get(r.shift_id)?.push(r);
    for (const r of allCreditRows || []) creditByShift.get(r.shift_id)?.push(r);
    for (const r of allCardToCardRows || []) cardToCardByShift.get(r.shift_id)?.push(r);
    for (const r of allShortageRows || []) shortageByShift.get(r.shift_id)?.push(r);
    for (const r of allSurplusRows || []) surplusByShift.get(r.shift_id)?.push(r);

    for (const row of rows) {
      const shiftId = row.id;
      const posRows = posByShift.get(shiftId) || [];
      const creditRows = creditByShift.get(shiftId) || [];
      const cardToCardRows = cardToCardByShift.get(shiftId) || [];
      const shortageRows = shortageByShift.get(shiftId) || [];
      const surplusRows = surplusByShift.get(shiftId) || [];

      const calc = calculateShiftReconciliation({
        systemSales: Number(row.system_sales),
        cashAmount: Number(row.cash_amount),
        posEntries: posRows.map((r: any) => Number(r.amount)),
        creditEntries: creditRows.map((r: any) => Number(r.amount)),
        cardToCardEntries: cardToCardRows.map((r: any) => Number(r.amount)),
        shortageEntries: shortageRows.map((r: any) => Number(r.amount)),
        surplusEntries: surplusRows.map((r: any) => Number(r.amount)),
      });

      shifts.push({
        id: shiftId,
        shift_date_shamsi: row.shift_date_shamsi,
        shift_type: row.shift_type,
        system_sales: Number(row.system_sales),
        cash_amount: Number(row.cash_amount),
        total_pos: calc.totalPos,
        total_credit: calc.totalCredit,
        total_card_to_card: calc.totalCardToCard,
        total_known_shortage: calc.totalKnownShortage,
        total_known_surplus: calc.totalKnownSurplus,
        unknown_remainder: calc.unknownRemainder,
        status: row.status,
        created_at: row.created_at,
      });
    }

    return { success: true, shifts };
  } catch (err: any) {
    console.error('getAccountantShifts exception:', err);
    return { success: false, error: err.message };
  }
}
