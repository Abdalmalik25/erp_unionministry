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
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 border-t-4 border-warning">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-warning/15 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-warning-dark" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-heading">تحذير: انتهاء الجلسة</h3>
            <p className="text-sm text-muted-foreground">سيتم تسجيل خروجك تلقائياً</p>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-warning-dark mb-1">الوقت المتبقي</p>
          <p className="text-2xl font-black text-warning-dark">{timeStr}</p>
          <p className="text-xs text-warning mt-1">
            لم يُسجَّل أي نشاط لفترة طويلة. هل تريد الاستمرار؟
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExtend}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تمديد الجلسة
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-muted-foreground rounded-xl font-semibold hover:bg-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}
