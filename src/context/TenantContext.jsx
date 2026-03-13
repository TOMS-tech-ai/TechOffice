// TenantContext.jsx
// ضع هذا الملف في: src/context/TenantContext.jsx
//
// الاستخدام في أي component داخل ERP:
//   const { tenant, user, role, can, loading } = useTenant();
//
// مثال:
//   if (!can('create_extract')) return <p>غير مصرح</p>;
//   const { data } = await supabase.from('projects').select('*');
//   // RLS تُرجع تلقائياً مشاريع الشركة فقط

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// ─── صلاحيات كل دور ──────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: [
    "view_dashboard", "manage_users", "manage_projects",
    "create_extract", "submit_extract", "approve_extract",
    "manage_guarantees", "view_reports", "manage_settings",
    "view_payments",
  ],
  manager: [
    "view_dashboard", "manage_projects",
    "create_extract", "submit_extract", "approve_extract",
    "manage_guarantees", "view_reports",
    "view_payments",
  ],
  engineer: [
    "view_dashboard", "manage_projects",
    "create_extract", "submit_extract",
    "view_reports",
  ],
  viewer: [
    "view_dashboard", "view_reports",
  ],
};

// ─── Context ──────────────────────────────────────────────────
const TenantContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────
export function TenantProvider({ children }) {
  const [tenant,  setTenant]  = useState(null);
  const [user,    setUser]    = useState(null);  // auth.user
  const [profile, setProfile] = useState(null);  // tenant_users row
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ─── تحميل بيانات الجلسة ──────────────────────────────────
  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. المستخدم الحالي
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUser(session.user);

      const meta       = session.user.user_metadata || {};
      const isSuperAdmin = meta.role === "superadmin";

      if (isSuperAdmin) {
        // السوبر أدمن: لا tenant محدد
        setProfile({ role: "superadmin", isSuperAdmin: true });
        setLoading(false);
        return;
      }

      // 2. جلب بيانات الشركة من tenants
      const slug = meta.tenant_slug;
      if (!slug) throw new Error("لا يوجد tenant_slug في بيانات المستخدم");

      const { data: tenantRow, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .single();
      if (tErr) throw tErr;
      if (!tenantRow.is_active) throw new Error("تم تعليق حساب شركتك. يُرجى التواصل مع الإدارة.");
      setTenant(tenantRow);

      // 3. جلب ملف المستخدم في tenant_users
      const { data: profileRow, error: pErr } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .single();
      if (pErr && pErr.code !== "PGRST116") throw pErr; // PGRST116 = not found
      setProfile(profileRow || { role: "viewer", isSuperAdmin: false });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadSession();
      else { setUser(null); setTenant(null); setProfile(null); }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadSession]);

  // ─── دالة التحقق من الصلاحية ──────────────────────────────
  const can = useCallback((permission) => {
    if (!profile) return false;
    if (profile.isSuperAdmin) return true;          // السوبر أدمن يملك كل شيء
    const perms = ROLE_PERMISSIONS[profile.role] || [];
    return perms.includes(permission);
  }, [profile]);

  // ─── التحقق من حد الباقة ──────────────────────────────────
  const withinPlanLimit = useCallback((resource) => {
    if (!tenant) return false;
    if (profile?.isSuperAdmin) return true;
    if (resource === "users")    return tenant.users_count    < tenant.max_users;
    if (resource === "projects") return tenant.projects_count < tenant.max_projects;
    return true;
  }, [tenant, profile]);

  // ─── Role label ───────────────────────────────────────────
  const roleLabel = {
    superadmin: "سوبر أدمن",
    admin:      "مدير النظام",
    manager:    "مدير مشاريع",
    engineer:   "مهندس",
    viewer:     "مشاهد فقط",
  }[profile?.role] || "—";

  const value = {
    tenant,          // بيانات الشركة (من جدول tenants)
    user,            // Supabase auth user
    profile,         // بيانات المستخدم (من جدول tenant_users)
    loading,
    error,
    can,             // can('create_extract') → boolean
    withinPlanLimit, // withinPlanLimit('projects') → boolean
    roleLabel,
    isSuperAdmin: profile?.isSuperAdmin || false,
    reload: loadSession,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant يجب أن يُستخدم داخل <TenantProvider>");
  return ctx;
}

// ─── Guard Component ──────────────────────────────────────────
// يُغلف أي component ويُخفيه إذا المستخدم لا يملك الصلاحية
export function Can({ permission, fallback = null, children }) {
  const { can } = useTenant();
  return can(permission) ? children : fallback;
}

// ─── Plan Limit Guard ─────────────────────────────────────────
export function WithinLimit({ resource, children, fallback }) {
  const { withinPlanLimit, tenant } = useTenant();
  if (withinPlanLimit(resource)) return children;
  return fallback || (
    <div style={{
      padding: "12px 16px", borderRadius: 8,
      background: "#f59e0b14", border: "1px solid #f59e0b44",
      color: "#f59e0b", fontSize: 11, fontWeight: 600,
    }}>
      ⚠️ وصلت لحد الباقة — عدد {resource === "users" ? "المستخدمين" : "المشاريع"} المسموح به
      هو {resource === "users" ? tenant?.max_users : tenant?.max_projects}.
      يُرجى الترقية إلى باقة أعلى.
    </div>
  );
}

// ─── مثال على الاستخدام في أي صفحة ERP ──────────────────────
/*

// في src/main.jsx أو App.jsx:
import { TenantProvider } from "./context/TenantContext";

function App() {
  return (
    <TenantProvider>
      <YourERPApp />
    </TenantProvider>
  );
}

// في أي صفحة ERP:
import { useTenant, Can, WithinLimit } from "../context/TenantContext";

function ProjectsPage() {
  const { tenant, can, withinPlanLimit, roleLabel } = useTenant();

  // جلب مشاريع الشركة — RLS تُصفّي تلقائياً
  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    // data = مشاريع شركتي فقط — لا حاجة لـ .eq("tenant_id", ...)
  };

  return (
    <div>
      <Can permission="manage_projects">
        <WithinLimit resource="projects">
          <button onClick={createProject}>+ مشروع جديد</button>
        </WithinLimit>
      </Can>

      <Can permission="approve_extract" fallback={<p>لا تملك صلاحية الاعتماد</p>}>
        <button>اعتماد المستخلص</button>
      </Can>
    </div>
  );
}

*/
