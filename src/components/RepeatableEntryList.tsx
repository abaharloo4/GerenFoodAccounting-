import { Plus, Trash2 } from 'lucide-react';

export interface EntryItem {
  id?: number;
  labelOrDesc: string;
  amount: number | string;
}

interface RepeatableEntryListProps {
  title: string;
  labelPlaceholder: string;
  items: EntryItem[];
  onChange: (items: EntryItem[]) => void;
  accentColor?: string;
  badgeText?: string;
}

export default function RepeatableEntryList({
  title,
  labelPlaceholder,
  items,
  onChange,
  accentColor = '#6366f1',
  badgeText,
}: RepeatableEntryListProps) {
  const handleAddItem = () => {
    onChange([...items, { labelOrDesc: '', amount: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleTextChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index].labelOrDesc = val;
    onChange(newItems);
  };

  const normalizeDigits = (str: string): string => {
    if (!str) return '';
    return str
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣۴٥٦٧٨٩'.indexOf(d).toString());
  };

  const handleAmountChange = (index: number, val: string) => {
    const normalized = normalizeDigits(val);
    const cleanDigits = normalized.replace(/[^\d]/g, '');
    const newItems = [...items];
    newItems[index].amount = cleanDigits ? Number(cleanDigits) : '';
    onChange(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('fa-IR');
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '8px',
            height: '18px',
            borderRadius: '4px',
            background: accentColor,
          }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
            {title}
          </h3>
          {badgeText && (
            <span style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
            }}>
              {badgeText}
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.9rem', color: accentColor, fontWeight: 700 }}>
          مجموع: {formatCurrency(calculateTotal())} ریال
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={labelPlaceholder}
              value={item.labelOrDesc}
              onChange={(e) => handleTextChange(index, e.target.value)}
              style={{
                flex: 2,
                padding: '0.75rem 1rem',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="text"
              placeholder="مبلغ (ریال)"
              value={item.amount}
              onChange={(e) => handleAmountChange(index, e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                textAlign: 'left',
                direction: 'ltr',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => handleRemoveItem(index)}
              style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
            هیچ رکوردی ثبت نشده است. جهت افزودن رو دکمه زیر کلیک کنید.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddItem}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.65rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px stroke rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          color: '#cbd5e1',
          fontSize: '0.875rem',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <Plus size={16} />
        <span>افزودن سطر جدید</span>
      </button>
    </div>
  );
}
