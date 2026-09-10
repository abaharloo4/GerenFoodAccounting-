import { getDb } from '../db/index';
import { getCurrentUser } from './auth.service';
import { calculateShiftReconciliation } from './calculation.service';
import fs from 'fs';
import path from 'path';
import { dialog, BrowserWindow, app } from 'electron';
import ExcelJS from 'exceljs';

export interface ShiftReportFilter {
  startDateShamsi?: string;
  endDateShamsi?: string;
  accountantId?: number;
  shiftType?: 'morning' | 'evening' | 'all';
}

function getAppVersionString(): string {
  try {
    if (app && typeof app.getVersion === 'function') {
      return app.getVersion();
    }
  } catch {}
  return '1.0.9';
}

export interface ShiftReportItem {
  id: number;
  shift_date_shamsi: string;
  shift_type: 'morning' | 'evening';
  accountant_id: number;
  accountant_name: string;
  system_sales: number;
  cash_amount: number;
  status: 'open' | 'submitted' | 'locked';
  notes?: string;
  total_pos: number;
  total_credit: number;
  total_card_to_card: number;
  total_known_shortage: number;
  total_known_surplus: number;
  total_accounted: number;
  system_sales_after_shortage: number;
  adjusted_cash_and_card: number;
  unknown_remainder: number;
  till_status_fa: string;
  pos_details_str: string;
  credit_details_str: string;
  card_to_card_details_str: string;
  shortage_details_str: string;
  surplus_details_str: string;
  created_at: string;
  locked_by_name?: string;
  locked_at?: string;
}

