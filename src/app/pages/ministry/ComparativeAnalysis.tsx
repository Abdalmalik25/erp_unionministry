import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Download, GitCompare, ChevronDown, TrendingUp, TrendingDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { EntityTypeLabels } from '../../types/entity';

interface EntityOption {
  id: string;
  name_ar: string;
  entity_type?: string;
  governorate?: string;
  unified_code?: string;
}

interface EntityOverview {
  entity: Record<string, any>;
  stats: {
    members: { total: number; active: number };
    violations: { total: number; open: number };
    inspections: { total: number; completed: number };
    occupations: { total: number };
    licenses: { total: number; valid: number };
    dispatches: { total: number; active: number };
    riskAssessments: { total: number };
    complianceAlerts: { total: number; unresolved: number };
  };
}

type CompareField = {
  key: string;
  label: string;
  getValue: (s: EntityOverview['stats']) => number;
  higherIsBetter: boolean;
};

const COMPARE_FIELDS: CompareField[] = [
  { key: 'members', label: 'عدد الأعضاء', getValue: s => s.members.total, higherIsBetter: true },
  { key: 'violations', label: 'المخالفات', getValue: s => s.violations.total, higherIsBetter: false },
  { key: 'inspections', label: 'التفتيشات', getValue: s => s.inspections.total, higherIsBetter: true },
  { key: 'complianceRate', label: 'نسبة الامتثال %', getValue: s => s.members.total > 0 ? Math.round((s.members.active / s.members.total) * 100) : 0, higherIsBetter: true },
  { key: 'riskAssessments', label: 'تقييمات المخاطر', getValue: s => s.riskAssessments.total, higherIsBetter: false },
  { key: 'licenses', label: 'التراخيص الصالحة', getValue: s => s.licenses.valid, higherIsBetter: true },
];

const COLORS = ['#1E3A8A', '#D97706'];

function DiffIndicator({ val1, val2, higherIsBetter }: { val1: number; val2: number; higherIsBetter: boolean }) {
  const diff = val1 - val2;
  if (diff === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = diff > 0;
  const isGood = higherIsBetter ? positive : !positive;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${isGood ? 'text-success' : 'text-error'}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(diff).toLocaleString()}
    </span>
  );
}

