/* eslint-disable react-hooks/exhaustive-deps */
/**
 * NotificationsManagement — إدارة الإشعارات
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, Filter, Trash2, CheckCircle,
  X, ChevronRight, ChevronLeft, Bell, BellOff, Info,
  AlertTriangle, CheckCircle2, XCircle, Eye, Download,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useApi } from '../../hooks/useApi';

// ============================================================
// الأنواع
// ============================================================

type NotificationType = 'info' | 'warning' | 'success' | 'error';

interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  priority: 'عالي' | 'متوسط' | 'منخفض';
  link?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// الثوابت
// ============================================================

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  info:    { label: 'معلومات', icon: Info,          color: 'text-info',    bg: 'bg-info/10' },
  warning: { label: 'تحذير',  icon: AlertTriangle,  color: 'text-warning-dark', bg: 'bg-warning/10' },
  success: { label: 'نجاح',   icon: CheckCircle2,   color: 'text-success', bg: 'bg-success/10' },
  error:   { label: 'خطأ',    icon: XCircle,         color: 'text-error',   bg: 'bg-error/10' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  'عالي':    { label: 'عالي',    color: 'bg-error/10 text-error border-error/20' },
  'متوسط':  { label: 'متوسط',  color: 'bg-warning/10 text-warning-dark border-warning/20' },
  'منخفض': { label: 'منخفض', color: 'bg-muted text-muted-foreground border-border' },
};

const PAGE_SIZE = 10;

// ============================================================
// النموذج
// ============================================================

interface FormValues {
  recipient_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: string;
  link: string;
}

function buildEmptyForm(): FormValues {
  return {
    recipient_id: '',
    title: '',
    message: '',
    notification_type: 'info',
    priority: 'متوسط',
    link: '',
  };
}

// ============================================================
// المكوّن الرئيسي
// ============================================================

export default function NotificationsManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [formValues, setFormValues] = useState<FormValues>(buildEmptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();
  const api = useApi();

  // تحميل البيانات
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.execute('/notifications');
        if (result?.notifications) {
          setNotifications(result.notifications);
        }
      } catch {
        toast.error('حدث خطأ أثناء تحميل الإشعارات');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [api]);

  // التصفية
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const q = searchQuery.trim();
      const matchSearch = !q || n.title.includes(q) || n.message.includes(q);
      const matchType = typeFilter === 'all' || n.notification_type === typeFilter;
      const matchRead = readFilter === 'all' || (readFilter === 'read' && n.is_read) || (readFilter === 'unread' && !n.is_read);
      return matchSearch && matchType && matchRead;
    });
  }, [notifications, searchQuery, typeFilter, readFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    info: notifications.filter(n => n.notification_type === 'info').length,
    warning: notifications.filter(n => n.notification_type === 'warning').length,
    error: notifications.filter(n => n.notification_type === 'error').length,
  }), [notifications]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  function validate(): boolean {
    const errs: Partial<Record<keyof FormValues, string>> = {};
    if (!formValues.recipient_id.trim()) errs.recipient_id = 'معرف المستقبل مطلوب';
    if (!formValues.title.trim()) errs.title = 'العنوان مطلوب';
    if (!formValues.message.trim()) errs.message = 'الرسالة مطلوبة';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const openAdd = useCallback(() => {
    setFormValues(buildEmptyForm());
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    try {
      const result = await api.execute('/notifications', {
        method: 'POST',
        body: formValues as unknown as Record<string, unknown>,
      });
      if (result?.notification) {
        setNotifications(prev => [result.notification, ...prev]);
      }
      logAudit({ action: 'create', resource: 'notification', resourceId: result?.notification?.id ?? '', details: formValues.title });
      toast.success('تم إرسال الإشعار بنجاح');
      setShowModal(false);
    } catch {
      toast.error('حدث خطأ أثناء إرسال الإشعار');
    }
  }, [formValues, api, validate]);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (notification.is_read) return;
    try {
      await api.execute(`/notifications/${notification.id}`, {
        method: 'PUT',
        body: { is_read: true },
      });
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      logAudit({ action: 'update', resource: 'notification', resourceId: notification.id, details: 'marked as read' });
    } catch {
      toast.error('حدث خطأ أثناء تحديث الإشعار');
    }
  }, [api]);

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) {
      toast.info('لا توجد إشعارات غير مقروءة');
      return;
    }
    try {
      await Promise.all(
        unread.map(n => api.execute(`/notifications/${n.id}`, { method: 'PUT', body: { is_read: true } }))
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success(`تم تحديد ${unread.length} إشعار كمقروء`);
    } catch {
      toast.error('حدث خطأ أثناء تحديث الإشعارات');
    }
  }, [notifications, api]);

  const handleDelete = useCallback(async (notification: Notification) => {
    const ok = await confirm({
      title: 'حذف الإشعار',
      message: `هل أنت متأكد من حذف إشعار "${notification.title}"؟`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.execute(`/notifications/${notification.id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      logAudit({ action: 'delete', resource: 'notification', resourceId: notification.id, details: notification.title });
      toast.success('تم حذف الإشعار بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء حذف الإشعار');
    }
  }, [confirm, api]);

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة الإشعارات"
        subtitle="إدارة إشعارات النظام والتنبيهات للمستخدمين"
        breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'الإشعارات' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { exportReportToExcel({ title: 'الإشعارات', reportType: 'statistics', data: notifications, columns: [{ key: 'title', label: 'العنوان' }, { key: 'notification_type', label: 'النوع' }, { key: 'is_read', label: 'الحالة' }, { key: 'created_at', label: 'التاريخ' }] }); logAudit({ action: 'export', resource: 'notifications', details: { count: notifications.length } }); toast.success('تم التصدير'); }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <Download className="w-4 h-4" />تصدير
            </button>
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              تحديد الكل كمقروء
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              إشعار جديد
            </button>
          </div>
        }
      />

      {loading && (
        <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">جاري تحميل الإشعارات...</p>
        </div>
      )}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'إجمالي الإشعارات', value: stats.total, color: 'text-primary bg-primary/10' },
          { label: 'غير مقروءة', value: stats.unread, color: 'text-warning bg-warning/10' },
          { label: 'معلومات', value: stats.info, color: 'text-info bg-info/10' },
          { label: 'تحذيرات', value: stats.warning, color: 'text-warning-dark bg-warning/10' },
          { label: 'أخطاء', value: stats.error, color: 'text-error bg-error/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold text-heading">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث في العنوان أو المحتوى..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={readFilter}
              onChange={e => { setReadFilter(e.target.value as 'all' | 'read' | 'unread'); setCurrentPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
            >
              <option value="all">جميع الحالات</option>
              <option value="unread">غير مقروء</option>
              <option value="read">مقروء</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
            >
              <option value="all">جميع الأنواع</option>
              <option value="info">معلومات</option>
              <option value="warning">تحذير</option>
              <option value="success">نجاح</option>
              <option value="error">خطأ</option>
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      {!loading && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">العنوان</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الرسالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النوع</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الأولوية</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">التاريخ</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">لا توجد إشعارات</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((notification, idx) => {
                    const typeCfg = TYPE_CONFIG[notification.notification_type];
                    const Icon = typeCfg.icon;
                    return (
                      <tr key={notification.id} className={`hover:bg-accent/50 transition-colors border-b border-border ${!notification.is_read ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                            <span className={`font-medium text-heading text-xs ${!notification.is_read ? 'font-bold' : ''}`}>
                              {notification.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs max-w-[200px]">
                          <span className="line-clamp-2">{notification.message}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${typeCfg.color} ${typeCfg.bg}`}>
                            <Icon className="w-3 h-3" />
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${PRIORITY_CONFIG[notification.priority]?.color ?? 'bg-muted text-muted-foreground border-border'}`}>
                            {notification.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {notification.is_read ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <BellOff className="w-3 h-3" />
                              مقروء
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                              <Bell className="w-3 h-3" />
                              جديد
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                          {new Date(notification.created_at).toLocaleDateString('ar-YE')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(notification)}
                                className="p-1.5 text-info hover:bg-info/10 rounded-lg transition-colors"
                                title="تحديد كمقروء"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification)}
                              className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* الترقيم */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} إشعار
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-primary text-white' : 'hover:bg-accent text-muted-foreground'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* نافذة إضافة إشعار */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-bold text-heading">إرسال إشعار جديد</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  معرف المستقبل <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="recipient_id"
                  value={formValues.recipient_id}
                  onChange={handleFormChange}
                  placeholder="مثال: user-123"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.recipient_id ? 'border-error' : 'border-border'}`}
                />
                {formErrors.recipient_id && <p className="text-error text-xs mt-1">{formErrors.recipient_id}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  العنوان <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleFormChange}
                  placeholder="عنوان الإشعار"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.title ? 'border-error' : 'border-border'}`}
                />
                {formErrors.title && <p className="text-error text-xs mt-1">{formErrors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  الرسالة <span className="text-error">*</span>
                </label>
                <textarea
                  name="message"
                  value={formValues.message}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="محتوى الإشعار..."
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none ${formErrors.message ? 'border-error' : 'border-border'}`}
                />
                {formErrors.message && <p className="text-error text-xs mt-1">{formErrors.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">نوع الإشعار</label>
                  <select
                    name="notification_type"
                    value={formValues.notification_type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
                  >
                    <option value="info">معلومات</option>
                    <option value="warning">تحذير</option>
                    <option value="success">نجاح</option>
                    <option value="error">خطأ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الأولوية</label>
                  <select
                    name="priority"
                    value={formValues.priority}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
                  >
                    <option value="عالي">عالي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="منخفض">منخفض</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">رابط مرفق (اختياري)</label>
                <input
                  type="url"
                  name="link"
                  value={formValues.link}
                  onChange={handleFormChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                إرسال الإشعار
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
