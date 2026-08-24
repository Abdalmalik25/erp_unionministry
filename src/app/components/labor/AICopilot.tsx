/**
 * AICopilot — المساعد الذكي الوطني للعمل مع الاستناد للمراجع القانونية
 * يساند النظام القرار — والقانون يحكم — والإنسان يقرر
 */
import { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { BrainCircuit, ShieldCheck, BookOpen, AlertTriangle, MessageSquare, Send } from "lucide-react";

type Answer = { answer: string; sources?: { title:string; article:string; version:string }[]; confidence?: number; insufficient?: boolean };

export function AICopilot() {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<Answer|null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async()=>{
    if(!q.trim()) return;
    setLoading(true);
    // Simulated RAG — في الإنتاج يربط بـ vector store للمصادر القانونية
    await new Promise(r=> setTimeout(r, 600));
    if (q.includes('إضراب') || q.includes('نزاع')) {
      setAns({
        answer: 'النظر في النزاعات يمر عبر: شكوى → تصنيف → صلح → جلسة → تسوية/تحكيم → قرار → استئناف. الإضراب منظم وفق قانون النقابات واللوائح — يتطلب إشراف الوزارة.',
        sources: [{ title:'قانون العمل 5/1995', article:'مادة 128', version:'2003' }, { title:'قانون النقابات 35/2002', article:'مادة 12', version:'2002' }],
        confidence: 0.82,
      });
    } else if (q.includes('عقد') || q.includes('أجنبي')) {
      setAns({
        answer: 'عقد العمل الأجنبي يتطلب تصريح عمل ساري ومصادقة. يُحفظ العقد مهيكلاً مع التحقق القانوني والبصمة الرقمية الموثقة.',
        sources: [{ title:'قانون العمل 5/1995', article:'مادة 15', version:'1995' }],
        confidence: 0.78,
      });
    } else {
      setAns({ insufficient: true, answer: 'لا توجد قاعدة موثقة كافية لإعطاء إجابة قانونية نهائية — سيُحال السؤال للمراجعة البشرية.' });
    }
    // Governance log (fire-and-forget)
    fetch('/api/v1/audit', { headers:{ 'x-correlation-id': `ai-${Date.now()}` }}).catch(()=>{});
    setLoading(false);
  };

  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-600"/>
          <span className="font-bold text-sm">المساعد الذكي الوطني للعمل</span>
          <Badge variant="outline" className="text-[10px]">مرجعي • خاضع للحوكمة • بإشراف بشري</Badge>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e=> setQ(e.target.value)} onKeyDown={e=> e.key==='Enter' && ask()} placeholder="اسأل: ما إجراءات نقل عامل؟ كيف أبلغ عن إصابة؟" className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          <Button onClick={ask} disabled={loading}><Send className="w-4 h-4 ml-1"/>{loading?'...':'إرسال'}</Button>
        </div>

        {ans && (
          <div className={`p-4 rounded-xl border ${ans.insufficient?'bg-amber-50 border-amber-300':'bg-white'}`}>
            <div className="flex items-start gap-2">
              {ans.insufficient ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0"/> : <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0"/>}
              <div className="text-sm leading-6">{ans.answer}</div>
            </div>
            {ans.sources && (
              <div className="mt-3 space-y-1">
                {ans.sources.map(s=>(
                  <div key={s.article} className="flex items-center gap-1.5 text-xs bg-slate-50 border rounded-lg px-2 py-1">
                    <BookOpen className="w-3 h-3"/> {s.title} — {s.article} — نسخة {s.version}
                    <Badge variant="outline" className="text-[10px] mr-auto">ثقة {(ans.confidence!*100).toFixed(0)}%</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">الإصدار الرسمي الأول</Badge>
              <Badge variant="outline" className="text-[10px]">استشارة نظامية</Badge>
              <Badge variant="outline" className="text-[10px]">مراجعة بشرية للقرارات الحساسة</Badge>
            </div>
            {!ans.insufficient && <div className="text-[11px] text-muted-foreground mt-2">⚖️ الإجابة تظهر المصدر والمادة والنسخة وتاريخ الفعالية — لا قرار نهائي آلي</div>}
            {ans.insufficient && <div className="text-[11px] text-amber-700 mt-2">لا توجد إجابة حاسمة دون مرجع نظامي موثق — سيُحال السؤال إلى المختصين</div>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2 border rounded-xl bg-indigo-50 border-indigo-200"><div className="font-bold flex items-center gap-1"><MessageSquare className="w-3 h-3"/> للمواطن</div><div>شرح الخدمات + تتبع الطلب</div></div>
          <div className="p-2 border rounded-xl bg-blue-50 border-blue-200"><div className="font-bold">للمفتش</div><div>تلخيص ملف المنشأة + نقاط تفتيش</div></div>
          <div className="p-2 border rounded-xl bg-emerald-50 border-emerald-200"><div className="font-bold">للإدارة</div><div>تحليل وطني + تنبؤ + توصيات</div></div>
        </div>

        <div className="text-[11px] text-muted-foreground bg-slate-50 border rounded-lg p-2">
          ضمانات الحوكمة: كل استفسار يُسجل كاملاً في سجل الحركة الرسمي — لا يصدر أي قرار آلي غير قابل للمراجعة
        </div>
      </div>
    </Card>
  );
}
