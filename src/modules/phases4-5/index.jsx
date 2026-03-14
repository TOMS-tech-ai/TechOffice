import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from "recharts";

// ══════════════════════════════════════════════════════════════
// DESIGN SYSTEM — v4 Enhanced
// ══════════════════════════════════════════════════════════════
const C = {
  bg: "#040507", surface: "#06070b", card: "#0b0d12", card2: "#111318",
  border: "#181c2c", border2: "#1f2438",
  brand: "#f59e0b", brandDim: "#f59e0b1a", brandHover: "#fbbf24",
  success: "#22c55e", successDim: "#22c55e1a",
  danger: "#ef4444", dangerDim: "#ef44441a",
  warning: "#f97316", warningDim: "#f973161a",
  info: "#38bdf8", infoDim: "#38bdf81a",
  purple: "#a78bfa", purpleDim: "#a78bfa1a",
  teal: "#2dd4bf", tealDim: "#2dd4bf1a",
  emerald: "#10b981",
  text: "#e2e6f0", textSub: "#6e7a92", muted: "#3a4258",
  sidebar: "#05060a",
};

const fmt = (n, d = 0) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("ar-EG", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";
const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) : "0.0";

// ══════════════════════════════════════════════════════════════
// ⚡ API CLIENT LAYER — المرحلة الرابعة والخامسة
// كل دالة تتصل بـ Next.js API Route
// ══════════════════════════════════════════════════════════════
const API_BASE = "/api";

const api = {
  // ── Helpers ──────────────────────────────────────────────
  async _req(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  get: (path) => api._req("GET", path),
  post: (path, body) => api._req("POST", path, body),
  put: (path, body) => api._req("PUT", path, body),
  patch: (path, body) => api._req("PATCH", path, body),
  delete: (path) => api._req("DELETE", path),

  // ── Auth ─────────────────────────────────────────────────
  auth: {
    login: (email, password, totpToken) => api.post("/auth/login", { email, password, totpToken }),
    logout: () => api.post("/auth/logout"),
    refresh: () => api.post("/auth/refresh"),
    me: () => api.get("/auth/me"),
    setup2FA: () => api.post("/auth/2fa/setup"),
    verify2FA: (token) => api.post("/auth/2fa/verify", { token }),
  },

  // ── PHASE 4: Projects ────────────────────────────────────
  projects: {
    list: () => api.get("/projects"),
    get: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post("/projects", data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    stats: (id) => api.get(`/projects/${id}/stats`),
  },

  // ── PHASE 4: Extracts ────────────────────────────────────
  extracts: {
    list: (projectId) => api.get(`/projects/${projectId}/extracts`),
    get: (projectId, extractId) => api.get(`/projects/${projectId}/extracts/${extractId}`),
    create: (projectId, data) => api.post(`/projects/${projectId}/extracts`, data),
    update: (projectId, extractId, data) => api.put(`/projects/${projectId}/extracts/${extractId}`, data),
    approve: (projectId, extractId) => api.patch(`/projects/${projectId}/extracts/${extractId}/approve`),
    reject: (projectId, extractId, reason) => api.patch(`/projects/${projectId}/extracts/${extractId}/reject`, { reason }),
    calculate: (data) => api.post("/extracts/calculate", data),
    submitETA: (projectId, extractId) => api.post(`/projects/${projectId}/extracts/${extractId}/eta`),
  },

  // ── PHASE 4: BOQ ─────────────────────────────────────────
  boq: {
    sections: (projectId) => api.get(`/projects/${projectId}/boq/sections`),
    createSection: (projectId, data) => api.post(`/projects/${projectId}/boq/sections`, data),
    updateSection: (projectId, sId, data) => api.put(`/projects/${projectId}/boq/sections/${sId}`, data),
    deleteSection: (projectId, sId) => api.delete(`/projects/${projectId}/boq/sections/${sId}`),
    items: (projectId, sId) => api.get(`/projects/${projectId}/boq/sections/${sId}/items`),
    createItem: (projectId, sId, data) => api.post(`/projects/${projectId}/boq/sections/${sId}/items`, data),
    updateItem: (projectId, sId, itemId, data) => api.put(`/projects/${projectId}/boq/sections/${sId}/items/${itemId}`, data),
    deleteItem: (projectId, sId, itemId) => api.delete(`/projects/${projectId}/boq/sections/${sId}/items/${itemId}`),
  },

  // ── PHASE 5: Letters ─────────────────────────────────────
  letters: {
    list: (projectId) => api.get(`/projects/${projectId}/letters`),
    create: (projectId, data) => api.post(`/projects/${projectId}/letters`, data),
    update: (projectId, id, data) => api.put(`/projects/${projectId}/letters/${id}`, data),
    close: (projectId, id, note) => api.patch(`/projects/${projectId}/letters/${id}/close`, { note }),
    delete: (projectId, id) => api.delete(`/projects/${projectId}/letters/${id}`),
  },

  // ── PHASE 5: Guarantees ──────────────────────────────────
  guarantees: {
    list: (projectId) => api.get(`/projects/${projectId}/guarantees`),
    listExpiring: (days = 90) => api.get(`/guarantees/expiring?days=${days}`),
    create: (projectId, data) => api.post(`/projects/${projectId}/guarantees`, data),
    update: (projectId, id, data) => api.put(`/projects/${projectId}/guarantees/${id}`, data),
    release: (projectId, id) => api.patch(`/projects/${projectId}/guarantees/${id}/release`),
    delete: (projectId, id) => api.delete(`/projects/${projectId}/guarantees/${id}`),
  },

  // ── PHASE 5: Variation Orders ────────────────────────────
  variationOrders: {
    list: (projectId) => api.get(`/projects/${projectId}/variation-orders`),
    create: (projectId, data) => api.post(`/projects/${projectId}/variation-orders`, data),
    update: (projectId, id, data) => api.put(`/projects/${projectId}/variation-orders/${id}`, data),
    approve: (projectId, id) => api.patch(`/projects/${projectId}/variation-orders/${id}/approve`),
    reject: (projectId, id, reason) => api.patch(`/projects/${projectId}/variation-orders/${id}/reject`, { reason }),
    delete: (projectId, id) => api.delete(`/projects/${projectId}/variation-orders/${id}`),
  },

  // ── PHASE 5: Quality Tests ───────────────────────────────
  qualityTests: {
    list: (projectId) => api.get(`/projects/${projectId}/quality-tests`),
    create: (projectId, data) => api.post(`/projects/${projectId}/quality-tests`, data),
    update: (projectId, id, data) => api.put(`/projects/${projectId}/quality-tests/${id}`, data),
    spcAnalysis: (projectId, type) => api.get(`/projects/${projectId}/quality-tests/spc?type=${type}`),
  },

  // ── Audit Log ────────────────────────────────────────────
  auditLog: {
    list: (page = 1, limit = 50) => api.get(`/audit-log?page=${page}&limit=${limit}`),
    export: () => api.get("/audit-log/export"),
  },
};

// ══════════════════════════════════════════════════════════════
// 🧮 EGYPTIAN EXTRACT FORMULA — المعادلة المصرية الدقيقة
// ══════════════════════════════════════════════════════════════
function calcEgyptianExtract({
  contractValue, baseWork, variationsAmount = 0,
  retentionPercent = 5, retentionCapPercent = 10,
  advanceRecoveryPercent = 4, vatPercent = 14,
  retentionCumulativeBefore = 0, advanceRemainingBefore = 0,
  fines = 0, otherDeductions = 0,
}) {
  const r2 = (n) => Math.round(n * 100) / 100;
  const warnings = [];

  // الخطوة 1: الإجمالي
  const grossTotal = r2(baseWork + variationsAmount);

  // الخطوة 2: الاحتجاز
  const retentionCapAmount = r2(contractValue * retentionCapPercent / 100);
  const retentionAvailable = r2(Math.max(0, retentionCapAmount - retentionCumulativeBefore));
  const retentionCalc = r2(grossTotal * retentionPercent / 100);
  const retentionThisExtract = r2(Math.min(retentionCalc, retentionAvailable));

  if (retentionAvailable === 0) warnings.push({ type: "info", msg: "تم الوصول للحد الأقصى للاحتجاز — لا يُستقطع احتجاز" });
  else if (retentionThisExtract < retentionCalc) warnings.push({ type: "info", msg: `الاحتجاز مُخفَّض من ${fmt(retentionCalc)} إلى ${fmt(retentionThisExtract)} (الحد المتبقي)` });

  // الخطوة 3: استرجاع السلفة (على الأعمال الأساسية فقط)
  const advanceRecoveryGross = r2(baseWork * advanceRecoveryPercent / 100);
  const advanceRecoveryActual = r2(Math.min(advanceRecoveryGross, advanceRemainingBefore));
  if (advanceRemainingBefore === 0) warnings.push({ type: "info", msg: "السلفة مسددة بالكامل" });
  else if (advanceRecoveryActual < advanceRecoveryGross) warnings.push({ type: "info", msg: `رصيد السلفة (${fmt(advanceRemainingBefore)}) أقل من المستحق — يُستقطع الرصيد كاملاً` });

  // الخطوة 4: الصافي
  const netBeforeVAT = r2(grossTotal - retentionThisExtract - advanceRecoveryActual - fines - otherDeductions);
  if (netBeforeVAT < 0) warnings.push({ type: "error", msg: `الصافي قبل الضريبة سالب! (${fmt(netBeforeVAT)})` });
  const vatAmount = r2(Math.max(0, netBeforeVAT) * vatPercent / 100);
  const netFinal = r2(Math.max(0, netBeforeVAT) + vatAmount);

  return {
    grossTotal, retentionCapAmount, retentionAvailable,
    retentionThisExtract, advanceRecoveryGross, advanceRecoveryActual,
    netBeforeVAT, vatAmount, netFinal,
    retentionCumulativeAfter: r2(retentionCumulativeBefore + retentionThisExtract),
    advanceRemainingAfter: r2(Math.max(0, advanceRemainingBefore - advanceRecoveryActual)),
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE UTILITIES — Hook مشترك لكل الصفحات
// ═══════════════════════════════════════════════════════════════

// جلب بيانات جدول مرتبط بمشروع مع fallback للـ MOCK
function useSupabaseTable(table, projectId, mockData, orderCol = 'created_at') {
  const [data, setData] = useState(mockData || []);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) { setData(mockData || []); return; }
    setBusy(true);
    try {
      const { supabase } = await import('@lib/supabaseClient');
      const { data: rows, error } = await supabase
        .from(table).select('*')
        .eq('project_id', projectId)
        .order(orderCol, { ascending: false });
      if (!error && rows) setData(rows.length ? rows : (mockData || []));
    } catch (_) { setData(mockData || []); }
    finally { setBusy(false); }
  }, [table, projectId]); // ← لما projectId يتغير يعيد الجلب تلقائياً

  useEffect(() => { load(); }, [load]);
  return { data, setData, busy, reload: load };
}

// حفظ (إنشاء أو تعديل) في Supabase مع MOCK fallback
async function sbUpsert(table, payload, editId, tenantId, projectId) {
  try {
    const { supabase } = await import('@lib/supabaseClient');
    if (editId) {
      const { data, error } = await supabase
        .from(table).update(payload).eq('id', editId).select().single();
      if (error) throw error;
      return { ok: true, data };
    } else {
      const { data, error } = await supabase
        .from(table)
        .insert({ ...payload, tenant_id: tenantId, project_id: projectId })
        .select().single();
      if (error) throw error;
      return { ok: true, data };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// حذف من Supabase
async function sbRemove(table, id) {
  try {
    const { supabase } = await import('@lib/supabaseClient');
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// تحديث حالة فقط
async function sbPatch(table, id, patch) {
  try {
    const { supabase } = await import('@lib/supabaseClient');
    const { data, error } = await supabase
      .from(table).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// MOCK DATA (Seed — يُستبدل بـ API في الإنتاج)
// ══════════════════════════════════════════════════════════════
const MOCK = {
  user: { id: "u1", name: "خالد إبراهيم", role: "ADMIN", company: "شركة نيل رودز للطرق", taxId: "203-456-789" },
  projects: [
    { id: "p1", code: "NR-2024-01", name: "طريق القاهرة الإسكندرية الصحراوي — المرحلة الثالثة", client: "الهيئة العامة للطرق والكباري", consultant: "شركة المهندسون المتحدون", contractValue: 185000000, paid: 112400000, progress: 61.2, plannedProgress: 67.0, status: "EXECUTION", startDate: "2024-01-15", contractEnd: "2025-06-30", eotDays: 45, pm: "م. أحمد السيد", zone: "المنطقة الغربية", length: 42.5, chainageFrom: 280, chainageTo: 322, retentionPercent: 5, retentionCapPercent: 10, advancePercent: 10, advanceRecoveryPercent: 4, vatPercent: 14, totalRetained: 9246000, advanceRemaining: 8500000 },
    { id: "p2", code: "NR-2024-02", name: "رصف طريق الفيوم الجديد", client: "محافظة الفيوم", consultant: "", contractValue: 67000000, paid: 58200000, progress: 87.4, plannedProgress: 85.0, status: "EXECUTION", startDate: "2024-03-01", contractEnd: "2024-12-31", eotDays: 0, pm: "م. كريم طاهر", zone: "المنطقة الجنوبية", length: 18.2, chainageFrom: 0, chainageTo: 18, retentionPercent: 5, retentionCapPercent: 10, advancePercent: 10, advanceRecoveryPercent: 4, vatPercent: 14, totalRetained: 3350000, advanceRemaining: 0 },
    { id: "p3", code: "NR-2023-05", name: "إعادة تأهيل طريق الإسماعيلية الصحراوي", client: "وزارة النقل", consultant: "", contractValue: 240000000, paid: 240000000, progress: 100, plannedProgress: 100, status: "COMPLETED", startDate: "2023-01-10", contractEnd: "2024-03-31", eotDays: 60, pm: "م. محمود فاروق", zone: "المنطقة الشرقية", length: 65.0, chainageFrom: 0, chainageTo: 65, retentionPercent: 5, retentionCapPercent: 10, advancePercent: 10, advanceRecoveryPercent: 4, vatPercent: 14, totalRetained: 24000000, advanceRemaining: 0 },
  ],
  extracts: [
    { id: "e1", projectId: "p1", number: "M-07", month: "يوليو 2025", baseWork: 8500000, variationsAmount: 650000, retentionThisExtract: 457500, advanceRecoveryActual: 340000, fines: 0, grossTotal: 9150000, netBeforeVAT: 8352500, vatAmount: 1169350, netFinal: 9521850, status: "UNDER_REVIEW", submittedAt: "2025-07-25" },
    { id: "e2", projectId: "p1", number: "M-06", month: "يونيو 2025", baseWork: 7200000, variationsAmount: 420000, retentionThisExtract: 381000, advanceRecoveryActual: 288000, fines: 0, grossTotal: 7620000, netBeforeVAT: 6951000, vatAmount: 973140, netFinal: 7924140, status: "APPROVED", submittedAt: "2025-06-28" },
    { id: "e3", projectId: "p2", number: "M-10", month: "أكتوبر 2025", baseWork: 5800000, variationsAmount: 0, retentionThisExtract: 290000, advanceRecoveryActual: 232000, fines: 50000, grossTotal: 5800000, netBeforeVAT: 5228000, vatAmount: 731920, netFinal: 5959920, status: "PAID", submittedAt: "2025-10-30" },
    { id: "e4", projectId: "p1", number: "M-05", month: "مايو 2025", baseWork: 6900000, variationsAmount: 380000, retentionThisExtract: 364000, advanceRecoveryActual: 276000, fines: 0, grossTotal: 7280000, netBeforeVAT: 6640000, vatAmount: 929600, netFinal: 7569600, status: "PAID", submittedAt: "2025-05-30" },
  ],
  letters: [
    { id: "l1", projectId: "p1", number: "LTR-2025-047", subject: "المطالبة بتعديل أسعار مواد الأسفلت", type: "OUTGOING", toFrom: "الهيئة العامة للطرق والكباري", date: "2025-09-15", dueDate: "2025-10-15", status: "OVERDUE", priority: "URGENT" },
    { id: "l2", projectId: "p1", number: "LTR-2025-046", subject: "طلب الموافقة على مصدر الركام المستخدم", type: "OUTGOING", toFrom: "الاستشاري", date: "2025-09-10", dueDate: "2025-10-10", status: "PENDING", priority: "NORMAL" },
    { id: "l3", projectId: "p2", number: "LTR-2025-038", subject: "تقرير إنجاز الكيلومتر 12-18", type: "OUTGOING", toFrom: "محافظة الفيوم", date: "2025-09-01", dueDate: "2025-10-01", status: "OVERDUE", priority: "URGENT" },
    { id: "l4", projectId: "p1", number: "LTR-2025-031", subject: "الرد على ملاحظات الاستشاري بشأن الطبقة الأساسية", type: "INCOMING", toFrom: "شركة نيل رودز", date: "2025-08-20", dueDate: "2025-09-20", status: "CLOSED", priority: "NORMAL" },
  ],
  variationOrders: [
    { id: "v1", projectId: "p1", number: "VO-2025-003", description: "إضافة حواجز حماية في الكيلومتر 18-22", value: 2850000, status: "APPROVED", type: "ADDITION", submittedAt: "2025-07-01" },
    { id: "v2", projectId: "p1", number: "VO-2025-002", description: "تعديل مواصفات طبقة الأساس المجروش", value: -420000, status: "UNDER_REVIEW", type: "DEDUCTION", submittedAt: "2025-06-15" },
    { id: "v3", projectId: "p2", number: "VO-2025-001", description: "إضافة لوحات إرشادية ومتطلبات السلامة", value: 680000, status: "APPROVED", type: "ADDITION", submittedAt: "2025-04-20" },
  ],
  guarantees: [
    { id: "g1", projectId: "p1", number: "PB-2024-001", type: "PERFORMANCE_BOND", typeAr: "ضمان حسن تنفيذ", bank: "بنك مصر", value: 9250000, issueDate: "2024-01-15", expiryDate: "2025-12-31", status: "ACTIVE" },
    { id: "g2", projectId: "p1", number: "AP-2024-001", type: "ADVANCE_PAYMENT", typeAr: "ضمان استرداد سلفة", bank: "البنك الأهلي المصري", value: 18500000, issueDate: "2024-01-15", expiryDate: "2025-11-30", status: "ACTIVE" },
    { id: "g3", projectId: "p2", number: "PB-2024-002", type: "PERFORMANCE_BOND", typeAr: "ضمان حسن تنفيذ", bank: "بنك القاهرة", value: 3350000, issueDate: "2024-03-01", expiryDate: "2025-02-28", status: "EXPIRED" },
  ],
  qualityTests: [
    { id: "qt1", projectId: "p1", type: "دمك نووي", chainage: "KM 12+500", result: 97.2, required: 95, usl: 105, lsl: 95, status: "PASS", testedAt: "2025-10-05", location: "طبقة الأساس" },
    { id: "qt2", projectId: "p1", type: "دمك نووي", chainage: "KM 13+000", result: 96.8, required: 95, usl: 105, lsl: 95, status: "PASS", testedAt: "2025-10-06", location: "طبقة الأساس" },
    { id: "qt3", projectId: "p1", type: "اختبار مارشال", chainage: "KM 11+200", result: 8.4, required: 8.0, usl: 10, lsl: 8, status: "PASS", testedAt: "2025-10-04", location: "طبقة الرابط" },
    { id: "qt4", projectId: "p1", type: "دمك نووي", chainage: "KM 14+000", result: 93.1, required: 95, usl: 105, lsl: 95, status: "FAIL", testedAt: "2025-10-07", location: "طبقة الأساس" },
    { id: "qt5", projectId: "p2", type: "CBR", chainage: "KM 8+000", result: 82, required: 80, usl: 100, lsl: 80, status: "PASS", testedAt: "2025-10-03", location: "تربة طبيعية" },
    { id: "qt6", projectId: "p1", type: "دمك نووي", chainage: "KM 15+000", result: 97.5, required: 95, usl: 105, lsl: 95, status: "PASS", testedAt: "2025-10-08", location: "طبقة الأساس" },
    { id: "qt7", projectId: "p1", type: "دمك نووي", chainage: "KM 16+000", result: 98.1, required: 95, usl: 105, lsl: 95, status: "PASS", testedAt: "2025-10-09", location: "طبقة الأساس" },
    { id: "qt8", projectId: "p1", type: "دمك نووي", chainage: "KM 17+000", result: 95.8, required: 95, usl: 105, lsl: 95, status: "PASS", testedAt: "2025-10-10", location: "طبقة الأساس" },
  ],
  boqSections: [
    { id: "bs1", projectId: "p1", code: "A", title: "أعمال التسوية والردم" },
    { id: "bs2", projectId: "p1", code: "B", title: "طبقات الأساس والتحضير" },
    { id: "bs3", projectId: "p1", code: "C", title: "طبقات الأسفلت" },
    { id: "bs4", projectId: "p1", code: "D", title: "أعمال الصرف والبنية التحتية" },
    { id: "bs5", projectId: "p1", code: "E", title: "الجسور والمجازات" },
  ],
  boqItems: [
    { id: "q1", sId: "bs1", code: "A-01", desc: "حفر وتسوية التربة الطبيعية", unit: "م³", qty: 185000, rate: 42, exQty: 185000 },
    { id: "q2", sId: "bs1", code: "A-02", desc: "ردم وتنعيم بمواد انتقائية", unit: "م³", qty: 120000, rate: 65, exQty: 95000 },
    { id: "q3", sId: "bs2", code: "B-01", desc: "طبقة Subbase إسفلت مدموكة t=20cm", unit: "م²", qty: 210000, rate: 88, exQty: 210000 },
    { id: "q4", sId: "bs2", code: "B-02", desc: "طبقة أساس ركام مجروش t=25cm", unit: "م²", qty: 210000, rate: 145, exQty: 175000 },
    { id: "q5", sId: "bs3", code: "C-01", desc: "طبقة رابط بيتوميني (Binder) t=6cm", unit: "طن", qty: 8500, rate: 3800, exQty: 7200 },
    { id: "q6", sId: "bs3", code: "C-02", desc: "طبقة رصف نهائية (Wearing) t=4cm", unit: "طن", qty: 5800, rate: 4200, exQty: 2800 },
    { id: "q7", sId: "bs4", code: "D-01", desc: "توريد وتركيب مواسير صرف Ø60cm", unit: "م.ط", qty: 4800, rate: 2200, exQty: 4800 },
    { id: "q8", sId: "bs5", code: "E-01", desc: "إنشاء جسر خرساني مسلح KM 18+400", unit: "إجمالي", qty: 1, rate: 12500000, exQty: 0.88 },
  ],
  safetyIncidents: [
    { id: "s1", projectId: "p1", type: "إصابة بسيطة", description: "إصابة في اليد أثناء أعمال الرصف", date: "2025-09-28", status: "OPEN", severity: "MINOR", location: "KM 15+300" },
    { id: "s2", projectId: "p1", type: "حادثة معدات", description: "انقلاب هزّاز أسفلت في منحنى الكيلومتر 20", date: "2025-08-14", status: "CLOSED", severity: "MODERATE", location: "KM 20+100" },
  ],
  eotRequests: [
    { id: "eot1", projectId: "p1", code: "EOT-2025-002", cause: "أمطار غير معتادة — ديسمبر 2024", requestedDays: 28, grantedDays: 21, status: "PARTIAL", submittedAt: "2025-01-10" },
    { id: "eot2", projectId: "p1", code: "EOT-2025-003", cause: "تأخر توريد مواد الجير من المورد الحكومي", requestedDays: 45, grantedDays: null, status: "SUBMITTED", submittedAt: "2025-06-01" },
  ],
  auditLog: [
    { id: "a1", user: "خالد إبراهيم", role: "ADMIN", entity: "Extract", action: "CREATE", detail: "إنشاء مستخلص M-07 — NR-2024-01 — الصافي 8,352,500 ج.م", ts: "2025-10-10 14:32", color: C.success },
    { id: "a2", user: "كريم طاهر", role: "ENGINEER", entity: "QualityTest", action: "CREATE", detail: "إضافة اختبار دمك KM 17+000 — 95.8% ✓", ts: "2025-10-10 11:15", color: C.success },
    { id: "a3", user: "أحمد السيد", role: "MANAGER", entity: "Extract", action: "APPROVE", detail: "اعتماد المستخلص M-06", ts: "2025-10-09 16:45", color: C.info },
    { id: "a4", user: "كريم طاهر", role: "ENGINEER", entity: "NCR", action: "CREATE", detail: "فتح NCR-2025-001 — KM 14+000", ts: "2025-10-08 09:22", color: C.success },
    { id: "a5", user: "خالد إبراهيم", role: "ADMIN", entity: "Letter", action: "CREATE", detail: "إنشاء LTR-2025-047 — طلب تعديل أسعار", ts: "2025-09-15 10:10", color: C.success },
    { id: "a6", user: "أحمد السيد", role: "MANAGER", entity: "VariationOrder", action: "APPROVE", detail: "اعتماد VO-2025-003 — 2,850,000 ج.م", ts: "2025-09-12 13:00", color: C.info },
  ],
  cashFlow: [
    { month: "يناير", planned: 12000000, actual: 10500000 }, { month: "فبراير", planned: 14000000, actual: 13200000 },
    { month: "مارس", planned: 16000000, actual: 15800000 }, { month: "أبريل", planned: 18000000, actual: 17100000 },
    { month: "مايو", planned: 20000000, actual: 19500000 }, { month: "يونيو", planned: 19000000, actual: 18200000 },
    { month: "يوليو", planned: 17000000, actual: 15900000 }, { month: "أغسطس", planned: 15000000, actual: 14300000 },
    { month: "سبتمبر", planned: 16000000, actual: 15100000 }, { month: "أكتوبر", planned: 18000000, actual: null },
  ],
};

// ══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ══════════════════════════════════════════════════════════════
const Badge = ({ text, color }) => {
  const map = {
    UNDER_REVIEW: C.info, قيد_المراجعة: C.info, "قيد المراجعة": C.info,
    APPROVED: C.success, معتمد: C.success, PAID: C.brand, مدفوع: C.brand,
    OVERDUE: C.danger, متأخر: C.danger, CLOSED: C.muted, مغلق: C.muted,
    PENDING: C.warning, "قيد الانتظار": C.warning,
    ACTIVE: C.success, نشط: C.success, EXPIRED: C.muted, منتهي: C.muted,
    PARTIAL: C.warning, SUBMITTED: C.purple, DRAFT: C.muted,
    PASS: C.success, ناجح: C.success, FAIL: C.danger, راسب: C.danger,
    ADDITION: C.success, إضافة: C.success, DEDUCTION: C.danger, حذف: C.danger,
    EXECUTION: C.warning, تنفيذ: C.warning, COMPLETED: C.success, مكتمل: C.success,
    REJECTED: C.danger, مرفوض: C.danger,
  };
  const c = color || map[text] || C.textSub;
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: c + "22", color: c, border: `1px solid ${c}44`, whiteSpace: "nowrap" }}>{text}</span>;
};

const Stat = ({ label, value, sub, icon, color = C.brand }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ fontSize: 10, color: C.textSub }}>{label}</span>
      <span style={{ fontSize: 18 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.5px", marginTop: 6 }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{sub}</div>}
  </div>
);

const Card = ({ children, style, glow }) => (
  <div style={{ background: C.card, border: `1px solid ${glow ? glow + "44" : C.border}`, borderRadius: 10, padding: 16, boxShadow: glow ? `0 0 24px ${glow}18` : "none", ...style }}>{children}</div>
);

const Btn = ({ children, onClick, variant = "solid", color, size = "sm", style: s, disabled }) => {
  const [hov, setHov] = useState(false);
  const col = color || C.brand;
  const base = { cursor: disabled ? "not-allowed" : "pointer", border: "none", borderRadius: 6, fontFamily: "inherit", fontWeight: 700, transition: "all 0.15s", opacity: disabled ? 0.5 : 1 };
  const sizes = { xs: { fontSize: 9, padding: "3px 10px" }, sm: { fontSize: 10, padding: "5px 14px" }, md: { fontSize: 11, padding: "8px 20px" } };
  const variants = {
    solid: { background: hov && !disabled ? C.brandHover : col, color: col === C.brand ? "#000" : "#fff" },
    outline: { background: "transparent", color: hov ? col : C.textSub, border: `1px solid ${hov ? col : C.border}` },
    ghost: { background: hov ? col + "18" : "transparent", color: hov ? col : C.textSub },
    danger: { background: hov ? "#dc2626" : C.danger, color: "#fff" },
    success: { background: hov ? "#16a34a" : C.success, color: "#fff" },
    info: { background: hov ? "#0284c7" : C.info, color: "#000" },
  };
  return <button style={{ ...base, ...sizes[size], ...variants[variant], ...s }} onClick={!disabled ? onClick : undefined} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</button>;
};

const Input = ({ value, onChange, placeholder, type = "text", style: s, disabled }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
    style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 11, fontFamily: "inherit", width: "100%", outline: "none", ...s }} />
);

const Textarea = ({ value, onChange, rows = 3, placeholder }) => (
  <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
    style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 11, fontFamily: "inherit", width: "100%", outline: "none", resize: "vertical" }} />
);

const Select = ({ value, onChange, children, style: s, disabled }) => (
  <select value={value} onChange={onChange} disabled={disabled}
    style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 11, fontFamily: "inherit", outline: "none", width: "100%", ...s }}>{children}</select>
);

