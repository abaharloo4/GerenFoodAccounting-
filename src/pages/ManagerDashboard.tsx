import { useState, useEffect, useMemo, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types/user';
import type { ShiftReportItem } from '../../electron/services/report.service';
import type { ShiftFullRecord } from '../../electron/services/shift.service';
import type { AuditLogItem } from '../../electron/services/backup.service';
import { UpdateInfo, DownloadProgress, GITHUB_REPO_URL, GITHUB_OWNER, GITHUB_REPO } from '../types/update';
import ChangePasswordModal from '../components/ChangePasswordModal';
import SystemConfirmModal from '../components/SystemConfirmModal';
import { apiBridge } from '../services/apiBridge';
import { formatToShamsiDateTime } from '../utils/dateUtils';
import { ShamsiDatePickerInput } from '../components/ShamsiDatePickerModal';
import Footer from '../components/Footer';
import {
  Users,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Phone,
  Lock,
  User as UserIcon,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Lock as LockIcon,
  Filter,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Scale,
  Database,
  HardDriveDownload,
  Activity,
  KeyRound,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Server,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  ExternalLink,
  Sparkles,
  Github,
  ArrowUpCircle,
  Download,
} from 'lucide-react';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'shifts' | 'reports' | 'backup' | 'db' | 'update'>('shifts');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Edit user state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [, setEditShiftAssignment] = useState<'morning' | 'evening' | 'both'>('both');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);

  // New user form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Shifts & Reports state
  const [shifts, setShifts] = useState<ShiftReportItem[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterShiftType, setFilterShiftType] = useState<'all' | 'morning' | 'evening'>('all');
  const [filterAccountantId, setFilterAccountantId] = useState<number | undefined>(undefined);

  // Shifts Monitoring Pagination State
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
        if (editingUserId) setEditingUserId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetailsModal, editingUserId]);

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

  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Backup & Audit Log & DB Config state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Audit Log Pagination State
  const [auditPage, setAuditPage] = useState<number>(1);
  const AUDIT_PER_PAGE = 10;

  const totalAuditPages = useMemo(() => {
    return Math.ceil(auditLogs.length / AUDIT_PER_PAGE) || 1;
  }, [auditLogs]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PER_PAGE;
    return auditLogs.slice(start, start + AUDIT_PER_PAGE);
  }, [auditLogs, auditPage]);

  // MySQL DB Config state
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('cafe_cash_db');
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestMessage, setDbTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GitHub Auto-Update state
  const [currentAppVersion, setCurrentAppVersion] = useState<string>('...');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState<boolean>(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hasCheckedOnce, setHasCheckedOnce] = useState<boolean>(false);

  useEffect(() => {
    apiBridge.getAppVersion().then((v) => {
      if (v) setCurrentAppVersion(v);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = apiBridge.onUpdateProgress((progress) => {
      setDownloadProgress(progress);
    });
    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    const res = await apiBridge.getAllUsers();
    if (res.success && res.users) {
      setUsers(res.users as User[]);
    } else if (res.error) {
      console.error('Failed to fetch users:', res.error);
    }
    setIsLoadingUsers(false);
  };

  const fetchShifts = async () => {
    setIsLoadingShifts(true);
    setShiftPage(1);
    const res = await apiBridge.getShiftsReport({
      startDateShamsi: filterStartDate || undefined,
      endDateShamsi: filterEndDate || undefined,
      shiftType: filterShiftType,
      accountantId: filterAccountantId,
    });
    if (res.success && res.shifts) {
      setShifts(res.shifts);
    }
    setIsLoadingShifts(false);
  };

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    setAuditPage(1);
    const res = await apiBridge.getAuditLogs();
    if (res.success && res.logs) {
      setAuditLogs(res.logs);
    }
    setIsLoadingLogs(false);
  };

  const fetchDbConfig = async () => {
    const res = await apiBridge.getDbConfig();
    if (res.success && res.config) {
      setDbHost(res.config.host || 'localhost');
      setDbPort(String(res.config.port || 3306));
      setDbUser(res.config.user ?? 'root');
      setDbPassword(res.config.password ?? '');
      setDbName(res.config.database || 'cafe_cash_db');
    }
  };

  const handleUpdateDbConfig = async (e: FormEvent) => {
    e.preventDefault();
    setDbTestMessage(null);
    setIsTestingDb(true);

    try {
      const res = await apiBridge.updateDbConfig({
        host: dbHost.trim(),
        port: Number(dbPort) || 3306,
        user: dbUser.trim(),
        password: dbPassword,
        database: dbName.trim(),
      });
      if (res.success) {
        setDbTestMessage({ type: 'success', text: res.message || 'اتصال واقعی به دیتابیس MySQL با موفقیت برقرار شد.' });
        fetchUsers();
        fetchShifts();
        fetchAuditLogs();
      } else {
        setDbTestMessage({ type: 'error', text: res.error || 'خطا در اتصال واقعی به دیتابیس MySQL' });
      }
    } catch {
      setDbTestMessage({ type: 'error', text: 'خطایی در تست اتصال به MySQL رخ داد.' });
    } finally {
      setIsTestingDb(false);
    }
  };

  useEffect(() => {
    fetchDbConfig();
    fetchUsers();
    fetchShifts();
    fetchAuditLogs();
  }, []);

  const handleOpenEditModal = (userItem: User) => {
    setEditingUserId(userItem.id);
    setEditFullName(userItem.full_name);
    setEditPhoneNumber(userItem.phone_number);
    setEditShiftAssignment(userItem.shift_assignment || 'both');
    setEditPassword('');
    setEditFormError(null);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editingUserId || !editFullName.trim() || !editPhoneNumber.trim()) {
      setEditFormError('نام و شماره تماس الزامی هستند.');
      return;
    }

    setIsSubmittingEditUser(true);
    try {
      const res = await apiBridge.updateUser(editingUserId, {
        full_name: editFullName.trim(),
        phone_number: editPhoneNumber.trim(),
        shift_assignment: 'both',
        password: editPassword.trim() || undefined,
      });
      if (!res.success) {
        setEditFormError(res.error || 'خطا در ویرایش کاربر');
        return;
      }
      setShowEditModal(false);
      fetchUsers();
    } catch {
      setEditFormError('خطایی در سیستم رخ داد.');
    } finally {
      setIsSubmittingEditUser(false);
    }
  };

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

  const handleDeleteUser = (userItem: User) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأیید حذف حسابدار',
      message: `آیا از حذف حسابدار «${userItem.full_name}» اطمینان دارید؟`,
      variant: 'danger',
      confirmText: 'حذف حسابدار',
      onConfirm: async () => {
        closeConfirmModal();
        const res = await apiBridge.deleteUser(userItem.id);
        if (res.success) {
          fetchUsers();
        } else {
          alert(res.error || 'خطا در حذف کاربر');
        }
      },
    });
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!phoneNumber.trim() || !password || !fullName.trim()) {
      setFormError('تمام فیلدها الزامی هستند.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const res = await apiBridge.createUser({
        phone_number: phoneNumber.trim(),
        password,
        full_name: fullName.trim(),
        role: 'accountant',
        shift_assignment: 'both',
      });
      if (!res.success) {
        setFormError(res.error || 'خطا در تعریف کاربر');
        return;
      }
      setPhoneNumber('');
      setPassword('');
      setFullName('');
      setShowAddModal(false);
      fetchUsers();
    } catch {
      setFormError('خطایی در سیستم رخ داد');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserStatus = (userItem: User) => {
    const newStatus = userItem.is_active === 1 ? false : true;
    const actionText = newStatus ? 'فعال‌سازی' : 'غیرفعال‌سازی';
    setConfirmModal({
      isOpen: true,
      title: `تأیید ${actionText} حساب کاربری`,
      message: `آیا از ${actionText} حساب کاربری «${userItem.full_name}» اطمینان دارید؟`,
      variant: newStatus ? 'info' : 'warning',
      confirmText: actionText,
      onConfirm: async () => {
        closeConfirmModal();
        const res = await apiBridge.toggleUserStatus(userItem.id, newStatus);
        if (res.success) {
          fetchUsers();
        } else {
          alert(res.error || 'خطا در تغییر وضعیت کاربر');
        }
      },
    });
  };

  const handleLockShift = (shiftId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأیید قفل کردن شیفت',
      message: 'آیا از قفل کردن این شیفت اطمینان دارید؟ پس از قفل شدن، حسابدار دیگر امکان ویرایش داده‌های این شیفت را نخواهد داشت.',
      variant: 'warning',
      confirmText: 'قفل کردن نهایی',
      onConfirm: async () => {
        closeConfirmModal();
        const res = await apiBridge.lockShift(shiftId);
        if (res.success) {
          fetchShifts();
          fetchAuditLogs();
        } else {
          alert(res.error || 'خطا در قفل کردن شیفت');
        }
      },
    });
  };

  const handleUnlockShift = (shiftId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأیید باز کردن شیفت',
      message: 'آیا از باز کردن و خروج این شیفت از حالت قفل اطمینان دارید؟ حسابدار مجدداً امکان ویرایش آن را خواهد داشت.',
      variant: 'info',
      confirmText: 'باز کردن شیفت',
      onConfirm: async () => {
        closeConfirmModal();
        const res = await apiBridge.unlockShift(shiftId);
        if (res.success) {
          fetchShifts();
          fetchAuditLogs();
        } else {
          alert(res.error || 'خطا در باز کردن شیفت');
        }
      },
    });
  };

  const handleExportExcel = async () => {
    setExportMessage(null);
    const res = await apiBridge.exportShiftsToExcel({
      startDateShamsi: filterStartDate || undefined,
      endDateShamsi: filterEndDate || undefined,
      shiftType: filterShiftType,
      accountantId: filterAccountantId,
    });
    if (res.success) {
      setExportMessage(`فایل خروجی اکسل با موفقیت در مسیر زیر ذخیره شد:\n${res.filePath}`);
    } else if (res.error && res.error !== 'عملیات توسط کاربر لغو شد.') {
      setExportMessage(`خطا در ایجاد خروجی اکسل: ${res.error}`);
    }
  };

  const handleExportPDF = async () => {
    setExportMessage(null);
    const res = await apiBridge.exportShiftsToPDF({
      startDateShamsi: filterStartDate || undefined,
      endDateShamsi: filterEndDate || undefined,
      shiftType: filterShiftType,
      accountantId: filterAccountantId,
    });
    if (res.success) {
      setExportMessage(`فایل خروجی PDF با موفقیت در مسیر زیر ذخیره شد:\n${res.filePath}`);
    } else if (res.error && res.error !== 'عملیات توسط کاربر لغو شد.') {
      setExportMessage(`خطا در ایجاد خروجی PDF: ${res.error}`);
    }
  };

  const handleCreateManualBackup = async () => {
    setBackupMessage(null);
    const res = await apiBridge.createManualBackup();
    if (res.success) {
      setBackupMessage(`نسخه پشتیبان دستی با موفقیت در مسیر زیر ذخیره شد:\n${res.filePath}`);
    } else if (res.error && res.error !== 'عملیات لغو شد.') {
      setBackupMessage(`خطا در پشتیبان‌گیری: ${res.error}`);
    }
  };

  // GitHub Auto-Update Handlers
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateMessage(null);
    try {
      const res = await apiBridge.checkForUpdates(currentAppVersion);
      setHasCheckedOnce(true);
      if (res.success && res.updateInfo) {
        setUpdateInfo(res.updateInfo);
        if (res.updateInfo.hasUpdate) {
          setUpdateMessage({
            type: 'info',
            text: `نسخه جدید ${res.updateInfo.latestVersion} منتشر شده است. می‌توانید آن را دانلود و نصب نمایید.`,
          });
        } else {
          setUpdateMessage({
            type: 'success',
            text: `سیستم شما به‌روز است (نسخه ${res.updateInfo.currentVersion}). آخرین نسخه پایدار نصب می‌باشد.`,
          });
        }
      } else {
        setUpdateMessage({
          type: 'error',
          text: res.error || 'خطا در ارتباط با سرور گیتهاب جهت بررسی نسخه جدید.',
        });
      }
    } catch (err: any) {
      setUpdateMessage({
        type: 'error',
        text: `خطایی رخ داد: ${err.message || ''}`,
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;
    if (!updateInfo.downloadUrl) {
      if (updateInfo.releasePageUrl) {
        apiBridge.openExternalUrl(updateInfo.releasePageUrl);
      }
      return;
    }

    setIsDownloadingUpdate(true);
    setDownloadedFilePath(null);
    setUpdateMessage({ type: 'info', text: 'در حال دانلود بسته به‌روزرسانی از گیتهاب...' });
    try {
      const res = await apiBridge.downloadUpdate(updateInfo.downloadUrl);
      if (res.success && res.filePath) {
        setDownloadedFilePath(res.filePath);
        setUpdateMessage({
          type: 'success',
          text: 'دانلود فایل نصاب با موفقیت پایان یافت. برای اعمال تغییرات، دکمه راه‌اندازی و نصب را بزنید.',
        });
      } else {
        setUpdateMessage({
          type: 'error',
          text: res.error || 'خطا در دانلود فایل به‌روزرسانی.',
        });
      }
    } catch (err: any) {
      setUpdateMessage({
        type: 'error',
        text: `خطا در دانلود: ${err.message || ''}`,
      });
    } finally {
      setIsDownloadingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!downloadedFilePath) return;
    setIsInstallingUpdate(true);
    setConfirmModal({
      isOpen: true,
      title: 'تأیید نصب و راه‌اندازی مجدد',
      message: 'برنامه برای نصب نسخه جدید بسته خواهد شد و نصاب اجرا می‌شود. آیا ادامه می‌دهید؟',
      variant: 'info',
      confirmText: 'نصب و اجرای نسخه جدید',
      onConfirm: async () => {
        closeConfirmModal();
        const res = await apiBridge.installUpdate(downloadedFilePath);
        if (!res.success) {
          alert(res.error || 'خطا در اجرای نصاب به‌روزرسانی');
          setIsInstallingUpdate(false);
        }
      },
    });
  };

  const handleOpenGitHub = (url?: string) => {
    const targetUrl = url || GITHUB_REPO_URL;
    apiBridge.openExternalUrl(targetUrl);
  };

  const formatCurrency = (val: number) => {
    return Math.abs(val).toLocaleString('fa-IR');
  };

  const totalSalesOverall = shifts.reduce((acc, s) => acc + s.system_sales, 0);
  
  const totalCashOverall = shifts.reduce((acc, s) => acc + s.cash_amount, 0);
  const totalPosOverall = shifts.reduce((acc, s) => acc + s.total_pos, 0);
  const totalCreditOverall = shifts.reduce((acc, s) => acc + s.total_credit, 0);
  const totalCardToCardOverall = shifts.reduce((acc, s) => acc + s.total_card_to_card, 0);
  const totalKnownShortageOverall = shifts.reduce((acc, s) => acc + s.total_known_shortage, 0);
  const totalKnownSurplusOverall = shifts.reduce((acc, s) => acc + s.total_known_surplus, 0);

  const accountantStats = useMemo(() => {
    const activeAccountants = users.filter(u => u.role === 'accountant' && u.is_active === 1);
    return activeAccountants.map(acc => {
      const accShifts = shifts.filter(s => s.accountant_id === acc.id);
      return {
        id: acc.id,
        name: acc.full_name,
        shiftCount: accShifts.length,
        totalSystemSales: accShifts.reduce((sum, s) => sum + s.system_sales, 0),
        totalShortage: accShifts.reduce((sum, s) => sum + (s.unknown_remainder < 0 ? Math.abs(s.unknown_remainder) : 0), 0),
        totalSurplus: accShifts.reduce((sum, s) => sum + (s.unknown_remainder > 0 ? s.unknown_remainder : 0), 0),
      };
    });
  }, [users, shifts]);


  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header Tabs Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.3rem' }}>
            داشبورد مدیریت و گزارش‌گیری
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            نظارت بر شیفت‌ها، قفل داده‌ها، مدیریت حسابداران صبح و عصر، پشتیبان‌گیری و تغییر رمز
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Quick Change Password button for Manager */}
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              color: '#fbbf24',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <KeyRound size={16} />
            <span>تغییر رمز عبور من</span>
          </button>

          {/* Tabs switcher */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.35rem',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <button
              onClick={() => setActiveTab('shifts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.95rem',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'shifts' ? '#6366f1' : 'transparent',
                color: activeTab === 'shifts' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <BarChart3 size={16} />
              <span>نظارت شیفت‌ها</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.95rem',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'users' ? '#6366f1' : 'transparent',
                color: activeTab === 'users' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <Users size={16} />
              <span>حسابداران</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.95rem',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'reports' ? '#10b981' : 'transparent',
                color: activeTab === 'reports' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <FileSpreadsheet size={16} />
              <span>گزارشها و آمار</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.95rem',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'backup' ? '#f59e0b' : 'transparent',
                color: activeTab === 'backup' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <Database size={16} />
              <span>پشتیبان‌گیری & Audit Log</span>
            </button>

            <button
              onClick={() => setActiveTab('db')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.95rem',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'db' ? '#06b6d4' : 'transparent',
                color: activeTab === 'db' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <Server size={16} />
              <span>تنظیمات دیتابیس</span>
            </button>

            <button
              onClick={() => setActiveTab('update')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.95rem',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: activeTab === 'update' ? 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)' : 'transparent',
                color: activeTab === 'update' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <CloudDownload size={16} />
              <span>آپدیت نرم‌افزار</span>
              {updateInfo?.hasUpdate && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f43f5e',
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  boxShadow: '0 0 8px #f43f5e',
                }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SHIFTS MONITORING & LOCKING */}
      {activeTab === 'shifts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Filters Bar */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 600 }}>
              <Filter size={18} />
              <span>فیلترها:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>از تاریخ:</span>
              <div style={{ width: '150px' }}>
                <ShamsiDatePickerInput
                  value={filterStartDate}
                  onChange={setFilterStartDate}
                  placeholder="از تاریخ..."
                  title="انتخاب تاریخ شروع گزارش"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>تا تاریخ:</span>
              <div style={{ width: '150px' }}>
                <ShamsiDatePickerInput
                  value={filterEndDate}
                  onChange={setFilterEndDate}
                  placeholder="تا تاریخ..."
                  title="انتخاب تاریخ پایان گزارش"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>حسابدار:</span>
              <select
                value={filterAccountantId || ''}
                onChange={(e) => setFilterAccountantId(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  padding: '0.5rem 0.8rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="">همه حسابداران</option>
                {users.filter(u => u.role === 'accountant').map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>نوع شیفت:</span>
              <select
                value={filterShiftType}
                onChange={(e) => setFilterShiftType(e.target.value as any)}
                style={{
                  padding: '0.5rem 0.8rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="all">همه شیفت‌ها</option>
                <option value="morning">شیفت صبح</option>
                <option value="evening">شیفت عصر</option>
              </select>
            </div>

            <button
              onClick={fetchShifts}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginRight: 'auto',
              }}
            >
              <RefreshCw size={14} />
              <span>اعمال فیلتر</span>
            </button>
          </div>

          {/* Shifts List Table */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.5rem',
          }}>
            {isLoadingShifts ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                در حال دریافت اطلاعات شیفت‌ها...
              </div>
            ) : shifts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                هیچ شیفتی متناظر با فیلترهای انتخابی یافت نشد.
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.825rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>تاریخ</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>شیفت</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>حسابدار</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>فروش سیستم</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>فروش پوز</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>نقد</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>کسری شناخته‌شده</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>باقی‌مانده ناشناخته</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>وضعیت</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedShifts.map((s) => {
                      const isShortage = s.unknown_remainder < 0;
                      const isSurplus = s.unknown_remainder > 0;
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.875rem' }}>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#f8fafc', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{s.shift_date_shamsi}</span>
                              {s.notes && (
                                <span title={`توضیحات: ${s.notes}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <FileText size={14} color="#38bdf8" />
                                </span>
                              )}
                            </div>
                          </td>
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
                          <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{s.accountant_name}</td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#f8fafc' }}>{formatCurrency(s.system_sales)}</td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{formatCurrency(s.total_pos)}</td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#cbd5e1' }}>{formatCurrency(s.cash_amount)}</td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#f87171' }}>{formatCurrency(s.total_known_shortage)}</td>
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
                              {s.status === 'locked' ? <LockIcon size={12} /> : <CheckCircle2 size={12} />}
                              {s.status === 'locked' ? 'قفل‌شده' : 'ثبت‌شده'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                onClick={() => handleViewShiftDetails(s.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.75rem',
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  color: '#818cf8',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                }}
                                title="مشاهده جزئیات کامل شیفت"
                              >
                                <Eye size={13} />
                                <span>مشاهده</span>
                              </button>

                              {s.status === 'locked' ? (
                                <button
                                  onClick={() => handleUnlockShift(s.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.35rem 0.75rem',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    color: '#34d399',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.775rem',
                                    fontWeight: 600,
                                  }}
                                  title="باز کردن این شیفت (خروج از حالت قفل)"
                                >
                                  <LockIcon size={13} />
                                  <span>باز کردن شیفت</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleLockShift(s.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.35rem 0.75rem',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.775rem',
                                    fontWeight: 600,
                                  }}
                                  title="قفل کردن این شیفت"
                                >
                                  <LockIcon size={13} />
                                  <span>قفل شیفت</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Shifts Monitoring Pagination Controls */}
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
      </div>
    )}

      {/* TAB 2: ACCOUNTANTS MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8fafc', fontWeight: 600 }}>
              <Users size={20} color="#818cf8" />
              <span>لیست حسابداران و مدیران ({users.length} نفر)</span>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.2rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={16} />
              <span>تعریف حسابدار جدید</span>
            </button>
          </div>

          {isLoadingUsers ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              در حال دریافت لیست کاربران...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>نام و نام خانوادگی</th>
                    <th style={{ padding: '0.75rem 1rem' }}>شماره تماس (نام کاربری)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>نقش</th>
                    <th style={{ padding: '0.75rem 1rem' }}>وضعیت</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.925rem' }}>
                      <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 500 }}>{item.full_name}</td>
                      <td style={{ padding: '1rem', color: '#cbd5e1' }}>{item.phone_number}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.3rem 0.7rem',
                          borderRadius: '6px',
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          background: item.role === 'manager' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: item.role === 'manager' ? '#818cf8' : '#34d399',
                        }}>
                          {item.role === 'manager' ? 'مدیر سیستم' : 'حسابدار'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.825rem',
                          color: item.is_active === 1 ? '#34d399' : '#f87171',
                        }}>
                          {item.is_active === 1 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {item.is_active === 1 ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="ویرایش مشخصات"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.75rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#818cf8',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}
                          >
                            <Pencil size={13} />
                            <span>ویرایش</span>
                          </button>

                          {item.role !== 'manager' && (
                            <>
                              <button
                                onClick={() => handleDeleteUser(item)}
                                title="حذف حسابدار"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.4rem 0.75rem',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                                }}
                              >
                                <Trash2 size={13} />
                                <span>حذف</span>
                              </button>

                              <button
                                onClick={() => handleToggleUserStatus(item)}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  background: item.is_active === 1 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  border: `1px solid ${item.is_active === 1 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                  color: item.is_active === 1 ? '#fbbf24' : '#34d399',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                                }}
                              >
                                {item.is_active === 1 ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REPORTS & EXCEL EXPORT */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Accountant Stats */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="#818cf8" />
              آمار حسابداران
              <span style={{ fontSize: '0.85rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '20px', marginRight: '0.5rem' }}>
                تعداد فعال: {accountantStats.length} نفر
              </span>
            </h2>
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '1rem',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'right', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>نام حسابدار</th>
                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>تعداد شیفت‌ها</th>
                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>فروش سیستم (ریال)</th>
                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>کسری ناشناخته (ریال)</th>
                    <th style={{ padding: '0.75rem', fontWeight: 600 }}>اضافی ناشناخته (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  {accountantStats.map((acc, idx) => (
                    <tr key={acc.id} style={{ borderBottom: idx === accountantStats.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.75rem', color: '#f8fafc', fontWeight: 600 }}>{acc.name}</td>
                      <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{acc.shiftCount}</td>
                      <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{formatCurrency(acc.totalSystemSales)}</td>
                      <td style={{ padding: '0.75rem', color: '#f87171' }}>{formatCurrency(acc.totalShortage)}</td>
                      <td style={{ padding: '0.75rem', color: '#34d399' }}>{formatCurrency(acc.totalSurplus)}</td>
                    </tr>
                  ))}
                  {accountantStats.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                        حسابدار فعالی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Overall Financial Stats */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} color="#10b981" />
              آمارگیری کلی مالی
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  <Scale size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>فروش سیستم</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalSalesOverall)}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <Scale size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>نقدها</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalCashOverall)}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Scale size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>کارت به کارت‌ها</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalCardToCardOverall)}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                  <Scale size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>اعتباری‌ها</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalCreditOverall)}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                  <TrendingDown size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>کسری‌های شناخته‌شده</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalKnownShortageOverall)}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>اضافات شناخته‌شده</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalKnownSurplusOverall)}</div>
                </div>
              </div>
              
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  <Scale size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>فروش کارتخوان</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>{formatCurrency(totalPosOverall)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Action Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
            }}>
              <FileSpreadsheet size={32} color="#ffffff" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              دریافت خروجی جامع گزارشات تسویه (فایل اکسل / PDF)
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '560px', lineHeight: '1.6' }}>
              می‌توانید گزارش کامل تسویه‌ها، مبالغ سیستم، کارتخوان‌ها، اعتباری‌ها و وضعیت صندوق را بر اساس فیلترهای انتخابی در قالب فایل **Excel** یا فایل **PDF رسمی آماده پرینت** خروجی بگیرید.
            </p>

            {exportMessage && (
              <div style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                whiteSpace: 'pre-line',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
              }}>
                {exportMessage}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleExportExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.85rem 1.6rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.925rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
                }}
              >
                <FileSpreadsheet size={20} />
                <span>دانلود خروجی اکسل (Excel / XLSX)</span>
              </button>

              <button
                onClick={handleExportPDF}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.85rem 1.6rem',
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.925rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px -5px rgba(225, 29, 72, 0.4)',
                }}
              >
                <FileText size={20} />
                <span>دانلود خروجی پی‌دی‌اف (PDF رسمی)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & AUDIT LOG */}
      {activeTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Backup Action Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.4)',
              }}>
                <HardDriveDownload size={28} color="#ffffff" />
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
                  خروجی نسخه پشتیبان دیتابیس (JSON / SQL)
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  جهت دریافت نسخه پشتیبان کامل از تمامی جداول، حسابداران، شیفت‌ها و سوابق روی دکمه زیر کلیک نمایید.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateManualBackup}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.4)',
              }}
            >
              <HardDriveDownload size={18} />
              <span>تهیه نسخه پشتیبان دستی</span>
            </button>
          </div>

          {backupMessage && (
            <div style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.875rem',
              whiteSpace: 'pre-line',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
            }}>
              {backupMessage}
            </div>
          )}

          {/* Audit Logs Table */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8fafc', fontWeight: 600 }}>
                <Activity size={20} color="#fbbf24" />
                <span>سوابق و تاریخچه تغییرات سیستم (Audit Log)</span>
              </div>

              <button
                onClick={fetchAuditLogs}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} />
                <span>بروزرسانی لاگ‌ها</span>
              </button>
            </div>

            {isLoadingLogs ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                در حال دریافت سوابق تغییرات...
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                هنوز هیچ لاگ تغییراتی ثبت نشده است.
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.825rem' }}>
                        <th style={{ padding: '0.75rem' }}>شناسه</th>
                        <th style={{ padding: '0.75rem' }}>موجودیت</th>
                        <th style={{ padding: '0.75rem' }}>عملیات انجام‌شده</th>
                        <th style={{ padding: '0.75rem' }}>توسط کاربر</th>
                        <th style={{ padding: '0.75rem' }}>تاریخ و زمان ثبت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAuditLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.875rem' }}>
                          <td style={{ padding: '0.85rem', color: '#94a3b8' }}>#{log.id}</td>
                          <td style={{ padding: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>{log.entity_type} #{log.entity_id}</td>
                          <td style={{ padding: '0.85rem' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.775rem',
                              fontWeight: 600,
                              background: log.action === 'lock' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: log.action === 'lock' ? '#f87171' : '#818cf8',
                            }}>
                              {log.action === 'save' ? 'ثبت/ویرایش شیفت' : log.action === 'lock' ? 'قفل کردن شیفت' : log.action}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem', color: '#cbd5e1' }}>{log.changed_by_name}</td>
                          <td style={{ padding: '0.85rem', color: '#94a3b8', fontSize: '0.825rem' }}>{formatToShamsiDateTime(log.changed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Audit Log Pagination Controls */}
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
                    صفحه <strong style={{ color: '#f8fafc' }}>{auditPage}</strong> از <strong style={{ color: '#f8fafc' }}>{totalAuditPages}</strong> (مجموع <strong style={{ color: '#fbbf24' }}>{auditLogs.length}</strong> سابقه)
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setAuditPage((p) => Math.max(p - 1, 1))}
                      disabled={auditPage === 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: auditPage === 1 ? '#475569' : '#f8fafc',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: auditPage === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ChevronRight size={16} />
                      <span>قبلی</span>
                    </button>

                    {Array.from({ length: totalAuditPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalAuditPages || Math.abs(p - auditPage) <= 2)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {prev && p - prev > 1 && (
                              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setAuditPage(p)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                border: p === auditPage ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: p === auditPage ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                color: p === auditPage ? '#fbbf24' : '#f8fafc',
                                fontSize: '0.825rem',
                                fontWeight: p === auditPage ? 700 : 500,
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
                      onClick={() => setAuditPage((p) => Math.min(p + 1, totalAuditPages))}
                      disabled={auditPage === totalAuditPages}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: auditPage === totalAuditPages ? '#475569' : '#f8fafc',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: auditPage === totalAuditPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>بعدی</span>
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MYSQL DATABASE CONFIGURATION & REAL TEST */}
      {activeTab === 'db' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.65rem', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '12px', color: '#06b6d4' }}>
                <Server size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  تنظیمات و تست واقعی اتصال به دیتابیس MySQL (WAMP / XAMPP)
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                  مشخصات اتصالی به سرور MySQL خود را وارد کنید و روی «تست و ذخیره واقعی اتصال» کلیک نمایید.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateDbConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    آدرس سرور (Host)
                  </label>
                  <input
                    type="text"
                    placeholder="localhost"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      direction: 'ltr',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    پورت (Port)
                  </label>
                  <input
                    type="number"
                    placeholder="3306"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      direction: 'ltr',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    نام کاربر (User)
                  </label>
                  <input
                    type="text"
                    placeholder="root"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      direction: 'ltr',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    رمز عبور (Password)
                  </label>
                  <input
                    type="password"
                    placeholder="خالی در صورت عدم وجود رمز"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      direction: 'ltr',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    نام دیتابیس (Database Name)
                  </label>
                  <input
                    type="text"
                    placeholder="cafe_cash_db"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      direction: 'ltr',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {dbTestMessage && (
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: dbTestMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${dbTestMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: dbTestMessage.type === 'success' ? '#34d399' : '#f87171',
                }}>
                  {dbTestMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isTestingDb}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.85rem 2rem',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isTestingDb ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 20px -4px rgba(6, 182, 212, 0.4)',
                  }}
                >
                  <RefreshCw size={18} style={{ animation: isTestingDb ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isTestingDb ? 'در حال برقراری و تست واقعی...' : 'تست و ذخیره واقعی اتصال به دیتابیس MySQL'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: GITHUB AUTO-UPDATE */}
      {activeTab === 'update' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                padding: '0.85rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(217, 70, 239, 0.2) 100%)',
                color: '#f472b6',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}>
                <CloudDownload size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
                  به‌روزرسانی خودکار نرم‌افزار (GitHub Releases)
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  بررسی، دانلود و اعمال مستقیم آپدیت‌های جدید از مخزن رسمی گیتهاب بدون از دست رفتن اطلاعات
                </p>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{
                padding: '0.4rem 0.85rem',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                fontSize: '0.825rem',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <span style={{ color: '#94a3b8' }}>نسخه فعلی:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>v{currentAppVersion}</span>
              </div>

              <div
                onClick={() => handleOpenGitHub(GITHUB_REPO_URL)}
                style={{
                  padding: '0.4rem 0.85rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  fontSize: '0.825rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
                title="مشاهده مخزن در گیتهاب"
              >
                <Github size={14} color="#f472b6" />
                <span style={{ direction: 'ltr', fontWeight: 600 }}>{GITHUB_OWNER}/{GITHUB_REPO}</span>
                <ExternalLink size={12} color="#94a3b8" />
              </div>
            </div>
          </div>

          {/* Action & Control Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.75rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.3rem 0' }}>
                  عملیات استعلام و دریافت آپدیت
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.825rem', margin: 0 }}>
                  با زدن دکمه زیر، آخرین نسخه منتشرشده در مخزن گیتهاب بررسی شده و در صورت وجود، امکان دانلود و نصب خودکار فعال می‌شود.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={isCheckingUpdate || isDownloadingUpdate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.4rem',
                    background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: isCheckingUpdate || isDownloadingUpdate ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 20px -4px rgba(236, 72, 153, 0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  <RefreshCw size={17} style={{ animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isCheckingUpdate ? 'در حال اتصال به گیتهاب...' : 'بررسی انتشار نسخه جدید'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenGitHub(`${GITHUB_REPO_URL}/releases`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem 1.1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    color: '#cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={15} />
                  <span>صفحه Releases در گیتهاب</span>
                </button>
              </div>
            </div>

            {/* Status Message Banner */}
            {updateMessage && (
              <div style={{
                padding: '0.9rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: updateMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : updateMessage.type === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(56, 189, 248, 0.15)',
                border: `1px solid ${
                  updateMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : updateMessage.type === 'error'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(56, 189, 248, 0.3)'
                }`,
                color: updateMessage.type === 'success'
                  ? '#34d399'
                  : updateMessage.type === 'error'
                  ? '#f87171'
                  : '#38bdf8',
              }}>
                {updateMessage.type === 'success' && <CheckCircle2 size={18} />}
                {updateMessage.type === 'error' && <ShieldAlert size={18} />}
                {updateMessage.type === 'info' && <Sparkles size={18} />}
                <span>{updateMessage.text}</span>
              </div>
            )}
          </div>

          {/* UPDATE AVAILABLE CARD */}
          {updateInfo && updateInfo.hasUpdate && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(24, 24, 37, 0.9) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              borderRadius: '20px',
              padding: '2rem',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 30px -5px rgba(236, 72, 153, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>
                    <ArrowUpCircle size={26} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                        نسخه جدید v{updateInfo.latestVersion} آماده است!
                      </h3>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'rgba(236, 72, 153, 0.2)',
                        color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                      }}>
                        NEW RELEASE
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.825rem', margin: '0.3rem 0 0 0' }}>
                      {updateInfo.releaseName || `Release v${updateInfo.latestVersion}`}
                      {updateInfo.publishedAt && ` — تاریخ انتشار: ${new Date(updateInfo.publishedAt).toLocaleDateString('fa-IR')}`}
                    </p>
                  </div>
                </div>

                {/* Asset details pill */}
                {updateInfo.assetName && (
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}>
                    <Download size={14} color="#38bdf8" />
                    <span style={{ direction: 'ltr', color: '#cbd5e1' }}>{updateInfo.assetName}</span>
                    {updateInfo.assetSize && (
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                        ({((updateInfo.assetSize) / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Release Notes */}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} color="#f472b6" />
                  <span>توضیحات و تغییرات این نسخه (Release Notes):</span>
                </div>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  color: '#e2e8f0',
                  fontSize: '0.875rem',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  fontFamily: 'inherit',
                }}>
                  {updateInfo.releaseNotes || 'توضیحاتی برای این انتشار ثبت نشده است.'}
                </div>
              </div>

              {/* Download Progress Bar */}
              {isDownloadingUpdate && downloadProgress && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite', color: '#f472b6' }} />
                      <span>در حال دریافت فایل نصاب از سرور گیتهاب...</span>
                    </span>
                    <span style={{ color: '#f472b6', fontWeight: 800, fontSize: '0.95rem' }}>
                      %{downloadProgress.percent}
                    </span>
                  </div>

                  <div style={{
                    width: '100%',
                    height: '10px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${downloadProgress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ec4899 0%, #d946ef 100%)',
                      borderRadius: '5px',
                      transition: 'width 0.2s ease',
                      boxShadow: '0 0 10px #ec4899',
                    }} />
                  </div>

                  <div style={{ fontSize: '0.775rem', color: '#94a3b8', textAlign: 'left', direction: 'ltr' }}>
                    {downloadProgress.formattedProgress}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {downloadedFilePath ? (
                  <button
                    type="button"
                    onClick={handleInstallUpdate}
                    disabled={isInstallingUpdate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.9rem 2.2rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1rem',
                      cursor: isInstallingUpdate ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.5)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Sparkles size={20} />
                    <span>{isInstallingUpdate ? 'در حال راه‌اندازی نصاب...' : 'راه‌اندازی مجدد و نصب نهایی نسخه جدید'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownloadUpdate}
                    disabled={isDownloadingUpdate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.9rem 2.2rem',
                      background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1rem',
                      cursor: isDownloadingUpdate ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 24px -4px rgba(236, 72, 153, 0.5)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Download size={20} />
                    <span>{isDownloadingUpdate ? 'در حال دانلود...' : 'دانلود و آماده‌سازی نسخه جدید'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* UP TO DATE CARD */}
          {hasCheckedOnce && updateInfo && !updateInfo.hasUpdate && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '2.5rem',
              backdropFilter: 'blur(10px)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                نرم‌افزار شما کاملاً به‌روز است
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', maxWidth: '500px', margin: 0, lineHeight: '1.6' }}>
                شما در حال استفاده از آخرین نسخه پایدار (v{currentAppVersion}) هستید. به محض انتشار نسخه جدید در مخزن گیتهاب، در این بخش اعلام خواهد شد.
              </p>
            </div>
          )}

          {/* INITIAL INFO CARD */}
          {!hasCheckedOnce && !updateInfo && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '2rem',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                راهنمای سیستم به‌روزرسانی خودکار
              </h3>
              <ul style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '2', margin: 0, paddingRight: '1.25rem' }}>
                <li>نسخه‌های جدید نرم‌افزار به صورت خودکار از مخزن رسمی گیتهاب (<span style={{ direction: 'ltr', display: 'inline-block' }}>{GITHUB_OWNER}/{GITHUB_REPO}</span>) دریافت می‌شوند.</li>
                <li>با کلیک بر روی دکمه <b>«بررسی انتشار نسخه جدید»</b>، ارتباط با سرور گیتهاب برقرار شده و شماره نسخه بررسی می‌گردد.</li>
                <li>در صورت وجود نسخه جدیدتر، لاگ تغییرات نمایش داده شده و با یک کلیک فایل نصاب جدید دانلود و جایگزین می‌شود.</li>
                <li>تمام اطلاعات دیتابیس، شیفت‌ها، کاربران و تراکنش‌ها در حین به‌روزرسانی کاملاً حفظ می‌شوند.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                تعریف حسابدار جدید (شیفت صبح یا عصر)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                <ShieldAlert size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  نام و نام خانوادگی
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="مثال: حسابدار شیفت صبح"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <UserIcon size={16} color="#64748b" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  شماره تماس (نام کاربری جهت ورود)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="مثال: 09121111111"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Phone size={16} color="#64748b" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  رمز عبور ورود
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewUserPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    style={{
                      position: 'absolute',
                      left: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showNewUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>



              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingUser ? 'در حال ثبت...' : 'ثبت حسابدار'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.8rem 1.2rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit User Modal */}
      {showEditModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                ویرایش مشخصات حسابدار
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                <ShieldAlert size={16} />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  نام و نام خانوادگی
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="نام حسابدار"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <UserIcon size={16} color="#64748b" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  شماره تماس (نام کاربری جهت ورود)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="شماره همراه"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Phone size={16} color="#64748b" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  رمز عبور جدید (در صورت نیاز به تغییر، اختیاری)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="رمز عبور جدید (خالی بگذارید تا تغییر نکند)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      left: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>



              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={isSubmittingEditUser}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingEditUser ? 'در حال بروزرسانی...' : 'ذخیره تغییرات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '0.8rem 1.2rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
                    تاریخ: {selectedShiftDetails.shift_date_shamsi} — حسابدار ثبت‌کننده: {selectedShiftDetails.accountant_name || 'نامشخص'}
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
                  {selectedShiftDetails.status === 'locked' ? <LockIcon size={16} /> : <CheckCircle2 size={16} />}
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

              {/* Shift Notes */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} />
                  <span>توضیحات و ملاحظات شیفت</span>
                </div>
                {selectedShiftDetails.notes ? (
                  <div style={{ color: '#f8fafc', fontSize: '0.875rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                    {selectedShiftDetails.notes}
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>توضیحاتی برای این شیفت ثبت نشده است.</div>
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

      {/* Footer */}
      <Footer />

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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
