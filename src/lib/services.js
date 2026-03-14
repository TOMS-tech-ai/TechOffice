/**
 * TECHOFFICE ERP — Supabase Service Layer
 * ════════════════════════════════════════
 * كل عمليات CRUD للـ 16 جدول مع audit log تلقائي
 */

import { supabase } from './supabaseClient';

// ── HELPER: Audit Logger ────────────────────────────────────────
async function audit(tenantId, user, entity, action, entityId, detail) {
  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    user_id:   user?.id,
    user_name: user?.name,
    user_role: user?.role,
    entity, action, detail,
    entity_id: entityId || null,
  });
}

// ── HELPER: Resolve tenant_id من الـ slug ──────────────────────
async function getTenantId(slug) {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id;
}

// ════════════════════════════════════════════════════════════════
// 1. PROJECTS
// ════════════════════════════════════════════════════════════════
export const ProjectsService = {

  async getAll(tenantId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(tenantId, payload, user) {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    await audit(tenantId, user, 'Project', 'CREATE', data.id,
      `إنشاء مشروع: ${data.name} — ${data.code}`);
    return data;
  },

  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await audit(tenantId, user, 'Project', 'UPDATE', id,
      `تحديث مشروع: ${data.name}`);
    return data;
  },

  async delete(id, user, tenantId, name) {
    const { error } = await supabase
      .from('projects').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Project', 'DELETE', id,
      `حذف مشروع: ${name}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 2. BOQ
// ════════════════════════════════════════════════════════════════
export const BOQService = {

  // جلب الـ sections والـ items معاً
  async getByProject(projectId) {
    const [{ data: sections, error: e1 }, { data: items, error: e2 }] =
      await Promise.all([
        supabase.from('boq_sections').select('*')
          .eq('project_id', projectId).order('sort_order'),
        supabase.from('boq_items').select('*')
          .eq('project_id', projectId).order('sort_order'),
      ]);
    if (e1 || e2) throw e1 || e2;
    return { sections, items };
  },

  async createSection(tenantId, projectId, payload, user) {
    const { data, error } = await supabase
      .from('boq_sections')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'BOQ', 'CREATE', data.id,
      `إضافة قسم BOQ: ${data.code} — ${data.title}`);
    return data;
  },

  async createItem(tenantId, projectId, sectionId, payload, user) {
    const { data, error } = await supabase
      .from('boq_items')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId, section_id: sectionId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'BOQ', 'CREATE', data.id,
      `إضافة بند BOQ: ${data.code} — ${data.description}`);
    return data;
  },

  async updateItem(id, payload, user, tenantId) {
    const { data, error } = await supabase
      .from('boq_items').update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'BOQ', 'UPDATE', id,
      `تحديث بند: ${data.code} — كمية منفذة: ${data.executed_qty}`);
    return data;
  },

  async deleteItem(id, user, tenantId, code) {
    const { error } = await supabase.from('boq_items').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'BOQ', 'DELETE', id, `حذف بند: ${code}`);
  },

  async deleteSection(id, user, tenantId, code) {
    const { error } = await supabase.from('boq_sections').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'BOQ', 'DELETE', id, `حذف قسم: ${code}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 3. EXTRACTS (المستخلصات) — حسابات تلقائية
// ════════════════════════════════════════════════════════════════
export const ExtractsService = {

  async getByProject(projectId) {
    const { data, error } = await supabase
      .from('extracts').select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // حساب المستخلص تلقائياً من الـ BOQ + إعدادات المشروع
  calcExtract({ project, boqItems, extraItems = [] }) {
    const baseWork        = boqItems.reduce((s, i) => s + (i.executed_qty * i.unit_rate), 0);
    const variationsAmt   = extraItems.reduce((s, i) => s + i.value, 0);
    const grossTotal      = baseWork + variationsAmt;
    const retentionAmt    = Math.min(
      grossTotal * (project.retention_pct / 100),
      (project.contract_value * project.retention_cap_pct) / 100
    );
    const advanceRecovery = grossTotal * (project.advance_recovery_pct / 100);
    const netBeforeVAT    = grossTotal - retentionAmt - advanceRecovery;
    const vatAmount       = netBeforeVAT * (project.vat_pct / 100);
    const netFinal        = netBeforeVAT + vatAmount;
    return {
      base_work:              baseWork,
      variations_amount:      variationsAmt,
      retention_this_extract: retentionAmt,
      advance_recovery:       advanceRecovery,
      net_before_vat:         netBeforeVAT,
      vat_amount:             vatAmount,
      net_final:              netFinal,
    };
  },

  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase
      .from('extracts')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Extract', 'CREATE', data.id,
      `إنشاء مستخلص ${data.number} — صافي: ${data.net_final?.toLocaleString('ar')} ج.م`);
    return data;
  },

  async updateStatus(id, status, user, tenantId, number) {
    const actionMap = {
      'SUBMITTED':    'SUBMIT',
      'UNDER_REVIEW': 'UPDATE',
      'APPROVED':     'APPROVE',
      'REJECTED':     'REJECT',
      'PAID':         'UPDATE',
    };
    const now = new Date().toISOString().split('T')[0];
    const patch = { status };
    if (status === 'APPROVED') patch.approved_at = now;
    if (status === 'PAID')     patch.paid_at = now;

    const { data, error } = await supabase
      .from('extracts').update(patch).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Extract', actionMap[status] || 'UPDATE', id,
      `${status} مستخلص ${number}`);
    return data;
  },

  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase
      .from('extracts').update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Extract', 'UPDATE', id,
      `تحديث مستخلص ${data.number}`);
    return data;
  },

  async delete(id, user, tenantId, number) {
    const { error } = await supabase.from('extracts').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Extract', 'DELETE', id, `حذف مستخلص ${number}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 4. LETTERS
// ════════════════════════════════════════════════════════════════
export const LettersService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('letters').select('*')
      .eq('project_id', projectId).order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('letters')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Letter', 'CREATE', data.id,
      `إنشاء مراسلة ${data.number} — ${data.subject}`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('letters')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Letter', 'UPDATE', id, `تحديث مراسلة ${data.number}`);
    return data;
  },
  async delete(id, user, tenantId, number) {
    const { error } = await supabase.from('letters').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Letter', 'DELETE', id, `حذف مراسلة ${number}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 5. VARIATION ORDERS
// ════════════════════════════════════════════════════════════════
export const VOService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('variation_orders').select('*')
      .eq('project_id', projectId).order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('variation_orders')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'VariationOrder', 'CREATE', data.id,
      `إنشاء أمر تغيير ${data.number} — ${data.value?.toLocaleString('ar')} ج.م`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('variation_orders')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'VariationOrder', 'UPDATE', id,
      `تحديث أمر تغيير ${data.number} — الحالة: ${data.status}`);
    return data;
  },
  async delete(id, user, tenantId, number) {
    const { error } = await supabase.from('variation_orders').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'VariationOrder', 'DELETE', id, `حذف أمر تغيير ${number}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 6. GUARANTEES
// ════════════════════════════════════════════════════════════════
export const GuaranteesService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('guarantees').select('*')
      .eq('project_id', projectId).order('expiry_date');
    if (error) throw error;
    return data;
  },
  // ضمانات تنتهي خلال X يوم
  async getExpiringSoon(tenantId, days = 90) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const { data, error } = await supabase.from('guarantees').select('*, projects(code,name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .lte('expiry_date', future.toISOString().split('T')[0])
      .order('expiry_date');
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('guarantees')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Guarantee', 'CREATE', data.id,
      `إضافة ضمان ${data.number} — ${data.type_ar} — ${data.value?.toLocaleString('ar')} ج.م`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('guarantees')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Guarantee', 'UPDATE', id, `تحديث ضمان ${data.number}`);
    return data;
  },
  async delete(id, user, tenantId, number) {
    const { error } = await supabase.from('guarantees').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Guarantee', 'DELETE', id, `حذف ضمان ${number}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 7. QUALITY TESTS
// ════════════════════════════════════════════════════════════════
export const QualityService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('quality_tests').select('*')
      .eq('project_id', projectId).order('tested_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('quality_tests')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'QualityTest', 'CREATE', data.id,
      `اختبار ${data.type} @ ${data.chainage} — النتيجة: ${data.result} (${data.status})`);
    return data;
  },
  async delete(id, user, tenantId, type, chainage) {
    const { error } = await supabase.from('quality_tests').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'QualityTest', 'DELETE', id,
      `حذف اختبار ${type} @ ${chainage}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 8. NCRs
// ════════════════════════════════════════════════════════════════
export const NCRService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('ncrs').select('*')
      .eq('project_id', projectId).order('raised_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('ncrs')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'NCR', 'CREATE', data.id,
      `فتح NCR ${data.number} — ${data.severity} — ${data.location}`);
    return data;
  },
  async close(id, payload, user, tenantId, number) {
    const { data, error } = await supabase.from('ncrs')
      .update({ ...payload, status: 'CLOSED', closed_at: new Date().toISOString().split('T')[0] })
      .eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'NCR', 'CLOSE', id, `إغلاق NCR ${number}`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('ncrs')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'NCR', 'UPDATE', id, `تحديث NCR ${data.number}`);
    return data;
  },
  async delete(id, user, tenantId, number) {
    const { error } = await supabase.from('ncrs').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'NCR', 'DELETE', id, `حذف NCR ${number}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 9. DRAWINGS
// ════════════════════════════════════════════════════════════════
export const DrawingsService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('drawings').select('*')
      .eq('project_id', projectId).order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('drawings')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Drawing', 'CREATE', data.id,
      `إضافة رسم ${data.number} — ${data.title}`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('drawings')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Drawing', 'UPDATE', id,
      `تحديث رسم ${data.number} — Rev. ${data.revision} — ${data.status}`);
    return data;
  },
  async delete(id, user, tenantId, number) {
    const { error } = await supabase.from('drawings').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Drawing', 'DELETE', id, `حذف رسم ${number}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 10. EOT REQUESTS
// ════════════════════════════════════════════════════════════════
export const EOTService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('eot_requests').select('*')
      .eq('project_id', projectId).order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('eot_requests')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'EOT', 'CREATE', data.id,
      `طلب تمديد ${data.code} — ${data.requested_days} يوم`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('eot_requests')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'EOT', 'UPDATE', id,
      `تحديث EOT ${data.code} — ${data.status} — ممنوح: ${data.granted_days || '—'} يوم`);
    return data;
  },
  async delete(id, user, tenantId, code) {
    const { error } = await supabase.from('eot_requests').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'EOT', 'DELETE', id, `حذف طلب تمديد ${code}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 11. SAFETY
// ════════════════════════════════════════════════════════════════
export const SafetyService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('safety_incidents').select('*')
      .eq('project_id', projectId).order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('safety_incidents')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Safety', 'CREATE', data.id,
      `حادثة ${data.severity} — ${data.type} @ ${data.location}`);
    return data;
  },
  async close(id, corrective_action, user, tenantId) {
    const { data, error } = await supabase.from('safety_incidents')
      .update({ status: 'CLOSED', corrective_action, closed_at: new Date().toISOString().split('T')[0] })
      .eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Safety', 'CLOSE', id, `إغلاق حادثة: ${data.type}`);
    return data;
  },
  async delete(id, user, tenantId, type) {
    const { error } = await supabase.from('safety_incidents').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Safety', 'DELETE', id, `حذف حادثة: ${type}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 12. MATERIALS
// ════════════════════════════════════════════════════════════════
export const MaterialsService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('materials').select('*')
      .eq('project_id', projectId).order('name');
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('materials')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Material', 'CREATE', data.id,
      `إضافة مادة: ${data.name}`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('materials')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Material', 'UPDATE', id, `تحديث مادة: ${data.name}`);
    return data;
  },
  async delete(id, user, tenantId, name) {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Material', 'DELETE', id, `حذف مادة: ${name}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 13. SUBCONTRACTORS
// ════════════════════════════════════════════════════════════════
export const SubService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from('subcontractors').select('*')
      .eq('project_id', projectId).order('name');
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('subcontractors')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Subcontractor', 'CREATE', data.id,
      `إضافة مقاول باطن: ${data.name}`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('subcontractors')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'Subcontractor', 'UPDATE', id,
      `تحديث مقاول: ${data.name} — تقدم: ${data.progress}%`);
    return data;
  },
  async delete(id, user, tenantId, name) {
    const { error } = await supabase.from('subcontractors').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'Subcontractor', 'DELETE', id, `حذف مقاول: ${name}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 14. DAILY LOGS
// ════════════════════════════════════════════════════════════════
export const DailyLogsService = {
  async getByProject(projectId, limit = 30) {
    const { data, error } = await supabase.from('daily_logs').select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  async create(tenantId, projectId, payload, user) {
    const { data, error } = await supabase.from('daily_logs')
      .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
      .select().single();
    if (error) throw error;
    await audit(tenantId, user, 'DailyLog', 'CREATE', data.id,
      `تمام يومي ${data.date} — ${data.workers} عامل`);
    return data;
  },
  async update(id, payload, user, tenantId) {
    const { data, error } = await supabase.from('daily_logs')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    await audit(tenantId, user, 'DailyLog', 'UPDATE', id, `تحديث تمام ${data.date}`);
    return data;
  },
  async delete(id, user, tenantId, date) {
    const { error } = await supabase.from('daily_logs').delete().eq('id', id);
    if (error) throw error;
    await audit(tenantId, user, 'DailyLog', 'DELETE', id, `حذف تمام ${date}`);
  },
};

// ════════════════════════════════════════════════════════════════
// 15. AUDIT LOG (قراءة فقط)
// ════════════════════════════════════════════════════════════════
export const AuditService = {
  async getRecent(tenantId, limit = 50) {
    const { data, error } = await supabase.from('audit_log').select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};

// ════════════════════════════════════════════════════════════════
// 16. DASHBOARD — إحصائيات مجمّعة
// ════════════════════════════════════════════════════════════════
export const DashboardService = {
  async getSummary(tenantId) {
    const today = new Date().toISOString().split('T')[0];
    const in90  = new Date(); in90.setDate(in90.getDate() + 90);

    const [projects, extracts, ncrs, guarantees, letters] = await Promise.all([
      supabase.from('projects').select('*').eq('tenant_id', tenantId),
      supabase.from('extracts').select('net_final,status').eq('tenant_id', tenantId),
      supabase.from('ncrs').select('status,severity').eq('tenant_id', tenantId),
      supabase.from('guarantees').select('expiry_date,status,value,type_ar')
        .eq('tenant_id', tenantId).eq('status', 'ACTIVE')
        .lte('expiry_date', in90.toISOString().split('T')[0]),
      supabase.from('letters').select('status').eq('tenant_id', tenantId)
        .eq('status', 'OVERDUE'),
    ]);

    return {
      projects:           projects.data || [],
      totalContractValue: (projects.data || []).reduce((s, p) => s + p.contract_value, 0),
      totalPaid:          (projects.data || []).reduce((s, p) => s + p.paid, 0),
      openNCRs:           (ncrs.data || []).filter(n => n.status === 'OPEN').length,
      highNCRs:           (ncrs.data || []).filter(n => n.status === 'OPEN' && n.severity === 'HIGH').length,
      expiringGuarantees: guarantees.data || [],
      overdueLetters:     (letters.data || []).length,
    };
  },
};
