/**
 * NationalPlatformHome — الصفحة الوطنية الموحدة
 * الواجهة الرسمية للمنظومة الوطنية لإدارة Sector العمل
 */
import { NationalLaborGraph } from "../components/labor/NationalLaborGraph";
import { UnifiedSearch } from "../components/labor/UnifiedSearch";
import { AICopilot } from "../components/labor/AICopilot";
import { AICopilotV2 } from "../components/labor/AICopilotV2";
import { SecurityCenter } from "../components/labor/SecurityCenter";
import { ServiceMarketplace } from "../components/labor/ServiceMarketplace";
import { PlatformGuide } from "../components/national/PlatformGuide";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { PermissionGate } from "../hooks/usePermissions";
import { Globe, Layers, Shield, Zap, HeartPulse, Scale, Building2 } from "lucide-react";
import { NATIONAL_REGISTRIES, GUARANTEE_ITEMS } from "../content/institutional";

export default function NationalPlatformHome() {
  return (
    <PermissionGate permission="view.dashboard">
      <div className="space-y-6" dir="rtl">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Globe className="w-4 h-4"/> المنظومة الوطنية لإدارة Sector العمل — وزارة الشؤون الاجتماعية والعمل</div>
          <h1 className="text-2xl font-black mt-1">منصة واحدة • نسيج واحد • حقيقة واحدة</h1>
          <p className="text-sm text-slate-600 mt-1">نظام مرجعي موثوق: القرار وفق القانون، البيانات مرة واحدة ومصدرها رسمي، والإجراءات مكتملة التتبع والمساءلة</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-white text-slate-900">تكامل عميق</Badge>
            <Badge className="bg-emerald-500 text-slate-900">حماية قصوى</Badge>
            <Badge className="bg-amber-500 text-slate-900">يعمل دون اتصال</Badge>
            <Badge variant="outline" className="border-amber-400/30 text-amber-300">قرارات مفسَّرة ومعلَّلة</Badge>
            <Badge variant="outline" className="border-amber-400/30 text-amber-300">تتبع كامل للمعاملات</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <NationalLaborGraph />
            <UnifiedSearch />
            <AICopilot />
            <AICopilotV2 />
            <PlatformGuide />
          </div>
          <div className="space-y-6">
            <SecurityCenter />
            <ServiceMarketplace />
            <Card>
              <div className="p-5 space-y-3">
                <div className="font-bold text-sm flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-600"/> الأداء العالمي</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 border rounded-xl text-center"><Zap className="w-5 h-5 mx-auto text-amber-400"/><div className="font-bold">فورية</div><div>سرعة الاستجابة</div></div>
                  <div className="p-3 border rounded-xl text-center"><Globe className="w-5 h-5 mx-auto text-blue-500"/><div className="font-bold">موحدة</div><div>قواعد بيانات وطنية</div></div>
                  <div className="p-3 border rounded-xl text-center"><Shield className="w-5 h-5 mx-auto text-emerald-400"/><div className="font-bold">محصّنة</div><div>ضد الاستخدام المفرط</div></div>
                  <div className="p-3 border rounded-xl text-center"><HeartPulse className="w-5 h-5 mx-auto text-rose-400"/><div className="font-bold">ميداني</div><div>يعمل دون إنترنت</div></div>
                </div>
                <div className="text-[11px] text-slate-400">تصميم مؤسسي يضمن استرجاعاً فورياً للبيانات دون أي بطء أو انتظار، مهما كان حجم السجلات</div>
              </div>
            </Card>

            <Card>
              <div className="p-5 space-y-2">
                <div className="font-bold text-sm flex items-center gap-2"><Scale className="w-5 h-5 text-slate-500"/> الضمانات الحكومية</div>
                <ul className="text-xs space-y-1 list-disc pr-4 text-slate-400">
                  {GUARANTEE_ITEMS.map(g => <li key={g}>{g}</li>)}
                </ul>
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <div className="p-5">
            <div className="font-bold text-sm flex items-center gap-2"><Building2 className="w-5 h-5"/> سجلّات المنظومة الموحدة</div>
            <div className="text-xs text-slate-400 mt-1">عشر سجلات وطنية موحدة تعمل بقواعد موحدة وصلاحيات محددة وحماية من الاستخدام المفرط</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {NATIONAL_REGISTRIES.map(([name]) => <Badge key={name} variant="outline" className="text-[10px] text-slate-500">{name}</Badge>)}
            </div>
          </div>
        </Card>
      </div>
    </PermissionGate>
  );
}