export default function ComparativeAnalysis() {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [selectedId1, setSelectedId1] = useState('');
  const [selectedId2, setSelectedId2] = useState('');
  const [overview1, setOverview1] = useState<EntityOverview | null>(null);
  const [overview2, setOverview2] = useState<EntityOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(true);

  useEffect(() => {
    setLoadingEntities(true);
    fetch('/api/entities?limit=200')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setEntities(d.data || []))
      .catch(() => toast.error('خطأ في تحميل قائمة النقابات والمنظمات'))
      .finally(() => setLoadingEntities(false));
  }, []);

  const fetchOverview = (id: string) =>
    fetch(`/api/entities/${id}/overview`)
      .then(r => r.ok ? r.json() : Promise.reject());

  useEffect(() => {
    if (!selectedId1 || !selectedId2) { setOverview1(null); setOverview2(null); return; }
    if (selectedId1 === selectedId2) { toast.warning('الرجاء اختيار كيانين مختلفين'); return; }
    setLoading(true);
    Promise.all([fetchOverview(selectedId1), fetchOverview(selectedId2)])
      .then(([o1, o2]) => { setOverview1(o1); setOverview2(o2); })
      .catch(() => toast.error('خطأ في تحميل بيانات النقابة أو المنظمة'))
      .finally(() => setLoading(false));
  }, [selectedId1, selectedId2]);

  const chartData = useMemo(() => {
    if (!overview1 || !overview2) return [];
    return COMPARE_FIELDS.map(f => ({
      name: f.label,
      [overview1.entity.name_ar]: f.getValue(overview1.stats),
      [overview2.entity.name_ar]: f.getValue(overview2.stats),
    }));
  }, [overview1, overview2]);

  const handleExport = () => {
    if (!overview1 || !overview2) { toast.warning('الرجاء اختيار كيانين أولاً'); return; }
    const data = COMPARE_FIELDS.map(f => ({
      indicator: f.label,
      [overview1.entity.name_ar]: f.getValue(overview1.stats),
      [overview2.entity.name_ar]: f.getValue(overview2.stats),
      diff: Math.abs(f.getValue(overview1.stats) - f.getValue(overview2.stats)),
    }));
    exportReportToExcel({
      title: `مقارنة ${overview1.entity.name_ar} و ${overview2.entity.name_ar}`,
      reportType: 'statistics',
      data,
      columns: [
        { key: 'indicator', label: 'المقياس' },
        { key: overview1.entity.name_ar, label: overview1.entity.name_ar },
        { key: overview2.entity.name_ar, label: overview2.entity.name_ar },
        { key: 'diff', label: 'الفرق' },
      ],
      showGovernmentHeader: true,
    });
    toast.success('تم التصدير بنجاح');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="المقارنة التحليلية"
        subtitle="مقارنة شاملة بين كيانين لتحليل الأداء والمؤشرات"
        breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'المقارنة التحليلية' }]}
        actions={
          <button onClick={handleExport} disabled={!overview1 || !overview2}
            className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
        }
      />

      {/* Selectors */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'النقابة أو المنظمة الأول', value: selectedId1, onChange: setSelectedId1 },
            { label: 'النقابة أو المنظمة الثاني', value: selectedId2, onChange: setSelectedId2 },
          ].map((sel, idx) => (
            <div key={idx}>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">{sel.label}</label>
              <div className="relative">
                <select
                  value={sel.value}
                  onChange={e => sel.onChange(e.target.value)}
                  disabled={loadingEntities}
                  className="w-full appearance-none px-4 py-2.5 pl-10 border border-border rounded-lg text-sm bg-card text-heading focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{loadingEntities ? 'جاري التحميل...' : 'اختر كيان...'}</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name_ar} — {(EntityTypeLabels as Record<string, string>)[e.entity_type || ''] || e.entity_type || e.governorate}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Results */}
      {!loading && overview1 && overview2 && (
        <>
          {/* Entity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[overview1, overview2].map((ov, idx) => (
              <div key={idx} className={`bg-card rounded-xl border shadow-sm p-5 ${idx === 0 ? 'border-primary/30' : 'border-gold/30'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${idx === 0 ? 'bg-primary' : 'bg-gold'}`}>
                    {idx === 0 ? 'أ' : 'ب'}
                  </div>
                  <div>
                    <h3 className="font-bold text-heading text-sm">{ov.entity.name_ar}</h3>
                    <p className="text-xs text-muted-foreground">{(EntityTypeLabels as Record<string, string>)[ov.entity.entity_type || ''] || ov.entity.entity_type} · {ov.entity.governorate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'أعضاء', v: ov.stats.members.total, c: 'text-primary' },
                    { l: 'مخالفات', v: ov.stats.violations.total, c: 'text-error' },
                    { l: 'تفتيشات', v: ov.stats.inspections.total, c: 'text-teal' },
                    { l: 'رخص صالحة', v: ov.stats.licenses.valid, c: 'text-success' },
                    { l: 'رساليات', v: ov.stats.dispatches.total, c: 'text-warning' },
                    { l: 'مخاطر', v: ov.stats.riskAssessments.total, c: 'text-gold' },
                  ].map(s => (
                    <div key={s.l} className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className={`text-lg font-black ${s.c}`}>{s.v}</p>
                      <p className="text-[10px] text-muted-foreground">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="font-bold text-heading text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> المقارنة البصرية
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey={overview1.entity.name_ar} fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                <Bar dataKey={overview2.entity.name_ar} fill={COLORS[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-bold text-heading text-sm">جدول المقارنة التفصيلي</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-4 py-2.5 text-right text-xs">المقياس</th>
                    <th className="px-4 py-2.5 text-center text-xs">{overview1.entity.name_ar}</th>
                    <th className="px-4 py-2.5 text-center text-xs">{overview2.entity.name_ar}</th>
                    <th className="px-4 py-2.5 text-center text-xs">الفرق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {COMPARE_FIELDS.map((f, i) => {
                    const v1 = f.getValue(overview1.stats);
                    const v2 = f.getValue(overview2.stats);
                    return (
                      <tr key={f.key} className={`${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'} hover:bg-accent transition-colors`}>
                        <td className="px-4 py-3 font-semibold text-heading text-xs">{f.label}</td>
                        <td className="px-4 py-3 text-center text-heading font-bold">{v1.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-heading font-bold">{v2.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <DiffIndicator val1={v1} val2={v2} higherIsBetter={f.higherIsBetter} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="font-bold text-heading text-sm mb-3">ملخص المقارنة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPARE_FIELDS.map(f => {
                const v1 = f.getValue(overview1.stats);
                const v2 = f.getValue(overview2.stats);
                const winner = v1 > v2 ? overview1.entity.name_ar : v2 > v1 ? overview2.entity.name_ar : null;
                return (
                  <div key={f.key} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-xs font-semibold text-heading">
                      {winner ? `${winner} ↑` : 'متساويان'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !overview1 && !overview2 && (
        <div className="text-center py-16">
          <GitCompare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold">اختر كيانين لبدء المقارنة التحليلية</p>
          <p className="text-xs text-muted-foreground/60 mt-1">ستظهر الرسم البياني والجدول التفصيلي بعد اختيار النقابة أو المنظمةين</p>
        </div>
      )}
    </div>
  );
}
