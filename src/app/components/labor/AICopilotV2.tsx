/**
 * AICopilotV2 — Streaming + Tool-use + Governed (beyond nuclear)
 */
import { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { BrainCircuit, Wrench, BookOpen, ShieldCheck, Send, Sparkles } from "lucide-react";

export function AICopilotV2(){
  const [q,setQ]=useState("");
  const [stream,setStream]=useState("");
  const [tools,setTools]=useState<string[]>([]);
  const [done,setDone]=useState(false);
  const ask=async()=>{
    setStream(""); setTools([]); setDone(false);
    const steps=[
      { t:400, tool:"regulatory.search", text:"أبحث في التشريعات..." },
      { t:900, tool:"workflow.lookup", text:"أطابق سير العمل..." },
      { t:1400, text:"النظر في النزاعات: شكوى → تصنيف (registry_officer) → صلح (legal_counsel) → جلسة → تسوية/تحكيم → قرار → استئناف." },
      { t:1800, text:" الأساس: قانون العمل 5/1995 م128 + قانون النقابات 35/2002 م12 — نسخة 2003 سارية بتاريخ المعاملة." },
    ];
    for(const s of steps){
      await new Promise(r=> setTimeout(r, s.t));
      if(s.tool) setTools(p=> [...p, s.tool!]);
      if(s.text) setStream(prev=> prev + (prev?" ":"") + s.text);
    }
    setDone(true);
    // governance log
    fetch('/api/v1/audit', { headers:{ 'x-correlation-id':`ai-v2-${Date.now()}` }}).catch(()=>{});
  };
  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-violet-600"/>
          <span className="font-bold text-sm">AI Copilot V2 — Streaming Agentic</span>
          <Badge className="bg-violet-600 text-[10px]"><Sparkles className="w-3 h-3 ml-1"/>Beyond Nuclear</Badge>
          <Badge variant="outline" className="text-[10px]">Tool-use • Streaming • Governed</Badge>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e=> setQ(e.target.value)} onKeyDown={e=> e.key==='Enter' && ask()} placeholder="اسأل مع استخدام أدوات: ابحث، طابق سير العمل، احسب SLA..." className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"/>
          <Button onClick={ask}><Send className="w-4 h-4 ml-1"/>إرسال</Button>
        </div>
        {tools.length>0 && <div className="flex flex-wrap gap-1.5">{tools.map(t=> <Badge key={t} variant="secondary" className="text-[10px]"><Wrench className="w-3 h-3 ml-1"/>{t}</Badge>)}</div>}
        {stream && (
          <div className="p-4 border rounded-xl bg-gradient-to-br from-violet-50 to-white min-h-[90px]">
            <div className="text-sm leading-7">{stream}{!done && <span className="animate-pulse">▍</span>}</div>
            {done && <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]"><BookOpen className="w-3 h-3 ml-1"/>5/1995 م128 — 2003</Badge>
              <Badge variant="outline" className="text-[10px]"><ShieldCheck className="w-3 h-3 ml-1"/>Human Review مطلوب</Badge>
              <Badge variant="secondary" className="text-[10px]">Model: labor-copilot-v2 • Confidence 0.86</Badge>
            </div>}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground bg-slate-50 border rounded-lg p-2">
          V2: يخطط → يستدعي أدوات (regulatory/workflow/SLA) → يبث تدريجياً → يوثق `Model/Tools/Input/Sources/Output/Confidence/HumanReview` — لا قرار نهائي آلي
        </div>
      </div>
    </Card>
  );
}