export async function getAllShiftsReport(filters: ShiftReportFilter): Promise<{ success: boolean; shifts?: ShiftReportItem[]; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'کاربر وارد نشده است.' };
    }

    const db = getDb();
    let whereClauses: string[] = ['1=1'];
    let params: any[] = [];

    // Accountants can only view their own shifts
    if (currentUser.role === 'accountant') {
      filters.accountantId = currentUser.id;
    }

    if (filters.startDateShamsi) {
      whereClauses.push(`s.shift_date_shamsi >= ?`);
      params.push(filters.startDateShamsi);
    }
    if (filters.endDateShamsi) {
      whereClauses.push(`s.shift_date_shamsi <= ?`);
      params.push(filters.endDateShamsi);
    }
    if (filters.accountantId) {
      whereClauses.push(`s.accountant_id = ?`);
      params.push(filters.accountantId);
    }
    if (filters.shiftType && filters.shiftType !== 'all') {
      whereClauses.push(`s.shift_type = ?`);
      params.push(filters.shiftType);
    }

    const query = `
      SELECT s.id, s.shift_date_shamsi, s.shift_type, s.accountant_id, u.full_name as accountant_name,
             s.system_sales, s.cash_amount, s.status, s.notes, s.created_at, s.locked_by, s.locked_at,
             u2.full_name as locked_by_name
      FROM shifts s
      LEFT JOIN users u ON s.accountant_id = u.id
      LEFT JOIN users u2 ON s.locked_by = u2.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY s.shift_date_shamsi DESC, s.id DESC
    `;

    const [rows]: any = await db.execute(query, params);
    if (!rows || rows.length === 0) {
      return { success: true, shifts: [] };
    }

    const shifts: ShiftReportItem[] = [];
    const shiftIds: number[] = rows.map((r: any) => Number(r.id));
    const placeholders = shiftIds.map(() => '?').join(',');

    const [allPosRows]: any = await db.query(
      `SELECT shift_id, pos_label, amount FROM pos_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allCreditRows]: any = await db.query(
      `SELECT shift_id, description, amount FROM credit_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allCardToCardRows]: any = await db.query(
      `SELECT shift_id, description, amount FROM card_to_card_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allShortageRows]: any = await db.query(
      `SELECT shift_id, description, amount FROM shortage_entries WHERE shift_id IN (${placeholders})`,
      shiftIds
    );
    const [allSurplusRows]: any = await db.query(
      `SELECT shift_id, description, amount FROM surplus_entries WHERE shift_id IN (${placeholders})`,
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

      const posEntries = posRows.map((r: any) => Number(r.amount));
      const creditEntries = creditRows.map((r: any) => Number(r.amount));
      const cardToCardEntries = cardToCardRows.map((r: any) => Number(r.amount));
      const shortageEntries = shortageRows.map((r: any) => Number(r.amount));
      const surplusEntries = surplusRows.map((r: any) => Number(r.amount));

      const calc = calculateShiftReconciliation({
        systemSales: Number(row.system_sales),
        cashAmount: Number(row.cash_amount),
        posEntries,
        creditEntries,
        cardToCardEntries,
        shortageEntries,
        surplusEntries,
      });

      const pos_details_str = posRows.map((r: any) => `${r.pos_label || 'پوز'}: ${Number(r.amount).toLocaleString('fa-IR')} ریال`).join(' | ') || 'ثبت نشده';
      const credit_details_str = creditRows.map((r: any) => `${r.description || 'اعتبار'}: ${Number(r.amount).toLocaleString('fa-IR')} ریال`).join(' | ') || 'ثبت نشده';
      const card_to_card_details_str = cardToCardRows.map((r: any) => `${r.description || 'کارت به کارت'}: ${Number(r.amount).toLocaleString('fa-IR')} ریال`).join(' | ') || 'ثبت نشده';
      const shortage_details_str = shortageRows.map((r: any) => `${r.description || 'علت کسری'}: ${Number(r.amount).toLocaleString('fa-IR')} ریال`).join(' | ') || 'ثبت نشده';
      const surplus_details_str = surplusRows.map((r: any) => `${r.description || 'علت اضافه'}: ${Number(r.amount).toLocaleString('fa-IR')} ریال`).join(' | ') || 'ثبت نشده';
      const till_status_fa = calc.unknownRemainder < 0 ? 'کسری صندوق' : calc.unknownRemainder > 0 ? 'اضافه صندوق' : 'بالانس و متوازن';

      shifts.push({
        id: shiftId,
        shift_date_shamsi: row.shift_date_shamsi,
        shift_type: row.shift_type,
        accountant_id: row.accountant_id,
        accountant_name: row.accountant_name || 'حسابدار',
        system_sales: Number(row.system_sales),
        cash_amount: Number(row.cash_amount),
        status: row.status,
        notes: row.notes || '',
        created_at: row.created_at,
        locked_by_name: row.locked_by_name,
        locked_at: row.locked_at,
        total_pos: calc.totalPos,
        total_credit: calc.totalCredit,
        total_card_to_card: calc.totalCardToCard,
        total_known_shortage: calc.totalKnownShortage,
        total_known_surplus: calc.totalKnownSurplus,
        total_accounted: calc.totalAccounted,
        system_sales_after_shortage: calc.systemSalesAfterShortage,
        adjusted_cash_and_card: calc.adjustedCashAndCard,
        unknown_remainder: calc.unknownRemainder,
        till_status_fa,
        pos_details_str,
        credit_details_str,
        card_to_card_details_str,
        shortage_details_str,
        surplus_details_str,
      });
    }

    return { success: true, shifts };
  } catch (err: any) {
    console.error('getAllShiftsReport exception:', err);
    return { success: false, error: err.message };
  }
}

export async function lockShift(shiftId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'کاربر وارد نشده است.' };
    }

    const db = getDb();

    if (currentUser.role === 'accountant') {
      const [rows]: any = await db.execute(`SELECT accountant_id FROM shifts WHERE id = ?`, [shiftId]);
      if (!rows || rows.length === 0) {
        return { success: false, error: 'شیفت مورد نظر یافت نشد.' };
      }
      if (rows[0].accountant_id !== currentUser.id) {
        return { success: false, error: 'شما فقط امکان قفل کردن شیفت خودتان را دارید.' };
      }
    }

    await db.execute(
      `UPDATE shifts
       SET status = 'locked', locked_by = ?, locked_at = NOW()
       WHERE id = ?`,
      [currentUser.id, shiftId]
    );

    await db.execute(
      `INSERT INTO audit_log (entity_type, entity_id, action, changed_by)
       VALUES ('shift', ?, 'lock', ?)`,
      [shiftId, currentUser.id]
    );

    return { success: true };
  } catch (err: any) {
    console.error('lockShift exception:', err);
    return { success: false, error: err.message };
  }
}

export async function unlockShift(shiftId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'کاربر وارد نشده است.' };
    }

    if (currentUser.role !== 'manager') {
      return { success: false, error: 'فقط مدیر امکان باز کردن (خروج از حالت قفل) شیفت را دارد.' };
    }

    const db = getDb();

    await db.execute(
      `UPDATE shifts
       SET status = 'submitted', locked_by = NULL, locked_at = NULL
       WHERE id = ?`,
      [shiftId]
    );

    await db.execute(
      `INSERT INTO audit_log (entity_type, entity_id, action, changed_by)
       VALUES ('shift', ?, 'unlock', ?)`,
      [shiftId, currentUser.id]
    );

    return { success: true };
  } catch (err: any) {
    console.error('unlockShift exception:', err);
    return { success: false, error: err.message };
  }
}

export async function exportShiftsToCSV(filters: ShiftReportFilter = {}): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const reportRes = await getAllShiftsReport(filters);
    if (!reportRes.success || !reportRes.shifts) {
      return { success: false, error: reportRes.error || 'خطا در دریافت داده‌ها' };
    }

    const shifts = reportRes.shifts;
    if (shifts.length === 0) {
      return { success: false, error: 'هیچ رکوردی برای خروجی یافت نشد.' };
    }

    // Create a native Excel workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Geren Food Accounting System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('گزارش تسویه صندوق', {
      views: [{ rightToLeft: true }] // Native Persian RTL layout
    });

    // Define columns
    worksheet.columns = [
      { header: 'شناسه شیفت', key: 'id', width: 14 },
      { header: 'تاریخ شمسی', key: 'shift_date_shamsi', width: 14 },
      { header: 'نوع شیفت', key: 'shift_type', width: 12 },
      { header: 'نام حسابدار', key: 'accountant_name', width: 18 },
      { header: 'وضعیت شیفت', key: 'status', width: 14 },
      { header: 'فروش سیستم (ریال)', key: 'system_sales', width: 22 },
      { header: 'مبلغ نقد صندوق (ریال)', key: 'cash_amount', width: 22 },
      { header: 'جمع فروش پوزها (ریال)', key: 'total_pos', width: 22 },
      { header: 'جزئیات دستگاه‌های پوز', key: 'pos_details_str', width: 36 },
      { header: 'جمع اعتباری‌ها (ریال)', key: 'total_credit', width: 22 },
      { header: 'جزئیات فروش‌های اعتباری', key: 'credit_details_str', width: 36 },
      { header: 'جمع کارت به کارت (ریال)', key: 'total_card_to_card', width: 22 },
      { header: 'جزئیات کارت به کارت', key: 'card_to_card_details_str', width: 36 },
      { header: 'جمع کسری شناخته‌شده (ریال)', key: 'total_known_shortage', width: 24 },
      { header: 'جزئیات کسری‌های شناخته‌شده', key: 'shortage_details_str', width: 36 },
      { header: 'جمع اضافه شناخته‌شده (ریال)', key: 'total_known_surplus', width: 24 },
      { header: 'جزئیات اضافه‌های شناخته‌شده', key: 'surplus_details_str', width: 36 },
      { header: 'مجموع کل اقلام (ریال)', key: 'total_accounted', width: 24 },
      { header: 'مابه‌التفاوت تطبیق (ریال)', key: 'unknown_remainder', width: 24 },
      { header: 'ارزیابی نهایی وضعیت صندوق', key: 'till_status_fa', width: 24 },
      { header: 'کاربر قفل‌کننده', key: 'locked_by_name', width: 18 },
      { header: 'تاریخ و زمان قفل', key: 'locked_at', width: 20 },
    ];

    // Style Header Row (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF312E81' }, // Indigo header background
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }, // White text
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        left: { style: 'thin', color: { argb: 'FF64748B' } },
        bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        right: { style: 'thin', color: { argb: 'FF64748B' } },
      };
    });

    // Insert Data Rows
    for (const s of shifts) {
      const shiftTypeFa = s.shift_type === 'morning' ? 'صبح' : 'عصر';
      const statusFa = s.status === 'locked' ? 'قفل‌شده' : 'ثبت‌شده';

      const row = worksheet.addRow({
        id: `#${s.id}`,
        shift_date_shamsi: s.shift_date_shamsi,
        shift_type: shiftTypeFa,
        accountant_name: s.accountant_name,
        status: statusFa,
        system_sales: s.system_sales,
        cash_amount: s.cash_amount,
        total_pos: s.total_pos,
        pos_details_str: s.pos_details_str,
        total_credit: s.total_credit,
        credit_details_str: s.credit_details_str,
        total_card_to_card: s.total_card_to_card,
        card_to_card_details_str: s.card_to_card_details_str,
        total_known_shortage: s.total_known_shortage,
        shortage_details_str: s.shortage_details_str,
        total_known_surplus: s.total_known_surplus,
        surplus_details_str: s.surplus_details_str,
        total_accounted: s.total_accounted,
        unknown_remainder: s.unknown_remainder,
        till_status_fa: s.till_status_fa,
        locked_by_name: s.locked_by_name || '-',
        locked_at: s.locked_at || '-',
      });

      row.height = 24;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Format money/numeric columns LTR with comma separator format
        if ([6, 7, 8, 10, 12, 14, 16, 18, 19].includes(colNumber)) {
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Remainder & status color highlight
        if (colNumber === 19 || colNumber === 20) {
          if (s.unknown_remainder < 0) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }; // Red
          } else if (s.unknown_remainder > 0) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF16A34A' } }; // Green
          } else {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF4F46E5' } }; // Indigo
          }
        }
      });
    }

    // Add empty row spacing and footer row in Excel
    worksheet.addRow([]);
    const footerRow = worksheet.addRow([`سیستم حسابداری کافه گرن — طراحی و توسعه توسط امیرمحمد بهارلو | شماره پشتیبانی: 09384857722 — نسخه برنامه ${getAppVersionString()}`]);
    worksheet.mergeCells(`A${footerRow.number}:V${footerRow.number}`);
    const footerCell = worksheet.getCell(`A${footerRow.number}`);
    footerCell.font = { name: 'Segoe UI', size: 9.5, italic: true, bold: true, color: { argb: 'FF64748B' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    let targetFilePath = '';

    // Attempt Electron native dialog if available
    try {
      if (dialog && typeof dialog.showSaveDialog === 'function') {
        const saveDialog = await dialog.showSaveDialog({
          title: 'ذخیره گزارش اکسل واقعی (.xlsx)',
          defaultPath: `گزارش_جامع_تسویه_صندوق_${Date.now()}.xlsx`,
          filters: [
            { name: 'Excel Workbook (*.xlsx)', extensions: ['xlsx'] },
            { name: 'All Files (*.*)', extensions: ['*'] },
          ],
        });

        if (saveDialog && !saveDialog.canceled && saveDialog.filePath) {
          targetFilePath = saveDialog.filePath;
        } else if (saveDialog && saveDialog.canceled) {
          return { success: false, error: 'عملیات توسط کاربر لغو شد.' };
        }
      }
    } catch {
      // Fallback if dialog is unavailable or fails
    }

    // Fallback path to Desktop or Home if dialog was bypassed or unavailable
    if (!targetFilePath) {
      const userHome = process.env.USERPROFILE || process.env.HOME || 'C:\\';
      const desktopDir = path.join(userHome, 'Desktop');
      const targetDir = fs.existsSync(desktopDir) ? desktopDir : userHome;
      targetFilePath = path.join(targetDir, `گزارش_جامع_تسویه_صندوق_${Date.now()}.xlsx`);
    }

    await workbook.xlsx.writeFile(targetFilePath);
    return { success: true, filePath: targetFilePath };
  } catch (err: any) {
    console.error('exportShiftsToCSV exception:', err);
    return { success: false, error: err.message };
  }
}

