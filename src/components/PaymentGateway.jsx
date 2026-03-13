// PaymentGateway.jsx
// شاشة دفع الاشتراكات الكاملة — ضمن لوحة SuperAdmin
// ضع هذا الملف في: src/PaymentGateway.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@lib/supabaseClient";
import { PaymobService, usePaymob } from "@lib/paymob";

// ─── Design Tokens (نفس ما في SuperAdmin) ────────────────────
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
};

const PLANS = {
  basic:      { label: "Basic",    color: C.info,   price: 20000, icon: "🔵", features: ["3 مستخدمين", "5 مشاريع", "دعم بريد إلكتروني"] },
  pro:        { label: "Pro",      color: C.brand,  price: 50000, icon: "⚡", features: ["10 مستخدمين", "20 مشروع", "دعم أولوية", "تقارير متقدمة"] },
  enterprise: { label: "Enterprise", color: C.purple, price: 90000, icon: "👑", features: ["غير محدود", "دعم مخصص 24/7", "تخصيص كامل", "SLA مضمون"] },
  custom:     { label: "تفاوضي",   color: C.teal,   price: null,  icon: "🤝", features: ["غير محدود", "سعر حسب الاتفاق", "VIP support", "SLA مضمون"] },
};

const fmt  = (n) => n == null ? "—" : new Intl.NumberFormat("ar-EG").format(n);
const Btn  = ({ children, onClick, color = C.brand, variant = "solid", disabled, size = "md", style: s }) => {
  const [hov, setHov] = useState(false);
  const sizes = { sm: { fontSize: 10, padding: "6px 16px" }, md: { fontSize: 12, padding: "10px 24px" }, lg: { fontSize: 14, padding: "14px 32px" } };
  const vars  = {
    solid:   { background: hov ? C.brandHover : color, color: "#fff" },
    outline: { background: "transparent", color: hov ? color : C.textSub, border: `1px solid ${hov ? color : C.border}` },
    ghost:   { background: hov ? color + "18" : "transparent", color: hov ? color : C.textSub },
    success: { background: hov ? "#16a34a" : C.success, color: "#fff" },
    danger:  { background: hov ? "#dc2626" : C.danger,  color: "#fff" },
  };
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...{ cursor: disabled ? "not-allowed" : "pointer", border: "none", borderRadius: 8, fontFamily: "'Cairo','Segoe UI',sans-serif", fontWeight: 700, transition: "all 0.15s", opacity: disabled ? 0.5 : 1 }, ...sizes[size], ...vars[variant], ...s }}
    >{children}</button>
  );
};

