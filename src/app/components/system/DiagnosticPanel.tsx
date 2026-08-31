/**
 * DiagnosticPanel.tsx — لوحة التشخيص والأخطاء
 * تعرض آخر الأخطاء المتتبعة + إحصائيات الأداء + حالة Circuit Breakers
 * متاحة فقط للمستخدمين من نوع ministry_admin
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { errorTracker } from '../../utils/errorTracker';
import { circuits } from '../../utils/circuitBreaker';
import { getStats } from '../../utils/performance';

interface DiagnosticPanelProps {
  /** هل اللوحة مفتوحة */
  isOpen: boolean;
  /** إغلاق اللوحة */
  onClose: () => void;
}

export function DiagnosticPanel({ isOpen, onClose }: DiagnosticPanelProps) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<ReturnType<typeof errorTracker.getAll>>([]);
  const [perfStats, setPerfStats] = useState<ReturnType<typeof getStats> | null>(null);
  const [activeTab, setActiveTab] = useState<'errors' | 'circuits' | 'perf'>('errors');

  const isAdmin = user?.role === 'ministry_admin';

  const loadData = useCallback(() => {
    setErrors(errorTracker.getAll());
    setPerfStats(getStats());
  }, []);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  if (!isAdmin || !isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="لوحة التشخيص"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        width: 520,
        maxHeight: '70vh',
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-muted)',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14 }}>🔍 لوحة التشخيص</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} style={ghostBtnStyle} title="تحديث">🔄</button>
          <button onClick={onClose} style={ghostBtnStyle} title="إغلاق">✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 8px' }}>
        {(['errors', 'circuits', 'perf'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...tabBtnStyle,
              ...(activeTab === tab ? tabActiveStyle : {}),
            }}
          >
            {tab === 'errors' ? `❌ أخطاء (${errors.length})` : tab === 'circuits' ? '⚡ Circuits' : '📊 أداء'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
        {activeTab === 'errors' && <ErrorsTab errors={errors} />}
        {activeTab === 'circuits' && <CircuitsTab />}
        {activeTab === 'perf' && <PerfTab stats={perfStats} />}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--color-border)',
          fontSize: 11,
          color: 'var(--color-muted-foreground)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>البيانات محفوظة محلياً فقط</span>
        <button
          onClick={() => { errorTracker.clear(); loadData(); }}
          style={{ ...ghostBtnStyle, fontSize: 11, color: 'red' }}
        >
          مسح الأخطاء
        </button>
      </div>
    </div>
  );
}

function ErrorsTab({ errors }: { errors: ReturnType<typeof errorTracker.getAll> }) {
  if (errors.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--color-muted-foreground)', padding: 24 }}>لا توجد أخطاء مسجلة ✅</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {errors.map((e) => (
        <div
          key={e.id}
          style={{
            padding: '8px 12px',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: severityColor(e.severity) }}>
              {e.severity === 'error' ? '❌' : e.severity === 'warning' ? '⚠️' : e.severity === 'fatal' ? '☠️' : 'ℹ️'} {e.message}
            </span>
            {e.count > 1 && (
              <span style={{ background: 'var(--color-destructive)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                ×{e.count}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--color-muted-foreground)', fontSize: 11 }}>
            {e.source} • {new Date(e.timestamp).toLocaleTimeString('ar-SA')}
            {e.correlationId && ` • #${e.correlationId.slice(0, 8)}`}
          </div>
          {e.context && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--color-muted-foreground)' }}>السياق</summary>
              <pre style={{ fontSize: 10, background: 'var(--color-muted)', padding: 6, borderRadius: 4, overflowX: 'auto', margin: '4px 0 0' }}>
                {JSON.stringify(e.context, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function CircuitsTab() {
  const names = Object.keys(circuits);
  if (names.length === 0) return <p style={{ textAlign: 'center', color: 'var(--color-muted-foreground)', padding: 24 }}>لا توجد دوائر</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {names.map((name) => {
        const cb = circuits[name as keyof typeof circuits];
        const stats = cb.stats;
        const stateColor = stats.state === 'CLOSED' ? '#22c55e' : stats.state === 'OPEN' ? '#ef4444' : '#f59e0b';
        return (
          <div key={name} style={{ padding: '8px 12px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{name}</span>
              <span style={{ color: stateColor, fontWeight: 700 }}>{stats.state}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: 'var(--color-muted-foreground)' }}>
              <span>نجاح: {stats.successes}</span>
              <span>فشل: {stats.failures}</span>
              <span>آخر نجاح: {stats.lastSuccess ? new Date(stats.lastSuccess).toLocaleTimeString('ar-SA') : '—'}</span>
              <span>آخر فشل: {stats.lastFailure ? new Date(stats.lastFailure).toLocaleTimeString('ar-SA') : '—'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PerfTab({ stats }: { stats: ReturnType<typeof getStats> | null }) {
  if (!stats) return <p style={{ textAlign: 'center', color: 'var(--color-muted-foreground)', padding: 24 }}>جارٍ التحميل...</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
      {Object.entries(stats).map(([key, value]) => (
        <div key={key} style={{ padding: '6px 12px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>{key}</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {typeof value === 'number' ? value.toFixed(2) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'fatal': return '#dc2626';
    case 'error': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#6b7280';
  }
}

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: 14,
  color: 'var(--color-foreground)',
};

const tabBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 13,
  borderBottom: '2px solid transparent',
  marginBottom: -1,
};

const tabActiveStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--color-primary)',
  color: 'var(--color-primary)',
  fontWeight: 600,
};
