import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import ShiftEntryForm from './ShiftEntryForm';
import type { ShiftFullRecord } from '../../electron/services/shift.service';
import { PlusCircle, History, Clock, RefreshCw, CheckCircle2, Lock, Pencil, Sun, Moon, AlertTriangle, User, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayShamsi } from '../utils/dateUtils';
import { apiBridge } from '../services/apiBridge';
import SystemConfirmModal from '../components/SystemConfirmModal';
import Footer from '../components/Footer';

interface ShiftRecord {
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

function formatCurrency(val: number): string {
  if (!val && val !== 0) return '۰';
  return Math.abs(val).toLocaleString('fa-IR');
}

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'home' | 'shiftForm'>('home');
  const [editingShift, setEditingShift] = useState<{ date: string; type: 'morning' | 'evening' } | null>(null);
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'evening' | null>(null);
  const [takenByOthers, setTakenByOthers] = useState<string[]>([]);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);

  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);

  // Pagination state
  const [shiftPage, setShiftPage] = useState<number>(1);
  const SHIFTS_PER_PAGE = 10;

  const totalShiftPages = useMemo(() => {
    return Math.ceil(shifts.length / SHIFTS_PER_PAGE) || 1;
  }, [shifts]);

  const paginatedShifts = useMemo(() => {
    const start = (shiftPage - 1) * SHIFTS_PER_PAGE;
    return shifts.slice(start, start + SHIFTS_PER_PAGE);
  }, [shifts, shiftPage]);

  // Shift details modal state
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<ShiftFullRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDetailsModal) setShowDetailsModal(false);
        if (showShiftModal) setShowShiftModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetailsModal, showShiftModal]);

  const handleViewShiftDetails = async (shiftId: number) => {
    setIsLoadingDetails(true);
    try {
      const res = await apiBridge.getShiftDetails(shiftId);
      if (res.success && res.shift) {
        setSelectedShiftDetails(res.shift);
        setShowDetailsModal(true);
      } else {
        alert(res.error || 'خطا در دریافت جزئیات شیفت');
      }
    } catch {
      alert('خطا در برقراری ارتباط با دیتابیس جهت دریافت جزئیات شیفت');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const todayShamsi = getTodayShamsi();

  const loadShifts = useCallback(async () => {
    if (!user) return;
    setIsLoadingShifts(true);
    try {
      const res = await apiBridge.getAccountantShifts(user.id);
      if (res.success && res.shifts) {
        setShifts(res.shifts);
        const todayShift = res.shifts.find((s: ShiftRecord) => s.shift_date_shamsi === todayShamsi);
        if (todayShift) {
          setSelectedShiftType(todayShift.shift_type);
          setShowShiftModal(false);
        }
      }

      const todayStatus = await apiBridge.getTodayShift(user.id, todayShamsi, 'morning');
      if (todayStatus.takenByOthers) {
        setTakenByOthers(todayStatus.takenByOthers);
      }
      if (todayStatus.existingShiftType) {
        setSelectedShiftType(todayStatus.existingShiftType);
        setShowShiftModal(false);
      } else {
        setSelectedShiftType(null);
        setShowShiftModal(true);
      }
    } catch (err) {
      console.error('Error loading shifts:', err);
      setShowShiftModal(true);
    } finally {
      setIsLoadingShifts(false);
    }
  }, [user, todayShamsi]);

  useEffect(() => {
    if (activeView === 'home') {
      loadShifts();
    }
  }, [activeView, loadShifts]);

  // System Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleLockShift = (shiftId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأیید قفل کردن شیفت',
      message: 'آیا از قفل کردن این شیفت اطمینان دارید؟ پس از قفل شدن، دیگر امکان ویرایش داده‌های این شیفت را نخواهید داشت.',
      variant: 'warning',
      confirmText: 'قفل کردن نهایی',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          const res = await apiBridge.lockShift(shiftId);
          if (res.success) {
            loadShifts();
          } else {
            alert(res.error || 'خطا در قفل کردن شیفت');
          }
        } catch {
          alert('خطا در ارتباط با سرور جهت قفل شیفت');
        }
      },
    });
  };

  const handleSelectShiftType = (type: 'morning' | 'evening') => {
    if (takenByOthers.includes(type)) {
      setConfirmModal({
        isOpen: true,
        title: 'شیفت غیرقابل انتخاب',
        message: `شیفت ${type === 'morning' ? 'صبح' : 'عصر'} امروز قبلاً توسط حسابدار دیگری ثبت شده است.`,
        variant: 'warning',
        confirmText: 'متوجه شدم',
        onConfirm: () => closeConfirmModal(),
      });
      return;
    }
    setSelectedShiftType(type);
    setShowShiftModal(false);
    setEditingShift({ date: todayShamsi, type });
    setActiveView('shiftForm');
  };

  const handleOpenShiftForm = () => {
    if (!selectedShiftType) {
      setShowShiftModal(true);
    } else {
      setEditingShift({ date: todayShamsi, type: selectedShiftType });
      setActiveView('shiftForm');
    }
  };

  if (activeView === 'shiftForm') {
    return (
      <ShiftEntryForm
        initialDateShamsi={editingShift?.date || todayShamsi}
        initialShiftType={editingShift?.type || selectedShiftType || 'morning'}
        onBack={() => {
          setEditingShift(null);
          setActiveView('home');
        }}
      />
    );
  }

  const isMorningTaken = takenByOthers.includes('morning');
  const isEveningTaken = takenByOthers.includes('evening');

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {showShiftModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '2.5rem',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #9b152e 0%, #6e0f22 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(155, 21, 46, 0.5)',
            }}>
              <Clock size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.4rem' }}>
              انتخاب شیفت کاری امروز
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              حسابدار محترم؛ <strong>{user?.full_name}</strong>
            </p>
            <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1.75rem' }}>
              تاریخ امروز: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{todayShamsi}</span>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => handleSelectShiftType('morning')}
                disabled={isMorningTaken}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.5rem 1rem',
                  background: isMorningTaken ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.12)',
                  border: `2px solid ${isMorningTaken ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.4)'}`,
                  borderRadius: '16px',
                  color: isMorningTaken ? '#78716c' : '#fbbf24',
                  cursor: isMorningTaken ? 'not-allowed' : 'pointer',
                  opacity: isMorningTaken ? 0.5 : 1,
                  fontSize: '1rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                <Sun size={36} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                  <span>شیفت صبح</span>
                  {isMorningTaken && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>(ثبت‌شده توسط حسابدار دیگر)</span>}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectShiftType('evening')}
                disabled={isEveningTaken}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.5rem 1rem',
                  background: isEveningTaken ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.12)',
                  border: `2px solid ${isEveningTaken ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.4)'}`,
                  borderRadius: '16px',
                  color: isEveningTaken ? '#64748b' : '#818cf8',
                  cursor: isEveningTaken ? 'not-allowed' : 'pointer',
                  opacity: isEveningTaken ? 0.5 : 1,
                  fontSize: '1rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                <Moon size={36} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                  <span>شیفت عصر</span>
                  {isEveningTaken && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>(ثبت‌شده توسط حسابدار دیگر)</span>}
                </div>
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#94a3b8',
              fontSize: '0.8rem',
              lineHeight: '1.5',
            }}>
              <AlertTriangle size={15} color="#f59e0b" />
              <span>پس از ثبت فرم تسویه، شیفت امروز شما بر روی این حالت تثبیت خواهد شد.</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <User size={22} color="#6366f1" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              خوش آمدید، {user?.full_name}
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.925rem' }}>
            پنل ثبت و تسویه شیفت‌های روزانه کافه — تاریخ امروز: {todayShamsi}
            {selectedShiftType && (
              <span style={{
                marginRight: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.775rem',
                fontWeight: 600,
                background: selectedShiftType === 'morning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: selectedShiftType === 'morning' ? '#f59e0b' : '#818cf8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                {selectedShiftType === 'morning' ? <Sun size={14} /> : <Moon size={14} />}
                <span>شیفت امروز: {selectedShiftType === 'morning' ? 'صبح' : 'عصر'}</span>
              </span>
            )}
          </p>
        </div>

        <button
          onClick={handleOpenShiftForm}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.5rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
          }}
        >
          <PlusCircle size={20} />
          <span>ثبت / ویرایش شیفت امروز</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', color: '#818cf8' }}>
                <Clock size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>تسویه شیفت امروز</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              جهت ورود اطلاعات فروش سیستم، نقد، پوزها، اعتباری‌ها و محاسبه زنده کسری/اضافه صندوق روی دکمه زیر کلیک کنید.
            </p>
          </div>

          <button
            onClick={handleOpenShiftForm}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            ورود به فرم تسویه شیفت
          </button>
        </div>

        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: '#34d399' }}>
              <History size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>خلاصه وضعیت</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>تعداد کل شیفت‌های ثبت‌شده:</span>
              <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem' }}>{shifts.length.toLocaleString('fa-IR')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>شیفت‌های قفل‌شده:</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{shifts.filter(s => s.status === 'locked').length.toLocaleString('fa-IR')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>شیفت‌های باز:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{shifts.filter(s => s.status !== 'locked').length.toLocaleString('fa-IR')}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '10px', color: '#f59e0b' }}>
              <History size={20} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>سوابق شیفت‌های شما</h2>
          </div>
          <button
            onClick={loadShifts}
            disabled={isLoadingShifts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              color: '#818cf8',
              cursor: isLoadingShifts ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.825rem',
            }}
          >
            <RefreshCw size={14} style={{ animation: isLoadingShifts ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isLoadingShifts ? 'در حال بارگذاری...' : 'بروزرسانی'}</span>
          </button>
        </div>

        {isLoadingShifts && shifts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            در حال بارگذاری سوابق شیفت‌ها...
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            هنوز هیچ شیفتی ثبت نشده است. از دکمه بالا اقدام به ثبت اولین شیفت خود نمایید.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.825rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>تاریخ</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>شیفت</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>فروش سیستم</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>نقد</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>فروش پوز</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>اعتباری</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>کارت به کارت</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>کسری/اضافه ناشناخته</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>وضعیت</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShifts.map((s) => {
                  const isShortage = s.unknown_remainder < 0;
                  const isSurplus = s.unknown_remainder > 0;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.875rem' }}>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#f8fafc', fontWeight: 600 }}>{s.shift_date_shamsi}</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: s.shift_type === 'morning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: s.shift_type === 'morning' ? '#f59e0b' : '#818cf8',
                        }}>
                          {s.shift_type === 'morning' ? 'صبح' : 'عصر'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#f8fafc' }}>{formatCurrency(s.system_sales)}</td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{formatCurrency(s.cash_amount)}</td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{formatCurrency(s.total_pos)}</td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{formatCurrency(s.total_credit)}</td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{formatCurrency(s.total_card_to_card)}</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: isShortage ? 'rgba(239, 68, 68, 0.15)' : isSurplus ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: isShortage ? '#f87171' : isSurplus ? '#34d399' : '#818cf8',
                          border: `1px solid ${isShortage ? 'rgba(239, 68, 68, 0.3)' : isSurplus ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                        }}>
                          {isShortage ? '-' : isSurplus ? '+' : ''}{formatCurrency(s.unknown_remainder)} ریال
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.775rem',
                          color: s.status === 'locked' ? '#94a3b8' : '#34d399',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}>
                          {s.status === 'locked' ? <Lock size={12} /> : <CheckCircle2 size={12} />}
                          {s.status === 'locked' ? 'قفل‌شده' : 'ثبت‌شده'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleViewShiftDetails(s.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.35rem 0.65rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              borderRadius: '6px',
                              color: '#818cf8',
                              cursor: 'pointer',
                              fontSize: '0.775rem',
                              fontWeight: 600,
                            }}
                            title="مشاهده جزئیات کامل شیفت"
                          >
                            <Eye size={13} />
                            <span>مشاهده</span>
                          </button>

                          {s.status !== 'locked' && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingShift({ date: s.shift_date_shamsi, type: s.shift_type });
                                  setActiveView('shiftForm');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.65rem',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '6px',
                                  color: '#34d399',
                                  cursor: 'pointer',
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                }}
                                title="ویرایش این شیفت"
                              >
                                <Pencil size={13} />
                                <span>ویرایش</span>
                              </button>

                              <button
                                onClick={() => handleLockShift(s.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.65rem',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                }}
                                title="قفل کردن این شیفت"
                              >
                                <Lock size={13} />
                                <span>قفل کردن</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Shifts Pagination Controls */}
          {totalShiftPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                صفحه <strong style={{ color: '#f8fafc' }}>{shiftPage}</strong> از <strong style={{ color: '#f8fafc' }}>{totalShiftPages}</strong> (مجموع <strong style={{ color: '#818cf8' }}>{shifts.length}</strong> شیفت)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setShiftPage((p) => Math.max(p - 1, 1))}
                  disabled={shiftPage === 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.4rem 0.8rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: shiftPage === 1 ? '#475569' : '#f8fafc',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: shiftPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={16} />
                  <span>قبلی</span>
                </button>

                {Array.from({ length: totalShiftPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalShiftPages || Math.abs(p - shiftPage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {prev && p - prev > 1 && (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShiftPage(p)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            border: p === shiftPage ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: p === shiftPage ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                            color: p === shiftPage ? '#818cf8' : '#f8fafc',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setShiftPage((p) => Math.min(p + 1, totalShiftPages))}
                  disabled={shiftPage === totalShiftPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.4rem 0.8rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: shiftPage === totalShiftPages ? '#475569' : '#f8fafc',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: shiftPage === totalShiftPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>بعدی</span>
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* Footer */}
    <Footer />

      {/* Modal: View Full Shift Details */}
      {showDetailsModal && selectedShiftDetails && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '780px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '14px', color: '#818cf8' }}>
                  <Eye size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    جزئیات کامل مالـی شیفت #{selectedShiftDetails.id}
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    تاریخ: {selectedShiftDetails.shift_date_shamsi} — حسابدار ثبت‌کننده: {selectedShiftDetails.accountant_name || user?.full_name || 'شما'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Status Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1.25rem', borderRadius: '12px', flex: 1, minWidth: '160px' }}>
                <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>نوع شیفت</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: selectedShiftDetails.shift_type === 'morning' ? '#f59e0b' : '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {selectedShiftDetails.shift_type === 'morning' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{selectedShiftDetails.shift_type === 'morning' ? 'صبح' : 'عصر'}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1.25rem', borderRadius: '12px', flex: 1, minWidth: '160px' }}>
                <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>وضعیت شیفت</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: selectedShiftDetails.status === 'locked' ? '#94a3b8' : '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {selectedShiftDetails.status === 'locked' ? <Lock size={16} /> : <CheckCircle2 size={16} />}
                  <span>{selectedShiftDetails.status === 'locked' ? 'قفل‌شده' : 'ثبت‌شده (باز)'}</span>
                </div>
              </div>
            </div>

            {/* Core Sales Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: '#818cf8', marginBottom: '0.3rem' }}>فروش سیستم (فاکتورها)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  {formatCurrency(selectedShiftDetails.system_sales)} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>ریال</span>
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: '#34d399', marginBottom: '0.3rem' }}>مبلغ نقد موجود در صندوق</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  {formatCurrency(selectedShiftDetails.cash_amount)} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>ریال</span>
                </div>
              </div>
            </div>

            {/* Detailed Lists Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* POS Entries */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>فروش دستگاه‌های کارتخوان (پوز)</span>
                  <span>مجموع: {formatCurrency((selectedShiftDetails.pos_entries || []).reduce((a, b) => a + b.amount, 0))} ریال</span>
                </div>
                {(!selectedShiftDetails.pos_entries || selectedShiftDetails.pos_entries.length === 0) ? (
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>هیچ ورودی پوزی ثبت نشده است.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedShiftDetails.pos_entries.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{p.pos_label || `پوز شماره ${idx + 1}`}</span>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatCurrency(p.amount)} ریال</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Credit Entries */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>فروش‌های اعتباری (دفتری)</span>
                  <span>مجموع: {formatCurrency((selectedShiftDetails.credit_entries || []).reduce((a, b) => a + b.amount, 0))} ریال</span>
                </div>
                {(!selectedShiftDetails.credit_entries || selectedShiftDetails.credit_entries.length === 0) ? (
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>هیچ فروش اعتباری ثبت نشده است.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedShiftDetails.credit_entries.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{c.description || 'بابت اعتبار'}</span>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatCurrency(c.amount)} ریال</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card to Card Entries */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#06b6d4', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>فروش کارت به کارت</span>
                  <span>مجموع: {formatCurrency((selectedShiftDetails.card_to_card_entries || []).reduce((a, b) => a + b.amount, 0))} ریال</span>
                </div>
                {(!selectedShiftDetails.card_to_card_entries || selectedShiftDetails.card_to_card_entries.length === 0) ? (
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>هیچ واریزی کارت به کارت ثبت نشده است.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedShiftDetails.card_to_card_entries.map((cc, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{cc.description || 'واریز کارت به کارت'}</span>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatCurrency(cc.amount)} ریال</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Known Shortages */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>کسری‌های شناخته‌شده</span>
                  <span>مجموع: {formatCurrency((selectedShiftDetails.shortage_entries || []).reduce((a, b) => a + b.amount, 0))} ریال</span>
                </div>
                {(!selectedShiftDetails.shortage_entries || selectedShiftDetails.shortage_entries.length === 0) ? (
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>هیچ کسری شناخته‌شده‌ای ثبت نشده است.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedShiftDetails.shortage_entries.map((sh, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{sh.description || 'علت کسری'}</span>
                        <span style={{ color: '#f87171', fontWeight: 600 }}>{formatCurrency(sh.amount)} ریال</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Known Surpluses */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>اضافه‌های شناخته‌شده</span>
                  <span>مجموع: {formatCurrency((selectedShiftDetails.surplus_entries || []).reduce((a, b) => a + b.amount, 0))} ریال</span>
                </div>
                {(!selectedShiftDetails.surplus_entries || selectedShiftDetails.surplus_entries.length === 0) ? (
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>هیچ اضافه شناخته‌شده‌ای ثبت نشده است.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedShiftDetails.surplus_entries.map((su, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{su.description || 'علت اضافه'}</span>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(su.amount)} ریال</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Close Modal Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* System Confirm Modal */}
      <SystemConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}

