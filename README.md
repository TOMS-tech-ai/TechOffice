# 🏗️ TECHOFFICE ERP v4.0
## نظام إدارة المكاتب الفنية لشركات الطرق

---

## 📁 هيكل المشروع

```
techoffice-erp/
├── src/
│   ├── App.jsx                        ← الموجّه الرئيسي (SuperAdmin / Tenant)
│   ├── main.jsx                       ← نقطة الدخول
│   ├── lib/
│   │   ├── supabaseClient.js          ← اتصال Supabase
│   │   └── paymob.js                  ← بوابة الدفع Paymob
│   ├── context/
│   │   └── TenantContext.jsx          ← إدارة الجلسة + RBAC
│   ├── components/
│   │   ├── SuperAdmin.jsx             ← لوحة السوبر أدمن الكاملة
│   │   └── PaymentGateway.jsx         ← نافذة الدفع
│   └── modules/
│       ├── phases4-5/index.jsx        ← 9 وحدات ERP أساسية
│       ├── phase6/index.jsx           ← ETA + AI Chat
│       └── phase7/index.jsx           ← 14 وحدة + AppV4 Shell
├── sql/
│   ├── 01-supabase-schema.sql         ← جداول tenants + RLS + superadmins
│   └── 02-tenant-erp-schema.sql       ← جداول ERP مع عزل البيانات
├── public/
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## 🚀 خطوات التشغيل

### الخطوة 1 — إعداد Supabase

1. سجّل حساباً على [supabase.com](https://supabase.com)
2. أنشئ مشروعاً جديداً (اختر منطقة قريبة — Europe West)
3. افتح **SQL Editor** وشغّل الملفين بالترتيب:
   ```sql
   -- أولاً
   sql/01-supabase-schema.sql
   
   -- ثانياً
   sql/02-tenant-erp-schema.sql
   ```

### الخطوة 2 — إنشاء حساب السوبر أدمن

في **Supabase → Authentication → Users**، أنشئ مستخدماً جديداً بالإيميل والباسورد،
ثم في **SQL Editor** شغّل:

```sql
SELECT public.set_superadmin_role('your-email@domain.com');
```

### الخطوة 3 — متغيرات البيئة

```bash
cp .env.example .env.local
```

ثم عدّل `.env.local`:
```env
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

القيم موجودة في: **Supabase → Project Settings → API**

### الخطوة 4 — تثبيت وتشغيل

```bash
npm install
npm run dev
```

افتح المتصفح على: **http://localhost:3000**

---

## 👤 أدوار المستخدمين

| الدور | الصلاحيات |
|-------|-----------|
| **superadmin** | كامل الصلاحيات على جميع الشركات |
| **admin** | إدارة كاملة داخل الشركة |
| **manager** | إدارة المشاريع والمستخلصات |
| **engineer** | إنشاء وتقديم المستخلصات |
| **viewer** | عرض فقط |

---

## 📦 الباقات

| الباقة | المستخدمون | المشاريع | السعر/سنة |
|--------|------------|----------|-----------|
| Basic | 3 | 5 | 20,000 ج.م |
| Pro | 10 | 20 | 50,000 ج.م |
| Enterprise | غير محدود | غير محدود | 90,000 ج.م |
| تفاوضي | غير محدود | غير محدود | حسب الاتفاق |

---

## 🔧 وحدات النظام (34 وحدة)

**المرحلة 4-5 (9 وحدات):**
Dashboard، المشاريع، المستخلصات، البند الكمي BOQ، الخطابات، الضمانات، أوامر التغيير، الجودة، سجل الأحداث

**المرحلة 6 (2 وحدات):**
الفاتورة الإلكترونية ETA، المساعد الذكي AI

**المرحلة 7 (14 وحدة):**
الميزانية EVM، التدفق النقدي، NCR، الرسومات، خريطة الكيلومترات، منحنى S، جانت، EOT، مقاولو الباطن، السلامة، المواد، التمام اليومي، المستخدمين، الإعدادات

---

## 🌐 النشر على Netlify/Vercel

```bash
npm run build
# ارفع مجلد dist/
```

في متغيرات البيئة على المنصة، أضف نفس قيم `.env.local`.

---

## 📞 الدعم

TECHOFFICE ERP v4.0 © 2026 — جميع الحقوق محفوظة
