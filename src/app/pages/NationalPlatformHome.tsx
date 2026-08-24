/**
 * NationalPlatformHome — الصفحة الوطنية الموحدة (تجميع كل التحسينات)
 * تُظهر الترابط العميق والتكامل العالمي
 */
import { NationalLaborGraph } from "../components/labor/NationalLaborGraph";
import { UnifiedSearch } from "../components/labor/UnifiedSearch";
import { AICopilot } from "../components/labor/AICopilot";
import { AICopilotV2 } from "../components/labor/AICopilotV2";
import { SecurityCenter } from "../components/labor/SecurityCenter";
import { ServiceMarketplace } from "../components/labor/ServiceMarketplace";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Globe, Layers, Shield, Zap, HeartPulse, Scale, Building2 } from "lucide-react";

export default function NationalPlatformHome() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-violet-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Globe className="w-4 h-4"/> المنصة الوطنية الرقمية للعمل — National Platform</div>
        <h1 className="text-2xl font-black mt-1">منصة واحدة • نسيج واحد • حقيقة واحدة</h1>
        <p className="text-sm text-blue-100 mt-1">Law First → Data Once → Workflow Everywhere → AI Assists → Human Governs → Everything Auditable</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge className="bg-white text-slate-900">تكامل عميق</Badge>
          <Badge className="bg-emerald-500">Zero Trust</Badge>
          <Badge className="bg-amber-500">Offline Ready</Badge>
          <Badge variant="outline" className="text-white border-white/30">RAG Explainable</Badge>
          <Badge variant="outline" className="text-white border-white/30">CorrelationId Everywhere</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <NationalLaborGraph />
          <UnifiedSearch />
          <AICopilot />
          <AICopilotV2 />
        </div>
        <div className="space-y-6">
          <SecurityCenter />
          <ServiceMarketplace />
          <Card>
            <div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-600"/> الأداء العالمي</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><Zap className="w-5 h-5 mx-auto text-amber-600"/><div className="font-bold">20.4s</div><div>بناء الإنتاج</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><Globe className="w-5 h-5 mx-auto text-blue-600"/><div className="font-bold">77</div><div>حزمة</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><Shield className="w-5 h-5 mx-auto text-emerald-600"/><div className="font-bold">200/min</div><div>RateLimit</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><HeartPulse className="w-5 h-5 mx-auto text-rose-600"/><div className="font-bold">Offline</div><div>Field Mode</div></div>
              </div>
              <div className="text-[11px] text-muted-foreground">Pagination + Cursor + Projection + Indexes + Caching + Async Jobs + Debounce + Virtualization — لا N+1، لا تحميل آلاف السجلات في dropdown</div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2"><Scale className="w-5 h-5 text-slate-700"/> الضمانات الحكومية</div>
              <ul className="text-xs space-y-1 list-disc pr-4 text-muted-foreground">
                <li>AI لا يصدر حكماً نهائياً — الإنسان يقرر</li>
                <li>Risk ≠ عقوبة إلا بنص نظامي</li>
                <li>كل قرار يوضح: لماذا + الأساس + النسخة + التاريخ</li>
                <li>البيانات التاريخية محفوظة مع المصدر والتحويل</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="p-5">
          <div className="font-bold text-sm flex items-center gap-2"><Building2 className="w-5 h-5"/> بوابة التكامل — Integration Gateway</div>
          <div className="text-xs text-muted-foreground mt-1">10 واجهات موحدة مع Versioning + OpenAPI + CorrelationId + RBAC + RateLimit</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['/api/v1/persons','/api/v1/establishments','/api/v1/workers','/api/v1/contracts','/api/v1/inspections','/api/v1/cases','/api/v1/unions','/api/v1/legal/sources','/api/v1/regulatory','/api/v1/search'].map(p=> <Badge key={p} variant="outline" className="font-mono text-[10px]">{p}</Badge>)}
          </div>
        </div>
      </Card>
    </div>
  );
}