const Modal = ({ open, onClose, title, children, width = 580 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width, maxWidth: "96vw", maxHeight: "92vh", overflow: "auto", padding: 26, boxShadow: "0 24px 60px #000c" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Fld = ({ label, children, req, half, third }) => {
  const w = third ? "calc(33% - 8px)" : half ? "calc(50% - 6px)" : "100%";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, width: w }}>
      <label style={{ fontSize: 10, color: C.textSub, fontWeight: 600 }}>{label}{req && <span style={{ color: C.danger }}> *</span>}</label>
      {children}
    </div>
  );
};

const TblWrap = ({ children }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>{children}</table>
  </div>
);
const Th = ({ children, s }) => <th style={{ padding: "10px 14px", textAlign: "right", color: C.textSub, fontWeight: 700, fontSize: 9, borderBottom: `1px solid ${C.border}`, background: "#040507", whiteSpace: "nowrap", ...s }}>{children}</th>;
const Td = ({ children, s, colSpan }) => <td colSpan={colSpan} style={{ padding: "10px 14px", color: C.text, borderBottom: `1px solid ${C.border}22`, verticalAlign: "middle", ...s }}>{children}</td>;

const ProgressBar = ({ value, color = C.brand, height = 6 }) => (
  <div style={{ background: C.border, borderRadius: height, height, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.5s ease" }} />
  </div>
);

const SectionHdr = ({ children, action, sub }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
    <div>
      <span style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{children}</span>
      {sub && <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>{sub}</div>}
    </div>
    {action && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{action}</div>}
  </div>
);

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, padding: "0 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: "10px 16px", background: "none", border: "none", cursor: "pointer", color: active === t.id ? C.brand : C.textSub, fontWeight: active === t.id ? 700 : 400, fontSize: 11, fontFamily: "inherit", borderBottom: active === t.id ? `2px solid ${C.brand}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>{t.label}</button>
    ))}
  </div>
);

