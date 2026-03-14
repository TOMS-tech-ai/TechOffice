-- ================================================================
-- TECHOFFICE ERP — Seed Data للبيانات التجريبية
-- ================================================================
-- شغّله بعد 03-full-schema.sql
-- غيّر tenant_id بالـ UUID الحقيقي من جدول tenants
-- ================================================================

-- ① احصل على tenant_id الأول
do $$
declare
  v_tenant_id   uuid;
  v_project1_id uuid := gen_random_uuid();
  v_project2_id uuid := gen_random_uuid();
  v_sec_a       uuid := gen_random_uuid();
  v_sec_b       uuid := gen_random_uuid();
  v_sec_c       uuid := gen_random_uuid();
begin
  -- اجيب أول tenant
  select id into v_tenant_id from public.tenants limit 1;
  if v_tenant_id is null then
    raise notice 'لا يوجد tenant — شغّل أولاً sql/01-supabase-schema.sql';
    return;
  end if;

  raise notice 'Seeding tenant: %', v_tenant_id;

  -- ══════════════════════════════════════
  -- PROJECTS
  -- ══════════════════════════════════════
  insert into public.projects (id, tenant_id, code, name, client, consultant,
    contract_value, paid, progress, planned_progress, status,
    start_date, contract_end, eot_days, pm, zone,
    length_km, chainage_from, chainage_to,
    retention_pct, retention_cap_pct, advance_pct, advance_recovery_pct, vat_pct,
    total_retained, advance_remaining)
  values
    (v_project1_id, v_tenant_id, 'NR-2024-01',
     'طريق القاهرة الإسكندرية الصحراوي — المرحلة الثالثة',
     'الهيئة العامة للطرق والكباري', 'شركة المهندسون المتحدون',
     185000000, 112400000, 61.2, 67.0, 'EXECUTION',
     '2024-01-15', '2025-06-30', 45, 'م. أحمد السيد', 'المنطقة الغربية',
     42.5, 280, 322, 5, 10, 10, 4, 14, 9246000, 8500000),
    (v_project2_id, v_tenant_id, 'NR-2024-02',
     'رصف طريق الفيوم الجديد',
     'محافظة الفيوم', null,
     67000000, 58200000, 87.4, 85.0, 'EXECUTION',
     '2024-03-01', '2025-03-31', 14, 'م. كريم طاهر', 'المنطقة الجنوبية',
     18.2, 0, 18, 5, 10, 10, 4, 14, 3350000, 0)
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- BOQ SECTIONS (للمشروع الأول)
  -- ══════════════════════════════════════
  insert into public.boq_sections (id, tenant_id, project_id, code, title, sort_order) values
    (v_sec_a, v_tenant_id, v_project1_id, 'A', 'أعمال التسوية والردم', 1),
    (v_sec_b, v_tenant_id, v_project1_id, 'B', 'طبقات الأساس والتحضير', 2),
    (v_sec_c, v_tenant_id, v_project1_id, 'C', 'طبقات الأسفلت', 3)
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- BOQ ITEMS
  -- ══════════════════════════════════════
  insert into public.boq_items (tenant_id, section_id, project_id, code, description, unit, quantity, unit_rate, executed_qty, sort_order) values
    (v_tenant_id, v_sec_a, v_project1_id, 'A-01', 'حفر وتسوية التربة الطبيعية',              'م³',     185000, 42,      185000, 1),
    (v_tenant_id, v_sec_a, v_project1_id, 'A-02', 'ردم وتنعيم بمواد انتقائية',                'م³',     120000, 65,       95000, 2),
    (v_tenant_id, v_sec_b, v_project1_id, 'B-01', 'طبقة Subbase مدموكة t=20cm',              'م²',     210000, 88,      210000, 1),
    (v_tenant_id, v_sec_b, v_project1_id, 'B-02', 'طبقة أساس ركام مجروش t=25cm',             'م²',     210000, 145,     175000, 2),
    (v_tenant_id, v_sec_c, v_project1_id, 'C-01', 'طبقة رابط بيتوميني (Binder) t=6cm',      'طن',       8500, 3800,     7200, 1),
    (v_tenant_id, v_sec_c, v_project1_id, 'C-02', 'طبقة رصف نهائية (Wearing) t=4cm',        'طن',       5800, 4200,     2800, 2)
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- EXTRACTS (مستخلصات)
  -- ══════════════════════════════════════
  insert into public.extracts (tenant_id, project_id, number, month,
    base_work, variations_amount, retention_this_extract, advance_recovery,
    fines, gross_total, net_before_vat, vat_amount, net_final,
    status, submitted_at) values
    (v_tenant_id, v_project1_id, 'M-07', 'يوليو 2025',
     8500000, 650000, 457500, 340000, 0,
     9150000, 8352500, 1169350, 9521850, 'UNDER_REVIEW', '2025-07-25'),
    (v_tenant_id, v_project1_id, 'M-06', 'يونيو 2025',
     7200000, 420000, 381000, 288000, 0,
     7620000, 6951000, 973140, 7924140, 'APPROVED', '2025-06-28'),
    (v_tenant_id, v_project2_id, 'M-10', 'أكتوبر 2025',
     5800000, 0, 290000, 232000, 50000,
     5800000, 5228000, 731920, 5959920, 'PAID', '2025-10-30')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- LETTERS (مراسلات)
  -- ══════════════════════════════════════
  insert into public.letters (tenant_id, project_id, number, subject, type, to_from, date, due_date, status, priority) values
    (v_tenant_id, v_project1_id, 'LTR-2025-047', 'المطالبة بتعديل أسعار مواد الأسفلت',
     'OUTGOING', 'الهيئة العامة للطرق والكباري', '2025-09-15', '2025-10-15', 'OVERDUE', 'URGENT'),
    (v_tenant_id, v_project1_id, 'LTR-2025-046', 'طلب الموافقة على مصدر الركام المستخدم',
     'OUTGOING', 'الاستشاري', '2025-09-10', '2025-10-10', 'PENDING', 'NORMAL'),
    (v_tenant_id, v_project2_id, 'LTR-2025-038', 'تقرير إنجاز الكيلومتر 12-18',
     'OUTGOING', 'محافظة الفيوم', '2025-09-01', '2025-10-01', 'OVERDUE', 'URGENT')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- GUARANTEES (ضمانات)
  -- ══════════════════════════════════════
  insert into public.guarantees (tenant_id, project_id, number, type, type_ar, bank, value, issue_date, expiry_date, status) values
    (v_tenant_id, v_project1_id, 'PB-2024-001', 'PERFORMANCE_BOND', 'ضمان حسن تنفيذ',
     'بنك مصر', 9250000, '2024-01-15', '2025-12-31', 'ACTIVE'),
    (v_tenant_id, v_project1_id, 'AP-2024-001', 'ADVANCE_PAYMENT', 'ضمان استرداد سلفة',
     'البنك الأهلي المصري', 18500000, '2024-01-15', '2025-11-30', 'ACTIVE'),
    (v_tenant_id, v_project2_id, 'PB-2024-002', 'PERFORMANCE_BOND', 'ضمان حسن تنفيذ',
     'بنك القاهرة', 3350000, '2024-03-01', '2025-06-30', 'ACTIVE')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- NCRs
  -- ══════════════════════════════════════
  insert into public.ncrs (tenant_id, project_id, number, description, location, category, severity, status, raised_by, raised_at, due_date, assigned_to) values
    (v_tenant_id, v_project1_id, 'NCR-2025-001',
     'نسبة الدمك الرقمي KM 14+000 أقل من المطلوب (93.1% < 95%)',
     'KM 14+000', 'جودة دمك', 'HIGH', 'OPEN',
     'م. كريم طاهر', '2025-10-07', '2025-10-21', 'م. أحمد السيد'),
    (v_tenant_id, v_project1_id, 'NCR-2025-002',
     'عدم اتساق سُمك طبقة الرابط في قطاع 15-16',
     'KM 15+000 – 16+000', 'مواصفات أسفلت', 'MEDIUM', 'OPEN',
     'الاستشاري', '2025-09-28', '2025-10-15', 'م. أحمد السيد')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- QUALITY TESTS
  -- ══════════════════════════════════════
  insert into public.quality_tests (tenant_id, project_id, type, chainage, result, required, usl, lsl, status, location, tested_at) values
    (v_tenant_id, v_project1_id, 'دمك نووي', 'KM 12+500', 97.2, 95, 105, 95, 'PASS', 'طبقة الأساس', '2025-10-05'),
    (v_tenant_id, v_project1_id, 'دمك نووي', 'KM 13+000', 96.8, 95, 105, 95, 'PASS', 'طبقة الأساس', '2025-10-06'),
    (v_tenant_id, v_project1_id, 'اختبار مارشال', 'KM 11+200', 8.4, 8.0, 10, 8, 'PASS', 'طبقة الرابط', '2025-10-04'),
    (v_tenant_id, v_project1_id, 'دمك نووي', 'KM 14+000', 93.1, 95, 105, 95, 'FAIL', 'طبقة الأساس', '2025-10-07')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- VARIATION ORDERS
  -- ══════════════════════════════════════
  insert into public.variation_orders (tenant_id, project_id, number, description, value, type, status, submitted_at) values
    (v_tenant_id, v_project1_id, 'VO-2025-003', 'إضافة حواجز حماية في الكيلومتر 18-22',
     2850000, 'ADDITION', 'APPROVED', '2025-07-01'),
    (v_tenant_id, v_project1_id, 'VO-2025-002', 'تعديل مواصفات طبقة الأساس المجروش',
     -420000, 'DEDUCTION', 'UNDER_REVIEW', '2025-06-15')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- EOT REQUESTS
  -- ══════════════════════════════════════
  insert into public.eot_requests (tenant_id, project_id, code, cause, requested_days, granted_days, status, submitted_at, notes) values
    (v_tenant_id, v_project1_id, 'EOT-2025-001', 'أمطار غير معتادة — ديسمبر 2024',
     28, 21, 'PARTIAL', '2025-01-10', 'مُنح 21 يوماً من أصل 28 مطلوبة'),
    (v_tenant_id, v_project1_id, 'EOT-2025-002', 'تأخر توريد مواد الجير من المورد الحكومي',
     45, null, 'SUBMITTED', '2025-06-01', 'قيد مراجعة الاستشاري')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- SAFETY INCIDENTS
  -- ══════════════════════════════════════
  insert into public.safety_incidents (tenant_id, project_id, type, description, location, date, severity, status, reported_by) values
    (v_tenant_id, v_project1_id, 'إصابة بسيطة', 'إصابة في اليد أثناء أعمال الرصف',
     'KM 15+300', '2025-09-28', 'MINOR', 'OPEN', 'م. كريم طاهر'),
    (v_tenant_id, v_project1_id, 'حادثة معدات', 'انقلاب هزّاز أسفلت في منحنى الكيلومتر 20',
     'KM 20+100', '2025-08-14', 'MODERATE', 'CLOSED', 'م. أحمد السيد')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- MATERIALS
  -- ══════════════════════════════════════
  insert into public.materials (tenant_id, project_id, name, unit, ordered, delivered, used, stock, unit_cost, supplier) values
    (v_tenant_id, v_project1_id, 'أسفلت رابط (Binder AC 60/70)', 'طن',   8500,  7200,  7200, 0,    3800, 'شركة مصر للبترول'),
    (v_tenant_id, v_project1_id, 'ركام مجروش (Crushed Aggregate)','م³',  85000, 72000, 68000, 4000,  145, 'مقلع الجبل الأحمر'),
    (v_tenant_id, v_project1_id, 'رمل ناعم مغسول',               'م³',  35000, 35000, 33500, 1500,   65, 'شركة دلتا للرمال'),
    (v_tenant_id, v_project1_id, 'أنابيب صرف Ø60cm HDPE',        'م.ط',  4800,  4800,  4800, 0,    2200, 'شركة البلاستيك للصناعات')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- SUBCONTRACTORS
  -- ══════════════════════════════════════
  insert into public.subcontractors (tenant_id, project_id, name, specialty, contract_value, paid, progress, status, start_date, end_date) values
    (v_tenant_id, v_project1_id, 'شركة رمال المقاولات', 'أعمال التسوية',  12500000, 10800000, 100, 'COMPLETED', '2024-01-20', '2024-04-30'),
    (v_tenant_id, v_project1_id, 'مؤسسة النيل للإنشاءات','الجسور والمجازات',18000000, 11700000, 65,  'ACTIVE',    '2024-08-01', '2025-03-31'),
    (v_tenant_id, v_project1_id, 'شركة دلتا للأسفلت',   'أعمال الأسفلت',   9800000,  7200000, 78,  'ACTIVE',    '2024-09-15', '2025-02-28')
  on conflict do nothing;

  -- ══════════════════════════════════════
  -- DAILY LOGS (آخر 3 أيام)
  -- ══════════════════════════════════════
  insert into public.daily_logs (tenant_id, project_id, date, weather, works, workers, equipment, progress, issues, reported_by) values
    (v_tenant_id, v_project1_id, '2025-10-10', 'مشمس',
     'استكمال دمك طبقة الأساس KM 17+000 إلى KM 18+000 — 1 كم',
     68, '3 هزازات + 2 جرافة + 1 هزة تربة', 'تراكمي 61.2%', 'لا توجد', 'م. كريم طاهر'),
    (v_tenant_id, v_project1_id, '2025-10-09', 'غائم جزئياً',
     'صب طبقة الرابط KM 15+000 إلى KM 16+500 — 1.5 كم',
     82, '2 فينيشر + 3 هزازات + 4 شاحنات', 'اكتملت 1.5 كم إضافية', 'توقف 2 ساعة لانتظار الأسفلت', 'م. أحمد السيد')
  on conflict do nothing;

  raise notice '✅ تم إدراج البيانات التجريبية بنجاح للـ tenant: %', v_tenant_id;
end $$;
