import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RepeatableEntryList, { EntryItem } from '../components/RepeatableEntryList';
import ShiftCalculationSummary from '../components/ShiftCalculationSummary';
import { calculateShiftReconciliation } from '../../electron/services/calculation.service';
import { Sun, Moon, Save, Check, AlertCircle, ArrowRight, Lock, ArrowLeft, FileText } from 'lucide-react';
import { apiBridge } from '../services/apiBridge';

import { getTodayShamsi } from '../utils/dateUtils';
import { ShamsiDatePickerInput } from '../components/ShamsiDatePickerModal';

interface ShiftEntryFormProps {
  onBack?: () => void;
  initialDateShamsi?: string;
  initialShiftType?: 'morning' | 'evening';
}

export default function ShiftEntryForm({ onBack, initialDateShamsi, initialShiftType }: ShiftEntryFormProps) {
  const { user } = useAuth();

  // Date and shift type (Shamsi date in Asia/Tehran timezone)
  const defaultShamsiDate = getTodayShamsi();

  const [shiftDateShamsi, setShiftDateShamsi] = useState(initialDateShamsi || defaultShamsiDate);
  const [shiftType, setShiftType] = useState<'morning' | 'evening'>(initialShiftType || 'morning');

  // Track existing shift id & status
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [shiftStatus, setShiftStatus] = useState<'open' | 'submitted' | 'locked'>('open');
  const [shiftNotes, setShiftNotes] = useState<string>('');

  // Numerical inputs
  const [systemSalesStr, setSystemSalesStr] = useState<string>('');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const normalized = val
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣۴٥٦٧۸۹'.indexOf(d).toString())
      .replace(/[^\d]/g, '');
    return normalized ? Number(normalized) : 0;
  };

  // Lists
  const [posEntries, setPosEntries] = useState<EntryItem[]>([
    { labelOrDesc: 'پوز اصلی (سامان)', amount: '' },
  ]);
  const [creditEntries, setCreditEntries] = useState<EntryItem[]>([]);
  const [cardToCardEntries, setCardToCardEntries] = useState<EntryItem[]>([]);
  const [shortageEntries, setShortageEntries] = useState<EntryItem[]>([]);
  const [surplusEntries, setSurplusEntries] = useState<EntryItem[]>([]);

  const [isShiftTypeLocked, setIsShiftTypeLocked] = useState(false);
  const [isLoadingShift, setIsLoadingShift] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing shift if already recorded
  const loadExistingShift = async () => {
    if (!user) return;
    setIsLoadingShift(true);
    try {
      const res = await apiBridge.getTodayShift(user.id, shiftDateShamsi, shiftType);
      if (res.existingShiftType) {
        setShiftType(res.existingShiftType);
        setIsShiftTypeLocked(true);
      } else {
        setIsShiftTypeLocked(false);
      }

      if (res.success && res.shift) {
        const s = res.shift;
        setShiftId(s.id);
        setShiftStatus(s.status);
        setSystemSalesStr(s.system_sales ? String(s.system_sales) : '');
        setCashAmountStr(s.cash_amount ? String(s.cash_amount) : '');
        setShiftNotes(s.notes || '');

        setPosEntries(
          Array.isArray(s.pos_entries) && s.pos_entries.length > 0
            ? s.pos_entries.map((p) => ({ labelOrDesc: p.pos_label || '', amount: p.amount ?? '' }))
            : [{ labelOrDesc: 'پوز اصلی (سامان)', amount: '' }]
        );

        setCreditEntries(
          Array.isArray(s.credit_entries)
            ? s.credit_entries.map((c) => ({ labelOrDesc: c.description || '', amount: c.amount ?? '' }))
            : []
        );

        setCardToCardEntries(
          Array.isArray(s.card_to_card_entries)
            ? s.card_to_card_entries.map((c) => ({ labelOrDesc: c.description || '', amount: c.amount ?? '' }))
            : []
        );

        setShortageEntries(
          Array.isArray(s.shortage_entries)
            ? s.shortage_entries.map((sh) => ({ labelOrDesc: sh.description || '', amount: sh.amount ?? '' }))
            : []
        );

        setSurplusEntries(
          Array.isArray(s.surplus_entries)
            ? s.surplus_entries.map((su) => ({ labelOrDesc: su.description || '', amount: su.amount ?? '' }))
            : []
        );
      } else {
        setShiftId(null);
        setShiftStatus('open');
        setShiftNotes('');
      }
    } catch {
      // Keep defaults
    } finally {
      setIsLoadingShift(false);
    }
  };

  useEffect(() => {
    loadExistingShift();
  }, [shiftDateShamsi, shiftType]);

  // Live calculation result
  const calculationResult = useMemo(() => {
    return calculateShiftReconciliation({
      systemSales: parseNumber(systemSalesStr),
      cashAmount: parseNumber(cashAmountStr),
      posEntries: posEntries.map((p) => parseNumber(String(p.amount))),
      creditEntries: creditEntries.map((c) => parseNumber(String(c.amount))),
      cardToCardEntries: cardToCardEntries.map((c) => parseNumber(String(c.amount))),
      shortageEntries: shortageEntries.map((sh) => parseNumber(String(sh.amount))),
      surplusEntries: surplusEntries.map((su) => parseNumber(String(su.amount))),
    });
  }, [systemSalesStr, cashAmountStr, posEntries, creditEntries, cardToCardEntries, shortageEntries, surplusEntries]);

  const handleLockCurrentShift = async () => {
    if (!shiftId) return;
    if (!confirm('آیا از قفل کردن این شیفت اطمینان دارید؟ پس از قفل شدن، دیگر امکان ویرایش نخواهید داشت.')) {
      return;
    }

    setIsLocking(true);
    try {
      const res = await apiBridge.lockShift(shiftId);
      if (res.success) {
        setShiftStatus('locked');
        setMessage({ type: 'success', text: 'این شیفت با موفقیت قفل گردید و دیگر امکان ویرایش ندارد.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'خطا در قفل کردن شیفت' });
      }
    } catch {
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط برای قفل شیفت' });
    } finally {
      setIsLocking(false);
    }
  };

  // Centralized Save Function
  const saveShiftData = async (options?: { closeOnSuccess?: boolean; modeMessage?: 'autosave' | 'shortcut' | 'manual' }) => {
    if (shiftStatus === 'locked') {
      setMessage({ type: 'error', text: 'این شیفت قفل شده است و امکان تغییر ندارد.' });
      return;
    }

    const systemSalesNum = parseNumber(systemSalesStr);
    const cashAmountNum = parseNumber(cashAmountStr);

    if (!systemSalesStr.trim()) {
      if (options?.modeMessage !== 'autosave') {
        setMessage({ type: 'error', text: 'لطفاً مبلغ فروش سیستم را وارد کنید.' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        shift_date_shamsi: shiftDateShamsi.trim(),
        shift_type: shiftType,
        system_sales: systemSalesNum,
        cash_amount: cashAmountNum,
        notes: shiftNotes.trim(),
        accountant_id: user?.id,
        pos_entries: posEntries.map((p) => ({ pos_label: p.labelOrDesc, amount: parseNumber(String(p.amount)) })),
        credit_entries: creditEntries.map((c) => ({ description: c.labelOrDesc, amount: parseNumber(String(c.amount)) })),
        card_to_card_entries: cardToCardEntries.map((c) => ({ description: c.labelOrDesc, amount: parseNumber(String(c.amount)) })),
        shortage_entries: shortageEntries.map((sh) => ({ description: sh.labelOrDesc, amount: parseNumber(String(sh.amount)) })),
        surplus_entries: surplusEntries.map((su) => ({ description: su.labelOrDesc, amount: parseNumber(String(su.amount)) })),
      };

      const res = await apiBridge.saveShift(payload);
      if (res.success) {
        if (res.shiftId) setShiftId(res.shiftId);
        setShiftStatus('submitted');

        const now = new Date();
        const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

        if (options?.modeMessage === 'autosave') {
          setMessage({ type: 'success', text: `ذخیره خودکار ۱۵ دقیقه‌ای سیستم در ساعت ${timeStr} انجام شد.` });
        } else if (options?.modeMessage === 'shortcut') {
          setMessage({ type: 'success', text: `اطلاعات شیفت با کلید میانبر (Ctrl+S) در ساعت ${timeStr} ثبت گردید.` });
        } else {
          setMessage({ type: 'success', text: `اطلاعات تسویه شیفت با موفقیت در ساعت ${timeStr} در دیتابیس ذخیره شد.` });
          if (options?.closeOnSuccess) {
            setTimeout(() => {
              if (onBack) onBack();
            }, 1200);
          }
        }
      } else {
        setMessage({ type: 'error', text: res.error || 'خطا در ثبت شیفت در دیتابیس' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `خطایی در ثبت اطلاعات رخ داد: ${err.message || ''}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. 15-Minute Periodic Autosave Timer (هر ربع ساعت)
  useEffect(() => {
    if (shiftStatus === 'locked') return;

    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const intervalId = setInterval(() => {
      if (systemSalesStr.trim()) {
        saveShiftData({ closeOnSuccess: false, modeMessage: 'autosave' });
      }
    }, FIFTEEN_MINUTES_MS);

    return () => clearInterval(intervalId);
  }, [
    shiftStatus,
    shiftDateShamsi,
    shiftType,
    systemSalesStr,
    cashAmountStr,
    shiftNotes,
    posEntries,
    creditEntries,
    cardToCardEntries,
    shortageEntries,
    surplusEntries,
    user?.id,
  ]);

  // 2. Keyboard Shortcut: Ctrl+S / Cmd+S for instant saving, Esc for back
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveShiftData({ closeOnSuccess: false, modeMessage: 'shortcut' });
      } else if (e.key === 'Escape') {
        if (onBack) onBack();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    onBack,
    shiftStatus,
    shiftDateShamsi,
    shiftType,
    systemSalesStr,
    cashAmountStr,
    shiftNotes,
    posEntries,
    creditEntries,
    cardToCardEntries,
    shortageEntries,
    surplusEntries,
    user?.id,
  ]);

  // 3. Form Submit & Enter Key Save Handler (ذخیره سریع با اینتر بدون بستن فرم)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveShiftData({ closeOnSuccess: false, modeMessage: 'manual' });
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      // Allow newline in textarea; save form on Enter in all other input fields without closing
      if (tagName !== 'textarea') {
        e.preventDefault();
        saveShiftData({ closeOnSuccess: false, modeMessage: 'manual' });
      }
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '0.6rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowRight size={18} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
              فرم تسویه صندوق شیفت
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              ورودی‌های مالی شیفت را وارد کنید؛ سیستم باقی‌مانده ناشناخته را به صورت زنده محاسبه می‌کند.
            </p>
          </div>
        </div>

        {/* Shift Type Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.35rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => !isShiftTypeLocked && setShiftType('morning')}
              disabled={isShiftTypeLocked && shiftType !== 'morning'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1rem',
                border: 'none',
                borderRadius: '8px',
                cursor: (isShiftTypeLocked && shiftType !== 'morning') ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: shiftType === 'morning' ? '#f59e0b' : 'transparent',
                color: shiftType === 'morning' ? '#0f172a' : '#94a3b8',
                opacity: (isShiftTypeLocked && shiftType !== 'morning') ? 0.4 : 1,
                transition: 'all 0.2s',
              }}
              title={isShiftTypeLocked ? 'نوع شیفت برای این تاریخ ثبت شده و تا انتهای روز قابل تغییر نیست' : undefined}
            >
              <Sun size={16} />
              <span>شیفت صبح</span>
            </button>

            <button
              type="button"
              onClick={() => !isShiftTypeLocked && setShiftType('evening')}
              disabled={isShiftTypeLocked && shiftType !== 'evening'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1rem',
                border: 'none',
                borderRadius: '8px',
                cursor: (isShiftTypeLocked && shiftType !== 'evening') ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: shiftType === 'evening' ? '#6366f1' : 'transparent',
                color: shiftType === 'evening' ? '#ffffff' : '#94a3b8',
                opacity: (isShiftTypeLocked && shiftType !== 'evening') ? 0.4 : 1,
                transition: 'all 0.2s',
              }}
              title={isShiftTypeLocked ? 'نوع شیفت برای این تاریخ ثبت شده و تا انتهای روز قابل تغییر نیست' : undefined}
            >
              <Moon size={16} />
              <span>شیفت عصر</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shift Type Info Banner */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderRadius: '12px',
        fontSize: '0.85rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: isShiftTypeLocked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        border: `1px solid ${isShiftTypeLocked ? 'rgba(99, 102, 241, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
        color: isShiftTypeLocked ? '#818cf8' : '#fbbf24',
      }}>
        {isShiftTypeLocked ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={16} />
            <span>شیفت امروز شما برای تاریخ <strong>{shiftDateShamsi}</strong> به عنوان «<strong>{shiftType === 'morning' ? 'شیفت صبح' : 'شیفت عصر'}</strong>» ثبت شده و تا انتهای امروز ثابت است.</span>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} />
            <span>لطفاً شیفت امروز خود (<strong>صبح</strong> یا <strong>عصر</strong>) را انتخاب نمایید. پس از ثبت نهایی، نوع شیفت امروز روی حالت انتخابی تثبیت می‌شود.</span>
          </span>
        )}
      </div>

      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.9rem 1.25rem',
          borderRadius: '12px',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: message.type === 'success' ? '#34d399' : '#f87171',
        }}>
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {isLoadingShift ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          در حال بارگذاری اطلاعات شیفت...
        </div>
      ) : (
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Direct Numeric Inputs */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            <ShamsiDatePickerInput
              value={shiftDateShamsi}
              onChange={setShiftDateShamsi}
              label="تاریخ شیفت (شمسی)"
              disabled={shiftStatus === 'locked'}
              title="انتخاب تاریخ ثبت شیفت"
            />

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                فروش سیستم (مجموع ثبت صندوق)
              </label>
              <input
                type="text"
                placeholder="مبلغ به ریال (مثال: 5000000)"
                value={systemSalesStr}
                onChange={(e) => setSystemSalesStr(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  direction: 'ltr',
                  textAlign: 'left',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {systemSalesStr && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', direction: 'rtl', textAlign: 'right' }}>
                  معادل: {parseNumber(systemSalesStr).toLocaleString('fa-IR')} ریال
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                مبلغ نقد موجود در صندوق
              </label>
              <input
                type="text"
                placeholder="مبلغ به ریال (مثال: 500000)"
                value={cashAmountStr}
                onChange={(e) => setCashAmountStr(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  direction: 'ltr',
                  textAlign: 'left',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {cashAmountStr && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', direction: 'rtl', textAlign: 'right' }}>
                  معادل: {parseNumber(cashAmountStr).toLocaleString('fa-IR')} ریال
                </div>
              )}
            </div>
          </div>

          {/* Repeatable Entry Lists Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.25rem' }}>
            <RepeatableEntryList
              title="فروش دستگاه‌های کارتخوان (پوز)"
              labelPlaceholder="نام یا شماره پوز (مثلاً سامان/پارسیان)"
              items={posEntries}
              onChange={setPosEntries}
              accentColor="#6366f1"
              badgeText="چند پوزه"
            />

            <RepeatableEntryList
              title="فروش اعتباری"
              labelPlaceholder="توضیحات و نام طرف اعتبار"
              items={creditEntries}
              onChange={setCreditEntries}
              accentColor="#f59e0b"
              badgeText="توضیح + مبلغ"
            />

            <RepeatableEntryList
              title="فروش کارت به کارت"
              labelPlaceholder="توضیحات و نام واریزکننده / شماره پیگیری"
              items={cardToCardEntries}
              onChange={setCardToCardEntries}
              accentColor="#06b6d4"
              badgeText="توضیح + مبلغ"
            />

            <RepeatableEntryList
              title="کسری‌های شناخته‌شده"
              labelPlaceholder="علت کسری (مثلاً هدیه/تخفیف ثبت نشده)"
              items={shortageEntries}
              onChange={setShortageEntries}
              accentColor="#ef4444"
              badgeText="کسری قبلی"
            />

            <RepeatableEntryList
              title="اضافه‌های شناخته‌شده"
              labelPlaceholder="علت اضافه (مثلاً واریزی بدون فاکتور)"
              items={surplusEntries}
              onChange={setSurplusEntries}
              accentColor="#10b981"
              badgeText="اضافه قبلی"
            />
          </div>

          {/* Shift Notes Section */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.25rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <FileText size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
                توضیحات و ملاحظات شیفت
              </h3>
            </div>
            <textarea
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              disabled={shiftStatus === 'locked'}
              placeholder="توضیحات کامل درباره اتفاقات شیفت، علل کسری/اضافه، رویدادها یا ملاحظات صندوق..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '0.925rem',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Live Calculation Summary Banner */}
          <ShiftCalculationSummary calculation={calculationResult} />

          {/* Action Buttons: Save and Lock */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              {shiftStatus === 'locked' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  background: 'rgba(148, 163, 184, 0.15)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}>
                  <Lock size={16} />
                  <span>این شیفت قفل شده است و امکان تغییر ندارد.</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {shiftId && shiftStatus !== 'locked' && (
                <button
                  type="button"
                  onClick={handleLockCurrentShift}
                  disabled={isLocking || isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.95rem 1.5rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '14px',
                    color: '#f87171',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: (isLocking || isSubmitting) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Lock size={18} />
                  <span>{isLocking ? 'در حال قفل کردن...' : 'قفل کردن نهایی این شیفت'}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || shiftStatus === 'locked'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.95rem 2.5rem',
                  background: shiftStatus === 'locked' ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: (isSubmitting || shiftStatus === 'locked') ? 'not-allowed' : 'pointer',
                  boxShadow: shiftStatus === 'locked' ? 'none' : '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <Save size={20} />
                <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت و ذخیره نهایی شیفت (Ctrl+S)'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '3rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.8rem',
      }}>
        سیستم حسابداری کافه گرن — طراحی و توسعه توسط امیرمحمد بهارلو | شماره پشتیبانی: 09384857722 — نسخه برنامه 1.0.3
      </footer>
    </div>
  );
}
