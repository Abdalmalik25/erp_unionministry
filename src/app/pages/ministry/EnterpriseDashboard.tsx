/**
 * Enterprise Management Page
 * صفحة إدارة الكيانات المؤسسية
 */

import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { EnterpriseDashboard } from '../../components/enterprise/EnterpriseDashboard';
import { EntityTreeView } from '../../components/enterprise/EntityTreeView';
import { DynamicEntityForm } from '../../components/enterprise/DynamicEntityForm';
import {
  EntityType,
  Classification,
  EntityKPIs,
  EntityFilters,
  EntityTreeNode,
  OrganizationalEntity,
} from '../../types/entity';

export default function EnterpriseManagementPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'kanban' | 'map' | 'graph'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityTreeNode | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formEntityType, setFormEntityType] = useState<EntityType>('union');
  const [formClassification, setFormClassification] = useState<Classification>('labor');
  const [filters, setFilters] = useState<EntityFilters>({});

  // Mock KPIs data
  const kpis: EntityKPIs = {
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

  const handleCreateEntity = () => {
    setFormMode('create');
    setShowForm(true);
  };

  const handleEditEntity = (entity: EntityTreeNode) => {
    setSelectedEntity(entity);
    setFormMode('edit');
    setFormEntityType(entity.entityType);
    setFormClassification(entity.classification);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: Partial<OrganizationalEntity>) => {
    console.log('Form submitted:', data);
    // TODO: Implement API call to save entity
    setShowForm(false);
    setSelectedEntity(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedEntity(null);
  };

  const handleNodeClick = (entity: EntityTreeNode) => {
    setSelectedEntity(entity);
  };

  const handleRefresh = () => {
    // TODO: Implement data refresh
    console.log('Refreshing data...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1600px] mx-auto p-6 space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  إدارة الكيانات المؤسسية
                </h1>
                <p className="text-gray-600 mt-2">
                  نظام موحد لإدارة جميع الكيانات النقابية والمؤسسية
                </p>
              </div>
              <button
                onClick={handleCreateEntity}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
              >
                <Plus className="h-5 w-5" />
                <span>إضافة كيان جديد</span>
              </button>
            </div>
          </div>

          {/* Enterprise Dashboard */}
          <EnterpriseDashboard
            kpis={kpis}
            viewMode={viewMode}
            filters={filters}
            onViewModeChange={(mode) => setViewMode(mode as any)}
            onFilterChange={setFilters}
            onRefresh={handleRefresh}
          />

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tree View - 2/3 width */}
            <div className="lg:col-span-2">
              {viewMode === 'tree' ? (
                <EntityTreeView
                  expandLevel={2}
                  showActions={true}
                  draggable={true}
                  onNodeClick={handleNodeClick}
                />
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">عرض {viewMode}</p>
                    <p className="text-sm mt-2">
                      سيتم عرض الكيانات بتنسيق {viewMode} هنا
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Entity Details Panel - 1/3 width */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                {selectedEntity ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <h3 className="font-semibold text-gray-900">تفاصيل الكيان</h3>
                      <button
                        onClick={() => handleEditEntity(selectedEntity)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        تعديل
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">الاسم</label>
                        <p className="font-medium text-gray-900">{selectedEntity.nameAr}</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">الرمز الموحد</label>
                        <p className="font-medium text-gray-900">{selectedEntity.unifiedCode}</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">النوع</label>
                        <p className="font-medium text-gray-900">
                          {selectedEntity.entityType === 'union' && 'نقابة'}
                          {selectedEntity.entityType === 'federation' && 'اتحاد'}
                          {selectedEntity.entityType === 'branch' && 'فرع'}
                          {selectedEntity.entityType === 'committee' && 'لجنة'}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">التصنيف</label>
                        <p className="font-medium text-gray-900">
                          {selectedEntity.classification === 'labor' && 'عمالية'}
                          {selectedEntity.classification === 'professional' && 'مهنية'}
                          {selectedEntity.classification === 'employers' && 'أصحاب أعمال'}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">الحالة</label>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            selectedEntity.status === 'active'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {selectedEntity.status === 'active' && 'نشط'}
                          {selectedEntity.status === 'suspended' && 'معلق'}
                          {selectedEntity.status === 'inactive' && 'متوقف'}
                        </span>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">الرئيس</label>
                        <p className="font-medium text-gray-900">
                          {selectedEntity.president.fullName}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">الهاتف</label>
                        <p className="font-medium text-gray-900">
                          {selectedEntity.contactInfo.phone}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">البريد الإلكتروني</label>
                        <p className="font-medium text-gray-900">
                          {selectedEntity.contactInfo.email}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">الموقع</label>
                        <p className="font-medium text-gray-900">
                          {selectedEntity.address.governorate}, {selectedEntity.address.city}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedEntity.memberCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">الأعضاء</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {selectedEntity.branchCount}
                          </p>
                          <p className="text-xs text-gray-500">الفروع</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedEntity.committeeCount}
                          </p>
                          <p className="text-xs text-gray-500">اللجان</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>اختر كياناً لعرض التفاصيل</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Entity Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <DynamicEntityForm
                entityType={formEntityType}
                classification={formClassification}
                mode={formMode}
                initialData={formMode === 'edit' ? selectedEntity || undefined : undefined}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            </div>
          </div>
        )}
      </div>
  );
}
