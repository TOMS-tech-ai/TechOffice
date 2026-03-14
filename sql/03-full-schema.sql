-- ================================================================
-- TECHOFFICE ERP — Full Database Schema
-- الإصدار: 4.0 | تاريخ: 2026
-- شغّله في Supabase → SQL Editor دفعة واحدة
-- ================================================================

-- ── HELPERS ──────────────────────────────────────────────────
-- دالة تحديث updated_at تلقائياً
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── 1. PROJECTS ───────────────────────────────────────────────
create table if not exists public.projects (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null references public.tenants(id) on delete cascade,
  code                  text        not null,
  name                  text        not null,
  client                text,
  consultant            text,
  contract_value        numeric     not null default 0,
  paid                  numeric     not null default 0,
  progress              numeric     not null default 0,
  planned_progress      numeric     not null default 0,
  status                text        not null default 'EXECUTION'
                        check (status in ('EXECUTION','COMPLETED','SUSPENDED','CANCELLED')),
  start_date            date,
  contract_end          date,
  eot_days              int         not null default 0,
  pm                    text,
  zone                  text,
  length_km             numeric,
  chainage_from         numeric,
  chainage_to           numeric,
  retention_pct         numeric     not null default 5,
  retention_cap_pct     numeric     not null default 10,
  advance_pct           numeric     not null default 10,
  advance_recovery_pct  numeric     not null default 4,
  vat_pct               numeric     not null default 14,
  total_retained        numeric     not null default 0,
  advance_remaining     numeric     not null default 0,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists idx_projects_tenant on public.projects(tenant_id);
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- ── 2. BOQ SECTIONS ───────────────────────────────────────────
create table if not exists public.boq_sections (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  code        text        not null,
  title       text        not null,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_boq_sections_project on public.boq_sections(project_id);

-- ── 3. BOQ ITEMS ──────────────────────────────────────────────
create table if not exists public.boq_items (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  section_id  uuid        not null references public.boq_sections(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  code        text        not null,
  description text        not null,
  unit        text        not null,
  quantity    numeric     not null default 0,
  unit_rate   numeric     not null default 0,
  executed_qty numeric    not null default 0,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_boq_items_project  on public.boq_items(project_id);
create index if not exists idx_boq_items_section  on public.boq_items(section_id);
create trigger trg_boq_items_updated before update on public.boq_items
  for each row execute function public.set_updated_at();

-- ── 4. EXTRACTS (المستخلصات) ──────────────────────────────────
create table if not exists public.extracts (
  id                      uuid        primary key default gen_random_uuid(),
  tenant_id               uuid        not null references public.tenants(id) on delete cascade,
  project_id              uuid        not null references public.projects(id) on delete cascade,
  number                  text        not null,
  month                   text        not null,
  base_work               numeric     not null default 0,
  variations_amount       numeric     not null default 0,
  retention_this_extract  numeric     not null default 0,
  advance_recovery        numeric     not null default 0,
  fines                   numeric     not null default 0,
  gross_total             numeric     not null default 0, -- محسوب من التطبيق
  net_before_vat          numeric     not null default 0,
  vat_amount              numeric     not null default 0,
  net_final               numeric     not null default 0,
  status                  text        not null default 'DRAFT'
                          check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','PAID','REJECTED')),
  submitted_at            date,
  approved_at             date,
  paid_at                 date,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_extracts_project on public.extracts(project_id);
create index if not exists idx_extracts_tenant  on public.extracts(tenant_id);
create trigger trg_extracts_updated before update on public.extracts
  for each row execute function public.set_updated_at();

-- ── 5. LETTERS (المراسلات) ────────────────────────────────────
create table if not exists public.letters (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  number      text        not null,
  subject     text        not null,
  type        text        not null default 'OUTGOING'
              check (type in ('OUTGOING','INCOMING')),
  to_from     text,
  date        date,
  due_date    date,
  status      text        not null default 'PENDING'
              check (status in ('PENDING','CLOSED','OVERDUE')),
  priority    text        not null default 'NORMAL'
              check (priority in ('NORMAL','URGENT','HIGH')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_letters_project on public.letters(project_id);
create trigger trg_letters_updated before update on public.letters
  for each row execute function public.set_updated_at();

-- ── 6. VARIATION ORDERS (أوامر التغيير) ──────────────────────
create table if not exists public.variation_orders (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  number       text        not null,
  description  text        not null,
  value        numeric     not null default 0,
  type         text        not null default 'ADDITION'
               check (type in ('ADDITION','DEDUCTION','NEUTRAL')),
  status       text        not null default 'SUBMITTED'
               check (status in ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED')),
  submitted_at date,
  approved_at  date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_vos_project on public.variation_orders(project_id);
create trigger trg_vos_updated before update on public.variation_orders
  for each row execute function public.set_updated_at();

-- ── 7. GUARANTEES (الضمانات البنكية) ─────────────────────────
create table if not exists public.guarantees (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  number      text        not null,
  type        text        not null
              check (type in ('PERFORMANCE_BOND','ADVANCE_PAYMENT','MAINTENANCE','OTHER')),
  type_ar     text,
  bank        text,
  value       numeric     not null default 0,
  issue_date  date,
  expiry_date date,
  status      text        not null default 'ACTIVE'
              check (status in ('ACTIVE','EXPIRED','RELEASED','CLAIMED')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_guarantees_project on public.guarantees(project_id);
create trigger trg_guarantees_updated before update on public.guarantees
  for each row execute function public.set_updated_at();

-- ── 8. QUALITY TESTS (اختبارات الجودة) ──────────────────────
create table if not exists public.quality_tests (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  type        text        not null,
  chainage    text,
  result      numeric     not null,
  required    numeric     not null,
  usl         numeric,
  lsl         numeric,
  status      text        not null default 'PASS'
              check (status in ('PASS','FAIL','PENDING')),
  location    text,
  tested_at   date,
  tested_by   text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_quality_project on public.quality_tests(project_id);

-- ── 9. NCRs (عدم المطابقة) ───────────────────────────────────
create table if not exists public.ncrs (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  number       text        not null,
  description  text        not null,
  location     text,
  category     text,
  severity     text        not null default 'MEDIUM'
               check (severity in ('HIGH','MEDIUM','LOW')),
  status       text        not null default 'OPEN'
               check (status in ('OPEN','CLOSED','UNDER_REVIEW')),
  raised_by    text,
  raised_at    date,
  due_date     date,
  assigned_to  text,
  closed_at    date,
  root_cause   text,
  corrective_action text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_ncrs_project on public.ncrs(project_id);
create trigger trg_ncrs_updated before update on public.ncrs
  for each row execute function public.set_updated_at();

-- ── 10. DRAWINGS (الرسومات + RFI) ────────────────────────────
create table if not exists public.drawings (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  number       text        not null,
  title        text        not null,
  revision     text        not null default 'A',
  discipline   text,
  status       text        not null default 'PENDING'
               check (status in ('APPROVED','UNDER_REVIEW','PENDING','SUPERSEDED','RFI')),
  submitted_at date,
  approved_at  date,
  file_url     text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_drawings_project on public.drawings(project_id);
create trigger trg_drawings_updated before update on public.drawings
  for each row execute function public.set_updated_at();

-- ── 11. EOT REQUESTS (طلبات التمديد) ─────────────────────────
create table if not exists public.eot_requests (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  project_id      uuid        not null references public.projects(id) on delete cascade,
  code            text        not null,
  cause           text        not null,
  requested_days  int         not null default 0,
  granted_days    int,
  status          text        not null default 'DRAFT'
                  check (status in ('DRAFT','SUBMITTED','PARTIAL','APPROVED','REJECTED')),
  submitted_at    date,
  decided_at      date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_eot_project on public.eot_requests(project_id);
create trigger trg_eot_updated before update on public.eot_requests
  for each row execute function public.set_updated_at();

-- ── 12. SAFETY INCIDENTS (حوادث السلامة) ─────────────────────
create table if not exists public.safety_incidents (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  type         text        not null,
  description  text        not null,
  location     text,
  date         date,
  severity     text        not null default 'MINOR'
               check (severity in ('MINOR','MODERATE','MAJOR','FATAL')),
  status       text        not null default 'OPEN'
               check (status in ('OPEN','CLOSED','UNDER_INVESTIGATION')),
  reported_by  text,
  corrective_action text,
  closed_at    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_safety_project on public.safety_incidents(project_id);
create trigger trg_safety_updated before update on public.safety_incidents
  for each row execute function public.set_updated_at();

-- ── 13. MATERIALS (المواد) ────────────────────────────────────
create table if not exists public.materials (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  name         text        not null,
  unit         text        not null,
  ordered      numeric     not null default 0,
  delivered    numeric     not null default 0,
  used         numeric     not null default 0,
  stock        numeric     not null default 0, -- محسوب: delivered - used
  unit_cost    numeric     not null default 0,
  supplier     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_materials_project on public.materials(project_id);
create trigger trg_materials_updated before update on public.materials
  for each row execute function public.set_updated_at();

-- ── 14. SUBCONTRACTORS (المقاولون من الباطن) ─────────────────
create table if not exists public.subcontractors (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  project_id      uuid        not null references public.projects(id) on delete cascade,
  name            text        not null,
  specialty       text,
  contract_value  numeric     not null default 0,
  paid            numeric     not null default 0,
  progress        numeric     not null default 0,
  status          text        not null default 'ACTIVE'
                  check (status in ('ACTIVE','COMPLETED','SUSPENDED','TERMINATED')),
  start_date      date,
  end_date        date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_sub_project on public.subcontractors(project_id);
create trigger trg_sub_updated before update on public.subcontractors
  for each row execute function public.set_updated_at();

-- ── 15. DAILY LOGS (التمام اليومي) ───────────────────────────
create table if not exists public.daily_logs (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  date         date        not null,
  weather      text,
  works        text        not null,
  workers      int         not null default 0,
  equipment    text,
  progress     text,
  issues       text,
  reported_by  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, date)
);
create index if not exists idx_daily_logs_project on public.daily_logs(project_id);
create trigger trg_daily_logs_updated before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ── 16. AUDIT LOG (سجل التدقيق) ──────────────────────────────
create table if not exists public.audit_log (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  user_id     uuid,
  user_name   text,
  user_role   text,
  entity      text        not null,
  entity_id   uuid,
  action      text        not null
              check (action in ('CREATE','UPDATE','DELETE','APPROVE','REJECT','SUBMIT','CLOSE')),
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_tenant on public.audit_log(tenant_id);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

-- ── RLS لكل الجداول الجديدة ───────────────────────────────────
do $$ declare t text; begin
  foreach t in array array[
    'projects','boq_sections','boq_items','extracts','letters',
    'variation_orders','guarantees','quality_tests','ncrs','drawings',
    'eot_requests','safety_incidents','materials','subcontractors',
    'daily_logs','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    -- السوبر أدمن: صلاحيات كاملة
    execute format($$
      create policy "%s_superadmin" on public.%I for all
      using ((auth.jwt()->'user_metadata'->>'role') = 'superadmin')
      with check ((auth.jwt()->'user_metadata'->>'role') = 'superadmin')
    $$, t, t);

    -- مستخدم الشركة: يرى بيانات شركته فقط عبر tenant_id
    execute format($$
      create policy "%s_tenant_access" on public.%I for all
      using (
        tenant_id = (
          select id from public.tenants
          where slug = (auth.jwt()->'user_metadata'->>'tenant_slug')
          limit 1
        )
      )
      with check (
        tenant_id = (
          select id from public.tenants
          where slug = (auth.jwt()->'user_metadata'->>'tenant_slug')
          limit 1
        )
      )
    $$, t, t);
  end loop;
end $$;

-- ================================================================
-- ✅ تم إنشاء 16 جدول بـ RLS كامل
-- ================================================================

-- ── إضافة حقول إضافية لجدول tenants للإعدادات ──────────────────
alter table public.tenants
  add column if not exists tax_id       text,
  add column if not exists address      text,
  add column if not exists contact_phone text,
  add column if not exists logo_url     text;
