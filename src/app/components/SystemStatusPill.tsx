/**
 * SystemStatusPill — مؤشر الجاهزية الحية للأنظمة الخلفية
 * يراقب /api/health ويعرض حالة الاتصال الرسمية في التذييل
 */
import { useEffect, useState } from 'react';
import { Activity, WifiOff } from 'lucide-react';

type Status = 'checking' | 'healthy' | 'unreachable';

const STATUS_STYLES: Record<Status, { dot: string; text: string; label: string; title: string }> = {
  checking: {
    dot: 'bg-slate-400 animate-pulse',
    text: 'text-slate-500 dark:text-slate-400',
    label: 'جاري فحص الأنظمة…',
    title: 'جاري التحقق من جاهزية الأنظمة الخلفية',
  },
  healthy: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'الأنظمة تعمل بكامل الجاهزية',
    title: 'الاتصال بالخادم الوطني سليم — جميع الخدمات متاحة',
  },
  unreachable: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'وضع محدود — العمل دون اتصال',
    title: 'تعذر الوصول للخادم — سيتم مزامنة البيانات تلقائياً عند عودة الاتصال',
  },
};

export function SystemStatusPill() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(t);
        if (!cancelled) setStatus(res.ok ? 'healthy' : 'unreachable');
      } catch {
        if (!cancelled) setStatus('unreachable');
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const s = STATUS_STYLES[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
      title={s.title}
      role="status"
      aria-live="polite"
    >
      {status === 'unreachable'
        ? <WifiOff size={12} className="text-amber-500" />
        : <Activity size={12} className={status === 'healthy' ? 'text-emerald-500' : 'text-slate-400'} />}
      <span className={`relative flex h-1.5 w-1.5`}>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
    </span>
  );
}
