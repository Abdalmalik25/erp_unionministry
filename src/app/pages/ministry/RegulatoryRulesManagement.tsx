/**
 * RegulatoryRulesManagement — محرك القواعد التشريعية الوطني
 * Law First: كل قاعدة لها مصدر قانوني + versioning + explainability
 */
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";

type Rule = {
  id: string;
  rule_code: string;
  name_ar: string;
  legal_source_title?: string;
  rule_type: string;
  severity: string;
  status: string;
  effective_from: string;
  applies_to: string[];
};

export function RegulatoryRulesManagement() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [legalSources, setLegalSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [evalResult, setEvalResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/regulatory/rules").then(r=>r.json()).then(j=> setRules(j.data?.data || j.data || [])),
      fetch("/api/v1/legal/sources").then(r=>r.json()).then(j=> setLegalSources(j.data?.data || j.data || [])),
    ]).finally(()=> setLoading(false));
  }, []);

  const runDemoEval = async () => {
    const res = await fetch("/api/v1/regulatory/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_type: "worker",
        transaction_date: "2026-08-23",
        payload: { worker: { age: 14, nationality: "YE" }, contract: { start_date: null } }
      })
    });
    const j = await res.json();
    setEvalResult(j.data || j);
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">محرك القواعد التشريعية — Regulatory Rules Engine</h1>
        <Badge variant="outline">Law First • Versioned • Explainable</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="p-4"><div className="font-bold">المصادر القانونية</div><div className="text-3xl font-bold">{legalSources.length}</div><div className="text-sm text-muted-foreground">قانون العمل + تعديلاته + النقابات</div></div></Card>
        <Card><div className="p-4"><div className="font-bold">القواعد المنفذة</div><div className="text-3xl font-bold">{rules.length}</div><div className="text-sm text-muted-foreground">قابلة للتقييم الزمني</div></div></Card>
        <Card><div className="p-4"><div className="font-bold">الجاهزية</div><Badge className="bg-amber-500">FLAG FOR LEGAL REVIEW</Badge><div className="text-xs mt-2">القيم الرقمية illustrative — تتطلب نصاً رسمياً</div></div></Card>
      </div>

      <Card>
        <div className="p-4 space-y-4">
          <div className="font-bold">اختبار Time-Machine + Explainability (Demo)</div>
          <p className="text-sm text-muted-foreground">يحاكي: عامل عمره 14 سنة — تاريخ المعاملة 2026-08-23 — يطبق LAB-AGE-001</p>
          <Button onClick={runDemoEval}>تشغيل التقييم</Button>
          {evalResult && (
            <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-64" dir="ltr">{JSON.stringify(evalResult, null, 2)}</pre>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <div className="font-bold mb-2">القواعد</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-right p-2">الرمز</th><th className="text-right p-2">الاسم</th><th className="text-right p-2">النوع</th><th className="text-right p-2">الخطورة</th><th className="text-right p-2">الحالة</th></tr></thead>
            <tbody>
              {rules.map(r=>(
                <tr key={r.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-mono">{r.rule_code}</td>
                  <td className="p-2">{r.name_ar}</td>
                  <td className="p-2"><Badge variant="secondary">{r.rule_type}</Badge></td>
                  <td className="p-2"><Badge variant={r.severity==='block'?'destructive':'outline'}>{r.severity}</Badge></td>
                  <td className="p-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="p-4 text-sm space-y-2">
          <div className="font-bold text-amber-700">⚠️ LEGAL_REVIEW_REQUIRED</div>
          <p>القواعد الحالية illustrative — السن الحقيقي، شروط تصريح الأجنبي، ومدة العقد يجب تأكيدها من النص الرسمي لقانون العمل 5/1995 مع تعديلاته 25/1997، 11/2001، 25/2003.</p>
          <p>لا تستخدم القواعد كقرار نهائي قبل موافقة المستشار القانوني وتحويلها to <code>active</code>.</p>
        </div>
      </Card>
    </div>
  );
}
export default RegulatoryRulesManagement;
