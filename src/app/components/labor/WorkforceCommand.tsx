/**
 * WorkforceCommand — توزيع القوى العاملة مع عزل البيانات الشخصية حيثما يلزم
 */
import { Card } from "../ui/Card";
import { Users, Briefcase, AlertCircle } from "lucide-react";
import { usePolicy } from "../../hooks/usePolicy";

type Props = {
  total: number;
  yemeni: { male: number; female: number };
  expat: { male: number; female: number };
  byOccupation: { name: string; count: number }[];
  expiringContracts?: number;
  pendingTransfers?: number;
};

export function WorkforceCommand({ total, yemeni, expat, byOccupation, expiringContracts=0, pendingTransfers=0 }: Props) {
  const policy = usePolicy();
  const yemTotal = yemeni.male + yemeni.female;
  const expTotal = expat.male + expat.female;
  const yemenization = total ? Math.round((yemTotal/total)*100) : 0;
  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-sm">قيادة القوى العاملة</span>
          <span className="text-xs text-muted-foreground">— إجمالي {total.toLocaleString('ar-YE')}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <div className="text-xs text-slate-600">يمنيون</div>
            <div className="text-xl font-black text-blue-700">{yemTotal}</div>
            <div className="text-[11px] text-slate-500">ذكور {yemeni.male} • إناث {yemeni.female}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border text-center">
            <div className="text-xs text-slate-600">غير يمنيين</div>
            <div className="text-xl font-black">{expTotal}</div>
            <div className="text-[11px] text-slate-500">ذكور {expat.male} • إناث {expat.female}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-xs text-slate-600">نسبة اليمننة</div>
            <div className="text-xl font-black text-emerald-700">{yemenization}%</div>
            <div className="text-[11px] text-slate-500">المستهدف {policy.yemenizationMinRatio}%</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-xs text-slate-600">تنبيهات</div>
            <div className="text-sm font-bold">{expiringContracts} عقود قاربت الانتهاء</div>
            <div className="text-[11px]">{pendingTransfers} طلبات نقل</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold mb-2 flex items-center gap-1"><Briefcase className="w-3 h-3"/> التوزيع حسب المهنة (أعلى 6)</div>
          <div className="space-y-1.5">
            {byOccupation.slice(0,6).map(o=>(
              <div key={o.name} className="flex items-center gap-2 text-xs">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, (o.count/total)*100)}%` }} />
                </div>
                <span className="w-32 truncate text-right">{o.name}</span>
                <span className="font-bold w-8 text-left">{o.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-slate-50 border rounded-lg p-2">
          <AlertCircle className="w-3 h-3"/> البيانات الشخصية (هوية/راتب) معزولة ومقنّعة حسب الصلاحية — RBAC + Jurisdiction
        </div>
      </div>
    </Card>
  );
}
