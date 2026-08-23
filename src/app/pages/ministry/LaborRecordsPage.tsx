/**
 * LaborRecordsPage — صفحة موحدة لكل سجلات قطاع شؤون العمل
 * تُوجّه إلى LaborRecordsManager المولّد من التكوين حسب resource
 */
import { useParams } from 'react-router';
import { LaborRecordsManager } from '../../components/enterprise/LaborRecordsManager';
import { findRecordConfig } from '../../utils/laborRecordsConfig';
import { EmptyState } from '../../components/ui/EmptyState';
import { Link } from 'react-router';

export default function LaborRecordsPage() {
  const { resource } = useParams<{ resource: string }>();
  const config = resource ? findRecordConfig(resource) : undefined;

  if (!config) {
    return (
      <div dir="rtl" className="space-y-6">
        <EmptyState
          title="سجل غير معروف"
          description="لم يتم العثور على تعريف لهذا السجل في النظام"
        />
        <div className="text-center">
          <Link
            to="/ministry"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 font-medium"
          >
            العودة للوحة القيادة
          </Link>
        </div>
      </div>
    );
  }

  return <LaborRecordsManager config={config} />;
}