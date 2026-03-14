/**
 * TECHOFFICE ERP — useData Hook
 * ════════════════════════════════
 * Hook موحد لجلب وتحديث البيانات من Supabase
 * الاستخدام:
 *   const { data, loading, error, refresh, create, update, remove } =
 *     useData(ProjectsService, tenantId);
 */

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { supabase } from './supabaseClient';

// ── Context للـ tenant + user عبر التطبيق كله ─────────────────
export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// ── Generic Data Hook ─────────────────────────────────────────
export function useData(service, fetchKey) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!fetchKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await service.getByProject?.(fetchKey)
                  || await service.getAll?.(fetchKey);
      setData(result || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchKey]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch, setData };
}

// ── Dashboard Summary Hook ────────────────────────────────────
export function useDashboard(service, tenantId) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const result = await service.getSummary(tenantId);
      setSummary(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, loading, error, refresh: fetch };
}

// ── Realtime Subscription Hook ────────────────────────────────
export function useRealtime(table, tenantId, onchange) {
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`${table}-${tenantId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table,
          filter: `tenant_id=eq.${tenantId}` },
        () => onchange?.()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [table, tenantId]);
}

// ── Loading Spinner ───────────────────────────────────────────
export function LoadingState({ message = 'جاري التحميل...' }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      color: '#6e7a92', fontSize: 13,
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid #181c2c',
        borderTop: '3px solid #f59e0b',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────
export function ErrorState({ error, onRetry }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>حدث خطأ في التحميل</div>
      <div style={{ color: '#6e7a92', fontSize: 11 }}>{error}</div>
      {onRetry && (
        <button onClick={onRetry} style={{
          marginTop: 8, padding: '7px 20px',
          background: '#f59e0b22', border: '1px solid #f59e0b44',
          borderRadius: 6, color: '#f59e0b', fontSize: 11,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>إعادة المحاولة</button>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon = '📭', message = 'لا توجد بيانات', onAdd, addLabel }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ color: '#6e7a92', fontSize: 13 }}>{message}</div>
      {onAdd && (
        <button onClick={onAdd} style={{
          marginTop: 6, padding: '7px 20px',
          background: '#f59e0b', border: 'none',
          borderRadius: 6, color: '#000', fontSize: 11,
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
        }}>{addLabel || '+ إضافة'}</button>
      )}
    </div>
  );
}
