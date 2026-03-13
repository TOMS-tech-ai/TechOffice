import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@lib/supabaseClient";
import PaymentScreen from "./PaymentGateway";

// ── Design Tokens ──────────────────────────────────────────────
const C = {
  bg: "#02030a", surface: "#05060f", card: "#080b14", card2: "#0d1120",
  border: "#141828", border2: "#1c2235",
  brand: "#6366f1", brandHover: "#818cf8", brandDim: "#6366f114",
  success: "#22c55e", successDim: "#22c55e14",
  danger: "#ef4444", dangerDim: "#ef444414",
  warning: "#f59e0b", warningDim: "#f59e0b14",
  info: "#38bdf8", infoDim: "#38bdf814",
  purple: "#a78bfa", teal: "#2dd4bf",
  text: "#e8eaf2", textSub: "#6b7494", muted: "#323854",
  sidebar: "#030610",
};

const fmt = (n, d = 0) => n == null ? "—" : new Intl.NumberFormat("ar-EG", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const fmtDate = d => d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";
const daysLeft = d => Math.ceil((new Date(d) - new Date()) / 86400000);

// ── بيانات Supabase تُحمَّل في SuperAdmin component ──────────

const PLANS = {
  basic:      { label: "Basic",      color: C.info,    price: 20000,  maxUsers: 3,   maxProjects: 5,   features: ["3 مستخدمين", "5 مشاريع", "دعم بريد"] },
  pro:        { label: "Pro",        color: C.brand,   price: 50000,  maxUsers: 10,  maxProjects: 20,  features: ["10 مستخدمين", "20 مشروع", "دعم أولوية", "تقارير متقدمة"] },
  enterprise: { label: "Enterprise", color: C.purple,  price: 90000,  maxUsers: 999, maxProjects: 999, features: ["غير محدود", "دعم مخصص", "تخصيص كامل", "SLA مضمون"] },
  custom:     { label: "تفاوضي",     color: C.teal,    price: null,   isCustom: true, maxUsers: 999, maxProjects: 999, features: ["غير محدود", "سعر حسب الاتفاق", "دعم VIP مخصص", "SLA مضمون"] },
};

// ── تحويل صف Supabase → شكل مناسب للـ UI ─────────────────────
const mapRow = r => ({
  id:             r.id,
  name:           r.name,
  slug:           r.slug,
  plan:           r.plan,
  maxUsers:       r.max_users,
  maxProjects:    r.max_projects,
  isActive:       r.is_active,
  expiresAt:      r.expires_at,
  createdAt:      r.created_at,
  contactName:    r.contact_name,
  contactEmail:   r.contact_email,
  contactPhone:   r.contact_phone,
  users:          r.users_count,
  projects:       r.projects_count,
  lastLogin:      r.last_login,
  monthlyRevenue: r.annual_revenue,  // annual now
  customPrice:    r.custom_price,
  notes:          r.notes,
});

const ACTIVITY = [
  { id: 1, tenant: "شركة نيل رودز", action: "أضاف مستخلص M-07", time: "منذ 2 ساعة", icon: "💰", color: C.success },
  { id: 2, tenant: "مؤسسة سيناء", action: "مشروع جديد — طريق العريش", time: "منذ 4 ساعات", icon: "🏗", color: C.brand },
  { id: 3, tenant: "شركة الدلتا", action: "تجديد اشتراك Basic", time: "منذ 6 ساعات", icon: "💳", color: C.warning },
  { id: 4, tenant: "مجموعة النهر", action: "اشتراك ينتهي خلال 15 يوم", time: "منذ يوم", icon: "⚠️", color: C.danger },
  { id: 5, tenant: "شركة الصعيد", action: "تعطيل الحساب — انتهى الاشتراك", time: "منذ 12 يوم", icon: "🔒", color: C.muted },
];

// ── UI Primitives ──────────────────────────────────────────────
const Badge = ({ text, color }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: color + "22", color, border: `1px solid ${color}44`, whiteSpace: "nowrap" }}>{text}</span>
);

