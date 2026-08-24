/**
 * ServiceMarketplace — سوق الخدمات الذكي
 * المستخدم يقول "أريد نقل عامل" ← فيحدد النظام الأهلية والمستندات المطلوبة والرسوم ومدة الإنجاز
 */
import { useState, useMemo } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { Search, FileText, Clock, DollarSign, CheckCircle2, ShieldAlert } from "lucide-react";

type Service = {
  id: string;
  title: string;
  category: 'establishment'|'worker'|'union'|'inspection'|'dispute';
  sla: string;
  fees?: string;
  requires: string[];
  eligibility: string;
  office: string;
};

const CATALOG: Service[] = [
  { id:'est-reg', title:'طلب تسجيل منشأة', category:'establishment', sla:'5 أيام عمل', fees:'حسب التصنيف', requires:['السجل التجاري','عقد الإيجار/التمليك','هوية المالك','بيانات الموقع'], eligibility:'مالك/مفوض + سجل تجاري ساري', office:'مكتب العمل المختص (المحافظة/المديرية)' },
  { id:'contract-auth', title:'المصادقة على عقد عمل (فردي/جماعي/أجنبي)', category:'worker', sla:'3 أيام', requires:['العقد المهيكل','هوية العامل','المهنة مصنفة','تصريح الأجنبي إن وجد'], eligibility:'منشأة مسجلة + عقد مستوفٍ لشروط القانون', office:'إدارة علاقات العمل' },
  { id:'transfer', title:'نقل خدمة عامل (من منشأة لأخرى)', category:'worker', sla:'7 أيام', requires:['موافقة المنشأتين','العقد الجديد','مبرر النقل'], eligibility:'عامل على رأس العمل + لا نزاع قائم', office:'مكتب العمل' },
  { id:'injury', title:'الإبلاغ عن إصابة عمل', category:'inspection', sla:'48 ساعة', fees:'مجاناً', requires:['تقرير طبي','محضر إصابة','بيانات المنشأة'], eligibility:'أي منشأة/عامل', office:'السلامة المهنية' },
  { id:'complaint', title:'تقديم شكوى عمالية', category:'dispute', sla:'15 يوم', requires:['هوية','وصف الشكوى','أدلة'], eligibility:'عامل/صاحب عمل/نقابة', office:'إدارة الشكاوى' },
  { id:'union-reg', title:'تسجيل طلب إنشاء منظمة نقابية', category:'union', sla:'15 يوم', requires:['النظام الأساسي','كشوف الأعضاء','محضر تأسيس'], eligibility:'20 عامل فأكثر (FLAG_FOR_REVIEW)', office:'إدارة المنظمات النقابية' },
  { id:'inspection', title:'طلب تفتيش (دوري/متخصص/حسب الطلب)', category:'inspection', sla:'7 أيام', requires:['بيانات المنشأة','سبب الطلب'], eligibility:'منشأة مسجلة أو بلاغ', office:'إدارة التفتيش' },
  { id:'experience-cert', title:'تعميد شهادة خبرة', category:'worker', sla:'3 أيام', requires:['إثبات العمل','تقييم المنشأة'], eligibility:'عامل سابق', office:'مكتب العمل' },
];

export function ServiceMarketplace({ onSelect }: { onSelect?: (s: Service)=>void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>('all');
  const [remote, setRemote] = useState<Service[]|null>(null);
  // DB-driven: يسحب من service_catalog — بدون كود
  useState(()=>{ fetch('/api/v1/services/catalog?limit=100&is_active=true').then(r=>r.json()).then(j=>{
    const d=j.data?.data||j.data||[];
    if(Array.isArray(d) && d.length){
      setRemote(d.map((x:any)=> ({ id:x.service_code, title:x.title_ar, category:x.category, sla:`${x.sla_days} أيام`, fees: x.fees?.amount? `${x.fees.amount} ${x.fees.currency}`: 'حسب التصنيف', requires: Array.isArray(x.requires_documents)? x.requires_documents: [], eligibility: x.eligibility_rule||'حسب القانون', office: x.office_type })));
    }
  }).catch(()=>{}); });
  const source = remote || CATALOG;
  const filtered = useMemo(()=> source.filter(s=>{
    const matchQ = !q || s.title.includes(q) || s.requires.join(' ').includes(q);
    const matchCat = cat==='all' || s.category===cat;
    return matchQ && matchCat;
  }), [q, cat, source]);

  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm">سوق الخدمات الذكي</span>
          <Badge variant="outline" className="text-[10px]">شروط الاستحقاق • المستندات • الرسوم • مدة الإنجاز • مكان التقديم</Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input value={q} onChange={e=> setQ(e.target.value)} placeholder="ماذا تريد أن تفعل؟ مثل: نقل عامل، تسجيل منشأة، شكوى..." className="w-full pr-9 pl-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={cat} onChange={e=> setCat(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
            <option value="all">كل الفئات</option>
            <option value="establishment">منشآت</option>
            <option value="worker">عمال</option>
            <option value="union">نقابات</option>
            <option value="inspection">تفتيش</option>
            <option value="dispute">نزاعات</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-auto pr-1">
          {filtered.map(s=>(
            <div key={s.id} className="border rounded-xl p-4 hover:bg-slate-50 transition flex flex-col gap-2">
              <div className="font-bold text-sm">{s.title}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 ml-1"/>{s.sla}</Badge>
                {s.fees && <Badge variant="outline" className="text-[10px]"><DollarSign className="w-3 h-3 ml-1"/>{s.fees}</Badge>}
                <Badge variant="outline" className="text-[10px]">{s.office}</Badge>
              </div>
              <div className="text-xs"><span className="font-medium">الأهلية:</span> {s.eligibility}</div>
              <div className="text-xs"><span className="font-medium">الوثائق:</span> {s.requires.join(' • ')}</div>
              <div className="flex gap-2 mt-auto">
                <Button size="sm" className="flex-1" onClick={()=> onSelect?.(s)}><CheckCircle2 className="w-4 h-4 ml-1"/>بدء الطلب</Button>
                <Button size="sm" variant="outline"><FileText className="w-4 h-4"/></Button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div className="col-span-2 text-center text-sm text-muted-foreground py-8">لا توجد خدمات مطابقة — جرّب كلمة أخرى</div>}
        </div>

        <div className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2 flex gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0"/> كل خدمة تمر عبر مسار إجرائي موحد ومعتمد (استحقاق ← مستندات ← رسوم ← مراجعة → Decision → Appeal → Certificate → Archive) مع تتبع SLA
        </div>
      </div>
    </Card>
  );
}
