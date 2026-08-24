/**
 * SelfAssessment — التقييم الذاتي لصاحب العمل
 * يكشف الفجوات قبل التفتيش، يحسب مؤشر جاهزية، ويولّد خطة تصحيح
 * مع رفع شواهد (صور/مستندات) لكل بند عبر EvidenceUploader
 */
import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";
import {
  ClipboardCheck, Award, TrendingDown, Wrench, UploadCloud, RotateCcw,
  AlertTriangle, CheckCircle2, MinusCircle,
} from "lucide-react";
import { EvidenceUploader } from "./EvidenceUploader";
import { usePolicy } from "../../hooks/usePolicy";

type Answer = 'yes' | 'partial' | 'no' | '';

interface Item {
  id: string;
  q: string;
  domain: string;
  /** الضابط الحكومي المرتبط إذا لم يُحقق البند */
  control: string;
}

/** يبني بنود التقييم مع حقن العتبة القانونية الحية لنسبة التوطين */
const buildItems = (yemenizationMinRatio: number): Item[] => [
  { id: 'contracts', domain: 'العقود', q: 'جميع العاملين لديهم عقود موثقة إلكترونياً سارية؟', control: 'مخالفة عدم توثيق — غرامة لكل عقد غير موثق' },
  { id: 'wage', domain: 'الأجور', q: 'صرف الأجور بانتظام وفق العقد مع كشف موثق؟', control: 'إحالة للصلح + تعليق خدمات المنشأة' },
  { id: 'yemenization', domain: 'اليمننة', q: `نسبة التوظيف اليمني تحقق الحد الأدنى (${yemenizationMinRatio}%) في مهنك؟`, control: 'رفض تراخيص الوافدين الجديدة' },
  { id: 'insurance', domain: 'التأمينات', q: 'مساهمات التأمينات الاجتماعية مسددة دون متأخرات؟', control: 'تعليق المعاملات حتى السداد' },
  { id: 'safety', domain: 'السلامة', q: 'معدات الوقاية متوفرة والعمال مدرّبون على استخدامها؟', control: 'مخالفة سلامة جسيمة — إمكانية إيقاف النشاط' },
  { id: 'fitness', domain: 'اللياقة', q: 'شهادات اللياقة الصحية سارية لجميع العاملين؟', control: 'مخالفة توظيف غير لائق صحياً' },
  { id: 'records', domain: 'السجلات', q: 'سجلات الدوام والإجازات والجزاءات محفوظة ومحدثة؟', control: 'مخالفة نقص سجلات + صعوبة دفاعك بالنزاعات' },
  { id: 'injury-log', domain: 'السلامة', q: 'سجل الإصابات المهنية محدث والحوادث مُبلّغ عنها خلال 48 ساعة؟', control: 'غرامة عدم إبلاغ + تحقيق رسمي' },
  { id: 'training', domain: 'التدريب', q: 'برنامج تدريب وتأهيل دوري للعاملين؟', control: 'خصم من مؤشر الامتثال والتميز' },
  { id: 'disputes', domain: 'النزاعات', q: 'لا توجد شكاوى عاملين بدون رد ضمن مهلة SLA؟', control: 'تصعيد تلقائي للجان التحكيم' },
];

const SCORE: Record<Exclude<Answer, ''>, number> = { yes: 2, partial: 1, no: 0 };

function levelOf(pct: number) {
  if (pct >= 90) return { label: 'ذهبي — جاهزية استثنائية', cls: 'bg-amber-400 text-slate-900', icon: Award };
  if (pct >= 75) return { label: 'أخضر — جاهز للتفتيش', cls: 'bg-emerald-600 text-white', icon: CheckCircle2 };
  if (pct >= 50) return { label: 'برتقالي — فجوات قابلة للتصحيح', cls: 'bg-amber-500 text-white', icon: MinusCircle };
  return { label: 'أحمر — مخاطر عالية قبل أي زيارة', cls: 'bg-rose-600 text-white', icon: AlertTriangle };
}

