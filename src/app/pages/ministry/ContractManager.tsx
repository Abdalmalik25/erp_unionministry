/**
 * ContractManager.tsx — Production-Grade Employment Contract Management Page
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * Ministry Workspace — Contract Lifecycle Management Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import {
  contractService,
  type Contract,
  type ContractFilters,
  type ContractStatus,
  type ContractType,
  type ContractWages,
  type ContractAmendment,
  type ContractTermination
} from '../../services/contractService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';

interface Filters {
  status: ContractStatus[];
  type: ContractType[];
  governorate: string;
  employerName: string;
  workerName: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const initialFilters: Filters = {
  status: [],
  type: [],
  governorate: '',
  employerName: '',
  workerName: '',
  search: '',
  dateFrom: '',
  dateTo: '',
};

export function ContractManager() {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  // State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // Permissions
  const canCreate = can('contracts:create');
  const canEdit = can('contracts:edit');
  const canApprove = can('contracts:approve');
  const canExport = can('contracts:export');

  // Load contracts
  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contractService.listContracts({
        status: filters.status.length ? filters.status : undefined,
        type: filters.type.length ? filters.type : undefined,
        governorate: filters.governorate || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setContracts(response.data.contracts || []);
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          total: response.meta?.total || 0,
          totalPages: response.meta?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
      toast.error(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, t]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await contractService.getStatistics();
      setStatistics(stats.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, []);

  useEffect(() => {
    loadContracts();
    loadStatistics();
  }, [loadContracts, loadStatistics]);

  // Handle row click
  const handleRowClick = async (contract: Contract) => {
    try {
      const response = await contractService.getContract(contract.id);
      setSelectedContract(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load contract details:', error);
      toast.error(t('errors.load_failed'));
    }
  };

  // Sign contract
  const handleSign = async (contractId: string) => {
    try {
      await contractService.signAsEmployer(contractId, { signatureImage: 'ministry_approver' });
      toast.success(t('contracts.signed'));
      loadContracts();
      loadStatistics();
    } catch (error) {
      console.error('Failed to sign contract:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Approve contract
  const handleApprove = async (contractId: string) => {
    try {
      await contractService.approveContract(contractId, { comments: 'Approved by ministry' });
      toast.success(t('contracts.approved'));
      loadContracts();
      loadStatistics();
    } catch (error) {
      console.error('Failed to approve contract:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Reject contract
  const handleReject = async (contractId: string, reason: string) => {
    try {
      await contractService.rejectContract(contractId, { reason });
      toast.success(t('contracts.rejected'));
      loadContracts();
      loadStatistics();
    } catch (error) {
      console.error('Failed to reject contract:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Terminate contract
  const handleTerminate = async (contractId: string, reason: string, noticeDate: string) => {
    try {
      await contractService.terminateContract(contractId, {
        terminationReason: reason,
        noticePeriod: 30,
      });
      toast.success(t('contracts.terminated'));
      loadContracts();
      loadStatistics();
    } catch (error) {
      console.error('Failed to terminate contract:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Renew contract
  const handleRenew = async (contractId: string, newEndDate: string) => {
    try {
      await contractService.renewContract(contractId, { newEndDate });
      toast.success(t('contracts.renewed'));
      loadContracts();
      loadStatistics();
    } catch (error) {
      console.error('Failed to renew contract:', error);
      toast.error(t('errors.update_failed'));
    }
  };

  // Export contracts
  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      const blob = await contractService.exportContracts({
        ...filters,
      }, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contracts-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('contracts.exported'));
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error(t('errors.export_failed'));
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'YER') => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency }).format(amount);
  };

  // Get contract type label
  const getTypeLabel = (type: ContractType) => {
    const labels: Record<ContractType, string> = {
      fixed_term: t('contracts.type.fixed_term'),
      indefinite: t('contracts.type.indefinite'),
      part_time: t('contracts.type.part_time'),
      seasonal: t('contracts.type.seasonal'),
      probation: t('contracts.type.probation') || 'Probation',
      training: t('contracts.type.training') || 'Training',
      remote: t('contracts.type.remote') || 'Remote',
      probationary_extension: t('contracts.type.probationary_extension') || 'Probationary Extension',
    };
    return labels[type] || type;
  };

  // Get work schedule label
  const getScheduleLabel = (schedule: string) => {
    const labels: Record<string, string> = {
      full_time: t('contracts.schedule.full_time'),
      part_time: t('contracts.schedule.part_time'),
      shift: t('contracts.schedule.shift'),
      flexible: t('contracts.schedule.flexible'),
      rotating: t('contracts.schedule.rotating'),
    };
    return labels[schedule] || schedule;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('contracts.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('contracts.subtitle')}
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
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('contracts.new_contract')}
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
                {t('contracts.total')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                {statistics.total}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('contracts.active')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-green-600">
                {statistics.byStatus?.active || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('contracts.expiring_soon')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-yellow-600">
                {statistics.expiringThisMonth}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('contracts.compliance_rate')}
              </div>
              <div className="mt-1 text-3xl font-semibold text-blue-600">
                {((statistics.complianceRate || 0) * 100).toFixed(1)}%
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
                  {t('contracts.search')}
                </label>
                <Input
                  placeholder={t('contracts.search_placeholder')}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('contracts.employer')}
                </label>
                <Input
                  placeholder={t('contracts.employer_placeholder')}
                  value={filters.employerName}
                  onChange={(e) => setFilters({ ...filters, employerName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('contracts.worker')}
                </label>
                <Input
                  placeholder={t('contracts.worker_placeholder')}
                  value={filters.workerName}
                  onChange={(e) => setFilters({ ...filters, workerName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('contracts.governorate')}
                </label>
                <Input
                  placeholder={t('common.all_governorates')}
                  value={filters.governorate}
                  onChange={(e) => setFilters({ ...filters, governorate: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(initialFilters)}
              >
                {t('common.reset')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: 1 }));
                  loadContracts();
                }}
              >
                {t('common.apply')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.contract_number')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.employer')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.worker')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.type')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.salary')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('contracts.start_date')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {t('contracts.no_contracts')}
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr 
                      key={contract.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(contract)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {contract.contractNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {contract.employer.entityName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {contract.worker.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {getTypeLabel(contract.type)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(contract.wages.baseSalary, contract.wages.currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={contract.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(contract.startDate).toLocaleDateString('ar-YE')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {contract.status === 'pending_approval' && canApprove && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleApprove(contract.id)}>
                                {t('common.approve')}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleReject(contract.id, 'Rejected by ministry')}>
                                {t('common.reject')}
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleRowClick(contract)}>
                            {t('common.view')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.showing')} {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of')} {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Contract Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('contracts.contract_details')}
        size="lg"
      >
        {selectedContract && (
          <div className="space-y-6">
            {/* Contract Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedContract.contractNumber}</h3>
                <p className="text-sm text-gray-500">{getTypeLabel(selectedContract.type)}</p>
              </div>
              <StatusBadge status={selectedContract.status} />
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">{t('contracts.employer')}</h4>
                <p className="font-medium">{selectedContract.employer.entityName}</p>
                <p className="text-sm text-gray-500">{selectedContract.employer.licenseNumber}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">{t('contracts.worker')}</h4>
                <p className="font-medium">{selectedContract.worker.name}</p>
                <p className="text-sm text-gray-500">{selectedContract.worker.nationality}</p>
              </div>
            </div>

            {/* Contract Terms */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{t('contracts.terms')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('contracts.start_date')}:</span>{' '}
                  {new Date(selectedContract.startDate).toLocaleDateString('ar-YE')}
                </div>
                <div>
                  <span className="text-gray-500">{t('contracts.end_date')}:</span>{' '}
                  {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString('ar-YE') : t('contracts.indefinite')}
                </div>
                <div>
                  <span className="text-gray-500">{t('contracts.occupation')}:</span>{' '}
                  {selectedContract.occupation}
                </div>
                <div>
                  <span className="text-gray-500">{t('contracts.work_location')}:</span>{' '}
                  {selectedContract.workLocation}
                </div>
                <div>
                  <span className="text-gray-500">{t('contracts.schedule')}:</span>{' '}
                  {getScheduleLabel(selectedContract.workSchedule)}
                </div>
                {selectedContract.weeklyHours && (
                  <div>
                    <span className="text-gray-500">{t('contracts.weekly_hours')}:</span>{' '}
                    {selectedContract.weeklyHours}
                  </div>
                )}
              </div>
            </div>

            {/* Compensation */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{t('contracts.compensation')}</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedContract.wages.baseSalary, selectedContract.wages.currency)}
                  <span className="text-sm font-normal text-gray-500">/{t('contracts.monthly')}</span>
                </div>
                {selectedContract.wages.allowances && (
                  <div className="mt-2 text-sm">
                    <p className="text-gray-500">{t('contracts.allowances')}:</p>
                    <ul className="list-disc list-inside">
                      {selectedContract.wages.allowances.housing > 0 && (
                        <li>{t('contracts.housing')}: {formatCurrency(selectedContract.wages.allowances.housing)}</li>
                      )}
                      {selectedContract.wages.allowances.transportation > 0 && (
                        <li>{t('contracts.transportation')}: {formatCurrency(selectedContract.wages.allowances.transportation)}</li>
                      )}
                      {selectedContract.wages.allowances.food > 0 && (
                        <li>{t('contracts.food')}: {formatCurrency(selectedContract.wages.allowances.food)}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{t('contracts.benefits')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={selectedContract.benefits.annualLeave ? 'text-green-500' : 'text-red-500'}>
                    {selectedContract.benefits.annualLeave ? '✓' : '✗'}
                  </span>
                  {t('contracts.annual_leave')}: {selectedContract.benefits.annualLeave} {t('common.days')}
                </div>
                <div className="flex items-center gap-2">
                  <span className={selectedContract.benefits.sickLeave ? 'text-green-500' : 'text-red-500'}>
                    {selectedContract.benefits.sickLeave ? '✓' : '✗'}
                  </span>
                  {t('contracts.sick_leave')}: {selectedContract.benefits.sickLeave} {t('common.days')}
                </div>
                <div className="flex items-center gap-2">
                  <span className={selectedContract.benefits.healthInsurance ? 'text-green-500' : 'text-red-500'}>
                    {selectedContract.benefits.healthInsurance ? '✓' : '✗'}
                  </span>
                  {t('contracts.health_insurance')}
                </div>
                <div className="flex items-center gap-2">
                  <span className={selectedContract.benefits.trainingOpportunities ? 'text-green-500' : 'text-red-500'}>
                    {selectedContract.benefits.trainingOpportunities ? '✓' : '✗'}
                  </span>
                  {t('contracts.training')}
                </div>
              </div>
            </div>

            {/* Amendments */}
            {selectedContract.amendments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('contracts.amendments')}</h4>
                <div className="space-y-2">
                  {selectedContract.amendments.map((amendment) => (
                    <div key={amendment.id} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">#{amendment.amendmentNumber} - {amendment.type.replace('_', ' ')}</span>
                        <span className="text-gray-500">{new Date(amendment.effectiveDate).toLocaleDateString('ar-YE')}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{amendment.previousValue} → {amendment.newValue}</p>
                      <p className="text-xs text-gray-500">{amendment.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{t('contracts.signatures')}</h4>
              <div className="space-y-2">
                {selectedContract.signatures.map((sig) => (
                  <div key={sig.id} className="flex justify-between items-center text-sm">
                    <span>{sig.party === 'employer' ? t('contracts.employer') : sig.party === 'worker' ? t('contracts.worker') : t('contracts.ministry')}</span>
                    <span className={sig.signedAt ? 'text-green-600' : 'text-yellow-600'}>
                      {sig.signedAt ? `✓ ${new Date(sig.signedAt).toLocaleDateString('ar-YE')}` : t('contracts.pending_signature')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                {t('common.close')}
              </Button>
              {canEdit && selectedContract.status === 'active' && (
                <Button onClick={() => setShowAmendModal(true)}>
                  {t('contracts.request_amendment')}
                </Button>
              )}
              {selectedContract.status === 'pending_signature' && (
                <Button onClick={() => handleSign(selectedContract.id)}>
                  {t('contracts.sign')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ContractManager;
