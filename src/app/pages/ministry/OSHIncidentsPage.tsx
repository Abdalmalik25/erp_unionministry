/**
 * OSHIncidentsPage.tsx — Production-Grade Occupational Safety & Health Incidents Page
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * Ministry Workspace — OSH Incident Tracking & Resolution
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { oshService, type OSHIncident, type OSHIncidentStatus, type OSHIncidentSeverity, type OSHFilters } from '../../services/oshService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';
import { analyzeOSHIncident } from '../../utils/oshExpertLogic';

const initialFilters: OSHFilters = {
  status: [],
  severity: [],
  search: '',
  dateFrom: '',
  dateTo: '',
};

export function OSHIncidentsPage() {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  const [incidents, setIncidents] = useState<OSHIncident[]>([]);
  const [selected, setSelected] = useState<OSHIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OSHFilters>(initialFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  const canEdit = can('osh:edit');
  const canClose = can('osh:close');
  const canExport = can('osh:export');

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await oshService.listIncidents({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setIncidents(response.data.incidents || []);
      if (response.meta) {
        setPagination(prev => ({ ...prev, total: response.meta?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, t]);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await oshService.getStatistics();
      setStatistics(stats.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
    loadStatistics();
  }, [loadIncidents, loadStatistics]);

  const handleRowClick = async (incident: OSHIncident) => {
    try {
      const response = await oshService.getIncident(incident.id);
      setSelected(response.data);
      setShowDetail(true);
    } catch (error) {
      toast.error(t('errors.load_failed'));
    }
  };

  const handleUpdateStatus = async (id: string, status: OSHIncidentStatus) => {
    try {
      await oshService.updateIncidentStatus(id, status);
      toast.success(t('osh.status_updated'));
      loadIncidents();
      loadStatistics();
    } catch (error) {
      toast.error(t('errors.update_failed'));
    }
  };

  const handleClose = async (id: string) => {
    try {
      await oshService.updateIncidentStatus(id, 'closed', 'Closed by ministry');
      toast.success(t('osh.closed'));
      loadIncidents();
      loadStatistics();
    } catch (error) {
      toast.error(t('errors.update_failed'));
    }
  };

  const getSeverityColor = (severity: OSHIncidentSeverity) => {
    const colors: Record<OSHIncidentSeverity, string> = {
      minor: 'bg-yellow-100 text-yellow-800',
      moderate: 'bg-orange-100 text-orange-800',
      serious: 'bg-red-100 text-red-800',
      critical: 'bg-red-700 text-white',
      fatal: 'bg-red-900 text-white',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('osh.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('osh.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                {t('common.filters')}
              </Button>
              {canExport && (
                <Button variant="outline">
                  {t('common.export')}
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
              <div className="text-sm font-medium text-gray-500">{t('osh.total')}</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                {statistics.totalIncidents}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">{t('osh.open')}</div>
              <div className="mt-1 text-3xl font-semibold text-yellow-600">
                {statistics.openCount}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">{t('osh.serious')}</div>
              <div className="mt-1 text-3xl font-semibold text-red-600">
                {(statistics.bySeverity?.serious || 0) + (statistics.bySeverity?.fatal || 0) + (statistics.bySeverity?.critical || 0)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">{t('osh.closed_this_month')}</div>
              <div className="mt-1 text-3xl font-semibold text-green-600">
                {statistics.closedThisMonth}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('common.search')}</label>
                <Input
                  placeholder={t('osh.search_placeholder')}
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('osh.date_from')}</label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('osh.date_to')}</label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('osh.incident_id')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('osh.employer')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('osh.type')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('osh.severity')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    التقييم الخبير
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('osh.date')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('osh.status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
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
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {t('osh.no_incidents')}
                    </td>
                  </tr>
                ) : (
                  incidents.map((incident) => (
                    <tr 
                      key={incident.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleRowClick(incident)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {incident.caseNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {incident.employerName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {t(`osh.type.${incident.type}`)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(incident.severity)}`}>
                          {t(`osh.severity.${incident.severity}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const ex = analyzeOSHIncident(incident);
                          return (
                            <span className={`px-2 py-1 text-xs font-medium rounded ${ex.badge}`}>
                              {ex.responseLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {new Date(incident.incidentDate).toLocaleDateString('ar-YE')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {canEdit && incident.status !== 'closed' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(incident.id, 'investigating')}>
                              {t('osh.investigate')}
                            </Button>
                          )}
                          {canClose && incident.status !== 'closed' && (
                            <Button size="sm" onClick={() => handleClose(incident.id)}>
                              {t('common.close')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={t('osh.incident_details')}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selected.caseNumber}</h3>
                <p className="text-sm text-gray-500">{selected.employerName}</p>
                <p className="text-sm text-gray-500">{selected.workplaceLocation}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={selected.status} />
                <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(selected.severity)}`}>
                  {t(`osh.severity.${selected.severity}`)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">{t('osh.title_label')}</h4>
              <p className="mt-1 font-medium">{selected.title}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">{t('osh.description')}</h4>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{selected.description}</p>
            </div>
            {selected.workersInvolved && selected.workersInvolved.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">{t('osh.workers_involved')}</h4>
                <ul className="mt-1 list-disc list-inside text-sm">
                  {selected.workersInvolved.map((w: any, i: number) => (
                    <li key={i}>
                      {w.workerName} {w.injuryType && `- ${w.injuryType}`}
                      {w.medicalAttention && ` (${t(`osh.medical.${w.medicalAttention}`)})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(() => {
              const ex = analyzeOSHIncident(selected);
              return (
                <div className={`border rounded-lg p-4 space-y-2 ${ex.badge.replace('bg-', 'bg-').includes('red') ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : ex.responseLabel === 'مراقبة نشطة' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">التقييم الخبير</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${ex.badge}`}>{ex.responseLabel}</span>
                  </div>
                  {ex.drivers.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-200 space-y-0.5">
                      {ex.drivers.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  )}
                  {ex.mandatoryNotifications.length > 0 && (
                    <div className="text-xs text-red-700 dark:text-red-300">
                      <span className="font-semibold">إلزامات الإبلاغ: </span>
                      {ex.mandatoryNotifications.join('؛ ')}
                    </div>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="text-xs text-gray-500">الإجراء المقترح: </span>{ex.recommendedAction}
                  </p>
                </div>
              );
            })()}
            {selected.investigation && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('osh.investigation')}</h4>
                {selected.investigation.findings.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium">{t('osh.findings')}:</span>
                    <ul className="list-disc list-inside text-sm">
                      {selected.investigation.findings.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.investigation.recommendations.length > 0 && (
                  <div>
                    <span className="text-xs font-medium">{t('osh.recommendations')}:</span>
                    <ul className="list-disc list-inside text-sm">
                      {selected.investigation.recommendations.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetail(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default OSHIncidentsPage;