export function SelfAssessment() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const policy = usePolicy();
  const ITEMS = buildItems(policy.yemenizationMinRatio);

  const answered = Object.values(answers).filter(a => a !== '').length as number;
  const total = ITEMS.reduce((s, it) => s + (SCORE[(answers[it.id] || '') as Exclude<Answer, ''>] ?? 0), 0);
  const maxScore = ITEMS.length * 2;
  const pct = Math.round((total / maxScore) * 100);
  const level = levelOf(pct);

  const gaps = useMemo(() => ITEMS.filter(it => (answers[it.id] || '') !== 'yes'), [answers]);
  const set = (id: string, v: Answer) => {
    setAnswers(p => ({ ...p, [id]: v }));
    setSubmitted(false);
  };

  const domains = [...new Set(ITEMS.map(i => i.domain))];

  return (
    <div className="space-y-4">
      {/* المؤشر */}
      <Card>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-sm flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-600" /> مؤشر الجاهزية الذاتي</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">أجب عن {ITEMS.length} بنداً ({answered}/{answered === ITEMS.length ? 'مكتمل' : `${ITEMS.length}`}) — نعم=2 • جزئياً=1 • لا=0</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={`text-2xl font-black px-3 py-1 rounded-xl ${level.cls}`}>{pct}%</div>
              <p className="text-[10px] font-bold mt-1">{level.label}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }} aria-label="إعادة ضبط التقييم">
              <RotateCcw className="w-3 h-3 ml-1" /> تصفير
            </Button>
          </div>
        </div>
        {/* شريط التقدم */}
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full mx-4 mb-4 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {/* الأسئلة حسب المجال */}
      {domains.map(domain => (
        <Card key={domain}>
          <div className="p-4 space-y-2.5">
            <p className="font-bold text-xs text-muted-foreground">المجال: {domain}</p>
            {ITEMS.filter(i => i.domain === domain).map(item => (
              <div key={item.id} className={`border rounded-xl p-3 transition-colors ${(answers[item.id] || '') !== '' ? 'border-slate-200 dark:border-slate-800' : 'border-dashed'}`}>
                <p className="text-xs font-semibold leading-relaxed mb-2">{item.q}</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex rounded-lg border overflow-hidden text-[11px] font-bold" role="group" aria-label={`تقييم: ${item.q}`}>
                    {([['yes', 'نعم', 'text-emerald-600'], ['partial', 'جزئياً', 'text-amber-600'], ['no', 'لا', 'text-rose-600']] as const).map(([v, label, color]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set(item.id, v as Answer)}
                        aria-pressed={answers[item.id] === v}
                        className={`px-3 py-1.5 transition-colors cursor-pointer ${answers[item.id] === v ? `${color} bg-current/10` : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEvidenceFor(evidenceFor === item.id ? null : item.id)}
                    aria-expanded={evidenceFor === item.id}
                    className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${evidenceFor === item.id ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'}`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> {evidenceFor === item.id ? 'إخفاء الرفع' : 'رفع شواهد لهذا البند'}
                  </button>
                </div>
                {evidenceFor === item.id && (
                  <div className="mt-2">
                    <EvidenceUploader contextId={`self-assess:${item.id}`} compact />
                  </div>
                )}
                {submitted && (answers[item.id] || '') !== 'yes' && (
                  <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-start gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> إن أُهمل هذا البند: {item.control}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* النتيجة وخطة التصحيح */}
      {answered > 0 && (
        <Card>
          <div className="p-4 space-y-3">
            <Button className="w-full" variant={pct >= 75 ? 'success' : 'gold'} onClick={() => setSubmitted(true)} disabled={answered < ITEMS.length}>
              {answered < ITEMS.length ? `أكمل باقي البنود (${ITEMS.length - answered} متبقٍ)` : submitted ? 'خطة التصحيح أدناه ↓' : 'احسب نتيجتي وولّد خطة التصحيح'}
            </Button>

            {submitted && gaps.length > 0 && (
              <div className="space-y-2">
                <p className="font-bold text-xs flex items-center gap-1.5"><Wrench className="w-4 h-4 text-amber-600" /> خطة التصحيح المقترحة ({gaps.length} بنود) — مرتبة بالأثر</p>
                {gaps.sort((a, b) => (SCORE[(answers[a.id] || '') as 'no'] ?? 0) - (SCORE[(answers[b.id] || '') as 'no'] ?? 0)).map((g, i) => (
                  <div key={g.id} className="border rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{i + 1}. {g.q}</span>
                      {(answers[g.id] || '') === 'no' && <Badge variant="destructive">حرج</Badge>}
                      {(answers[g.id] || '') === 'partial' && <Badge variant="secondary">تحسين مطلوب</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground"><TrendingDown className="w-3 h-3 inline -mt-0.5" /> الإجراء: صدّر شواهد الإصلاح عبر «رفع شواهد» أعلاه — تُحدَّث نقاط امتثالك فور اعتمادها</p>
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">إن أُهمل: {g.control}</p>
                  </div>
                ))}
              </div>
            )}

            {submitted && gaps.length === 0 && (
              <div className="border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
                <Award className="w-8 h-8 mx-auto text-amber-500 mb-1" />
                <p className="font-bold text-sm">امتثال ذاتي كامل — أنت جاهز لأي زيارة تفتيش!</p>
                <p className="text-[11px] text-muted-foreground mt-1">احتفظ بشواهدك مرفوعة؛ عند التفتيش يُكتفى بالتحقق منها بدل الحصر الميداني الكامل.</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
