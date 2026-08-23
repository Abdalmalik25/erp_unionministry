import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Building2, Users, AlertTriangle, FileText, Briefcase, ShieldCheck, ShieldAlert, ChevronLeft, Calendar, MapPin, Phone, Mail, Globe, Hash, Eye, Link2, ClipboardCheck, FileSearch, BarChart3, } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
interface EntityOverview {
    entity: Record<string, any>;
    stats: {
        members: {
            total: number;
            active: number;
        };
        violations: {
            total: number;
            open: number;
        };
        inspections: {
            total: number;
            completed: number;
        };
        occupations: {
            total: number;
        };
        relationships: {
            total: number;
        };
        activities: {
            total: number;
        };
        documents: {
            total: number;
        };
        licenses: {
            total: number;
            valid: number;
        };
        dispatches: {
            total: number;
            active: number;
        };
        riskAssessments: {
            total: number;
        };
        complianceAlerts: {
            total: number;
            unresolved: number;
        };
    };
}
function StatCard({ icon: Icon, label, value, sub, color, link }: {
    icon: React.ElementType;
    label: string;
    value: number;
    sub?: string;
    color: string;
    link?: string;
}) {
    const card = (<div className={`bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-all group ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="text-xl font-black text-heading">{value.toLocaleString('ar-YE')}</p>
        </div>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {link && <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">عرض التفاصيل ←</p>}
    </div>);
    return link ? <Link to={link}>{card}</Link> : card;
}
function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
}) {
    if (!value)
        return null;
    return (<div className="flex items-center gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-xs font-semibold text-heading">{value}</span>
    </div>);
}
export default function EntityDetailPage() {
    const { id } = useParams<{
        id: string;
    }>();
    const [data, setData] = useState<EntityOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'violations' | 'inspections' | 'documents'>('overview');
    useEffect(() => {
        if (!id)
            return;
        setIsLoading(true);
        fetch(`/api/entities/${id}/overview`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setData)
            .catch(() => toast.error('تعذر تحميل بيانات النقابة أو منظمة'))
            .finally(() => setIsLoading(false));
    }, [id]);
    if (isLoading)
        return (<div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
    </div>);
    if (!data)
        return (<div className="text-center py-12">
      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3"/>
      <p className="text-muted-foreground">الجهة غير موجودة أو تم نقلها</p>
      <Link to="/ministry/unions" className="text-primary text-sm mt-2 inline-block hover:underline">العودة لسجل النقابات والمنشآت</Link>
    </div>);
    const { entity, stats } = data;
    const complianceRate = stats.members.active > 0
        ? Math.round(((stats.members.active / Math.max(stats.members.total, 1)) * 100))
        : 0;
    const tabs = [
        { id: 'overview' as const, label: 'نظرة عامة', icon: Eye },
        { id: 'members' as const, label: `الأعضاء (${stats.members.total})`, icon: Users },
        { id: 'violations' as const, label: `المخالفات (${stats.violations.total})`, icon: AlertTriangle },
        { id: 'inspections' as const, label: `التفتيش (${stats.inspections.total})`, icon: ClipboardCheck },
        { id: 'documents' as const, label: `الوثائق (${stats.documents.total})`, icon: FileText },
    ];
    return (<div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/ministry/unions" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground"/>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary"/>
            <h1 className="text-lg font-bold text-heading">{entity.name_ar}</h1>
            <StatusBadge status={entity.status}/>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{entity.entity_type} · {entity.governorate} · {entity.unified_code}</p>
        </div>
        <button onClick={() => exportReportToExcel({
            title: `بطاقة كيان - ${entity.name_ar}`,
            reportType: 'entity_detail',
            data: [entity],
            columns: [
                { key: 'name_ar', label: 'الاسم' },
                { key: 'entity_type', label: 'النوع' },
                { key: 'status', label: 'الحالة' },
                { key: 'governorate', label: 'المحافظة' },
                { key: 'unified_code', label: 'الكود الموحد' },
            ],
        })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors">
          <FileSearch className="w-3.5 h-3.5"/> تصدير البطاقة
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => {
            const Icon = tab.icon;
            return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-card text-heading shadow-sm' : 'text-muted-foreground hover:text-heading'}`}>
              <Icon className="w-3.5 h-3.5"/>{tab.label}
            </button>);
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (<>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="الأعضاء" value={stats.members.total} sub={`${stats.members.active} نشط`} color="bg-primary" link="/ministry/members"/>
            <StatCard icon={AlertTriangle} label="المخالفات" value={stats.violations.total} sub={`${stats.violations.open} مفتوحة`} color={stats.violations.open > 0 ? 'bg-error' : 'bg-success'} link="/ministry/violations"/>
            <StatCard icon={ClipboardCheck} label="التفتيشات" value={stats.inspections.total} sub={`${stats.inspections.completed} مكتملة`} color="bg-teal" link="/ministry/inspections"/>
            <StatCard icon={ShieldCheck} label="رخص صالحة" value={stats.licenses.valid} sub={`من ${stats.licenses.total}`} color="bg-success" link="/ministry/licenses"/>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Link2} label="العلاقات" value={stats.relationships.total} color="bg-primary" link="/ministry/entity-relationships"/>
            <StatCard icon={Briefcase} label="الرساليات" value={stats.dispatches.total} sub={`${stats.dispatches.active} نشطة`} color="bg-gold" link="/ministry/dispatches"/>
            <StatCard icon={ShieldAlert} label="تقييمات المخاطر" value={stats.riskAssessments.total} color="bg-warning" link="/ministry/risk-assessments"/>
            <StatCard icon={BarChart3} label="تنبيهات الامتثال" value={stats.complianceAlerts.total} sub={`${stats.complianceAlerts.unresolved} غير محلول`} color={stats.complianceAlerts.unresolved > 0 ? 'bg-error' : 'bg-success'} link="/ministry/compliance-alerts"/>
          </div>

          {/* Entity Info + Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="font-bold text-heading text-sm mb-3">معلومات النقابة أو منظمة</h3>
              <div className="space-y-1">
                <InfoRow icon={Building2} label="الاسم" value={entity.name_ar}/>
                <InfoRow icon={Globe} label="الاسم الإنجليزي" value={entity.name_en}/>
                <InfoRow icon={Hash} label="الكود الموحد" value={entity.unified_code}/>
                <InfoRow icon={MapPin} label="المحافظة" value={entity.governorate}/>
                <InfoRow icon={MapPin} label="المدينة" value={entity.city}/>
                <InfoRow icon={MapPin} label="العنوان" value={entity.address}/>
                <InfoRow icon={Phone} label="الهاتف" value={entity.phone}/>
                <InfoRow icon={Mail} label="البريد الإلكتروني" value={entity.email}/>
                <InfoRow icon={Calendar} label="تاريخ التسجيل" value={entity.registration_date}/>
                <InfoRow icon={Calendar} label="تاريخ الانتهاء" value={entity.expiry_date}/>
                <InfoRow icon={Users} label="عدد الأعضاء" value={String(entity.member_count || 0)}/>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="font-bold text-heading text-sm mb-3">مؤشر الامتثال</h3>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-border)" strokeWidth="10"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke={complianceRate >= 80 ? '#22c55e' : complianceRate >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="10" strokeDasharray={`${complianceRate * 3.14} 314`} strokeLinecap="round"/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-heading">{complianceRate}%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-success/5 rounded-lg p-2">
                  <p className="text-lg font-bold text-success">{stats.members.active}</p>
                  <p className="text-xs text-muted-foreground">عضو نشط</p>
                </div>
                <div className="bg-error/5 rounded-lg p-2">
                  <p className="text-lg font-bold text-error">{stats.violations.open}</p>
                  <p className="text-xs text-muted-foreground">مخالفة مفتوحة</p>
                </div>
                <div className="bg-warning/5 rounded-lg p-2">
                  <p className="text-lg font-bold text-warning">{stats.complianceAlerts.unresolved}</p>
                  <p className="text-xs text-muted-foreground">تنبيه غير محلول</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-2">
                  <p className="text-lg font-bold text-primary">{stats.licenses.valid}</p>
                  <p className="text-xs text-muted-foreground">رخصة صالحة</p>
                </div>
              </div>
            </div>
          </div>
        </>)}

      {activeTab === 'members' && (<EntityMembersTab entityId={id!}/>)}
      {activeTab === 'violations' && (<EntityViolationsTab entityId={id!}/>)}
      {activeTab === 'inspections' && (<EntityInspectionsTab entityId={id!}/>)}
      {activeTab === 'documents' && (<EntityDocumentsTab entityId={id!}/>)}
    </div>);
}
function EntityMembersTab({ entityId }: {
    entityId: string;
}) {
    const [members, setMembers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    useEffect(() => {
        fetch(`/api/entities/${entityId}/members?limit=50`)
            .then(r => r.json())
            .then(d => { setMembers(d.data || []); setTotal(d.total || 0); })
            .catch(() => { });
    }, [entityId]);
    return (<div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-heading text-sm">أعضاء النقابة أو منظمة ({total})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-right p-3 font-semibold text-muted-foreground">الاسم</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">الرقم القومي</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">التخصص</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">الحالة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">تاريخ الانضمام</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map(m => (<tr key={m.id} className="hover:bg-muted/50">
                <td className="p-3 font-semibold text-heading">{m.full_name}</td>
                <td className="p-3 text-muted-foreground">{m.national_id}</td>
                <td className="p-3 text-muted-foreground">{m.specialization || '—'}</td>
                <td className="p-3"><StatusBadge status={m.status}/></td>
                <td className="p-3 text-muted-foreground">{m.join_date ? new Date(m.join_date).toLocaleDateString('ar-YE') : '—'}</td>
              </tr>))}
            {members.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد أعضاء مسجلين</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
function EntityViolationsTab({ entityId }: {
    entityId: string;
}) {
    const [violations, setViolations] = useState<any[]>([]);
    useEffect(() => {
        fetch(`/api/violations?entity_id=${entityId}&limit=50`)
            .then(r => r.json())
            .then(d => setViolations(d.data || []))
            .catch(() => { });
    }, [entityId]);
    return (<div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-heading text-sm">المخالفات ({violations.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-right p-3 font-semibold text-muted-foreground">رقم المخالفة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">النوع</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">الخطورة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">الحالة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {violations.map(v => (<tr key={v.id} className="hover:bg-muted/50">
                <td className="p-3 font-semibold text-heading">{v.violation_number || v.id}</td>
                <td className="p-3 text-muted-foreground">{v.violation_type || '—'}</td>
                <td className="p-3"><StatusBadge status={v.severity}/></td>
                <td className="p-3"><StatusBadge status={v.status}/></td>
                <td className="p-3 text-muted-foreground">{v.violation_date ? new Date(v.violation_date).toLocaleDateString('ar-YE') : '—'}</td>
              </tr>))}
            {violations.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد مخالفات مسجلة</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
function EntityInspectionsTab({ entityId }: {
    entityId: string;
}) {
    const [inspections, setInspections] = useState<any[]>([]);
    useEffect(() => {
        fetch(`/api/inspections?enterprise_id=${entityId}&limit=50`)
            .then(r => r.json())
            .then(d => setInspections(d.data || []))
            .catch(() => { });
    }, [entityId]);
    return (<div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-heading text-sm">التفتيشات ({inspections.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-right p-3 font-semibold text-muted-foreground">رقم التفتيش</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">النوع</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">التاريخ</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">النتيجة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inspections.map(i => (<tr key={i.id} className="hover:bg-muted/50">
                <td className="p-3 font-semibold text-heading">{i.inspection_number || i.id}</td>
                <td className="p-3 text-muted-foreground">{i.inspection_type || '—'}</td>
                <td className="p-3 text-muted-foreground">{i.inspection_date ? new Date(i.inspection_date).toLocaleDateString('ar-YE') : '—'}</td>
                <td className="p-3 text-muted-foreground">{i.result || '—'}</td>
                <td className="p-3"><StatusBadge status={i.status}/></td>
              </tr>))}
            {inspections.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد تفتيشات مسجلة</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
function EntityDocumentsTab({ entityId }: {
    entityId: string;
}) {
    const [documents, setDocuments] = useState<any[]>([]);
    useEffect(() => {
        fetch(`/api/documents?entity_id=${entityId}&limit=50`)
            .then(r => r.json())
            .then(d => setDocuments(d.data || []))
            .catch(() => { });
    }, [entityId]);
    return (<div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-heading text-sm">الوثائق ({documents.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-right p-3 font-semibold text-muted-foreground">اسم الوثيقة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">النوع</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">الحالة</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map(d => (<tr key={d.id} className="hover:bg-muted/50">
                <td className="p-3 font-semibold text-heading">{d.title || d.document_name}</td>
                <td className="p-3 text-muted-foreground">{d.document_type || '—'}</td>
                <td className="p-3"><StatusBadge status={d.status}/></td>
                <td className="p-3 text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleDateString('ar-YE') : '—'}</td>
              </tr>))}
            {documents.length === 0 && (<tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا توجد وثائق مسجلة</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
