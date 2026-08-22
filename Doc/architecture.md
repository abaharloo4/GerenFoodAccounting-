# Architecture - سیستم حسابداری و تطبیق صندوق کافه

## ۱. نمای کلی استک فنی

| لایه | فناوری |
|---|---|
| Runtime دسکتاپ | Electron |
| Build Tool | Vite |
| UI Framework | React + TypeScript |
| دیتابیس | SQLite (فایل محلی، تک‌کاربره) |
| ORM/Query Layer | better-sqlite3 (sync، مناسب Electron main process) یا Prisma با درایور SQLite |
| تقویم شمسی | کتابخانه‌ی jalaali-js یا moment-jalaali برای تبدیل و نمایش تاریخ |
| بسته‌بندی/توزیع | electron-builder |
| بروزرسانی خودکار | electron-updater (اختیاری برای فاز اول، ولی معماری آماده باشد) |
| احراز هویت | Local auth: هش رمز عبور با bcrypt، ذخیره‌ی session در main process |

## ۲. معماری کلی Electron

```
┌─────────────────────────────────────────┐
│              Main Process (Node)          │
│  - دسترسی مستقیم به SQLite (better-sqlite3)│
│  - IPC Handlers (invoke/handle)           │
│  - Auth logic (bcrypt, session token)     │
│  - Business logic لایه‌ی محاسباتی         │
│  - Backup/Export logic                    │
└───────────────┬───────────────────────────┘
                │ IPC (contextBridge + preload)
┌───────────────▼───────────────────────────┐
│           Renderer Process (React)         │
│  - UI کاملاً RTL / فارسی                   │
│  - فرم‌های ورود داده (shift entry)          │
│  - داشبورد مدیر                             │
│  - بدون دسترسی مستقیم به Node/fs          │
└─────────────────────────────────────────────┘
```

نکته‌ی امنیتی مهم: `contextIsolation: true` و `nodeIntegration: false` — تمام ارتباط renderer با دیتابیس فقط از طریق preload script و کانال‌های IPC مشخص انجام شود، نه دسترسی مستقیم.

## ۳. ساختار پوشه‌ها (پیشنهادی)

```
cafe-cash-app/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── db/
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   └── index.ts          # اتصال SQLite + مقداردهی اولیه
│   ├── ipc/
│   │   ├── auth.handlers.ts
│   │   ├── shift.handlers.ts
│   │   └── report.handlers.ts
│   ├── services/
│   │   ├── calculation.service.ts   # منطق فرمول محاسباتی، جدا و قابل تست
│   │   ├── auth.service.ts
│   │   └── export.service.ts
│   └── utils/
│       └── jalaali.ts
├── src/                        # React renderer
│   ├── components/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── AccountantDashboard.tsx
│   │   ├── ShiftEntryForm.tsx
│   │   └── ManagerDashboard.tsx
│   ├── hooks/
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── types/
├── vite.config.ts
├── electron-builder.json
└── package.json
```

## ۴. مدل داده (Schema اولیه)

### جدول `users`
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| phone_number | TEXT UNIQUE | نام کاربری |
| password_hash | TEXT | bcrypt |
| full_name | TEXT | |
| role | TEXT | 'accountant' \| 'manager' |
| is_active | INTEGER | ۱/۰ |
| created_at | TEXT | ISO timestamp |

### جدول `shifts`
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| shift_date_shamsi | TEXT | تاریخ شمسی، فرمت YYYY-MM-DD |
| shift_type | TEXT | 'morning' \| 'evening' |
| accountant_id | INTEGER FK → users.id | |
| system_sales | REAL | فروش سیستم |
| cash_amount | REAL | نقد |
| status | TEXT | 'open' \| 'submitted' \| 'locked' |
| created_at | TEXT | |
| updated_at | TEXT | |
| locked_by | INTEGER FK → users.id (nullable) | مدیر قفل‌کننده |
| locked_at | TEXT (nullable) | |

