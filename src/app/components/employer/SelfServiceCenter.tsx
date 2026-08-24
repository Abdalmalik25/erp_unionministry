/**
 * SelfServiceCenter — مركز الخدمة الذاتية لصاحب العمل
 * إجراءات فورية بدون زيارة مكتب: وقت أقل • جهد أقل • تكلفة أقل • كفاءة أعلى
 */
import { useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";
import {
  Zap, FileSignature, RefreshCw, Calculator, CalendarClock, Building2,
  CreditCard, Download, Users, Search, ArrowLeft, CheckCircle2,
} from "lucide-react";

interface SelfAction {
  id: string;
  title: string;
  desc: string;
  sla: string;
  saves: string;         // القيمة المضافة
  icon: any;
  instant?: boolean;
}

const GROUPS: { label: string; actions: SelfAction[] }[] = [
  {
    label: 'إصدار وتجديد — فوري ذاتياً',
    actions: [
      { id: 'cert-good', title: 'شهادة حسن سيرة وسلوك للمنشأة', desc: 'تُصدر آلياً بعد فحص سجل المخالفات', sla: 'فوري', saves: 'بدون مراجعة مكتب', icon: Download, instant: true },
      { id: 'renew-license', title: 'تجديد تراخيص الأنشطة', desc: 'تحقق آلي من الرسوم والشروط ثم اعتماد', sla: 'خلال ساعات', saves: 'توفير ~3 زيارات', icon: RefreshCw },
      { id: 'fee-calc', title: 'حاسبة الرسوم والغرامات', desc: 'احسب المستحق قبل السداد بلا مفاجآت', sla: 'فوري', saves: 'شفافية كاملة', icon: Calculator, instant: true },
      { id: 'pay-fees', title: 'سداد الرسوم إلكترونياً', desc: 'إيصال موثق رقمياً يحدّث ملف المنشأة فوراً', sla: 'فوري', saves: 'صندوق + ورق = صفر', icon: CreditCard, instant: true },
    ],
  },
  {
    label: 'إدارة العاملين ذاتياً',
    actions: [
      { id: 'contract-auth', title: 'توثيق عقود عمل جديدة', desc: 'رفع العقد والهوات → تدقيق آلي → توثيق', sla: '3 أيام', saves: 'قوالب جاهزة تمنع الرفض', icon: FileSignature },
      { id: 'worker-transfer', title: 'نقل عامل من منشأة أخرى', desc: 'طلب موافقته مسبقاً يختصر الدورة', sla: '7 أيام', saves: 'موافقة رقمية بدل تنقل', icon: Users },
      { id: 'expat-renew', title: 'تجديد تراخيص العمالة الوافدة', desc: 'فحص اليمننة والتأمينات آلياً قبل التقديم', sla: '5 أيام', saves: 'فحص استباقي يمنع الرفض', icon: RefreshCw },
    ],
  },
  {
    label: 'الامتثال الاستباقي',
    actions: [
      { id: 'self-assess', title: 'التقييم الذاتي الشامل', desc: 'اكتشف الفجوات قبل أن يكتشفها المفتش', sla: '10 دقائق', saves: 'تجنب الغرامات', icon: Zap, instant: true },
      { id: 'book-inspection', title: 'حجز تفتيش اختياري استباقي', desc: 'اختر موعداً يناسبك واستعد بقائمة التحقق', sla: '7 أيام', saves: 'صفر مفاجآت', icon: CalendarClock },
      { id: 'est-update', title: 'تحديث بيانات المنشأة', desc: 'العنوان، المدير، النشاط، التواصل — مباشرة', sla: 'فوري', saves: 'ملف دائم الجاهزية', icon: Building2, instant: true },
    ],
  },
];

export function SelfServiceCenter({ onGoAssessment }: { onGoAssessment?: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const mark = (id: string) => setDone(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { v: '12', l: 'خدمة ذاتية كاملة' },
            { v: '-70%', l: 'زيارات مكاتب الوزارة' },
            { v: '-45%', l: 'زمن إنجاز المعاملة' },
            { v: '24/7', l: 'متاحة دون مواعيد' },
          ].map(k => (
            <div key={k.l} className="border rounded-xl p-3 text-center bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/20">
              <div className="text-xl font-black text-blue-700 dark:text-blue-400">{k.v}</div>
              <div className="text-[11px] font-medium text-muted-foreground">{k.l}</div>
            </div>
          ))}
        </div>
      </Card>

      {GROUPS.map(group => (
        <Card key={group.label}>
          <div className="p-4 space-y-2.5">
            <p className="font-bold text-sm flex items-center gap-2"><Search className="w-4 h-4 text-amber-500" />{group.label}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {group.actions.map(a => {
                const Icon = a.icon;
                const isDone = done[a.id];
                return (
                  <div key={a.id} className={`border rounded-xl p-3 transition-colors ${isDone ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="font-bold text-xs truncate">{a.title}</p>
                      </div>
                      {a.instant && <Badge className="bg-emerald-600 shrink-0">فوري</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{a.desc}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-bold text-slate-500">SLA: {a.sla} • {a.saves}</span>
                      <div className="flex items-center gap-1.5">
                        {a.id === 'self-assess' && onGoAssessment ? (
                          <Button size="sm" variant="gold" onClick={onGoAssessment}>ابدأ الآن <ArrowLeft className="w-3 h-3" /></Button>
                        ) : (
                          <Button size="sm" variant={isDone ? 'success' : 'outline'} onClick={() => mark(a.id)}>
                            {isDone ? <><CheckCircle2 className="w-3 h-3 ml-1" /> تم</> : 'تنفيذ'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}

      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px]">كل خدمة ذاتية تعمل Offline وتُزامَن لاحقاً • لا انتظار في طوابير • لا وسيط</Badge>
      </div>
    </div>
  );
}
