export interface ShiftCalculationInput {
  systemSales: number;
  cashAmount: number;
  posEntries: number[];
  creditEntries: number[];
  cardToCardEntries?: number[];
  shortageEntries: number[];
  surplusEntries: number[];
}

export interface ShiftCalculationResult {
  totalPos: number;
  totalCredit: number;
  totalCardToCard: number;
  totalKnownShortage: number;
  totalKnownSurplus: number;
  cashAmount: number;
  totalAccounted: number; // مجموع پوز + نقد + اعتباری + کارت به کارت + کسری - اضافه
  systemSalesAfterShortage: number;
  adjustedCashAndCard: number;
  unknownRemainder: number; // مثبت = اضافه صندوق، منفی = کسری صندوق
}

/**
 * محاسبه فرمول تسویه شیفت:
 * مجموع اقلام و دریافتی‌ها = پوز + نقد + اعتباری + کارت به کارت + کسری شناخته‌شده - اضافه شناخته‌شده
 * باقی‌مانده / مابه‌التفاوت = مجموع اقلام و دریافتی‌ها - فروش سیستم
 * (اگر مثبت باشد = اضافه صندوق؛ اگر منفی باشد = کسری صندوق)
 */
export function calculateShiftReconciliation(input: ShiftCalculationInput): ShiftCalculationResult {
  const sum = (arr?: number[]) => (arr || []).reduce((acc, val) => acc + (val || 0), 0);

  const totalPos = sum(input.posEntries);
  const totalCredit = sum(input.creditEntries);
  const totalCardToCard = sum(input.cardToCardEntries);
  const totalKnownShortage = sum(input.shortageEntries);
  const totalKnownSurplus = sum(input.surplusEntries);
  const cashAmount = input.cashAmount || 0;

  // مجموع پوز + نقد + اعتباری + کارت به کارت + کسری شناخته‌شده - اضافه شناخته‌شده
  const totalAccounted = totalPos + cashAmount + totalCredit + totalCardToCard + totalKnownShortage - totalKnownSurplus;

  const systemSalesAfterShortage = (input.systemSales || 0) - totalKnownShortage;
  const adjustedCashAndCard = totalPos + cashAmount + totalKnownSurplus;

  // مابه‌التفاوت مجموع اقلام با میزان فروش سیستم
  // اگر مثبت باشد = اضافه صندوق، اگر منفی باشد = کسری صندوق
  const unknownRemainder = totalAccounted - (input.systemSales || 0);

  return {
    totalPos,
    totalCredit,
    totalCardToCard,
    totalKnownShortage,
    totalKnownSurplus,
    cashAmount,
    totalAccounted,
    systemSalesAfterShortage,
    adjustedCashAndCard,
    unknownRemainder,
  };
}

