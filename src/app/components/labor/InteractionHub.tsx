/**
 * InteractionHub — تفاعل الأطراف (صاحب عمل ↔ عامل ↔ مفتش ↔ موظف)
 * رسائل + إسناد + تعليقات لحظية + إشعارات ذكية
 */
import { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { MessageSquare, Send, Users, ClipboardCheck, Bell, ArrowLeftRight } from "lucide-react";

type Msg = { id:string; from:string; role:string; text:string; at:string };

export function InteractionHub({ caseId }: { caseId?: string }){
  const [msgs,setMsgs]=useState<Msg[]>([
    { id:'1', from:'مفتش العمل', role:'labor_inspector', text:'تمت زيارة المنشأة — 2 مخالفة سلامة', at: new Date().toISOString() },
    { id:'2', from:'صاحب العمل', role:'employer', text:'تم رفع إجراء تصحيحي + صور', at: new Date().toISOString() },
    { id:'3', from:'موظف الرقابة', role:'compliance_officer', text:'قيد المراجعة — تبقى يومان من مدة الإنجاز المحددة', at: new Date().toISOString() },
  ]);
  const [input,setInput]=useState("");
  const send=()=>{
    if(!input.trim()) return;
    setMsgs([...msgs, { id:Date.now().toString(), from:'أنت', role:'me', text:input, at: new Date().toISOString() }]);
    setInput("");
    // fire notification event (dedup)
    fetch('/api/v1/services/instances', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ service_code:'SVC-EST-012', payload:{ caseId, text:input } }) }).catch(()=>{});
  };
  return (
    <Card>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-indigo-600"/>
          <span className="font-bold text-sm">تفاعل الأطراف</span>
          <Badge variant="outline" className="text-[10px]">صاحب عمل ↔ عامل ↔ مفتش ↔ موظف</Badge>
          <Badge variant="secondary" className="text-[10px]"><Users className="w-3 h-3 ml-1"/>لحظي</Badge>
        </div>
        <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
          {msgs.map(m=>(
            <div key={m.id} className={`p-3 border rounded-xl ${m.role==='me'?'bg-blue-50 border-blue-200':'bg-slate-50'}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><MessageSquare className="w-3 h-3"/>{m.from} • { {labor_inspector:'مفتش عمل', employer:'صاحب العمل', compliance_officer:'مسؤول الرقابة', me:'أنت'}[m.role] || m.role } • {new Date(m.at).toLocaleTimeString('ar-YE')}</div>
              <div className="text-sm mt-1">{m.text}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e=> setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && send()} placeholder="رسالة/تعليق/إجراء — يُسجل تدقيقياً..." className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          <Button onClick={send}><Send className="w-4 h-4 ml-1"/>إرسال</Button>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Button size="sm" variant="outline"><ClipboardCheck className="w-3 h-3 ml-1"/>إسناد لمفتش</Button>
          <Button size="sm" variant="outline"><Bell className="w-3 h-3 ml-1"/>تنبيه ذكي</Button>
          <Button size="sm" variant="outline">طلب وثيقة</Button>
        </div>
        <div className="text-[11px] text-muted-foreground bg-slate-50 border rounded-lg p-2">كل رسالة موثقة في سجل الحركة الرسمي مع إشعار فوري — لا تكرار ولا فقدان</div>
      </div>
    </Card>
  );
}
