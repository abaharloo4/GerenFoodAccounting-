import type { ShiftCalculationResult } from '../types/shift';
import { AlertCircle, CheckCircle2, Scale, Wallet, Receipt, CreditCard, DollarSign, ArrowLeftRight } from 'lucide-react';

interface ShiftCalculationSummaryProps {
  calculation: ShiftCalculationResult;
}

export default function ShiftCalculationSummary({ calculation }: ShiftCalculationSummaryProps) {
  const formatCurrency = (val: number) => {
    return Math.abs(val).toLocaleString('fa-IR');
  };

  const isShortage = calculation.unknownRemainder < 0;
  const isSurplus = calculation.unknownRemainder > 0;
  const isBalanced = calculation.unknownRemainder === 0;
  const systemSales = calculation.totalAccounted - calculation.unknownRemainder;

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem' }}>
        <Scale size={22} color="#818cf8" />
        <span>خلاصه محاسبات و وضعیت تسویه صندوق</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            <CreditCard size={15} color="#818cf8" />
            <span>پوز و نقد</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            {formatCurrency(calculation.totalPos + calculation.cashAmount)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ریال</span>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            <Receipt size={15} color="#38bdf8" />
            <span>جمع اعتباری‌ها</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            {formatCurrency(calculation.totalCredit)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ریال</span>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            <ArrowLeftRight size={15} color="#06b6d4" />
            <span>کارت به کارت</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            {formatCurrency(calculation.totalCardToCard)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ریال</span>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            <DollarSign size={15} color="#f87171" />
            <span>کسری / اضافه شناخته‌شده</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            کسری: {formatCurrency(calculation.totalKnownShortage)} | اضافه: {formatCurrency(calculation.totalKnownSurplus)}
          </div>
        </div>

        <div style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#a5b4fc', marginBottom: '0.3rem' }}>
            <Wallet size={15} color="#818cf8" />
            <span>مجموع کل اقلام و دریافتی‌ها</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8' }}>
            {formatCurrency(calculation.totalAccounted)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ریال</span>
          </div>
        </div>
      </div>

      {/* Primary Highlight Banner for Comparison with System Sales */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isShortage
          ? 'linear-gradient(135deg, rgba(155, 21, 46, 0.3) 0%, rgba(110, 15, 34, 0.25) 100%)'
          : isSurplus
          ? 'linear-gradient(135deg, rgba(31, 122, 92, 0.3) 0%, rgba(15, 75, 55, 0.25) 100%)'
          : 'linear-gradient(135deg, rgba(51, 69, 107, 0.3) 0%, rgba(30, 42, 68, 0.25) 100%)',
        border: `1px solid ${
          isShortage ? 'rgba(155, 21, 46, 0.5)' : isSurplus ? 'rgba(31, 122, 92, 0.5)' : 'rgba(51, 69, 107, 0.5)'
        }`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {isShortage && <AlertCircle size={32} color="#e0526b" />}
          {isSurplus && <CheckCircle2 size={32} color="#34d399" />}
          {isBalanced && <Scale size={32} color="#818cf8" />}

          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fcf8f8', marginBottom: '0.2rem' }}>
              تطبیق مجموع اقلام با فروش سیستم ({formatCurrency(systemSales)} ریال)
            </div>
            <div style={{ fontSize: '0.825rem', color: isShortage ? '#ead2d6' : isSurplus ? '#e3f2ec' : '#e8ebf1' }}>
              {isShortage && 'مجموع اقلام کمتر از فروش سیستم است ➔ صندوق دارای کسری است'}
              {isSurplus && 'مجموع اقلام بیشتر از فروش سیستم است ➔ صندوق دارای اضافه است'}
              {isBalanced && 'مجموع اقلام دقیقاً برابر با فروش سیستم است ➔ صندوق کاملاً متوازن و بالانس است'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'left', direction: 'ltr' }}>
          <div style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: isShortage ? '#f87171' : isSurplus ? '#34d399' : '#818cf8',
          }}>
            {isShortage ? '-' : isSurplus ? '+' : ''}{formatCurrency(calculation.unknownRemainder)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d4c5c7', textAlign: 'right' }}>
            {isShortage ? 'ریال کسری' : isSurplus ? 'ریال اضافه' : 'ریال (بالانس)'}
          </div>
        </div>
      </div>
    </div>
  );
}

