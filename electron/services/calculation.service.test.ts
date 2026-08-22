import { describe, it, expect } from 'vitest';
import { calculateShiftReconciliation } from './calculation.service';

describe('Shift Calculation Service Test', () => {
  it('should correctly calculate totalAccounted and shortage remainder', () => {
    // فروش سیستم: ۱۰Direct: 100,000,000
    // فروش کارتخوان: ۹۸,۰۰۰,۰۰۰
    // اعتباری: ۲۰۰,۰۰۰
    // کسری شناخته‌شده: ۱,۰۰۰,۰۰۰
    // نقد: ۰
    // اضافه شناخته‌شده: ۰
    // مجموع اقلام: ۹۸,۰۰۰,۰۰۰ + ۲۰۰,۰۰۰ + ۱,۰۰۰,۰۰۰ = ۹۹,۲۰۰,۰۰۰
    // ۹۹,۲۰۰,۰۰۰ - ۱۰۰,۰۰۰,۰۰۰ = -۸۰۰,۰۰۰ (۸۰۰,۰۰۰ کسری صندوق)

    const result = calculateShiftReconciliation({
      systemSales: 100000000,
      cashAmount: 0,
      posEntries: [98000000],
      creditEntries: [200000],
      shortageEntries: [1000000],
      surplusEntries: [],
    });

    expect(result.totalPos).toBe(98000000);
    expect(result.totalCredit).toBe(200000);
    expect(result.totalKnownShortage).toBe(1000000);
    expect(result.totalKnownSurplus).toBe(0);
    expect(result.cashAmount).toBe(0);
    expect(result.totalAccounted).toBe(99200000);
    expect(result.unknownRemainder).toBe(-800000); // کسری صندوق
  });

  it('should handle surplus when sum of entries exceeds system sales', () => {
    // فروش سیستم: ۵۰,۰۰۰,۰۰۰
    // نقد: ۵,۰۰۰,۰۰۰
    // پوز: ۴۳,۰۰۰,۰۰۰
    // اعتباری: ۱,۰۰۰,۰۰۰
    // کسری: ۵۰۰,۰۰۰
    // اضافه: ۲۰۰,۰۰۰
    // مجموع: ۴۳,۰۰۰,۰۰۰ + ۵,۰۰۰,۰۰۰ + ۱,۰۰۰,۰۰۰ + ۵۰۰,۰۰۰ - ۲۰۰,۰۰۰ = ۴۹,۳۰۰,۰۰۰
    // ۴۹,۳۰۰,۰۰۰ - ۵۰,۰۰۰,۰۰۰ = -۷۰۰,۰۰۰ (کسری صندوق)

    const result = calculateShiftReconciliation({
      systemSales: 50000000,
      cashAmount: 5000000,
      posEntries: [40000000, 3000000], // 43,000,000
      creditEntries: [1000000],
      shortageEntries: [500000],
      surplusEntries: [200000],
    });

    expect(result.totalAccounted).toBe(49300000);
    expect(result.unknownRemainder).toBe(-700000);
  });

  it('should detect till surplus when total entries exceed system sales', () => {
    // فروش سیستم: ۱۰۰,۰۰۰,۰۰۰
    // نقد: ۲,۰۰۰,۰۰۰
    // پوز: ۹۵,۰۰۰,۰۰۰
    // اعتباری: ۵,۰۰۰,۰۰۰
    // کسری: ۱,۰۰۰,۰۰۰
    // اضافه: ۰
    // مجموع: ۹۵,۰۰۰,۰۰۰ + ۵,۰۰۰,۰۰۰ + ۱,۰۰۰,۰۰۰ + ۰ + ۲,۰۰۰,۰۰۰ = ۱۰۳,۰۰۰,۰۰۰
    // ۱۰۳,۰۰۰,۰۰۰ - ۱۰۰,۰۰۰,۰۰۰ = +۳,۰۰۰,۰۰۰ (۳,۰۰۰,۰۰۰ اضافه صندوق)

    const result = calculateShiftReconciliation({
      systemSales: 100000000,
      cashAmount: 2000000,
      posEntries: [95000000],
      creditEntries: [5000000],
      shortageEntries: [1000000],
      surplusEntries: [],
    });

    expect(result.totalAccounted).toBe(103000000);
    expect(result.unknownRemainder).toBe(3000000); // اضافه صندوق
  });

  it('should correctly include card to card entries like credit in calculation formula', () => {
    // فرمول: نقد + اعتباری + کارت به کارت + پوز + کسری - اضاف = فروش سیستم
    // فروش سیستم: ۸۰,۰۰۰,۰۰۰
    // نقد: ۱۰,۰۰۰,۰۰۰
    // پوز: ۵۰,۰۰۰,۰۰۰
    // اعتباری: ۵,۰۰۰,۰۰۰
    // کارت به کارت: ۱۵,۰۰۰,۰۰۰
    // کسری: ۲,۰۰۰,۰۰۰
    // اضافه: ۲,۰۰۰,۰۰۰
    // مجموع: ۱۰M + ۵۰M + ۵M + ۱۵M + ۲M - ۲M = ۸۰,۰۰۰,۰۰۰ (کاملاً متوازن و بالانس)

    const result = calculateShiftReconciliation({
      systemSales: 80000000,
      cashAmount: 10000000,
      posEntries: [50000000],
      creditEntries: [5000000],
      cardToCardEntries: [10000000, 5000000],
      shortageEntries: [2000000],
      surplusEntries: [2000000],
    });

    expect(result.totalPos).toBe(50000000);
    expect(result.totalCredit).toBe(5000000);
    expect(result.totalCardToCard).toBe(15000000);
    expect(result.cashAmount).toBe(10000000);
    expect(result.totalKnownShortage).toBe(2000000);
    expect(result.totalKnownSurplus).toBe(2000000);
    expect(result.totalAccounted).toBe(80000000);
    expect(result.unknownRemainder).toBe(0); // کاملاً بالانس
  });
});

