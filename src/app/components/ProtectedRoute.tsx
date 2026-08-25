import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getLandingPath } from '../utils/portals';
import { ProfessionalLoader } from './ui/SplashScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMinistry?: boolean;
  requireOrganization?: boolean;
  /** أدوار مسموح لها بالوصول — غير المصرح يُوجَّه لبوابته */
  requiredRoles?: string[];
}

export function ProtectedRoute({
  children,
  requireMinistry = false,
  requireOrganization = false,
  requiredRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const isOrg = user.userType === 'organization' || (user.userType as string) === 'entity';
    const isMin = user.userType === 'ministry' || !isOrg;

    if (requireMinistry && !isMin) {
      navigate(getLandingPath(user), { replace: true });
      return;
    }

    if (requireOrganization && !isOrg) {
      navigate(getLandingPath(user), { replace: true });
      return;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      navigate(getLandingPath(user), { replace: true });
    }
  }, [user, loading, navigate, requireMinistry, requireOrganization, requiredRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09111e] flex items-center justify-center">
        <ProfessionalLoader message="جاري التحقق من الصلاحيات..." size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const isOrgUser = user.userType === 'organization' || (user.userType as string) === 'entity';
  const isMinUser = user.userType === 'ministry' || !isOrgUser;

  if (requireMinistry && !isMinUser) return null;
  if (requireOrganization && !isOrgUser) return null;
  if (requiredRoles && !requiredRoles.includes(user.role)) return null;

  return <>{children}</>;
}
