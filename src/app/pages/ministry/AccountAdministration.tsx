import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus, Users, Activity, History, ShieldAlert, CheckCircle2, XCircle,
  RefreshCw, Clock, MapPin, MonitorSmartphone, Search, Copy, Eye, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchList } from '../../utils/api';
import { logAudit } from '../../utils/security';
import { PageHeader } from '../../components/ui/PageHeader';

type TabKey = 'requests' | 'users' | 'active' | 'history' | 'attempts';

const TYPE_LABEL: Record<string, string> = {
  union: 'حساب نقابة', organization: 'حساب منظمة', worker: 'حساب عامل', ministry_employee: 'حساب موظف وزارة',
};
const ROLE_LABEL: Record<string, string> = {
  ministry_admin: 'مدير النظام', labor_inspector: 'مفتش عمل', compliance_officer: 'مسؤول امتثال',
  registry_officer: 'مسؤول سجلات', reports_viewer: 'عارض تقارير', legal_counsel: 'مستشار قانوني',
  supervisory_director: 'مدير إشراف', union_president: 'رئيس نقابة', hr_officer: 'مسؤولة موارد بشرية',
  financial_officer: 'مسؤول مالي', worker: 'عامل', employer_owner: 'صاحب عمل', union_admin: 'إداري نقابة',
};
const ROLES = Object.keys(ROLE_LABEL);

