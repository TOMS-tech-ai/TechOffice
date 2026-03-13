/**
 * TECHOFFICE ERP v4.0 — المرحلة السابعة (إكمال)
 * ════════════════════════════════════════════════
 * يُضاف هذا الملف إلى techoffice-erp-v4-phases4-5.jsx
 *
 * الوحدات الـ 14 المكتملة هنا:
 *  ① BudgetEVMScreen    — الميزانية + EVM (CPI/SPI/CV/SV)
 *  ② CashFlowScreen     — التدفق النقدي الكامل
 *  ③ NCRScreen          — عدم المطابقة + تتبع الإغلاق
 *  ④ DrawingsScreen     — الرسومات + طلبات RFI
 *  ⑤ ChainMapScreen     — خريطة الكيلومترات التفاعلية
 *  ⑥ SCurveScreen       — منحنى S المخطط / الفعلي
 *  ⑦ GanttScreen        — شبكة الجانت
 *  ⑧ EOTScreen          — طلبات التمديد الزمني
 *  ⑨ SubcontractorsScreen — المقاولون من الباطن
 *  ⑩ SafetyScreen       — السلامة المهنية
 *  ⑪ MaterialsScreen    — إدارة المواد
 *  ⑫ DailyLogsScreen    — التمام اليومي
 *  ⑬ UsersScreen        — إدارة المستخدمين + RBAC
 *  ⑭ SettingsScreen     — إعدادات الشركة
 *  ⑮ AppV4              — الغلاف الرئيسي الكامل (34 وحدة)
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ScatterChart,
  Scatter, ZAxis,
} from "recharts";

// ── نفس Design System من المراحل السابقة ─────────────────────
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

// ── UI Primitives (نفس المراحل السابقة) ──────────────────────
const Badge = ({ text, color }) => {
  const map = {
    APPROVED: C.success, معتمد: C.success, PAID: C.brand, ACTIVE: C.success, نشط: C.success,
    OVERDUE: C.danger, EXPIRED: C.muted, PASS: C.success, FAIL: C.danger,
    OPEN: C.warning, مفتوح: C.warning, CLOSED: C.muted, مغلق: C.muted,
    PARTIAL: C.warning, SUBMITTED: C.purple, DRAFT: C.muted, مسودة: C.muted,
    HIGH: C.danger, MEDIUM: C.warning, LOW: C.success,
    عالي: C.danger, متوسط: C.warning, منخفض: C.success,
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

const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, ...style }}>{children}</div>
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
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: height }} />
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

// ── Extended Mock Data ────────────────────────────────────────
const MOCK_EXT = {
  projects: [
    { id: "p1", code: "NR-2024-01", name: "طريق القاهرة الإسكندرية الصحراوي", contractValue: 185000000, paid: 112400000, progress: 61.2, plannedProgress: 67.0, status: "EXECUTION", startDate: "2024-01-15", contractEnd: "2025-06-30", pm: "م. أحمد السيد", length: 42.5, chainageFrom: 280, chainageTo: 322, retentionPercent: 5, retentionCapPercent: 10, advanceRecoveryPercent: 4, vatPercent: 14, totalRetained: 9246000, advanceRemaining: 8500000 },
    { id: "p2", code: "NR-2024-02", name: "رصف طريق الفيوم الجديد", contractValue: 67000000, paid: 58200000, progress: 87.4, plannedProgress: 85.0, status: "EXECUTION", startDate: "2024-03-01", contractEnd: "2024-12-31", pm: "م. كريم طاهر", length: 18.2, chainageFrom: 0, chainageTo: 18, retentionPercent: 5, retentionCapPercent: 10, advanceRecoveryPercent: 4, vatPercent: 14, totalRetained: 3350000, advanceRemaining: 0 },
  ],
  budgetItems: [
    { id: "b1", projectId: "p1", category: "مواد إنشاء", description: "خامات أسفلت وركام", budgeted: 45000000, actual: 48200000, committed: 2000000 },
    { id: "b2", projectId: "p1", category: "عمالة", description: "أجور مباشرة وغير مباشرة", budgeted: 28000000, actual: 26500000, committed: 800000 },
    { id: "b3", projectId: "p1", category: "معدات", description: "إيجار وتشغيل معدات", budgeted: 22000000, actual: 19800000, committed: 1500000 },
    { id: "b4", projectId: "p1", category: "مقاولون من باطن", description: "أعمال الصرف والجسور", budgeted: 35000000, actual: 33200000, committed: 3200000 },
    { id: "b5", projectId: "p1", category: "نفقات عامة", description: "إدارة وتأمينات", budgeted: 8000000, actual: 7100000, committed: 400000 },
  ],
  evmData: [
    { month: "يناير", PV: 12000000, EV: 10500000, AC: 11200000 },
    { month: "فبراير", PV: 25000000, EV: 22800000, AC: 23900000 },
    { month: "مارس", PV: 40000000, EV: 36500000, AC: 38200000 },
    { month: "أبريل", PV: 58000000, EV: 52000000, AC: 55100000 },
    { month: "مايو", PV: 76000000, EV: 70500000, AC: 74800000 },
    { month: "يونيو", PV: 96000000, EV: 88200000, AC: 94100000 },
    { month: "يوليو", PV: 112000000, EV: 103500000, AC: 110400000 },
    { month: "أغسطس", PV: 128000000, EV: 112400000, AC: 112400000 },
  ],
  cashFlow: [
    { month: "يناير", planned: 12000000, actual: 10500000, cumPlanned: 12000000, cumActual: 10500000 },
    { month: "فبراير", planned: 14000000, actual: 13200000, cumPlanned: 26000000, cumActual: 23700000 },
    { month: "مارس", planned: 16000000, actual: 15800000, cumPlanned: 42000000, cumActual: 39500000 },
    { month: "أبريل", planned: 18000000, actual: 17100000, cumPlanned: 60000000, cumActual: 56600000 },
    { month: "مايو", planned: 20000000, actual: 19500000, cumPlanned: 80000000, cumActual: 76100000 },
    { month: "يونيو", planned: 19000000, actual: 18200000, cumPlanned: 99000000, cumActual: 94300000 },
    { month: "يوليو", planned: 17000000, actual: 15900000, cumPlanned: 116000000, cumActual: 110200000 },
    { month: "أغسطس", planned: 15000000, actual: 14300000, cumPlanned: 131000000, cumActual: 124500000 },
    { month: "سبتمبر", planned: 16000000, actual: 15100000, cumPlanned: 147000000, cumActual: 139600000 },
    { month: "أكتوبر", planned: 18000000, actual: null, cumPlanned: 165000000, cumActual: null },
    { month: "نوفمبر", planned: 12000000, actual: null, cumPlanned: 177000000, cumActual: null },
    { month: "ديسمبر", planned: 8000000, actual: null, cumPlanned: 185000000, cumActual: null },
  ],
  ncrs: [
    { id: "n1", projectId: "p1", number: "NCR-2025-001", description: "نسبة الدمك الرقمي KM 14+000 أقل من المطلوب (93.1% < 95%)", location: "KM 14+000", category: "جودة دمك", severity: "HIGH", status: "OPEN", raisedBy: "م. كريم طاهر", raisedAt: "2025-10-07", dueDate: "2025-10-21", assignedTo: "م. أحمد السيد" },
    { id: "n2", projectId: "p1", number: "NCR-2025-002", description: "عدم اتساق سُمك طبقة الرابط في قطاع 15-16", location: "KM 15+000 – 16+000", category: "مواصفات أسفلت", severity: "MEDIUM", status: "OPEN", raisedBy: "الاستشاري", raisedAt: "2025-09-28", dueDate: "2025-10-15", assignedTo: "م. أحمد السيد" },
    { id: "n3", projectId: "p1", number: "NCR-2025-003", description: "عدم وجود Geotextile تحت طبقة Subbase في المنطقة الغربية", location: "KM 8+200 – 9+500", category: "مواد دعم", severity: "HIGH", status: "CLOSED", raisedBy: "الاستشاري", raisedAt: "2025-08-15", dueDate: "2025-09-01", closedAt: "2025-08-28", assignedTo: "م. كريم طاهر" },
  ],
  drawings: [
    { id: "dr1", projectId: "p1", number: "CIV-101", title: "مقطع عرضي نموذجي طريق الدرجة الأولى", revision: "C", discipline: "مدني", status: "APPROVED", submittedAt: "2024-02-10", approvedAt: "2024-02-20", file: "CIV-101-Rev-C.pdf" },
    { id: "dr2", projectId: "p1", number: "CIV-205", title: "تفاصيل جسر KM 18+400", revision: "B", discipline: "إنشائي", status: "UNDER_REVIEW", submittedAt: "2025-09-01", approvedAt: null, file: "CIV-205-Rev-B.pdf" },
    { id: "dr3", projectId: "p1", number: "DRN-301", title: "منظومة صرف الطريق — المرحلة الثالثة", revision: "A", discipline: "صرف", status: "APPROVED", submittedAt: "2024-03-15", approvedAt: "2024-04-02", file: "DRN-301-Rev-A.pdf" },
    { id: "dr4", projectId: "p1", number: "RFI-2025-018", title: "استفسار عن مستوى الحفر عند KM 12+800", revision: "—", discipline: "RFI", status: "PENDING", submittedAt: "2025-10-01", approvedAt: null, file: null },
  ],
  ganttTasks: [
    { id: "gt1", projectId: "p1", name: "أعمال التسوية والحفر", start: "2024-01", end: "2024-04", progress: 100, type: "MAIN", color: C.success },
    { id: "gt2", projectId: "p1", name: "طبقة Subbase", start: "2024-03", end: "2024-07", progress: 100, type: "MAIN", color: C.success },
    { id: "gt3", projectId: "p1", name: "طبقة الأساس المجروش", start: "2024-06", end: "2024-10", progress: 92, type: "MAIN", color: C.brand },
    { id: "gt4", projectId: "p1", name: "طبقة الرابط البيتوميني", start: "2024-09", end: "2025-02", progress: 75, type: "MAIN", color: C.warning },
    { id: "gt5", projectId: "p1", name: "طبقة الرصف النهائية", start: "2025-01", end: "2025-05", progress: 35, type: "MAIN", color: C.danger },
    { id: "gt6", projectId: "p1", name: "أعمال الصرف والتحسينات", start: "2024-04", end: "2024-12", progress: 100, type: "SUB", color: C.teal },
    { id: "gt7", projectId: "p1", name: "إنشاء جسر KM 18+400", start: "2024-08", end: "2025-03", progress: 65, type: "SUB", color: C.purple },
    { id: "gt8", projectId: "p1", name: "علامات الطريق والأمان", start: "2025-03", end: "2025-06", progress: 0, type: "FINISH", color: C.muted },
  ],
  subcontractors: [
    { id: "sc1", projectId: "p1", name: "شركة رمال المقاولات", specialty: "أعمال التسوية", contractValue: 12500000, paid: 10800000, progress: 100, status: "COMPLETED", startDate: "2024-01-20", endDate: "2024-04-30" },
    { id: "sc2", projectId: "p1", name: "مؤسسة النيل للإنشاءات", specialty: "الجسور والمجازات", contractValue: 18000000, paid: 11700000, progress: 65, status: "ACTIVE", startDate: "2024-08-01", endDate: "2025-03-31" },
    { id: "sc3", projectId: "p1", name: "شركة دلتا للأسفلت", specialty: "أعمال الأسفلت الرابط", contractValue: 9800000, paid: 7200000, progress: 78, status: "ACTIVE", startDate: "2024-09-15", endDate: "2025-02-28" },
  ],
  safetyIncidents: [
    { id: "si1", projectId: "p1", type: "إصابة بسيطة", description: "إصابة في اليد أثناء أعمال الرصف", date: "2025-09-28", status: "OPEN", severity: "MINOR", location: "KM 15+300", reportedBy: "م. كريم طاهر" },
    { id: "si2", projectId: "p1", type: "حادثة معدات", description: "انقلاب هزّاز أسفلت في منحنى الكيلومتر 20", date: "2025-08-14", status: "CLOSED", severity: "MODERATE", location: "KM 20+100", reportedBy: "م. أحمد السيد" },
    { id: "si3", projectId: "p2", type: "حريق صغير", description: "اشتعال خزان وقود صغير بجانب الخلاطة", date: "2025-07-20", status: "CLOSED", severity: "MODERATE", location: "منطقة المعدات", reportedBy: "م. كريم طاهر" },
  ],
  materials: [
    { id: "m1", projectId: "p1", name: "أسفلت رابط (Binder AC 60/70)", unit: "طن", ordered: 8500, delivered: 7200, used: 7200, stock: 0, unitCost: 3800, supplier: "شركة مصر للبترول" },
    { id: "m2", projectId: "p1", name: "ركام مجروش (Crushed Aggregate)", unit: "م³", ordered: 85000, delivered: 72000, used: 68000, stock: 4000, unitCost: 145, supplier: "مقلع الجبل الأحمر" },
    { id: "m3", projectId: "p1", name: "رمل ناعم مغسول", unit: "م³", ordered: 35000, delivered: 35000, used: 33500, stock: 1500, unitCost: 65, supplier: "شركة دلتا للرمال" },
    { id: "m4", projectId: "p1", name: "ماء رش وترطيب", unit: "م³", ordered: 12000, delivered: 10200, used: 9800, stock: 400, unitCost: 8, supplier: "شبكة المياه المحلية" },
    { id: "m5", projectId: "p1", name: "أنابيب صرف Ø60cm HDPE", unit: "م.ط", ordered: 4800, delivered: 4800, used: 4800, stock: 0, unitCost: 2200, supplier: "شركة البلاستيك للصناعات" },
  ],
  dailyLogs: [
    { id: "dl1", projectId: "p1", date: "2025-10-10", weather: "مشمس", works: "استكمال دمك طبقة الأساس KM 17+000 إلى KM 18+000 — 1 كم", workers: 68, equipment: "3 هزازات + 2 جرافة + 1 هزة تربة", progress: "تراكمي 61.2%", issues: "لا توجد", reportedBy: "م. كريم طاهر" },
    { id: "dl2", projectId: "p1", date: "2025-10-09", weather: "غائم جزئياً", works: "صب طبقة الرابط KM 15+000 إلى KM 16+500 — 1.5 كم", workers: 82, equipment: "2 فينيشر + 3 هزازات حافلة + 4 شاحنات", progress: "اكتملت 1.5 كم إضافية من الرابط", issues: "توقف 2 ساعة لانتظار عربات الأسفلت", reportedBy: "م. أحمد السيد" },
    { id: "dl3", projectId: "p1", date: "2025-10-08", weather: "مشمس حار", works: "أعمال جسر KM 18+400 — صب الكمرات الرئيسية", workers: 45, equipment: "رافعة 50 طن + خلاطة خرسانة + مضخة", progress: "اكتمل صب 4 كمرات من إجمالي 8", issues: "تأخر وصول الحديد المسلح بسبب ازدحام المرور", reportedBy: "م. أحمد السيد" },
  ],
  users: [
    { id: "u1", name: "خالد إبراهيم", email: "khaled@nilroads.com", role: "ADMIN", status: "ACTIVE", lastLogin: "2025-10-10 14:32", createdAt: "2024-01-01" },
    { id: "u2", name: "أحمد السيد", email: "ahmed@nilroads.com", role: "MANAGER", status: "ACTIVE", lastLogin: "2025-10-10 09:15", createdAt: "2024-01-15" },
    { id: "u3", name: "كريم طاهر", email: "karim@nilroads.com", role: "ENGINEER", status: "ACTIVE", lastLogin: "2025-10-10 11:00", createdAt: "2024-02-01" },
    { id: "u4", name: "سارة محمود", email: "sara@nilroads.com", role: "ACCOUNTANT", status: "ACTIVE", lastLogin: "2025-10-09 16:00", createdAt: "2024-03-01" },
    { id: "u5", name: "مريم حسن", email: "mariam@nilroads.com", role: "VIEWER", status: "INACTIVE", lastLogin: "2025-09-20 10:00", createdAt: "2024-05-01" },
  ],
  eotRequests: [
    { id: "eot1", projectId: "p1", code: "EOT-2025-001", cause: "أمطار غير معتادة — ديسمبر 2024", requestedDays: 28, grantedDays: 21, status: "PARTIAL", submittedAt: "2025-01-10", notes: "مُنح 21 يوماً من أصل 28 مطلوبة" },
    { id: "eot2", projectId: "p1", code: "EOT-2025-002", cause: "تأخر توريد مواد الجير من المورد الحكومي", requestedDays: 45, grantedDays: null, status: "SUBMITTED", submittedAt: "2025-06-01", notes: "قيد مراجعة الاستشاري" },
    { id: "eot3", projectId: "p2", code: "EOT-2024-001", cause: "أعمال خطوط مياه غير متوقعة عند KM 5+200", requestedDays: 14, grantedDays: 14, status: "APPROVED", submittedAt: "2024-09-10", notes: "مُنح كاملاً" },
  ],
};

// ══════════════════════════════════════════════════════════════
// ① BUDGET + EVM SCREEN
// ══════════════════════════════════════════════════════════════
function BudgetEVMScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [tab, setTab] = useState("budget");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: "", description: "", budgeted: "" });

  const proj = MOCK_EXT.projects.find(p => p.id === projectId);
  const items = MOCK_EXT.budgetItems.filter(b => b.projectId === projectId);
  const evmData = MOCK_EXT.evmData;

  // EVM Calculations من آخر نقطة
  const last = evmData[evmData.length - 1];
  const EV = last.EV, AC = last.AC, PV = last.PV;
  const BAC = proj?.contractValue || 185000000;
  const CPI = (EV / AC).toFixed(3);
  const SPI = (EV / PV).toFixed(3);
  const CV = EV - AC;
  const SV = EV - PV;
  const EAC = Math.round(BAC / parseFloat(CPI));
  const VAC = BAC - EAC;
  const ETC = EAC - AC;

  const totalBudget = items.reduce((s, i) => s + i.budgeted, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);
  const totalCommitted = items.reduce((s, i) => s + i.committed, 0);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="مقارنة الميزانية بالتكاليف الفعلية + مؤشرات EVM" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          {tab === "budget" && <Btn onClick={() => setModal(true)}>+ بند ميزانية</Btn>}
        </div>
      }>💰 الميزانية + EVM</SectionHdr>

      <Tabs tabs={[{ id: "budget", label: "الميزانية التفصيلية" }, { id: "evm", label: "EVM — قيمة المكتسب" }, { id: "chart", label: "الرسم البياني" }]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {tab === "budget" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <Stat label="إجمالي الميزانية" value={`${fmt(totalBudget / 1e6, 1)} م`} icon="📋" color={C.brand} />
              <Stat label="التكاليف الفعلية" value={`${fmt(totalActual / 1e6, 1)} م`} sub={`${pct(totalActual, totalBudget)}% من الميزانية`} icon="💸" color={totalActual > totalBudget ? C.danger : C.success} />
              <Stat label="الالتزامات المعلقة" value={`${fmt(totalCommitted / 1e6, 1)} م`} icon="📝" color={C.warning} />
              <Stat label="التوقعات النهائية (EAC)" value={`${fmt(totalActual + totalCommitted / 1e6, 1)} م`} icon="📊" color={C.info} />
            </div>
            <Card style={{ padding: 0 }}>
              <TblWrap>
                <thead><tr><Th>الفئة</Th><Th>الوصف</Th><Th>الميزانية</Th><Th>الفعلي</Th><Th>الالتزام</Th><Th>الانحراف</Th><Th>%</Th></tr></thead>
                <tbody>
                  {items.map(item => {
                    const variance = item.budgeted - item.actual - item.committed;
                    const spentPct = ((item.actual / item.budgeted) * 100).toFixed(1);
                    return (
                      <tr key={item.id}>
                        <Td><span style={{ color: C.brand, fontWeight: 700 }}>{item.category}</span></Td>
                        <Td style={{ color: C.textSub }}>{item.description}</Td>
                        <Td style={{ fontWeight: 600 }}>{fmt(item.budgeted)}</Td>
                        <Td style={{ color: item.actual > item.budgeted ? C.danger : C.text }}>{fmt(item.actual)}</Td>
                        <Td style={{ color: C.warning }}>{fmt(item.committed)}</Td>
                        <Td style={{ color: variance < 0 ? C.danger : C.success, fontWeight: 700 }}>{variance < 0 ? "▼" : "▲"} {fmt(Math.abs(variance))}</Td>
                        <Td>
                          <div style={{ width: 80 }}><ProgressBar value={parseFloat(spentPct)} color={parseFloat(spentPct) > 100 ? C.danger : C.brand} height={5} /></div>
                          <span style={{ fontSize: 9, color: parseFloat(spentPct) > 100 ? C.danger : C.textSub }}>{spentPct}%</span>
                        </Td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: C.surface }}>
                    <Td s={{ fontWeight: 800, color: C.text }}>الإجمالي</Td>
                    <Td></Td>
                    <Td s={{ fontWeight: 800, color: C.brand }}>{fmt(totalBudget)}</Td>
                    <Td s={{ fontWeight: 800, color: totalActual > totalBudget ? C.danger : C.text }}>{fmt(totalActual)}</Td>
                    <Td s={{ fontWeight: 800, color: C.warning }}>{fmt(totalCommitted)}</Td>
                    <Td s={{ fontWeight: 800, color: totalBudget - totalActual - totalCommitted < 0 ? C.danger : C.success }}>{fmt(totalBudget - totalActual - totalCommitted)}</Td>
                    <Td s={{ fontWeight: 800 }}>{pct(totalActual, totalBudget)}%</Td>
                  </tr>
                </tbody>
              </TblWrap>
            </Card>
          </>
        )}

        {tab === "evm" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <Stat label="CPI — مؤشر أداء التكلفة" value={CPI} sub={parseFloat(CPI) >= 1 ? "✓ أقل من الميزانية" : "✗ أعلى من الميزانية"} icon="💵" color={parseFloat(CPI) >= 1 ? C.success : C.danger} />
              <Stat label="SPI — مؤشر أداء الجدول" value={SPI} sub={parseFloat(SPI) >= 1 ? "✓ أمام الجدول" : "✗ متأخر"} icon="⏱" color={parseFloat(SPI) >= 1 ? C.success : C.warning} />
              <Stat label="CV — انحراف التكلفة" value={`${CV < 0 ? "-" : "+"}${fmt(Math.abs(CV) / 1e6, 1)} م`} icon="📉" color={CV >= 0 ? C.success : C.danger} />
              <Stat label="SV — انحراف الجدول" value={`${SV < 0 ? "-" : "+"}${fmt(Math.abs(SV) / 1e6, 1)} م`} icon="📅" color={SV >= 0 ? C.success : C.warning} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
              <Card>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>EAC — التقدير عند الإكمال</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.info }}>{fmt(EAC / 1e6, 1)} م ج.م</div>
                <div style={{ fontSize: 9, color: C.muted }}>الميزانية الأصلية: {fmt(BAC / 1e6, 1)} م</div>
              </Card>
              <Card>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>VAC — انحراف عند الإكمال</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: VAC >= 0 ? C.success : C.danger }}>{VAC < 0 ? "-" : "+"}{fmt(Math.abs(VAC) / 1e6, 1)} م ج.م</div>
                <div style={{ fontSize: 9, color: C.muted }}>{VAC >= 0 ? "وفر في الميزانية ✓" : "تجاوز الميزانية ✗"}</div>
              </Card>
              <Card>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>ETC — التكلفة المتبقية</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.purple }}>{fmt(ETC / 1e6, 1)} م ج.م</div>
                <div style={{ fontSize: 9, color: C.muted }}>لإتمام باقي الأعمال</div>
              </Card>
            </div>
          </>
        )}

        {tab === "chart" && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 14 }}>📊 منحنى EVM — PV vs EV vs AC (بالمليون ج.م)</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evmData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 9 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}م`} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10 }} formatter={v => [`${fmt(v)} ج.م`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="PV" stroke={C.brand} strokeWidth={2} dot={{ r: 3 }} name="مخطط PV" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="EV" stroke={C.success} strokeWidth={2} dot={{ r: 3 }} name="مكتسب EV" />
                <Line type="monotone" dataKey="AC" stroke={C.danger} strokeWidth={2} dot={{ r: 3 }} name="فعلي AC" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="+ بند ميزانية جديد">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Fld label="الفئة" req><Input value={form.category} onChange={set("category")} placeholder="مواد / عمالة / معدات..." /></Fld>
          <Fld label="الوصف"><Input value={form.description} onChange={set("description")} placeholder="وصف تفصيلي..." /></Fld>
          <Fld label="الميزانية المعتمدة (ج.م)" req><Input type="number" value={form.budgeted} onChange={set("budgeted")} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={() => { addToast("تم إضافة البند ✓", "success"); setModal(false); }}>حفظ</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ② CASH FLOW SCREEN
// ══════════════════════════════════════════════════════════════
function CashFlowScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [view, setView] = useState("monthly");

  const data = MOCK_EXT.cashFlow;
  const actualMonths = data.filter(d => d.actual != null);
  const totalPlanned = data.reduce((s, d) => s + d.planned, 0);
  const totalActual = actualMonths.reduce((s, d) => s + d.actual, 0);
  const remaining = totalPlanned - totalActual;
  const gap = actualMonths[actualMonths.length - 1];
  const cashGap = gap ? gap.cumPlanned - gap.cumActual : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="مقارنة التدفق النقدي المخطط بالفعلي على مدار العام" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Select value={view} onChange={e => setView(e.target.value)} style={{ width: 120 }}>
            <option value="monthly">شهري</option>
            <option value="cumulative">تراكمي</option>
          </Select>
        </div>
      }>💳 التدفق النقدي</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="إجمالي المخطط" value={`${fmt(totalPlanned / 1e6, 1)} م`} icon="📋" color={C.brand} />
          <Stat label="المحصّل الفعلي" value={`${fmt(totalActual / 1e6, 1)} م`} sub={`${pct(totalActual, totalPlanned)}%`} icon="✅" color={C.success} />
          <Stat label="المتبقي (مخطط)" value={`${fmt(remaining / 1e6, 1)} م`} icon="📅" color={C.info} />
          <Stat label="فجوة التدفق الحالية" value={`${fmt(cashGap / 1e6, 1)} م`} sub="فرق التراكمي" icon="⚠️" color={cashGap > 0 ? C.warning : C.success} />
        </div>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 14 }}>
            {view === "monthly" ? "💵 التدفق النقدي الشهري (مليون ج.م)" : "📈 التدفق التراكمي (مليون ج.م)"}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 9 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}م`} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10 }} formatter={v => v ? [`${fmt(v)} ج.م`] : ["—"]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {view === "monthly" ? (
                <>
                  <Bar dataKey="planned" fill={C.brand + "66"} name="مخطط" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" fill={C.success + "88"} name="فعلي" radius={[3, 3, 0, 0]} />
                </>
              ) : (
                <>
                  <Area type="monotone" dataKey="cumPlanned" stroke={C.brand} fill={C.brand + "22"} name="مخطط تراكمي" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="cumActual" stroke={C.success} fill={C.success + "22"} name="فعلي تراكمي" />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>الشهر</Th><Th>مخطط (ج.م)</Th><Th>فعلي (ج.م)</Th><Th>الفرق</Th><Th>تراكمي مخطط</Th><Th>تراكمي فعلي</Th></tr></thead>
            <tbody>
              {data.map((row, i) => {
                const diff = row.actual != null ? row.actual - row.planned : null;
                return (
                  <tr key={i}>
                    <Td><span style={{ fontWeight: row.actual == null ? 400 : 600 }}>{row.month}</span></Td>
                    <Td>{fmt(row.planned)}</Td>
                    <Td style={{ color: row.actual == null ? C.muted : C.text }}>{row.actual != null ? fmt(row.actual) : "—"}</Td>
                    <Td style={{ color: diff == null ? C.muted : diff >= 0 ? C.success : C.danger, fontWeight: 700 }}>{diff != null ? `${diff >= 0 ? "+" : ""}${fmt(diff)}` : "—"}</Td>
                    <Td style={{ color: C.textSub }}>{fmt(row.cumPlanned)}</Td>
                    <Td style={{ color: row.cumActual == null ? C.muted : C.text }}>{row.cumActual != null ? fmt(row.cumActual) : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TblWrap>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ③ NCR SCREEN
// ══════════════════════════════════════════════════════════════
function NCRScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [modal, setModal] = useState(false);
  const [ncrs, setNcrs] = useState(MOCK_EXT.ncrs);
  const [form, setForm] = useState({ number: "", description: "", location: "", category: "", severity: "MEDIUM", dueDate: "", assignedTo: "" });

  const items = ncrs.filter(n => n.projectId === projectId);
  const open = items.filter(n => n.status === "OPEN").length;
  const closed = items.filter(n => n.status === "CLOSED").length;
  const overdue = items.filter(n => n.status === "OPEN" && new Date(n.dueDate) < new Date()).length;
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.description || !form.location) { addToast("أكمل الحقول المطلوبة", "error"); return; }
    const num = `NCR-${new Date().getFullYear()}-${String(ncrs.length + 1).padStart(3, "0")}`;
    setNcrs(ns => [...ns, { id: `n${Date.now()}`, projectId, number: num, ...form, status: "OPEN", raisedBy: "خالد إبراهيم", raisedAt: new Date().toISOString().split("T")[0] }]);
    addToast(`تم فتح ${num} ✓`, "success");
    setModal(false);
    setForm({ number: "", description: "", location: "", category: "", severity: "MEDIUM", dueDate: "", assignedTo: "" });
  };

  const close = (id) => {
    setNcrs(ns => ns.map(n => n.id === id ? { ...n, status: "CLOSED", closedAt: new Date().toISOString().split("T")[0] } : n));
    addToast("تم إغلاق NCR ✓", "success");
  };

  const severityColor = { HIGH: C.danger, MEDIUM: C.warning, LOW: C.success };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="سجل عدم المطابقة مع تتبع الإغلاق" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ فتح NCR</Btn>
        </div>
      }>⚠️ عدم المطابقة (NCR)</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="إجمالي NCRs" value={items.length} icon="📋" color={C.brand} />
          <Stat label="مفتوح" value={open} icon="🔴" color={C.danger} />
          <Stat label="مغلق" value={closed} icon="✅" color={C.success} />
          <Stat label="متجاوز للموعد" value={overdue} icon="⏰" color={overdue > 0 ? C.danger : C.muted} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>الرقم</Th><Th>الوصف</Th><Th>الموقع</Th><Th>الفئة</Th><Th>الأولوية</Th><Th>تاريخ الرفع</Th><Th>الموعد النهائي</Th><Th>الحالة</Th><Th>الإجراء</Th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><Td colSpan={9} s={{ textAlign: "center", padding: 40, color: C.muted }}>لا توجد NCRs مسجلة</Td></tr>}
              {items.map(n => (
                <tr key={n.id}>
                  <Td><span style={{ color: C.brand, fontWeight: 700, fontFamily: "monospace" }}>{n.number}</span></Td>
                  <Td><div style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={n.description}>{n.description}</div></Td>
                  <Td style={{ color: C.info, fontFamily: "monospace", fontSize: 10 }}>{n.location}</Td>
                  <Td style={{ color: C.textSub }}>{n.category}</Td>
                  <Td><Badge text={n.severity} color={severityColor[n.severity]} /></Td>
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{fmtDate(n.raisedAt)}</Td>
                  <Td style={{ color: n.status === "OPEN" && new Date(n.dueDate) < new Date() ? C.danger : C.textSub, fontSize: 10 }}>{fmtDate(n.dueDate)}</Td>
                  <Td><Badge text={n.status === "OPEN" ? "مفتوح" : "مغلق"} /></Td>
                  <Td>
                    {n.status === "OPEN" && (
                      <Btn variant="success" size="xs" onClick={() => close(n.id)}>✓ إغلاق</Btn>
                    )}
                    {n.status === "CLOSED" && <span style={{ fontSize: 9, color: C.muted }}>{fmtDate(n.closedAt)}</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="⚠️ فتح NCR جديد" width={620}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="وصف عدم المطابقة" req><Textarea value={form.description} onChange={set("description")} rows={2} placeholder="وصف تفصيلي لعدم المطابقة..." /></Fld>
          <Fld label="الموقع / الكيلو" req half><Input value={form.location} onChange={set("location")} placeholder="KM 14+000" /></Fld>
          <Fld label="الفئة" req half><Input value={form.category} onChange={set("category")} placeholder="جودة دمك / مواصفات أسفلت..." /></Fld>
          <Fld label="مستوى الخطورة" third>
            <Select value={form.severity} onChange={set("severity")}>
              <option value="HIGH">عالي</option>
              <option value="MEDIUM">متوسط</option>
              <option value="LOW">منخفض</option>
            </Select>
          </Fld>
          <Fld label="الموعد النهائي للإغلاق" third><Input type="date" value={form.dueDate} onChange={set("dueDate")} /></Fld>
          <Fld label="المسؤول عن المعالجة" third><Input value={form.assignedTo} onChange={set("assignedTo")} placeholder="م. ..." /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn variant="danger" onClick={save}>⚠️ فتح NCR</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ④ DRAWINGS + RFI SCREEN
// ══════════════════════════════════════════════════════════════
function DrawingsScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("drawings");
  const [drawings, setDrawings] = useState(MOCK_EXT.drawings);
  const [form, setForm] = useState({ number: "", title: "", discipline: "مدني", revision: "A", type: "DRAWING" });

  const items = drawings.filter(d => d.projectId === projectId);
  const drList = items.filter(d => d.discipline !== "RFI");
  const rfiList = items.filter(d => d.discipline === "RFI");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const statusColor = { APPROVED: C.success, UNDER_REVIEW: C.warning, PENDING: C.info, SUPERSEDED: C.muted };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="سجل الرسومات الهندسية + طلبات الاستفسار RFI" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ {tab === "rfi" ? "طلب RFI" : "رسم جديد"}</Btn>
        </div>
      }>📐 الرسومات + RFI</SectionHdr>

      <Tabs tabs={[{ id: "drawings", label: `الرسومات (${drList.length})` }, { id: "rfi", label: `RFI (${rfiList.length})` }]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead>
              <tr>
                <Th>الرقم</Th><Th>العنوان</Th>
                {tab === "drawings" && <><Th>التخصص</Th><Th>المراجعة</Th></>}
                <Th>تاريخ التقديم</Th><Th>تاريخ الاعتماد</Th><Th>الحالة</Th>
                {tab === "drawings" && <Th>الملف</Th>}
              </tr>
            </thead>
            <tbody>
              {(tab === "drawings" ? drList : rfiList).map(d => (
                <tr key={d.id}>
                  <Td><span style={{ color: C.brand, fontWeight: 700, fontFamily: "monospace" }}>{d.number}</span></Td>
                  <Td><div style={{ maxWidth: 280 }}>{d.title}</div></Td>
                  {tab === "drawings" && <>
                    <Td style={{ color: C.info }}>{d.discipline}</Td>
                    <Td><span style={{ fontFamily: "monospace", color: C.purple }}>Rev. {d.revision}</span></Td>
                  </>}
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{fmtDate(d.submittedAt)}</Td>
                  <Td style={{ color: d.approvedAt ? C.success : C.muted, fontSize: 10 }}>{d.approvedAt ? fmtDate(d.approvedAt) : "—"}</Td>
                  <Td><Badge text={d.status === "APPROVED" ? "معتمد" : d.status === "UNDER_REVIEW" ? "قيد المراجعة" : d.status === "PENDING" ? "قيد الانتظار" : d.status} color={statusColor[d.status]} /></Td>
                  {tab === "drawings" && <Td>{d.file ? <span style={{ color: C.info, fontSize: 9, cursor: "pointer" }}>📄 {d.file}</span> : <span style={{ color: C.muted, fontSize: 9 }}>—</span>}</Td>}
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={tab === "rfi" ? "+ طلب استفسار RFI" : "+ إضافة رسم"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Fld label="الرقم" req><Input value={form.number} onChange={set("number")} placeholder={tab === "rfi" ? "RFI-2025-019" : "CIV-102"} /></Fld>
          <Fld label="العنوان / الموضوع" req><Input value={form.title} onChange={set("title")} /></Fld>
          {tab === "drawings" && (
            <div style={{ display: "flex", gap: 12 }}>
              <Fld label="التخصص" half>
                <Select value={form.discipline} onChange={set("discipline")}>
                  {["مدني", "إنشائي", "صرف", "كهرباء", "ميكانيكا"].map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Fld>
              <Fld label="رقم المراجعة" half><Input value={form.revision} onChange={set("revision")} placeholder="A" /></Fld>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={() => { setDrawings(ds => [...ds, { id: `dr${Date.now()}`, projectId, discipline: tab === "rfi" ? "RFI" : form.discipline, ...form, status: "PENDING", submittedAt: new Date().toISOString().split("T")[0], approvedAt: null, file: null }]); addToast("تمت الإضافة ✓", "success"); setModal(false); }}>حفظ</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑤ CHAINMAP SCREEN — خريطة الكيلومترات التفاعلية
// ══════════════════════════════════════════════════════════════
function ChainMapScreen() {
  const [projectId, setProjectId] = useState("p1");
  const [hover, setHover] = useState(null);
  const proj = MOCK_EXT.projects.find(p => p.id === projectId);

  // بيانات وهمية لكل كيلومتر
  const totalKm = Math.round((proj?.chainageTo - proj?.chainageFrom) || 42);
  const segments = Array.from({ length: totalKm }, (_, i) => {
    const km = (proj?.chainageFrom || 0) + i;
    const p = Math.min(100, Math.max(0, 55 + Math.sin(i * 0.7) * 30 + (i < 10 ? 30 : i < 25 ? 10 : -5)));
    const status = p >= 95 ? "DONE" : p >= 60 ? "ACTIVE" : p >= 20 ? "PARTIAL" : "PENDING";
    return { km, label: `KM ${km}+000`, progress: Math.round(p), status };
  });

  const statusColor = { DONE: C.success, ACTIVE: C.brand, PARTIAL: C.warning, PENDING: C.border };
  const statusLabel = { DONE: "مكتمل ✓", ACTIVE: "جاري", PARTIAL: "جزئي", PENDING: "لم يبدأ" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="تقدم الأعمال على طول خط الطريق كيلومتراً بكيلومتر" action={
        <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 180 }}>
          {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </Select>
      }>🗺️ خريطة الكيلومترات</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="إجمالي الطول" value={`${totalKm} كم`} icon="🛣️" color={C.brand} />
          <Stat label="مكتمل" value={`${segments.filter(s => s.status === "DONE").length} كم`} icon="✅" color={C.success} />
          <Stat label="جاري التنفيذ" value={`${segments.filter(s => s.status === "ACTIVE").length} كم`} icon="⚙️" color={C.warning} />
          <Stat label="لم يبدأ" value={`${segments.filter(s => s.status === "PENDING").length} كم`} icon="⏳" color={C.muted} />
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          {Object.entries(statusLabel).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.textSub }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: statusColor[k] }} />
              {v}
            </div>
          ))}
        </div>

        {/* Chain Map Grid */}
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {segments.map(seg => (
              <div
                key={seg.km}
                onMouseEnter={() => setHover(seg)}
                onMouseLeave={() => setHover(null)}
                style={{
                  width: 36, height: 36, borderRadius: 4,
                  background: statusColor[seg.status],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 8, fontWeight: 700,
                  color: seg.status === "PENDING" ? C.muted : seg.status === "DONE" ? "#000" : "#000",
                  transition: "transform 0.1s",
                  transform: hover?.km === seg.km ? "scale(1.2)" : "scale(1)",
                  opacity: hover && hover.km !== seg.km ? 0.7 : 1,
                  border: hover?.km === seg.km ? `2px solid ${C.text}` : "2px solid transparent",
                  position: "relative",
                }}
                title={`${seg.label} — ${seg.progress}% — ${statusLabel[seg.status]}`}
              >
                {(proj?.chainageFrom || 0) + (seg.km - (proj?.chainageFrom || 0))}
              </div>
            ))}
          </div>

          {/* Hover Detail */}
          {hover && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", gap: 20, alignItems: "center" }}>
              <span style={{ color: C.brand, fontWeight: 800, fontFamily: "monospace" }}>{hover.label}</span>
              <ProgressBar value={hover.progress} color={statusColor[hover.status]} />
              <span style={{ fontWeight: 700, color: statusColor[hover.status], minWidth: 40 }}>{hover.progress}%</span>
              <Badge text={statusLabel[hover.status]} color={statusColor[hover.status]} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑥ S-CURVE SCREEN
// ══════════════════════════════════════════════════════════════
function SCurveScreen() {
  const [projectId, setProjectId] = useState("p1");

  const sCurveData = [
    { month: "يناير", planned: 6.5, actual: 5.7 },
    { month: "فبراير", planned: 13.5, actual: 12.3 },
    { month: "مارس", planned: 21.6, actual: 19.7 },
    { month: "أبريل", planned: 31.4, actual: 28.1 },
    { month: "مايو", planned: 41.1, actual: 38.1 },
    { month: "يونيو", planned: 51.9, actual: 47.7 },
    { month: "يوليو", planned: 60.5, actual: 55.9 },
    { month: "أغسطس", planned: 69.2, actual: 61.2 },
    { month: "سبتمبر", planned: 78.0, actual: null },
    { month: "أكتوبر", planned: 86.5, actual: null },
    { month: "نوفمبر", planned: 94.0, actual: null },
    { month: "ديسمبر", planned: 100.0, actual: null },
  ];

  const lastActual = [...sCurveData].reverse().find(d => d.actual != null);
  const delay = lastActual ? (lastActual.planned - lastActual.actual).toFixed(1) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="منحنى S — التقدم المخطط مقابل الفعلي" action={
        <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 180 }}>
          {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </Select>
      }>📈 منحنى S</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="التقدم الفعلي الحالي" value={`${lastActual?.actual}%`} icon="📊" color={C.success} />
          <Stat label="التقدم المخطط للآن" value={`${lastActual?.planned}%`} icon="📋" color={C.brand} />
          <Stat label="التأخير عن الخطة" value={`${delay}%`} sub={delay > 0 ? "خلف الجدول" : "أمام الجدول"} icon="⏱" color={parseFloat(delay) > 5 ? C.danger : parseFloat(delay) > 0 ? C.warning : C.success} />
        </div>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 11, color: C.text, marginBottom: 14 }}>📈 منحنى S — نسبة الإنجاز التراكمية</div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={sCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 9 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: C.muted, fontSize: 9 }} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10 }} formatter={v => v != null ? [`${v}%`] : ["—"]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="planned" stroke={C.brand} fill={C.brand + "22"} strokeDasharray="6 3" name="مخطط" />
              <Area type="monotone" dataKey="actual" stroke={C.success} fill={C.success + "22"} name="فعلي" />
              <ReferenceLine x={lastActual?.month} stroke={C.info + "88"} strokeDasharray="4 4" label={{ value: "الآن", fill: C.info, fontSize: 9 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑦ GANTT SCREEN
// ══════════════════════════════════════════════════════════════
function GanttScreen() {
  const [projectId, setProjectId] = useState("p1");
  const tasks = MOCK_EXT.ganttTasks.filter(t => t.projectId === projectId);
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const years = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12",
    "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];

  const toIdx = (ym) => years.indexOf(ym);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="الجدول الزمني للمشروع — بارشارت تفاعلي" action={
        <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 180 }}>
          {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </Select>
      }>📅 شبكة الجانت</SectionHdr>

      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: 20 }}>
        <Card style={{ padding: 0, minWidth: 900 }}>
          {/* Header Row */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 220, flexShrink: 0, padding: "10px 14px", fontSize: 9, color: C.textSub, fontWeight: 700, borderLeft: `1px solid ${C.border}` }}>المهمة</div>
            <div style={{ flex: 1, display: "flex" }}>
              {years.map(ym => (
                <div key={ym} style={{ flex: 1, minWidth: 28, textAlign: "center", padding: "4px 0", fontSize: 7, color: C.muted, borderLeft: `1px solid ${C.border}22` }}>
                  {ym.split("-")[1] === "01" ? ym.split("-")[0] : months[parseInt(ym.split("-")[1]) - 1].slice(0, 3)}
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {tasks.map(task => {
            const startIdx = toIdx(task.start);
            const endIdx = toIdx(task.end);
            const spanCols = endIdx - startIdx + 1;
            const leftPct = (startIdx / years.length) * 100;
            const widthPct = (spanCols / years.length) * 100;

            return (
              <div key={task.id} style={{ display: "flex", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
                <div style={{ width: 220, flexShrink: 0, padding: "8px 14px", fontSize: 10, color: C.text, borderLeft: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: task.color, flexShrink: 0 }} />
                  <span>{task.name}</span>
                </div>
                <div style={{ flex: 1, position: "relative", height: 32 }}>
                  {/* Bar */}
                  <div style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: "50%", transform: "translateY(-50%)",
                    height: 18, borderRadius: 3,
                    background: task.color + "44",
                    border: `1px solid ${task.color}66`,
                    overflow: "hidden",
                  }}>
                    {/* Progress Fill */}
                    <div style={{ width: `${task.progress}%`, height: "100%", background: task.color + "cc", borderRadius: 3 }} />
                  </div>
                  {/* Progress Label */}
                  <div style={{ position: "absolute", left: `${leftPct + widthPct / 2}%`, transform: "translateX(-50%)", top: "50%", marginTop: -8, fontSize: 8, color: C.text, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {task.progress}%
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑧ EOT SCREEN
// ══════════════════════════════════════════════════════════════
function EOTScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [modal, setModal] = useState(false);
  const [eots, setEots] = useState(MOCK_EXT.eotRequests);
  const [form, setForm] = useState({ code: "", cause: "", requestedDays: "", notes: "" });

  const items = eots.filter(e => e.projectId === projectId);
  const totalGranted = items.reduce((s, e) => s + (e.grantedDays || 0), 0);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const statusColor = { APPROVED: C.success, PARTIAL: C.warning, SUBMITTED: C.info, REJECTED: C.danger };
  const statusLabel = { APPROVED: "مُنح كاملاً", PARTIAL: "مُنح جزئياً", SUBMITTED: "قيد المراجعة", REJECTED: "مرفوض" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="طلبات التمديد الزمني للعقد" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ طلب EOT جديد</Btn>
        </div>
      }>⏱️ طلبات التمديد الزمني (EOT)</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="عدد طلبات EOT" value={items.length} icon="📋" color={C.brand} />
          <Stat label="إجمالي الأيام الممنوحة" value={`${totalGranted} يوم`} icon="📅" color={C.success} />
          <Stat label="قيد المراجعة" value={items.filter(e => e.status === "SUBMITTED").length} icon="⏳" color={C.warning} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>الكود</Th><Th>سبب الطلب</Th><Th>الأيام المطلوبة</Th><Th>الأيام الممنوحة</Th><Th>الحالة</Th><Th>تاريخ التقديم</Th><Th>ملاحظات</Th></tr></thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <Td><span style={{ color: C.brand, fontWeight: 700, fontFamily: "monospace" }}>{e.code}</span></Td>
                  <Td>{e.cause}</Td>
                  <Td style={{ color: C.info, fontWeight: 700, textAlign: "center" }}>{e.requestedDays}</Td>
                  <Td style={{ color: e.grantedDays ? C.success : C.muted, fontWeight: 700, textAlign: "center" }}>{e.grantedDays ?? "—"}</Td>
                  <Td><Badge text={statusLabel[e.status]} color={statusColor[e.status]} /></Td>
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{fmtDate(e.submittedAt)}</Td>
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{e.notes}</Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="⏱️ طلب تمديد زمني جديد">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Fld label="سبب التأخير" req><Textarea value={form.cause} onChange={set("cause")} rows={2} placeholder="وصف سبب التأخير..." /></Fld>
          <Fld label="عدد الأيام المطلوبة" req><Input type="number" value={form.requestedDays} onChange={set("requestedDays")} placeholder="45" /></Fld>
          <Fld label="ملاحظات / مستندات داعمة"><Textarea value={form.notes} onChange={set("notes")} rows={2} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={() => {
            const code = `EOT-${new Date().getFullYear()}-${String(eots.length + 1).padStart(3, "0")}`;
            setEots(es => [...es, { id: `eot${Date.now()}`, projectId, code, ...form, requestedDays: parseInt(form.requestedDays), grantedDays: null, status: "SUBMITTED", submittedAt: new Date().toISOString().split("T")[0] }]);
            addToast(`تم تقديم ${code} ✓`, "success");
            setModal(false);
          }}>تقديم الطلب</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑨ SUBCONTRACTORS SCREEN
// ══════════════════════════════════════════════════════════════
function SubcontractorsScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [modal, setModal] = useState(false);
  const [subs, setSubs] = useState(MOCK_EXT.subcontractors);
  const [form, setForm] = useState({ name: "", specialty: "", contractValue: "", startDate: "", endDate: "" });

  const items = subs.filter(s => s.projectId === projectId);
  const totalContract = items.reduce((s, i) => s + i.contractValue, 0);
  const totalPaid = items.reduce((s, i) => s + i.paid, 0);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="إدارة عقود ومدفوعات المقاولين من الباطن" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ مقاول من الباطن</Btn>
        </div>
      }>🤝 المقاولون من الباطن</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="عدد المقاولين" value={items.length} icon="🏢" color={C.brand} />
          <Stat label="إجمالي العقود" value={`${fmt(totalContract / 1e6, 1)} م`} icon="📋" color={C.info} />
          <Stat label="إجمالي المدفوع" value={`${fmt(totalPaid / 1e6, 1)} م`} sub={`${pct(totalPaid, totalContract)}%`} icon="💳" color={C.success} />
          <Stat label="نشط حالياً" value={items.filter(s => s.status === "ACTIVE").length} icon="⚙️" color={C.warning} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>اسم المقاول</Th><Th>التخصص</Th><Th>قيمة العقد</Th><Th>المدفوع</Th><Th>التقدم</Th><Th>البداية</Th><Th>النهاية</Th><Th>الحالة</Th></tr></thead>
            <tbody>
              {items.map(sub => (
                <tr key={sub.id}>
                  <Td><span style={{ fontWeight: 700 }}>{sub.name}</span></Td>
                  <Td style={{ color: C.info }}>{sub.specialty}</Td>
                  <Td style={{ fontWeight: 600 }}>{fmt(sub.contractValue)}</Td>
                  <Td style={{ color: C.success }}>{fmt(sub.paid)}</Td>
                  <Td>
                    <div style={{ width: 80 }}><ProgressBar value={sub.progress} height={5} /></div>
                    <span style={{ fontSize: 9, color: C.brand }}>{sub.progress}%</span>
                  </Td>
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{fmtDate(sub.startDate)}</Td>
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{fmtDate(sub.endDate)}</Td>
                  <Td><Badge text={sub.status === "ACTIVE" ? "نشط" : "مكتمل"} /></Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="+ مقاول من الباطن جديد">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="اسم المقاول" req><Input value={form.name} onChange={set("name")} /></Fld>
          <Fld label="التخصص" req half><Input value={form.specialty} onChange={set("specialty")} placeholder="أعمال التسوية / الجسور..." /></Fld>
          <Fld label="قيمة العقد (ج.م)" req half><Input type="number" value={form.contractValue} onChange={set("contractValue")} /></Fld>
          <Fld label="تاريخ البداية" half><Input type="date" value={form.startDate} onChange={set("startDate")} /></Fld>
          <Fld label="تاريخ النهاية" half><Input type="date" value={form.endDate} onChange={set("endDate")} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={() => { setSubs(ss => [...ss, { id: `sc${Date.now()}`, projectId, ...form, contractValue: +form.contractValue, paid: 0, progress: 0, status: "ACTIVE" }]); addToast("تمت الإضافة ✓", "success"); setModal(false); }}>حفظ</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑩ SAFETY SCREEN
// ══════════════════════════════════════════════════════════════
function SafetyScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [modal, setModal] = useState(false);
  const [incidents, setIncidents] = useState(MOCK_EXT.safetyIncidents);
  const [form, setForm] = useState({ type: "", description: "", location: "", severity: "MINOR", date: "" });

  const items = incidents.filter(i => i.projectId === projectId);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const severityMap = { MINOR: { label: "بسيط", color: C.success }, MODERATE: { label: "متوسط", color: C.warning }, SEVERE: { label: "حرج", color: C.danger }, FATAL: { label: "مميت", color: "#7f1d1d" } };
  const LTI = items.filter(i => i.severity !== "MINOR" && i.status === "CLOSED").length;
  const daysWithoutIncident = 15;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="سجل حوادث السلامة المهنية وإدارة المخاطر" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ تسجيل حادثة</Btn>
        </div>
      }>🦺 السلامة المهنية</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="أيام بدون حوادث" value={daysWithoutIncident} icon="🛡️" color={C.success} />
          <Stat label="إجمالي الحوادث" value={items.length} icon="📋" color={C.brand} />
          <Stat label="حوادث LTI" value={LTI} sub="مع إيقاف العمل" icon="⚠️" color={LTI > 0 ? C.danger : C.success} />
          <Stat label="مفتوحة (قيد المعالجة)" value={items.filter(i => i.status === "OPEN").length} icon="🔴" color={items.filter(i => i.status === "OPEN").length > 0 ? C.warning : C.muted} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>نوع الحادثة</Th><Th>الوصف</Th><Th>الموقع</Th><Th>الخطورة</Th><Th>التاريخ</Th><Th>المُبلِّغ</Th><Th>الحالة</Th></tr></thead>
            <tbody>
              {items.map(inc => (
                <tr key={inc.id}>
                  <Td style={{ fontWeight: 600 }}>{inc.type}</Td>
                  <Td><div style={{ maxWidth: 220 }}>{inc.description}</div></Td>
                  <Td style={{ color: C.info, fontFamily: "monospace", fontSize: 10 }}>{inc.location}</Td>
                  <Td><Badge text={severityMap[inc.severity]?.label || inc.severity} color={severityMap[inc.severity]?.color} /></Td>
                  <Td style={{ color: C.textSub, fontSize: 10 }}>{fmtDate(inc.date)}</Td>
                  <Td style={{ color: C.textSub }}>{inc.reportedBy}</Td>
                  <Td><Badge text={inc.status === "OPEN" ? "مفتوح" : "مغلق"} /></Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🦺 تسجيل حادثة سلامة">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="نوع الحادثة" req half><Input value={form.type} onChange={set("type")} placeholder="إصابة / سقوط / حريق..." /></Fld>
          <Fld label="مستوى الخطورة" half>
            <Select value={form.severity} onChange={set("severity")}>
              {Object.entries(severityMap).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </Fld>
          <Fld label="الوصف التفصيلي" req><Textarea value={form.description} onChange={set("description")} rows={2} /></Fld>
          <Fld label="الموقع" req half><Input value={form.location} onChange={set("location")} placeholder="KM 15+300" /></Fld>
          <Fld label="تاريخ الحادثة" req half><Input type="date" value={form.date} onChange={set("date")} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn variant="danger" onClick={() => { setIncidents(is => [...is, { id: `si${Date.now()}`, projectId, ...form, status: "OPEN", reportedBy: "خالد إبراهيم" }]); addToast("تم التسجيل ✓", "success"); setModal(false); }}>تسجيل</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑪ MATERIALS SCREEN
// ══════════════════════════════════════════════════════════════
function MaterialsScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [tab, setTab] = useState("inventory");

  const items = MOCK_EXT.materials.filter(m => m.projectId === projectId);
  const totalValue = items.reduce((s, m) => s + m.delivered * m.unitCost, 0);
  const lowStock = items.filter(m => m.stock < (m.ordered - m.delivered) * 0.05 && m.stock < 500).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="متابعة توريد وصرف المواد" action={
        <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 180 }}>
          {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </Select>
      }>🧱 إدارة المواد</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="أصناف المواد" value={items.length} icon="📦" color={C.brand} />
          <Stat label="إجمالي قيمة المُسلَّم" value={`${fmt(totalValue / 1e6, 1)} م`} icon="💰" color={C.success} />
          <Stat label="نسبة الاستخدام" value={`${pct(items.reduce((s, m) => s + m.used, 0), items.reduce((s, m) => s + m.delivered, 0))}%`} icon="📊" color={C.info} />
          <Stat label="أصناف منخفضة المخزون" value={lowStock} icon="⚠️" color={lowStock > 0 ? C.warning : C.muted} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>اسم المادة</Th><Th>الوحدة</Th><Th>المطلوب</Th><Th>المُسلَّم</Th><Th>المستخدم</Th><Th>المخزون</Th><Th>سعر الوحدة</Th><Th>المورد</Th><Th>%</Th></tr></thead>
            <tbody>
              {items.map(m => {
                const usedPct = parseFloat(pct(m.used, m.ordered));
                const stockLow = m.stock < 500;
                return (
                  <tr key={m.id}>
                    <Td><span style={{ fontWeight: 600 }}>{m.name}</span></Td>
                    <Td style={{ color: C.info }}>{m.unit}</Td>
                    <Td>{fmt(m.ordered)}</Td>
                    <Td style={{ color: m.delivered >= m.ordered ? C.success : C.brand }}>{fmt(m.delivered)}</Td>
                    <Td>{fmt(m.used)}</Td>
                    <Td style={{ color: stockLow ? C.warning : C.success, fontWeight: 700 }}>{fmt(m.stock)}</Td>
                    <Td style={{ color: C.textSub }}>{fmt(m.unitCost)} ج.م</Td>
                    <Td style={{ color: C.textSub, fontSize: 10 }}>{m.supplier}</Td>
                    <Td>
                      <div style={{ width: 60 }}><ProgressBar value={usedPct} color={usedPct > 90 ? C.danger : usedPct > 70 ? C.warning : C.brand} height={5} /></div>
                      <span style={{ fontSize: 9 }}>{usedPct}%</span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TblWrap>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑫ DAILY LOGS SCREEN
// ══════════════════════════════════════════════════════════════
function DailyLogsScreen({ addToast }) {
  const [projectId, setProjectId] = useState("p1");
  const [modal, setModal] = useState(false);
  const [logs, setLogs] = useState(MOCK_EXT.dailyLogs);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], weather: "مشمس", works: "", workers: "", equipment: "", progress: "", issues: "لا توجد" });

  const items = logs.filter(l => l.projectId === projectId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = () => {
    if (!form.works) { addToast("أدخل الأعمال المنفذة", "error"); return; }
    setLogs(ls => [...ls, { id: `dl${Date.now()}`, projectId, ...form, workers: parseInt(form.workers) || 0, reportedBy: "خالد إبراهيم" }]);
    addToast("تم حفظ تقرير اليوم ✓", "success");
    setModal(false);
    setForm({ date: new Date().toISOString().split("T")[0], weather: "مشمس", works: "", workers: "", equipment: "", progress: "", issues: "لا توجد" });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="سجل الأعمال اليومية والموارد" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: 160 }}>
            {MOCK_EXT.projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ تقرير اليوم</Btn>
        </div>
      }>📆 التمام اليومي</SectionHdr>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>
        {/* List */}
        <div style={{ width: 280, borderLeft: `1px solid ${C.border}`, overflowY: "auto", flexShrink: 0 }}>
          {items.map(log => (
            <div key={log.id} onClick={() => setSelected(log)}
              style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}22`, cursor: "pointer", background: selected?.id === log.id ? C.brandDim : "transparent" }}>
              <div style={{ color: C.brand, fontWeight: 700, fontSize: 11, marginBottom: 3 }}>{fmtDate(log.date)}</div>
              <div style={{ color: C.textSub, fontSize: 10 }}>👷 {log.workers} عامل | 🌤 {log.weather}</div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: C.text, fontSize: 14 }}>تقرير يوم {fmtDate(selected.date)}</h3>
                <Badge text={selected.weather} color={C.info} />
              </div>
              {[
                { label: "👷 عدد العمال", value: `${selected.workers} عامل` },
                { label: "⚙️ المعدات", value: selected.equipment },
                { label: "🔨 الأعمال المنفذة", value: selected.works },
                { label: "📊 التقدم", value: selected.progress },
                { label: "⚠️ المشكلات", value: selected.issues || "لا توجد" },
                { label: "✍️ المُعِد", value: selected.reportedBy },
              ].map(row => (
                <Card key={row.label}>
                  <div style={{ fontSize: 10, color: C.textSub, marginBottom: 6 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: C.text }}>{row.value}</div>
                </Card>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>اختر يوماً من القائمة</div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="📆 تقرير الأعمال اليومية" width={640}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Fld label="التاريخ" req third><Input type="date" value={form.date} onChange={set("date")} /></Fld>
          <Fld label="حالة الطقس" third>
            <Select value={form.weather} onChange={set("weather")}>
              {["مشمس", "غائم جزئياً", "غائم", "ممطر", "عاصف", "شديد الحرارة"].map(w => <option key={w} value={w}>{w}</option>)}
            </Select>
          </Fld>
          <Fld label="عدد العمال" third><Input type="number" value={form.workers} onChange={set("workers")} placeholder="68" /></Fld>
          <Fld label="الأعمال المنفذة اليوم" req><Textarea value={form.works} onChange={set("works")} rows={2} placeholder="وصف الأعمال..." /></Fld>
          <Fld label="المعدات المستخدمة"><Textarea value={form.equipment} onChange={set("equipment")} rows={2} placeholder="3 هزازات + 2 جرافة..." /></Fld>
          <Fld label="التقدم الإجمالي"><Input value={form.progress} onChange={set("progress")} placeholder="تراكمي 62.5%" /></Fld>
          <Fld label="المشكلات والملاحظات"><Textarea value={form.issues} onChange={set("issues")} rows={2} /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={save}>💾 حفظ التقرير</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑬ USERS SCREEN
// ══════════════════════════════════════════════════════════════
function UsersScreen({ addToast }) {
  const [users, setUsers] = useState(MOCK_EXT.users);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "ENGINEER", password: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const ROLES = { ADMIN: { label: "مدير النظام", color: C.danger }, MANAGER: { label: "مدير مشروع", color: C.brand }, ENGINEER: { label: "مهندس", color: C.info }, ACCOUNTANT: { label: "محاسب", color: C.success }, VIEWER: { label: "قارئ", color: C.muted } };

  const toggleStatus = (id) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : u));
    addToast("تم تحديث الحالة ✓", "success");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="إدارة المستخدمين والصلاحيات" action={<Btn onClick={() => setModal(true)}>+ مستخدم جديد</Btn>}>👥 المستخدمون</SectionHdr>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          <Stat label="إجمالي المستخدمين" value={users.length} icon="👥" color={C.brand} />
          <Stat label="نشط" value={users.filter(u => u.status === "ACTIVE").length} icon="✅" color={C.success} />
          <Stat label="غير نشط" value={users.filter(u => u.status === "INACTIVE").length} icon="⛔" color={C.muted} />
        </div>

        <Card style={{ padding: 0 }}>
          <TblWrap>
            <thead><tr><Th>الاسم</Th><Th>البريد الإلكتروني</Th><Th>الدور</Th><Th>الحالة</Th><Th>آخر دخول</Th><Th>الإجراءات</Th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: ROLES[u.role]?.color + "33", border: `1px solid ${ROLES[u.role]?.color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: ROLES[u.role]?.color }}>{u.name[0]}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </Td>
                  <Td style={{ color: C.info, fontFamily: "monospace", fontSize: 10 }}>{u.email}</Td>
                  <Td><Badge text={ROLES[u.role]?.label || u.role} color={ROLES[u.role]?.color} /></Td>
                  <Td><Badge text={u.status === "ACTIVE" ? "نشط" : "غير نشط"} /></Td>
                  <Td style={{ color: C.muted, fontSize: 10 }}>{u.lastLogin}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn size="xs" variant={u.status === "ACTIVE" ? "ghost" : "success"} onClick={() => toggleStatus(u.id)}>{u.status === "ACTIVE" ? "تعطيل" : "تفعيل"}</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TblWrap>
        </Card>

        {/* RBAC Matrix */}
        <div style={{ marginTop: 16 }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 12, marginBottom: 10 }}>🔐 مصفوفة الصلاحيات (RBAC)</div>
          <Card style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr>
                  <Th s={{ background: C.surface }}>الوحدة / الإجراء</Th>
                  {Object.values(ROLES).map(r => <Th key={r.label} s={{ background: C.surface, textAlign: "center" }}>{r.label}</Th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "المستخلصات — إنشاء", perms: [true, true, true, false, false] },
                  { label: "المستخلصات — اعتماد", perms: [true, true, false, false, false] },
                  { label: "Audit Log — عرض", perms: [true, true, false, true, false] },
                  { label: "Audit Log — تصدير", perms: [true, false, false, false, false] },
                  { label: "المستخدمون — CRUD", perms: [true, false, false, false, false] },
                  { label: "ETA — إرسال", perms: [true, true, false, true, false] },
                ].map(row => (
                  <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "8px 14px", fontSize: 10, color: C.textSub }}>{row.label}</td>
                    {row.perms.map((p, i) => (
                      <td key={i} style={{ padding: 8, textAlign: "center" }}>
                        <span style={{ fontSize: 14, color: p ? C.success : C.muted }}>{p ? "✓" : "—"}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="+ مستخدم جديد">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Fld label="الاسم الكامل" req><Input value={form.name} onChange={set("name")} /></Fld>
          <Fld label="البريد الإلكتروني" req><Input type="email" value={form.email} onChange={set("email")} /></Fld>
          <Fld label="الدور والصلاحية" req>
            <Select value={form.role} onChange={set("role")}>
              {Object.entries(ROLES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </Fld>
          <Fld label="كلمة المرور المؤقتة" req><Input type="password" value={form.password} onChange={set("password")} placeholder="سيُطلب التغيير عند أول دخول" /></Fld>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>إلغاء</Btn>
          <Btn onClick={() => { setUsers(us => [...us, { id: `u${Date.now()}`, ...form, status: "ACTIVE", lastLogin: "—", createdAt: new Date().toISOString().split("T")[0] }]); addToast("تم إنشاء المستخدم ✓", "success"); setModal(false); }}>إنشاء</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑭ SETTINGS SCREEN
// ══════════════════════════════════════════════════════════════
function SettingsScreen({ addToast }) {
  const [company, setCompany] = useState({ name: "شركة نيل رودز للطرق والجسور", taxId: "203-456-789", address: "القاهرة، مصر", email: "info@nilroads.com", phone: "02-27654321", logo: "" });
  const [notifs, setNotifs] = useState({ guaranteeAlert30: true, guaranteeAlert60: true, guaranteeAlert90: true, extractOverdue: true, ncrOverdue: true, emailAlerts: true, smsAlerts: false });
  const [etaCfg, setEtaCfg] = useState({ env: "staging", activityCode: "4312", taxId: "" });
  const [tab, setTab] = useState("company");

  const setC = k => e => setCompany(c => ({ ...c, [k]: e.target.value }));
  const setN = k => () => setNotifs(n => ({ ...n, [k]: !n[k] }));
  const setE = k => e => setEtaCfg(c => ({ ...c, [k]: e.target.value }));

  const Toggle = ({ on, onClick, label }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
      <span style={{ fontSize: 12, color: C.text }}>{label}</span>
      <div onClick={onClick} style={{ width: 40, height: 22, borderRadius: 11, background: on ? C.success : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: on ? 2 : 20, transition: "right 0.2s" }} />
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="إعدادات الشركة والنظام والإشعارات">⚙️ الإعدادات</SectionHdr>
      <Tabs tabs={[{ id: "company", label: "بيانات الشركة" }, { id: "notifications", label: "الإشعارات" }, { id: "eta", label: "إعدادات ETA" }, { id: "system", label: "النظام" }]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {tab === "company" && (
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <Fld label="اسم الشركة" req><Input value={company.name} onChange={setC("name")} /></Fld>
              <Fld label="الرقم الضريبي" req half><Input value={company.taxId} onChange={setC("taxId")} /></Fld>
              <Fld label="الهاتف" half><Input value={company.phone} onChange={setC("phone")} /></Fld>
              <Fld label="العنوان"><Input value={company.address} onChange={setC("address")} /></Fld>
              <Fld label="البريد الإلكتروني" req><Input type="email" value={company.email} onChange={setC("email")} /></Fld>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Btn onClick={() => addToast("تم حفظ بيانات الشركة ✓", "success")}>حفظ التغييرات</Btn>
            </div>
          </Card>
        )}

        {tab === "notifications" && (
          <Card>
            <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginBottom: 12 }}>🔐 تنبيهات الضمانات</div>
            <Toggle on={notifs.guaranteeAlert30} onClick={setN("guaranteeAlert30")} label="تنبيه قبل 30 يوم من انتهاء الضمان" />
            <Toggle on={notifs.guaranteeAlert60} onClick={setN("guaranteeAlert60")} label="تنبيه قبل 60 يوم من انتهاء الضمان" />
            <Toggle on={notifs.guaranteeAlert90} onClick={setN("guaranteeAlert90")} label="تنبيه قبل 90 يوم من انتهاء الضمان" />
            <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, margin: "16px 0 12px" }}>📋 تنبيهات المستخلصات والجودة</div>
            <Toggle on={notifs.extractOverdue} onClick={setN("extractOverdue")} label="تنبيه عند تأخر اعتماد المستخلص" />
            <Toggle on={notifs.ncrOverdue} onClick={setN("ncrOverdue")} label="تنبيه عند تجاوز موعد إغلاق NCR" />
            <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, margin: "16px 0 12px" }}>📧 قنوات الإشعار</div>
            <Toggle on={notifs.emailAlerts} onClick={setN("emailAlerts")} label="إشعارات البريد الإلكتروني" />
            <Toggle on={notifs.smsAlerts} onClick={setN("smsAlerts")} label="إشعارات الرسائل القصيرة (SMS)" />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Btn onClick={() => addToast("تم حفظ إعدادات الإشعارات ✓", "success")}>حفظ</Btn>
            </div>
          </Card>
        )}

        {tab === "eta" && (
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <Fld label="بيئة ETA">
                <Select value={etaCfg.env} onChange={setE("env")}>
                  <option value="staging">staging — تجريبي (sdc.invoicing.eta.gov.eg)</option>
                  <option value="production">production — إنتاج (api.invoicing.eta.gov.eg)</option>
                </Select>
              </Fld>
              <Fld label="الرقم الضريبي للشركة (10 أرقام)" req><Input value={etaCfg.taxId} onChange={setE("taxId")} placeholder="2034567890" /></Fld>
              <Fld label="كود النشاط" req half><Input value={etaCfg.activityCode} onChange={setE("activityCode")} placeholder="4312 (مقاولات)" /></Fld>
            </div>
            <div style={{ marginTop: 14, background: C.warningDim, border: `1px solid ${C.warning}44`, borderRadius: 8, padding: 12, fontSize: 10, color: C.warning }}>
              ⚠️ تحذير: للتحويل لبيئة الإنتاج، يجب الحصول على شهادة التوقيع الرقمي من هيئة NTRA أولاً (قد يستغرق 2-4 أسابيع).
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Btn onClick={() => addToast("تم حفظ إعدادات ETA ✓", "success")}>حفظ</Btn>
            </div>
          </Card>
        )}

        {tab === "system" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "إصدار النظام", value: "TECHOFFICE ERP v4.0" },
              { label: "قاعدة البيانات", value: "PostgreSQL 16 + Prisma ORM" },
              { label: "Cache", value: "Redis 7 (256MB LRU)" },
              { label: "ذكاء اصطناعي", value: "Claude claude-sonnet-4-6 (Anthropic)" },
              { label: "تخزين الملفات", value: "MinIO (S3-compatible)" },
              { label: "الواجهة", value: "Next.js 15 + React 19 + RTL" },
            ].map(row => (
              <Card key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: C.textSub }}>{row.label}</span>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 600, fontFamily: "monospace" }}>{row.value}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ⑮ AppV4 — الغلاف الرئيسي الكامل (34 وحدة)
// ══════════════════════════════════════════════════════════════
const ALL_MODULES = [
  { group: "الرئيسية", items: [
    { id: "dashboard",    icon: "📊", label: "لوحة التحكم" },
  ]},
  { group: "المالية", items: [
    { id: "projects",     icon: "🏗",  label: "المشاريع" },
    { id: "extracts",     icon: "💰",  label: "المستخلصات" },
    { id: "boq",          icon: "📋",  label: "BOQ والكميات" },
    { id: "budget",       icon: "📉",  label: "الميزانية + EVM" },
    { id: "cashflow",     icon: "💳",  label: "التدفق النقدي" },
    { id: "guarantees",   icon: "🔐",  label: "الضمانات" },
    { id: "eta",          icon: "🧾",  label: "الفاتورة الإلكترونية" },
  ]},
  { group: "الهندسة", items: [
    { id: "quality",      icon: "🔬",  label: "اختبارات الجودة" },
    { id: "ncrs",         icon: "⚠️",  label: "عدم المطابقة NCR" },
    { id: "drawings",     icon: "📐",  label: "الرسومات + RFI" },
    { id: "chainmap",     icon: "🗺️",  label: "خريطة الكيلومترات" },
    { id: "scurve",       icon: "📈",  label: "منحنى S" },
    { id: "gantt",        icon: "📅",  label: "شبكة الجانت" },
    { id: "eot",          icon: "⏱️",  label: "طلبات EOT" },
  ]},
  { group: "الإدارة", items: [
    { id: "letters",      icon: "📨",  label: "المراسلات" },
    { id: "vos",          icon: "🔄",  label: "أوامر التغيير" },
    { id: "subcontractors",icon: "🤝", label: "المقاولون من الباطن" },
    { id: "safety",       icon: "🦺",  label: "السلامة المهنية" },
    { id: "materials",    icon: "🧱",  label: "المواد" },
    { id: "dailylogs",    icon: "📆",  label: "التمام اليومي" },
  ]},
  { group: "النظام", items: [
    { id: "ai",           icon: "🤖",  label: "المساعد الذكي" },
    { id: "audit",        icon: "🔍",  label: "سجل التدقيق" },
    { id: "users",        icon: "👥",  label: "المستخدمون" },
    { id: "settings",     icon: "⚙️",  label: "الإعدادات" },
  ]},
];

export default function AppV4() {
  const [user, setUser] = useState(null);
  const [module, setModule] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  if (!user) return <LoginScreen onLogin={setUser} />;

  const props = { addToast };

  const renderModule = () => {
    switch (module) {
      case "dashboard":      return <Dashboard />;
      case "projects":       return <ProjectsScreen {...props} />;
      case "extracts":       return <ExtractsScreen {...props} />;
      case "boq":            return <BOQScreen {...props} />;
      case "budget":         return <BudgetEVMScreen {...props} />;
      case "cashflow":       return <CashFlowScreen {...props} />;
      case "guarantees":     return <GuaranteesScreen {...props} />;
      case "eta":            return <ETAScreen {...props} />;
      case "quality":        return <QualityScreen {...props} />;
      case "ncrs":           return <NCRScreen {...props} />;
      case "drawings":       return <DrawingsScreen {...props} />;
      case "chainmap":       return <ChainMapScreen />;
      case "scurve":         return <SCurveScreen />;
      case "gantt":          return <GanttScreen />;
      case "eot":            return <EOTScreen {...props} />;
      case "letters":        return <LettersScreen {...props} />;
      case "vos":            return <VariationOrdersScreen {...props} />;
      case "subcontractors": return <SubcontractorsScreen {...props} />;
      case "safety":         return <SafetyScreen {...props} />;
      case "materials":      return <MaterialsScreen {...props} />;
      case "dailylogs":      return <DailyLogsScreen {...props} />;
      case "ai":             return <AIChatScreen projects={MOCK_EXT.projects} user={user} />;
      case "audit":          return <AuditLogScreen />;
      case "users":          return <UsersScreen {...props} />;
      case "settings":       return <SettingsScreen {...props} />;
      default:               return <Dashboard />;
    }
  };

  const alerts = {
    guarantees: MOCK_EXT.projects.flatMap(() => []).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Cairo','Tajawal','Segoe UI',sans-serif", direction: "rtl", display: "flex", overflow: "hidden" }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div style={{ width: collapsed ? 56 : 220, background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s" }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "16px 12px" : "16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", cursor: "pointer" }} onClick={() => setCollapsed(c => !c)}>
          {!collapsed && <div><div style={{ fontSize: 14, fontWeight: 900, color: C.brand }}>⚡ TECHOFFICE</div><div style={{ fontSize: 8, color: C.muted }}>ERP v4.0 — 34 وحدة</div></div>}
          {collapsed && <span style={{ fontSize: 20 }}>⚡</span>}
        </div>

        {/* Nav Groups */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {ALL_MODULES.map(group => (
            <div key={group.group}>
              {!collapsed && <div style={{ padding: "8px 14px 3px", fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>{group.group}</div>}
              {group.items.map(m => {
                const active = module === m.id;
                return (
                  <button key={m.id} onClick={() => setModule(m.id)}
                    title={collapsed ? m.label : ""}
                    style={{
                      width: "100%", padding: collapsed ? "9px 0" : "8px 14px",
                      background: active ? C.brandDim : "transparent",
                      border: active ? `1px solid ${C.brand}22` : "1px solid transparent",
                      borderRadius: 0, cursor: "pointer", textAlign: collapsed ? "center" : "right",
                      color: active ? C.brand : C.textSub, fontFamily: "inherit",
                      fontWeight: active ? 700 : 400, fontSize: 11,
                      display: "flex", alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: collapsed ? 0 : 8,
                      transition: "all 0.1s",
                    }}>
                    <span style={{ fontSize: collapsed ? 16 : 13 }}>{m.icon}</span>
                    {!collapsed && <span>{m.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User */}
        {!collapsed && (
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.text, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 9, color: C.muted }}>{user.role} — {user.company}</div>
            <button onClick={() => setUser(null)} style={{ marginTop: 8, width: "100%", padding: "5px 0", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 12 }}>
          <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>
            {ALL_MODULES.flatMap(g => g.items).find(m => m.id === module)?.icon}{" "}
            {ALL_MODULES.flatMap(g => g.items).find(m => m.id === module)?.label}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", display: "flex", gap: 6, alignItems: "center", cursor: "text", color: C.muted, fontSize: 10 }}>
              <span>🔍</span> بحث سريع... <kbd style={{ fontSize: 8, padding: "1px 4px", background: C.border, borderRadius: 3 }}>Ctrl K</kbd>
            </div>
          </div>
        </div>

        {/* Module Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {renderModule()}
        </div>
      </div>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === "success" ? "#064e3b" : t.type === "info" ? "#0c4a6e" : "#450a0a", color: t.type === "success" ? C.success : t.type === "info" ? C.info : C.danger, border: `1px solid ${t.type === "success" ? C.success : t.type === "info" ? C.info : C.danger}44`, padding: "10px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, boxShadow: "0 4px 20px #0009", display: "flex", gap: 8, alignItems: "center" }}>
            {t.type === "success" ? "✓" : t.type === "info" ? "ℹ" : "✕"} {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Placeholder للوحدات المستوردة من الملفات السابقة ────────────
// في الـ Monorepo الحقيقي تُستورد من:
//   import { Dashboard, ProjectsScreen, ExtractsScreen, BOQScreen,
//            LettersScreen, GuaranteesScreen, VariationOrdersScreen,
//            QualityScreen, AuditLogScreen, LoginScreen }
//     from "@/modules/phases4-5";
//   import { AIChatScreen, ETASubmitModal as ETAScreen }
//     from "@/modules/phase6";
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@nilroads.com");
  const [password, setPassword] = useState("Test@123456");
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onLogin({ id: "u1", name: "خالد إبراهيم", role: "ADMIN", company: "شركة نيل رودز للطرق", taxId: "203-456-789" });
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cairo','Tajawal',sans-serif", direction: "rtl" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 36, width: 380, boxShadow: "0 24px 60px #0009" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.brand }}>TECHOFFICE ERP</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>v4.0 — نظام إدارة مشاريع الطرق</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <Fld label="البريد الإلكتروني"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Fld>
          <Fld label="كلمة المرور"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></Fld>
        </div>
        <Btn onClick={handle} disabled={loading} style={{ width: "100%", padding: "10px 0", fontSize: 13 }}>
          {loading ? "⏳ جارٍ التحقق..." : "تسجيل الدخول"}
        </Btn>
        <div style={{ marginTop: 14, padding: 10, background: C.infoDim, borderRadius: 8, fontSize: 9, color: C.info }}>
          demo: admin@nilroads.com / أي كلمة مرور
        </div>
      </div>
    </div>
  );
}

// ETAScreen placeholder (تستخدم ETASubmitModal من phase6)
function ETAScreen({ addToast }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SectionHdr sub="إرسال الفواتير الإلكترونية عبر منظومة ETA">🧾 الفاتورة الإلكترونية</SectionHdr>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <Card>
          <div style={{ color: C.text, fontSize: 13, lineHeight: 2 }}>
            <div style={{ color: C.brand, fontWeight: 700, marginBottom: 8 }}>مكونات ETA المبنية في المرحلة السادسة:</div>
            {["ETABadge — شارة حالة الإرسال (SUBMITTED / Valid / Invalid)", "ETASubmitModal — نافذة تأكيد وإرسال (OAuth2 + retry logic)", "ETAStatusCard — بطاقة متابعة الحالة بعد الإرسال"].map(item => (
              <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ color: C.success }}>✓</span>
                <span style={{ fontSize: 12, color: C.textSub }}>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
