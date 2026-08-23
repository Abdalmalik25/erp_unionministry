import { useState, useEffect, useCallback } from 'react';
import { FileSearch, Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  view: 'عرض', create: 'إضافة', update: 'تعديل', delete: 'حذف', export: 'تصدير', import: 'استيراد', print: 'طباعة',
};

const RESOURCE_LABELS: Record<string, string> = {
  member: 'الأعضاء', members: 'الأعضاء', service_request: 'طلبات الخدمة', service_requests: 'طلبات الخدمة',
  compliance_alert: 'تنبيهات الامتثال', fee_payment: 'المدفوعات', worker_profile: 'ملفات العمال',
  dispatch: 'الرساليات', reduction_request: 'طلبات التخفيض', activity: 'الأنشطة', violation: 'المخالفات',
  election: 'الانتخابات', document: 'الوثائق', entity: 'النقابات والمنظمات', profession: 'المهن', report: 'التقارير',
  commercial_establishment: 'المنشآت التجارية', license: 'التراخيص', inspection: 'الجولات التفتيشية',
};

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterAction) params.set('action', filterAction);
      if (filterResource) params.set('resource', filterResource);
      const r = await fetch(`/api/audit-log?${params.toString()}`);
      if (r.ok) {
        const data = await r.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch { toast.error('خطأ في تحميل سجل التدقيق'); }
    finally { setLoading(false); }
  }, [page, filterAction, filterResource]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const stats = {
    total,
    create: logs.filter(l => l.action === 'create').length,
    update: logs.filter(l => l.action === 'update').length,
    delete: logs.filter(l => l.action === 'delete').length,
    view: logs.filter(l => l.action === 'view').length,
  };

  const handleExport = () => {
    const headers = ['التاريخ', 'المستخدم', 'العملية', 'الموارد', 'معرف السجل', 'IP'];
    const rows = logs.map(l => [l.created_at, l.user_id || 'النظام', ACTION_LABELS[l.action] || l.action, RESOURCE_LABELS[l.resource] || l.resource, l.resource_id || '-', l.ip_address || '-']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `سجل_التدقيق_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('تم التصدير بنجاح');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-success/15 text-success-dark';
      case 'update': return 'bg-info/15 text-info-dark';
      case 'delete': return 'bg-error/15 text-error';
      case 'view': return 'bg-muted text-heading';
      case 'export': return 'bg-gold/15 text-gold-dark';
      case 'print': return 'bg-primary/15 text-primary-dark';
      default: return 'bg-muted text-heading';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="سجل التدقيق" subtitle="سجل شامل لجميع العمليات المنفذة في النظام (قراءة فقط)"
        actions={<>
          <button onClick={handleExport} className="flex items-center gap-2 bg-success text-white px-4 py-2 rounded-lg hover:bg-success-dark transition-colors text-sm font-semibold"><Download size={18} />تصدير</button>
          <button onClick={fetchLogs} className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-muted text-sm font-semibold"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />تحديث</button>
        </>} />

      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
        <FileSearch className="text-warning flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-warning-dark">تنويه أمني</p>
          <p className="text-sm text-warning-dark mt-1">لا يمكن حذف أو تعديل أي سجل في سجل التدقيق. جميع البيانات محفوظة بشكل دائم للمراجعة والتدقيق.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[{ l: 'إجمالي السجلات', v: stats.total, c: 'text-heading' }, { l: 'إضافة', v: stats.create, c: 'text-success-dark' },
          { l: 'تعديل', v: stats.update, c: 'text-primary-bright' }, { l: 'حذف', v: stats.delete, c: 'text-error' },
          { l: 'عرض', v: stats.view, c: 'text-muted-foreground' }
        ].map(s => (
          <div key={s.l} className="bg-card rounded-lg shadow-sm p-4 border border-border">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">نوع العملية</label>
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              <option value="">الكل</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">الموارد</label>
            <select value={filterResource} onChange={e => { setFilterResource(e.target.value); setPage(1); }} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              <option value="">الكل</option>
              {[...new Set(logs.map(l => l.resource))].map(r => <option key={r} value={r}>{RESOURCE_LABELS[r] || r}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilterAction(''); setFilterResource(''); setPage(1); }} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">مسح الفلاتر</button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-muted-foreground">جاري التحميل...</p></div>
        ) : logs.length === 0 ? (
          <EmptyState title="لا توجد سجلات" description="لم يتم تسجيل أي عمليات بعد" icon={<FileSearch className="w-14 h-14" />} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">التوقيت</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">المستخدم</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">العملية</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">الموارد</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">معرف السجل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">التفاصيل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString('ar-YE') : '-'}</td>
                      <td className="px-4 py-3 text-xs text-heading font-semibold">{log.user_id || 'النظام'}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>{ACTION_LABELS[log.action] || log.action}</span></td>
                      <td className="px-4 py-3 text-xs text-heading font-semibold">{RESOURCE_LABELS[log.resource] || log.resource}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.resource_id || '-'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.details ? <code className="bg-muted px-2 py-1 rounded text-[10px] max-w-[200px] truncate block">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</code> : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">عرض {logs.length} من {total} سجل</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-border rounded-lg hover:bg-accent text-sm disabled:opacity-50">السابق</button>
                <span className="px-3 py-1 bg-primary text-white rounded-lg text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 border border-border rounded-lg hover:bg-accent text-sm disabled:opacity-50">التالي</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
