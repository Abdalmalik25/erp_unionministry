/**
 * ComplianceScoreCard — Decision Support Only (Score ≠ Legal Decision)
 * LAW FIRST: يعرض الأسباب لا الحكم
 */
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Shield, AlertTriangle, FileWarning, ClipboardCheck, Clock, HeartPulse } from "lucide-react";

type Props = {
  score?: number; // 0-100
  breakdown?: { label: string; value: number; status: 'ok'|'warn'|'error'; icon: any }[];
  reasons: { label: string; count: number; severity: 'info'|'warning'|'critical' }[];
};

export function ComplianceScoreCard({ score = 73, breakdown, reasons }: Props) {
  const level = score >= 80 ? 'ممتاز' : score >= 60 ? 'مقبول' : 'يحتاج معالجة';
  const color = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600';
  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm">مؤشر الالتزام — دعم قرار فقط</span>
          </div>
          <Badge variant="outline" className="text-[10px]">مبرهن • موثق في السجل الرسمي</Badge>
        </div>

        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-2xl ${score>=80?'border-emerald-500':score>=60?'border-amber-500':'border-rose-500'} ${color}`}>
            {score}
          </div>
          <div>
            <div className={`font-bold ${color}`}>{level}</div>
            <div className="text-xs text-muted-foreground mt-1">الدرجة لا تعني حكماً قانونياً — راجع الأسباب والأساس النظامي لكل بند</div>
            <div className="text-[11px] text-slate-400">يُحتسب من: التسجيل، العقود، السلامة، الوثائق، التدريب، التفتيش، الإجراءات التصحيحية</div>
          </div>
        </div>

        {breakdown && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {breakdown.map(b => (
              <div key={b.label} className={`p-2 rounded-lg border text-center ${b.status==='ok'?'bg-emerald-50 border-emerald-200':b.status==='warn'?'bg-amber-50 border-amber-200':'bg-rose-50 border-rose-200'}`}>
                <b.icon className={`w-4 h-4 mx-auto mb-1 ${b.status==='ok'?'text-emerald-600':b.status==='warn'?'text-amber-600':'text-rose-600'}`} />
                <div className="text-[11px] font-medium">{b.label}</div>
                <div className="text-xs font-bold">{b.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">أسباب المؤشر (لماذا؟)</div>
          {reasons.map(r=>(
            <div key={r.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs">
              <span>{r.label}</span>
              <Badge variant={r.severity==='critical'?'destructive':r.severity==='warning'?'default':'secondary'}>{r.count}</Badge>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-2">
          ⚖️ الأساس القانوني لكل قاعدة يُعرض عند النقر — النسخة والفعالية وتاريخ المعاملة محفوظة (استعراض تاريخي كامل)
        </div>
      </div>
    </Card>
  );
}
export const defaultBreakdown = [
  { label: 'التسجيل', value: 92, status: 'ok' as const, icon: ClipboardCheck },
  { label: 'العقود', value: 68, status: 'warn' as const, icon: FileWarning },
  { label: 'السلامة', value: 81, status: 'ok' as const, icon: HeartPulse },
  { label: 'الوثائق', value: 54, status: 'error' as const, icon: AlertTriangle },
  { label: 'التدريب', value: 77, status: 'ok' as const, icon: Clock },
  { label: 'التصحيح', value: 45, status: 'error' as const, icon: Shield },
];