const Stat = ({ label, value, sub, icon, color = C.brand, glow }) => (
  <div style={{ background: C.card, border: `1px solid ${glow ? color + "44" : C.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: glow ? `0 0 24px ${color}18` : "none" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <span style={{ fontSize: 10, color: C.textSub, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 20 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: "-1px" }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Btn = ({ children, onClick, variant = "solid", color, size = "sm", disabled, style: s }) => {
  const [hov, setHov] = useState(false);
  const col = color || C.brand;
  const base = { cursor: disabled ? "not-allowed" : "pointer", border: "none", borderRadius: 7, fontFamily: "inherit", fontWeight: 700, transition: "all 0.15s", opacity: disabled ? 0.5 : 1 };
  const sizes = { xs: { fontSize: 9, padding: "3px 10px" }, sm: { fontSize: 10, padding: "6px 16px" }, md: { fontSize: 11, padding: "9px 22px" } };
  const variants = {
    solid:   { background: hov ? C.brandHover : col, color: col === C.brand || col === C.purple ? "#fff" : "#000" },
    outline: { background: "transparent", color: hov ? col : C.textSub, border: `1px solid ${hov ? col : C.border}` },
    ghost:   { background: hov ? col + "18" : "transparent", color: hov ? col : C.textSub },
    danger:  { background: hov ? "#dc2626" : C.danger, color: "#fff" },
    success: { background: hov ? "#16a34a" : C.success, color: "#fff" },
  };
  return <button style={{ ...base, ...sizes[size], ...variants[variant], ...s }} onClick={!disabled ? onClick : undefined} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</button>;
};

const Input = ({ value, onChange, placeholder, type = "text", style: s }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: 11, fontFamily: "inherit", width: "100%", outline: "none", boxSizing: "border-box", ...s }} />
);

const Select = ({ value, onChange, children, style: s }) => (
  <select value={value} onChange={onChange}
    style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: 11, fontFamily: "inherit", outline: "none", width: "100%", ...s }}>{children}</select>
);

const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width, maxWidth: "96vw", maxHeight: "92vh", overflow: "auto", padding: 28, boxShadow: "0 32px 80px #000e" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Fld = ({ label, children, half, third, req }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: third ? "calc(33% - 8px)" : half ? "calc(50% - 6px)" : "100%" }}>
    <label style={{ fontSize: 10, color: C.textSub, fontWeight: 600 }}>{label}{req && <span style={{ color: C.danger }}> *</span>}</label>
    {children}
  </div>
);

const TblWrap = ({ children }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>{children}</table>
  </div>
);
const Th = ({ children }) => <th style={{ padding: "11px 16px", textAlign: "right", color: C.textSub, fontWeight: 700, fontSize: 9, borderBottom: `1px solid ${C.border}`, background: C.bg, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>{children}</th>;
const Td = ({ children, s, colSpan }) => <td colSpan={colSpan} style={{ padding: "12px 16px", color: C.text, borderBottom: `1px solid ${C.border}22`, verticalAlign: "middle", ...s }}>{children}</td>;

// ── Screens ────────────────────────────────────────────────────

// Dashboard Overview
function OverviewScreen({ tenants, setScreen }) {
  const active    = tenants.filter(t => t.isActive);
  const totalRev  = tenants.filter(t => t.isActive).reduce((s, t) => s + t.monthlyRevenue, 0);
  const expiring  = tenants.filter(t => t.isActive && daysLeft(t.expiresAt) <= 30);
  const planCount = { basic: 0, pro: 0, enterprise: 0, custom: 0 };
  tenants.forEach(t => { if (planCount[t.plan] !== undefined) planCount[t.plan]++; });

  const revChart = [
    { m: "يوليو",    v: 155000 }, { m: "أغسطس",   v: 185000 },
    { m: "سبتمبر",  v: 210000 }, { m: "أكتوبر",  v: totalRev },
  ];
  const maxRev = Math.max(...revChart.map(r => r.v));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      {expiring.length > 0 && (
        <div style={{ background: "#2d0f00", border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div>
            <div style={{ color: C.warning, fontWeight: 700, fontSize: 11 }}>{expiring.length} اشتراك(ات) تنتهي خلال 30 يوماً</div>
            <div style={{ color: C.textSub, fontSize: 10, marginTop: 2 }}>{expiring.map(t => `${t.name} — ${daysLeft(t.expiresAt)} يوم`).join(" | ")}</div>
          </div>
          <Btn variant="outline" color={C.warning} size="xs" onClick={() => setScreen("tenants")} style={{ marginRight: "auto" }}>عرض الكل</Btn>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <Stat label="إجمالي الشركات" value={tenants.length} sub={`${active.length} نشطة`} icon="🏢" color={C.brand} glow />
        <Stat label="الإيراد السنوي" value={`${fmt(totalRev)} ج.م`} sub="اشتراكات نشطة" icon="💰" color={C.success} glow />
        <Stat label="المستخدمون النشطون" value={fmt(tenants.reduce((s, t) => s + t.users, 0))} icon="👥" color={C.info} />
        <Stat label="إجمالي المشاريع" value={fmt(tenants.reduce((s, t) => s + t.projects, 0))} icon="🏗" color={C.purple} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 16 }}>📈 الإيراد السنوي (ج.م)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140, padding: "0 8px" }}>
            {revChart.map((r, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: C.textSub, fontWeight: 700 }}>{fmt(r.v)}</span>
                <div style={{ width: "100%", height: `${(r.v / maxRev) * 110}px`, background: i === revChart.length - 1 ? C.brand : C.brand + "44", borderRadius: "6px 6px 0 0", transition: "height 0.5s ease", position: "relative" }}>
                  {i === revChart.length - 1 && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${C.brandHover}, ${C.brand})`, borderRadius: "6px 6px 0 0" }} />}
                </div>
                <span style={{ fontSize: 9, color: C.muted }}>{r.m}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "10px 14px", background: C.brand + "10", border: `1px solid ${C.brand}22`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.textSub }}>إجمالي الإيراد السنوي المتوقع</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.brand }}>{fmt(totalRev)} ج.م</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 14 }}>📦 توزيع الباقات</div>
            {Object.entries(PLANS).map(([key, plan]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.textSub }}>{plan.label}</span>
                  <span style={{ fontSize: 10, color: plan.color, fontWeight: 700 }}>{planCount[key]} شركة</span>
                </div>
                <div style={{ background: C.border, borderRadius: 3, height: 5 }}>
                  <div style={{ width: `${(planCount[key] / tenants.length) * 100}%`, height: "100%", background: plan.color, borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 12 }}>⚡ آخر النشاطات</div>
            {ACTIVITY.slice(0, 4).map(a => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{a.tenant}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{a.action}</div>
                </div>
                <span style={{ fontSize: 8, color: C.muted, marginRight: "auto", whiteSpace: "nowrap" }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tenants Management
function TenantsScreen({ tenants, setTenants, addToast, fetchTenants }) {
  const [modal, setModal]     = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch]   = useState("");
  const [filterPlan, setFilterPlan] = useState("الكل");
  const [filterStatus, setFilterStatus] = useState("الكل");
  const [loading, setLoading] = useState(false);

  const EMPTY = { name: "", slug: "", plan: "basic", contactName: "", contactEmail: "", contactPhone: "", expiresAt: "", notes: "", customPrice: "" };
  const [form, setForm] = useState(EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.includes(search) || t.contactEmail.includes(search) || t.slug.includes(search);
    const matchPlan   = filterPlan === "الكل" || t.plan === filterPlan;
    const matchStatus = filterStatus === "الكل" || (filterStatus === "نشط" ? t.isActive : !t.isActive);
    return matchSearch && matchPlan && matchStatus;
  });

  const detailTenant = tenants.find(t => t.id === detailId);

  // ── إنشاء شركة جديدة في Supabase ──
  const save = async () => {
    if (!form.name || !form.slug || !form.contactEmail) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    setLoading(true);
    const plan = PLANS[form.plan];
    const revenue = plan.isCustom ? (parseInt(form.customPrice) || 0) : plan.price;
    const { error } = await supabase.from("tenants").insert({
      name:           form.name,
      slug:           form.slug,
      plan:           form.plan,
      contact_name:   form.contactName,
      contact_email:  form.contactEmail,
      contact_phone:  form.contactPhone,
      expires_at:     form.expiresAt || null,
      notes:          form.notes,
      custom_price:   plan.isCustom ? (parseInt(form.customPrice) || null) : null,
      max_users:      plan.maxUsers,
      max_projects:   plan.maxProjects,
      annual_revenue: revenue,
      is_active:      true,
    });
    if (error) { addToast(`خطأ: ${error.message}`, "error"); }
    else        { addToast(`تم إنشاء حساب ${form.name} ✓`, "success"); setModal(false); setForm(EMPTY); fetchTenants(); }
    setLoading(false);
  };

  // ── تفعيل / تعطيل في Supabase ──
  const toggleStatus = async (id) => {
    const t = tenants.find(t => t.id === id);
    const newActive = !t.isActive;
    const newRevenue = newActive
      ? (PLANS[t.plan]?.isCustom ? (t.customPrice || 0) : (PLANS[t.plan]?.price || 0))
      : 0;
    const { error } = await supabase.from("tenants")
      .update({ is_active: newActive, annual_revenue: newRevenue })
      .eq("id", id);
    if (error) { addToast(`خطأ: ${error.message}`, "error"); }
    else { addToast(`${newActive ? "تم تفعيل" : "تم تعطيل"} حساب ${t.name}`, newActive ? "success" : "error"); fetchTenants(); }
  };

  // ── تغيير الباقة في Supabase ──
  const changePlan = async (id, plan) => {
    const planData = PLANS[plan];
    const t = tenants.find(t => t.id === id);
    const { error } = await supabase.from("tenants")
      .update({
        plan,
        max_users:      planData.maxUsers,
        max_projects:   planData.maxProjects,
        annual_revenue: planData.isCustom ? (t.customPrice || 0) : planData.price,
      })
      .eq("id", id);
    if (error) { addToast(`خطأ: ${error.message}`, "error"); }
    else        { addToast("تم تغيير الباقة ✓", "success"); fetchTenants(); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: C.text }}>🏢 إدارة الشركات</div>
          <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>{filtered.length} من {tenants.length} شركة</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث..." style={{ width: 180 }} />
          <Select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ width: 110 }}>
            <option>الكل</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option><option value="custom">تفاوضي</option>
          </Select>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 100 }}>
            <option>الكل</option><option value="نشط">نشط</option><option value="معطل">معطل</option>
          </Select>
          <Btn onClick={() => { setForm(EMPTY); setModal(true); }}>+ شركة جديدة</Btn>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <TblWrap>
            <thead>
              <tr><Th>الشركة</Th><Th>جهة الاتصال</Th><Th>الباقة</Th><Th>المستخدمون</Th><Th>المشاريع</Th><Th>الاشتراك</Th><Th>الإيراد السنوي</Th><Th>الحالة</Th><Th>الإجراءات</Th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><Td colSpan={9} s={{ textAlign: "center", padding: 50, color: C.muted }}>لا توجد نتائج</Td></tr>}
              {filtered.map(t => {
                const plan = PLANS[t.plan];
                const expDays = daysLeft(t.expiresAt);
                const expColor = expDays <= 15 ? C.danger : expDays <= 30 ? C.warning : C.success;
                return (
                  <tr key={t.id} style={{ background: "transparent", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.card2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: plan.color + "22", border: `1px solid ${plan.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏢</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11 }}>{t.name}</div>
                          <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{t.slug}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 10, color: C.text }}>{t.contactName}</div>
                      <div style={{ fontSize: 9, color: C.muted }}>{t.contactEmail}</div>
                    </Td>
                    <Td>
                      <select value={t.plan} onChange={e => changePlan(t.id, e.target.value)}
                        style={{ background: plan.color + "18", border: `1px solid ${plan.color}44`, borderRadius: 20, padding: "2px 10px", color: plan.color, fontSize: 9, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                        {Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                      </select>
                      {t.plan === "custom" && <div style={{ fontSize: 8, color: C.teal, marginTop: 3 }}>{fmt(t.monthlyRevenue)} ج.م/سنة</div>}
                    </Td>
                    <Td>
                      <div style={{ fontSize: 10, color: C.text }}>{t.users} / {t.maxUsers === 999 ? "∞" : t.maxUsers}</div>
                      <div style={{ background: C.border, borderRadius: 2, height: 3, marginTop: 3, width: 60 }}>
                        <div style={{ width: `${Math.min(100, (t.users / (t.maxUsers === 999 ? t.users : t.maxUsers)) * 100)}%`, height: "100%", background: C.brand, borderRadius: 2 }} />
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 10, color: C.text }}>{t.projects} / {t.maxProjects === 999 ? "∞" : t.maxProjects}</div>
                      <div style={{ background: C.border, borderRadius: 2, height: 3, marginTop: 3, width: 60 }}>
                        <div style={{ width: `${Math.min(100, (t.projects / (t.maxProjects === 999 ? t.projects : t.maxProjects)) * 100)}%`, height: "100%", background: C.info, borderRadius: 2 }} />
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 10, color: expColor, fontWeight: expDays <= 30 ? 700 : 400 }}>{fmtDate(t.expiresAt)}</div>
                      {t.isActive && <div style={{ fontSize: 8, color: expColor }}>{expDays > 0 ? `${expDays} يوم متبقي` : "منتهي!"}</div>}
                    </Td>
                    <Td><span style={{ color: t.isActive ? C.success : C.muted, fontWeight: 700 }}>{fmt(t.monthlyRevenue)} ج.م</span></Td>
                    <Td><Badge text={t.isActive ? "نشط" : "معطل"} color={t.isActive ? C.success : C.muted} /></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn variant="outline" size="xs" onClick={() => setDetailId(t.id)}>👁 تفاصيل</Btn>
                        <Btn variant={t.isActive ? "danger" : "success"} size="xs" onClick={() => toggleStatus(t.id)}>
                          {t.isActive ? "🔒 تعطيل" : "✅ تفعيل"}
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TblWrap>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="🏢 إضافة شركة جديدة" width={620}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Fld label="اسم الشركة" req><Input value={form.name} onChange={set("name")} placeholder="شركة الدلتا للمقاولات" /></Fld>
          <Fld label="Slug (رابط فريد)" req half><Input value={form.slug} onChange={set("slug")} placeholder="delta-contracting" /></Fld>
          <Fld label="الباقة" req half>
            <Select value={form.plan} onChange={set("plan")}>
              {Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.label} — {p.isCustom ? "سعر تفاوضي" : `${fmt(p.price)} ج.م/سنة`}</option>)}
            </Select>
          </Fld>
          {PLANS[form.plan]?.isCustom && (
            <Fld label="السعر التفاوضي (ج.م/سنة)" req>
              <Input type="number" value={form.customPrice} onChange={set("customPrice")} placeholder="أدخل السعر المتفق عليه مع الشركة" />
            </Fld>
          )}
          <Fld label="اسم المسؤول" req half><Input value={form.contactName} onChange={set("contactName")} /></Fld>
          <Fld label="البريد الإلكتروني" req half><Input type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="admin@company.com" /></Fld>
          <Fld label="رقم الهاتف" half><Input value={form.contactPhone} onChange={set("contactPhone")} placeholder="0100-xxx-xxxx" /></Fld>
          <Fld label="تاريخ انتهاء الاشتراك" req half><Input type="date" value={form.expiresAt} onChange={set("expiresAt")} /></Fld>

          {/* Plan Preview */}
          {form.plan && (
            <div style={{ width: "100%", background: PLANS[form.plan].color + "0e", border: `1px solid ${PLANS[form.plan].color}33`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: PLANS[form.plan].color, fontWeight: 800, marginBottom: 8 }}>مزايا باقة {PLANS[form.plan].label}</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {PLANS[form.plan].features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span style={{ color: PLANS[form.plan].color, fontSize: 10 }}>✓</span>
                    <span style={{ fontSize: 10, color: C.textSub }}>{f}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ color: PLANS[form.plan].color, fontSize: 10 }}>💰</span>
                  <span style={{ fontSize: 10, color: C.textSub, fontWeight: 700 }}>
                    {PLANS[form.plan].isCustom
                      ? (form.customPrice ? `${fmt(parseInt(form.customPrice))} ج.م / سنة (تفاوضي)` : "سعر حسب الاتفاق")
                      : `${fmt(PLANS[form.plan].price)} ج.م / سنة`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save} disabled={loading}>{loading ? "⏳ جاري الحفظ..." : "🏢 إنشاء الحساب"}</Btn>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title="👁 تفاصيل الشركة" width={560}>
        {detailTenant && (() => {
          const plan = PLANS[detailTenant.plan];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: plan.color + "0e", border: `1px solid ${plan.color}33`, borderRadius: 10, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: plan.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏢</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: C.text }}>{detailTenant.name}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{detailTenant.slug}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                    <Badge text={plan.label} color={plan.color} />
                    <Badge text={detailTenant.isActive ? "نشط" : "معطل"} color={detailTenant.isActive ? C.success : C.muted} />
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "المسؤول", value: detailTenant.contactName, icon: "👤" },
                  { label: "البريد", value: detailTenant.contactEmail, icon: "📧" },
                  { label: "الهاتف", value: detailTenant.contactPhone || "—", icon: "📞" },
                  { label: "تاريخ الإنشاء", value: fmtDate(detailTenant.createdAt), icon: "📅" },
                  { label: "انتهاء الاشتراك", value: fmtDate(detailTenant.expiresAt), icon: "⏰" },
                  { label: "آخر دخول", value: detailTenant.lastLogin ? fmtDate(detailTenant.lastLogin) : "—", icon: "🔑" },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                  { label: "المستخدمون", value: `${detailTenant.users}/${detailTenant.maxUsers === 999 ? "∞" : detailTenant.maxUsers}`, color: C.brand },
                  { label: "المشاريع", value: `${detailTenant.projects}/${detailTenant.maxProjects === 999 ? "∞" : detailTenant.maxProjects}`, color: C.info },
                  { label: "الإيراد السنوي", value: `${fmt(detailTenant.monthlyRevenue)} ج.م`, color: C.success },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.color + "0e", border: `1px solid ${s.color}33`, borderRadius: 8, padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// Plans Screen
function PlansScreen({ tenants }) {
  const planStats = Object.entries(PLANS).map(([key, plan]) => {
    const ts = tenants.filter(t => t.plan === key);
    return { key, plan, count: ts.length, revenue: ts.filter(t => t.isActive).reduce((s, t) => s + t.monthlyRevenue, 0) };
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 15, color: C.text }}>📦 إدارة الباقات</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {planStats.map(({ key, plan, count, revenue }) => (
          <div key={key} style={{ background: C.card, border: `2px solid ${plan.color}33`, borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <div style={{ background: `linear-gradient(135deg, ${plan.color}22, ${plan.color}08)`, padding: "22px 22px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <Badge text={plan.label} color={plan.color} />
                  <div style={{ fontSize: 28, fontWeight: 900, color: plan.color, marginTop: 8 }}>
                  {plan.isCustom ? <span style={{ fontSize: 16 }}>سعر تفاوضي</span> : <>{fmt(plan.price)} <span style={{ fontSize: 11, fontWeight: 400, color: C.textSub }}>ج.م/سنة</span></>}
                </div>
                </div>
                <div style={{ textAlign: "center", background: plan.color + "22", border: `1px solid ${plan.color}44`, borderRadius: 10, padding: "8px 12px" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: plan.color }}>{count}</div>
                  <div style={{ fontSize: 8, color: C.muted }}>شركة</div>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 22px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: plan.color, fontSize: 12 }}>✓</span>
                    <span style={{ fontSize: 11, color: C.textSub }}>{f}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: plan.color, fontSize: 12 }}>👥</span>
                  <span style={{ fontSize: 11, color: C.textSub }}>{plan.maxUsers === 999 ? "مستخدمون غير محدودون" : `حتى ${plan.maxUsers} مستخدمين`}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: plan.color, fontSize: 12 }}>🏗</span>
                  <span style={{ fontSize: 11, color: C.textSub }}>{plan.maxProjects === 999 ? "مشاريع غير محدودة" : `حتى ${plan.maxProjects} مشروع`}</span>
                </div>
              </div>
              <div style={{ background: plan.color + "0e", border: `1px solid ${plan.color}22`, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: C.muted }}>الإيراد الشهري</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: plan.color }}>{fmt(revenue)} ج.م</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 16 }}>📊 مقارنة الإيراد السنوي بين الباقات</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 120 }}>
          {planStats.map(({ key, plan, revenue }) => (
            <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: plan.color, fontWeight: 700 }}>{fmt(revenue)} ج.م</span>
              <div style={{ width: "60%", height: `${(revenue / Math.max(...planStats.map(p => p.revenue))) * 90}px`, background: `linear-gradient(180deg, ${plan.color}, ${plan.color}88)`, borderRadius: "6px 6px 0 0", minHeight: 4 }} />
              <span style={{ fontSize: 10, color: C.muted }}>{plan.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Register Screen (for tenants)
function RegisterScreen({ addToast, onSuccess, fetchTenants }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ companyName: "", slug: "", phone: "", email: "", password: "", confirmPassword: "", plan: "pro", contactName: "", customPrice: "" });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const next = async () => {
    if (step === 1) {
      if (!form.companyName || !form.slug) { addToast("أكمل الحقول المطلوبة", "error"); return; }
      // التحقق من عدم تكرار الـ slug
      const { data } = await supabase.from("tenants").select("id").eq("slug", form.slug).maybeSingle();
      if (data) { addToast("هذا الرابط مستخدم بالفعل، اختر رابطاً آخر", "error"); return; }
      setStep(2);
    } else if (step === 2) {
      if (!form.contactName || !form.email || !form.password) { addToast("أكمل الحقول المطلوبة", "error"); return; }
      if (form.password !== form.confirmPassword) { addToast("كلمة السر غير متطابقة", "error"); return; }
      setStep(3);
    } else if (step === 3) {
      if (PLANS[form.plan]?.isCustom && !form.customPrice) { addToast("أدخل السعر التفاوضي المتفق عليه", "error"); return; }
      setLoading(true);
      try {
        const plan = PLANS[form.plan];
        const revenue = plan.isCustom ? (parseInt(form.customPrice) || 0) : plan.price;

        // 1. إنشاء حساب المستخدم في Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name:   form.contactName,
              tenant_slug: form.slug,
              role:        "tenant_admin",
            },
          },
        });
        if (authErr) throw new Error(authErr.message);

        // 2. إدراج الشركة في جدول tenants
        const { error: dbErr } = await supabase.from("tenants").insert({
          name:           form.companyName,
          slug:           form.slug,
          plan:           form.plan,
          contact_name:   form.contactName,
          contact_email:  form.email,
          contact_phone:  form.phone,
          max_users:      plan.maxUsers,
          max_projects:   plan.maxProjects,
          annual_revenue: revenue,
          custom_price:   plan.isCustom ? parseInt(form.customPrice) : null,
          is_active:      true,
        });
        if (dbErr) throw new Error(dbErr.message);

        setStep(4);
        fetchTenants && fetchTenants();
        onSuccess && onSuccess(form);
      } catch (err) {
        addToast(`خطأ: ${err.message}`, "error");
      }
      setLoading(false);
    }
  };

  const selectedPlan = PLANS[form.plan];

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏗</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>TECHOFFICE ERP</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>إنشاء حساب شركة جديد</div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32, position: "relative" }}>
          {["بيانات الشركة", "حساب الدخول", "اختر الباقة", "مكتمل!"].map((s, i) => {
            const done = step > i + 1, active = step === i + 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
                {i < 3 && <div style={{ position: "absolute", top: 14, right: "-50%", width: "100%", height: 2, background: done ? C.brand : C.border, zIndex: 0, transition: "background 0.3s" }} />}
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? C.brand : active ? C.brand + "22" : C.card2, border: `2px solid ${active || done ? C.brand : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: done ? "#fff" : active ? C.brand : C.muted, zIndex: 1, position: "relative", transition: "all 0.3s" }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 9, color: active ? C.brand : done ? C.text : C.muted, fontWeight: active ? 700 : 400, textAlign: "center" }}>{s}</span>
              </div>
            );
          })}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🏢 بيانات الشركة</div>
              <Fld label="اسم الشركة" req><Input value={form.companyName} onChange={set("companyName")} placeholder="شركة الدلتا للمقاولات" /></Fld>
              <Fld label="الرابط الفريد (Slug)" req>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: C.muted }}>app.techoffice.com/</div>
                  <Input value={form.slug} onChange={set("slug")} placeholder="delta-contracting" style={{ paddingRight: 140 }} />
                </div>
              </Fld>
              <Fld label="رقم الهاتف"><Input value={form.phone} onChange={set("phone")} placeholder="0100-xxx-xxxx" /></Fld>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🔐 بيانات الدخول</div>
              <Fld label="اسم المسؤول" req><Input value={form.contactName} onChange={set("contactName")} placeholder="أحمد محمد" /></Fld>
              <Fld label="البريد الإلكتروني" req><Input type="email" value={form.email} onChange={set("email")} placeholder="admin@company.com" /></Fld>
              <Fld label="كلمة السر" req><Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" /></Fld>
              <Fld label="تأكيد كلمة السر" req><Input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" /></Fld>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>📦 اختر الباقة المناسبة</div>
              {Object.entries(PLANS).map(([key, plan]) => (
                <div key={key} onClick={() => setForm(f => ({ ...f, plan: key }))}
                  style={{ background: form.plan === key ? plan.color + "14" : C.card2, border: `2px solid ${form.plan === key ? plan.color : C.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.plan === key ? plan.color : C.border}`, background: form.plan === key ? plan.color : "transparent", transition: "all 0.2s" }} />
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{plan.label}</span>
                        {key === "pro" && <Badge text="الأكثر شيوعاً" color={plan.color} />}
                        {key === "custom" && <Badge text="مرن" color={plan.color} />}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {plan.features.slice(0, 2).map((f, i) => (
                          <span key={i} style={{ fontSize: 9, color: C.muted }}>✓ {f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    {plan.isCustom
                      ? <div style={{ fontSize: 13, fontWeight: 900, color: plan.color }}>تفاوضي</div>
                      : <><div style={{ fontSize: 18, fontWeight: 900, color: plan.color }}>{fmt(plan.price)}</div>
                         <div style={{ fontSize: 9, color: C.muted }}>ج.م / سنة</div></>
                    }
                  </div>
                </div>
              ))}
              {PLANS[form.plan]?.isCustom && (
                <div style={{ background: C.teal + "0e", border: `1px solid ${C.teal}33`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, color: C.teal, fontWeight: 700, marginBottom: 8 }}>💬 السعر التفاوضي المتفق عليه</div>
                  <Input
                    type="number"
                    value={form.customPrice}
                    onChange={set("customPrice")}
                    placeholder="أدخل المبلغ السنوي المتفق عليه مع الشركة (ج.م)"
                  />
                  {form.customPrice && (
                    <div style={{ fontSize: 9, color: C.teal, marginTop: 6 }}>
                      ✓ السعر المتفق عليه: {fmt(parseInt(form.customPrice))} ج.م سنوياً
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.success, marginBottom: 8 }}>تم إنشاء الحساب بنجاح!</div>
              <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.8, marginBottom: 20 }}>
                <div>الشركة: <strong style={{ color: C.text }}>{form.companyName}</strong></div>
                <div>الباقة: <strong style={{ color: selectedPlan.color }}>{selectedPlan.label}</strong></div>
                <div>السعر: <strong style={{ color: selectedPlan.color }}>
                  {selectedPlan.isCustom ? `${form.customPrice ? fmt(parseInt(form.customPrice)) : "—"} ج.م / سنة (تفاوضي)` : `${fmt(selectedPlan.price)} ج.م / سنة`}
                </strong></div>
                <div>الرابط: <strong style={{ color: C.info, fontFamily: "monospace" }}>app.techoffice.com/{form.slug}</strong></div>
              </div>
              <div style={{ background: C.successDim, border: `1px solid ${C.success}33`, borderRadius: 10, padding: 14, fontSize: 10, color: C.success }}>
                📧 تم إرسال بيانات الدخول إلى {form.email}
              </div>
            </div>
          )}

          {step < 4 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 1 ? <Btn variant="outline" onClick={() => setStep(s => s - 1)}>→ السابق</Btn> : <div />}
              <Btn onClick={next} disabled={loading}>
                {loading ? "⏳ جاري الإنشاء..." : step === 3 ? "🚀 إنشاء الحساب" : "التالي ←"}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Activity Screen
function ActivityScreen() {
  const allActivity = [
    ...ACTIVITY,
    { id: 6, tenant: "مؤسسة سيناء", action: "رُفع مستخلص M-08 للاعتماد", time: "منذ يومين", icon: "💰", color: C.info },
    { id: 7, tenant: "شركة نيل رودز", action: "مستخدم جديد: م. كريم طاهر", time: "منذ 3 أيام", icon: "👤", color: C.brand },
    { id: 8, tenant: "شركة الدلتا", action: "تجاوز حد المشاريع (5/5)", time: "منذ 4 أيام", icon: "⚠️", color: C.warning },
    { id: 9, tenant: "مجموعة النهر", action: "تحديث إعدادات الضريبة", time: "منذ 5 أيام", icon: "⚙️", color: C.purple },
    { id: 10, tenant: "شركة نيل رودز", action: "اعتماد ضمان بنكي جديد", time: "منذ أسبوع", icon: "🔐", color: C.teal },
  ];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontWeight: 900, fontSize: 15, color: C.text }}>⚡ سجل النشاطات</div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {allActivity.map((a, i) => (
          <div key={a.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 20px", borderBottom: i < allActivity.length - 1 ? `1px solid ${C.border}22` : "none", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.card2}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: a.color + "18", border: `1px solid ${a.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{a.tenant}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>{a.action}</div>
            </div>
            <span style={{ fontSize: 9, color: C.muted, whiteSpace: "nowrap" }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
const NAV = [
  { id: "overview",  label: "لوحة التحكم",  icon: "📊" },
  { id: "tenants",   label: "الشركات",       icon: "🏢" },
  { id: "plans",     label: "الباقات",       icon: "📦" },
  { id: "payments",  label: "المدفوعات",     icon: "💳" },
  { id: "activity",  label: "النشاطات",      icon: "⚡" },
  { id: "register",  label: "تسجيل شركة",    icon: "➕" },
];

export default function SuperAdmin({ onLogout }) {
  const [screen, setScreen]   = useState("overview");
  const [tenants, setTenants] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [user, setUser]       = useState(null);

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ── جلب الشركات ──
  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { setDbError(error.message); }
    else        { setTenants((data || []).map(mapRow)); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  // ── Real-time subscription ──
  useEffect(() => {
    const channel = supabase
      .channel("tenants-changes")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "tenants" },
          () => fetchTenants())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchTenants]);

  const addToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalRev   = tenants.filter(t => t.isActive).reduce((s, t) => s + t.monthlyRevenue, 0);
  const expiring   = tenants.filter(t => t.isActive && daysLeft(t.expiresAt) <= 30).length;

  // ── شاشة تحميل أولي ──
  if (loading && tenants.length === 0) return (
    <div dir="rtl" style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cairo','Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", color: C.textSub }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>جاري الاتصال بـ Supabase...</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>يُرجى الانتظار</div>
      </div>
    </div>
  );

  // ── شاشة خطأ ──
  if (dbError) return (
    <div dir="rtl" style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cairo','Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", color: C.danger, maxWidth: 420, padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>خطأ في الاتصال بقاعدة البيانات</div>
        <div style={{ fontSize: 11, color: C.textSub, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontFamily: "monospace", textAlign: "left", marginBottom: 16 }}>{dbError}</div>
        <Btn onClick={fetchTenants}>🔄 إعادة المحاولة</Btn>
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: "100vh", display: "flex", fontFamily: "'Cairo','Segoe UI',sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <div style={{ width: collapsed ? 56 : 220, background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", transition: "width 0.2s ease", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "16px 12px" : "18px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${C.brand}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚡</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: C.text, letterSpacing: "-0.3px" }}>TECHOFFICE</div>
              <div style={{ fontSize: 8, color: C.brand, fontWeight: 700, letterSpacing: "1px" }}>SUPER ADMIN</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map(item => {
            const active = screen === item.id;
            return (
              <button key={item.id} onClick={() => setScreen(item.id)}
                style={{ display: "flex", gap: 10, alignItems: "center", padding: collapsed ? "10px 12px" : "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? C.brand + "18" : "transparent", color: active ? C.brand : C.textSub, fontFamily: "inherit", fontWeight: active ? 700 : 400, fontSize: 11, transition: "all 0.15s", textAlign: "right", width: "100%" }}
                title={collapsed ? item.label : ""}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.id === "tenants" && expiring > 0 && (
                  <span style={{ background: C.danger, color: "#fff", fontSize: 8, borderRadius: 10, padding: "1px 6px", marginRight: "auto" }}>{expiring}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${C.border}` }}>
          {!collapsed && (
            <div style={{ background: C.brand + "0e", border: `1px solid ${C.brand}22`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.muted }}>الإيراد السنوي</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.brand }}>{fmt(totalRev)} ج.م</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: C.muted, fontFamily: "inherit", fontSize: 11, width: "100%", justifyContent: collapsed ? "center" : "flex-start" }}>
            <span style={{ fontSize: 14 }}>{collapsed ? "◀" : "▶"}</span>
            {!collapsed && <span>طي القائمة</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <div style={{ height: 54, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", flexShrink: 0, background: C.surface }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{NAV.find(n => n.id === screen)?.icon}</span>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{NAV.find(n => n.id === screen)?.label}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {expiring > 0 && (
              <div style={{ background: C.dangerDim, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "4px 12px", fontSize: 9, color: C.danger, fontWeight: 700 }}>
                🔔 {expiring} اشتراك ينتهي قريباً
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${C.brand}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>👤</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text }}>Super Admin</div>
                <div style={{ fontSize: 8, color: C.muted }}>{user?.email || "admin@techoffice.com"}</div>
              </div>
            </div>
            <button onClick={() => onLogout && onLogout()}
              style={{ padding: "6px 14px", background: C.dangerDim, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              🚪 خروج
            </button>
          </div>
        </div>

        {/* Screen */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {screen === "overview"  && <OverviewScreen tenants={tenants} setScreen={setScreen} />}
          {screen === "tenants"   && <TenantsScreen tenants={tenants} setTenants={setTenants} addToast={addToast} fetchTenants={fetchTenants} />}
          {screen === "plans"     && <PlansScreen tenants={tenants} />}
          {screen === "payments"  && <PaymentScreen tenants={tenants} addToast={addToast} fetchTenants={fetchTenants} />}
          {screen === "activity"  && <ActivityScreen />}
          {screen === "register"  && <RegisterScreen addToast={addToast} fetchTenants={fetchTenants} onSuccess={() => setTimeout(() => setScreen("tenants"), 2000)} />}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? C.danger : toast.type === "info" ? C.info : C.success, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 11, fontWeight: 700, zIndex: 2000, boxShadow: "0 8px 32px #0008", animation: "slideUp 0.3s ease" }}>
          {toast.type === "error" ? "✗" : "✓"} {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}
