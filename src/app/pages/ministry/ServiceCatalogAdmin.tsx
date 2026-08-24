/**
 * ServiceCatalogAdmin — إدارة الخدمات دون كود (Nuclear: add/stop without deploy)
 */
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { VirtualizedTable } from "../../components/labor/VirtualizedTable";
import { Power, Plus, Shield, Clock, FileText } from "lucide-react";

export default function ServiceCatalogAdmin(){
  const [services,setServices]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({ service_code:'', title_ar:'', category:'general', stakeholder:'all', sla_days:7 });
  const load=async()=>{
    const r=await fetch('/api/v1/services/catalog?limit=100');
    const j=await r.json();
    const d=j.data?.data||j.data||[];
    setServices(Array.isArray(d)?d:[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);
  const toggle=async(code:string)=>{
    await fetch(`/api/v1/services/catalog/${code}/toggle`, { method:'PUT', headers:{ Authorization:`Bearer ${localStorage.getItem('auth_token')||''}` }});
    load();
  };
  const create=async()=>{
    if(!form.service_code || !form.title_ar) return alert('رمز وعنوان مطلوبان');
    const r=await fetch('/api/v1/services/catalog', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('auth_token')||''}` }, body: JSON.stringify(form)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); return alert(e.error||'فشل'); }
    setForm({ service_code:'', title_ar:'', category:'general', stakeholder:'all', sla_days:7 });
    load();
  };
  if(loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-2xl p-6">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Shield className="w-4 h-4"/> إدارة الخدمات — بدون كود (No-Code Service Control)</div>
        <h1 className="text-2xl font-black mt-1">إضافة/إيقاف أي خدمة دون تدخل برمجي</h1>
        <p className="text-sm text-blue-100 mt-1">Service Code → Title → Category → SLA → Workflow → Documents → Office — تظهر فوراً في السوق وتُحتسب SLA دون redeploy</p>
        <div className="mt-3 flex gap-2 text-xs">
          <Badge className="bg-white text-slate-900">{services.length} خدمة</Badge>
          <Badge className="bg-emerald-500">{services.filter(s=>s.is_active).length} نشطة</Badge>
          <Badge variant="outline" className="text-white border-white/30">{services.filter(s=>!s.is_active).length} موقوفة</Badge>
        </div>
      </div>

      <Card>
        <div className="p-5 space-y-3">
          <div className="font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> إضافة خدمة جديدة (دون كود)</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input value={form.service_code} onChange={e=> setForm({...form, service_code:e.target.value.toUpperCase()})} placeholder="SVC-NEW-001" className="border rounded-xl px-3 py-2 text-sm font-mono"/>
            <input value={form.title_ar} onChange={e=> setForm({...form, title_ar:e.target.value})} placeholder="عنوان الخدمة" className="border rounded-xl px-3 py-2 text-sm"/>
            <select value={form.category} onChange={e=> setForm({...form, category:e.target.value})} className="border rounded-xl px-3 py-2 text-sm">
              <option value="general">عامة</option><option value="establishment">منشأة</option><option value="worker">عامل</option><option value="union">نقابة</option><option value="inspection">تفتيش</option><option value="dispute">نزاع</option>
            </select>
            <select value={form.stakeholder} onChange={e=> setForm({...form, stakeholder:e.target.value})} className="border rounded-xl px-3 py-2 text-sm">
              <option value="all">الكل</option><option value="employer">صاحب عمل</option><option value="worker">عامل</option><option value="union">نقابة</option>
            </select>
            <div className="flex gap-2"><input type="number" value={form.sla_days} onChange={e=> setForm({...form, sla_days: parseInt(e.target.value)||7})} className="w-20 border rounded-xl px-2 py-2 text-sm"/><Button onClick={create} size="sm" className="flex-1">إضافة</Button></div>
          </div>
          <div className="text-[11px] text-muted-foreground flex gap-2"><Clock className="w-3 h-3"/> SLA يُحتسب تلقائياً + Workflow يُنشأ إن وُجد workflow_key + تظهر في /ministry/national-platform فوراً</div>
        </div>
      </Card>

      <VirtualizedTable
        rows={services}
        cols={[
          { key:'service_code', label:'الرمز', width:'140px', render: v=> <span className="font-mono text-xs">{String(v)}</span> },
          { key:'title_ar', label:'الخدمة', render: (v, r:any)=> <div><div className="font-medium text-sm">{String(v)}</div><div className="text-[11px] text-muted-foreground">{r.category} • {r.stakeholder} • {r.sla_days} يوم</div></div> },
          { key:'is_active', label:'الحالة', width:'120px', render: v=> v? <Badge className="bg-emerald-600">نشطة</Badge>: <Badge variant="destructive">موقوفة</Badge> },
          { key:'service_code', label:'تحكم', width:'120px', render: (_v, r:any)=> <Button size="sm" variant={r.is_active?'danger':'primary'} onClick={()=> toggle(r.service_code)}><Power className="w-3 h-3 ml-1"/>{r.is_active?'إيقاف':'تفعيل'}</Button> },
        ]}
      />

      <Card>
        <div className="p-4 text-xs space-y-1 text-muted-foreground">
          <div className="font-bold text-slate-700 flex items-center gap-1"><FileText className="w-4 h-4"/> دورة مستندية رسمية</div>
          <div>Service Catalog → Service Instance (instance_number SVC-...) → Workflow Instance → Case (إن لزم) → Decision → Certificate (hash) → Payment (إن وجد) → Signature (QR) → Archive</div>
          <div>كل انتقال يُسجل `workflow_transitions_log + audit_log` مع `correlationId` — إيقاف الخدمة = `is_active=false` — لا يحذف، يمنع `POST /instances` فقط `code:SERVICE_SUSPENDED`</div>
        </div>
      </Card>
    </div>
  );
}
