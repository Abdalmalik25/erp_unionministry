/**
 * DataQualityCenter — مركز جودة البيانات الوطني
 */
import { useEffect, useState } from "react";
import { PermissionGate } from "../hooks/usePermissions";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { ShieldCheck, Search, AlertTriangle, Users, Building2, FileWarning } from "lucide-react";

export default function DataQualityCenter() {
  const [findings, setFindings] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const load = async () => {
    const r = await fetch('/api/v1/data-quality/findings');
    const j = await r.json();
    setFindings(j.data?.data || j.data || []);
  };
  useEffect(() => { load(); }, []);
  const scan = async () => {
    setScanning(true);
    const r = await fetch('/api/v1/data-quality/scan', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
    const j = await r.json();
    setScanning(false);
    load();
    alert(`فحص مكتمل: ${j.total || 0} نتيجة — ${j.note || ''}`);
  };
  const getBadgeClass = (sev:string) => {
    if (sev === 'critical') return 'destructive';
    if (sev === 'warning') return 'default';
    return 'secondary';
  };
  const getSeverityText = (sev:string) => {
    if (sev === 'critical') return 'بالغة الأهمية';
    if (sev === 'warning') return 'تنبيه';
    return 'للعلم';
  };
  return (
    <PermissionGate permission="system.audit.view">
      <div className="space-y-6" dir="rtl">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold"><ShieldCheck className="w-4 h-4"/> مركز جودة البيانات الوطني</div>
          <h1 className="text-2xl font-black mt-1">نظافة البيانات = ثقة القرار</h1>
          <p className="text-sm text-slate-500 mt-1">كشف السجلات المكررة والمعزولة والأكواد غير الصحيحة والتعارضات التاريخية — كل نتيجة تُحوّل تلقائياً إلى معاملة معالجة موثقة</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={scan} disabled={scanning} className="bg-white text-slate-900 hover:bg-slate-100"><Search className="w-4 h-4 ml-1"/> {scanning ? 'جاري الفحص...' : 'فحص شامل الآن'}</Button>
            <Badge className="bg-white/80 text-slate-800 border-white/20">{findings.length} resultado abierta</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
          <Card>
            <div className="p-4 text-center"><Users className="w-6 h-6 mx-auto text-indigo-400"/><div className="font-bold">تكرار الأشخاص</div><div className="text-slate-400">رقم واحد لكل شخص — هوية وطنية موحدة</div></div>
          </Card>
          <Card>
            <div className="p-4 text-center"><Building2 className="w-6 h-6 mx-auto text-blue-400"/><div className="font-bold">تكرار المنشآت</div><div className="text-slate-400">رقم الكيان + السجل الرسمي</div></div>
          </Card>
          <Card>
            <div className="p-4 text-center"><FileWarning className="w-6 h-6 mx-auto text-amber-400"/><div className="font-bold">سجلات معزولة وأكواد غير صحيحة</div><div className="text-slate-400">عقود بلا مرجع أو برمز غير مطابق</div></div>
          </Card>
        </div>

        <Card>
          <div className="p-5 space-y-3">
            <div className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400"/> النتائج (آخر 50)</div>
            {findings.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-8">لا توجد نتائج — البيانات نظيفة أو لم يُجرَ فحص بعد</div>
            ) : (
              <div className="space-y-2">
                {findings.slice(0, 20).map((f:any) => {
                  const badgeClass = getBadgeClass(f.severity || 'info');
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 border rounded-xl">
                      <div>
                        <div className="font-medium text-sm">
                          {({duplicate_person:'تكرار سجل شخص', duplicate_establishment:'تكرار سجل منشأة', orphan_contract:'عقد بمرجع ناقص', invalid_code:'رمز غير صحيح'} as Record<string,string>)[f.check_type] || 'نتيجة فحص'}
                        </div>
                        <div className="text-xs text-slate-300 truncate max-w-[420px]">
                          {f.description || 'يوصى بالمعالجة من قبل أمين البيانات'}
                        </div>
                      </div>
                      <Badge variant={badgeClass} className="text-slate-600">
                        {getSeverityText(f.severity || 'info')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </PermissionGate>
  );
}