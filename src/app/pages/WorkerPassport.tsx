/**
 * WorkerPassport v2 — Comprehensive Digital Labor Passport
 * End-to-End Integration with worker portal service
 * Real-time data from: persons, worker_registry, employment_contracts, health certificates,
 * experience certificates, work injuries, training records, cases, insurance records, documents
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import {
  IdCard, Briefcase, GraduationCap, HeartPulse, FileText, Scale, ShieldCheck,
  Clock, QrCode, Award, AlertTriangle, Bell, Activity, Calendar, Download,
  Upload, FilePlus, Stethoscope, AlertCircle, Loader2, RefreshCw, ChevronLeft,
  TrendingUp, Users, Building2, CheckCircle2, XCircle, AlertOctagon, FileBadge,
  Eye, Send, Filter
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { SmartChronology } from "../components/labor/SmartChronology";
import { InteractionHub } from "../components/labor/InteractionHub";
import { OfflineIndicator } from "../components/labor/OfflineIndicator";
import {
  getWorkerPassport, getWorkerDashboard, getWorkerAlerts, getMyRequests,
  submitServiceRequest, fileReport, uploadDocument, getServiceTypes,
  calculateWorkDuration, getDocumentStatus, formatAlertSeverity,
  generatePassportQRData, formatDateArabic, getStatusBadge
} from "../services/workerPortalService";
import type {
  WorkerPassport as WorkerPassportData, AlertInfo, ServiceRequest,
  DashboardData, ServiceTypeInfo, TimelineEntry
} from "../services/workerPortalService";

type TabType = 'overview' | 'contracts' | 'health' | 'training' | 'cases' | 'documents' | 'services' | 'reports';
type ModalType = null | 'service_request' | 'report' | 'document_upload' | 'qr_code';

export default function WorkerPassport() {
  const { user } = useAuth();
  const [passport, setPassport] = useState<WorkerPassportData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Service request form
  const [serviceForm, setServiceForm] = useState<ServiceRequest>({
    request_type: 'inquiry',
    person_id: '',
    subject: '',
    description: '',
    priority: 'medium',
  });

  // Report form
  const [reportForm, setReportForm] = useState({
    report_type: 'complaint' as const,
    person_id: '',
    subject: '',
    description: '',
  });

  // Document upload
  const [uploadForm, setUploadForm] = useState<{ document_type: string; file: File | null }>({
    document_type: 'national_id',
    file: null,
  });

  const personId = (user as any)?.person_id || user?.id || '';
  const serviceTypes = useMemo(() => getServiceTypes(), []);

  // Load all data
  const loadData = useCallback(async (showRefreshing = false) => {
    if (!personId) {
      setError('لم يتم تحديد هوية المستخدم');
      setLoading(false);
      return;
    }
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [passportData, dashboardData, alertsData, requestsData] = await Promise.all([
        getWorkerPassport(personId),
        getWorkerDashboard(personId),
        getWorkerAlerts(personId),
        getMyRequests(personId),
      ]);
      setPassport(passportData);
      setDashboard(dashboardData);
      setAlerts(alertsData);
      setRequests(requestsData);
      setServiceForm(prev => ({ ...prev, person_id: personId }));
      setReportForm(prev => ({ ...prev, person_id: personId }));
    } catch (err: any) {
      console.error('Failed to load worker data:', err);
      setError('فشل تحميل البيانات — يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [personId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle service request submission
  const handleServiceSubmit = async () => {
    if (!serviceForm.subject || !serviceForm.description) {
      setSubmitMsg({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    const result = await submitServiceRequest(serviceForm);
    setSubmitting(false);
    if (result) {
      setSubmitMsg({ type: 'success', text: `تم تقديم الطلب بنجاح — رقم الطلب: ${result.request_number}` });
      setServiceForm({ ...serviceForm, subject: '', description: '' });
      setTimeout(() => { setModal(null); setSubmitMsg(null); loadData(true); }, 2000);
    } else {
      setSubmitMsg({ type: 'error', text: 'فشل تقديم الطلب — حاول مرة أخرى' });
    }
  };

  // Handle report submission
  const handleReportSubmit = async () => {
    if (!reportForm.subject || !reportForm.description) {
      setSubmitMsg({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    const result = await fileReport({ ...reportForm, person_id: personId });
    setSubmitting(false);
    if (result) {
      setSubmitMsg({ type: 'success', text: `تم استلام البلاغ بنجاح — رقم البلاغ: ${result.report_number}` });
      setReportForm({ ...reportForm, subject: '', description: '' });
      setTimeout(() => { setModal(null); setSubmitMsg(null); loadData(true); }, 2000);
    } else {
      setSubmitMsg({ type: 'error', text: 'فشل تقديم البلاغ — حاول مرة أخرى' });
    }
  };

  // Handle document upload
  const handleDocumentUpload = async () => {
    if (!uploadForm.file) {
      setSubmitMsg({ type: 'error', text: 'يرجى اختيار ملف' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    const result = await uploadDocument(personId, uploadForm.document_type, uploadForm.file);
    setSubmitting(false);
    if (result) {
      setSubmitMsg({ type: 'success', text: 'تم رفع الوثيقة بنجاح' });
      setUploadForm({ document_type: 'national_id', file: null });
      setTimeout(() => { setModal(null); setSubmitMsg(null); loadData(true); }, 2000);
    } else {
      setSubmitMsg({ type: 'error', text: 'فشل رفع الوثيقة' });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" dir="rtl">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل جواز العمل الرقمي...</p>
      </div>
    );
  }

  // Error state
  if (error && !passport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
        <AlertOctagon className="w-12 h-12 text-red-600" />
        <p className="text-base font-bold text-red-700">{error}</p>
        <Button onClick={() => loadData()}><RefreshCw className="w-4 h-4 ml-2"/>إعادة المحاولة</Button>
      </div>
    );
  }

  const person = passport?.person;
  const worker = passport?.worker;
  const stats = passport?.statistics;
  const contracts = passport?.contracts || [];
  const healthCerts = passport?.healthCertificates || [];
  const trainings = passport?.trainingRecords || [];
  const cases = passport?.cases || [];
  const documents = passport?.documents || [];
  const injuries = passport?.workInjuries || [];
  const skills = passport?.skills || [];
  const insurance = passport?.insuranceRecords || [];

  const workYears = stats?.totalWorkYears || calculateWorkDuration(contracts);
  const expiryAlerts = alerts.filter(a => a.alert_type === 'expiry' || a.alert_type === 'renewal');

  return (
    <div className="space-y-6" dir="rtl">
      {/* ==================== Hero Header ==================== */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-32 -translate-y-32" />
        <div className="flex flex-wrap gap-4 items-start justify-between relative">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              {person?.photo_url ? (
                <img src={person.photo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <IdCard className="w-10 h-10" />
              )}
            </div>
            <div>
              <div className="text-amber-300 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> جواز العمل الرقمي الموثق
              </div>
              <h1 className="text-2xl font-black mt-1">
                {person?.full_name_ar || user?.name || 'العامل'}
              </h1>
              <div className="text-sm text-emerald-100 mt-1">
                {worker?.occupation_name || 'المهنة'} • {worker?.employer_name || 'المنشأة'}
              </div>
              <div className="text-xs text-emerald-200 mt-0.5">
                رقم التسجيل: {worker?.registration_number || '—'} • {person?.national_id || '—'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => setModal('qr_code')}>
              <QrCode className="w-4 h-4 ml-1" />تحقق QR
            </Button>
            <Button size="sm" className="bg-white text-emerald-900 hover:bg-emerald-50">
              <Download className="w-4 h-4 ml-1" />تحميل PDF
            </Button>
            <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10" onClick={() => loadData(true)} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />تحديث
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <div className="text-xs text-emerald-200">الحالة المهنية</div>
            <div className="font-black text-lg mt-0.5">
              {worker?.status === 'active' ? 'على رأس العمل' : worker?.status === 'suspended' ? 'موقوف' : 'غير نشط'}
            </div>
            <div className="text-xs text-emerald-100 mt-0.5">
              {worker?.job_title || '—'}
            </div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <div className="text-xs text-emerald-200">العقود</div>
            <div className="font-black text-lg mt-0.5">{stats?.totalContracts || contracts.length}</div>
            <div className="text-xs text-emerald-100 mt-0.5">
              نشط {stats?.activeContracts || 0} • خبرة {workYears} سنوات
            </div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <div className="text-xs text-emerald-200">اللياقة الصحية</div>
            <div className="font-black text-lg mt-0.5">
              {stats?.healthCertificateStatus === 'expired' ? 'منتهية' :
               stats?.healthCertificateStatus === 'expiring_soon' ? 'قاربت الانتهاء' :
               stats?.healthCertificateStatus === 'valid' ? 'صالحة' : 'لا يوجد'}
            </div>
            <div className="text-xs text-emerald-100 mt-0.5">
              {expiryAlerts.filter(a => a.alert_type === 'health').length > 0 ? 'يلزم تجديد' : 'حالة سليمة'}
            </div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <div className="text-xs text-emerald-200">التدريب والشهادات</div>
            <div className="font-black text-lg mt-0.5">{trainings.length} شهادات</div>
            <div className="text-xs text-emerald-100 mt-0.5">
              {stats?.trainingHours || 0} ساعة تدريبية
            </div>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setModal('service_request')}>
            <FilePlus className="w-4 h-4 ml-1" />طلب خدمة
          </Button>
          <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={() => setModal('report')}>
            <AlertCircle className="w-4 h-4 ml-1" />تقديم بلاغ
          </Button>
          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setModal('document_upload')}>
            <Upload className="w-4 h-4 ml-1" />رفع وثيقة
          </Button>
        </div>
      </div>

      {/* ==================== Alerts Banner ==================== */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Bell className="w-5 h-5" /> التنبيهات ({alerts.length})
              </div>
              <Button size="sm" variant="ghost">عرض الكل</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alerts.slice(0, 4).map((alert) => {
                const sev = formatAlertSeverity(alert.severity);
                return (
                  <div key={alert.id} className="bg-white border rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'high' ? 'text-orange-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{alert.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{alert.message}</div>
                    </div>
                    <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ==================== Tabs Navigation ==================== */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: Activity },
          { id: 'contracts', label: `العقود (${contracts.length})`, icon: Briefcase },
          { id: 'health', label: `الصحة (${healthCerts.length})`, icon: HeartPulse },
          { id: 'training', label: `التدريب (${trainings.length})`, icon: GraduationCap },
          { id: 'cases', label: `القضايا (${cases.length})`, icon: Scale },
          { id: 'documents', label: `الوثائق (${documents.length})`, icon: FileText },
          { id: 'services', label: `الخدمات (${requests.length})`, icon: Send },
          { id: 'reports', label: 'البلاغات', icon: AlertCircle },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ==================== Tab Content ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Briefcase className="w-5 h-5 text-blue-600" /> سجل الوظائف والعقود الزمني
                  </div>
                  <div className="relative border-r-2 border-slate-200 pr-4 space-y-4">
                    {contracts.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-4 text-center bg-slate-50 rounded-lg">
                        لا توجد عقود مسجلة — عند تسجيلك في أي منشأة ستظهر تلقائياً هنا
                      </div>
                    ) : (
                      contracts.map((c) => {
                        const status = getStatusBadge(c.status);
                        return (
                          <div key={c.id} className="relative">
                            <div className="absolute -right-[9px] top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
                            <div className="border rounded-xl p-3 bg-slate-50">
                              <div className="font-bold text-sm">{c.job_title || 'عقد عمل'}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.employer_name || '—'} • {formatDateArabic(c.start_date)} — {c.end_date ? formatDateArabic(c.end_date) : 'حتى الآن'}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className={status.class}>{status.label}</Badge>
                                {c.is_electronic && (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
                                    <ShieldCheck className="w-3 h-3 ml-1" />موثق رقمياً
                                  </Badge>
                                )}
                                <span className="text-[10px] text-slate-500">
                                  رقم العقد: {c.contract_number}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => { setServiceForm({...serviceForm, request_type: 'experience_certificate'}); setModal('service_request'); }}>
                      <FileBadge className="w-4 h-4 ml-1" />طلب شهادة خبرة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setServiceForm({...serviceForm, request_type: 'transfer_service'}); setModal('service_request'); }}>
                      <Clock className="w-4 h-4 ml-1" />طلب نقل خدمة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setServiceForm({...serviceForm, request_type: 'contract_termination'}); setModal('service_request'); }}>
                      طلب إنهاء عقد
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <GraduationCap className="w-5 h-5 text-indigo-600" /> المهارات والشهادات
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.length === 0 ? (
                        <span className="text-xs text-muted-foreground">لا توجد مهارات مسجلة</span>
                      ) : (
                        skills.map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {s.certification_name}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="text-xs border rounded-xl p-3 bg-white">
                      <div className="font-bold mb-1">ملخص المسار المهني</div>
                      <div>الخبرة: {workYears} سنوات • المهارات: {skills.length} • التقييم: ممتاز</div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      <Award className="w-4 h-4 ml-1" />طلب تعميد مهارة
                    </Button>
                  </div>
                </Card>

                <Card>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <HeartPulse className="w-5 h-5 text-rose-600" /> اللياقة الصحية والفحوصات
                    </div>
                    {healthCerts.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-3 bg-slate-50 rounded-lg text-center">
                        لا توجد شهادات لياقة — احجز فحصك الطبي
                      </div>
                    ) : (
                      healthCerts.slice(0, 1).map((h) => {
                        const status = getDocumentStatus(h.expiry_date);
                        return (
                          <div key={h.id} className={`p-3 border rounded-xl text-xs ${
                            status === 'expired' ? 'bg-red-50 border-red-200' :
                            status === 'expiring_soon' ? 'bg-amber-50 border-amber-200' :
                            'bg-green-50 border-green-200'
                          }`}>
                            <div className="font-bold flex items-center gap-1">
                              {status === 'expiring_soon' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                              {status === 'expired' && <XCircle className="w-4 h-4 text-red-600" />}
                              {status === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              شهادة {h.health_status} — {formatDateArabic(h.expiry_date)}
                            </div>
                            <div>رقم الشهادة: {h.certificate_number} • الجهة: {h.issuing_hospital}</div>
                            <div className="text-muted-foreground">الطبيب: {h.doctor_name}</div>
                          </div>
                        );
                      })
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => { setServiceForm({...serviceForm, request_type: 'medical_checkup'}); setModal('service_request'); }}>
                        <Stethoscope className="w-4 h-4 ml-1" />حجز فحص
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal('document_upload')}>
                        <Upload className="w-4 h-4 ml-1" />رفع تقرير
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'contracts' && (
            <Card>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" /> جميع العقود ({contracts.length})
                  </div>
                  <Button size="sm" variant="outline"><Filter className="w-4 h-4 ml-1"/>تصفية</Button>
                </div>
                <div className="space-y-2">
                  {contracts.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm p-8">لا توجد عقود</div>
                  ) : (
                    contracts.map((c) => {
                      const status = getStatusBadge(c.status);
                      return (
                        <div key={c.id} className="border rounded-xl p-4 hover:bg-slate-50 transition">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="font-bold">{c.job_title}</div>
                              <div className="text-sm text-muted-foreground">{c.employer_name}</div>
                              <div className="text-xs mt-1">
                                رقم العقد: {c.contract_number} • نوع: {c.contract_type}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                من {formatDateArabic(c.start_date)} إلى {c.end_date ? formatDateArabic(c.end_date) : 'حتى الآن'}
                              </div>
                            </div>
                            <div className="text-left">
                              <Badge className={status.class}>{status.label}</Badge>
                              <div className="text-sm font-bold mt-2">
                                {c.total_salary?.toLocaleString() || c.basic_salary?.toLocaleString()} {c.currency}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'health' && (
            <div className="space-y-4">
              <Card>
                <div className="p-5 space-y-4">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-rose-600" /> شهادات اللياقة ({healthCerts.length})
                  </div>
                  {healthCerts.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm p-8">لا توجد شهادات لياقة</div>
                  ) : (
                    healthCerts.map((h) => {
                      const status = getDocumentStatus(h.expiry_date);
                      return (
                        <div key={h.id} className="border rounded-xl p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold">شهادة {h.certificate_type}</div>
                              <div className="text-sm">{h.issuing_hospital}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                رقم: {h.certificate_number} • الطبيب: {h.doctor_name}
                              </div>
                              {h.restrictions && (
                                <div className="text-xs text-amber-600 mt-1">⚠ قيود: {h.restrictions}</div>
                              )}
                            </div>
                            <Badge className={status === 'valid' ? 'bg-green-100 text-green-800' : status === 'expiring_soon' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                              {status === 'valid' ? 'صالحة' : status === 'expiring_soon' ? 'قاربت الانتهاء' : 'منتهية'}
                            </Badge>
                          </div>
                          <div className="text-xs mt-2">صالحة حتى: {formatDateArabic(h.expiry_date)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-5 space-y-3">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" /> إصابات العمل ({injuries.length})
                  </div>
                  {injuries.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm p-4">لا توجد إصابات مسجلة</div>
                  ) : (
                    injuries.map((inj) => (
                      <div key={inj.id} className="border rounded-xl p-3 text-sm">
                        <div className="flex justify-between">
                          <div className="font-bold">{inj.injury_type}</div>
                          <Badge variant={inj.severity === 'severe' || inj.severity === 'critical' ? 'destructive' : 'outline'}>
                            {inj.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateArabic(inj.injury_date)} • الجزء المصاب: {inj.body_part_affected}
                        </div>
                        <div className="text-xs mt-1">{inj.injury_description}</div>
                        {inj.compensation_amount && (
                          <div className="text-xs mt-1">التعويض: {inj.compensation_amount.toLocaleString()} • {getStatusBadge(inj.compensation_status).label}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-5 space-y-3">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" /> التأمينات ({insurance.length})
                  </div>
                  {insurance.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm p-4">لا توجد سجلات تأمينية</div>
                  ) : (
                    insurance.map((i) => (
                      <div key={i.id} className="border rounded-xl p-3 text-sm">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-bold">{i.insurance_type}</div>
                            <div className="text-xs text-muted-foreground">{i.insurance_company}</div>
                          </div>
                          <Badge className={getStatusBadge(i.status).class}>{getStatusBadge(i.status).label}</Badge>
                        </div>
                        <div className="text-xs mt-1">
                          رقم: {i.insurance_number} • قسط شهري: {i.monthly_contribution?.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          من {formatDateArabic(i.coverage_start)} إلى {i.coverage_end ? formatDateArabic(i.coverage_end) : 'مستمر'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'training' && (
            <Card>
              <div className="p-5 space-y-4">
                <div className="font-bold text-sm flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" /> السجل التدريبي ({trainings.length})
                </div>
                {trainings.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm p-8">لا توجد دورات تدريبية</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trainings.map((t) => (
                      <div key={t.id} className="border rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div className="font-bold">{t.training_name}</div>
                          {t.is_completed && <Badge className="bg-green-100 text-green-800">مكتمل</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{t.provider}</div>
                        <div className="text-xs mt-2">المدة: {t.duration_hours} ساعة</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateArabic(t.start_date)} — {formatDateArabic(t.end_date)}
                        </div>
                        {t.grade && <div className="text-xs mt-1">التقدير: <span className="font-bold">{t.grade}</span></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'cases' && (
            <Card>
              <div className="p-5 space-y-4">
                <div className="font-bold text-sm flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600" /> الشكاوى والقضايا ({cases.length})
                </div>
                {cases.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <div className="text-sm font-bold">لا توجد شكاوى مفتوحة</div>
                    <div className="text-xs text-muted-foreground mt-1">يمكنك تقديم بلاغ أو شكوى وستحصل على رقم مرجعي مع مهلة إنجاز وتتبع كامل</div>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button size="sm" onClick={() => setModal('report')}>تقديم شكوى</Button>
                      <Button size="sm" variant="outline" onClick={() => setModal('report')}>الإبلاغ عن مخالفة</Button>
                    </div>
                  </div>
                ) : (
                  cases.map((c) => (
                    <div key={c.id} className="border rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold">{c.case_type}</div>
                          <div className="text-sm">{c.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            رقم: {c.case_number} • تاريخ: {formatDateArabic(c.filing_date)}
                          </div>
                          {c.employer_name && <div className="text-xs">المنشأة: {c.employer_name}</div>}
                          {c.hearing_date && <div className="text-xs">الجلسة: {formatDateArabic(c.hearing_date)}</div>}
                        </div>
                        <Badge>{c.case_status}</Badge>
                      </div>
                      {c.decision && (
                        <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                          <span className="font-bold">القرار:</span> {c.decision}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {activeTab === 'documents' && (
            <Card>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" /> وثائقي ({documents.length})
                  </div>
                  <Button size="sm" onClick={() => setModal('document_upload')}>
                    <Upload className="w-4 h-4 ml-1" />رفع وثيقة
                  </Button>
                </div>
                {documents.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm p-8">لا توجد وثائق مرفوعة</div>
                ) : (
                  documents.map((d) => {
                    const status = getDocumentStatusLabel(d.expiry_date);
                    return (
                      <div key={d.id} className="border rounded-xl p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-sm">{d.document_name}</div>
                          <div className="text-xs text-muted-foreground">
                            رقم: {d.document_number} • صادر من: {d.issuing_authority}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateArabic(d.issue_date)}{d.expiry_date && ` — ${formatDateArabic(d.expiry_date)}`}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={status === 'valid' ? 'bg-green-100 text-green-800' : status === 'expiring_soon' ? 'bg-amber-100 text-amber-800' : status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                            {status === 'valid' ? 'ساري' : status === 'expiring_soon' ? 'قارب الانتهاء' : status === 'expired' ? 'منتهي' : 'دائم'}
                          </Badge>
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <Eye className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {activeTab === 'services' && (
            <Card>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-600" /> طلبات الخدمات ({requests.length})
                  </div>
                  <Button size="sm" onClick={() => setModal('service_request')}>
                    <FilePlus className="w-4 h-4 ml-1" />طلب جديد
                  </Button>
                </div>
                {requests.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm p-8">لا توجد طلبات خدمات</div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((r) => (
                      <div key={r.id} className="border rounded-xl p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">طلب رقم {r.request_number}</div>
                            <div className="text-sm text-muted-foreground">النوع: {r.request_type}</div>
                            <div className="text-xs text-muted-foreground">
                              تاريخ: {formatDateArabic(r.created_at)}
                            </div>
                          </div>
                          <Badge>{r.status}</Badge>
                        </div>
                        {r.estimated_completion_date && (
                          <div className="text-xs mt-1">الإنجاز المتوقع: {formatDateArabic(r.estimated_completion_date)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'reports' && (
            <Card>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" /> البلاغات والشكاوى
                  </div>
                  <Button size="sm" onClick={() => setModal('report')}>
                    <FilePlus className="w-4 h-4 ml-1" />بلاغ جديد
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { type: 'complaint', label: 'شكوى ضد منشأة', icon: Scale, color: 'amber' },
                    { type: 'violation', label: 'الإبلاغ عن مخالفة', icon: AlertOctagon, color: 'red' },
                    { type: 'hazard', label: 'الإبلاغ عن خطر', icon: AlertTriangle, color: 'orange' },
                    { type: 'injury', label: 'الإبلاغ عن إصابة', icon: HeartPulse, color: 'rose' },
                  ].map(t => (
                    <button
                      key={t.type}
                      onClick={() => { setReportForm({...reportForm, report_type: t.type as any}); setModal('report'); }}
                      className="border-2 border-dashed rounded-xl p-4 hover:bg-slate-50 transition text-right"
                    >
                      <t.icon className={`w-6 h-6 text-${t.color}-600 mb-2`} />
                      <div className="font-bold text-sm">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ==================== Right Sidebar ==================== */}
        <div className="space-y-6">
          {/* Quick Stats */}
          {dashboard && (
            <Card>
              <div className="p-5 space-y-3">
                <div className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> ملخص سريع
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <Briefcase className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-2xl font-black text-emerald-700">{dashboard.summary.activeContracts}</div>
                    <div className="text-[10px] text-emerald-600">عقود نشطة</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <FilePlus className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-2xl font-black text-blue-700">{dashboard.summary.pendingRequests}</div>
                    <div className="text-[10px] text-blue-600">طلبات معلقة</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <div className="text-2xl font-black text-amber-700">{dashboard.summary.upcomingExpiry}</div>
                    <div className="text-[10px] text-amber-600">قاربت الانتهاء</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                    <Bell className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                    <div className="text-2xl font-black text-rose-700">{dashboard.summary.alertsCount}</div>
                    <div className="text-[10px] text-rose-600">تنبيهات</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Personal Info */}
          <Card>
            <div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" /> المعلومات الشخصية
              </div>
              {person && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">الاسم</span>
                    <span className="font-bold">{person.full_name_ar}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">رقم الهوية</span>
                    <span className="font-mono font-bold">{person.national_id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">الميلاد</span>
                    <span>{formatDateArabic(person.birth_date)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">الجنسية</span>
                    <span>{person.nationality}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">المحافظة</span>
                    <span>{person.governorate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الجوال</span>
                    <span className="font-mono">{person.phone}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Smart Chronology */}
          <SmartChronology type="person" id={personId || '00000000-0000-0000-0000-000000000000'} />

          {/* Interaction Hub */}
          <InteractionHub />

          {/* Privacy Notice */}
          <Card>
            <div className="p-5 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> الخصوصية والتحكم
              </div>
              <div className="text-xs text-muted-foreground">
                بياناتك محمية بالكامل — لا يطّلع عليها إلا المخولون رسمياً وللغرض الرسمي فقط. كل وصول يُسجل تدقيقياً.
              </div>
              <div className="text-[11px] bg-slate-50 border rounded-lg p-2">
                تصنيفات السرية المعتمدة: <strong>عام • مقيّد • خاص • حساس • سري</strong> — فصل تام
              </div>
            </div>
          </Card>

          {/* Offline Indicator */}
          <OfflineIndicator />
        </div>
      </div>

      {/* ==================== Modals ==================== */}
      {modal === 'service_request' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-emerald-600" /> طلب خدمة جديد
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">نوع الطلب *</label>
                <select
                  className="w-full border rounded-lg p-2 text-sm"
                  value={serviceForm.request_type}
                  onChange={e => setServiceForm({ ...serviceForm, request_type: e.target.value as any })}
                >
                  {serviceTypes.map(s => (
                    <option key={s.type} value={s.type}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">الموضوع *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={serviceForm.subject}
                  onChange={e => setServiceForm({ ...serviceForm, subject: e.target.value })}
                  placeholder="موضوع الطلب"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">التفاصيل *</label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm min-h-[100px]"
                  value={serviceForm.description}
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="اشرح تفاصيل طلبك..."
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">الأولوية</label>
                <select
                  className="w-full border rounded-lg p-2 text-sm"
                  value={serviceForm.priority}
                  onChange={e => setServiceForm({ ...serviceForm, priority: e.target.value as any })}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>
            {submitMsg && (
              <div className={`p-3 rounded-lg text-sm ${submitMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {submitMsg.text}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleServiceSubmit} disabled={submitting} className="flex-1">
                {submitting ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" />جاري الإرسال...</> : 'إرسال الطلب'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {modal === 'report' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" /> تقديم بلاغ
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">نوع البلاغ *</label>
                <select
                  className="w-full border rounded-lg p-2 text-sm"
                  value={reportForm.report_type}
                  onChange={e => setReportForm({ ...reportForm, report_type: e.target.value as any })}
                >
                  <option value="complaint">شكوى</option>
                  <option value="violation">مخالفة</option>
                  <option value="hazard">خطر</option>
                  <option value="inquiry">استفسار</option>
                  <option value="suggestion">اقتراح</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">الموضوع *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={reportForm.subject}
                  onChange={e => setReportForm({ ...reportForm, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">التفاصيل *</label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm min-h-[120px]"
                  value={reportForm.description}
                  onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                />
              </div>
            </div>
            {submitMsg && (
              <div className={`p-3 rounded-lg text-sm ${submitMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {submitMsg.text}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleReportSubmit} disabled={submitting} className="flex-1 bg-rose-600 hover:bg-rose-700">
                {submitting ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" />جاري...</> : 'إرسال البلاغ'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {modal === 'document_upload' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> رفع وثيقة
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">نوع الوثيقة *</label>
                <select
                  className="w-full border rounded-lg p-2 text-sm"
                  value={uploadForm.document_type}
                  onChange={e => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                >
                  <option value="national_id">الهوية الوطنية</option>
                  <option value="passport">جواز السفر</option>
                  <option value="work_permit">تصريح العمل</option>
                  <option value="residence">الإقامة</option>
                  <option value="contract">نسخة عقد</option>
                  <option value="medical_report">تقرير طبي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">الملف *</label>
                <input
                  type="file"
                  className="w-full border rounded-lg p-2 text-sm"
                  onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG (حد أقصى 10 ميجا)</div>
              </div>
            </div>
            {submitMsg && (
              <div className={`p-3 rounded-lg text-sm ${submitMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {submitMsg.text}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleDocumentUpload} disabled={submitting} className="flex-1">
                {submitting ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" />جاري الرفع...</> : 'رفع الوثيقة'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {modal === 'qr_code' && passport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg flex items-center gap-2 justify-center">
              <QrCode className="w-5 h-5 text-emerald-600" /> رمز التحقق
            </h3>
            <div className="bg-slate-50 p-6 rounded-xl">
              <div className="w-48 h-48 mx-auto bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center">
                <QrCode className="w-32 h-32 text-slate-400" />
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                امسح الرمز للتحقق من صحة الجواز
              </div>
            </div>
            <div className="text-xs text-slate-600 font-mono break-all bg-slate-50 p-2 rounded">
              {generatePassportQRData(passport)}
            </div>
            <Button variant="outline" onClick={() => setModal(null)} className="w-full">إغلاق</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for status of documents
function getDocumentStatusLabel(expiryDate?: string): 'valid' | 'expiring_soon' | 'expired' | 'none' {
  if (!expiryDate) return 'none';
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
}
