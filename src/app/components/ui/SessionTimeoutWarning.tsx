/**
 * SessionTimeoutWarning — تحذير انتهاء صلاحية الجلسة
 */

import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { refreshSession } from '../../utils/security';

interface Props {
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({ remainingSeconds, onExtend, onLogout }: Props) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = minutes > 0
    ? `${minutes} دقيقة و ${seconds} ثانية`
    : `${seconds} ثانية`;

  const handleExtend = () => {
    refreshSession();
    onExtend();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-t-4 border-orange-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">تحذير: انتهاء الجلسة</h3>
            <p className="text-sm text-gray-500">سيتم تسجيل خروجك تلقائياً</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-orange-700 mb-1">الوقت المتبقي</p>
          <p className="text-2xl font-black text-orange-600">{timeStr}</p>
          <p className="text-xs text-orange-500 mt-1">
            لم يُسجَّل أي نشاط لفترة طويلة. هل تريد الاستمرار؟
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExtend}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1E3A8A] text-white py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تمديد الجلسة
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}
