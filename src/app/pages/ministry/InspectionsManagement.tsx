/**
 * InspectionsManagement.tsx — Production-Grade Inspection Scheduling & Execution Management
 * Yemen National Labor Platform — Law 5/1995 & Law 23/1997 (OSH)
 * Ministry Workspace — Inspection Scheduler Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { inspectionService, type Inspection, type InspectionFilters } from '../../services/inspectionService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { useDebounce } from '../../hooks/useDebounce';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';

interface Filters {
  type: string[];
  status: string[];
  priority: string[];
  governorate: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const initialFilters: Filters = {
  type: [],
  status: [],
  priority: [],
  governorate: '',
  search: '',
  dateFrom: '',
  dateTo: '',
};

export function InspectionsManagement() {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const debouncedSearch = useDebounce(filters.search, 350);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  const canCreate = can('inspections:create');
  const canEdit = can('inspections:edit');
  const canExport = can('inspections:export');

  const loadInspections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inspectionService.listInspections({
        type: filters.type.length ? filters.type as any : undefined,
        status: filters.status.length ? filters.status as any : undefined,
        governorate: filters.governorate || undefined,
        search: debouncedSearch || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setInspections(response.data.inspections || []);
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          total: response.meta?.total || 0,
          totalPages: response.meta?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
      toast.error(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.status, filters.governorate, debouncedSearch, filters.dateFrom, filters.dateTo, pagination.page, pagination.limit, t]);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await inspectionService.getStatistics();
      setStatistics(stats.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, []);

  useEffect(() => {
    loadInspections();
    loadStatistics();
  }, [loadInspections, loadStatistics]);

  const handleRowClick = async (inspection: Inspection) => {
    try {
      const response = await inspectionService.getInspection(inspection.id);
      setSelectedInspection(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load inspection details:', error);
      toast.error(t('errors.load_failed'));
    }
  };

  const handleAssign = async (inspectionId: string, inspectorId: string) => {
    try {
      await inspectionService.assignInspector(inspectionId, inspectorId);
      toast.success(t('inspections.assigned'));
      loadInspections();
      loadStatistics();
    } catch (error) {
      console.error('Failed to assign inspector:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  const handleStart = async (inspectionId: string) => {
    try {
      await inspectionService.startInspection(inspectionId, {
        actualStartTime: new Date().toISOString(),
      });
      toast.success(t('inspections.started'));
      loadInspections();
    } catch (error) {
      console.error('Failed to start inspection:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      const blob = await inspectionService.exportInspections(filters as any, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspections-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('inspections.exported'));
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error(t('errors.export_failed'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('inspections.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('inspections.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                {t('common.filters')}
              </Button>
              {canExport && (
                <Button variant="outline" onClick={() => handleExport('xlsx')}>
                  {t('common.export')}
                </Button>
              )}
              {canCreate && (
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('inspections.schedule')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('inspections.total')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                {statistics.total}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('inspections.completed')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-green-600">
                {statistics.byStatus?.completed || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('inspections.violations_found')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-red-600">
                {statistics.violationsFound}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('inspections.compliance_rate')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-blue-600">
                {statistics.complianceRate}%
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('inspections.case_number')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('inspections.entity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('inspections.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('inspections.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('inspections.scheduled_date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('inspections.inspector')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6">
                      <TableSkeleton rows={5} columns={7} />
                      <p className="text-center text-sm text-muted-foreground mt-3" aria-live="polite">جاري تحميل عمليات التفتيش...</p>
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8">
                      <EmptyState
                        title={t('inspections.no_inspections')}
                        description="لم يتم العثور على عمليات تفتيش مطابقة. جرّب تغيير الفلاتر أو إنشاء تفتيش جديد."
                      />
                    </td>
                  </tr>
                ) : (
                  inspections.map((inspection) => (
                    <tr
                      key={inspection.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleRowClick(inspection)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {inspection.caseNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate">{inspection.entityName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {t(`inspections.type.${inspection.type}`)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={inspection.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inspection.schedule?.scheduledDate || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inspection.inspectorName || t('inspections.unassigned')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button variant="ghost" size="sm">
                          {t('common.view')}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.showing')} {(pagination.page - 1) * pagination.limit + 1} {t('common.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of')} {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedInspection && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInspection(null);
          }}
          title={`${selectedInspection.caseNumber} - ${selectedInspection.entityName}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('inspections.status')}</label>
                <div className="mt-1"><StatusBadge status={selectedInspection.status} /></div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('inspections.type')}</label>
                <div className="mt-1 text-gray-900">{t(`inspections.type.${selectedInspection.type}`)}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">{t('inspections.schedule')}</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">{t('inspections.date')}</div>
                    <div className="font-medium">{selectedInspection.schedule?.scheduledDate || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{t('inspections.time')}</div>
                    <div className="font-medium">{selectedInspection.schedule?.scheduledTime || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{t('inspections.duration')}</div>
                    <div className="font-medium">{selectedInspection.schedule?.duration || 60} {t('common.minutes')}</div>
                  </div>
                </div>
              </div>
            </div>

            {canEdit && selectedInspection.status === 'assigned' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => handleStart(selectedInspection.id)}>
                  {t('inspections.start')}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default InspectionsManagement;