function fmtDuration(sec?: number | null): string {
  if (!sec || sec < 0) return '—';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} س ${m} د` : `${m} د`;
}
function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
}

export function AccountAdministration() {
  const [tab, setTab] = useState<TabKey>('requests');
  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'requests', label: 'طلبات فتح الحسابات', icon: UserPlus },
    { key: 'users', label: 'المستخدمون والصلاحيات', icon: Users },
    { key: 'active', label: 'الجلسات النشطة الآن', icon: Activity },
    { key: 'history', label: 'سجل الجلسات وتتبع الأثر', icon: History },
    { key: 'attempts', label: 'محاولات الدخول', icon: ShieldAlert },
  ];
  return (
    <div className="space-y-5" data-page="account-administration">
      <PageHeader
        title="إدارة الحسابات والمستخدمين"
        subtitle="نافذة مستقلة — دورة طلبات الحسابات، الصلاحيات، الرقابة، جلسات العمل ومحاولات الدخول"
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              tab === t.key ? 'bg-primary text-white shadow' : 'bg-card border border-border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'requests' && <RequestsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'active' && <ActiveSessionsTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'attempts' && <AttemptsTab />}
    </div>
  );
}

/* ==================== 1) طلبات فتح الحسابات ==================== */
function RequestsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('under_review');
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [granted, setGranted] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `&status=${statusFilter}` : '';
      setRows(await fetchList(`/api/account-requests?limit=50${q}`));
    } catch { toast.error('تعذر تحميل الطلبات'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (r: any) => {
    try {
      const res = await fetch(`/api/account-requests/${r.id}/approve`, { method: 'PATCH' });
      const j = await res.json();
      if (res.ok && j.success !== false) {
        toast.success(j.message || 'تم الاعتماد');
        setGranted(j.data);
        logAudit({ action: 'update', details: { request_id: r.id, email: j.data?.email } });
        load();
      } else toast.error(j.errors?.error || j.error || 'فشل الاعتماد');
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    try {
      const res = await fetch(`/api/account-requests/${rejecting.id}/reject`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const j = await res.json();
      if (res.ok && j.success !== false) { toast.success('تم رفض الطلب'); setRejecting(null); setReason(''); load(); }
      else toast.error(j.errors?.error || j.error || 'فشل الرفض');
    } catch { toast.error('خطأ في الاتصال'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[['under_review', 'قيد المراجعة'], ['approved', 'المعتمدة'], ['rejected', 'المرفوضة'], ['', 'الكل']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${statusFilter === v ? 'bg-primary text-white' : 'bg-card border border-border hover:bg-accent'}`}>{l}</button>
        ))}
        <button onClick={load} className="p-2 rounded-lg bg-card border border-border hover:bg-accent cursor-pointer ml-auto" title="تحديث"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">لا توجد طلبات في هذه القائمة.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">{r.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{TYPE_LABEL[r.request_type] || r.request_type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  r.status === 'under_review' ? 'bg-warning/15 text-warning-dark'
                  : r.status === 'approved' ? 'bg-success/15 text-success-dark' : 'bg-error/15 text-error-dark'}`}>
                  {r.status === 'under_review' ? 'بانتظار الموافقة' : r.status === 'approved' ? 'معتمد' : 'مرفوض'}
                </span>
              </div>
              <dl className="text-[11px] space-y-0.5 text-muted-foreground">
                {r.email && <div dir="ltr" className="truncate">{r.email}</div>}
                {r.phone && <div dir="ltr">{r.phone}</div>}
                {r.entity_name && <div>الجهة: {r.entity_name}</div>}
                {r.national_id && <div>الرقم القومي: {r.national_id}</div>}
                <div>قدّمه: {fmtTime(r.created_at)}</div>
                {r.rejection_reason && <div className="text-error">سبب الرفض: {r.rejection_reason}</div>}
              </dl>
              {r.status === 'under_review' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => approve(r)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-success text-white text-[11px] font-bold hover:opacity-90 cursor-pointer">
                    <CheckCircle2 className="w-3.5 h-3.5" /> اعتماد وإنشاء حساب
                  </button>
                  <button onClick={() => setRejecting(r)} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-error/10 text-error text-[11px] font-bold hover:bg-error/20 cursor-pointer">
                    <XCircle className="w-3.5 h-3.5" /> رفض
                  </button>
                </div>
              )}
              {r.created_user_name && <p className="text-[10px] text-muted-foreground">الحساب المنشأ: {r.created_user_name}</p>}
            </div>
          ))}
        </div>
      )}

      {/* نافذة كلمة المرور المؤقتة */}
      {granted && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setGranted(null)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" /> تم إنشاء الحساب</h3>
            <p className="text-xs text-muted-foreground">كلمة المرور المؤقتة تُعرض مرة واحدة فقط — انسخها وسلّمها للمستخدم:</p>
            <div className="bg-muted rounded-xl p-3 font-mono text-sm font-bold flex items-center justify-between gap-2" dir="ltr">
              <span>{granted.email}</span>
              <span className="text-primary">{granted.temp_password}</span>
              <button onClick={() => { navigator.clipboard.writeText(granted.temp_password); toast.success('تم النسخ'); }} className="cursor-pointer" title="نسخ"><Copy className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setGranted(null)} className="w-full py-2 rounded-xl bg-primary text-white text-sm font-bold cursor-pointer">تم</button>
          </div>
        </div>
      )}

      {/* نافذة سبب الرفض */}
      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRejecting(null)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm">سبب رفض الطلب — {rejecting.full_name}</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="اكتب السبب الرسمي…"
              className="w-full p-2.5 border border-border rounded-lg text-xs bg-card focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="flex gap-2">
              <button onClick={reject} disabled={!reason.trim()} className="flex-1 py-2 rounded-xl bg-error text-white text-xs font-bold cursor-pointer disabled:opacity-50">تأكيد الرفض</button>
              <button onClick={() => setRejecting(null)} className="px-4 py-2 rounded-xl border border-border text-xs cursor-pointer">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== 2) المستخدمون والصلاحيات ==================== */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/sector-users?page=${page}&limit=${LIMIT}&includeDeleted=true`);
      const j = await r.json();
      const data = Array.isArray(j.data?.data) ? j.data.data : Array.isArray(j.data) ? j.data : [];
      setUsers(data);
      if (j.data?.total !== undefined) {
        setTotalItems(j.data.total);
        setTotalPages(Math.max(1, Math.ceil(j.data.total / LIMIT)));
      }
    } catch { toast.error('تعذر تحميل المستخدمين'); } finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, []);

  const changeRole = async (u: any, role: string) => {
    try {
      const res = await fetch(`/api/sector-users/${u.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
      });
      if (res.ok) { toast.success(`تم تحديث صلاحية ${u.name}`); logAudit({ action: 'update', details: { user_id: u.id, role } }); load(); }
      else toast.error('فشل تحديث الصلاحية');
    } catch { toast.error('خطأ في الاتصال'); }
  };
  const toggle = async (u: any) => {
    try {
      const res = await fetch(`/api/sector-users/${u.id}/toggle-status`, { method: 'POST' });
      if (res.ok) { toast.success(u.is_active ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب'); load(); }
      else toast.error('فشلت العملية');
    } catch { toast.error('خطأ في الاتصال'); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">إجمالي: {totalItems} مستخدم</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-card border border-border hover:bg-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            السابق
          </button>
          <span className="text-xs font-bold">صفحة {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-card border border-border hover:bg-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            التالي
          </button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/60"><tr className="text-right text-xs text-muted-foreground">
            <th className="px-4 py-3">المستخدم</th><th className="px-4 py-3">النوع</th>
            <th className="px-4 py-3">الصلاحية</th><th className="px-4 py-3">آخر دخول</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">إجراء</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-accent ${!u.is_active ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3"><p className="font-bold text-xs">{u.name}</p><p className="text-[10px] text-muted-foreground" dir="ltr">{u.email}</p></td>
                <td className="px-4 py-3 text-xs">{u.user_type === 'ministry' ? 'وزارة' : 'جهة'}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                    className="text-xs p-1.5 border border-border rounded-lg bg-card cursor-pointer" aria-label={`صلاحية ${u.name}`}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtTime(u.last_login)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-success/15 text-success-dark' : 'bg-error/15 text-error-dark'}`}>{u.is_active ? 'نشط' : 'موقوف'}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(u)} className="p-1.5 rounded-lg hover:bg-accent cursor-pointer" title={u.is_active ? 'إيقاف' : 'تفعيل'}>
                    {u.is_active ? <Ban className="w-4 h-4 text-error" /> : <CheckCircle2 className="w-4 h-4 text-success" />}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">لا نتائج</td></tr>}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(1)} disabled={page <= 1}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:bg-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {'<<'}
          </button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:bg-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {'<'}
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const pageNum = start + i;
            if (pageNum > totalPages) return null;
            return (
              <button key={pageNum} onClick={() => setPage(pageNum)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${pageNum === page ? 'bg-primary text-white' : 'bg-card border border-border hover:bg-accent'}`}>
                {pageNum}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:bg-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {'>'}
          </button>
          <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:bg-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {'>>'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ==================== 3) الجلسات النشطة الآن ==================== */
function ActiveSessionsTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setSessions(await fetchList('/api/admin/sessions/active')); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">يُحدَّث تلقائياً كل 30 ثانية • «نشط الآن» يعني نشاطاً خلال آخر 5 دقائق</p>
      {loading ? <p className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</p> : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">لا توجد جلسات مفتوحة حالياً.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">{s.name}</p>
                <span className={`flex items-center gap-1 text-[10px] font-bold ${s.online_now ? 'text-success' : 'text-muted-foreground'}`}>
                  <span className={`w-2 h-2 rounded-full ${s.online_now ? 'bg-success animate-pulse' : 'bg-gray-400'}`} />
                  {s.online_now ? 'نشط الآن' : 'غائب مؤقتاً'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[s.role] || s.role} • {s.user_type === 'ministry' ? 'وزارة' : 'جهة'}</p>
              <dl className="text-[11px] space-y-1 text-muted-foreground">
                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> دخل: {fmtTime(s.login_at)}</div>
                <div className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> مدة الجلسة حتى الآن: <b>{fmtDuration(s.duration_seconds)}</b></div>
                {s.ip_address && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> <span dir="ltr">{s.ip_address}</span></div>}
                {s.user_agent && <div className="flex items-center gap-1.5 truncate"><MonitorSmartphone className="w-3 h-3 shrink-0" /><span className="truncate" dir="ltr">{s.user_agent.slice(0, 40)}</span></div>}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== 4) سجل الجلسات وتتبع الأثر ==================== */
function HistoryTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    fetchList('/api/sector-users').then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setSessions([]); setSummary(null); return; }
    fetch(`/api/admin/users/${selected}/sessions?limit=25`).then(r => r.json()).then(j => {
      setSessions(j.data?.data || []); setSummary(j.data?.summary || null);
    }).catch(() => {});
    fetchList(`/api/audit-log?actor_id=${selected}&limit=15`).then(setAudit).catch(() => setAudit([]));
  }, [selected]);

  return (
    <div className="space-y-4">
      <select value={selected} onChange={e => setSelected(e.target.value)}
        className="max-w-xs w-full p-2 border border-border rounded-xl text-sm bg-card cursor-pointer" aria-label="اختيار مستخدم">
        <option value="">— اختر مستخدم لعرض جلسته وأثره —</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
      </select>

      {selected && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">إجمالي وقت العمل المسجل</p><p className="text-xl font-black text-primary">{fmtDuration(summary.total_seconds)}</p></div>
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">عدد الجلسات المغلقة</p><p className="text-xl font-black">{summary.sessions_count}</p></div>
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">آخر ظهور</p><p className="text-sm font-bold pt-1">{sessions[0] ? fmtTime(sessions[0].login_at) : '—'}</p></div>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="bg-muted/60 text-muted-foreground"><tr className="text-right">
              <th className="px-3 py-2">الدخول</th><th className="px-3 py-2">الخروج</th><th className="px-3 py-2">المدة</th><th className="px-3 py-2">العنوان IP</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {sessions.map(s => (
                <tr key={s.id}>
                  <td className="px-3 py-2">{fmtTime(s.login_at)}</td>
                  <td className="px-3 py-2">{s.is_active ? <span className="text-success font-bold">مفتوحة الآن</span> : fmtTime(s.logout_at)}</td>
                  <td className="px-3 py-2 font-bold">{s.is_active ? `${fmtDuration(Math.floor((Date.now() - new Date(s.login_at).getTime()) / 1000))}+` : fmtDuration(s.duration_seconds)}</td>
                  <td className="px-3 py-2" dir="ltr">{s.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {audit.length > 0 && (
        <div>
          <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> سجل الحركة الأخير</h4>
          <div className="space-y-1.5">
            {audit.map(a => (
              <div key={a.id || a.sequence} className="bg-card border border-border rounded-lg px-3 py-2 text-[11px] flex items-center justify-between gap-2">
                <span className="font-bold text-primary">{ ({INSERT:"إضافة", UPDATE:"تعديل", DELETE:"حذف", LOGIN:"تسجيل دخول", LOGOUT:"تسجيل خروج"} as Record<string,string>)[a.action] || String(a.action||"").replace(/_/g," ") }</span>
                <span className="text-muted-foreground truncate">{a.table_name ? "في سجل " + a.table_name.replace(/_/g," ") : ""} {a.notes || ""}</span>
                <span className="text-muted-foreground shrink-0">{fmtTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== 5) محاولات الدخول ==================== */
function AttemptsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onlyFailed, setOnlyFailed] = useState(true);
  const [emailQ, setEmailQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '50' });
      if (onlyFailed) p.set('success', 'false');
      if (emailQ.trim()) p.set('email', emailQ.trim());
      const r = await fetch(`/api/admin/login-attempts?${p}`);
      const j = await r.json();
      setRows(Array.isArray(j.data?.data) ? j.data.data : Array.isArray(j.data) ? j.data : []);
      setStats(j.data?.stats || null);
    } catch { toast.error('تعذر تحميل المحاولات'); } finally { setLoading(false); }
  }, [onlyFailed, emailQ]);

  useEffect(() => { load(); }, [load]);

  const REASON_AR: Record<string, string> = {
    ok: 'دخول ناجح', bad_password: 'كلمة مرور خاطئة', unknown_user: 'بريد غير مسجل', account_disabled: 'حساب موقوف',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOnlyFailed(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${onlyFailed ? 'bg-error text-white' : 'bg-card border border-border'}`}>
          {onlyFailed ? 'الفاشلة فقط' : 'كل المحاولات'}
        </button>
        <input value={emailQ} onChange={e => setEmailQ(e.target.value)} placeholder="فلترة بالبريد…" dir="ltr"
          className="p-2 border border-border rounded-lg text-xs bg-card focus:ring-2 focus:ring-blue-500 outline-none" />
        <button onClick={load} className="p-2 rounded-lg bg-card border border-border hover:bg-accent cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
        {stats && (
          <div className="mr-auto flex gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-bold">فاشلة 24س: {stats.failed_24h}</span>
            <span className="px-3 py-1.5 rounded-lg bg-success/10 text-success-dark text-xs font-bold">ناجحة 24س: {stats.ok_24h}</span>
          </div>
        )}
      </div>
      {loading ? <p className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">لا محاولات مطابقة.</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-muted/60 text-muted-foreground"><tr className="text-right">
              <th className="px-3 py-2">البريد المُجرَّب</th><th className="px-3 py-2">النتيجة</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">الوقت</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map(a => (
                <tr key={a.id}>
                  <td className="px-3 py-2 font-mono" dir="ltr">{a.email_attempted}{a.resolved_user_name && <span className="block font-sans text-[10px] text-muted-foreground">{a.resolved_user_name}</span>}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full font-bold ${a.success ? 'bg-success/15 text-success-dark' : 'bg-error/15 text-error-dark'}`}>{REASON_AR[a.reason] || a.reason}</span></td>
                  <td className="px-3 py-2" dir="ltr">{a.ip_address || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtTime(a.attempted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AccountAdministration;
