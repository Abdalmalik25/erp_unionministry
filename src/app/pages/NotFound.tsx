import { useNavigate } from 'react-router';
import { Home, ArrowRight, Compass } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLandingPath } from '../utils/portals';

export function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full text-center">
        <div className="bg-[#0f1c31]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/40 p-8">
          <div className="text-7xl font-black bg-gradient-to-b from-amber-400 to-amber-600 bg-clip-text text-transparent mb-4">404</div>
          <h1 className="text-xl font-bold text-white mb-2">الصفحة غير موجودة</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            الرابط الذي تحاول الوصول إليه غير متاح أو تم نقله.
            يمكنك العودة إلى بوابتك الرئيسية والمتابعة من هناك.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(getLandingPath(user), { replace: true })}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30"
            >
              <Compass size={18} />
              <span>العودة إلى بوابتي الرئيسية</span>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
            >
              <ArrowRight size={18} />
              <span>العودة إلى الصفحة السابقة</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Home size={14} />
              <span>شاشة الدخول الموحدة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
