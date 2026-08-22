import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import jalaali from 'jalaali-js';
import { Calendar, ChevronRight, ChevronLeft, Check, X, RotateCcw } from 'lucide-react';
import { getTodayShamsi } from '../utils/dateUtils';

const SHAMSI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEKDAY_NAMES = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

interface ShamsiDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // Format: YYYY/MM/DD
  onSelectDate: (dateStr: string) => void;
  title?: string;
}

export function ShamsiDatePickerModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'انتخاب تاریخ شمسی',
}: ShamsiDatePickerModalProps) {
  // Parse initial date or default to today
  const todayStr = getTodayShamsi();
  const parseParts = (str: string) => {
    const parts = (str || todayStr).split('/');
    if (parts.length === 3) {
      const jy = parseInt(parts[0], 10);
      const jm = parseInt(parts[1], 10);
      const jd = parseInt(parts[2], 10);
      if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
        return { jy, jm, jd };
      }
    }
    const todayParts = todayStr.split('/');
    return {
      jy: parseInt(todayParts[0], 10),
      jm: parseInt(todayParts[1], 10),
      jd: parseInt(todayParts[2], 10),
    };
  };

  const initialParsed = parseParts(selectedDate);
  const [year, setYear] = useState<number>(initialParsed.jy);
  const [month, setMonth] = useState<number>(initialParsed.jm); // 1 - 12
  const [day, setDay] = useState<number>(initialParsed.jd);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseParts(selectedDate);
      setYear(parsed.jy);
      setMonth(parsed.jm);
      setDay(parsed.jd);
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate days grid for current year and month
  const calendarGrid = useMemo(() => {
    const monthLength = jalaali.jalaaliMonthLength(year, month);
    const g1 = jalaali.toGregorian(year, month, 1);
    const d1 = new Date(g1.gy, g1.gm - 1, g1.gd);
    // Saturday = 0, Sunday = 1, ..., Friday = 6
    const firstWeekdayIndex = (d1.getDay() + 1) % 7;

    const days: Array<{ dayNumber: number | null; isSelected: boolean; isToday: boolean }> = [];

    // Empty padding cells before 1st of month
    for (let i = 0; i < firstWeekdayIndex; i++) {
      days.push({ dayNumber: null, isSelected: false, isToday: false });
    }

    const todayParsed = parseParts(todayStr);

    for (let d = 1; d <= monthLength; d++) {
      const isSelected = year === initialParsed.jy && month === initialParsed.jm && d === day;
      const isToday = year === todayParsed.jy && month === todayParsed.jm && d === todayParsed.jd;
      days.push({ dayNumber: d, isSelected, isToday });
    }

    return days;
  }, [year, month, day, selectedDate, todayStr]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleSelectToday = () => {
    const todayParts = parseParts(todayStr);
    setYear(todayParts.jy);
    setMonth(todayParts.jm);
    setDay(todayParts.jd);
    const formatted = `${todayParts.jy}/${String(todayParts.jm).padStart(2, '0')}/${String(todayParts.jd).padStart(2, '0')}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleConfirm = () => {
    const formatted = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    onSelectDate(formatted);
    onClose();
  };

  // Year quick selector range
  const currentTodayYear = parseParts(todayStr).jy;
  const yearsList = [];
  for (let y = currentTodayYear - 5; y <= currentTodayYear + 5; y++) {
    yearsList.push(y);
  }

  const modalNode = (
    <div
      style={{
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
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '24px',
          padding: '1.75rem',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          color: '#f8fafc',
          direction: 'rtl',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={22} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Year & Month Selection Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.6rem 0.85rem',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            onClick={handlePrevMonth}
            title="ماه قبلی"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: '#f8fafc',
              padding: '0.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Month Select */}
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '0.35rem 0.6rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {SHAMSI_MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '0.35rem 0.6rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            title="ماه بعدی"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: '#f8fafc',
              padding: '0.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ marginBottom: '1.25rem' }}>
          {/* Weekday Names Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.25rem',
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            {WEEKDAY_NAMES.map((w, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: idx === 6 ? '#f87171' : '#94a3b8',
                  padding: '0.25rem 0',
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days Cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.35rem',
              textAlign: 'center',
            }}
          >
            {calendarGrid.map((item, idx) => {
              if (item.dayNumber === null) {
                return <div key={`empty-${idx}`} style={{ padding: '0.5rem' }} />;
              }

              const isChosen = item.dayNumber === day;

              return (
                <button
                  key={idx}
                  onClick={() => setDay(item.dayNumber!)}
                  style={{
                    padding: '0.5rem 0.2rem',
                    borderRadius: '10px',
                    border: item.isToday
                      ? '1px solid #38bdf8'
                      : isChosen
                      ? '1px solid #10b981'
                      : '1px solid transparent',
                    background: isChosen
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : item.isToday
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isChosen ? '#ffffff' : item.isToday ? '#38bdf8' : '#f8fafc',
                    fontWeight: isChosen || item.isToday ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Summary & Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleSelectToday}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              color: '#38bdf8',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>انتخاب امروز</span>
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={handleConfirm}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Check size={16} />
              <span>تأیید تاریخ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}

interface ShamsiDatePickerInputProps {
  value: string;
  onChange: (newDateStr: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
}

export function ShamsiDatePickerInput({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  disabled = false,
  title = 'انتخاب تاریخ شمسی',
  style,
}: ShamsiDatePickerInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', ...style }}>
      {label && (
        <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
          {label}
        </label>
      )}

      <div
        onClick={() => {
          if (!disabled) setIsModalOpen(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.7rem 1rem',
          background: disabled ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          color: value ? '#f8fafc' : '#64748b',
          fontSize: '0.925rem',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{value || placeholder}</span>
        <Calendar size={18} color={disabled ? '#64748b' : '#38bdf8'} />
      </div>

      <ShamsiDatePickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={value}
        onSelectDate={onChange}
        title={title}
      />
    </div>
  );
}
