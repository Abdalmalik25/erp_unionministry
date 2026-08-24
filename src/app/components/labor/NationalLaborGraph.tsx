/**
 * NationalLaborGraph — ترابط وطني مرئي
 * Person ↔ Worker ↔ Contract ↔ Establishment ↔ Inspection ↔ Violation ↔ Case
 * مع Drill-down وطني→محافظة→مديرية→منشأة
 */
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { GitBranch, Building2, Users, FileText, ClipboardCheck, AlertTriangle, Scale, ArrowLeftRight } from "lucide-react";

type Node = { id:string; label:string; type:'person'|'worker'|'establishment'|'contract'|'inspection'|'violation'|'case'|'union'; count?:number };

export function NationalLaborGraph({ onSelect }: { onSelect?: (n:Node)=>void }) {
  const nodes: Node[] = [
    { id:'persons', label:'الأشخاص', type:'person', count: 1240 },
    { id:'workers', label:'العمال', type:'worker', count: 890 },
    { id:'contracts', label:'العقود', type:'contract', count: 412 },
    { id:'establishments', label:'المنشآت', type:'establishment', count: 312 },
    { id:'inspections', label:'التفتيش', type:'inspection', count: 87 },
    { id:'violations', label:'المخالفات', type:'violation', count: 41 },
    { id:'cases', label:'القضايا', type:'case', count: 28 },
    { id:'unions', label:'النقابات', type:'union', count: 30 },
  ];
  const iconMap: any = { person: Users, worker: Users, establishment: Building2, contract: FileText, inspection: ClipboardCheck, violation: AlertTriangle, case: Scale, union: GitBranch };
  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-indigo-600"/>
          <span className="font-bold text-sm">النسيج الوطني للعمل — National Labor Graph</span>
          <Badge variant="outline" className="text-[10px]">One Graph • Zero Duplication</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {nodes.map(n=>{
            const Icon = iconMap[n.type];
            return (
              <button key={n.id} onClick={()=> onSelect?.(n)} className="p-3 border rounded-xl hover:bg-slate-50 text-center transition group">
                <Icon className="w-5 h-5 mx-auto text-slate-600 group-hover:text-indigo-600"/>
                <div className="text-xs font-bold mt-1">{n.label}</div>
                <div className="text-[11px] text-muted-foreground">{n.count}</div>
                <div className="text-[10px] font-mono text-slate-400">{n.id}</div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-bold">العلاقات:</span>
          <Badge variant="secondary">Person → Worker</Badge>
          <span>→</span>
          <Badge variant="secondary">Contract</Badge>
          <span>↔</span>
          <Badge variant="secondary">Establishment</Badge>
          <span>→</span>
          <Badge variant="secondary">Inspection → Violation → Case</Badge>
          <span>↔</span>
          <Badge variant="secondary">Union</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="font-bold">الترابط العميق</div>
            <div className="text-muted-foreground">كل عقد مرتبط بشخص + منشأة + مهنة مصنفة وطنياً — لا نصوص حرة</div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="font-bold">Drill-down محكوم</div>
            <div className="text-muted-foreground">وطني → محافظة → مديرية → قطاع → نشاط → منشأة — مقنّع حسب الصلاحية</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="font-bold">منع التكرار</div>
            <div className="text-muted-foreground">ONE PERSON ONE IDENTITY — كشف التكرار بالهوية + الهاتف + الجغرافيا</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