export async function exportShiftsToPDF(filters: ShiftReportFilter = {}): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const reportRes = await getAllShiftsReport(filters);
    if (!reportRes.success || !reportRes.shifts) {
      return { success: false, error: reportRes.error || 'خطا در دریافت داده‌ها' };
    }

    const shifts = reportRes.shifts;
    if (shifts.length === 0) {
      return { success: false, error: 'هیچ رکوردی برای خروجی یافت نشد.' };
    }

    const formatNum = (val: number) => Math.abs(val || 0).toLocaleString('fa-IR');

    // Calculate Summary Totals
    const totalSystemSales = shifts.reduce((acc, s) => acc + s.system_sales, 0);
    const totalCash = shifts.reduce((acc, s) => acc + s.cash_amount, 0);
    const totalPos = shifts.reduce((acc, s) => acc + s.total_pos, 0);
    const totalCredit = shifts.reduce((acc, s) => acc + s.total_credit, 0);
    const totalCardToCard = shifts.reduce((acc, s) => acc + s.total_card_to_card, 0);
    const totalAccountedAll = shifts.reduce((acc, s) => acc + s.total_accounted, 0);
    const totalRemainderAll = totalAccountedAll - totalSystemSales;

    const exportDateFa = new Date().toLocaleDateString('fa-IR');
    const exportTimeFa = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    let rowsHtml = '';
    for (const s of shifts) {
      const shiftTypeFa = s.shift_type === 'morning' ? 'صبح' : 'عصر';
      const statusFa = s.status === 'locked' ? 'قفل‌شده' : 'ثبت‌شده';
      const isShortage = s.unknown_remainder < 0;
      const isSurplus = s.unknown_remainder > 0;
      const statusClass = isShortage ? 'badge-shortage' : isSurplus ? 'badge-surplus' : 'badge-balanced';

      rowsHtml += `
        <tr>
          <td>#${s.id}</td>
          <td>${s.shift_date_shamsi}</td>
          <td>${shiftTypeFa}</td>
          <td>${s.accountant_name}</td>
          <td><span class="badge ${s.status === 'locked' ? 'badge-locked' : 'badge-submitted'}">${statusFa}</span></td>
          <td class="num">${formatNum(s.system_sales)}</td>
          <td class="num">${formatNum(s.cash_amount)}</td>
          <td class="num">${formatNum(s.total_pos)}</td>
          <td class="details-cell">${s.pos_details_str}</td>
          <td class="num">${formatNum(s.total_credit)}</td>
          <td class="details-cell">${s.credit_details_str}</td>
          <td class="num">${formatNum(s.total_card_to_card)}</td>
          <td class="details-cell">${s.card_to_card_details_str}</td>
          <td class="num">${formatNum(s.total_known_shortage)}</td>
          <td class="details-cell">${s.shortage_details_str}</td>
          <td class="num">${formatNum(s.total_known_surplus)}</td>
          <td class="details-cell">${s.surplus_details_str}</td>
          <td class="num bold">${formatNum(s.total_accounted)}</td>
          <td class="num bold ${isShortage ? 'text-red' : isSurplus ? 'text-green' : 'text-indigo'}">${isShortage ? '-' : isSurplus ? '+' : ''}${formatNum(s.unknown_remainder)}</td>
          <td><span class="badge ${statusClass}">${s.till_status_fa}</span></td>
        </tr>
      `;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش جامع تسویه صندوق — کافه گرن</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap');
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Vazirmatn', 'Segoe UI', Tahoma, Arial, sans-serif !important;
    direction: rtl;
    background: #ffffff;
    color: #0f172a;
    margin: 0;
    padding: 0;
    font-size: 11px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #4f46e5;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-logo {
    width: 38px;
    height: 38px;
    background: #312e81;
    border-radius: 8px;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    font-family: 'Segoe UI', sans-serif;
  }
  .brand-title {
    font-size: 16px;
    font-weight: 800;
    color: #1e1b4b;
  }
  .brand-subtitle {
    font-size: 10px;
    color: #64748b;
  }
  .meta-info {
    text-align: left;
    font-size: 9px;
    color: #475569;
    line-height: 1.5;
  }
  .kpi-container {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .kpi-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px;
    text-align: center;
  }
  .kpi-label { font-size: 9px; color: #64748b; margin-bottom: 3px; }
  .kpi-val { font-size: 11px; font-weight: bold; color: #0f172a; }
  .kpi-val.green { color: #16a34a; }
  .kpi-val.red { color: #dc2626; }
  .kpi-val.indigo { color: #4f46e5; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 5px;
    font-size: 9px;
  }
  th {
    background-color: #312e81;
    color: #ffffff;
    font-weight: 700;
    padding: 7px 4px;
    border: 1px solid #475569;
    text-align: center;
    font-size: 9.5px;
  }
  td {
    padding: 5px 4px;
    border: 1px solid #cbd5e1;
    text-align: center;
    vertical-align: middle;
  }
  tr:nth-child(even) { background-color: #f8fafc; }
  .num { text-align: left; direction: ltr; font-size: 9.5px; }
  .bold { font-weight: bold; }
  .text-red { color: #dc2626; }
  .text-green { color: #16a34a; }
  .text-indigo { color: #4f46e5; }
  .details-cell { text-align: right; font-size: 8.5px; color: #334155; max-width: 130px; word-break: break-word; }
  .badge {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 8.5px;
    font-weight: 600;
  }
  .badge-locked { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
  .badge-submitted { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .badge-shortage { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
  .badge-surplus { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; }
  .badge-balanced { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
  .footer {
    margin-top: 12px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    color: #94a3b8;
  }
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    <div class="brand-logo">G</div>
    <div>
      <div class="brand-title">کافه گرن — Geren Food Accounting</div>
      <div class="brand-subtitle">گزارش رسمی و جامع تسویه حساب صندوق</div>
    </div>
  </div>
  <div class="meta-info">
    <div>تاریخ گزارش: <strong>${exportDateFa}</strong> ساعت <strong>${exportTimeFa}</strong></div>
    <div>تعداد شیفت‌های گزارش‌شده: <strong>${shifts.length} شیفت</strong></div>
  </div>
</div>

<div class="kpi-container">
  <div class="kpi-card">
    <div class="kpi-label">مجموع فروش سیستم</div>
    <div class="kpi-val">${formatNum(totalSystemSales)} ریال</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">مجموع نقد صندوق</div>
    <div class="kpi-val">${formatNum(totalCash)} ریال</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">مجموع کل کارتخوان‌ها</div>
    <div class="kpi-val">${formatNum(totalPos)} ریال</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">مجموع فروش‌های اعتباری</div>
    <div class="kpi-val">${formatNum(totalCredit)} ریال</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">مجموع کارت به کارت</div>
    <div class="kpi-val">${formatNum(totalCardToCard)} ریال</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">مجموع کل دریافتی و اقلام</div>
    <div class="kpi-val indigo">${formatNum(totalAccountedAll)} ریال</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">وضعیت کلی صندوق</div>
    <div class="kpi-val ${totalRemainderAll < 0 ? 'red' : totalRemainderAll > 0 ? 'green' : 'indigo'}">
      ${totalRemainderAll < 0 ? 'کسری: ' : totalRemainderAll > 0 ? 'اضافه: ' : ''}${formatNum(totalRemainderAll)} ریال
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>شناسه</th>
      <th>تاریخ</th>
      <th>شیفت</th>
      <th>حسابدار</th>
      <th>وضعیت</th>
      <th>فروش سیستم</th>
      <th>نقد صندوق</th>
      <th>جمع پوزها</th>
      <th>جزئیات پوزها</th>
      <th>جمع اعتباری</th>
      <th>جزئیات اعتباری</th>
      <th>کارت به کارت</th>
      <th>جزئیات کارت به کارت</th>
      <th>کسری شناخته‌شده</th>
      <th>جزئیات کسری</th>
      <th>اضافه شناخته‌شده</th>
      <th>جزئیات اضافه</th>
      <th>مجموع کل اقلام</th>
      <th>مابه‌التفاوت</th>
      <th>ارزیابی صندوق</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<div class="footer">
  <div>سیستم حسابداری کافه گرن — طراحی و توسعه توسط امیرمحمد بهارلو | شماره پشتیبانی: 09384857722 — نسخه برنامه ${getAppVersionString()}</div>
  <div>صفحه ۱ از ۱</div>
</div>

</body>
</html>`;

    let targetFilePath = '';

    try {
      if (dialog && typeof dialog.showSaveDialog === 'function') {
        const saveDialog = await dialog.showSaveDialog({
          title: 'ذخیره گزارش PDF رسمی',
          defaultPath: `گزارش_جامع_تسویه_صندوق_${Date.now()}.pdf`,
          filters: [
            { name: 'PDF Document (*.pdf)', extensions: ['pdf'] },
            { name: 'All Files (*.*)', extensions: ['*'] },
          ],
        });

        if (saveDialog && saveDialog.canceled) {
          return { success: false, error: 'عملیات توسط کاربر لغو شد.' };
        }

        if (saveDialog && saveDialog.filePath) {
          targetFilePath = saveDialog.filePath;
        }
      }
    } catch {
      // Fallback if dialog is unavailable or fails
    }

    if (!targetFilePath) {
      const userHome = process.env.USERPROFILE || process.env.HOME || 'C:\\';
      const desktopDir = path.join(userHome, 'Desktop');
      const targetDir = fs.existsSync(desktopDir) ? desktopDir : userHome;
      targetFilePath = path.join(targetDir, `گزارش_جامع_تسویه_صندوق_${Date.now()}.pdf`);
    }

    // Write temp HTML file for Electron printToPDF
    const tempDir = app && typeof app.getPath === 'function' ? app.getPath('temp') : process.cwd();
    const tempHtmlPath = path.join(tempDir, `temp_report_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

    if (BrowserWindow && typeof BrowserWindow === 'function') {
      const win = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      await win.loadFile(tempHtmlPath);

      // Wait 700ms for Persian fonts (Vazirmatn) to download and settle
      await new Promise((resolve) => setTimeout(resolve, 700));

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        landscape: true,
        margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 }
      });

      win.destroy();

      // Clean up temp HTML file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }

      fs.writeFileSync(targetFilePath, pdfBuffer);
      return { success: true, filePath: targetFilePath };
    } else {
      if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
      return { success: false, error: 'تولید فایل PDF فقط در نسخه دسکتاپ پشتیبانی می‌شود.' };
    }
  } catch (err: any) {
    console.error('exportShiftsToPDF exception:', err);
    return { success: false, error: err.message };
  }
}




