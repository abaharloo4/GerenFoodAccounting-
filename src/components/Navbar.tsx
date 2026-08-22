import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import { Coffee, LogOut, User as UserIcon, Shield, KeyRound, Calendar, Clock } from 'lucide-react';
import { getTodayShamsi, getTehranLiveTime } from '../utils/dateUtils';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [liveDate, setLiveDate] = useState(getTodayShamsi());
  const [liveTime, setLiveTime] = useState(getTehranLiveTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveDate(getTodayShamsi());
      setLiveTime(getTehranLiveTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  return (
    <>
      <header style={{
        background: 'rgba(34, 18, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(234, 210, 214, 0.15)',
        padding: '0.85rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Brand logo & title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #9b152e 0%, #6e0f22 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(155, 21, 46, 0.4)',
          }}>
            <Coffee size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fcf8f8', margin: 0 }}>
              سیستم حسابداری گرن
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#ead2d6', fontWeight: 600, letterSpacing: '0.5px', direction: 'ltr', display: 'block' }}>
              GerenFoodAccounting
            </span>
          </div>
        </div>

        {/* Live Shamsi & Tehran Time Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '0.45rem 0.85rem',
          borderRadius: '12px',
          color: '#f8fafc',
          fontSize: '0.825rem',
          fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b' }}>
            <Calendar size={15} />
            <span>{liveDate}</span>
          </div>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8' }}>
            <Clock size={15} />
            <span>{liveTime}</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>تهران</span>
        </div>

        {/* User info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(30, 41, 59, 0.6)',
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {user.role === 'manager' ? (
              <Shield size={16} color="#818cf8" />
            ) : (
              <UserIcon size={16} color="#34d399" />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
              {user.full_name}
            </span>
            <span style={{
              fontSize: '0.725rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: user.role === 'manager' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: user.role === 'manager' ? '#818cf8' : '#34d399',
              fontWeight: 600,
            }}>
              {user.role === 'manager' ? 'مدیر' : 'حسابدار'}
            </span>
          </div>

          {/* Change password button */}
          <button
            onClick={() => setShowPasswordModal(true)}
            title="تغییر رمز عبور"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <KeyRound size={15} color="#fbbf24" />
            <span>تغییر رمز</span>
          </button>

          {/* Logout button */}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              padding: '0.5rem 0.9rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
