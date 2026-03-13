-- ================================================================
-- TECHOFFICE ERP — Supabase Schema + RLS
-- تاريخ الإنشاء: 2026
-- ================================================================
-- الترتيب:
--   1. جدول tenants
--   2. تفعيل RLS + السياسات
--   3. دالة is_superadmin()
--   4. جدول superadmins
--   5. دالة set_superadmin_role()
--   6. بيانات تجريبية (اختياري)
-- ================================================================


-- ── 1. جدول tenants ──────────────────────────────────────────
create table if not exists public.tenants (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  slug            text        not null unique,
  plan            text        not null default 'basic'
                              check (plan in ('basic','pro','enterprise','custom')),
  max_users       int         not null default 3,
  max_projects    int         not null default 5,
  is_active       boolean     not null default true,
  expires_at      date,
  created_at      timestamptz not null default now(),
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  users_count     int         not null default 0,
  projects_count  int         not null default 0,
  last_login      timestamptz,
  annual_revenue  numeric     not null default 0,
  custom_price    numeric,                         -- للباقة التفاوضية فقط
  notes           text
);

-- فهارس للأداء
create index if not exists idx_tenants_slug      on public.tenants (slug);
create index if not exists idx_tenants_plan      on public.tenants (plan);
create index if not exists idx_tenants_is_active on public.tenants (is_active);
create index if not exists idx_tenants_expires   on public.tenants (expires_at);


-- ── 2. تفعيل Row Level Security ──────────────────────────────
alter table public.tenants enable row level security;


-- ── 3. دالة is_superadmin() ──────────────────────────────────
-- تُرجع true إذا كان المستخدم الحالي superadmin
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin',
    false
  );
$$;


-- ── 4. سياسات RLS ────────────────────────────────────────────

-- السوبر أدمن: صلاحيات كاملة (قراءة / كتابة / تعديل / حذف)
create policy "superadmin_full_access"
  on public.tenants
  for all
  using      (public.is_superadmin())
  with check (public.is_superadmin());

-- مستخدم الشركة: يقرأ صفه فقط (بحسب tenant_slug في metadata)
create policy "tenant_read_own_row"
  on public.tenants
  for select
  using (
    slug = (
      select raw_user_meta_data ->> 'tenant_slug'
      from   auth.users
      where  id = auth.uid()
    )
  );

-- مستخدم الشركة: لا يملك صلاحية الكتابة مطلقاً
-- (الكتابة محصورة في السوبر أدمن عبر السياسة أعلاه)


-- ── 5. جدول superadmins ──────────────────────────────────────
create table if not exists public.superadmins (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now()
);

alter table public.superadmins enable row level security;

-- السوبر أدمن يرى سجله فقط
create policy "superadmin_read_own"
  on public.superadmins
  for select
  using (id = auth.uid());


-- ── 6. دالة set_superadmin_role() ────────────────────────────
-- استخدامها: select public.set_superadmin_role('admin@techoffice.com');
create or replace function public.set_superadmin_role(user_email text)
returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid;
begin
  select id into v_uid
  from   auth.users
  where  email = user_email
  limit  1;

  if v_uid is null then
    raise exception 'المستخدم غير موجود: %', user_email;
  end if;

  -- إضافة role=superadmin إلى user_metadata
  update auth.users
  set    raw_user_meta_data =
           coalesce(raw_user_meta_data, '{}'::jsonb)
           || '{"role": "superadmin"}'::jsonb
  where  id = v_uid;

  -- تسجيل في جدول superadmins
  insert into public.superadmins (id, email)
  values (v_uid, user_email)
  on conflict (id) do nothing;
end;
$$;


-- ── 7. بيانات تجريبية (احذفها في الإنتاج) ───────────────────
insert into public.tenants
  (name, slug, plan, max_users, max_projects, is_active,
   expires_at, contact_name, contact_email, contact_phone,
   users_count, projects_count, annual_revenue)
values
  ('شركة نيل رودز للطرق',
   'nile-roads', 'pro', 10, 20, true,
   '2025-12-31', 'خالد إبراهيم', 'khaled@nilroads.com', '0100-123-4567',
   6, 3, 50000),

  ('شركة الدلتا للمقاولات',
   'delta-contracting', 'basic', 3, 5, true,
   '2025-11-15', 'محمود فاروق', 'mahmoud@delta.com', '0112-987-6543',
   2, 2, 20000),

  ('مؤسسة سيناء للإنشاء',
   'sinai-construction', 'enterprise', 999, 999, true,
   '2026-06-30', 'أحمد السيد', 'ahmed@sinai.com', '0155-456-7890',
   14, 8, 90000),

  ('شركة الصعيد للطرق',
   'saeid-roads', 'basic', 3, 5, false,
   '2025-09-01', 'كريم طاهر', 'karim@saeid.com', '0122-111-2233',
   3, 4, 0),

  ('مجموعة النهر للبنية التحتية',
   'nahr-infra', 'custom', 999, 999, true,
   '2025-10-25', 'سارة محمود', 'sara@nahr.com', '0100-999-8877',
   7, 5, 75000)
on conflict (slug) do nothing;


-- ================================================================
-- خطوات التشغيل:
-- ----------------------------------------------------------------
-- 1. افتح Supabase Dashboard → SQL Editor
-- 2. الصق هذا الملف كاملاً وشغّله
-- 3. أنشئ مستخدم السوبر أدمن من Authentication → Users
-- 4. شغّل: select public.set_superadmin_role('admin@techoffice.com');
-- 5. أضف متغيرات البيئة في مشروعك:
--      VITE_SUPABASE_URL=https://xxxx.supabase.co
--      VITE_SUPABASE_ANON_KEY=eyJ...
-- ================================================================