### جدول `pos_entries` (فروش کارتخوان به تفکیک پوز)
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| shift_id | INTEGER FK → shifts.id | |
| pos_label | TEXT | نام/شماره پوز |
| amount | REAL | |

### جدول `credit_entries` (اعتباری‌ها)
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| shift_id | INTEGER FK → shifts.id | |
| description | TEXT | |
| amount | REAL | |

### جدول `shortage_entries` (کسری شناخته‌شده)
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| shift_id | INTEGER FK → shifts.id | |
| description | TEXT | |
| amount | REAL | |

### جدول `surplus_entries` (اضاف شناخته‌شده)
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| shift_id | INTEGER FK → shifts.id | |
| description | TEXT | |
| amount | REAL | |

### جدول `audit_log`
| ستون | نوع | توضیح |
|---|---|---|
| id | INTEGER PK | |
| entity_type | TEXT | 'shift' \| 'pos_entry' \| ... |
| entity_id | INTEGER | |
| action | TEXT | 'create' \| 'update' \| 'delete' \| 'lock' |
| changed_by | INTEGER FK → users.id | |
| changed_at | TEXT | |
| old_value | TEXT (JSON, nullable) | |
| new_value | TEXT (JSON, nullable) | |

> همه‌ی جدول‌های چندتایی (pos_entries, credit_entries, shortage_entries, surplus_entries) عمداً جدا از هم و normalized نگه داشته شدند تا هم گزارش‌گیری آسان باشد و هم افزودن فیلد یا نوع جدید در آینده ساده باشد.

## ۵. لایه‌ی محاسباتی (Calculation Service)

منطق فرمول در `electron/services/calculation.service.ts` به‌صورت یک تابع خالص (pure function) پیاده‌سازی می‌شود تا مستقل از UI و دیتابیس قابل تست باشد:

```ts
interface ShiftCalculationInput {
  systemSales: number;
  cashAmount: number;
  posEntries: number[];
  creditEntries: number[];
  shortageEntries: number[];
  surplusEntries: number[];
}

interface ShiftCalculationResult {
  totalPos: number;
  totalCredit: number;
  totalKnownShortage: number;
  totalKnownSurplus: number;
  systemSalesAfterShortage: number;
  adjustedCashAndCard: number;
  unknownRemainder: number; // منفی = کسری ناشناخته، مثبت = اضاف ناشناخته
}
```

## ۶. احراز هویت و مجوزها

- ورود با phone_number + password → بررسی در main process → bcrypt.compare
- Session ساده در حافظه‌ی main process (چون تک‌کاربره و تک‌دستگاه است، نیازی به JWT/refresh token پیچیده نیست)
- Middleware سطح IPC: هر handler نقش کاربر را چک می‌کند (accountant فقط shift خودش، manager همه)

## ۷. گزارش‌گیری و Export

- فاز اول: Export به Excel (کتابخانه‌ی exceljs یا xlsx در main process) و/یا PDF ساده
- فیلتر بر اساس بازه‌ی تاریخ شمسی، حسابدار، نوع شیفت

## ۸. پشتیبان‌گیری (Backup)

- کپی دوره‌ای فایل SQLite (مثلاً روزانه) به یک پوشه‌ی backup محلی با timestamp
- دکمه‌ی "تهیه نسخه پشتیبان دستی" در پنل مدیر

## ۹. ملاحظات آینده‌نگری معماری

- جدول‌ها آماده‌ی افزودن ستون `branch_id` هستند بدون نیاز به تغییر ساختاری بزرگ
- Calculation service کاملاً مجزا از UI و DB است — قابل استفاده‌ی مجدد اگر بعداً به backend وب‌محور (مثلاً برای نسخه‌ی SaaS چندشعبه‌ای) منتقل شود
- استفاده از IPC channel های نام‌گذاری‌شده و type-safe (با اشتراک types بین main/renderer) تا افزودن قابلیت جدید تداخل ایجاد نکند
