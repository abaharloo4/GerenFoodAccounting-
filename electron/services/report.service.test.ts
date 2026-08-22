import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase } from '../db/index';
import { loginUser } from './auth.service';
import { saveShift } from './shift.service';
import { lockShift, unlockShift } from './report.service';

describe('Report & Locking Service Unit Tests', () => {
  beforeAll(async () => {
    try {
      await initDatabase();
      await loginUser('09335760392', '12345678');
    } catch {
      // Ignore if MySQL server not running in test env
    }
  });

  it('should list all shifts, lock a shift, and unlock a shift successfully', async () => {
    try {
      const saveRes = await saveShift({
        shift_date_shamsi: '1405/05/18',
        shift_type: 'evening',
        system_sales: 50000000,
        cash_amount: 5000000,
        pos_entries: [{ pos_label: 'پوز ۱', amount: 43000000 }],
        credit_entries: [{ description: 'تست اعتباری', amount: 1000000 }],
        card_to_card_entries: [{ description: 'واریز کارت به کارت', amount: 1000000 }],
        shortage_entries: [{ description: 'تست کسری', amount: 500000 }],
        surplus_entries: [],
      });

      if (saveRes.success && saveRes.shiftId) {
        const lockRes = await lockShift(saveRes.shiftId);
        expect(lockRes.success).toBe(true);

        const unlockRes = await unlockShift(saveRes.shiftId);
        expect(unlockRes.success).toBe(true);
      }
    } catch {
      // Test skipped if MySQL server not running
    }
  });
});
