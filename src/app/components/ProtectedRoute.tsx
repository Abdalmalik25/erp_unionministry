import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { ProfessionalLoader } from './ui/SplashScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMinistry?: boolean;
  requireOrganization?: boolean;
}

export function ProtectedRoute({
  children,
  requireMinistry = false,
  requireOrganization = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // إذا لم يكن المستخدم مسجلاً
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      // إذا كانت الصفحة تتطلب دور الوزارة
      if (requireMinistry && user.userType !== 'ministry') {
        navigate('/organization', { replace: true });
        return;
      }

      // إذا كانت الصفحة تتطلب دور المنظمة
      if (requireOrganization && user.userType !== 'organization') {
        navigate('/ministry', { replace: true });
        return;
      }
    }
  }, [user, loading, navigate, requireMinistry, requireOrganization]);

  // عرض شاشة تحميل احترافية أثناء التحقق
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <ProfessionalLoader message="جاري التحقق من الصلاحيات..." size="lg" />
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم مسجل
  if (!user) {
    return null;
  }

  // إذا كانت الصلاحيات غير مطابقة
  if (requireMinistry && user.userType !== 'ministry') {
    return null;
  }

  if (requireOrganization && user.userType !== 'organization') {
    return null;
  }

  return <>{children}</>;
}