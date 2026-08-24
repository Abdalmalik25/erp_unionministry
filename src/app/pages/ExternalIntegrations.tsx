/**
 * ExternalIntegrations — شاشة التكامل الخارجي (ذكية: تعمل متصلة/منفصلة)
 */
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/badge";
import { IntegrationAware } from "../components/integration/IntegrationAware";
import { Globe, Wifi, WifiOff, Database, RefreshCw, Power, Settings } from "lucide-react";

type Integ = { code:string; name_ar:string; party_type:string; status:string; mode:string; is_required:boolean };

export default function ExternalIntegrations(){
  const [list,setList]=useState<Integ[]>([]);
  const [queue,setQueue]=useState<any>(null);
  const load=async()=>{
    const r=await fetch('/api/v1/integrations'); const j=await r.json(); setList(j.data?.data||j.data||[]);
    const q=await fetch('/api/v1/integrations/queue'); const jq=await q.json(); setQueue(jq.data||jq);
  };
  useEffect(()=>{ load(); },[]);
  const toggleMode=async(code:string, mode:string)=>{
    await fetch(`/api/v1/integrations/${code}/mode`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('auth_token')||''}`}, body: JSON.stringify({ mode, status: mode==='mock'?'mock':'connected' })});
    load();
  };
  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-2xl p-6">
        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold"><Globe className="w-4 h-4"/> التكامل الخارجي — ذكي (متصل/منفصل)</div>
        <h1 className="text-2xl font-black mt-1">يعمل بدون ربط ويرتقي عند الربط</h1>
        <p className="text-sm text-blue-100 mt-1">Fallback → Mock → Cache → Queue — لا توقف للخدمة — سد الفجوات: تأمينات، أحوال، سجل تجاري</p>
        <div className="mt-3 flex gap-2 text-xs"><Badge className="bg-white text-slate-900">{list.length} أطراف</Badge><Badge className="bg-emerald-500">{list.filter(x=>x.mode==='mock').length} محاكاة (يعمل)</Badge><Badge variant="outline" className="text-white border-white/30">كاش 5د • طابور مؤجل</Badge></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map(it=>(
          <Card key={it.code}>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div><div className="font-bold text-sm">{it.name_ar}</div><div className="text-xs text-muted-foreground font-mono">{it.code} • {it.party_type}</div></div>
                {it.mode==='mock'? <WifiOff className="w-5 h-5 text-amber-600"/> : <Wifi className="w-5 h-5 text-emerald-600"/>}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant={it.status==='connected'?'default':it.status==='mock'?'secondary':'destructive'}>{it.status}</Badge>
                <Badge variant="outline">{it.mode}</Badge>
                {it.is_required && <Badge className="bg-rose-600">مطلوب</Badge>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={it.mode==='mock'?'primary':'outline'} onClick={()=> toggleMode(it.code,'mock')}><Database className="w-3 h-3 ml-1"/>محاكاة (يعمل)</Button>
                <Button size="sm" variant={it.mode==='live'?'primary':'outline'} onClick={()=> toggleMode(it.code,'live')}><Wifi className="w-3 h-3 ml-1"/>مباشر</Button>
                <Button size="sm" variant="outline" onClick={()=> toggleMode(it.code,'fallback')}><RefreshCw className="w-3 h-3 ml-1"/>سقوط آمن</Button>
              </div>
              <div className="border rounded-xl p-3 bg-slate-50">
                <div className="text-xs font-bold mb-2">اختبار حي:</div>
                <IntegrationAware code={it.code} payload={it.code==='civil_id'? {national_id:'12345678', full_name:'اختبار'}: it.code==='commercial_register'? {commercial_register:'CR-123'}:{}}>
                  {(res,meta)=> <div className="text-xs"><div className="font-mono bg-white border rounded-lg p-2 overflow-auto max-h-24">{JSON.stringify(res,null,2)}</div><div className="text-[11px] text-muted-foreground mt-1">وضع: {meta.mode} {meta.cached?'• كاش':''} {meta.queued?'• مؤجل':''}</div></div>}
                </IntegrationAware>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 space-y-2">
          <div className="font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4"/> طابور المزامنة والكاش — الاعتمادية</div>
          <div className="text-xs font-mono bg-slate-50 border rounded-xl p-3 overflow-auto max-h-32">{JSON.stringify(queue,null,2)}</div>
          <div className="text-[11px] text-muted-foreground">عند عودة الطرف: `external_sync_queue pending → retrying → success` — لا فقدان — كل خدمة تعمل محلياً أولاً</div>
        </div>
      </Card>

      <Card>
        <div className="p-4 text-xs space-y-1 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="font-bold flex items-center gap-1"><Power className="w-4 h-4 text-blue-600"/> كيف هيئت شاشات العمل بذكاء</div>
          <div>• EmployerOS: التحقق من السجل التجاري عبر `IntegrationAware code=commercial_register` — إن فشل، يعرض mock ويخزن queue</div>
          <div>• WorkerPassport: التحقق من الهوية `civil_id` — fallback يسمح بإكمال الطلب مع تنبيه `ستتم المزامنة`</div>
          <div>• MinistryWorkspace: يظهر `Badge: محاكاة/كاش/متصل` — القرار لا يتوقف</div>
        </div>
      </Card>
    </div>
  );
}
