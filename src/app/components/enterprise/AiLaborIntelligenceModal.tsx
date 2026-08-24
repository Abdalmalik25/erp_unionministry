/**
 * AiLaborIntelligenceModal — نافذة الذكاء الاصطناعي لاستشراف سوق العمل وتحليل المخاطر
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 */
import { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, X, RefreshCw, BrainCircuit } from 'lucide-react';
import { fetchLaborMarketInsights, LaborMarketInsights } from '../../utils/aiRiskEngine';
import { usePolicy } from '../../hooks/usePolicy';
interface Props {
    isOpen: boolean;
    onClose: () => void;
}
export function AiLaborIntelligenceModal({ isOpen, onClose }: Props) {
const [insights, setInsights] = useState<LaborMarketInsights | null>(null);
const [loading, setLoading] = useState(true);
const policy = usePolicy();
    const loadData = async () => {
        setLoading(true);
        const data = await fetchLaborMarketInsights();
        setInsights(data);
        setLoading(false);
    };
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-5xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right" dir="rtl">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600/15 via-purple-600/10 to-transparent border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <BrainCircuit size={26}/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-heading">مركز الذكاء الاصطناعي لاستشراف سوق العمل والامتثال</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-500/20">
                  AI-LaborBrain v2.5
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                التحليل التنبؤي لبيانات المنشآت، كوتة اليمننة، مؤشرات السلامة المهنية، والطلب المستقبلي على المهن
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X size={20}/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
          {loading ? (<div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-semibold text-muted-foreground">جاري استدعاء ومعالجة النماذج التنبؤية بالذكاء الاصطناعي...</p>
            </div>) : insights ? (<>
              {/* Macro Indicators Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">مؤشر اليمننة الوطني</span>
                  <h4 className="text-2xl font-black text-emerald-600">{insights.macro_indicators.national_yemenization_index}%</h4>
                  <p className="text-[11px] text-muted-foreground">المستهدف القانوني: {policy.yemenizationMinRatio}%</p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">استقرار الأجور والرواتب</span>
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-2xl font-black text-indigo-600">{insights.macro_indicators.average_wage_stability_index}%</h4>
                    <span className="text-[11px] text-indigo-600 font-bold">مستقر</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">سلة الأجور المعيارية</p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">الامتثال للسلامة المهنية (OSH)</span>
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-2xl font-black text-amber-600">{insights.legal_compliance_health.osh_compliance_score}%</h4>
                    <span className="text-[11px] text-amber-600 font-bold">مطابق</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">وفق قانون العمل 5/1995</p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">العقود المكتوبة والموثقة</span>
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-2xl font-black text-blue-600">{insights.legal_compliance_health.written_contract_rate}%</h4>
                    <span className="text-[11px] text-blue-600 font-bold">مرتفع</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">المادة (45) من قانون العمل</p>
                </div>
              </div>

              {/* Sectors Growth & Demand Forecast */}
              <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600"/>
                    <span>توقعات الطلب والنمو المستقبلي على المهن التخصصية حسب القطاع</span>
                  </h4>
                  <span className="text-[11px] font-bold text-muted-foreground">الربع الثالث 2026</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.top_demanded_sectors.map((sec, idx) => (<div key={idx} className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-heading">{sec.sector}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">مستوى الطلب: <strong className="text-indigo-600">{sec.demand_level}</strong></p>
                      </div>
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {sec.growth_rate}
                      </span>
                    </div>))}
                </div>
              </div>

              {/* Prescriptive Strategic Recommendations */}
              <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600"/>
                  <span>توصيات الذكاء الاصطناعي الاستراتيجية لقيادة الوزارة ومفتشي العمل</span>
                </h4>
                <div className="space-y-2.5 text-xs text-foreground">
                  <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0"/>
                    <div>
                      <strong className="text-heading block mb-0.5">تكثيف حملات التفتيش الميداني على قطاع التشييد والمقاولات</strong>
                      <p className="text-muted-foreground">نظراً لارتفاع نسب المخاطر ومعدات الوقاية الشخصية PPE غير المكتملة في 18% من مواقع العمل.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0"/>
                    <div>
                      <strong className="text-heading block mb-0.5">توسيع برامج تدريب وتأهيل الكوادر الوطنية في مجالات الطاقة الشمسية والبرمجيات</strong>
                      <p className="text-muted-foreground">لمواكبة معدل النمو المتسارع (+24%) وسد الفجوة في الكوادر الفنية المعتمدة محلياً.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>) : (<div className="py-16 text-center text-muted-foreground">فشل استرداد بيانات الذكاء الاصطناعي</div>)}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <button onClick={loadData} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer">
            <RefreshCw size={13}/> تحديث النموذج التنبؤي
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer">
            إغلاق
          </button>
        </div>
      </div>
    </div>);
}
