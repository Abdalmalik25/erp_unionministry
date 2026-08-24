/**
 * WorkerPassport — جواز العمل (My Labor Identity)
 */
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { IdCard, Briefcase, GraduationCap, HeartPulse, FileText, Scale, ShieldCheck, Clock, QrCode, Award, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { SmartChronology } from "../components/labor/SmartChronology";
import { InteractionHub } from "../components/labor/InteractionHub";
import { OfflineIndicator } from "../components/labor/OfflineIndicator";

export default function WorkerPassport() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);

  useEffect(()=>{
    fetch('/api/v1/contracts?limit=5').then(r=>r.json()).then(j=> setContracts(j.data?.data||j.data||[])).catch(()=>{});
    fetch('/api/v1/cases?limit=5').then(r=>r.json()).then(j=> setCases(j.data?.data||j.data||[])).catch(()=>{});
  },[]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center"><IdCard className="w-8 h-8"/></div>
            <div>
              <div className="text-amber-300 text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> جواز العمل الرقمي — My Labor Passport</div>
              <h1 className="text-2xl font-black">{user?.name || 'العامل'}</h1>
              <div className="text-sm text-emerald-100">الهوية المهنية • العقود • المهارات • اللياقة • التدريب • الإصابات • النزاعات — سجل واحد موثق</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><QrCode className="w-4 h-4 ml-1"/>تحقق QR</Button>
            <Button size="sm" className="bg-white text-emerald-900 hover:bg-emerald-50">تحميل الجواز PDF</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-emerald-200">الحالة</div><div className="font-black">على رأس العمل</div><div className="text-xs text-emerald-100">منشأة: الشركة اليمنية — صنعاء</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-emerald-200">العقود</div><div className="font-black">{contracts.length} عقود</div><div className="text-xs">نشط 1 • منتهي {Math.max(0,contracts.length-1)}</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-emerald-200">اللياقة الصحية</div><div className="font-black text-amber-300">تنتهي خلال 22 يوم</div><div className="text-xs">يلزم تجديد</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-emerald-200">التدريب</div><div className="font-black">3 شهادات</div><div className="text-xs">آخرها: السلامة المهنية</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm"><Briefcase className="w-5 h-5 text-blue-600"/> سجل الوظائف والعقود (Timeline)</div>
              <div className="relative border-r-2 border-slate-200 pr-4 space-y-4">
                {[
                  { id:'c1', title:'عقد عمل — فني صيانة', org:'الشركة اليمنية للصناعة', period:'2024/03/01 — حتى الآن', status:'نشط • موثق رقمياً', hash:'a3f1…9c2e' },
                  { id:'c2', title:'عقد عمل — فني', org:'مصنع الأمل', period:'2021/06/15 — 2023/12/31', status:'منتهي • تم الإخلاء', hash:'7b2e…1a9f' },
                  { id:'c3', title:'تدريب مهني — الكهرباء الصناعية', org:'معهد التدريب المهني', period:'2020', status:'شهادة', hash:'—' },
                ].map(c=>(
                  <div key={c.id} className="relative">
                    <div className="absolute -right-[9px] top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"/>
                    <div className="border rounded-xl p-3 bg-slate-50">
                      <div className="font-bold text-sm">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.org} • {c.period}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        <span className="text-[10px] font-mono text-slate-500">hash: {c.hash}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {contracts.slice(0,2).map((co:any)=>(
                  <div key={co.id} className="border rounded-xl p-3 text-xs"><span className="font-bold">{co.contract_number}</span> — {co.status} • {co.start_date}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm"><FileText className="w-4 h-4 ml-1"/>طلب شهادة خبرة</Button>
                <Button size="sm" variant="outline"><Clock className="w-4 h-4 ml-1"/>طلب نقل خدمة</Button>
                <Button size="sm" variant="outline">طلب إنهاء عقد</Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><div className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm"><GraduationCap className="w-5 h-5 text-indigo-600"/> المؤهلات والمهارات</div>
              <div className="flex flex-wrap gap-1.5">
                {['كهرباء صناعية','PLC','صيانة وقائية','السلامة','إدارة وقت'].map(s=> <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
              </div>
              <div className="text-xs border rounded-xl p-3 bg-white">الخبرة: 6 سنوات • التقييم: ممتاز • آخر تدريب: 2025/11</div>
              <Button size="sm" variant="outline" className="w-full"><Award className="w-4 h-4 ml-1"/>طلب تعميد مهارة</Button>
            </div></Card>

            <Card><div className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm"><HeartPulse className="w-5 h-5 text-rose-600"/> اللياقة الصحية والفحوصات</div>
              <div className="p-3 border rounded-xl bg-amber-50 border-amber-200 text-xs">
                <div className="font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-600"/> تنتهي خلال 22 يوم</div>
                <div>شهادة اللياقة رقم HC-2025-1842 — صادرة 2025/08/20</div>
                <div className="text-muted-foreground">المركز: مستشفى الثورة — صنعاء • النتيجة: لائق</div>
              </div>
              <div className="flex gap-2"><Button size="sm" className="flex-1">حجز فحص</Button><Button size="sm" variant="outline" className="flex-1">رفع تقرير</Button></div>
            </div></Card>
          </div>

          <Card><div className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm"><Scale className="w-5 h-5 text-amber-600"/> شكاواي ونزاعاتي</div>
            {cases.length===0 ? <div className="text-xs text-muted-foreground">لا توجد شكاوى — يمكنك تقديم بلاغ/شكوى وسيُنشأ Case مع CaseNumber وSLA وتتبع</div> : cases.slice(0,3).map((c:any)=><div key={c.id} className="border rounded-xl p-3 text-sm flex justify-between"><span>{c.subject||c.case_number}</span><Badge>{c.status}</Badge></div>)}
            <div className="flex gap-2"><Button size="sm">تقديم شكوى</Button><Button size="sm" variant="outline">الإبلاغ عن مخالفة</Button><Button size="sm" variant="outline">الإبلاغ عن إصابة</Button></div>
          </div></Card>
        </div>

        <div className="space-y-6">
          <Card><div className="p-5 space-y-3">
            <div className="font-bold text-sm">وثائقي</div>
            <div className="space-y-2 text-xs">
              {[
                { n:'عقد العمل الحالي', s:'موثق', d:'hash a3f1…9c2e' },
                { n:'شهادة اللياقة', s:'قاربت الانتهاء', d:'22 يوم' },
                { n:'شهادة خبرة — مصنع الأمل', s:'معتمدة', d:'2024/01/10' },
                { n:'بطاقة تدريب سلامة', s:'سارية', d:'حتى 2026/06' },
              ].map(doc=>(
                <div key={doc.n} className="flex items-center justify-between p-2.5 border rounded-xl">
                  <div><div className="font-medium">{doc.n}</div><div className="text-muted-foreground">{doc.d}</div></div>
                  <Badge variant={doc.s==='قاربت الانتهاء'?'destructive':'outline'}>{doc.s}</Badge>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-full"><FileText className="w-4 h-4 ml-1"/>رفع وثيقة (مع Hash)</Button>
          </div></Card>

          <Card><div className="p-5 space-y-2">
            <div className="font-bold text-sm">الخصوصية والتحكم</div>
            <div className="text-xs text-muted-foreground">بياناتك الشخصية معزولة — لا يراها إلا المخولون حسب Jurisdiction والغرض. كل وصول يُسجل تدقيقياً.</div>
            <div className="text-[11px] bg-slate-50 border rounded-lg p-2">Public • Restricted • Personal • Sensitive Employment • Confidential Case — فصل تام</div>
          </div></Card>
          <SmartChronology type="person" id={user?.id || '00000000-0000-0000-0000-000000000000'} />
          <InteractionHub />
          <OfflineIndicator />
        </div>
      </div>
    </div>
  );
}
