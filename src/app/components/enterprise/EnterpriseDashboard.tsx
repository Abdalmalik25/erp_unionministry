/**
 * Enterprise Dashboard Component
 * لوحة التحكم المؤسسية
 */
import { useState } from 'react';
import { Building2, Users, AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Grid3x3, LayoutList, Map, Network, Filter, Download, RefreshCw, } from 'lucide-react';
import { EntityKPIs, EntityFilters } from '../../types/entity';
interface EnterpriseDashboardProps {
    kpis: EntityKPIs;
    viewMode?: 'grid' | 'tree' | 'kanban' | 'map' | 'graph';
    filters?: EntityFilters;
    onViewModeChange?: (mode: string) => void;
    onFilterChange?: (filters: EntityFilters) => void;
    onRefresh?: () => void;
}
export function EnterpriseDashboard({ kpis, viewMode = 'grid', onViewModeChange, onRefresh, }: EnterpriseDashboardProps) {
    const [selectedView, setSelectedView] = useState(viewMode);
    const [showFilters, setShowFilters] = useState(false);
    const handleViewChange = (view: string) => {
        setSelectedView(view as typeof selectedView);
        onViewModeChange?.(view);
    };
    const mockKPIs: EntityKPIs = kpis || {
        totalEntities: 125,
        activeEntities: 98,
        inactiveEntities: 15,
        suspendedEntities: 8,
        underReview: 4,
        compliantEntities: 102,
        nonCompliantEntities: 18,
        expiredLicenses: 5,
        dueSoonRenewals: 12,
        highRiskEntities: 7,
        criticalAlerts: 3,
        complianceRate: 81.6,
        growthRate: 12.5,
    };
    const kpiCards = [
        {
            id: 'total',
            title: 'إجمالي المنشآت',
            value: mockKPIs.totalEntities,
            icon: Building2,
            color: 'blue',
            bgColor: 'bg-info/10',
            iconColor: 'text-primary-bright',
            trend: { value: mockKPIs.growthRate, isPositive: true },
        },
        {
            id: 'active',
            title: 'المنشآت النشطة',
            value: mockKPIs.activeEntities,
            icon: CheckCircle2,
            color: 'green',
            bgColor: 'bg-success/10',
            iconColor: 'text-success-dark',
            percentage: ((mockKPIs.activeEntities / mockKPIs.totalEntities) * 100).toFixed(1),
        },
        {
            id: 'compliance',
            title: 'نسبة الامتثال',
            value: `${mockKPIs.complianceRate}%`,
            icon: Users,
            color: 'emerald',
            bgColor: 'bg-success/10',
            iconColor: 'text-success-dark',
            trend: { value: 5.2, isPositive: true },
        },
        {
            id: 'suspended',
            title: 'معلقة',
            value: mockKPIs.suspendedEntities,
            icon: Clock,
            color: 'yellow',
            bgColor: 'bg-warning/10',
            iconColor: 'text-warning-dark',
            alert: mockKPIs.suspendedEntities > 5,
        },
        {
            id: 'non-compliant',
            title: 'مخالفة',
            value: mockKPIs.nonCompliantEntities,
            icon: AlertTriangle,
            color: 'orange',
            bgColor: 'bg-warning/10',
            iconColor: 'text-warning-dark',
            alert: mockKPIs.nonCompliantEntities > 10,
        },
        {
            id: 'critical',
            title: 'إنذارات حرجة',
            value: mockKPIs.criticalAlerts,
            icon: XCircle,
            color: 'red',
            bgColor: 'bg-error/10',
            iconColor: 'text-error',
            alert: mockKPIs.criticalAlerts > 0,
        },
        {
            id: 'expired',
            title: 'تراخيص منتهية',
            value: mockKPIs.expiredLicenses,
            icon: AlertTriangle,
            color: 'red',
            bgColor: 'bg-error/10',
            iconColor: 'text-error',
            alert: mockKPIs.expiredLicenses > 0,
        },
        {
            id: 'renewals',
            title: 'تجديدات قريبة',
            value: mockKPIs.dueSoonRenewals,
            icon: Clock,
            color: 'amber',
            bgColor: 'bg-warning/10',
            iconColor: 'text-warning-dark',
            alert: mockKPIs.dueSoonRenewals > 10,
        },
    ];
    const viewModes = [
        { id: 'grid', name: 'شبكة', icon: Grid3x3 },
        { id: 'tree', name: 'شجري', icon: LayoutList },
        { id: 'map', name: 'خريطة', icon: Map },
        { id: 'graph', name: 'رسم بياني', icon: Network },
    ];
    return (<div className="space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">لوحة التحكم المؤسسية</h2>
            <p className="text-muted-foreground mt-1">
              نظرة شاملة على جميع المنشآت المسجلة
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button onClick={onRefresh} className="p-2 hover:bg-accent rounded-lg transition-colors" title="تحديث البيانات">
              <RefreshCw className="h-5 w-5 text-muted-foreground"/>
            </button>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent/50 transition-colors">
              <Download className="h-4 w-4"/>
              <span>تصدير</span>
            </button>

            {/* Filters Button */}
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showFilters
            ? 'bg-primary-bright text-white'
            : 'border border-border text-foreground hover:bg-accent/50'}`}>
              <Filter className="h-4 w-4"/>
              <span>فلترة</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (<div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                نوع المنشأة
              </label>
              <select className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                <option value="">الكل</option>
                <option value="union">نقابة</option>
                <option value="organization">منظمة</option>
                <option value="federation">اتحاد</option>
                <option value="branch">فرع</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                التصنيف
              </label>
              <select className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                <option value="">الكل</option>
                <option value="labor">عمالية</option>
                <option value="professional">مهنية</option>
                <option value="employers">أصحاب أعمال</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                الحالة
              </label>
              <select className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                <option value="">الكل</option>
                <option value="active">نشط</option>
                <option value="suspended">معلق</option>
                <option value="inactive">متوقف</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                المحافظة
              </label>
              <select className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                <option value="">الكل</option>
                <option value="sanaa">أمانة العاصمة</option>
                <option value="aden">عدن</option>
                <option value="taiz">تعز</option>
                <option value="hodeidah">الحديدة</option>
              </select>
            </div>
          </div>)}
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (<div key={card.id} className={`${card.bgColor} rounded-lg p-6 border-2 ${card.alert ? 'border-error/25 shadow-error/10 shadow-lg' : 'border-transparent'} transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                  {card.percentage && (<span className="text-sm text-muted-foreground">
                      ({card.percentage}%)
                    </span>)}
                </div>
                {card.trend && (<div className={`flex items-center gap-1 mt-2 text-sm ${card.trend.isPositive ? 'text-success-dark' : 'text-error'}`}>
                    {card.trend.isPositive ? (<TrendingUp className="h-4 w-4"/>) : (<TrendingDown className="h-4 w-4"/>)}
                    <span>{card.trend.value}%</span>
                  </div>)}
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`}/>
              </div>
            </div>
          </div>))}
      </div>

      {/* View Mode Selector */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">عرض البيانات</h3>
          <div className="flex items-center gap-2">
            {viewModes.map((mode) => (<button key={mode.id} onClick={() => handleViewChange(mode.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${selectedView === mode.id
                ? 'bg-primary-bright text-white'
                : 'bg-muted text-foreground hover:bg-accent'}`}>
                <mode.icon className="h-4 w-4"/>
                <span>{mode.name}</span>
              </button>))}
          </div>
        </div>
      </div>

      {/* Content Area - Placeholder for different views */}
      <div className="bg-card rounded-lg border border-border p-6 min-h-96">
        <div className="text-center py-12 text-muted-foreground">
          <div className="mb-4">
            {selectedView === 'grid' && <Grid3x3 className="h-16 w-16 mx-auto text-muted-foreground"/>}
            {selectedView === 'tree' && <LayoutList className="h-16 w-16 mx-auto text-muted-foreground"/>}
            {selectedView === 'map' && <Map className="h-16 w-16 mx-auto text-muted-foreground"/>}
            {selectedView === 'graph' && <Network className="h-16 w-16 mx-auto text-muted-foreground"/>}
          </div>
          <p className="text-lg font-medium">عرض {viewModes.find(m => m.id === selectedView)?.name}</p>
          <p className="text-sm mt-2">سيتم عرض المنشآت بتنسيق {viewModes.find(m => m.id === selectedView)?.name} هنا</p>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gradient-to-r from-primary-bright to-primary rounded-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-100 text-sm mb-1">النشاط اللحظي</p>
            <p className="text-2xl font-bold">
              {mockKPIs.activeEntities} / {mockKPIs.totalEntities}
            </p>
            <p className="text-blue-100 text-xs mt-1">كيان نشط</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">معدل النمو</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              +{mockKPIs.growthRate}%
              <TrendingUp className="h-5 w-5"/>
            </p>
            <p className="text-blue-100 text-xs mt-1">خلال الشهر الماضي</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">الامتثال</p>
            <p className="text-2xl font-bold">{mockKPIs.complianceRate}%</p>
            <p className="text-blue-100 text-xs mt-1">
              {mockKPIs.compliantEntities} من {mockKPIs.totalEntities}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">يحتاج متابعة</p>
            <p className="text-2xl font-bold">
              {mockKPIs.criticalAlerts + mockKPIs.expiredLicenses}
            </p>
            <p className="text-blue-100 text-xs mt-1">إنذار + ترخيص منتهي</p>
          </div>
        </div>
      </div>
    </div>);
}
