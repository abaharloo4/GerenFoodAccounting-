import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Phone, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Footer from '../components/Footer';

export default function Login() {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber.trim()) {
      setError('لطفاً شماره تماس را وارد کنید');
      return;
    }
    if (!password) {
      setError('لطفاً رمز عبور را وارد کنید');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(phoneNumber.trim(), password);
      if (!res.success) {
        setError(res.error || 'خطا در ورود به سیستم');
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err?.message ? `خطا در برقراری ارتباط: ${err.message}` : 'خطایی در ارتباط با برنامه رخ داد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #12090b 0%, #2b1217 50%, #12090b 100%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(34, 18, 22, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(234, 210, 214, 0.15)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.5)',
            border: '2px solid rgba(99, 102, 241, 0.4)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '2rem',
            fontFamily: 'Segoe UI, sans-serif',
          }}>
            G
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fcf8f8', marginBottom: '0.3rem' }}>
            سیستم حسابداری گرن
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#ead2d6', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '0.4rem', direction: 'ltr' }}>
            GerenFoodAccounting
          </p>
          <p style={{ fontSize: '0.85rem', color: '#d4c5c7' }}>
            جهت تسویه شیفت یا مدیریت وارد حساب خود شوید
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>
              شماره تماس (نام کاربری)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="مثال: 09335760392"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.85rem 2.75rem 0.85rem 1rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
              />
              <Phone size={18} color="#64748b" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>
              رمز عبور
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
              />
              <Lock size={18} color="#64748b" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.3rem',
                }}
                title={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '0.95rem',
              background: 'linear-gradient(135deg, #9b152e 0%, #6e0f22 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 20px -5px rgba(155, 21, 46, 0.4)',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <LogIn size={20} />
            <span>{isSubmitting ? 'در حال بررسی...' : 'ورود به سیستم'}</span>
          </button>
        </form>

        <Footer style={{ marginTop: '2rem', borderTop: 'none', paddingTop: 0, paddingBottom: 0, fontSize: '0.775rem' }} />
      </div>
    </div>
  );
}
