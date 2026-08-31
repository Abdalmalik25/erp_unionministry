/**
 * WorkerPassportPage.tsx — Production-Grade Worker Digital Passport Page
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * Ministry Workspace — Worker Career ID Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  workerPassportService, 
  type WorkerProfile,
  type WorkerQualification,
  type WorkerEmploymentHistory,
  type WorkerTraining
} from '../../services/workerPassportService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';

interface PassportView {
  profile: WorkerProfile;
  qualifications: WorkerQualification[];
  employmentHistory: WorkerEmploymentHistory[];
  trainings: WorkerTraining[];
}

export function WorkerPassportPage() {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  const [profiles, setProfiles] = useState<WorkerProfile[]>([]);
  const [selected, setSelected] = useState<PassportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [total, setTotal] = useState(0);

  const canView = can('workerPassport:view');
  const canExport = can('workerPassport:export');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await workerPassportService.searchWorkers(searchQuery, {});
      setProfiles(response.data.workers || []);
      setTotal(response.data.workers?.length || 0);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      toast.error(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, t]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleRowClick = async (profile: WorkerProfile) => {
    try {
      const [qualsRes, empRes, trainRes] = await Promise.all([
        workerPassportService.getQualifications(profile.id),
        workerPassportService.getEmploymentHistory(profile.id),
        workerPassportService.getTrainingHistory(profile.id),
      ]);
      setSelected({
        profile,
        qualifications: qualsRes.data.qualifications || [],
        employmentHistory: empRes.data.history || [],
        trainings: trainRes.data.trainings || [],
      });
      setShowDetail(true);
    } catch (error) {
      toast.error(t('errors.load_failed'));
    }
  };

  const handleExport = async (workerId: string) => {
    try {
      const blob = await workerPassportService.downloadPassportCard();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worker-passport-${workerId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('passport.exported'));
    } catch (error) {
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
                {t('passport.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('passport.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder={t('passport.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              {canExport && (
                <Button variant="outline">
                  {t('common.export')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('passport.total_workers')}</div>
            <div className="text-3xl font-semibold">{total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('passport.active')}</div>
            <div className="text-3xl font-semibold text-green-600">-</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('passport.with_qualifications')}</div>
            <div className="text-3xl font-semibold text-blue-600">-</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">{t('passport.with_training')}</div>
            <div className="text-3xl font-semibold text-purple-600">-</div>
          </Card>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('passport.passport_number')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('passport.worker_name')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('passport.nationality')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('passport.profession')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('passport.status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('passport.no_passports')}
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr 
                      key={profile.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleRowClick(profile)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {profile.passportNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {profile.fullName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {profile.nationality}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {profile.professionName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={profile.currentEmploymentStatus} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {canView && (
                            <Button size="sm" variant="outline" onClick={() => handleRowClick(profile)}>
                              {t('common.view')}
                            </Button>
                          )}
                          {canExport && (
                            <Button size="sm" variant="ghost" onClick={() => handleExport(profile.id)}>
                              {t('common.export')}
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
        title={t('passport.passport_details')}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selected.profile.fullName}</h3>
                <p className="text-sm text-gray-500">{selected.profile.passportNumber}</p>
              </div>
              <StatusBadge status={selected.profile.currentEmploymentStatus} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">{t('passport.nationality')}</h4>
                <p className="text-sm">{selected.profile.nationality}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">{t('passport.profession')}</h4>
                <p className="text-sm">{selected.profile.professionName}</p>
              </div>
            </div>

            {selected.qualifications.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('passport.qualifications')}</h4>
                <ul className="space-y-1">
                  {selected.qualifications.map((q: WorkerQualification) => (
                    <li key={q.id} className="text-sm">
                      <span className="font-medium">{q.title}</span> - {q.institution} ({q.issueDate})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.employmentHistory.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('passport.employment_history')}</h4>
                <ul className="space-y-2">
                  {selected.employmentHistory.map((job: WorkerEmploymentHistory) => (
                    <li key={job.id} className="text-sm border-l-2 border-gray-200 pl-3">
                      <div className="font-medium">{job.employerName}</div>
                      <div className="text-gray-500">{job.position} • {job.startDate} - {job.endDate || t('passport.present')}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.trainings.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('passport.training_records')}</h4>
                <ul className="space-y-1">
                  {selected.trainings.map((tr: WorkerTraining) => (
                    <li key={tr.id} className="text-sm">
                      {tr.trainingName} - {tr.provider} ({tr.startDate} - {tr.endDate})
                    </li>
                  ))}
                </ul>
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

export default WorkerPassportPage;
