import { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart3, Download, FileText, FileSpreadsheet, Printer, RefreshCw, Shield, TrendingUp, Users, Building2, AlertTriangle, Scale, Briefcase, ClipboardCheck, Award, Globe, Calculator, } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { toast } from 'sonner';
import { logAudit } from '../../utils/security';
import { exportReportToExcel, exportReportToPDF } from '../../components/enterprise/PrintExportManager';
import type { ReportColumn } from '../../components/enterprise/PrintExportManager';
import { DomainAnalyticalPanel } from '../../components/reports/DomainAnalyticalPanel';
import { translateStatus } from '../../components/ui/designSystem';
const COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#D97706', '#0D9488', '#7C3AED', '#DC2626', '#059669'];
const MAP: Record<string, string> = {
    commercial: 'سجل المنشآت والشركات التجارية',
    unions: 'سجل النقابات والاتحادات العمالية',
    disputes: 'المنازعات العمالية والتسويات (م 128)',
    expatriates: 'تراخيص العمالة الوافدة (غير اليمنية)',
    members: 'سجل الكوادر العمالية والنقابية',
    professions: 'استوديو توصيف المهن (ISCO-08)',
    violations: 'محاضر المخالفات والإجراءات',
    inspections: 'محاضر التفتيش والسلامة OSH',
    compliance: 'مصفوفات الامتثال المؤسسي',
    dispatches: 'إرساليات وتوجيه العمالة',
    financial: 'سداد الرسوم والتحصيل المالي',
    alerts: 'تنبيهات الامتثال والإنذارات',
    risk_assessments: 'تقييم المخاطر التنبؤي AI',
    legal_references: 'الموسوعة القانونية وقانون العمل',
    training: 'سجلات التدريب والتأهيل',
    licenses: 'تراخيص مزاولة الأنشطة والمهن',
    evaluations: 'شهادات الكفاءة المهنية',
    documents: 'مستندات النقابات والمنظمات',
};
type ReportType = keyof typeof MAP;
export function ReportsManagement() {
    const [reportType, setReportType] = useState<ReportType>('commercial');
    const [dateFrom, setDateFrom] = useState('2026-01-01');
    const [dateTo, setDateTo] = useState('2026-12-31');
    const [govFilter, setGovFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [commercialEsts, setCommercialEsts] = useState<any[]>([]);
    const [entities, setEntities] = useState<any[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [expatriateLicenses, setExpatriateLicenses] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [professions, setProfessions] = useState<any[]>([]);
    const [violations, setViolations] = useState<any[]>([]);
    const [inspections, setInspections] = useState<any[]>([]);
    const [complianceMatrices, setComplianceMatrices] = useState<any[]>([]);
    const [dispatches, setDispatches] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [riskAssessments, setRiskAssessments] = useState<any[]>([]);
    const [legalRefs, setLegalRefs] = useState<any[]>([]);
    const [trainingRecords, setTrainingRecords] = useState<any[]>([]);
    const [licenses, setLicenses] = useState<any[]>([]);
    const [evalCerts, setEvalCerts] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    // Timed fetch wrapper — prevents hanging requests from blocking the reports page
    const timedFetch = (url: string, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { signal: controller.signal })
            .then(r => { clearTimeout(timer); return r; })
            .catch(e => { clearTimeout(timer); if (e.name === 'AbortError') throw new Error(`Timeout: ${url}`); throw e; });
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                timedFetch('/api/commercial?limit=100'),
                timedFetch('/api/entities?limit=100'),
                timedFetch('/api/labor-disputes?limit=100'),
                timedFetch('/api/expatriate-licenses?limit=100'),
                timedFetch('/api/members?limit=100'),
                timedFetch('/api/professions?limit=100'),
                timedFetch('/api/violations?limit=100'),
                timedFetch('/api/inspections?limit=100'),
                timedFetch('/api/compliance-matrices?limit=100'),
                timedFetch('/api/dispatches?limit=100'),
                timedFetch('/api/fee-payments?limit=100'),
                timedFetch('/api/compliance-alerts?limit=100'),
                timedFetch('/api/risk-assessments?limit=100'),
                timedFetch('/api/legal-references?limit=100'),
                timedFetch('/api/training-records?limit=100'),
                timedFetch('/api/licenses?limit=100'),
                timedFetch('/api/evaluation-certificates?limit=100'),
                timedFetch('/api/documents?limit=200'),
            ]);
            const extract = (d: any) => d?.data || [];
            const legalTransform = (d: any) => [...(d.legal_references || []), ...(d.law_articles || []), ...(d.ilo_conventions || []), ...(d.international_standards || [])];
            const alertsTransform = (d: any) => d.data || d.alerts || [];
            const apply = (r: PromiseSettledResult<Response>, setter: (v: unknown[]) => void, transform?: (d: unknown) => unknown[]) => {
                if (r.status === 'fulfilled' && r.value.ok) {
                    r.value.json().then(d => setter(transform ? transform(d) : (d?.data || [])));
                }
            };
            apply(results[0], setCommercialEsts);
            apply(results[1], setEntities);
            apply(results[2], setDisputes);
            apply(results[3], setExpatriateLicenses);
            apply(results[4], setMembers);
            apply(results[5], setProfessions);
            apply(results[6], setViolations);
            apply(results[7], setInspections);
            apply(results[8], setComplianceMatrices);
            apply(results[9], setDispatches);
            apply(results[10], setPayments);
            apply(results[11], setAlerts, alertsTransform);
            apply(results[12], setRiskAssessments);
            apply(results[13], setLegalRefs, legalTransform);
            apply(results[14], setTrainingRecords);
            apply(results[15], setLicenses);
            apply(results[16], setEvalCerts);
            apply(results[17], setDocuments);
            logAudit({ action: 'view', resource: 'reports' });
        }
        catch {
            toast.error('خطأ في تحميل البيانات');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);
    const filteredEntities = useMemo(() => {
        return entities.filter(e => {
            if (govFilter !== 'all' && e.governorate !== govFilter)
                return false;
            return true;
        });
    }, [entities, govFilter]);
    const summaryStats = useMemo(() => ({
        totalEntities: entities.length, activeEntities: entities.filter(e => e.status === 'active').length,
        totalMembers: members.length, totalProfessions: professions.length,
        totalViolations: violations.length, totalInspections: inspections.length,
        totalDispatches: dispatches.length, totalPayments: payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        activeAlerts: alerts.length, totalRisk: riskAssessments.length,
        totalLegal: legalRefs.length, totalTraining: trainingRecords.length,
        totalLicenses: licenses.length, totalEval: evalCerts.length,
        compliant: complianceMatrices.filter(m => m.compliance_status === 'compliant').length,
    }), [entities, members, professions, violations, inspections, dispatches, payments, alerts, riskAssessments, legalRefs, trainingRecords, licenses, evalCerts, complianceMatrices]);
    const govDistribution = useMemo(() => {
        const map: Record<string, number> = {};
        entities.forEach(e => { const g = e.governorate || 'غير محدد'; map[g] = (map[g] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [entities]);
    const typeDistribution = useMemo(() => {
        const map: Record<string, number> = {};
        entities.forEach(e => { const t = e.entity_type || 'غير محدد'; map[t] = (map[t] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [entities]);
    const genderData = useMemo(() => {
        const male = members.filter(m => m.gender === 'male' || m.gender === 'ذكر').length;
        const female = members.filter(m => m.gender === 'female' || m.gender === 'أنثى').length;
        return [{ name: 'ذكور', value: male || 0 }, { name: 'إناث', value: female || 0 }];
    }, [members]);
    const getReportData = (): {
        data: any[];
        columns: ReportColumn[];
        filename: string;
    } => {
        switch (reportType) {
            case 'commercial':
                return {
                    data: commercialEsts, filename: 'سجل المنشآت والشركات التجارية',
                    columns: [
                        { key: 'name_ar', label: 'اسم المنشأة', width: 28 },
                        { key: 'unified_code', label: 'الرمز الموحد', width: 14 },
                        { key: 'commercial_register_number', label: 'السجل التجاري', width: 14 },
                        { key: 'governorate', label: 'المحافظة', width: 12 },
                        { key: 'sector', label: 'القطاع', width: 14 },
                        { key: 'size', label: 'الحجم', width: 10 },
                        { key: 'employees_count', label: 'العمالة', width: 10 },
                        { key: 'compliance_status', label: 'الامتثال', width: 12 },
                        { key: 'registration_date', label: 'التسجيل', width: 12 },
                        { key: 'risk_level', label: 'المخاطرة', width: 10 },
                        { key: 'status', label: 'الحالة', width: 10 },
                    ],
                };
            case 'unions':
                return {
                    data: filteredEntities, filename: 'سجل النقابات والاتحادات',
                    columns: [
                        { key: 'name_ar', label: 'اسم المنظمة النقابية', width: 30 },
                        { key: 'entity_type', label: 'المستوى', width: 12 },
                        { key: 'unified_code', label: 'الرمز المؤسسي', width: 12 },
                        { key: 'governorate', label: 'المحافظة', width: 12 },
                        { key: 'sector', label: 'القطاع', width: 12 },
                        { key: 'member_count', label: 'المنتسبون', width: 12 },
                        { key: 'compliance_status', label: 'الامتثال', width: 12 },
                        { key: 'registrationNumber', label: 'رقم التسجيل', width: 14 },
                        { key: 'status', label: 'الحالة', width: 10 },
                    ],
                };
            case 'disputes':
                return {
                    data: disputes, filename: 'المنازعات العمالية والصلح',
                    columns: [
                        { key: 'dispute_number', label: 'رقم النزاع', width: 14 },
                        { key: 'enterprise_name', label: 'المنشأة الطرف', width: 24 },
                        { key: 'worker_name', label: 'العامل الشاكي', width: 20 },
                        { key: 'dispute_type', label: 'موضوع النزاع', width: 18 },
                        { key: 'claim_amount', label: 'المطالبة المالية', width: 14, format: v => v ? `${Number(v).toLocaleString('ar-YE')} ر.ي` : '—' },
                        { key: 'status', label: 'موقف التسوية', width: 14 },
                        { key: 'created_at', label: 'تاريخ القيد', width: 14 },
                    ],
                };
            case 'expatriates':
                return {
                    data: expatriateLicenses, filename: 'تراخيص العمالة الوافدة',
                    columns: [
                        { key: 'license_number', label: 'رقم الترخيص', width: 14 },
                        { key: 'worker_name_ar', label: 'اسم العامل الوافد', width: 22 },
                        { key: 'nationality', label: 'الجنسية', width: 14 },
                        { key: 'occupation_name_ar', label: 'المهنة المرخصة', width: 20 },
                        { key: 'enterprise_name', label: 'جهة العمل', width: 24 },
                        { key: 'status', label: 'حالة الترخيص', width: 12 },
                        { key: 'expiry_date', label: 'تاريخ الانتهاء', width: 14 },
                    ],
                };
            case 'members':
                return {
                    data: members, filename: 'سجل العمال والنقابيين',
                    columns: [
                        { key: 'full_name', label: 'الاسم الكامل', width: 25 },
                        { key: 'national_id', label: 'الرقم الوطني', width: 14 },
                        { key: 'gender', label: 'الجنس', width: 8, format: v => v === 'male' ? 'ذكر' : v === 'female' ? 'أنثى' : v || '—' },
                        { key: 'profession', label: 'المهنة', width: 18 },
                        { key: 'qualification', label: 'المؤهل العلمي', width: 14 },
                        { key: 'governorate', label: 'المحافظة', width: 12 },
                        { key: 'membership_type', label: 'نوع العضوية', width: 14 },
                        { key: 'payment_status', label: 'الاشتراك', width: 12 },
                        { key: 'status', label: 'الحالة', width: 10 },
                    ],
                };
            case 'professions':
                return {
                    data: professions.slice(0, 200), filename: 'المهن والوظائف القياسية',
                    columns: [
                        { key: 'code', label: 'رمز المهنة', width: 10 },
                        { key: 'name_ar', label: 'المسمى المهني (عربي)', width: 26 },
                        { key: 'isco_code', label: 'ISCO-08', width: 12 },
                        { key: 'major_group_name', label: 'المجموعة الرئيسية', width: 18 },
                        { key: 'sector', label: 'القطاع', width: 14 },
                        { key: 'skill_level', label: 'المستوى المهاري', width: 12 },
                        { key: 'hazard_level', label: 'الخطورة OSH', width: 12 },
                        { key: 'demand_level', label: 'الطلب', width: 10 },
                        { key: 'is_technical', label: 'تقنية', width: 8, format: v => (v ? 'نعم' : 'لا') },
                    ],
                };
            case 'violations':
                return {
                    data: violations, filename: 'محاضر المخالفات العمالية',
                    columns: [
                        { key: 'violation_number', label: 'رقم المحضر', width: 14 },
                        { key: 'violation_type', label: 'نوع المخالفة', width: 22 },
                        { key: 'severity', label: 'درجة الجسامة', width: 12 },
                        { key: 'status', label: 'الإجراء المتخذ', width: 14 },
                        { key: 'penalty_amount', label: 'الغرامة المقررة', width: 14, format: v => v ? `${Number(v).toLocaleString('ar-YE')} ر.ي` : '—' },
                        { key: 'legal_basis', label: 'السند القانوني', width: 18 },
                    ],
                };
            case 'inspections':
                return {
                    data: inspections, filename: 'محاضر التفتيش والسلامة المهنية',
                    columns: [
                        { key: 'inspection_number', label: 'رقم المحضر', width: 14 },
                        { key: 'enterprise_name', label: 'المنشأة', width: 22 },
                        { key: 'inspection_type', label: 'نوع التفتيش', width: 14 },
                        { key: 'inspector_name', label: 'المفتش', width: 16 },
                        { key: 'overall_score', label: 'نسبة الامتثال', width: 12 },
                        { key: 'compliance_status', label: 'حالة المنشأة', width: 14 },
                        { key: 'findings_count', label: 'الملاحظات', width: 10 },
                        { key: 'violations_count', label: 'المخالفات', width: 10 },
                        { key: 'inspection_date', label: 'تاريخ النزول', width: 14 },
                    ],
                };
            case 'compliance':
                return {
                    data: complianceMatrices, filename: 'مصفوفات الامتثال المؤسسي',
                    columns: [
                        { key: 'enterprise_name', label: 'اسم المنشأة', width: 22 },
                        { key: 'article_number', label: 'رقم المادة', width: 14 },
                        { key: 'article_title', label: 'موضوع المادة القانونية', width: 22 },
                        { key: 'compliance_status', label: 'مستوى الالتزام', width: 14 },
                        { key: 'checked_by', label: 'المراقب القانوني', width: 16 },
                        { key: 'checked_at', label: 'تاريخ الفحص', width: 14 },
                    ],
                };
            case 'dispatches':
                return {
                    data: dispatches, filename: 'إرساليات وتوجيه العمالة',
                    columns: [
                        { key: 'dispatch_number', label: 'رقم الإرسالية', width: 14 },
                        { key: 'entity_name', label: 'المنشأة المصدرة', width: 22 },
                        { key: 'worker_name', label: 'اسم العامل', width: 18 },
                        { key: 'destination_country', label: 'جهة/موقع العمل', width: 16 },
                        { key: 'status', label: 'حالة الإرسالية', width: 12 },
                    ],
                };
            case 'financial':
                return {
                    data: payments, filename: 'سداد الرسوم والتحصيل المالي',
                    columns: [
                        { key: 'entity_name', label: 'المنشأة / الجهة', width: 22 },
                        { key: 'amount', label: 'المبلغ المسدد', width: 14, format: v => v ? `${Number(v).toLocaleString('ar-YE')} ر.ي` : '—' },
                        { key: 'payment_type', label: 'بند الرسوم', width: 16 },
                        { key: 'payment_status', label: 'حالة السداد', width: 12 },
                        { key: 'payment_date', label: 'تاريخ السند', width: 14 },
                    ],
                };
            case 'risk_assessments':
                return {
                    data: riskAssessments, filename: 'تقييم المخاطر التنبؤي',
                    columns: [
                        { key: 'entity_name', label: 'المنشأة', width: 22 },
                        { key: 'risk_type', label: 'نوع المخاطرة', width: 16 },
                        { key: 'risk_level', label: 'مستوى الخطر', width: 14 },
                        { key: 'likelihood', label: 'الاحتمالية', width: 10 },
                        { key: 'impact', label: 'الأثر', width: 10 },
                        { key: 'risk_score', label: 'المؤشر الرقمي', width: 10 },
                        { key: 'responsible_person', label: 'المسؤول الرقابي', width: 18 },
                    ],
                };
            case 'legal_references':
                return {
                    data: legalRefs, filename: 'الموسوعة القانونية وقانون العمل',
                    columns: [
                        { key: 'law_name_ar', label: 'اسم القانون / اللائحة', width: 28 },
                        { key: 'law_number', label: 'رقم التشريع', width: 12 },
                        { key: 'law_year', label: 'سنة الإصدار', width: 10 },
                        { key: 'status', label: 'سريان القانون', width: 10 },
                        { key: 'summary', label: 'الملخص والمضمون', width: 30 },
                    ],
                };
            case 'training':
                return {
                    data: trainingRecords, filename: 'سجلات التدريب والتأهيل',
                    columns: [
                        { key: 'training_name', label: 'البرنامج التدريبي', width: 24 },
                        { key: 'training_type', label: 'المجال التخصصي', width: 14 },
                        { key: 'employee_name', label: 'اسم المتدرب', width: 18 },
                        { key: 'training_provider', label: 'مركز التدريب المعتمد', width: 20 },
                        { key: 'duration_hours', label: 'الساعات', width: 10 },
                        { key: 'status', label: 'حالة البرنامج', width: 12 },
                    ],
                };
            case 'licenses':
                return {
                    data: licenses, filename: 'تراخيص مزاولة الأنشطة',
                    columns: [
                        { key: 'license_number', label: 'رقم الترخيص', width: 14 },
                        { key: 'license_type', label: 'نوع النشاط', width: 16 },
                        { key: 'entity_name', label: 'اسم المنشأة', width: 22 },
                        { key: 'issue_date', label: 'تاريخ المنح', width: 14 },
                        { key: 'expiry_date', label: 'تاريخ الانتهاء', width: 14 },
                        { key: 'status', label: 'الحالة', width: 10 },
                    ],
                };
            case 'evaluations':
                return {
                    data: evalCerts, filename: 'شهادات الكفاءة والمطابقة المهنية',
                    columns: [
                        { key: 'certificate_number', label: 'رقم الشهادة', width: 14 },
                        { key: 'enterprise_name', label: 'المنشأة الحائزة', width: 22 },
                        { key: 'profession_id', label: 'المهنة', width: 18, format: (v: any) => { const p = professions.find(x => x.id === v); return p ? (p.name_ar || p.name) : (v || '—'); } },
                        { key: 'overall_score', label: 'الدرجة', width: 10 },
                        { key: 'labor_law_compliance', label: 'قانون العمل', width: 12 },
                        { key: 'safety_compliance', label: 'OSH', width: 10 },
                        { key: 'training_compliance', label: 'التدريب', width: 10 },
                        { key: 'yemenization_compliance', label: 'التوطين', width: 10 },
                        { key: 'assessed_against_standards', label: 'مُقيّمة', width: 10, format: (v: any) => (v ? 'نعم' : 'لا') },
                        { key: 'standard_version', label: 'إصدار المعيار', width: 12 },
                        { key: 'status', label: 'الاعتماد', width: 10 },
                    ],
                };
            case 'alerts':
                return {
                    data: alerts, filename: 'تنبيهات الامتثال والإنذارات',
                    columns: [
                        { key: 'alert_type', label: 'نوع الإنذار', width: 20 },
                        { key: 'severity', label: 'مستوى الأهمية', width: 12 },
                        { key: 'description', label: 'نص التنبيه القانوني', width: 32 },
                        { key: 'is_resolved', label: 'موقف المعالجة', width: 12, format: v => v ? 'تمت التسوية' : 'قيد المتابعة' },
                    ],
                };
            case 'documents':
                return {
                    data: documents.map(d => ({
                        ...d,
                        docNumber: d.docNumber ?? d.doc_number ?? d.document_number,
                        name: d.name ?? d.document_name,
                        type: d.type ?? d.doc_type,
                        entityName: d.entityName ?? d.entity_name,
                        issueDate: d.issueDate ?? d.issue_date,
                    })),
                    filename: 'مستندات النقابات والمنظمات',
                    columns: [
                        { key: 'docNumber', label: 'رقم المستند', width: 14 },
                        { key: 'name', label: 'الاسم', width: 24 },
                        { key: 'type', label: 'النوع', width: 16 },
                        { key: 'entityName', label: 'الجهة المصدرة', width: 22 },
                        { key: 'status', label: 'الحالة', width: 12 },
                        { key: 'issueDate', label: 'تاريخ الإصدار', width: 14 },
                        { key: 'reviewer', label: 'المراجع', width: 16 },
                    ],
                };
            default:
                return { data: [], filename: 'تقرير', columns: [] };
        }
    };
    const handleExcelExport = () => {
        const { data, columns } = getReportData();
        if (data.length === 0) {
            toast.warning('لا توجد بيانات للتصدير');
            return;
        }
        exportReportToExcel({
            title: MAP[reportType], reportType: 'statistics', data, columns,
            dateFrom, dateTo, showGovernmentHeader: true,
        });
        toast.success('تم التصدير إلى Excel بنجاح');
        logAudit({ action: 'export', resource: 'report', details: { type: reportType, format: 'xlsx' } });
    };
    const handlePDFExport = () => {
        const { data, columns } = getReportData();
        if (data.length === 0) {
            toast.warning('لا توجد بيانات للتصدير');
            return;
        }
        exportReportToPDF({
            title: MAP[reportType], reportType: 'statistics', data, columns,
            dateFrom, dateTo, orientation: 'landscape',
        });
        toast.success('تم التصدير إلى PDF بنجاح');
        logAudit({ action: 'export', resource: 'report', details: { type: reportType, format: 'pdf' } });
    };
    const reportTypes: {
        id: ReportType;
        label: string;
        icon: any;
        count: number;
    }[] = [
        { id: 'commercial', label: 'المنشآت التجارية', icon: Building2, count: commercialEsts.length },
        { id: 'unions', label: 'النقابات والاتحادات', icon: Users, count: entities.length },
        { id: 'disputes', label: 'المنازعات والصلح', icon: Scale, count: disputes.length },
        { id: 'expatriates', label: 'العمالة الوافدة', icon: Globe, count: expatriateLicenses.length },
        { id: 'members', label: 'الكوادر العمالية', icon: Users, count: members.length },
        { id: 'professions', label: 'المهن القياسية', icon: Briefcase, count: professions.length },
        { id: 'violations', label: 'المخالفات العمالية', icon: AlertTriangle, count: violations.length },
        { id: 'inspections', label: 'التفتيش والسلامة', icon: ClipboardCheck, count: inspections.length },
        { id: 'compliance', label: 'الامتثال المؤسسي', icon: Shield, count: complianceMatrices.length },
        { id: 'dispatches', label: 'إرساليات العمالة', icon: FileText, count: dispatches.length },
        { id: 'financial', label: 'التحصيل والرسوم', icon: TrendingUp, count: payments.length },
        { id: 'risk_assessments', label: 'تقييم المخاطر', icon: AlertTriangle, count: riskAssessments.length },
        { id: 'legal_references', label: 'الموسوعة القانونية', icon: Scale, count: legalRefs.length },
        { id: 'training', label: 'التدريب والتأهيل', icon: Award, count: trainingRecords.length },
        { id: 'licenses', label: 'تراخيص الأنشطة', icon: Globe, count: licenses.length },
        { id: 'evaluations', label: 'شهادات الكفاءة', icon: BarChart3, count: evalCerts.length },
        { id: 'documents', label: 'مستندات النقابات', icon: FileText, count: documents.length },
        { id: 'alerts', label: 'الإنذارات والتنبيهات', icon: AlertTriangle, count: alerts.length },
    ];
    const currentData = getReportData();
    const handleBatchRiskCalc = async () => {
        try {
            toast.info('جاري حساب المخاطر لجميع النقابات والمنظمات...');
            const res = await fetch('/api/risk-engine/batch-calculate', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success(`تم حساب المخاطر لـ ${data.processed} كيان`);
                fetchAll();
            }
            else {
                toast.error('خطأ في حساب المخاطر');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="التقارير والمخرجات الرسمية" subtitle="قوالب جاهزة للطباعة والتصدير بتنسيق رسمي حكومي" breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'التقارير' }]} actions={<div className="flex items-center gap-2">
            <button onClick={handleBatchRiskCalc} className="flex items-center gap-2 px-4 py-2 bg-warning text-white rounded-lg text-sm font-semibold hover:bg-warning/90">
              <Calculator size={16}/> حساب المخاطر الجماعي
            </button>
            <button onClick={handleExcelExport} className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/90">
              <FileSpreadsheet className="w-4 h-4"/> تصدير Excel
            </button>
            <button onClick={handlePDFExport} className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg text-sm font-semibold hover:bg-error/90">
              <FileText className="w-4 h-4"/> تصدير PDF
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark">
              <Printer className="w-4 h-4"/> طباعة
            </button>
            <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/> تحديث
            </button>
          </div>}/>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {[
            { l: 'النقابات والمنظمات', v: summaryStats.totalEntities, c: 'text-primary' },
            { l: 'الأعضاء', v: summaryStats.totalMembers, c: 'text-success' },
            { l: 'المهن', v: summaryStats.totalProfessions, c: 'text-gold' },
            { l: 'المخالفات', v: summaryStats.totalViolations, c: 'text-error' },
            { l: 'رساليات', v: summaryStats.totalDispatches, c: 'text-teal' },
        ].map(s => (<div key={s.l} className="bg-card rounded-xl border border-border p-3 text-center">
            <p className={`text-xl font-black ${s.c}`}>{s.v.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>))}
      </div>

      {/* Report Type Selector */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <h2 className="text-sm font-bold text-heading mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary"/>اختر نوع التقرير</h2>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {reportTypes.map(t => {
            const Icon = t.icon;
            return (<button key={t.id} onClick={() => setReportType(t.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${reportType === t.id ? 'border-primary bg-primary/5 text-primary shadow' : 'border-border hover:border-primary/30 text-muted-foreground'}`}>
                <Icon className="w-5 h-5"/>
                <span className="text-[10px] font-semibold">{t.label}</span>
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t.count}</span>
              </button>);
        })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm"/></div>
          <div><label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm"/></div>
          <div><label className="block text-xs font-semibold text-muted-foreground mb-1">المحافظة</label>
            <select value={govFilter} onChange={e => setGovFilter(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              <option value="all">جميع المحافظات</option>
              {[...new Set(entities.map(e => e.governorate).filter(Boolean))].map(g => <option key={g} value={g}>{g}</option>)}
            </select></div>
          <div className="flex items-end gap-2">
            <button onClick={handleExcelExport} className="flex items-center gap-1 px-4 py-2 bg-success text-white rounded-lg text-xs font-semibold hover:bg-success/90">
              <Download className="w-3 h-3"/> Excel
            </button>
            <button onClick={handlePDFExport} className="flex items-center gap-1 px-4 py-2 bg-error text-white rounded-lg text-xs font-semibold hover:bg-error/90">
              <Download className="w-3 h-3"/> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Domain Analytical Panel (aggregate / analytical / evaluative) */}
      {(['commercial', 'professions', 'inspections', 'evaluations', 'unions', 'documents'].includes(reportType)) && (<DomainAnalyticalPanel domain={reportType} data={currentData.data} professions={professions}/>)}

      {/* Data Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-heading text-sm">
            {MAP[reportType]} — {currentData.data.length} سجل
          </h3>
          <div className="flex gap-2">
            <button onClick={handleExcelExport} className="flex items-center gap-1 px-3 py-1.5 bg-success/10 text-success-dark rounded-lg text-xs font-semibold hover:bg-success/20">
              <FileSpreadsheet className="w-3 h-3"/> Excel
            </button>
            <button onClick={handlePDFExport} className="flex items-center gap-1 px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-semibold hover:bg-error/20">
              <FileText className="w-3 h-3"/> PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary text-white sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-center w-8">#</th>
                {currentData.columns.map(col => (<th key={col.key} className="px-3 py-2 text-right text-xs">{col.label}</th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {currentData.data.length === 0 ? (<tr><td colSpan={currentData.columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات</td></tr>) : (currentData.data.map((row, i) => (<tr key={i} className={`${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'} hover:bg-accent transition-colors`}>
                    <td className="px-3 py-2 text-center text-muted-foreground text-xs">{i + 1}</td>
                     {currentData.columns.map(col => (<td key={col.key} className="px-3 py-2 text-heading text-xs">
                        {col.format ? col.format(row[col.key]) : (col.key === 'status' || col.key.endsWith('_status') ? translateStatus(row[col.key]) : (row[col.key] ?? '—'))}
                      </td>))}
                  </tr>)))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-3">التوزيع الجغرافي للكيانات</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={govDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {govDistribution.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-3">التوزيع حسب النوع</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/>
              <XAxis type="number" tick={{ fontSize: 11 }}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80}/>
              <Tooltip />
              <Bar dataKey="value" name="عدد النقابات والمنظمات" fill="#1E3A8A" radius={[0, 3, 3, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-3">توزيع الأعضاء حسب الجنس</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {genderData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-3">ملخص شامل</h3>
          <div className="space-y-2">
            {[
            { l: 'إجمالي النقابات والمنظمات', v: summaryStats.totalEntities, c: 'bg-primary', max: summaryStats.totalEntities },
            { l: 'إجمالي الأعضاء', v: summaryStats.totalMembers, c: 'bg-success', max: Math.max(summaryStats.totalMembers, 1) },
            { l: 'الملتزمين بالامتثال', v: summaryStats.compliant, c: 'bg-info', max: Math.max(summaryStats.totalEntities, 1) },
            { l: 'رساليات نشطة', v: summaryStats.totalDispatches, c: 'bg-warning', max: Math.max(summaryStats.totalDispatches, 1) },
        ].map(item => (<div key={item.l}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">{item.l}</span>
                  <span className="font-semibold text-heading">{item.v}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.c} rounded-full transition-all`} style={{ width: `${Math.min((item.v / item.max) * 100, 100)}%` }}/>
                </div>
              </div>))}
          </div>
        </div>
      </div>
    </div>);
}