const Toast = ({ toasts }) => (
  <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
    {toasts.map(t => (
      <div key={t.id} style={{ background: t.type === "success" ? "#064e3b" : t.type === "info" ? "#0c4a6e" : "#450a0a", color: t.type === "success" ? C.success : t.type === "info" ? C.info : C.danger, border: `1px solid ${t.type === "success" ? C.success : t.type === "info" ? C.info : C.danger}44`, padding: "10px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, boxShadow: "0 4px 20px #0009", display: "flex", gap: 8, alignItems: "center" }}>
        <span>{t.type === "success" ? "✓" : t.type === "info" ? "ℹ" : "✕"}</span>
        {t.msg}
      </div>
    ))}
  </div>
);

const CalcRow = ({ label, value, color, bold, indent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderBottom: `1px solid ${C.border}22`, paddingRight: indent ? 24 : 12 }}>
    <span style={{ fontSize: 10, color: bold ? C.text : C.textSub, fontWeight: bold ? 700 : 400 }}>{label}</span>
    <span style={{ fontSize: 11, color: color || (bold ? C.text : C.textSub), fontWeight: bold ? 800 : 500, fontFamily: "monospace" }}>{fmt(value, 2)}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard() {
  const totalCV = MOCK.projects.reduce((s, p) => s + p.contractValue, 0);
  const totalPaid = MOCK.projects.reduce((s, p) => s + p.paid, 0);
  const overdue = MOCK.letters.filter(l => l.status === "OVERDUE").length;
  const expiring = MOCK.guarantees.filter(g => g.status === "ACTIVE" && daysLeft(g.expiryDate) <= 90).length;
  const radarData = [
    { subject: "الجودة", A: 94 }, { subject: "السلامة", A: 88 }, { subject: "التقدم", A: 74 },
    { subject: "التدفق النقدي", A: 85 }, { subject: "التسليم", A: 70 }, { subject: "الوثائق", A: 82 },
  ];
  const PIE_COLORS = [C.brand, C.success, C.info, C.purple];
  const pieData = MOCK.projects.map(p => ({ name: p.code, value: p.contractValue }));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Stat label="إجمالي قيم العقود" value={`${fmt(totalCV / 1e6, 1)} م ج.م`} icon="💼" color={C.brand} />
        <Stat label="المحصّل الفعلي" value={`${fmt(totalPaid / 1e6, 1)} م ج.م`} sub={`${pct(totalPaid, totalCV)}% من قيمة العقود`} icon="💳" color={C.success} />
        <Stat label="مراسلات متأخرة" value={overdue} icon="📨" color={overdue > 0 ? C.danger : C.success} />
        <Stat label="ضمانات تنتهي ≤90 يوم" value={expiring} icon="🔐" color={expiring > 0 ? C.warning : C.success} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 12 }}>💵 التدفق النقدي — مخطط / فعلي (مليون ج.م)</div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={MOCK.cashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 9 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}م`} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10 }} formatter={v => v ? [`${fmt(v)} ج.م`] : ["—"]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="planned" fill={C.brand + "66"} name="مخطط" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="actual" stroke={C.success} strokeWidth={2} dot={{ fill: C.success, r: 3 }} name="فعلي" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 14 }}>🎯 مؤشرات الأداء</div>
          <ResponsiveContainer width="100%" height={190}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: C.muted, fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar name="الأداء" dataKey="A" stroke={C.brand} fill={C.brand} fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {MOCK.projects.map(p => {
          const behind = p.plannedProgress - p.progress;
          return (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: C.brand, fontWeight: 800, fontSize: 13 }}>{p.code}</span>
                <Badge text={p.status === "EXECUTION" ? "تنفيذ" : "مكتمل"} color={p.status === "EXECUTION" ? C.warning : C.success} />
              </div>
              <div style={{ fontSize: 10, color: C.textSub, marginBottom: 12, lineHeight: 1.6 }}>{p.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: C.muted }}>التقدم الفعلي</span>
                    <span style={{ fontSize: 10, color: behind > 5 ? C.danger : behind > 0 ? C.warning : C.success, fontWeight: 700 }}>{p.progress}% {behind > 0 ? `↓${behind.toFixed(1)}%` : "✓"}</span>
                  </div>
                  <ProgressBar value={p.progress} color={behind > 5 ? C.danger : behind > 0 ? C.warning : C.brand} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: C.muted }}>التحصيل</span>
                    <span style={{ fontSize: 10, color: C.success, fontWeight: 700 }}>{pct(p.paid, p.contractValue)}%</span>
                  </div>
                  <ProgressBar value={parseFloat(pct(p.paid, p.contractValue))} color={C.success} />
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 9, color: C.muted }}>{fmt(p.contractValue / 1e6, 1)} م ج.م | {p.length} كم | {fmtDate(p.contractEnd)}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJECTS — Phase 4: Full CRUD ✨
// ══════════════════════════════════════════════════════════════
function ProjectsScreen({ addToast, user, tenantId }) {
  const [projects, setProjects] = useState([]);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  const EMPTY = { code: "", name: "", client: "", consultant: "", contract_value: "", status: "EXECUTION", start_date: "", contract_end: "", pm: "", zone: "", length_km: "", chainage_from: "", chainage_to: "", retention_pct: 5, retention_cap_pct: 10, advance_pct: 10, advance_recovery_pct: 4, vat_pct: 14 };
  const [form, setForm] = useState(EMPTY);

  // ── جلب المشاريع من Supabase ────────────────────────────────
  const loadProjects = async () => {
    if (!tenantId) return;
    setFetching(true);
    try {
      const { data, error } = await import('@lib/supabaseClient')
        .then(m => m.supabase.from('projects').select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }));
      if (error) throw error;
      setProjects(data || []);
    } catch (e) {
      addToast('خطأ في تحميل المشاريع: ' + e.message, 'error');
      // Fallback للـ MOCK في حالة عدم الاتصال
      setProjects(MOCK.projects);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadProjects(); }, [tenantId]);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit   = (p) => {
    setForm({
      code: p.code, name: p.name, client: p.client || '', consultant: p.consultant || '',
      contract_value: p.contract_value, status: p.status, start_date: p.start_date || '',
      contract_end: p.contract_end || '', pm: p.pm || '', zone: p.zone || '',
      length_km: p.length_km || '', chainage_from: p.chainage_from || '', chainage_to: p.chainage_to || '',
      retention_pct: p.retention_pct || 5, retention_cap_pct: p.retention_cap_pct || 10,
      advance_pct: p.advance_pct || 10, advance_recovery_pct: p.advance_recovery_pct || 4,
      vat_pct: p.vat_pct || 14,
    });
    setEditing(p.id);
    setModal(true);
  };
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.code || !form.name || !form.client || !form.contract_value) {
      addToast("أكمل الحقول المطلوبة", "error"); return;
    }
    setLoading(true);
    try {
      const { supabase } = await import('@lib/supabaseClient');
      const payload = {
        ...form,
        contract_value:      +form.contract_value,
        length_km:           +form.length_km || null,
        chainage_from:       form.chainage_from !== '' ? +form.chainage_from : null,
        chainage_to:         form.chainage_to  !== '' ? +form.chainage_to  : null,
        retention_pct:       +form.retention_pct,
        retention_cap_pct:   +form.retention_cap_pct,
        advance_pct:         +form.advance_pct,
        advance_recovery_pct:+form.advance_recovery_pct,
        vat_pct:             +form.vat_pct,
        tenant_id:           tenantId,
      };
      if (editing) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editing);
        if (error) throw error;
        addToast("تم تحديث المشروع ✓", "success");
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
        addToast("تم إنشاء المشروع ✓", "success");
      }
      setModal(false);
      await loadProjects();
    } catch (e) {
      addToast("خطأ: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id, name) => {
    if (!confirm(`هل تريد حذف مشروع "${name}"؟ سيتم حذف كل البيانات المرتبطة به.`)) return;
    try {
      const { supabase } = await import('@lib/supabaseClient');
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      addToast("تم الحذف ✓", "success");
      await loadProjects();
    } catch (e) {
      addToast("خطأ في الحذف: " + e.message, "error");
    }
  };

  const statusMap = { PLANNING: "تخطيط", TENDER: "عطاء", EXECUTION: "تنفيذ", SUSPENDED: "موقوف", COMPLETED: "مكتمل", CANCELLED: "ملغي" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="إدارة جميع عقود المشاريع" action={<Btn onClick={openCreate}>+ مشروع جديد</Btn>}>🏗 المشاريع</SectionHdr>
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        {fetching ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6e7a92" }}>⏳ جاري التحميل...</div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="إجمالي العقود" value={`${fmt(projects.reduce((s, p) => s + (p.contract_value || p.contractValue || 0), 0) / 1e6, 1)} م`} icon="💼" color={C.brand} />
          <Stat label="مشاريع نشطة" value={projects.filter(p => p.status === "EXECUTION").length} icon="⚙️" color={C.warning} />
          <Stat label="مكتملة" value={projects.filter(p => p.status === "COMPLETED").length} icon="✅" color={C.success} />
          <Stat label="إجمالي كيلومترات" value={`${projects.reduce((s, p) => s + (p.length_km || p.length || 0), 0).toFixed(1)} كم`} icon="🛣" color={C.info} />
        </div>
        )}
        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>الكود</Th><Th>اسم المشروع</Th><Th>الجهة المالكة</Th><Th>قيمة العقد</Th><Th>المحصّل</Th><Th>التقدم</Th><Th>الحالة</Th><Th>تاريخ التسليم</Th><Th>الإجراءات</Th></tr></thead>
            <tbody>
              {projects.map(p => {
                const behind = p.plannedProgress - p.progress;
                const paidPct = parseFloat(pct(p.paid, p.contractValue));
                return (
                  <tr key={p.id} style={{ cursor: "pointer" }}>
                    <Td><span style={{ color: C.brand, fontWeight: 700 }}>{p.code}</span></Td>
                    <Td><div style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div></Td>
                    <Td><span style={{ color: C.textSub, fontSize: 10 }}>{p.client}</span></Td>
                    <Td style={{ color: C.text, fontWeight: 600 }}>{fmt(p.contract_value || p.contractValue)} ج.م</Td>
                    <Td>
                      <div style={{ width: 80 }}><ProgressBar value={paidPct} color={C.success} height={5} /></div>
                      <span style={{ fontSize: 9, color: C.success }}>{paidPct}%</span>
                    </Td>
                    <Td>
                      <div style={{ width: 80 }}><ProgressBar value={p.progress} color={(p.planned_progress||p.plannedProgress||0) - p.progress > 5 ? C.danger : C.brand} height={5} /></div>
                      <span style={{ fontSize: 9, color: C.brand }}>{p.progress}%</span>
                    </Td>
                    <Td><Badge text={statusMap[p.status] || p.status} /></Td>
                    <Td style={{ color: C.muted, fontSize: 10 }}>{fmtDate(p.contract_end || p.contractEnd)}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn variant="outline" size="xs" onClick={() => openEdit(p)}>✏ تعديل</Btn>
                        <Btn variant="danger" size="xs" onClick={() => deleteProject(p.id, p.name)}>🗑</Btn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "✏ تعديل مشروع" : "🏗 إنشاء مشروع جديد"} width={680}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="كود المشروع" req third><Input value={form.code} onChange={set("code")} placeholder="NR-2024-03" /></Fld>
          <Fld label="الحالة" third>
            <Select value={form.status} onChange={set("status")}>
              {Object.entries(statusMap).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Fld>
          <Fld label="المنطقة" third><Input value={form.zone} onChange={set("zone")} placeholder="المنطقة الغربية" /></Fld>
          <Fld label="اسم المشروع" req><Input value={form.name} onChange={set("name")} placeholder="مسمى المشروع..." /></Fld>
          <Fld label="الجهة المالكة" req half><Input value={form.client} onChange={set("client")} placeholder="الجهة..." /></Fld>
          <Fld label="الاستشاري" half><Input value={form.consultant} onChange={set("consultant")} placeholder="اسم الاستشاري..." /></Fld>
          <Fld label="قيمة العقد (ج.م)" req half><Input type="number" value={form.contractValue} onChange={set("contractValue")} placeholder="185000000" /></Fld>
          <Fld label="مدير المشروع" half><Input value={form.pm} onChange={set("pm")} placeholder="م. ..." /></Fld>
          <Fld label="تاريخ البدء" req third><Input type="date" value={form.startDate} onChange={set("startDate")} /></Fld>
          <Fld label="تاريخ التسليم التعاقدي" req third><Input type="date" value={form.contractEnd} onChange={set("contractEnd")} /></Fld>
          <Fld label="الطول (كم)" third><Input type="number" value={form.length} onChange={set("length")} placeholder="42.5" /></Fld>
          <Fld label="الكيلو من" third><Input type="number" value={form.chainageFrom} onChange={set("chainageFrom")} placeholder="280" /></Fld>
          <Fld label="الكيلو إلى" third><Input type="number" value={form.chainageTo} onChange={set("chainageTo")} placeholder="322" /></Fld>
          <div style={{ width: "100%", borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color: C.textSub, fontWeight: 700, marginBottom: 8 }}>⚙️ إعدادات المعادلة المصرية</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Fld label="نسبة الاحتجاز %" third><Input type="number" value={form.retentionPercent} onChange={set("retentionPercent")} /></Fld>
              <Fld label="سقف الاحتجاز %" third><Input type="number" value={form.retentionCapPercent} onChange={set("retentionCapPercent")} /></Fld>
              <Fld label="نسبة السلفة %" third><Input type="number" value={form.advancePercent} onChange={set("advancePercent")} /></Fld>
              <Fld label="استرجاع السلفة %" third><Input type="number" value={form.advanceRecoveryPercent} onChange={set("advanceRecoveryPercent")} /></Fld>
              <Fld label="ضريبة القيمة المضافة %" third><Input type="number" value={form.vatPercent} onChange={set("vatPercent")} /></Fld>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save} disabled={loading}>{loading ? "⏳ جاري الحفظ..." : (editing ? "تحديث" : "إنشاء")}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EXTRACTS — Phase 4: Egyptian Formula + Full CRUD ✨
// ══════════════════════════════════════════════════════════════
function ExtractsScreen({ addToast, tenantId, projectId: propProjectId }) {
  const defaultProjectId = propProjectId || MOCK.projects[0]?.id;
  const { data: extracts, setData: setExtracts, busy: loadingExtracts, reload: reloadExtracts } =
    useSupabaseTable('extracts', defaultProjectId, MOCK.extracts, 'submitted_at');

  // جلب بيانات المشروع الحقيقية من Supabase
  const [proj, setProj] = useState(MOCK.projects[0]);
  useEffect(() => {
    if (!defaultProjectId) return;
    import('@lib/supabaseClient').then(({ supabase }) => {
      supabase.from('projects').select('*').eq('id', defaultProjectId).single()
        .then(({ data }) => {
          if (data) setProj({
            ...data,
            contractValue:        data.contract_value,
            retentionPercent:     data.retention_pct,
            retentionCapPercent:  data.retention_cap_pct,
            advanceRecoveryPercent: data.advance_recovery_pct,
            vatPercent:           data.vat_pct,
            totalRetained:        data.total_retained,
            advanceRemaining:     data.advance_remaining,
          });
        });
    });
  }, [defaultProjectId]);

  // جلب بنود BOQ من Supabase
  const { data: boqSections } = useSupabaseTable('boq_sections', defaultProjectId, MOCK.boqSections, 'sort_order');
  const { data: boqItems,   reload: reloadBOQ } = useSupabaseTable('boq_items',    defaultProjectId, MOCK.boqItems,    'sort_order');

  // أوامر التغيير المعتمدة
  const { data: approvedVOs } = useSupabaseTable('variation_orders', defaultProjectId, MOCK.variationOrders, 'submitted_at');
  const voTotal = approvedVOs.filter(v => v.status === 'APPROVED').reduce((s, v) => s + (v.value || 0), 0);

  const [modal,        setModal]        = useState(false);
  const [inputMode,    setInputMode]    = useState('boq');   // 'boq' | 'manual'
  const [calcModal,    setCalcModal]    = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [loading,      setLoading]      = useState(false);

  // BOQ mode — تعديل الكميات المنفذة في هذا المستخلص
  const [boqExec, setBoqExec] = useState({});   // { itemId: qty }
  useEffect(() => {
    if (boqItems.length) {
      const init = {};
      boqItems.forEach(i => { init[i.id] = i.executed_qty || i.exQty || 0; });
      setBoqExec(init);
    }
  }, [boqItems.length]);

  const boqBaseWork = useMemo(() =>
    boqItems.reduce((s, i) => s + (+(boqExec[i.id] || 0)) * (i.unit_rate || i.rate || 0), 0),
  [boqItems, boqExec]);

  const EMPTY_FORM = {
    number: "", month: "", periodFrom: "", periodTo: "",
    baseWork: "", variationsAmount: "0", fines: "0", otherDeductions: "0",
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const [calc, setCalc] = useState(null);

  // Live calculation — يعمل في كلا الوضعين
  const effectiveBase  = inputMode === 'boq' ? boqBaseWork        : (+form.baseWork || 0);
  const effectiveVAR   = inputMode === 'boq' ? voTotal            : (+form.variationsAmount || 0);

  useEffect(() => {
    if (!proj || !effectiveBase) { setCalc(null); return; }
    const prevExtracts = extracts.filter(e => e.status !== 'DRAFT');
    const retentionCumBefore = prevExtracts.reduce((s, e) => s + (e.retention_this_extract || e.retentionThisExtract || 0), 0);
    const result = calcEgyptianExtract({
      contractValue:          proj.contractValue   || proj.contract_value   || 0,
      baseWork:               effectiveBase,
      variationsAmount:       effectiveVAR,
      retentionPercent:       proj.retentionPercent     || proj.retention_pct     || 5,
      retentionCapPercent:    proj.retentionCapPercent  || proj.retention_cap_pct || 10,
      advanceRecoveryPercent: proj.advanceRecoveryPercent || proj.advance_recovery_pct || 4,
      vatPercent:             proj.vatPercent       || proj.vat_pct       || 14,
      retentionCumulativeBefore: retentionCumBefore,
      advanceRemainingBefore: proj.advanceRemaining || proj.advance_remaining || 0,
      fines:            +form.fines || 0,
      otherDeductions:  +form.otherDeductions || 0,
    });
    setCalc(result);
  }, [effectiveBase, effectiveVAR, form.fines, form.otherDeductions, defaultProjectId, extracts.length]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.number || !form.month) { addToast("رقم المستخلص والشهر مطلوبان", "error"); return; }
    if (!calc) { addToast("لا توجد أعمال محسوبة — أدخل الكميات أولاً", "error"); return; }
    setLoading(true);

    // لو BOQ mode — نحدّث الكميات المنفذة في الجداول أولاً
    if (inputMode === 'boq') {
      const { supabase } = await import('@lib/supabaseClient');
      await Promise.all(
        boqItems.map(item =>
          supabase.from('boq_items')
            .update({ executed_qty: +(boqExec[item.id] || 0) })
            .eq('id', item.id)
        )
      );
    }

    const payload = {
      number:                  form.number,
      month:                   form.month,
      base_work:               calc.grossTotal - (calc.variationsAmount || effectiveVAR),
      variations_amount:       effectiveVAR,
      gross_total:             calc.grossTotal,
      retention_this_extract:  calc.retentionThisExtract,
      advance_recovery:        calc.advanceRecoveryActual,
      fines:                   +form.fines || 0,
      net_before_vat:          calc.netBeforeVAT,
      vat_amount:              calc.vatAmount,
      net_final:               calc.netFinal,
      status:                  "DRAFT",
      submitted_at:            new Date().toISOString().split("T")[0],
      notes:                   inputMode === 'boq' ? 'محسوب من BOQ' : 'إدخال يدوي',
    };

    const res = await sbUpsert('extracts', payload, null, tenantId, defaultProjectId);
    if (res.ok) reloadExtracts();
    else setExtracts(es => [...es, { id: `e${Date.now()}`, project_id: defaultProjectId, ...payload }]);

    addToast(`✓ تم إنشاء المستخلص ${form.number} — صافي: ${fmt(calc.netFinal)} ج.م`, "success");
    setLoading(false); setModal(false); setForm(EMPTY_FORM); setCalc(null);
    setBoqExec({});
  };

  // ── تصدير المستخلص PDF ──────────────────────────────────────
  const printExtract = (e) => {
    const projName = proj?.name || proj?.code || '—';
    const projClient = proj?.client || '—';
    const cv = proj?.contractValue || proj?.contract_value || 0;
    const retPct = proj?.retentionPercent || proj?.retention_pct || 5;
    const vatPct = proj?.vatPercent || proj?.vat_pct || 14;
    const advPct = proj?.advanceRecoveryPercent || proj?.advance_recovery_pct || 4;

    const grossTotal  = e.gross_total  || e.grossTotal  || 0;
    const baseWork    = e.base_work    || e.baseWork    || 0;
    const varAmt      = e.variations_amount || e.variationsAmount || 0;
    const retention   = e.retention_this_extract || e.retentionThisExtract || 0;
    const advRec      = e.advance_recovery || e.advanceRecoveryActual || 0;
    const fines       = e.fines || 0;
    const netBVAT     = e.net_before_vat || e.netBeforeVAT || 0;
    const vatAmt      = e.vat_amount || e.vatAmount || 0;
    const netFinal    = e.net_final || e.netFinal || 0;
    const statusAr    = { DRAFT:'مسودة', SUBMITTED:'مقدم', UNDER_REVIEW:'قيد المراجعة', APPROVED:'معتمد', PAID:'مدفوع', REJECTED:'مرفوض' }[e.status] || e.status;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>مستخلص ${e.number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; direction: rtl; background: #fff; color: #111; font-size: 12px; }
  .page { max-width: 800px; margin: 20px auto; padding: 30px; border: 2px solid #1a1a2e; }
  .header { text-align: center; border-bottom: 3px double #1a1a2e; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #1a1a2e; letter-spacing: 2px; }
  .header h2 { font-size: 14px; color: #444; margin-top: 4px; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .meta-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; }
  .meta-box label { font-size: 9px; color: #888; display: block; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 1px; }
  .meta-box span { font-size: 13px; font-weight: bold; color: #1a1a2e; }
  .section-title { font-size: 11px; font-weight: bold; color: #fff; background: #1a1a2e; padding: 6px 14px; margin: 16px 0 0; border-radius: 4px 4px 0 0; }
  table { width: 100%; border-collapse: collapse; }
  table th { background: #f8f9fa; padding: 8px 12px; text-align: right; font-size: 10px; color: #555; border: 1px solid #ddd; }
  table td { padding: 9px 12px; border: 1px solid #e0e0e0; font-size: 12px; }
  .row-label { color: #444; }
  .row-value { text-align: left; font-family: monospace; font-weight: bold; }
  .row-plus  { color: #166534; background: #f0fdf4; }
  .row-minus { color: #991b1b; background: #fef2f2; }
  .row-total { background: #fffbeb; font-weight: bold; font-size: 13px; }
  .row-final { background: #1a1a2e; color: #f59e0b; font-size: 15px; font-weight: 900; }
  .row-final td { color: #f59e0b; }
  .signatures { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 40px; text-align: center; }
  .sig-box { border-top: 1px solid #999; padding-top: 8px; font-size: 11px; color: #555; }
  .footer { text-align: center; margin-top: 24px; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
  .amount { font-family: monospace; direction: ltr; display: inline-block; }
  @media print {
    body { margin: 0; }
    .page { margin: 0; border: none; padding: 20px; }
    @page { size: A4; margin: 1cm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="font-size:11px;color:#888;margin-bottom:6px;">جمهورية مصر العربية — نموذج مستخلص أعمال</div>
    <h1>مستخلص مستحقات رقم ${e.number}</h1>
    <h2>${e.month}</h2>
    <div style="margin-top:8px;"><span class="badge">${statusAr}</span></div>
  </div>

  <div class="meta-grid">
    <div class="meta-box"><label>اسم المشروع</label><span>${projName}</span></div>
    <div class="meta-box"><label>الجهة المالكة / صاحب العمل</label><span>${projClient}</span></div>
    <div class="meta-box"><label>قيمة العقد الأصلية</label><span class="amount">${cv.toLocaleString('ar-EG')} ج.م</span></div>
    <div class="meta-box"><label>تاريخ التقديم</label><span>${e.submitted_at || e.submittedAt || '—'}</span></div>
  </div>

  <div class="section-title">📋 بيان الأعمال والمستحقات</div>
  <table>
    <thead><tr><th>البيان</th><th>النسبة</th><th>المبلغ (ج.م)</th></tr></thead>
    <tbody>
      <tr><td class="row-label">الأعمال الأساسية المنفذة</td><td>—</td><td class="row-value row-plus"><span class="amount">${baseWork.toLocaleString('ar-EG', {minimumFractionDigits:2})}</span></td></tr>
      ${varAmt !== 0 ? `<tr><td class="row-label">أوامر التغيير المعتمدة</td><td>—</td><td class="row-value row-plus"><span class="amount">+${varAmt.toLocaleString('ar-EG', {minimumFractionDigits:2})}</span></td></tr>` : ''}
      <tr class="row-total"><td><strong>إجمالي الأعمال</strong></td><td>—</td><td class="row-value"><span class="amount">${grossTotal.toLocaleString('ar-EG', {minimumFractionDigits:2})}</span></td></tr>
      <tr style="background:#fff8f0"><td colspan="3" style="font-size:10px;color:#888;padding:4px 12px;">الاستقطاعات</td></tr>
      <tr><td class="row-label">(−) الاحتجاز</td><td>${retPct}%</td><td class="row-value row-minus"><span class="amount">(${retention.toLocaleString('ar-EG', {minimumFractionDigits:2})})</span></td></tr>
      <tr><td class="row-label">(−) استرجاع السلفة</td><td>${advPct}%</td><td class="row-value row-minus"><span class="amount">(${advRec.toLocaleString('ar-EG', {minimumFractionDigits:2})})</span></td></tr>
      ${fines > 0 ? `<tr><td class="row-label">(−) الغرامات والمخالفات</td><td>—</td><td class="row-value row-minus"><span class="amount">(${fines.toLocaleString('ar-EG', {minimumFractionDigits:2})})</span></td></tr>` : ''}
      <tr class="row-total"><td><strong>الصافي قبل ضريبة القيمة المضافة</strong></td><td>—</td><td class="row-value"><span class="amount">${netBVAT.toLocaleString('ar-EG', {minimumFractionDigits:2})}</span></td></tr>
      <tr class="row-plus"><td class="row-label">(+) ضريبة القيمة المضافة</td><td>${vatPct}%</td><td class="row-value"><span class="amount">+${vatAmt.toLocaleString('ar-EG', {minimumFractionDigits:2})}</span></td></tr>
      <tr class="row-final"><td><strong>الصافي النهائي للصرف</strong></td><td>—</td><td class="row-value" style="font-size:15px;"><span class="amount">${netFinal.toLocaleString('ar-EG', {minimumFractionDigits:2})} ج.م</span></td></tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">مهندس المكتب الفني<br><br><br></div>
    <div class="sig-box">مدير المشروع<br><br><br></div>
    <div class="sig-box">الاستشاري / المالك<br><br><br></div>
  </div>

  <div class="footer">
    تم إنشاء هذا المستخلص بواسطة TECHOFFICE ERP v4.0 — ${new Date().toLocaleDateString('ar-EG')}
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
  };

  const approve = async (extract) => {
    setLoading(true);
    const res = await sbPatch('extracts', extract.id, {
      status: "APPROVED",
      approved_at: new Date().toISOString().split("T")[0],
    });
    if (res.ok) reloadExtracts();
    else setExtracts(es => es.map(e => e.id === extract.id ? { ...e, status: "APPROVED" } : e));
    addToast(`تم اعتماد المستخلص ${extract.number} ✓`, "success");
    setLoading(false); setApproveModal(null);
  };

  const statusMap = { DRAFT: "مسودة", SUBMITTED: "مقدم", UNDER_REVIEW: "قيد المراجعة", APPROVED: "معتمد", PAID: "مدفوع", REJECTED: "مرفوض" };
  const canApprove = (s) => ["SUBMITTED", "UNDER_REVIEW"].includes(s);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="المعادلة المصرية الدقيقة — احتجاز + استرجاع سلفة + ضريبة القيمة المضافة"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={() => setCalcModal(true)}>🧮 حاسبة المعادلة</Btn>
            <Btn onClick={() => { setForm(EMPTY_FORM); setCalc(null); setBoqExec({}); setInputMode('boq'); setModal(true); }}>+ مستخلص جديد</Btn>
          </div>
        }
      >💰 المستخلصات</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        {proj && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            <Stat label="قيمة العقد" value={`${fmt((proj.contractValue||proj.contract_value||0)/1e6,1)} م`} icon="📋" color={C.brand} />
            <Stat label="الاحتجاز التراكمي" value={fmt(proj.totalRetained||proj.total_retained||0)} sub={`سقف: ${fmt((proj.contractValue||proj.contract_value||0)*(proj.retentionCapPercent||proj.retention_cap_pct||10)/100)}`} icon="🔒" color={C.warning} />
            <Stat label="السلفة المتبقية" value={fmt(proj.advanceRemaining||proj.advance_remaining||0)} icon="💼" color={C.info} />
            <Stat label="عدد المستخلصات" value={items.length} sub={`${items.filter(e=>e.status==="APPROVED"||e.status==="PAID").length} معتمد`} icon="📑" color={C.purple} />
          </div>
        )}

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead>
              <tr>
                <Th>رقم المستخلص</Th><Th>الشهر</Th><Th>إجمالي الأعمال</Th><Th>الاحتجاز</Th><Th>استرجاع السلفة</Th><Th>الصافي قبل VAT</Th><Th>الضريبة 14%</Th><Th>الصافي النهائي</Th><Th>الحالة</Th><Th>الإجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><Td colSpan={10} s={{ textAlign: "center", padding: 40, color: C.muted }}>لا توجد مستخلصات — أنشئ مستخلصاً جديداً</Td></tr>
              )}
              {items.map(e => (
                <tr key={e.id}>
                  <Td><span style={{ color: C.brand, fontWeight: 700 }}>{e.number}</span></Td>
                  <Td style={{ color: C.textSub }}>{e.month}</Td>
                  <Td style={{ color: C.text, fontWeight: 600 }}>{fmt(e.gross_total||e.grossTotal||0)}</Td>
                  <Td style={{ color: C.warning }}>({fmt(e.retention_this_extract||e.retentionThisExtract||0)})</Td>
                  <Td style={{ color: C.info }}>({fmt(e.advance_recovery||e.advanceRecoveryActual||0)})</Td>
                  <Td style={{ color: C.text }}>{fmt(e.net_before_vat||e.netBeforeVAT||0)}</Td>
                  <Td style={{ color: C.success }}>+{fmt(e.vat_amount||e.vatAmount||0)}</Td>
                  <Td><span style={{ color: C.brand, fontWeight: 800, fontSize: 12 }}>{fmt(e.net_final||e.netFinal||0)}</span></Td>
                  <Td><Badge text={statusMap[e.status] || e.status} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {canApprove(e.status) && (
                        <Btn variant="success" size="xs" onClick={() => setApproveModal(e)}>✓ اعتماد</Btn>
                      )}
                      <Btn variant="outline" size="xs" onClick={() => printExtract(e)}>🖨 طباعة PDF</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      {/* ── إنشاء مستخلص جديد ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="💰 إنشاء مستخلص جديد" width={900}>
        {/* ── Header Info + Mode Switch ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
          <Fld label="رقم المستخلص" req style={{ flex: 1 }}>
            <Input value={form.number} onChange={set("number")} placeholder="M-08" />
          </Fld>
          <Fld label="الشهر" req style={{ flex: 1 }}>
            <Input value={form.month} onChange={set("month")} placeholder="أغسطس 2025" />
          </Fld>
          <Fld label="الفترة من" style={{ flex: 1 }}>
            <Input type="date" value={form.periodFrom} onChange={set("periodFrom")} />
          </Fld>
          <Fld label="الفترة إلى" style={{ flex: 1 }}>
            <Input type="date" value={form.periodTo} onChange={set("periodTo")} />
          </Fld>
        </div>

        {/* ── Mode Tabs ── */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          {[{id:'boq', label:'📋 من BOQ (تلقائي)', desc:'يحسب من الكميات المنفذة'},
            {id:'manual', label:'✏️ إدخال يدوي', desc:'أدخل المبالغ مباشرة'}].map(m => (
            <button key={m.id} onClick={() => setInputMode(m.id)}
              style={{ flex: 1, padding: "10px 16px", background: inputMode === m.id ? C.brand+"22" : "transparent",
                border: "none", borderLeft: m.id === "manual" ? `1px solid ${C.border}` : "none",
                cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: inputMode === m.id ? C.brand : C.textSub }}>{m.label}</div>
              <div style={{ fontSize: 9, color: C.muted }}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left: Input Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* ── BOQ MODE ── */}
            {inputMode === 'boq' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <div style={{ fontSize: 10, color: C.brand, fontWeight: 700, marginBottom: 8 }}>
                  📋 بنود BOQ — عدّل الكمية المنفذة في هذا المستخلص
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, direction: "rtl" }}>
                    <thead>
                      <tr style={{ background: C.surface }}>
                        <th style={{ padding: "7px 10px", color: C.muted, textAlign: "right", fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 60 }}>الكود</th>
                        <th style={{ padding: "7px 10px", color: C.muted, textAlign: "right", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>البند</th>
                        <th style={{ padding: "7px 10px", color: C.muted, textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 45 }}>الوحدة</th>
                        <th style={{ padding: "7px 10px", color: C.muted, textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 70 }}>الكمية الكلية</th>
                        <th style={{ padding: "7px 10px", color: C.success, textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 80 }}>المنفذ ↑</th>
                        <th style={{ padding: "7px 10px", color: C.muted, textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 80 }}>المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqSections.map(sec => (
                        <React.Fragment key={sec.id}>
                          <tr style={{ background: C.border+"44" }}>
                            <td colSpan={6} style={{ padding: "5px 10px", color: C.brand, fontWeight: 800, fontSize: 9 }}>
                              {sec.code} — {sec.title}
                            </td>
                          </tr>
                          {boqItems.filter(i => i.section_id === sec.id || i.sId === sec.id).map(item => {
                            const execQty   = +(boqExec[item.id] ?? (item.executed_qty || item.exQty || 0));
                            const rate      = item.unit_rate || item.rate || 0;
                            const totalQty  = item.quantity  || item.qty  || 0;
                            const lineAmt   = execQty * rate;
                            const overExec  = execQty > totalQty;
                            return (
                              <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                                <td style={{ padding: "5px 10px", color: C.muted, fontFamily: "monospace" }}>{item.code}</td>
                                <td style={{ padding: "5px 10px", color: C.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                    title={item.description || item.desc}>{item.description || item.desc}</td>
                                <td style={{ padding: "5px 10px", color: C.muted, textAlign: "center" }}>{item.unit}</td>
                                <td style={{ padding: "5px 10px", color: C.muted, textAlign: "center" }}>{(+totalQty).toLocaleString('ar')}</td>
                                <td style={{ padding: "4px 6px", textAlign: "center" }}>
                                  <input
                                    type="number"
                                    value={execQty}
                                    onChange={e => setBoqExec(prev => ({ ...prev, [item.id]: +e.target.value }))}
                                    min={0} max={totalQty * 1.1}
                                    style={{
                                      width: "100%", padding: "3px 6px", background: overExec ? C.danger+"22" : C.card,
                                      border: `1px solid ${overExec ? C.danger : C.border}`,
                                      borderRadius: 4, color: overExec ? C.danger : C.success,
                                      fontFamily: "inherit", fontSize: 10, textAlign: "center", direction: "ltr",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "5px 10px", color: C.brand, fontWeight: 700, textAlign: "center", fontFamily: "monospace", fontSize: 9 }}>
                                  {fmt(lineAmt)}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* BOQ Totals */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px",
                  background: C.brandDim, border: `1px solid ${C.brand}33`, borderRadius: 6, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.muted }}>أعمال BOQ</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.brand }}>{fmt(boqBaseWork)} ج.م</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.muted }}>أوامر تغيير معتمدة</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.success }}>+{fmt(voTotal)} ج.م</div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 9, color: C.muted }}>الإجمالي</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{fmt(boqBaseWork + voTotal)} ج.م</div>
                  </div>
                </div>
                {/* الغرامات والخصومات */}
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <Fld label="الغرامات (ج.م)" half><Input type="number" value={form.fines} onChange={set("fines")} placeholder="0" /></Fld>
                  <Fld label="خصومات أخرى (ج.م)" half><Input type="number" value={form.otherDeductions} onChange={set("otherDeductions")} placeholder="0" /></Fld>
                </div>
              </div>
            )}

            {/* ── MANUAL MODE ── */}
            {inputMode === 'manual' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 10, color: C.brand, fontWeight: 700, marginBottom: 4 }}>🔢 الأعمال المنفذة</div>
                <Fld label="الأعمال الأساسية (ج.م)" req>
                  <Input type="number" value={form.baseWork} onChange={set("baseWork")} placeholder="8500000" />
                </Fld>
                <Fld label="أوامر التغيير المعتمدة (ج.م)">
                  <Input type="number" value={form.variationsAmount} onChange={set("variationsAmount")} placeholder="0" />
                </Fld>
                <Fld label="الغرامات (ج.م)">
                  <Input type="number" value={form.fines} onChange={set("fines")} placeholder="0" />
                </Fld>
                <Fld label="خصومات أخرى (ج.م)">
                  <Input type="number" value={form.otherDeductions} onChange={set("otherDeductions")} placeholder="0" />
                </Fld>
              </div>
            )}
          </div>

          {/* Right: Live Calculator */}
          <div>
            <div style={{ fontSize: 10, color: C.success, fontWeight: 700, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 12 }}>🧮 الحساب الفوري — المعادلة المصرية</div>
            {!calc ? (
              <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 11 }}>أدخل الأعمال الأساسية لرؤية الحساب</div>
            ) : (
              <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <CalcRow label="الأعمال الأساسية" value={+form.baseWork || 0} />
                <CalcRow label="+ أوامر التغيير المعتمدة" value={+form.variationsAmount || 0} indent />
                <CalcRow label="= الإجمالي" value={calc.grossTotal} bold color={C.text} />
                <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                <CalcRow label="(−) الاحتجاز" value={-calc.retentionThisExtract} color={C.warning} />
                <CalcRow label={`    من ${fmt(calc.retentionCapAmount)} حد أقصى`} value={`${fmt(calc.retentionAvailable)} متاح`} indent />
                <CalcRow label="(−) استرجاع السلفة" value={-calc.advanceRecoveryActual} color={C.info} />
                {(+form.fines || 0) > 0 && <CalcRow label="(−) الغرامات" value={-+form.fines} color={C.danger} />}
                {(+form.otherDeductions || 0) > 0 && <CalcRow label="(−) خصومات أخرى" value={-+form.otherDeductions} color={C.danger} />}
                <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                <CalcRow label="= الصافي قبل الضريبة" value={calc.netBeforeVAT} bold color={calc.netBeforeVAT < 0 ? C.danger : C.text} />
                <CalcRow label={`(+) ضريبة القيمة المضافة ${proj?.vatPercent || 14}%`} value={calc.vatAmount} color={C.success} />
                <div style={{ background: C.brandDim, borderRadius: "0 0 8px 8px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.brand, fontWeight: 800 }}>الصافي النهائي للصرف</span>
                  <span style={{ fontSize: 16, color: C.brand, fontWeight: 900, fontFamily: "monospace" }}>{fmt(calc.netFinal, 2)} ج.م</span>
                </div>
                {calc.warnings.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {calc.warnings.map((w, i) => (
                      <div key={i} style={{ background: w.type === "error" ? C.dangerDim : C.infoDim, border: `1px solid ${w.type === "error" ? C.danger : C.info}44`, borderRadius: 6, padding: "5px 10px", fontSize: 9, color: w.type === "error" ? C.danger : C.info }}>
                        ⚠ {w.msg}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: "8px 12px", background: C.surface, borderRadius: "0 0 8px 8px", marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: C.muted }}>📊 بعد هذا المستخلص: احتجاز تراكمي = {fmt(calc.retentionCumulativeAfter)} | سلفة متبقية = {fmt(calc.advanceRemainingAfter)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save} disabled={loading || !calc}>{loading ? "⏳ حفظ..." : "💾 حفظ كمسودة"}</Btn>
        </div>
      </Modal>

      {/* ── نافذة حاسبة المعادلة المنفصلة ── */}
      <EgyptianCalcModal open={calcModal} onClose={() => setCalcModal(false)} project={proj} />

      {/* ── نافذة اعتماد المستخلص ── */}
      <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="✅ اعتماد المستخلص" width={440}>
        {approveModal && (
          <div>
            <div style={{ background: C.successDim, border: `1px solid ${C.success}44`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ color: C.success, fontWeight: 700, fontSize: 12 }}>المستخلص {approveModal.number}</div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>{approveModal.month}</div>
              <div style={{ fontSize: 16, color: C.brand, fontWeight: 900, marginTop: 8 }}>الصافي النهائي: {fmt(approveModal.netFinal, 2)} ج.م</div>
            </div>
            <p style={{ fontSize: 11, color: C.textSub }}>هل تؤكد اعتماد هذا المستخلص؟ سيُسجَّل في سجل التدقيق ولن يمكن الرجوع فيه.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variant="outline" onClick={() => setApproveModal(null)}>إلغاء</Btn>
              <Btn variant="success" onClick={() => approve(approveModal)} disabled={loading}>{loading ? "⏳..." : "✅ اعتماد"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// حاسبة المعادلة المصرية المستقلة
function EgyptianCalcModal({ open, onClose, project }) {
  const [f, setF] = useState({ baseWork: "", variationsAmount: "0", fines: "0", otherDeductions: "0", retentionCumBefore: "0", advanceRemaining: "" });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (project) setF(prev => ({ ...prev, advanceRemaining: String(project.advanceRemaining || 0) }));
  }, [project]);

  useEffect(() => {
    if (!project || !f.baseWork) { setResult(null); return; }
    setResult(calcEgyptianExtract({
      contractValue: project.contractValue,
      baseWork: +f.baseWork || 0, variationsAmount: +f.variationsAmount || 0,
      retentionPercent: project.retentionPercent, retentionCapPercent: project.retentionCapPercent,
      advanceRecoveryPercent: project.advanceRecoveryPercent, vatPercent: project.vatPercent,
      retentionCumulativeBefore: +f.retentionCumBefore || 0, advanceRemainingBefore: +f.advanceRemaining || 0,
      fines: +f.fines || 0, otherDeductions: +f.otherDeductions || 0,
    }));
  }, [f, project]);

  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="🧮 حاسبة المعادلة المصرية" width={720}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10, color: C.brand, fontWeight: 700 }}>🔢 المدخلات</div>
          <Fld label="الأعمال الأساسية (ج.م)" req><Input type="number" value={f.baseWork} onChange={set("baseWork")} placeholder="8500000" /></Fld>
          <Fld label="أوامر التغيير (ج.م)"><Input type="number" value={f.variationsAmount} onChange={set("variationsAmount")} /></Fld>
          <Fld label="الاحتجاز التراكمي السابق"><Input type="number" value={f.retentionCumBefore} onChange={set("retentionCumBefore")} /></Fld>
          <Fld label="رصيد السلفة المتبقي"><Input type="number" value={f.advanceRemaining} onChange={set("advanceRemaining")} /></Fld>
          <Fld label="الغرامات"><Input type="number" value={f.fines} onChange={set("fines")} /></Fld>
          <Fld label="خصومات أخرى"><Input type="number" value={f.otherDeductions} onChange={set("otherDeductions")} /></Fld>
          {project && (
            <div style={{ background: C.infoDim, border: `1px solid ${C.info}44`, borderRadius: 6, padding: 10, fontSize: 9, color: C.info }}>
              ℹ إعدادات من المشروع: احتجاز {project.retentionPercent}% | سقف {project.retentionCapPercent}% | سلفة {project.advanceRecoveryPercent}% | VAT {project.vatPercent}%
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.success, fontWeight: 700, marginBottom: 12 }}>📊 النتيجة</div>
          {!result ? (
            <div style={{ textAlign: "center", padding: 30, color: C.muted }}>أدخل الأعمال الأساسية</div>
          ) : (
            <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <CalcRow label="الإجمالي" value={result.grossTotal} bold />
              <CalcRow label="(−) الاحتجاز" value={-result.retentionThisExtract} color={C.warning} />
              <CalcRow label="(−) استرجاع السلفة" value={-result.advanceRecoveryActual} color={C.info} />
              {+f.fines > 0 && <CalcRow label="(−) الغرامات" value={-+f.fines} color={C.danger} />}
              <CalcRow label="= الصافي قبل VAT" value={result.netBeforeVAT} bold />
              <CalcRow label="(+) الضريبة 14%" value={result.vatAmount} color={C.success} />
              <div style={{ background: C.brandDim, padding: "12px 14px", display: "flex", justifyContent: "space-between", borderRadius: "0 0 8px 8px" }}>
                <span style={{ color: C.brand, fontWeight: 800 }}>الصافي النهائي</span>
                <span style={{ color: C.brand, fontWeight: 900, fontSize: 15, fontFamily: "monospace" }}>{fmt(result.netFinal, 2)} ج.م</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// BOQ — Phase 4: Full CRUD ✨
// ══════════════════════════════════════════════════════════════
function BOQScreen({ addToast, tenantId, projectId: propProjectId }) {
  const [projectId, setProjectId] = useState("p1");
  const defaultProjectId = propProjectId || MOCK.projects[0]?.id;
  const { data: sections, setData: setSections, reload: reloadSections } =
    useSupabaseTable('boq_sections', defaultProjectId, MOCK.boqSections, 'sort_order');
  const { data: items, setData: setItems, reload: reloadItems } =
    useSupabaseTable('boq_items', defaultProjectId, MOCK.boqItems, 'sort_order');
  const [sectionModal, setSectionModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState("bs1");

  const projSections = sections.filter(s => s.projectId === projectId);
  const activeSection = projSections.find(s => s.id === activeSectionId) || projSections[0];
  const sectionItems = items.filter(i => i.sId === activeSectionId);

  const [secForm, setSecForm] = useState({ code: "", title: "" });
  const [itemForm, setItemForm] = useState({ code: "", desc: "", unit: "م³", qty: "", rate: "", exQty: "0" });
  const setS = k => e => setSecForm(f => ({ ...f, [k]: e.target.value }));
  const setI = k => e => setItemForm(f => ({ ...f, [k]: e.target.value }));

  const saveSection = () => {
    if (!secForm.code || !secForm.title) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    setSections(ss => [...ss, { id: `bs${Date.now()}`, projectId, ...secForm }]);
    addToast("تم إنشاء الباب ✓", "success"); setSectionModal(false); setSecForm({ code: "", title: "" });
  };

  const openAddItem = () => { setItemForm({ code: "", desc: "", unit: "م³", qty: "", rate: "", exQty: "0" }); setEditItem(null); setItemModal(true); };
  const openEditItem = (item) => { setItemForm({ ...item }); setEditItem(item.id); setItemModal(true); };

  const saveItem = () => {
    if (!itemForm.code || !itemForm.desc || !itemForm.qty || !itemForm.rate) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    if (editItem) {
      setItems(is => is.map(i => i.id === editItem ? { ...i, ...itemForm, qty: +itemForm.qty, rate: +itemForm.rate, exQty: +itemForm.exQty } : i));
      addToast("تم تحديث البند ✓", "success");
    } else {
      setItems(is => [...is, { id: `q${Date.now()}`, sId: activeSectionId, ...itemForm, qty: +itemForm.qty, rate: +itemForm.rate, exQty: +itemForm.exQty }]);
      addToast("تم إضافة البند ✓", "success");
    }
    setItemModal(false);
  };

  const deleteItem = (id) => { setItems(is => is.filter(i => i.id !== id)); addToast("تم حذف البند", "info"); };

  const totalContractValue = sectionItems.reduce((s, i) => s + i.qty * i.rate, 0);
  const totalExecuted = sectionItems.reduce((s, i) => s + i.exQty * i.rate, 0);
  const allSectionsTotal = items.filter(i => projSections.map(s => s.id).includes(i.sId)).reduce((s, i) => s + i.qty * i.rate, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="جداول الكميات التفصيلية مع تتبع الأعمال المنفذة"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
              {MOCK.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </Select>
            <Btn variant="outline" onClick={() => setSectionModal(true)}>+ باب جديد</Btn>
            <Btn onClick={openAddItem}>+ بند جديد</Btn>
          </div>
        }
      >📋 جداول الكميات (BOQ)</SectionHdr>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar: Sections */}
        <div style={{ width: 200, borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, padding: "4px 8px", marginBottom: 4 }}>الأبواب</div>
          {projSections.map(s => {
            const sTotal = items.filter(i => i.sId === s.id).reduce((t, i) => t + i.qty * i.rate, 0);
            return (
              <button key={s.id} onClick={() => setActiveSectionId(s.id)}
                style={{ background: activeSectionId === s.id ? C.brandDim : "transparent", border: activeSectionId === s.id ? `1px solid ${C.brand}44` : "1px solid transparent", borderRadius: 6, padding: "8px 10px", cursor: "pointer", textAlign: "right", color: activeSectionId === s.id ? C.brand : C.textSub, fontFamily: "inherit" }}>
                <div style={{ fontWeight: 700, fontSize: 10 }}>{s.code} — {s.title}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{fmt(sTotal / 1e6, 1)} م ج.م</div>
              </button>
            );
          })}
          <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            <div style={{ fontSize: 9, color: C.muted, padding: "0 8px" }}>الإجمالي الكلي</div>
            <div style={{ fontSize: 11, color: C.brand, fontWeight: 800, padding: "0 8px" }}>{fmt(allSectionsTotal)}</div>
          </div>
        </div>

        {/* Content: Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {activeSection && (
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>الباب {activeSection.code}: {activeSection.title}</span>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 10, color: C.textSub }}>قيمة الباب: <strong style={{ color: C.brand }}>{fmt(totalContractValue)} ج.م</strong></span>
                <span style={{ fontSize: 10, color: C.textSub }}>المنفذ: <strong style={{ color: C.success }}>{fmt(totalExecuted)} ج.م ({pct(totalExecuted, totalContractValue)}%)</strong></span>
              </div>
            </div>
          )}
          <Card style={{ padding: 0 }}>
            <TblWrap>
              <thead>
                <tr><Th>الكود</Th><Th>وصف البند</Th><Th>الوحدة</Th><Th>الكمية التعاقدية</Th><Th>سعر الوحدة</Th><Th>قيمة البند</Th><Th>المنفذ</Th><Th>القيمة المنفذة</Th><Th>%</Th><Th>إجراءات</Th></tr>
              </thead>
              <tbody>
                {sectionItems.length === 0 && (
                  <tr><Td colSpan={10} s={{ textAlign: "center", padding: 30, color: C.muted }}>لا توجد بنود في هذا الباب</Td></tr>
                )}
                {sectionItems.map(item => {
                  const itemValue = item.qty * item.rate;
                  const exValue = item.exQty * item.rate;
                  const exPct = parseFloat(pct(item.exQty, item.qty));
                  return (
                    <tr key={item.id}>
                      <Td><span style={{ color: C.brand, fontWeight: 700, fontFamily: "monospace" }}>{item.code}</span></Td>
                      <Td><span style={{ fontSize: 10 }}>{item.desc}</span></Td>
                      <Td><Badge text={item.unit} color={C.teal} /></Td>
                      <Td style={{ color: C.text, fontFamily: "monospace" }}>{fmt(item.qty, 0)}</Td>
                      <Td style={{ color: C.textSub, fontFamily: "monospace" }}>{fmt(item.rate, 2)}</Td>
                      <Td style={{ color: C.text, fontWeight: 600 }}>{fmt(itemValue)}</Td>
                      <Td style={{ color: C.info, fontFamily: "monospace" }}>{fmt(item.exQty, 2)}</Td>
                      <Td style={{ color: C.success, fontWeight: 600 }}>{fmt(exValue)}</Td>
                      <Td>
                        <div style={{ width: 60, display: "flex", flexDirection: "column", gap: 3 }}>
                          <ProgressBar value={exPct} color={exPct >= 100 ? C.success : exPct >= 80 ? C.brand : C.warning} height={5} />
                          <span style={{ fontSize: 9, color: C.muted }}>{exPct}%</span>
                        </div>
                      </Td>
                      <Td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Btn variant="outline" size="xs" onClick={() => openEditItem(item)}>✏</Btn>
                          <Btn variant="ghost" size="xs" color={C.danger} onClick={() => deleteItem(item.id)}>🗑</Btn>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TblWrap>
          </Card>
        </div>
      </div>

      <Modal open={sectionModal} onClose={() => setSectionModal(false)} title="➕ إضافة باب جديد" width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <Fld label="كود الباب" req half><Input value={secForm.code} onChange={setS("code")} placeholder="F" /></Fld>
            <Fld label="عنوان الباب" req half><Input value={secForm.title} onChange={setS("title")} placeholder="اللوحات والتشوير" /></Fld>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="outline" onClick={() => setSectionModal(false)}>إلغاء</Btn>
          <Btn onClick={saveSection}>إضافة</Btn>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editItem ? "✏ تعديل بند" : "➕ إضافة بند جديد"} width={580}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="كود البند" req third><Input value={itemForm.code} onChange={setI("code")} placeholder="F-01" /></Fld>
          <Fld label="الوحدة" req third>
            <Select value={itemForm.unit} onChange={setI("unit")}>
              {["م³", "م²", "م.ط", "طن", "كجم", "قطعة", "إجمالي", "لتر"].map(u => <option key={u}>{u}</option>)}
            </Select>
          </Fld>
          <Fld label="الكمية التعاقدية" req third><Input type="number" value={itemForm.qty} onChange={setI("qty")} /></Fld>
          <Fld label="وصف البند" req><Input value={itemForm.desc} onChange={setI("desc")} placeholder="وصف البند التفصيلي..." /></Fld>
          <Fld label="سعر الوحدة (ج.م)" req half><Input type="number" value={itemForm.rate} onChange={setI("rate")} /></Fld>
          <Fld label="الكمية المنفذة" half><Input type="number" value={itemForm.exQty} onChange={setI("exQty")} /></Fld>
          {itemForm.qty && itemForm.rate && (
            <div style={{ width: "100%", background: C.brandDim, borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: C.textSub }}>قيمة البند = {fmt(+itemForm.qty)} × {fmt(+itemForm.rate, 2)} = </span>
              <span style={{ fontSize: 11, color: C.brand, fontWeight: 800 }}>{fmt(+itemForm.qty * +itemForm.rate)} ج.م</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="outline" onClick={() => setItemModal(false)}>إلغاء</Btn>
          <Btn onClick={saveItem}>{editItem ? "تحديث" : "إضافة"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LETTERS — Phase 5: Full CRUD ✨
// ══════════════════════════════════════════════════════════════
function LettersScreen({ addToast, tenantId, projectId: propProjectId }) {
  const [projectId, setProjectId] = useState("p1");
  const defaultProjectId = propProjectId || MOCK.projects[0]?.id;
  const { data: letters, setData: setLetters, busy: loadingLetters, reload: reloadLetters } =
    useSupabaseTable('letters', defaultProjectId, MOCK.letters, 'date');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState("الكل");
  const [filterType, setFilterType] = useState("الكل");
  const EMPTY = { number: "", subject: "", type: "OUTGOING", toFrom: "", date: "", dueDate: "", priority: "NORMAL", body: "" };
  const [form, setForm] = useState(EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const filtered = letters.filter(l =>
    l.projectId === projectId &&
    (filterStatus === "الكل" || l.status === filterStatus) &&
    (filterType === "الكل" || l.type === filterType)
  );

  const overdue = filtered.filter(l => l.status === "OVERDUE").length;
  const pending = filtered.filter(l => l.status === "PENDING").length;

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit = (l) => { setForm({ ...l }); setEditing(l.id); setModal(true); };

  const save = async () => {
    if (!form.number || !form.subject || !form.toFrom || !form.date) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    const letterPayload = { ...form, status: editing ? form.status : "PENDING" };
    sbUpsert('letters', letterPayload, editing, tenantId, defaultProjectId)
      .then(r => { if (r.ok) reloadLetters(); else {
        if (editing) setLetters(ls => ls.map(l => l.id === editing ? { ...l, ...form } : l));
        else setLetters(ls => [...ls, { ...letterPayload, id: `l${Date.now()}` }]);
      }});
    addToast(editing ? "تم تحديث الخطاب ✓" : "تم إنشاء الخطاب ✓", "success");
    setModal(false);
  };

  const closeLetterAction = (id) => {
    sbPatch('letters', id, { status: "CLOSED" })
      .then(r => r.ok ? reloadLetters() : setLetters(ls => ls.map(l => l.id === id ? { ...l, status: "CLOSED" } : l)));
    addToast("تم إغلاق الخطاب ✓", "success");
  };

  const typeLabels = { OUTGOING: "صادر", INCOMING: "وارد" };
  const statusLabels = { PENDING: "قيد الانتظار", OVERDUE: "متأخر", CLOSED: "مغلق" };
  const priorityLabels = { URGENT: "عاجل", NORMAL: "عادي", LOW: "منخفض" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="إدارة المراسلات الصادرة والواردة مع تتبع المواعيد"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
              {MOCK.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 120 }}>
              {["الكل", "PENDING", "OVERDUE", "CLOSED"].map(s => <option key={s} value={s}>{s === "الكل" ? "كل الحالات" : statusLabels[s]}</option>)}
            </Select>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 100 }}>
              {["الكل", "OUTGOING", "INCOMING"].map(t => <option key={t} value={t}>{t === "الكل" ? "الكل" : typeLabels[t]}</option>)}
            </Select>
            <Btn onClick={openCreate}>+ خطاب جديد</Btn>
          </div>
        }
      >📨 المراسلات</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="إجمالي المراسلات" value={filtered.length} icon="📨" color={C.brand} />
          <Stat label="متأخرة (تحتاج رد)" value={overdue} icon="🚨" color={overdue > 0 ? C.danger : C.success} />
          <Stat label="قيد الانتظار" value={pending} icon="⏳" color={C.warning} />
          <Stat label="مغلقة" value={filtered.filter(l => l.status === "CLOSED").length} icon="✅" color={C.success} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead>
              <tr><Th>الرقم</Th><Th>الموضوع</Th><Th>النوع</Th><Th>إلى / من</Th><Th>تاريخ الخطاب</Th><Th>تاريخ الاستحقاق</Th><Th>الأولوية</Th><Th>الحالة</Th><Th>الإجراءات</Th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><Td colSpan={9} s={{ textAlign: "center", padding: 40, color: C.muted }}>لا توجد مراسلات</Td></tr>}
              {filtered.map(l => {
                const daysRemain = l.dueDate ? daysLeft(l.dueDate) : null;
                return (
                  <tr key={l.id}>
                    <Td><span style={{ color: C.brand, fontWeight: 700, fontSize: 10, fontFamily: "monospace" }}>{l.number}</span></Td>
                    <Td><div style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subject}</div></Td>
                    <Td><Badge text={typeLabels[l.type] || l.type} color={l.type === "OUTGOING" ? C.info : C.purple} /></Td>
                    <Td style={{ color: C.textSub, fontSize: 10 }}>{l.toFrom}</Td>
                    <Td style={{ color: C.muted, fontSize: 10 }}>{fmtDate(l.date)}</Td>
                    <Td>
                      {l.dueDate ? (
                        <span style={{ fontSize: 10, color: daysRemain !== null && daysRemain < 0 ? C.danger : daysRemain !== null && daysRemain < 7 ? C.warning : C.muted }}>
                          {fmtDate(l.dueDate)} {daysRemain !== null && daysRemain < 0 ? `(${Math.abs(daysRemain)} يوم تأخير)` : daysRemain !== null ? `(${daysRemain} يوم)` : ""}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td><Badge text={priorityLabels[l.priority] || l.priority} color={l.priority === "URGENT" ? C.danger : l.priority === "NORMAL" ? C.info : C.muted} /></Td>
                    <Td><Badge text={statusLabels[l.status] || l.status} /></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn variant="outline" size="xs" onClick={() => openEdit(l)}>✏</Btn>
                        {l.status !== "CLOSED" && <Btn variant="ghost" size="xs" color={C.success} onClick={() => closeLetterAction(l.id)}>✓ إغلاق</Btn>}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "✏ تعديل خطاب" : "📨 إنشاء خطاب جديد"} width={620}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="رقم الخطاب" req third><Input value={form.number} onChange={set("number")} placeholder="LTR-2025-050" /></Fld>
          <Fld label="النوع" req third>
            <Select value={form.type} onChange={set("type")}>
              <option value="OUTGOING">صادر</option>
              <option value="INCOMING">وارد</option>
            </Select>
          </Fld>
          <Fld label="الأولوية" third>
            <Select value={form.priority} onChange={set("priority")}>
              <option value="URGENT">عاجل</option>
              <option value="NORMAL">عادي</option>
              <option value="LOW">منخفض</option>
            </Select>
          </Fld>
          <Fld label="الموضوع" req><Input value={form.subject} onChange={set("subject")} placeholder="موضوع الخطاب..." /></Fld>
          <Fld label={form.type === "OUTGOING" ? "إلى" : "من"} req half><Input value={form.toFrom} onChange={set("toFrom")} placeholder="اسم الجهة..." /></Fld>
          <Fld label="الحالة" half>
            <Select value={form.status || "PENDING"} onChange={set("status")}>
              <option value="PENDING">قيد الانتظار</option>
              <option value="OVERDUE">متأخر</option>
              <option value="CLOSED">مغلق</option>
            </Select>
          </Fld>
          <Fld label="تاريخ الخطاب" req half><Input type="date" value={form.date} onChange={set("date")} /></Fld>
          <Fld label="تاريخ الاستحقاق" half><Input type="date" value={form.dueDate} onChange={set("dueDate")} /></Fld>
          <Fld label="نص الخطاب (اختياري)"><Textarea value={form.body || ""} onChange={set("body")} rows={3} placeholder="محتوى الخطاب..." /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save}>{editing ? "تحديث" : "إنشاء"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GUARANTEES — Phase 5: Full CRUD + Expiry Alerts ✨
// ══════════════════════════════════════════════════════════════
function GuaranteesScreen({ addToast, tenantId, projectId: propProjectId }) {
  const [projectId, setProjectId] = useState("p1");
  const defaultProjectId = propProjectId || MOCK.projects[0]?.id;
  const { data: guarantees, setData: setGuarantees, busy: loadingGuarantees, reload: reloadGuarantees } =
    useSupabaseTable('guarantees', defaultProjectId, MOCK.guarantees, 'expiry_date');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const EMPTY = { number: "", type: "PERFORMANCE_BOND", bank: "", value: "", issueDate: "", expiryDate: "", notes: "" };
  const [form, setForm] = useState(EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const items = guarantees.filter(g => g.projectId === projectId);
  const active = items.filter(g => g.status === "ACTIVE");
  const expiring30 = active.filter(g => daysLeft(g.expiryDate) <= 30);
  const expiring90 = active.filter(g => daysLeft(g.expiryDate) <= 90);
  const totalValue = active.reduce((s, g) => s + g.value, 0);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit = (g) => { setForm({ ...g }); setEditing(g.id); setModal(true); };
  const save = () => {
    if (!form.number || !form.bank || !form.value || !form.expiryDate) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    const typeAr = { PERFORMANCE_BOND: "ضمان حسن تنفيذ", ADVANCE_PAYMENT: "ضمان استرداد سلفة", MAINTENANCE_BOND: "ضمان صيانة", BID_BOND: "ضمان عطاء" };
    const guarPayload = { ...form, value: +form.value, type_ar: typeAr[form.type],
      expiry_date: form.expiryDate, issue_date: form.issueDate || null,
      status: editing ? form.status : "ACTIVE" };
    sbUpsert('guarantees', guarPayload, editing, tenantId, defaultProjectId)
      .then(r => r.ok ? reloadGuarantees() : (editing
        ? setGuarantees(gs => gs.map(g => g.id === editing ? { ...g, ...form, value: +form.value } : g))
        : setGuarantees(gs => [...gs, { ...guarPayload, id: `g${Date.now()}` }])));
    addToast(editing ? "تم تحديث الضمان ✓" : "تم إنشاء الضمان ✓", "success");
    setModal(false);
  };
  const release = (id) => {
    sbPatch('guarantees', id, { status: "RELEASED" })
      .then(r => r.ok ? reloadGuarantees() : setGuarantees(gs => gs.map(g => g.id === id ? { ...g, status: "RELEASED" } : g)));
    addToast("تم تحرير الضمان ✓", "success");
  };

  const typeLabels = { PERFORMANCE_BOND: "ضمان حسن تنفيذ", ADVANCE_PAYMENT: "ضمان استرداد سلفة", MAINTENANCE_BOND: "ضمان صيانة", BID_BOND: "ضمان عطاء" };
  const statusLabels = { ACTIVE: "نشط", EXPIRED: "منتهي", RELEASED: "محرر", CALLED: "مستدعى" };

  const getExpiryColor = (g) => {
    if (g.status !== "ACTIVE") return C.muted;
    const d = daysLeft(g.expiryDate);
    if (d <= 30) return C.danger;
    if (d <= 90) return C.warning;
    return C.success;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="إدارة الضمانات البنكية مع تنبيهات الانتهاء"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
              {MOCK.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </Select>
            <Btn onClick={openCreate}>+ ضمان جديد</Btn>
          </div>
        }
      >🔐 الضمانات البنكية</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        {expiring30.length > 0 && (
          <div style={{ background: "#2d0c0c", border: `1px solid ${C.danger}44`, borderRadius: 8, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ color: C.danger, fontWeight: 700, fontSize: 11 }}>تحذير: {expiring30.length} ضمان(ات) تنتهي خلال 30 يوماً!</div>
              <div style={{ color: C.textSub, fontSize: 10, marginTop: 2 }}>{expiring30.map(g => `${g.number} (${daysLeft(g.expiryDate)} يوم)`).join(" | ")}</div>
            </div>
          </div>
        )}
        {expiring90.length > 0 && expiring30.length === 0 && (
          <div style={{ background: "#2d1800", border: `1px solid ${C.warning}44`, borderRadius: 8, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ color: C.warning, fontWeight: 700, fontSize: 11 }}>{expiring90.length} ضمان(ات) تنتهي خلال 90 يوماً</div>
              <div style={{ color: C.textSub, fontSize: 10, marginTop: 2 }}>{expiring90.map(g => g.number).join(" | ")}</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="إجمالي قيمة الضمانات النشطة" value={`${fmt(totalValue / 1e6, 2)} م`} icon="🏦" color={C.brand} />
          <Stat label="ضمانات نشطة" value={active.length} icon="✅" color={C.success} />
          <Stat label="تنتهي < 30 يوم" value={expiring30.length} icon="🚨" color={expiring30.length > 0 ? C.danger : C.muted} />
          <Stat label="تنتهي < 90 يوم" value={expiring90.length} icon="⚠️" color={expiring90.length > 0 ? C.warning : C.muted} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead>
              <tr><Th>الرقم</Th><Th>النوع</Th><Th>البنك</Th><Th>القيمة (ج.م)</Th><Th>تاريخ الإصدار</Th><Th>تاريخ الانتهاء</Th><Th>الأيام المتبقية</Th><Th>الحالة</Th><Th>الإجراءات</Th></tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><Td colSpan={9} s={{ textAlign: "center", padding: 40, color: C.muted }}>لا توجد ضمانات</Td></tr>}
              {items.map(g => {
                const drem = g.status === "ACTIVE" ? daysLeft(g.expiryDate) : null;
                const exCol = getExpiryColor(g);
                return (
                  <tr key={g.id}>
                    <Td><span style={{ color: C.brand, fontWeight: 700 }}>{g.number}</span></Td>
                    <Td><span style={{ fontSize: 10, color: C.text }}>{typeLabels[g.type] || g.typeAr || g.type}</span></Td>
                    <Td style={{ color: C.textSub }}>{g.bank}</Td>
                    <Td style={{ fontWeight: 700, color: C.text }}>{fmt(g.value)} ج.م</Td>
                    <Td style={{ color: C.muted, fontSize: 10 }}>{fmtDate(g.issueDate)}</Td>
                    <Td style={{ color: exCol, fontWeight: drem !== null && drem <= 90 ? 700 : 400 }}>{fmtDate(g.expiryDate)}</Td>
                    <Td>
                      {drem !== null ? (
                        <span style={{ color: exCol, fontWeight: 700, fontSize: 11 }}>
                          {drem > 0 ? `${drem} يوم` : `${Math.abs(drem)} يوم تأخير`}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td><Badge text={statusLabels[g.status] || g.status} /></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn variant="outline" size="xs" onClick={() => openEdit(g)}>✏</Btn>
                        {g.status === "ACTIVE" && <Btn variant="ghost" size="xs" color={C.warning} onClick={() => release(g.id)}>↩ تحرير</Btn>}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "✏ تعديل ضمان" : "🔐 إضافة ضمان جديد"} width={580}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="رقم الضمان" req half><Input value={form.number} onChange={set("number")} placeholder="PB-2025-001" /></Fld>
          <Fld label="نوع الضمان" req half>
            <Select value={form.type} onChange={set("type")}>
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Fld>
          <Fld label="اسم البنك" req><Input value={form.bank} onChange={set("bank")} placeholder="بنك مصر" /></Fld>
          <Fld label="قيمة الضمان (ج.م)" req half><Input type="number" value={form.value} onChange={set("value")} placeholder="9250000" /></Fld>
          <Fld label="الحالة" half>
            <Select value={form.status || "ACTIVE"} onChange={set("status")}>
              <option value="ACTIVE">نشط</option>
              <option value="EXPIRED">منتهي</option>
              <option value="RELEASED">محرر</option>
              <option value="CALLED">مستدعى</option>
            </Select>
          </Fld>
          <Fld label="تاريخ الإصدار" req half><Input type="date" value={form.issueDate} onChange={set("issueDate")} /></Fld>
          <Fld label="تاريخ الانتهاء" req half><Input type="date" value={form.expiryDate} onChange={set("expiryDate")} /></Fld>
          <Fld label="ملاحظات"><Textarea value={form.notes || ""} onChange={set("notes")} rows={2} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save}>{editing ? "تحديث" : "إضافة"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VARIATION ORDERS — Phase 5: Full CRUD + Approval Workflow ✨
// ══════════════════════════════════════════════════════════════
function VariationOrdersScreen({ addToast, tenantId, projectId: propProjectId }) {
  const [projectId, setProjectId] = useState("p1");
  const defaultProjectId = propProjectId || MOCK.projects[0]?.id;
  const { data: vos, setData: setVOs, busy: loadingVOs, reload: reloadVOs } =
    useSupabaseTable('variation_orders', defaultProjectId, MOCK.variationOrders, 'submitted_at');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const EMPTY = { number: "", description: "", type: "ADDITION", value: "", submittedAt: "" };
  const [form, setForm] = useState(EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const items = vos.filter(v => v.projectId === projectId);
  const approved = items.filter(v => v.status === "APPROVED");
  const pending = items.filter(v => v.status === "UNDER_REVIEW" || v.status === "SUBMITTED");
  const totalApprovedValue = approved.reduce((s, v) => s + v.value, 0);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit = (v) => { setForm({ ...v }); setEditing(v.id); setModal(true); };
  const save = () => {
    if (!form.number || !form.description || !form.value) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    const voPayload = { ...form, value: +form.value, status: editing ? form.status : "SUBMITTED",
      submitted_at: form.submittedAt || new Date().toISOString().split("T")[0] };
    sbUpsert('variation_orders', voPayload, editing, tenantId, defaultProjectId)
      .then(r => r.ok ? reloadVOs() : (editing
        ? setVOs(vs => vs.map(v => v.id === editing ? { ...v, ...form, value: +form.value } : v))
        : setVOs(vs => [...vs, { ...voPayload, id: `v${Date.now()}` }])));
    addToast(editing ? "تم تحديث أمر التغيير ✓" : "تم تقديم أمر التغيير ✓", "success");
    setModal(false);
  };

  const approve = (id) => {
    sbPatch('variation_orders', id, { status: "APPROVED", approved_at: new Date().toISOString().split("T")[0] })
      .then(r => r.ok ? reloadVOs() : setVOs(vs => vs.map(v => v.id === id ? { ...v, status: "APPROVED" } : v)));
    addToast("تم اعتماد أمر التغيير ✓", "success");
  };
  const reject = () => {
    sbPatch('variation_orders', rejectModal, { status: "REJECTED" })
      .then(r => r.ok ? reloadVOs() : setVOs(vs => vs.map(v => v.id === rejectModal ? { ...v, status: "REJECTED" } : v)));
    addToast("تم رفض أمر التغيير", "info");
    setRejectModal(null); setRejectReason("");
  };

  const typeLabels = { ADDITION: "إضافة", DEDUCTION: "حذف", SUBSTITUTION: "تعديل" };
  const statusLabels = { DRAFT: "مسودة", SUBMITTED: "مقدم", UNDER_REVIEW: "قيد المراجعة", APPROVED: "معتمد", REJECTED: "مرفوض" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="أوامر التغيير مع سير عمل الاعتماد"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
              {MOCK.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </Select>
            <Btn onClick={openCreate}>+ أمر تغيير جديد</Btn>
          </div>
        }
      >🔄 أوامر التغيير (VO)</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="إجمالي القيمة المعتمدة" value={`${totalApprovedValue >= 0 ? "+" : ""}${fmt(totalApprovedValue / 1e6, 2)} م`} icon="✅" color={totalApprovedValue >= 0 ? C.success : C.danger} />
          <Stat label="معتمدة" value={approved.length} icon="🟢" color={C.success} />
          <Stat label="قيد المراجعة" value={pending.length} icon="⏳" color={C.warning} />
          <Stat label="إجمالي أوامر التغيير" value={items.length} icon="🔄" color={C.brand} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead>
              <tr><Th>الرقم</Th><Th>الوصف</Th><Th>النوع</Th><Th>القيمة (ج.م)</Th><Th>تاريخ التقديم</Th><Th>الحالة</Th><Th>الإجراءات</Th></tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><Td colSpan={7} s={{ textAlign: "center", padding: 40, color: C.muted }}>لا توجد أوامر تغيير</Td></tr>}
              {items.map(v => (
                <tr key={v.id}>
                  <Td><span style={{ color: C.brand, fontWeight: 700 }}>{v.number}</span></Td>
                  <Td><div style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.description}</div></Td>
                  <Td><Badge text={typeLabels[v.type] || v.type} color={v.type === "ADDITION" ? C.success : v.type === "DEDUCTION" ? C.danger : C.warning} /></Td>
                  <Td>
                    <span style={{ fontWeight: 700, color: v.value >= 0 ? C.success : C.danger }}>
                      {v.value >= 0 ? "+" : ""}{fmt(v.value)} ج.م
                    </span>
                  </Td>
                  <Td style={{ color: C.muted, fontSize: 10 }}>{fmtDate(v.submittedAt)}</Td>
                  <Td><Badge text={statusLabels[v.status] || v.status} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(v.status === "SUBMITTED" || v.status === "UNDER_REVIEW") && <>
                        <Btn variant="success" size="xs" onClick={() => approve(v.id)}>✓ اعتماد</Btn>
                        <Btn variant="danger" size="xs" onClick={() => setRejectModal(v.id)}>✗ رفض</Btn>
                      </>}
                      <Btn variant="outline" size="xs" onClick={() => openEdit(v)}>✏</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "✏ تعديل أمر التغيير" : "🔄 تقديم أمر تغيير جديد"} width={560}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="رقم أمر التغيير" req half><Input value={form.number} onChange={set("number")} placeholder="VO-2025-004" /></Fld>
          <Fld label="النوع" req half>
            <Select value={form.type} onChange={set("type")}>
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Fld>
          <Fld label="الوصف التفصيلي" req><Textarea value={form.description} onChange={set("description")} rows={3} placeholder="وصف أمر التغيير..." /></Fld>
          <Fld label="القيمة (ج.م) — سالبة للحذف" req half>
            <Input type="number" value={form.value} onChange={set("value")} placeholder="2850000" />
          </Fld>
          <Fld label="تاريخ التقديم" half><Input type="date" value={form.submittedAt} onChange={set("submittedAt")} /></Fld>
          {form.value && (
            <div style={{ width: "100%", background: +form.value >= 0 ? C.successDim : C.dangerDim, borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: C.textSub }}>تأثير العقد:</span>
              <span style={{ fontSize: 11, color: +form.value >= 0 ? C.success : C.danger, fontWeight: 700 }}>
                {+form.value >= 0 ? "زيادة" : "نقصان"} بمقدار {fmt(Math.abs(+form.value))} ج.م ({pct(Math.abs(+form.value), MOCK.projects.find(p => p.id === projectId)?.contractValue || 1)}% من قيمة العقد)
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save}>{editing ? "تحديث" : "تقديم"}</Btn>
        </div>
      </Modal>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="✗ رفض أمر التغيير" width={420}>
        <Fld label="سبب الرفض" req>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="اذكر سبب رفض أمر التغيير..." rows={3} />
        </Fld>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="outline" onClick={() => setRejectModal(null)}>إلغاء</Btn>
          <Btn variant="danger" onClick={reject} disabled={!rejectReason}>تأكيد الرفض</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// QUALITY TESTS — Phase 5: SPC/Cpk Analysis ✨
// ══════════════════════════════════════════════════════════════
function QualityScreen({ addToast, tenantId, projectId: propProjectId }) {
  const [projectId, setProjectId] = useState("p1");
  const defaultProjectId = propProjectId || MOCK.projects[0]?.id;
  const { data: tests, setData: setTests, busy: loadingTests, reload: reloadTests } =
    useSupabaseTable('quality_tests', defaultProjectId, MOCK.qualityTests, 'tested_at');
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("table");
  const [selectedType, setSelectedType] = useState("دمك نووي");
  const EMPTY = { type: "دمك نووي", chainage: "", location: "", result: "", required: "95", usl: "105", lsl: "95", testedAt: "", lab: "", notes: "" };
  const [form, setForm] = useState(EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const items = tests.filter(t => t.projectId === projectId);
  const passed = items.filter(t => t.status === "PASS").length;
  const passRate = items.length > 0 ? (passed / items.length * 100).toFixed(1) : 0;

  const save = () => {
    if (!form.chainage || !form.result) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    const st = +form.result >= +form.required ? "PASS" : "FAIL";
    const qtPayload = { ...form, result: +form.result, required: +form.required,
      usl: +form.usl || null, lsl: +form.lsl || null, status: st,
      tested_at: new Date().toISOString().split("T")[0] };
    sbUpsert('quality_tests', qtPayload, null, tenantId, defaultProjectId)
      .then(r => r.ok ? reloadTests() : setTests(ts => [...ts, { ...qtPayload, id: `qt${Date.now()}` }]));
    addToast(`تم تسجيل الاختبار — ${st === "PASS" ? "✓ ناجح" : "✗ راسب"}`, st === "PASS" ? "success" : "error");
    setModal(false);
  };

  // SPC/Cpk Calculation
  const spcTests = items.filter(t => t.type === selectedType && t.usl && t.lsl);
  const cpkCalc = useMemo(() => {
    if (spcTests.length < 3) return null;
    const values = spcTests.map(t => t.result);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sigma = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const usl = spcTests[0].usl, lsl = spcTests[0].lsl;
    const Cp = sigma > 0 ? (usl - lsl) / (6 * sigma) : 0;
    const Cpk = sigma > 0 ? Math.min((usl - mean) / (3 * sigma), (mean - lsl) / (3 * sigma)) : 0;
    return { mean: mean.toFixed(2), sigma: sigma.toFixed(3), Cp: Cp.toFixed(2), Cpk: Cpk.toFixed(2), usl, lsl, count: values.length };
  }, [spcTests, selectedType]);

  const cpkColor = (cpk) => +cpk >= 1.67 ? C.success : +cpk >= 1.33 ? C.brand : +cpk >= 1.0 ? C.warning : C.danger;
  const cpkLabel = (cpk) => +cpk >= 1.67 ? "ممتازة" : +cpk >= 1.33 ? "قادرة" : +cpk >= 1.0 ? "هامشية" : "وقف الإنتاج";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="اختبارات الجودة مع تحليل SPC/Cpk"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
              {MOCK.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </Select>
            <Btn onClick={() => setModal(true)}>+ اختبار جديد</Btn>
          </div>
        }
      >🔬 اختبارات الجودة</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="إجمالي الاختبارات" value={items.length} icon="🔬" color={C.brand} />
          <Stat label="ناجح" value={passed} icon="✅" color={C.success} />
          <Stat label="راسب" value={items.length - passed} icon="❌" color={items.length - passed > 0 ? C.danger : C.muted} />
          <Stat label="معدل النجاح" value={`${passRate}%`} icon="📊" color={+passRate >= 90 ? C.success : C.warning} />
        </div>

        <Tabs tabs={[{ id: "table", label: "📋 جدول الاختبارات" }, { id: "spc", label: "📈 تحليل SPC/Cpk" }]} active={tab} onChange={setTab} />

        {tab === "table" && (
          <Card style={{ padding: 0 }}>
            <TblWrap>
              <thead><tr><Th>النوع</Th><Th>الكيلومتر</Th><Th>الموقع</Th><Th>النتيجة</Th><Th>المطلوب</Th><Th>الفرق</Th><Th>الحالة</Th><Th>التاريخ</Th></tr></thead>
              <tbody>
                {items.map(t => {
                  const diff = t.result - t.required;
                  return (
                    <tr key={t.id}>
                      <Td><Badge text={t.type} color={C.purple} /></Td>
                      <Td style={{ fontFamily: "monospace", color: C.info }}>{t.chainage}</Td>
                      <Td style={{ color: C.textSub, fontSize: 10 }}>{t.location}</Td>
                      <Td style={{ fontWeight: 700, color: t.status === "PASS" ? C.success : C.danger, fontFamily: "monospace" }}>{t.result}%</Td>
                      <Td style={{ color: C.muted, fontFamily: "monospace" }}>{t.required}%</Td>
                      <Td style={{ color: diff >= 0 ? C.success : C.danger, fontFamily: "monospace" }}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}%</Td>
                      <Td><Badge text={t.status === "PASS" ? "ناجح" : "راسب"} /></Td>
                      <Td style={{ color: C.muted, fontSize: 10 }}>{fmtDate(t.testedAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </TblWrap>
          </Card>
        )}

        {tab === "spc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.textSub }}>نوع الاختبار:</span>
              <Select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: 160 }}>
                {[...new Set(items.map(t => t.type))].map(t => <option key={t}>{t}</option>)}
              </Select>
            </div>
            {cpkCalc ? (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                <Card>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 12 }}>📈 مخطط التحكم — {selectedType}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={spcTests.map((t, i) => ({ n: i + 1, result: t.result, ucl: t.usl, lcl: t.lsl, target: t.required }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="n" tick={{ fill: C.muted, fontSize: 9 }} label={{ value: "رقم العينة", fill: C.muted, fontSize: 9, position: "insideBottom" }} />
                      <YAxis tick={{ fill: C.muted, fontSize: 9 }} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10 }} />
                      <ReferenceLine y={spcTests[0]?.usl} stroke={C.danger} strokeDasharray="4 4" label={{ value: "UCL", fill: C.danger, fontSize: 9 }} />
                      <ReferenceLine y={spcTests[0]?.lsl} stroke={C.danger} strokeDasharray="4 4" label={{ value: "LCL", fill: C.danger, fontSize: 9 }} />
                      <ReferenceLine y={spcTests[0]?.required} stroke={C.brand} strokeDasharray="4 4" label={{ value: "Target", fill: C.brand, fontSize: 9 }} />
                      <Line type="monotone" dataKey="result" stroke={C.success} strokeWidth={2} dot={{ fill: C.success, r: 4 }} name="النتيجة" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 12 }}>🎯 مؤشرات Cpk</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: C.surface, borderRadius: 8, padding: 14, textAlign: "center", border: `1px solid ${cpkColor(cpkCalc.Cpk)}44` }}>
                      <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>Cpk</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: cpkColor(cpkCalc.Cpk) }}>{cpkCalc.Cpk}</div>
                      <div style={{ fontSize: 10, color: cpkColor(cpkCalc.Cpk), marginTop: 4, fontWeight: 700 }}>{cpkLabel(cpkCalc.Cpk)}</div>
                      <ProgressBar value={Math.min(100, +cpkCalc.Cpk / 2 * 100)} color={cpkColor(cpkCalc.Cpk)} height={4} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[["Cp", cpkCalc.Cp], ["σ", cpkCalc.sigma], ["المتوسط", cpkCalc.mean], ["العينات", cpkCalc.count]].map(([l, v]) => (
                        <div key={l} style={{ background: C.surface, borderRadius: 6, padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 9, color: C.muted }}>{l}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: C.muted, background: C.surface, borderRadius: 6, padding: 8 }}>
                      Cpk ≥ 1.67: ممتاز | ≥ 1.33: قادر | ≥ 1.00: هامشي | &lt; 1.00: وقف الإنتاج
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card><div style={{ textAlign: "center", padding: 40, color: C.muted }}>يحتاج 3 اختبارات أو أكثر من نوع واحد للتحليل الإحصائي</div></Card>
            )}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🔬 تسجيل اختبار جديد" width={560}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="نوع الاختبار" req half>
            <Select value={form.type} onChange={set("type")}>
              {["دمك نووي", "اختبار مارشال", "CBR", "فاريل", "تحليل حبيبي"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </Fld>
          <Fld label="الكيلومتر" req half><Input value={form.chainage} onChange={set("chainage")} placeholder="KM 18+000" /></Fld>
          <Fld label="الموقع / الطبقة" half><Input value={form.location} onChange={set("location")} placeholder="طبقة الأساس" /></Fld>
          <Fld label="اسم المعمل" half><Input value={form.lab} onChange={set("lab")} placeholder="معمل الموقع" /></Fld>
          <Fld label="النتيجة" req third><Input type="number" value={form.result} onChange={set("result")} placeholder="97.5" /></Fld>
          <Fld label="الحد الأدنى (LSL)" third><Input type="number" value={form.lsl} onChange={set("lsl")} /></Fld>
          <Fld label="الحد الأقصى (USL)" third><Input type="number" value={form.usl} onChange={set("usl")} /></Fld>
          <Fld label="المتطلب" req third><Input type="number" value={form.required} onChange={set("required")} /></Fld>
          <Fld label="تاريخ الاختبار" req half><Input type="date" value={form.testedAt} onChange={set("testedAt")} /></Fld>
          {form.result && form.required && (
            <div style={{ width: "100%", background: +form.result >= +form.required ? C.successDim : C.dangerDim, borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: C.textSub }}>التوقع:</span>
              <span style={{ color: +form.result >= +form.required ? C.success : C.danger, fontWeight: 700, fontSize: 11 }}>{+form.result >= +form.required ? "✓ ناجح" : "✗ راسب"}</span>
            </div>
          )}
          <Fld label="ملاحظات"><Textarea value={form.notes} onChange={set("notes")} rows={2} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save}>تسجيل</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AUDIT LOG — Phase 5 ✨
// ══════════════════════════════════════════════════════════════
function AuditLogScreen({ tenantId }) {
  const [filter, setFilter] = useState("الكل");
  const [logs,   setLogs]   = useState(MOCK.auditLog);
  const [busy,   setBusy]   = useState(false);
  const actions = ["الكل","CREATE","UPDATE","APPROVE","REJECT","DELETE","SUBMIT","CLOSE"];

  useEffect(() => {
    if (!tenantId) return;
    setBusy(true);
    import('@lib/supabaseClient').then(({ supabase }) =>
      supabase.from('audit_log').select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100)
    ).then(({ data, error }) => {
      if (!error && data?.length) setLogs(data);
    }).finally(() => setBusy(false));
  }, [tenantId]);

  const filtered = logs.filter(l => filter === "الكل" || l.action === filter);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr
        sub="سجل التدقيق غير القابل للحذف — كل العمليات مسجلة"
        action={
          <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 140 }}>
            {actions.map(a => <option key={a}>{a}</option>)}
          </Select>
        }
      >🔍 سجل التدقيق (Audit Log)</SectionHdr>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>الوقت</Th><Th>المستخدم</Th><Th>الدور</Th><Th>الإجراء</Th><Th>الكيان</Th><Th>التفاصيل</Th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <Td style={{ color: C.muted, fontSize: 10, whiteSpace: "nowrap" }}>{l.created_at ? new Date(l.created_at).toLocaleString('ar-EG') : l.ts}</Td>
                  <Td style={{ fontWeight: 600 }}>{l.user_name || l.user}</Td>
                  <Td><Badge text={l.user_role || l.role} color={(l.user_role||l.role) === "ADMIN" ? C.brand : (l.user_role||l.role) === "MANAGER" ? C.info : C.purple} /></Td>
                  <Td><Badge text={l.action} color={l.action === "CREATE" ? C.success : l.action === "DELETE" ? C.danger : l.action === "APPROVE" ? C.brand : C.info} /></Td>
                  <Td><span style={{ color: C.teal, fontSize: 10, fontFamily: "monospace" }}>{l.entity}</span></Td>
                  <Td style={{ fontSize: 10, color: C.textSub }}>{l.detail}</Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@nileroads.com");
  const [pass, setPass] = useState("Admin@2025!");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handle = async () => {
    setErr("");
    if (!email || !pass) { setErr("أدخل البريد وكلمة المرور"); return; }
    setLoading(true);
    try {
      const { supabase } = await import('@lib/supabaseClient');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      onLogin(data.user);
    } catch (e) {
      setErr(e.message || "بيانات الدخول غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cairo','Tajawal','Segoe UI',sans-serif", direction: "rtl" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 44, width: 400, boxShadow: "0 24px 80px #000c" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏗</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.brand, letterSpacing: "-1px" }}>TECHOFFICE ERP</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>v4.0 — المرحلة الرابعة والخامسة</div>
          <div style={{ fontSize: 9, color: C.success, marginTop: 2 }}>✅ API Layer + Egyptian Formula + Full CRUD</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Fld label="البريد الإلكتروني"><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></Fld>
          <Fld label="كلمة المرور"><Input value={pass} onChange={e => setPass(e.target.value)} type="password" /></Fld>
          {err && <div style={{ color: C.danger, fontSize: 11 }}>{err}</div>}
          <Btn onClick={handle} size="md" style={{ width: "100%", marginTop: 4 }}>{loading ? "⏳ جاري التحقق..." : "تسجيل الدخول"}</Btn>
        </div>
        <div style={{ marginTop: 20, padding: 14, background: C.surface, borderRadius: 8, fontSize: 9, color: C.muted }}>
          <div style={{ color: C.textSub, fontWeight: 700, marginBottom: 6 }}>حسابات تجريبية:</div>
          {[["admin@nileroads.com", "ADMIN"], ["manager@nileroads.com", "MANAGER"], ["engineer@nileroads.com", "ENGINEER"], ["accountant@nileroads.com", "ACCOUNTANT"]].map(([e, r]) => (
            <div key={e} style={{ display: "flex", gap: 8, marginBottom: 3, cursor: "pointer" }} onClick={() => setEmail(e)}>
              <span style={{ color: C.brand }}>{e}</span>
              <Badge text={r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
const MODULES = [
  { id: "dashboard", icon: "📊", label: "لوحة التحكم" },
  { id: "projects", icon: "🏗", label: "المشاريع" },
  { id: "extracts", icon: "💰", label: "المستخلصات" },
  { id: "boq", icon: "📋", label: "جداول الكميات" },
  { id: "letters", icon: "📨", label: "المراسلات" },
  { id: "guarantees", icon: "🔐", label: "الضمانات" },
  { id: "vos", icon: "🔄", label: "أوامر التغيير" },
  { id: "quality", icon: "🔬", label: "الجودة" },
  { id: "audit", icon: "🔍", label: "سجل التدقيق" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [module, setModule] = useState("dashboard");
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  if (!user) return <LoginScreen onLogin={(u) => setUser(u)} />;

  const renderModule = () => {
    const props = { addToast };
    switch (module) {
      case "dashboard": return <Dashboard />;
      case "projects": return <ProjectsScreen {...props} />;
      case "extracts": return <ExtractsScreen {...props} />;
      case "boq": return <BOQScreen {...props} />;
      case "letters": return <LettersScreen {...props} />;
      case "guarantees": return <GuaranteesScreen {...props} />;
      case "vos": return <VariationOrdersScreen {...props} />;
      case "quality": return <QualityScreen {...props} />;
      case "audit": return <AuditLogScreen />;
      default: return <Dashboard />;
    }
  };

  const overdue = MOCK.letters.filter(l => l.status === "OVERDUE").length;
  const expiring = MOCK.guarantees.filter(g => g.status === "ACTIVE" && daysLeft(g.expiryDate) <= 90).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Cairo','Tajawal','Segoe UI',sans-serif", direction: "rtl", display: "flex", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.brand }}>🏗 TECHOFFICE</div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>ERP v4.0 — المرحلة 4 & 5</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {MODULES.map(m => {
            const alert = (m.id === "letters" && overdue > 0) ? overdue : (m.id === "guarantees" && expiring > 0) ? expiring : 0;
            return (
              <button key={m.id} onClick={() => setModule(m.id)}
                style={{ width: "100%", padding: "9px 16px", background: module === m.id ? C.brandDim : "transparent", border: module === m.id ? `1px solid ${C.brand}33` : "1px solid transparent", borderRadius: 0, cursor: "pointer", textAlign: "right", color: module === m.id ? C.brand : C.textSub, fontFamily: "inherit", fontWeight: module === m.id ? 700 : 400, fontSize: 11, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </div>
                {alert > 0 && <span style={{ background: C.danger, color: "#fff", fontSize: 9, fontWeight: 900, borderRadius: "10px", padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{alert}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 9, color: C.muted }}>{user.role}</div>
          <button onClick={() => setUser(null)} style={{ marginTop: 8, width: "100%", padding: "5px 0", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: C.textSub }}>شركة نيل رودز للطرق والجسور</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {overdue > 0 && <span style={{ fontSize: 10, color: C.danger, background: C.dangerDim, padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.danger}33` }}>🚨 {overdue} مراسلة متأخرة</span>}
            {expiring > 0 && <span style={{ fontSize: 10, color: C.warning, background: C.warningDim, padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.warning}33` }}>⚠️ {expiring} ضمان ينتهي</span>}
          </div>
        </div>

        {/* Module Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {renderModule()}
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  );
}


// ── Named Exports for phase7 ──
export {
  ProjectsScreen,
  ExtractsScreen,
  BOQScreen,
  LettersScreen,
  GuaranteesScreen,
  VariationOrdersScreen,
  QualityScreen,
  AuditLogScreen,
  calcEgyptianExtract,
  EgyptianCalcModal,
  MOCK,
};
