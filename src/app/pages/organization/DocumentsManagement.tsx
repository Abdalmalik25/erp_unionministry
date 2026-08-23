/**
 * Organization Documents Management - إدارة الوثائق
 * CRUD كامل مع تصدير وبروفايل تفصيلي
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Download, Edit, Trash2, Eye, X } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface Document {
  document_id: string;
  document_name: string;
  document_type: string;
  document_number: string;
  description: string;
  file_url: string;
  file_size: string;
  upload_date: string;
  status: string;
  entity_id: string;
  created_by: string;
  approved_by: string;
  approved_date: string;
}

const STATUS_MAP: Record<string, string> = { approved: 'معتمد', pending: 'قيد المراجعة', rejected: 'مرفوض', archived: 'مؤرشف' };
const STATUS_COLORS: Record<string, string> = { approved: 'bg-success/15 text-success-dark', pending: 'bg-warning/15 text-warning-dark', rejected: 'bg-error/15 text-error', archived: 'bg-muted text-heading' };
const TYPE_MAP: Record<string, string> = { decision: 'قرار', report: 'تقرير', certificate: 'شهادة', regulation: 'لائحة', minutes: 'محضر' };

export function OrganizationDocumentsManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Document | null>(null);
  const [formData, setFormData] = useState<Partial<Document>>({});

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/documents');
      if (r.ok) {
        const data = await r.json();
        setDocuments(Array.isArray(data) ? data : data.data || []);
        logAudit({ action: 'view', resource: 'organization_documents' });
      }
    } catch { toast.error('خطأ في تحميل الوثائق'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;
    try {
      const r = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'document', details: { id } }); fetchDocuments(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleSave = async () => {
    if (!formData.document_name?.trim()) { toast.error('اسم الوثيقة مطلوب'); return; }
    try {
      const endpoint = editItem ? `/api/documents/${editItem.document_id}` : '/api/documents';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowAddModal(false); setEditItem(null); fetchDocuments(); }
      else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleOpenEdit = (item: Document) => {
    setEditItem(item);
    setFormData({ document_name: item.document_name, document_type: item.document_type, document_number: item.document_number, description: item.description, status: item.status });
    setShowAddModal(true);
  };

  const handleExport = () => {
    exportReportToExcel({
      title: 'إدارة وثائق المنظمة', reportType: 'statistics', data: filteredDocs,
      columns: [
        { key: 'document_number', label: 'رقم الوثيقة' }, { key: 'document_name', label: 'اسم الوثيقة' },
        { key: 'document_type', label: 'النوع' }, { key: 'upload_date', label: 'تاريخ الرفع' },
        { key: 'status', label: 'الحالة' },
      ],
    });
    toast.success('تم التصدير');
  };

  const filteredDocs = documents.filter(d => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || d.document_name?.toLowerCase().includes(q) || d.document_number?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'الكل' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: documents.length,
    approved: documents.filter(d => d.status === 'approved').length,
    pending: documents.filter(d => d.status === 'pending').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-bright to-primary-dark rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />إدارة الوثائق</h1>
            <p className="text-blue-100 mt-1">الوثائق الرسمية والإدارية — {documents.length} وثيقة</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"><Download size={16} />تصدير</button>
            <button onClick={() => { setEditItem(null); setFormData({}); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-white/90 font-semibold text-sm"><Plus size={18} />رفع وثيقة</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الوثائق', value: stats.total, color: 'text-primary' },
          { label: 'معتمدة', value: stats.approved, color: 'text-success' },
          { label: 'قيد المراجعة', value: stats.pending, color: 'text-warning' },
          { label: 'مرفوضة', value: stats.rejected, color: 'text-error' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالاسم أو رقم الوثيقة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع الحالات</option>
            <option value="approved">معتمد</option><option value="pending">قيد المراجعة</option><option value="rejected">مرفوض</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold">رقم الوثيقة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">اسم الوثيقة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">تاريخ الرفع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-muted-foreground">جاري التحميل...</span></div></td></tr>
              ) : filteredDocs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">لا توجد وثائق</td></tr>
              ) : filteredDocs.map(d => (
                <tr key={d.document_id} className="hover:bg-accent transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-heading">{d.document_number}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading">{d.document_name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{TYPE_MAP[d.document_type] || d.document_type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{d.upload_date || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[d.status] || 'bg-muted text-heading'}`}>{STATUS_MAP[d.status] || d.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedDoc(d)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => handleOpenEdit(d)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(d.document_id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-muted border-t border-border text-sm text-muted-foreground">عرض {filteredDocs.length} من {documents.length} وثيقة</div>
      </div>

      {/* Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{selectedDoc.document_name}</h3>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedDoc.status]}`}>{STATUS_MAP[selectedDoc.status]}</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'رقم الوثيقة', value: selectedDoc.document_number },
                  { label: 'النوع', value: TYPE_MAP[selectedDoc.document_type] || selectedDoc.document_type },
                  { label: 'تاريخ الرفع', value: selectedDoc.upload_date },
                  { label: 'الحجم', value: selectedDoc.file_size },
                  { label: 'أنشأها', value: selectedDoc.created_by },
                  { label: 'اعتمدها', value: selectedDoc.approved_by },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
              {selectedDoc.description && (
                <div><p className="text-sm font-semibold text-heading mb-1">الوصف</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedDoc.description}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل وثيقة' : 'إضافة وثيقة جديدة'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">اسم الوثيقة *</label><input value={formData.document_name || ''} onChange={e => setFormData({ ...formData, document_name: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">رقم الوثيقة</label><input value={formData.document_number || ''} onChange={e => setFormData({ ...formData, document_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">النوع</label><select value={formData.document_type || ''} onChange={e => setFormData({ ...formData, document_type: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="decision">قرار</option><option value="report">تقرير</option><option value="certificate">شهادة</option><option value="regulation">لائحة</option><option value="minutes">محضر</option></select></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">الوصف</label><textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">إلغاء</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark">{editItem ? 'تحديث' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
