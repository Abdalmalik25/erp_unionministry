/**
 * EmployerSelfService.tsx — Production-Grade Employer Portal Dashboard
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * Employer self-service interface for compliance, workforce, contracts, OSH
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  employerService,
  type EmployerEntity,
  type EmployerDashboard,
  type EmployerWorkforce,
  type ComplianceItem
} from '../../services/employerService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';

export function EmployerSelfService() {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<EmployerDashboard | null>(null);
  const [oshCompliance, setOshCompliance] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, oshRes, finRes] = await Promise.all([
        employerService.getDashboard(),
        employerService.getOSHCompliance(),
        employerService.getFinancialSummary(),
      ]);
      setDashboard(dashRes.data);
      setOshCompliance(oshRes.data);
      setFinancialSummary(finRes.data);
    } catch (error) {
      console.error('Failed to load employer dashboard:', error);
      toast.error(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const getComplianceColor = (status: string) => {
    const colors: Record<string, string> = {
      compliant: 'text-green-600 bg-green-50',
      non_compliant: 'text-red-600 bg-red-50',
      partial: 'text-yellow-600 bg-yellow-50',
      pending_review: 'text-blue-600 bg-blue-50',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'text-blue-600',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return colors[severity] || 'text-gray-600';
  };

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboard.entity.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('employer.dashboard_subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={dashboard.entity.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('employer.total_employees')}
            </div>
            <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {dashboard.entity.totalEmployees}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {dashboard.entity.yemeniEmployees} {t('employer.yemeni')} / {dashboard.entity.expatriateEmployees} {t('employer.expatriate')}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('employer.compliance_score')}
            </div>
            <div className="mt-1 text-3xl font-semibold text-green-600">
              {dashboard.entity.complianceScore}%
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${dashboard.entity.complianceScore}%` }}
              ></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('employer.active_violations')}
            </div>
            <div className="mt-1 text-3xl font-semibold text-red-600">
              {dashboard.entity.activeViolations}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('employer.pending_disputes')}
            </div>
            <div className="mt-1 text-3xl font-semibold text-yellow-600">
              {dashboard.entity.pendingDisputes}
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Pending Actions & Compliance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('employer.pending_actions')}
              </h2>
              {dashboard.pendingActions.length === 0 ? (
                <p className="text-sm text-gray-500">{t('employer.no_pending_actions')}</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.pendingActions.map((action, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {action.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('employer.due')}: {new Date(action.dueDate).toLocaleDateString('ar-YE')}
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${getSeverityColor(action.severity)}`}>
                        {t(`employer.severity.${action.severity}`)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Compliance Items */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('employer.compliance_status')}
              </h2>
              <div className="space-y-3">
                {dashboard.complianceItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getComplianceColor(item.status)}`}>
                          {t(`employer.compliance.${item.status}`)}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.requirement}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {t('employer.last_checked')}: {new Date(item.lastChecked).toLocaleDateString('ar-YE')}
                        {item.nextCheck && ` • ${t('employer.next_check')}: ${new Date(item.nextCheck).toLocaleDateString('ar-YE')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* OSH Compliance */}
            {oshCompliance && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('employer.osh_compliance')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm">{t('osh.committee')}</span>
                    <span className={oshCompliance.hasOSHCommittee ? 'text-green-600' : 'text-red-600'}>
                      {oshCompliance.hasOSHCommittee ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm">{t('osh.representative')}</span>
                    <span className={oshCompliance.hasOSHRepresentative ? 'text-green-600' : 'text-red-600'}>
                      {oshCompliance.hasOSHRepresentative ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm">{t('osh.training')}</span>
                    <span className={oshCompliance.hasOSHTraining ? 'text-green-600' : 'text-red-600'}>
                      {oshCompliance.hasOSHTraining ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm">{t('osh.medical_exam')}</span>
                    <span className={oshCompliance.hasMedicalExaminations ? 'text-green-600' : 'text-red-600'}>
                      {oshCompliance.hasMedicalExaminations ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">{t('osh.open_incidents')}</div>
                    <div className="text-xl font-semibold text-red-600">
                      {oshCompliance.openIncidents}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{t('osh.osh_score')}</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {oshCompliance.complianceScore}%
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Workforce, Financials */}
          <div className="space-y-6">
            {/* Workforce */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('employer.workforce')}
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('employer.total_employees')}</span>
                    <span className="font-medium">{dashboard.workforce.totalEmployees}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('employer.avg_tenure')}</span>
                    <span className="font-medium">{dashboard.workforce.averageTenure} {t('common.years')}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('employer.turnover_rate')}</span>
                    <span className="font-medium">{(dashboard.workforce.turnoverRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-500 mb-2">{t('employer.by_department')}</div>
                  {Object.entries(dashboard.workforce.byDepartment).slice(0, 5).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between text-sm py-1">
                      <span>{dept}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-500 mb-2">{t('employer.by_nationality')}</div>
                  {Object.entries(dashboard.workforce.byNationality).map(([nat, count]) => (
                    <div key={nat} className="flex justify-between text-sm py-1">
                      <span>{nat}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Financial */}
            {financialSummary && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('employer.financial_summary')}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('employer.fees_due')}</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('ar-YE').format(financialSummary.totalFeesDue || 0)} YER
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('employer.fees_paid')}</span>
                    <span className="font-medium text-green-600">
                      {new Intl.NumberFormat('ar-YE').format(financialSummary.totalFeesPaid || 0)} YER
                    </span>
                  </div>
                  {financialSummary.nextPaymentDue && (
                    <div className="pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        {t('employer.next_payment')}: {new Date(financialSummary.nextPaymentDue).toLocaleDateString('ar-YE')}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('employer.quick_actions')}
              </h2>
              <div className="space-y-2">
                {can('contracts:create') && (
                  <Button variant="outline" className="w-full justify-start">
                    {t('employer.new_contract')}
                  </Button>
                )}
                {can('inspections:request') && (
                  <Button variant="outline" className="w-full justify-start">
                    {t('employer.request_inspection')}
                  </Button>
                )}
                {can('osh:report') && (
                  <Button variant="outline" className="w-full justify-start">
                    {t('employer.report_incident')}
                  </Button>
                )}
                {can('fees:pay') && (
                  <Button variant="outline" className="w-full justify-start">
                    {t('employer.pay_fees')}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployerSelfService;
