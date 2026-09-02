/**
 * LaborDisputesManagement.tsx — Production-Grade Dispute Resolution Management Page
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * Ministry Workspace — Dispute Tribunal Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { disputeService, type LaborDispute, type DisputeFilters, type DisputeStatus, type DisputeCategory } from '../../services/disputeService';
import { crossPortalService } from '../../services/crossPortalService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';
import { analyzeDispute } from '../../utils/disputeExpertLogic';

interface Filters {
  status: DisputeStatus[];
  category: DisputeCategory[];
  priority: string[];
  governorate: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const initialFilters: Filters = {
  status: [],
  category: [],
  priority: [],
  governorate: '',
  search: '',
  dateFrom: '',
  dateTo: '',
};

export function LaborDisputesManagement() {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  // State
  const [disputes, setDisputes] = useState<LaborDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<LaborDispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // Permissions
  const canCreate = can('laborDisputes:create');
  const canEdit = can('laborDisputes:edit');
  const canResolve = can('laborDisputes:resolve');
  const canExport = can('laborDisputes:export');

  // Load disputes
  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await disputeService.listDisputes({
        status: filters.status.length ? filters.status : undefined,
        category: filters.category.length ? filters.category : undefined,
        governorate: filters.governorate || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setDisputes(response.data.disputes || []);
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          total: response.meta?.total || 0,
          totalPages: response.meta?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to load disputes:', error);
      toast.error(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, t]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await disputeService.getStatistics();
      setStatistics(stats.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
    loadStatistics();
  }, [loadDisputes, loadStatistics]);

  // Handle row click
  const handleRowClick = async (dispute: LaborDispute) => {
    try {
      const response = await disputeService.getDispute(dispute.id);
      setSelectedDispute(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load dispute details:', error);
      toast.error(t('errors.load_failed'));
    }
  };

  // Update status
  const handleUpdateStatus = async (disputeId: string, status: DisputeStatus, note?: string) => {
    try {
      await disputeService.updateStatus(disputeId, status, note);
      toast.success(t('disputes.status_updated'));
      loadDisputes();
      loadStatistics();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Assign dispute
  const handleAssign = async (disputeId: string, assignedTo: string) => {
    try {
      await disputeService.assignDispute(disputeId, assignedTo);
      toast.success(t('disputes.assigned'));
      loadDisputes();
    } catch (error) {
      console.error('Failed to assign dispute:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Export disputes
  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      const blob = await disputeService.exportDisputes({
        ...filters,
        priority: filters.priority.length ? filters.priority as any : undefined,
      }, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disputes-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('disputes.exported'));
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error(t('errors.export_failed'));
    }
  };

  // Category label
  const getCategoryLabel = (category: DisputeCategory) => {
    const labels: Record<DisputeCategory, string> = {
      wages: t('disputes.category.wages'),
      working_hours: t('disputes.category.working_hours'),
      work_conditions: t('disputes.category.work_conditions'),
      workplace_safety: t('disputes.category.workplace_safety'),
      termination: t('disputes.category.termination'),
      discrimination: t('disputes.category.discrimination'),
      harassment: t('disputes.category.harassment'),
      contract_violation: t('disputes.category.contract_violation'),
      OSH_violation: t('disputes.category.osh_violation'),
      union_rights: t('disputes.category.union_rights'),
      training_dispute: t('disputes.category.training_dispute'),
      other: t('disputes.category.other'),
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('disputes.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('disputes.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {t('common.filters')}
              </Button>
              {canExport && (
                <Button variant="outline" onClick={() => handleExport('xlsx')}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('common.export')}
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('disputes.new_dispute')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('disputes.total')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                {statistics.total}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('disputes.pending')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-yellow-600">
                {statistics.pendingCount}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('disputes.resolved')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-green-600">
                {statistics.resolvedCount}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('disputes.avg_resolution')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-blue-600">
                {statistics.averageResolutionDays} {t('common.days')}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('disputes.search')}
                </label>
                <Input
                  placeholder={t('disputes.search_placeholder')}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('disputes.governorate')}
                </label>
                <Input
                  placeholder={t('common.all_governorates')}
                  value={filters.governorate}
                  onChange={(e) => setFilters({ ...filters, governorate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('disputes.date_from')}
                </label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('disputes.date_to')}
                </label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFilters(initialFilters)}>
                {t('common.reset')}
              </Button>
              <Button onClick={() => setPagination(p => ({ ...p, page: 1 }))}>
                {t('common.apply_filters')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Disputes Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.case_number')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.priority')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الفحص الخبير
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.governorate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('disputes.created_at')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ) : disputes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {t('disputes.no_disputes')}
                    </td>
                  </tr>
                ) : (
                  disputes.map((dispute) => (
                    <tr
                      key={dispute.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(dispute)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {dispute.caseNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate">{dispute.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getCategoryLabel(dispute.category)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={dispute.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dispute.priority === 'urgent' || dispute.priority === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : dispute.priority === 'high'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {t(`disputes.priority.${dispute.priority}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const ex = analyzeDispute(dispute);
                          return (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ex.badge}`}
                              title={ex.drivers.join('، ') || ex.escalationRoute}
                            >
                              {ex.ageBandLabel} ({ex.daysOpen} يوماً)
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {dispute.governorate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(dispute.createdAt).toLocaleDateString('ar-YE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(dispute);
                          }}
                        >
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

      {/* Dispute Detail Modal */}
      {showDetailModal && selectedDispute && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDispute(null);
          }}
          title={`${selectedDispute.caseNumber} - ${selectedDispute.title}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('disputes.status')}
                </label>
                <div className="mt-1">
                  <StatusBadge status={selectedDispute.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('disputes.category')}
                </label>
                <div className="mt-1 text-gray-900 dark:text-white">
                  {getCategoryLabel(selectedDispute.category)}
                </div>
              </div>
            </div>

            {/* Parties */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                {t('disputes.parties')}
              </h3>
              <div className="space-y-2">
                {selectedDispute.parties?.map((party) => (
                  <div key={party.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t(`disputes.party_type.${party.type}`)}
                    </span>
                    <span className="text-gray-900 dark:text-white">{party.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{party.idNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                {t('disputes.timeline')}
              </h3>
              <div className="space-y-3">
                {selectedDispute.timeline?.map((event) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.date).toLocaleDateString('ar-YE')}
                      </div>
                      {event.description && (
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expert escalation panel */}
            {(() => {
              const ex = analyzeDispute(selectedDispute);
              return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفحص الخبير</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ex.badge}`}>
                      {ex.ageBandLabel} ({ex.daysOpen} يوماً منذ الإيداع)
                    </span>
                  </div>
                  {ex.drivers.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                      {ex.drivers.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="text-xs text-gray-500">مسار الإحالة المقترح: </span>{ex.escalationRoute}
                  </p>
                </div>
              );
            })()}

            {/* Actions */}
            {canEdit && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {selectedDispute.status === 'submitted' && (
                  <Button onClick={() => handleUpdateStatus(selectedDispute.id, 'acknowledged')}>
                    {t('disputes.acknowledge')}
                  </Button>
                )}
                {selectedDispute.status === 'under_review' && (
                  <>
                    <Button onClick={() => handleUpdateStatus(selectedDispute.id, 'mediation_scheduled')}>
                      {t('disputes.schedule_mediation')}
                    </Button>
                    <Button onClick={() => handleUpdateStatus(selectedDispute.id, 'arbitration_scheduled')}>
                      {t('disputes.schedule_arbitration')}
                    </Button>
                  </>
                )}
                {canResolve && (selectedDispute.status === 'mediation_concluded' || selectedDispute.status === 'arbitration_concluded') && (
                  <Button variant="primary" onClick={() => handleUpdateStatus(selectedDispute.id, 'resolved')}>
                    {t('disputes.mark_resolved')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default LaborDisputesManagement;