// ─── Payment History Table ─────────────────────────────────────
function PaymentHistoryTable({ tenantId }) {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);
      setPayments(data || []);
      setLoading(false);
    })();
  }, [tenantId]);

  const statusBadge = (s) => ({
    pending:    { label: "قيد الانتظار", color: C.warning },
    processing: { label: "جارٍ المعالجة", color: C.info },
    paid:       { label: "مدفوع ✓",   color: C.success },
    failed:     { label: "فشل",        color: C.danger },
    refunded:   { label: "مسترجع",     color: C.purple },
  }[s] || { label: s, color: C.muted });

  if (loading) return <div style={{ color: C.textSub, fontSize: 11, padding: 20 }}>⏳ جاري التحميل...</div>;
  if (!payments.length) return <div style={{ color: C.muted, fontSize: 11, padding: 20, textAlign: "center" }}>لا توجد مدفوعات مسجلة</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            {["التاريخ", "الباقة", "المبلغ", "البوابة", "رقم المعاملة", "الحالة"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: C.textSub, fontWeight: 700, fontSize: 9, borderBottom: `1px solid ${C.border}`, background: C.bg, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map(p => {
            const st = statusBadge(p.status);
            return (
              <tr key={p.id}
                onMouseEnter={e => e.currentTarget.style.background = C.card2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                style={{ transition: "background 0.15s" }}>
                <td style={{ padding: "11px 14px", color: C.textSub, borderBottom: `1px solid ${C.border}22` }}>
                  {new Date(p.created_at).toLocaleDateString("ar-EG")}
                </td>
                <td style={{ padding: "11px 14px", color: C.text, borderBottom: `1px solid ${C.border}22`, fontWeight: 700 }}>
                  {PLANS[p.plan]?.label || p.plan}
                </td>
                <td style={{ padding: "11px 14px", color: C.success, fontWeight: 700, borderBottom: `1px solid ${C.border}22` }}>
                  {fmt(p.amount)} ج.م
                </td>
                <td style={{ padding: "11px 14px", color: C.textSub, borderBottom: `1px solid ${C.border}22` }}>
                  {p.gateway === "paymob" ? "🟦 Paymob" : p.gateway === "fawry" ? "🟡 Fawry" : "✋ يدوي"}
                </td>
                <td style={{ padding: "11px 14px", color: C.muted, fontFamily: "monospace", fontSize: 10, borderBottom: `1px solid ${C.border}22` }}>
                  {p.gateway_txn_id || "—"}
                </td>
                <td style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}22` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: st.color + "22", color: st.color, border: `1px solid ${st.color}44` }}>
                    {st.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Manual Payment Modal (للباقة التفاوضية) ─────────────────
function ManualPaymentModal({ open, tenant, onClose, onSave, addToast }) {
  const [form, setForm]   = useState({ amount: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.amount) { addToast("أدخل المبلغ", "error"); return; }
    setSaving(true);
    const { error } = await supabase.from("subscription_payments").insert({
      tenant_id:  tenant.id,
      plan:       tenant.plan,
      amount:     parseFloat(form.amount),
      gateway:    "manual",
      status:     "paid",
      paid_at:    new Date().toISOString(),
      expires_at: new Date(Date.now() + 365*24*60*60*1000).toISOString().split("T")[0],
      metadata:   { notes: form.notes, recorded_by: "superadmin" },
    });
    if (!error) {
      // تجديد تاريخ انتهاء الشركة
      await supabase.from("tenants").update({
        is_active:       true,
        annual_revenue:  parseFloat(form.amount),
        expires_at:      new Date(Date.now() + 365*24*60*60*1000).toISOString().split("T")[0],
      }).eq("id", tenant.id);
      addToast("تم تسجيل الدفعة وتجديد الاشتراك ✓", "success");
      onSave(); onClose();
    } else {
      addToast(`خطأ: ${error.message}`, "error");
    }
    setSaving(false);
  };

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width: 460, padding: 28, maxWidth: "95vw" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontWeight: 900, fontSize: 14, color: C.text }}>✋ تسجيل دفعة يدوية</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ background: C.teal + "0e", border: `1px solid ${C.teal}33`, borderRadius: 10, padding: 12, marginBottom: 18, fontSize: 11, color: C.teal }}>
          <strong>{tenant?.name}</strong> — باقة {PLANS[tenant?.plan]?.label}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: C.textSub, fontWeight: 600 }}>المبلغ المستلم (ج.م) *</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="أدخل المبلغ المتفق عليه"
              style={{ marginTop: 6, display: "block", width: "100%", background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.textSub, fontWeight: 600 }}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="رقم الشيك / إيصال الإيداع / الإشارة المرجعية..."
              rows={3}
              style={{ marginTop: 6, display: "block", width: "100%", background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 11, fontFamily: "inherit", boxSizing: "border-box", outline: "none", resize: "vertical" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
          <Btn variant="outline" onClick={onClose}>إلغاء</Btn>
          <Btn onClick={save} disabled={saving} color={C.teal}>{saving ? "⏳ جارٍ الحفظ..." : "💾 تسجيل الدفعة"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Paymob Iframe Modal ───────────────────────────────────────
function PaymobIframeModal({ open, iframeUrl, onClose, onSuccess, onFailed }) {
  const iframeRef = useRef(null);

  // الاستماع لرسائل Paymob من الـ iframe
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.origin.includes("paymob.com")) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.success === true  || data?.type === "TRANSACTION_SUCCESS") onSuccess(data);
        if (data?.success === false || data?.type === "TRANSACTION_FAILED")  onFailed(data?.message || "فشل الدفع");
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, onSuccess, onFailed]);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width: 520, maxWidth: "96vw", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a56db", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>P</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 13, color: C.text }}>بوابة دفع Paymob</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 6 }}>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            style={{ width: "100%", height: 520, border: "none", borderRadius: 10 }}
            title="Paymob Payment"
            allow="payment"
          />
        </div>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.muted }}>🔒 الدفع مؤمَّن بتشفير SSL — بياناتك محمية</span>
        </div>
      </div>
    </div>
  );
}

// ─── PaymentScreen — الشاشة الرئيسية ────────────────────────
export default function PaymentScreen({ tenants, addToast, fetchTenants }) {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedPlan,   setSelectedPlan]   = useState(null);
  const [manualModal,    setManualModal]     = useState(false);
  const [historyTenant,  setHistoryTenant]   = useState(null);
  const [activeTab,      setActiveTab]       = useState("renew"); // renew | history

  const paymob = usePaymob();

  // ─── بدء الدفع عبر Paymob ───────────────────────────────
  const initiatePaymob = async () => {
    if (!selectedTenant || !selectedPlan) {
      addToast("اختر الشركة والباقة", "error"); return;
    }
    const plan   = PLANS[selectedPlan];
    const amount = plan.price ?? selectedTenant.customPrice ?? 0;
    if (!amount) { addToast("أدخل السعر التفاوضي أولاً في إعدادات الشركة", "error"); return; }
    try {
      await paymob.startPayment({ tenant: selectedTenant, plan: selectedPlan, amount });
    } catch (err) {
      addToast(`خطأ Paymob: ${err.message}`, "error");
    }
  };

  const handlePaymentSuccess = useCallback(async (txnData) => {
    paymob.handleSuccess(txnData);
    addToast("✅ تمت عملية الدفع بنجاح! جارٍ تجديد الاشتراك...", "success");
    await fetchTenants();
  }, [paymob, addToast, fetchTenants]);

  const handlePaymentFailed = useCallback((reason) => {
    paymob.handleFailed(reason);
    addToast(`❌ فشل الدفع: ${reason}`, "error");
  }, [paymob, addToast]);

  const expiringTenants = tenants.filter(t => {
    const days = Math.ceil((new Date(t.expiresAt) - new Date()) / 86400000);
    return t.isActive && days <= 60;
  }).sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

  return (
    <div dir="rtl" style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Cairo','Segoe UI',sans-serif", color: C.text }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, color: C.text }}>💳 إدارة المدفوعات والاشتراكات</div>
          <div style={{ fontSize: 10, color: C.textSub, marginTop: 3 }}>تجديد الاشتراكات عبر Paymob أو تسجيل يدوي</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["renew", "history"].map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${activeTab === tab ? C.brand : C.border}`, background: activeTab === tab ? C.brand + "18" : "transparent", color: activeTab === tab ? C.brand : C.textSub, fontFamily: "inherit", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
              {tab === "renew" ? "🔄 تجديد اشتراك" : "📜 سجل المدفوعات"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Renew ── */}
      {activeTab === "renew" && (
        <>
          {/* تحذيرات الانتهاء */}
          {expiringTenants.length > 0 && (
            <div style={{ background: "#2d0f00", border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontWeight: 700, color: C.warning, fontSize: 11, marginBottom: 10 }}>
                🔔 {expiringTenants.length} شركة اشتراكها ينتهي قريباً
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {expiringTenants.map(t => {
                  const days = Math.ceil((new Date(t.expiresAt) - new Date()) / 86400000);
                  const col  = days <= 15 ? C.danger : C.warning;
                  return (
                    <div key={t.id}
                      onClick={() => setSelectedTenant(t)}
                      style={{ background: col + "14", border: `1px solid ${col}44`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{t.name}</span>
                      <span style={{ fontSize: 9, color: col }}>{days > 0 ? `${days} يوم` : "منتهي!"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* اختيار الشركة */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 14 }}>🏢 اختر الشركة</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {tenants.filter(t => t.isActive || !t.isActive).map(t => {
                  const plan  = PLANS[t.plan];
                  const days  = Math.ceil((new Date(t.expiresAt) - new Date()) / 86400000);
                  const isExp = days <= 30;
                  const isSel = selectedTenant?.id === t.id;
                  return (
                    <div key={t.id}
                      onClick={() => { setSelectedTenant(t); setSelectedPlan(t.plan); }}
                      style={{ background: isSel ? C.brand + "14" : C.card2, border: `1px solid ${isSel ? C.brand : isExp ? C.warning + "44" : C.border2}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11, color: C.text }}>{t.name}</div>
                          <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{t.contactEmail}</div>
                        </div>
                        <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 8px", borderRadius: 10, background: (plan?.color || C.muted) + "22", color: plan?.color || C.muted }}>
                            {plan?.label}
                          </span>
                          {isExp && <span style={{ fontSize: 8, color: days <= 0 ? C.danger : C.warning }}>{days <= 0 ? "منتهي!" : `${days} يوم`}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* اختيار الباقة وطريقة الدفع */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 14 }}>📦 الباقة المطلوبة</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(PLANS).filter(([k]) => k !== "custom").map(([key, plan]) => (
                    <div key={key}
                      onClick={() => setSelectedPlan(key)}
                      style={{ background: selectedPlan === key ? plan.color + "14" : C.card2, border: `2px solid ${selectedPlan === key ? plan.color : C.border2}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 18 }}>{plan.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 11, color: C.text }}>{plan.label}</div>
                          <div style={{ fontSize: 9, color: C.muted }}>{plan.features.slice(0, 2).join(" • ")}</div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 900, color: plan.color, fontSize: 13 }}>{fmt(plan.price)} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* طريقة الدفع */}
              {selectedTenant && selectedPlan && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 6 }}>💰 ملخص الدفع</div>
                  <div style={{ background: C.brand + "0e", border: `1px solid ${C.brand}22`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: C.textSub }}>الشركة</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{selectedTenant.name}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6 }}>
                      <span style={{ color: C.textSub }}>الباقة</span>
                      <span style={{ color: PLANS[selectedPlan].color, fontWeight: 700 }}>{PLANS[selectedPlan].label}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ color: C.textSub, fontWeight: 700 }}>إجمالي</span>
                      <span style={{ color: C.success, fontWeight: 900 }}>{fmt(PLANS[selectedPlan].price)} ج.م / سنة</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* زر Paymob */}
                    <Btn
                      onClick={initiatePaymob}
                      disabled={paymob.loading}
                      size="lg"
                      style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8, alignItems: "center" }}
                    >
                      {paymob.loading ? "⏳ جارٍ التهيئة..." : (
                        <>
                          <span style={{ background: "#fff", color: "#1a56db", borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 900 }}>P</span>
                          الدفع عبر Paymob (بطاقة بنكية)
                        </>
                      )}
                    </Btn>

                    {/* زر تسجيل يدوي */}
                    <Btn
                      onClick={() => setManualModal(true)}
                      variant="outline"
                      color={C.teal}
                      size="lg"
                      style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8 }}
                    >
                      ✋ تسجيل دفعة يدوية (تحويل / كاش)
                    </Btn>
                  </div>

                  {paymob.error && (
                    <div style={{ marginTop: 10, background: C.dangerDim, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "8px 12px", fontSize: 10, color: C.danger }}>
                      ❌ {paymob.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* نجاح الدفع */}
          {paymob.status === "success" && (
            <div style={{ background: C.successDim, border: `1px solid ${C.success}44`, borderRadius: 12, padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 32 }}>✅</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: C.success }}>تمت عملية الدفع بنجاح!</div>
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>تم تجديد اشتراك <strong>{selectedTenant?.name}</strong> لمدة سنة كاملة.</div>
              </div>
              <Btn onClick={() => { paymob.reset(); setSelectedTenant(null); setSelectedPlan(null); }} variant="outline" color={C.success} style={{ marginRight: "auto" }}>
                إغلاق
              </Btn>
            </div>
          )}
        </>
      )}

      {/* ── Tab: History ── */}
      {activeTab === "history" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 12, color: C.text }}>📜 سجل مدفوعات جميع الشركات</span>
            <select
              value={historyTenant || ""}
              onChange={e => setHistoryTenant(e.target.value || null)}
              style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "6px 12px", color: C.text, fontSize: 11, fontFamily: "inherit", outline: "none" }}>
              <option value="">كل الشركات</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <PaymentHistoryTable tenantId={historyTenant} />
        </div>
      )}

      {/* Modals */}
      <PaymobIframeModal
        open={paymob.status === "iframe"}
        iframeUrl={paymob.iframeUrl}
        onClose={() => paymob.reset()}
        onSuccess={handlePaymentSuccess}
        onFailed={handlePaymentFailed}
      />

      <ManualPaymentModal
        open={manualModal}
        tenant={selectedTenant}
        onClose={() => setManualModal(false)}
        onSave={() => fetchTenants()}
        addToast={addToast}
      />
    </div>
  );
}
