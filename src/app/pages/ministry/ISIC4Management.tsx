/**
 * ISIC4Management — إدارة تصنيف ISIC-4
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, RefreshCw, Building2, Factory, ShoppingCart, Truck, Banknote, Stethoscope, GraduationCap, Globe, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { toast } from 'sonner';
interface ISICClassification {
    id: string;
    isic_code: string;
    description_ar: string;
    description_en: string;
    section_code: string;
    section_name: string;
    sector: string;
    activity_type: string;
    level: string;
    enterprise_count: number;
}
const SECTOR_ICONS: Record<string, React.ElementType> = {
    agriculture: Factory, industry: Factory, construction: Building2,
    trade: ShoppingCart, transportation: Truck, tourism: Globe,
    technology: Globe, finance: Banknote, services: Globe,
    education: GraduationCap, healthcare: Stethoscope,
};
const LEVEL_LABELS: Record<string, string> = { section: 'قسم', division: 'قسم فرعي', group: 'مجموعة', class: 'فئة' };
export default function ISIC4Management() {
    const [classifications, setClassifications] = useState<ISICClassification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [sectorFilter, setSectorFilter] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [selectedItem, setSelectedItem] = useState<ISICClassification | null>(null);
    const fetchClassifications = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (levelFilter)
                params.set('level', levelFilter);
            if (sectorFilter)
                params.set('sector', sectorFilter);
            const r = await fetch(`/api/isic4?${params}`);
            if (r.ok) {
                const d = await r.json();
                setClassifications(d.data || []);
            }
            else {
                toast.error('فشل تحميل بيانات التصنيف');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بالخادم');
        }
        setLoading(false);
    }, [levelFilter, sectorFilter]);
    useEffect(() => { fetchClassifications(); }, [fetchClassifications]);
    const filtered = useMemo(() => {
        if (!searchQuery)
            return classifications;
        const q = searchQuery.toLowerCase();
        return classifications.filter(c => c.isic_code.toLowerCase().includes(q) ||
            c.description_ar.includes(q) ||
            c.description_en?.toLowerCase().includes(q));
    }, [classifications, searchQuery]);
    const sections = useMemo(() => {
        const map = new Map<string, {
            info: ISICClassification;
            divisions: ISICClassification[];
        }>();
        for (const c of filtered) {
            if (c.level === 'section') {
                map.set(c.section_code, { info: c, divisions: [] });
            }
            else if (c.level === 'division') {
                const sec = map.get(c.section_code);
                if (sec)
                    sec.divisions.push(c);
            }
        }
        return Array.from(map.entries());
    }, [filtered]);
    const toggleSection = (code: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(code))
                next.delete(code);
            else
                next.add(code);
            return next;
        });
    };
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="تصنيف ISIC-4" subtitle="التصنيف الدولي الموحد للأنشطة الاقتصادية"/>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="بحث بالكود أو الوصف..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"/>
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">جميع المستويات</option>
          <option value="section">قسم</option>
          <option value="division">قسم فرعي</option>
          <option value="group">مجموعة</option>
          <option value="class">فئة</option>
        </select>
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">جميع القطاعات</option>
          <option value="agriculture">زراعة</option>
          <option value="industry">صناعة</option>
          <option value="construction">بناء</option>
          <option value="trade">تجارة</option>
          <option value="transportation">نقل</option>
          <option value="technology">تقنية</option>
          <option value="finance">مالية</option>
          <option value="services">خدمات</option>
          <option value="education">تعليم</option>
          <option value="healthcare">صحة</option>
        </select>
        <button onClick={fetchClassifications} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{classifications.filter(c => c.level === 'section').length}</div>
          <div className="text-gray-500">أقسام رئيسية</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{classifications.filter(c => c.level === 'division').length}</div>
          <div className="text-gray-500">أقسام فرعية</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{classifications.reduce((sum, c) => sum + (c.enterprise_count || 0), 0)}</div>
          <div className="text-gray-500">إجمالي المنشآت</div>
        </div>
      </div>

      {loading ? (<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>) : sections.length === 0 ? (<div className="bg-white border rounded-xl p-12 text-center text-gray-500">لا توجد بيانات تصنيف</div>) : (<div className="space-y-2">
          {sections.map(([code, { info, divisions }]) => {
                const expanded = expandedSections.has(code);
                const Icon = SECTOR_ICONS[info.sector] || Globe;
                return (<div key={code} className="bg-white border rounded-xl overflow-hidden">
                <button onClick={() => toggleSection(code)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right">
                  {expanded ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                  <Icon className="w-5 h-5 text-blue-600"/>
                  <span className="font-mono text-sm font-bold text-blue-600">{code}</span>
                  <span className="font-medium flex-1">{info.description_ar}</span>
                  <span className="text-xs text-gray-400">{info.description_en}</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{divisions.length} فرعي</span>
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs">{info.enterprise_count || 0} منشأة</span>
                </button>
                {expanded && divisions.length > 0 && (<div className="border-t bg-gray-50">
                    {divisions.map(div => (<button key={div.id} onClick={() => setSelectedItem(div)} className="w-full flex items-center gap-3 px-12 py-2.5 hover:bg-white text-right text-sm border-b last:border-b-0">
                        <span className="font-mono text-xs text-gray-500 w-16">{div.isic_code}</span>
                        <span className="flex-1">{div.description_ar}</span>
                        <span className="text-xs text-gray-400 hidden md:block">{div.description_en}</span>
                        <span className="text-xs text-gray-500">{LEVEL_LABELS[div.level] || div.level}</span>
                      </button>))}
                  </div>)}
              </div>);
            })}
        </div>)}

      {/* Detail Modal */}
      {selectedItem && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{selectedItem.isic_code} — {selectedItem.description_ar}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">الكود:</span><span className="font-mono font-bold">{selectedItem.isic_code}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الوصف بالعربية:</span><span>{selectedItem.description_ar}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الوصف بالإنجليزية:</span><span>{selectedItem.description_en}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المستوى:</span><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{LEVEL_LABELS[selectedItem.level]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">القطاع:</span><span>{selectedItem.sector}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">نوع النشاط:</span><span>{selectedItem.activity_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">القسم الرئيسي:</span><span>{selectedItem.section_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">عدد المنشآت:</span><span className="font-bold text-green-600">{selectedItem.enterprise_count || 0}</span></div>
            </div>
          </div>
        </div>)}
    </div>);
}
