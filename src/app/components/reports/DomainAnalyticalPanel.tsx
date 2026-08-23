import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { translateStatus } from '../ui/designSystem';
import { EntityTypeLabels } from '../../types/entity';

const COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#D97706', '#0D9488', '#7C3AED', '#DC2626', '#059669', '#0891B2', '#CA8A04'];

const localize = (s: string): string => {
  const t = translateStatus(s);
  if (t !== s) return t;
  return (EntityTypeLabels as Record<string, string>)[s] || s;
};

function groupBy(data: any[], getKey: (r: any) => string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of data) { const k = (getKey(r) || '').trim() || 'غير محدد'; m[k] = (m[k] || 0) + 1; }
  return m;
}
function toData(m: Record<string, number>, top = 8): { name: string; value: number }[] {
  return Object.entries(m).map(([name, value]) => ({ name: localize(name), value })).sort((a, b) => b.value - a.value).slice(0, top);
}
const num = (v: any): number => (typeof v === 'number' ? v : parseFloat(v));
const avg = (xs: number[]): number => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const pct = (n: number, d: number): string => (d ? `${Math.round((n / d) * 100)}%` : '0%');
const monthKey = (d: string): string => (d && d.length >= 7 ? d.slice(0, 7) : 'غير محدد');

interface Kpi { label: string; value: string; color: string; }
interface ChartSpec { title: string; data: { name: string; value: number }[]; kind: 'pie' | 'bar'; }
interface Insight { label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'info'; }

