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
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      const isOrg = user.userType === 'organization' || (user.userType as string) === 'entity';
      const isMin = user.userType === 'ministry' || !isOrg;

      if (requireMinistry && !isMin) {
        navigate('/organization', { replace: true });
        return;
      }

      if (requireOrganization && !isOrg) {
        navigate('/ministry', { replace: true });
        return;
      }
    }
  }, [user, loading, navigate, requireMinistry, requireOrganization]);

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

  return <>{children}</>;
}