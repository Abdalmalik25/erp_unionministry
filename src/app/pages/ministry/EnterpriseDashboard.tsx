/**
 * Enterprise Management Page
 * صفحة إدارة النقابات والمنظمات المؤسسية
 */
import { useState, useCallback, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { EnterpriseDashboard } from '../../components/enterprise/EnterpriseDashboard';
import { EntityTreeView } from '../../components/enterprise/EntityTreeView';
import { DynamicEntityForm } from '../../components/enterprise/DynamicEntityForm';
import { useApi } from '../../hooks/useApi';
import { toast } from '../../components/ui/Toast';
import { EntityType, Classification, EntityKPIs, EntityFilters, EntityTreeNode, OrganizationalEntity, } from '../../types/entity';
export default function EnterpriseManagementPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'kanban' | 'map' | 'graph'>('grid');
    const [showForm, setShowForm] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<EntityTreeNode | null>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [formEntityType, setFormEntityType] = useState<EntityType>('union');
    const [formClassification, setFormClassification] = useState<Classification>('labor');
    const [filters, setFilters] = useState<EntityFilters>({});
    const api = useApi();
    const [kpis, setKpis] = useState<EntityKPIs>({
        totalEntities: 0, activeEntities: 0, inactiveEntities: 0, suspendedEntities: 0,
        underReview: 0, compliantEntities: 0, nonCompliantEntities: 0, expiredLicenses: 0,
        dueSoonRenewals: 0, highRiskEntities: 0, criticalAlerts: 0, complianceRate: 0, growthRate: 0,
    });
    const loadStats = useCallback(async () => {
        try {
            const data = await fetch('/api/dashboard/enhanced-stats').then(r => r.ok ? r.json() : null);
            if (!data)
                return;
            setKpis({
                totalEntities: data.entities?.total || 0,
                activeEntities: data.entities?.active || 0,
                inactiveEntities: (data.entities?.total || 0) - (data.entities?.active || 0),
                suspendedEntities: 0,
                underReview: 0,
                compliantEntities: data.compliant?.total || 0,
                nonCompliantEntities: (data.entities?.total || 0) - (data.compliant?.total || 0),
                expiredLicenses: 0,
                dueSoonRenewals: 0,
                highRiskEntities: data.highRisk?.total || 0,
                criticalAlerts: data.alerts?.unresolved || 0,
                complianceRate: data.entities?.total ? Math.round(((data.compliant?.total || 0) / data.entities.total) * 1000) / 10 : 0,
                growthRate: 0,
            });
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    useEffect(() => { loadStats(); }, [loadStats]);
    const handleCreateEntity = () => { setFormMode('create'); setShowForm(true); };
    const handleEditEntity = (entity: EntityTreeNode) => {
        setSelectedEntity(entity);
        setFormMode('edit');
        setFormEntityType(entity.entityType);
        setFormClassification(entity.classification);
        setShowForm(true);
    };
    const handleFormSubmit = async (data: Partial<OrganizationalEntity>) => {
        try {
            if (formMode === 'create') {
                await api.execute('/entities', { method: 'POST', body: data });
                toast.success('تم إنشاء النقابة أو المنظمة بنجاح');
            }
            else if (selectedEntity) {
                await api.execute(`/entities/${(selectedEntity as any).id || selectedEntity.entityId}`, { method: 'PUT', body: data });
                toast.success('تم تحديث النقابة أو المنظمة بنجاح');
            }
            setShowForm(false);
            setSelectedEntity(null);
            handleRefresh();
        }
        catch (error) {
            toast.error(`فشل حفظ النقابة أو المنظمة: ${error instanceof Error ? error.message : 'خطأ'}`);
        }
    };
    const handleFormCancel = () => { setShowForm(false); setSelectedEntity(null); };
    const handleNodeClick = (entity: EntityTreeNode) => { setSelectedEntity(entity); };
    const handleRefresh = useCallback(async () => {
        try {
            await loadStats();
            toast.success('تم تحديث البيانات');
        }
        catch {
            toast.error('فشل تحديث البيانات');
        }
    }, [loadStats]);
    return (<div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-heading">الدليل المؤسسي الموحد (المنشآت والنقابات والاتحادات)</h1>
              <p className="text-muted-foreground mt-2">منظومة موحدة لحصر وهيكلة كافة المنشآت والشركات والنقابات المهنية والعمالية المسجلة</p>
            </div>
            <button onClick={handleCreateEntity} className="flex items-center gap-2 px-6 py-3 bg-primary-bright text-white rounded-lg hover:bg-primary transition-colors shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5"/><span>تسجيل منشأة / نقابة جديدة</span>
            </button>
          </div>
        </div>

        <EnterpriseDashboard kpis={kpis} viewMode={viewMode} filters={filters} onViewModeChange={(mode) => setViewMode(mode as any)} onFilterChange={setFilters} onRefresh={handleRefresh}/>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {viewMode === 'tree' ? (<EntityTreeView expandLevel={2} showActions={true} draggable={true} onNodeClick={handleNodeClick}/>) : (<div className="bg-card rounded-lg border border-border p-6">
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">عرض {viewMode}</p>
                  <p className="text-sm mt-2">سيتم عرض البيانات بتنسيق {viewMode} هنا</p>
                </div>
              </div>)}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-6">
              {selectedEntity ? (<div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="font-semibold text-heading">تفاصيل النقابة أو المنظمة</h3>
                    <button onClick={() => handleEditEntity(selectedEntity)} className="px-3 py-1 text-sm bg-primary-bright/10 text-primary-bright rounded hover:bg-primary-bright/20 transition-colors">تعديل</button>
                  </div>
                  <div className="space-y-3">
                    <div><label className="text-xs text-muted-foreground">الاسم</label><p className="font-medium text-heading">{selectedEntity.nameAr}</p></div>
                    <div><label className="text-xs text-muted-foreground">الرمز الموحد</label><p className="font-medium text-heading">{selectedEntity.unifiedCode}</p></div>
                    <div><label className="text-xs text-muted-foreground">النوع</label><p className="font-medium text-heading">{selectedEntity.entityType === 'union' ? 'نقابة' : selectedEntity.entityType === 'federation' ? 'اتحاد' : selectedEntity.entityType === 'branch' ? 'فرع' : 'لجنة'}</p></div>
                    <div><label className="text-xs text-muted-foreground">الحالة</label><span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${selectedEntity.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{selectedEntity.status === 'active' ? 'نشط' : selectedEntity.status === 'suspended' ? 'معلق' : 'متوقف'}</span></div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                      <div className="text-center"><p className="text-2xl font-bold text-primary-bright">{selectedEntity.memberCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">الأعضاء</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-success">{selectedEntity.branchCount}</p><p className="text-xs text-muted-foreground">الفروع</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-gold">{selectedEntity.committeeCount}</p><p className="text-xs text-muted-foreground">اللجان</p></div>
                    </div>
                  </div>
                </div>) : (<div className="text-center py-12 text-muted-foreground"><p>اختر كياناً لعرض التفاصيل</p></div>)}
            </div>
          </div>
        </div>
      </div>

      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {api.loading ? (<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary"/><span className="mr-3 text-muted-foreground">جاري الحفظ...</span></div>) : (<DynamicEntityForm entityType={formEntityType} classification={formClassification} mode={formMode} initialData={formMode === 'edit' ? selectedEntity || undefined : undefined} onSubmit={handleFormSubmit} onCancel={handleFormCancel}/>)}
          </div>
        </div>)}
    </div>);
}