export function DomainAnalyticalPanel({ domain, data, professions = [] }: { domain: string; data: any[]; professions?: any[] }) {
  const profName = useMemo(() => {
    const m: Record<string, string> = {};
    professions.forEach(p => { m[p.id] = p.name_ar || p.name || p.id; });
    return m;
  }, [professions]);

  const model = useMemo<{ kpis: Kpi[]; charts: ChartSpec[]; insights: Insight[] }>(() => {
    const rows = data || [];
    if (domain === 'commercial') {
      const total = rows.length;
      const active = rows.filter(r => r.status === 'active').length;
      const workers = rows.map(r => num(r.employees_count) || num(r.total_workers) || 0).filter(n => !isNaN(n));
      const compliant = rows.filter(r => r.compliance_status === 'compliant').length;
      const byStatus = toData(groupBy(rows, r => r.status));
      const bySector = toData(groupBy(rows, r => r.sector));
      const byGov = toData(groupBy(rows, r => r.governorate));
      const topEmployer = rows.slice().sort((a, b) => (num(b.employees_count) || 0) - (num(a.employees_count) || 0))[0];
      return {
        kpis: [
          { label: 'إجمالي المنشآت', value: String(total), color: 'text-primary' },
          { label: 'نشطة', value: pct(active, total), color: 'text-success' },
          { label: 'إجمالي العمالة', value: workers.reduce((a, b) => a + b, 0).toLocaleString('ar-YE'), color: 'text-gold' },
          { label: 'ملتزمة', value: compliant ? pct(compliant, total) : '—', color: 'text-info' },
        ],
        charts: [
          { title: 'التوزيع حسب القطاع', data: bySector, kind: 'bar' },
          { title: 'التوزيع الجغرافي', data: byGov, kind: 'pie' },
          { title: 'التوزيع حسب الحالة', data: byStatus, kind: 'pie' },
        ],
        insights: [
          { label: 'أكثر القطاعات نشاطاً', value: bySector[0]?.name || '—', tone: 'info' },
          { label: 'أعلى منشأة توظيفاً', value: topEmployer ? `${(topEmployer.name_ar || topEmployer.name || '—')} (${num(topEmployer.employees_count) || 0})` : '—', tone: 'good' },
          { label: 'نسبة النشطة', value: pct(active, total), tone: active / Math.max(total, 1) > 0.7 ? 'good' : 'warn' },
        ],
      };
    }

    if (domain === 'professions') {
      const total = rows.length;
      const technical = rows.filter(r => r.is_technical).length;
      const byMajor = toData(groupBy(rows, r => r.major_group_name || r.major_group));
      const bySector = toData(groupBy(rows, r => r.sector));
      const byHazard = toData(groupBy(rows, r => r.hazard_level));
      const demandHigh = rows.filter(r => r.demand_level === 'high' || r.demand_level === 'مرتفع').length;
      return {
        kpis: [
          { label: 'إجمالي المهن', value: String(total), color: 'text-primary' },
          { label: 'مهن تقنية', value: pct(technical, total), color: 'text-success' },
          { label: 'طلب مرتفع', value: String(demandHigh), color: 'text-gold' },
          { label: 'مستويات خطورة', value: String(byHazard.length), color: 'text-info' },
        ],
        charts: [
          { title: 'حسب المجموعة الرئيسية', data: byMajor, kind: 'bar' },
          { title: 'حسب القطاع', data: bySector, kind: 'pie' },
          { title: 'حسب مستوى الخطورة OSH', data: byHazard, kind: 'pie' },
        ],
        insights: [
          { label: 'أكبر مجموعة مهنية', value: byMajor[0]?.name || '—', tone: 'info' },
          { label: 'المهن الأعلى طلباً', value: String(demandHigh), tone: 'good' },
          { label: 'القطاع الأوسع', value: bySector[0]?.name || '—', tone: 'warn' },
        ],
      };
    }

    if (domain === 'inspections') {
      const total = rows.length;
      const scores = rows.map(r => num(r.overall_score)).filter(n => !isNaN(n));
      const avgScore = avg(scores);
      const compliant = rows.filter(r => r.compliance_status === 'compliant').length;
      const failed = rows.filter(r => r.compliance_status === 'non_compliant').length;
      const byStatus = toData(groupBy(rows, r => r.compliance_status));
      const byType = toData(groupBy(rows, r => r.inspection_type));
      const byMonth = toData(groupBy(rows, r => monthKey(r.inspection_date)), 12);
      const best = rows.slice().sort((a, b) => (num(b.overall_score) || 0) - (num(a.overall_score) || 0))[0];
      const worst = rows.slice().sort((a, b) => (num(a.overall_score) || 0) - (num(b.overall_score) || 0))[0];
      return {
        kpis: [
          { label: 'إجمالي التفتيشات', value: String(total), color: 'text-primary' },
          { label: 'متوسط الامتثال', value: `${avgScore}%`, color: avgScore >= 80 ? 'text-success' : 'text-warn' },
          { label: 'منشآت ملتزمة', value: pct(compliant, total), color: 'text-success' },
          { label: 'غير ملتزمة', value: pct(failed, total), color: 'text-error' },
        ],
        charts: [
          { title: 'حسب حالة الامتثال', data: byStatus, kind: 'pie' },
          { title: 'حسب نوع التفتيش', data: byType, kind: 'bar' },
          { title: 'شهرياً', data: byMonth, kind: 'bar' },
        ],
        insights: [
          { label: 'أعلى امتثال', value: best ? `${(best.enterprise_name || best.entity_name || '—')} (${num(best.overall_score) || 0}%)` : '—', tone: 'good' },
          { label: 'أدنى امتثال', value: worst ? `${(worst.enterprise_name || worst.entity_name || '—')} (${num(worst.overall_score) || 0}%)` : '—', tone: 'bad' },
          { label: 'نسبة الامتثال العام', value: pct(compliant, total), tone: compliant / Math.max(total, 1) > 0.7 ? 'good' : 'warn' },
        ],
      };
    }

    if (domain === 'evaluations') {
      const total = rows.length;
      const valid = rows.filter(r => r.status === 'valid').length;
      const scores = rows.map(r => num(r.overall_score)).filter(n => !isNaN(n));
      const avgScore = avg(scores);
      const assessed = rows.filter(r => r.assessed_against_standards === true).length;
      const labor = avg(rows.map(r => num(r.labor_law_compliance)).filter(n => !isNaN(n)));
      const safety = avg(rows.map(r => num(r.safety_compliance)).filter(n => !isNaN(n)));
      const byStatus = toData(groupBy(rows, r => r.status));
      const byAssessed = toData(groupBy(rows, r => r.assessed_against_standards === true ? 'مُقيّمة بمعايير' : 'غير مُقيّمة'));
      const byProf = toData(groupBy(rows, r => profName[r.profession_id] || r.profession_id || 'غير مربوط'));
      const best = rows.slice().sort((a, b) => (num(b.overall_score) || 0) - (num(a.overall_score) || 0))[0];
      return {
        kpis: [
          { label: 'إجمالي الشهادات', value: String(total), color: 'text-primary' },
          { label: 'صالحة', value: pct(valid, total), color: 'text-success' },
          { label: 'متوسط الدرجة', value: `${avgScore}%`, color: avgScore >= 80 ? 'text-success' : 'text-warn' },
          { label: 'مُقيّمة بمعايير', value: pct(assessed, total), color: 'text-info' },
        ],
        charts: [
          { title: 'حسب الحالة', data: byStatus, kind: 'pie' },
          { title: 'الارتباط بالمعايير', data: byAssessed, kind: 'pie' },
          { title: 'حسب المهنة', data: byProf, kind: 'bar' },
        ],
        insights: [
          { label: 'متوسط امتثال قانون العمل', value: `${labor}%`, tone: labor >= 80 ? 'good' : 'warn' },
          { label: 'متوسط امتثال OSH', value: `${safety}%`, tone: safety >= 80 ? 'good' : 'warn' },
          { label: 'أعلى تقييماً', value: best ? `${(best.enterprise_name || '—')} (${num(best.overall_score) || 0}%)` : '—', tone: 'good' },
        ],
      };
    }

    if (domain === 'unions') {
      const total = rows.length;
      const active = rows.filter(r => r.status === 'active').length;
      const members = rows.map(r => num(r.member_count) || num(r.memberCount) || 0).filter(n => !isNaN(n));
      const totalMembers = members.reduce((a, b) => a + b, 0);
      const compliant = rows.filter(r => (r.complianceStatus || r.compliance_status) === 'compliant').length;
      const byType = toData(groupBy(rows, r => r.entity_type || r.entityType));
      const byGov = toData(groupBy(rows, r => r.governorate));
      const byCompliance = toData(groupBy(rows, r => (r.complianceStatus || r.compliance_status) || 'غير محدد'));
      const top = rows.slice().sort((a, b) => (num(b.member_count) || num(b.memberCount) || 0) - (num(a.member_count) || num(a.memberCount) || 0))[0];
      return {
        kpis: [
          { label: 'إجمالي النقابات', value: String(total), color: 'text-primary' },
          { label: 'نشطة', value: pct(active, total), color: 'text-success' },
          { label: 'إجمالي المنتسبين', value: totalMembers.toLocaleString('ar-YE'), color: 'text-gold' },
          { label: 'ملتزمة', value: compliant ? pct(compliant, total) : '—', color: 'text-info' },
        ],
        charts: [
          { title: 'حسب المستوى النقابي', data: byType, kind: 'pie' },
          { title: 'التوزيع الجغرافي', data: byGov, kind: 'bar' },
          { title: 'حسب الامتثال', data: byCompliance, kind: 'pie' },
        ],
        insights: [
          { label: 'الأكثر انتساباً', value: top ? `${(top.name_ar || top.name || '—')} (${num(top.member_count) || num(top.memberCount) || 0})` : '—', tone: 'good' },
          { label: 'الأوسع انتشاراً', value: byType[0]?.name || '—', tone: 'info' },
          { label: 'نسبة الامتثال', value: pct(compliant, total), tone: compliant / Math.max(total, 1) > 0.7 ? 'good' : 'warn' },
        ],
      };
    }

    if (domain === 'documents') {
      const total = rows.length;
      const approved = rows.filter(r => r.status === 'approved').length;
      const byStatus = toData(groupBy(rows, r => r.status));
      const byType = toData(groupBy(rows, r => r.type || r.doc_type));
      const byMonth = toData(groupBy(rows, r => monthKey(r.issueDate || r.issue_date)), 12);
      const byEntity = toData(groupBy(rows, r => r.entity_name || 'غير محدد'), 6);
      return {
        kpis: [
          { label: 'إجمالي المستندات', value: String(total), color: 'text-primary' },
          { label: 'معتمدة', value: pct(approved, total), color: 'text-success' },
          { label: 'أنواع المستندات', value: String(byType.length), color: 'text-info' },
          { label: 'جهات مصدرة', value: String(byEntity.length), color: 'text-gold' },
        ],
        charts: [
          { title: 'حسب الحالة', data: byStatus, kind: 'pie' },
          { title: 'حسب النوع', data: byType, kind: 'bar' },
          { title: 'شهرياً', data: byMonth, kind: 'bar' },
        ],
        insights: [
          { label: 'الأكثر إصداراً للمستندات', value: byEntity[0]?.name || '—', tone: 'good' },
          { label: 'نسبة المعتمدة', value: pct(approved, total), tone: approved / Math.max(total, 1) > 0.7 ? 'good' : 'warn' },
          { label: 'أبرز نوع مستند', value: byType[0]?.name || '—', tone: 'info' },
        ],
      };
    }

    return { kpis: [], charts: [], insights: [] };
  }, [domain, data, profName]);

  const toneClass: Record<string, string> = {
    good: 'bg-success/10 text-success border-success/30',
    warn: 'bg-warning/10 text-warning border-warning/30',
    bad: 'bg-error/10 text-error border-error/30',
    info: 'bg-info/10 text-info border-info/30',
  };

  if (!model.kpis.length) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {model.kpis.map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {model.charts.map(c => (
          <div key={c.title} className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-heading mb-2">{c.title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              {c.kind === 'pie' ? (
                <PieChart>
                  <Pie data={c.data} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {c.data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <BarChart data={c.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="العدد" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-heading mb-3">مؤشرات تقييمية</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {model.insights.map((ins, i) => (
            <div key={i} className={`rounded-lg border px-3 py-2 ${toneClass[ins.tone]}`}>
              <p className="text-xs opacity-80">{ins.label}</p>
              <p className="text-sm font-bold mt-0.5">{ins.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

