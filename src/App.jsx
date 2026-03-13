/**
 * TECHOFFICE ERP v4.0 — App.jsx
 * ══════════════════════════════
 * URL Routing:
 *   /login       → صفحة تسجيل الدخول
 *   /superadmin  → لوحة السوبر أدمن  (role=superadmin فقط)
 *   /dashboard   → تطبيق ERP الشركة  (مستخدمو الشركات)
 *   /            → redirect تلقائي حسب الـ role
 * ══════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@lib/supabaseClient';

import SuperAdmin from '@components/SuperAdmin';
import AppV4      from '@modules/phase7/index.jsx';

const C = {
  bg:      '#02030a',
  card:    '#080b14',
  border:  '#141828',
  brand:   '#6366f1',
  text:    '#e8eaf2',
  textSub: '#6b7494',
  danger:  '#ef4444',
};

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cairo, system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
      <div style={{ fontSize: 14, color: C.textSub }}>جارٍ تحميل النظام...</div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    const role = data.user?.user_metadata?.role;
    navigate(role === 'superadmin' ? '/superadmin' : '/dashboard', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cairo, system-ui, sans-serif', direction: 'rtl',
    }}>
      <div style={{
        width: 400, background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 16,
        padding: 40, boxShadow: `0 0 60px ${C.brand}18`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏗️</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.brand, letterSpacing: '-0.5px' }}>
            TECHOFFICE ERP
          </div>
          <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>
            نظام إدارة المكاتب الفنية — الإصدار 4.0
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: C.textSub, marginBottom: 6, fontWeight: 600 }}>
              البريد الإلكتروني
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="admin@company.com"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#0d1120', border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13,
                outline: 'none', direction: 'ltr', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: C.textSub, marginBottom: 6, fontWeight: 600 }}>
              كلمة المرور
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#0d1120', border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13,
                outline: 'none', direction: 'ltr', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: C.danger + '14', border: `1px solid ${C.danger}44`,
              color: C.danger, fontSize: 11, marginBottom: 16,
            }}>
              ❌ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: loading ? '#6366f166' : C.brand,
            border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ جارٍ الدخول...' : '🔐 تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 8, justifyContent: 'center',
        }}>
          <a href="/superadmin" style={{ fontSize: 10, color: C.textSub, textDecoration: 'none' }}>🔧 Super Admin</a>
          <span style={{ color: C.border }}>|</span>
          <a href="/dashboard" style={{ fontSize: 10, color: C.textSub, textDecoration: 'none' }}>📊 Dashboard</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: C.textSub }}>
          TECHOFFICE ERP v4.0 — جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ session, requiredRole, children }) {
  if (!session) return <Navigate to="/login" replace />;
  if (requiredRole && session.user?.user_metadata?.role !== requiredRole) {
    const fallback = session.user?.user_metadata?.role === 'superadmin' ? '/superadmin' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function RootRedirect({ session }) {
  if (!session) return <Navigate to="/login" replace />;
  const role = session.user?.user_metadata?.role;
  return <Navigate to={role === 'superadmin' ? '/superadmin' : '/dashboard'} replace />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    navigate('/login', { replace: true });
  };

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/"           element={<RootRedirect session={session} />} />
      <Route path="/login"      element={session ? <RootRedirect session={session} /> : <LoginPage />} />
      <Route path="/superadmin" element={
        <ProtectedRoute session={session} requiredRole="superadmin">
          <SuperAdmin onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="/dashboard"  element={
        <ProtectedRoute session={session}>
          <AppV4 user={session?.user} onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  );
}
