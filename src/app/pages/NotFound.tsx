import { useNavigate } from 'react-router';
import { Home, ArrowRight } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-bright flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full text-center">
        <div className="bg-card rounded-2xl shadow-2xl p-8">
          <div className="text-8xl font-bold text-primary mb-4">404</div>
          <h1 className="text-2xl font-bold text-heading mb-2">الصفحة غير موجودة</h1>
          <p className="text-muted-foreground mb-6">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-muted text-heading rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowRight size={20} />
              <span>العودة للصفحة السابقة</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Home size={20} />
              <span>العودة للصفحة الرئيسية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
