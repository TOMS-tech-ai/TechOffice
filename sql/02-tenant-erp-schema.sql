-- ================================================================
-- TECHOFFICE ERP — جداول ERP مع عزل البيانات بالـ tenant
-- الخطوة 3: ربط ERP الأصلي بنظام الـ tenants
-- ================================================================
-- الترتيب:
--   1. enum للحالات
--   2. جداول ERP الأساسية (مشاريع، مستخدمون، مستخلصات، ضمانات)
--   3. دالة get_tenant_id() من JWT
--   4. تفعيل RLS + سياسات العزل لكل جدول
--   5. triggers لتحديث users_count و projects_count في tenants
--   6. views مفيدة للـ superadmin
-- ================================================================


-- ── 1. Enums ──────────────────────────────────────────────────
do $$ begin
  create type project_status as enum ('draft','active','on_hold','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type extract_status as enum ('draft','submitted','approved','rejected','paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type guarantee_type as enum ('performance','advance','maintenance','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin','manager','engineer','viewer');
exception when duplicate_object then null; end $$;


-- ── 2. جداول ERP ──────────────────────────────────────────────

-- 2.1 مستخدمو الشركة (Tenant Users)
create table if not exists public.tenant_users (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants (id) on delete cascade,
  auth_user_id uuid        references auth.users (id) on delete set null,
  full_name    text        not null,
  email        text        not null,
  phone        text,
  role         user_role   not null default 'viewer',
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  last_login   timestamptz,
  unique (tenant_id, email)
);

create index if not exists idx_tenant_users_tenant on public.tenant_users (tenant_id);
create index if not exists idx_tenant_users_auth   on public.tenant_users (auth_user_id);


-- 2.2 المشاريع
create table if not exists public.projects (
  id              uuid            primary key default gen_random_uuid(),
  tenant_id       uuid            not null references public.tenants (id) on delete cascade,
  name            text            not null,
  code            text,                      -- رقم المشروع الداخلي
  client_name     text,
  location        text,
  contract_value  numeric         not null default 0,
  status          project_status  not null default 'active',
  start_date      date,
  end_date        date,
  created_by      uuid            references public.tenant_users (id),
  created_at      timestamptz     not null default now(),
  updated_at      timestamptz     not null default now()
);

create index if not exists idx_projects_tenant on public.projects (tenant_id);
create index if not exists idx_projects_status on public.projects (status);


-- 2.3 المستخلصات (Extracts / Invoices)
create table if not exists public.extracts (
  id              uuid            primary key default gen_random_uuid(),
  tenant_id       uuid            not null references public.tenants (id) on delete cascade,
  project_id      uuid            not null references public.projects (id) on delete cascade,
  extract_number  text            not null,  -- مثلاً: M-07
  period_from     date,
  period_to       date,
  amount          numeric         not null default 0,
  vat_amount      numeric         not null default 0,
  total_amount    numeric         generated always as (amount + vat_amount) stored,
  status          extract_status  not null default 'draft',
  submitted_at    timestamptz,
  approved_at     timestamptz,
  paid_at         timestamptz,
  notes           text,
  created_by      uuid            references public.tenant_users (id),
  created_at      timestamptz     not null default now(),
  updated_at      timestamptz     not null default now(),
  unique (tenant_id, project_id, extract_number)
);

create index if not exists idx_extracts_tenant  on public.extracts (tenant_id);
create index if not exists idx_extracts_project on public.extracts (project_id);
create index if not exists idx_extracts_status  on public.extracts (status);


-- 2.4 الضمانات البنكية
create table if not exists public.guarantees (
  id               uuid            primary key default gen_random_uuid(),
  tenant_id        uuid            not null references public.tenants (id) on delete cascade,
  project_id       uuid            references public.projects (id) on delete set null,
  guarantee_type   guarantee_type  not null default 'performance',
  bank_name        text            not null,
  guarantee_number text            not null,
  amount           numeric         not null default 0,
  issue_date       date,
  expiry_date      date,
  is_returned      boolean         not null default false,
  returned_at      date,
  notes            text,
  created_at       timestamptz     not null default now(),
  unique (tenant_id, guarantee_number)
);

create index if not exists idx_guarantees_tenant  on public.guarantees (tenant_id);
create index if not exists idx_guarantees_project on public.guarantees (project_id);
create index if not exists idx_guarantees_expiry  on public.guarantees (expiry_date);


-- 2.5 المدفوعات / الاشتراكات (للخطوة 4 — بوابة الدفع)
create table if not exists public.subscription_payments (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null references public.tenants (id) on delete cascade,
  plan             text        not null,
  amount           numeric     not null,
  currency         text        not null default 'EGP',
  gateway          text        not null default 'paymob', -- paymob | fawry | manual
  gateway_order_id text,                 -- order id من Paymob
  gateway_txn_id   text,                 -- transaction id من Paymob
  status           text        not null default 'pending'
                               check (status in ('pending','processing','paid','failed','refunded')),
  paid_at          timestamptz,
  expires_at       date,                 -- تاريخ انتهاء الاشتراك الجديد بعد الدفع
  metadata         jsonb,                -- بيانات إضافية من Gateway
  created_at       timestamptz not null default now()
);

create index if not exists idx_payments_tenant on public.subscription_payments (tenant_id);
create index if not exists idx_payments_status on public.subscription_payments (status);
create index if not exists idx_payments_txn    on public.subscription_payments (gateway_txn_id);


-- ── 3. دالة get_tenant_id() ───────────────────────────────────
-- تُرجع tenant.id للمستخدم الحالي بناءً على tenant_slug في JWT
create or replace function public.get_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select t.id
  from   public.tenants t
  where  t.slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
  limit  1;
$$;


-- ── 4. Row Level Security على جداول ERP ──────────────────────

alter table public.tenant_users           enable row level security;
alter table public.projects               enable row level security;
alter table public.extracts               enable row level security;
alter table public.guarantees             enable row level security;
alter table public.subscription_payments  enable row level security;

-- ── 4a. tenant_users ──
create policy "superadmin_users_all"
  on public.tenant_users for all
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "tenant_users_own"
  on public.tenant_users for all
  using      (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());

-- ── 4b. projects ──
create policy "superadmin_projects_all"
  on public.projects for all
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "tenant_projects_own"
  on public.projects for all
  using      (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());

-- ── 4c. extracts ──
create policy "superadmin_extracts_all"
  on public.extracts for all
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "tenant_extracts_own"
  on public.extracts for all
  using      (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());

-- مهندس عادي لا يعتمد المستخلصات — مدير وأعلى فقط
create policy "viewer_cannot_approve_extract"
  on public.extracts for update
  using (
    tenant_id = public.get_tenant_id()
    and (
      -- السوبر أدمن أو الأدوار العليا
      public.is_superadmin()
      or exists (
        select 1 from public.tenant_users u
        where  u.auth_user_id = auth.uid()
        and    u.tenant_id    = public.get_tenant_id()
        and    u.role         in ('admin','manager')
      )
    )
  );

-- ── 4d. guarantees ──
create policy "superadmin_guarantees_all"
  on public.guarantees for all
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "tenant_guarantees_own"
  on public.guarantees for all
  using      (tenant_id = public.get_tenant_id())
  with check (tenant_id = public.get_tenant_id());

-- ── 4e. subscription_payments ──
create policy "superadmin_payments_all"
  on public.subscription_payments for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- الشركة تقرأ فواتيرها فقط — لا تكتب (الكتابة عبر Edge Function)
create policy "tenant_payments_read_own"
  on public.subscription_payments for select
  using (tenant_id = public.get_tenant_id());


-- ── 5. Triggers ───────────────────────────────────────────────

-- 5a. تحديث users_count في tenants تلقائياً
create or replace function public.update_users_count()
returns trigger language plpgsql security definer as $$
begin
  update public.tenants
  set    users_count = (
    select count(*) from public.tenant_users
    where  tenant_id = coalesce(new.tenant_id, old.tenant_id)
    and    is_active  = true
  )
  where  id = coalesce(new.tenant_id, old.tenant_id);
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_users_count on public.tenant_users;
create trigger trg_users_count
  after insert or update or delete on public.tenant_users
  for each row execute function public.update_users_count();


-- 5b. تحديث projects_count في tenants تلقائياً
create or replace function public.update_projects_count()
returns trigger language plpgsql security definer as $$
begin
  update public.tenants
  set    projects_count = (
    select count(*) from public.projects
    where  tenant_id = coalesce(new.tenant_id, old.tenant_id)
    and    status    != 'cancelled'
  )
  where  id = coalesce(new.tenant_id, old.tenant_id);
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_projects_count on public.projects;
create trigger trg_projects_count
  after insert or update or delete on public.projects
  for each row execute function public.update_projects_count();


-- 5c. updated_at تلقائي
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_extracts_updated on public.extracts;
create trigger trg_extracts_updated
  before update on public.extracts
  for each row execute function public.set_updated_at();


-- ── 6. Views للـ SuperAdmin ───────────────────────────────────

-- ملخص كل شركة مع إحصائياتها
create or replace view public.tenant_summary as
select
  t.id,
  t.name,
  t.slug,
  t.plan,
  t.is_active,
  t.expires_at,
  t.annual_revenue,
  t.users_count,
  t.projects_count,
  coalesce(p.total_contract, 0)      as total_contract_value,
  coalesce(e.pending_extracts, 0)    as pending_extracts_count,
  coalesce(e.pending_amount, 0)      as pending_extract_amount,
  coalesce(g.active_guarantees, 0)   as active_guarantees_count,
  coalesce(g.guarantee_total, 0)     as total_guarantee_amount
from public.tenants t
left join (
  select tenant_id, sum(contract_value) as total_contract
  from   public.projects where status != 'cancelled'
  group  by tenant_id
) p on p.tenant_id = t.id
left join (
  select tenant_id,
    count(*) filter (where status in ('submitted','approved')) as pending_extracts,
    sum(total_amount) filter (where status in ('submitted','approved'))  as pending_amount
  from   public.extracts
  group  by tenant_id
) e on e.tenant_id = t.id
left join (
  select tenant_id,
    count(*) filter (where not is_returned) as active_guarantees,
    sum(amount) filter (where not is_returned) as guarantee_total
  from   public.guarantees
  group  by tenant_id
) g on g.tenant_id = t.id;

-- ================================================================
-- للتحقق من التثبيت:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ================================================================
