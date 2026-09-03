import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getLandingPath } from '../utils/portals';
import { ProfessionalLoader } from './ui/SplashScreen';
import { usePermissions } from '../hooks/usePermissions';
import { logAudit } from '../utils/security';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMinistry?: boolean;
  requireOrganization?: boolean;
  /** أدوار مسموح لها بالوصول — غير المصرح يُوجَّه لبوابته */
  requiredRoles?: string[];
  /** صلاحيات مطلوبة — يُفحص باستخدام usePermissions */
  requiredPermissions?: string[];
}

export function ProtectedRoute({
  children,
  requireMinistry = false,
  requireOrganization = false,
  requiredRoles,
  requiredPermissions,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const ret = location.pathname + location.search;
      logAudit({ action: 'GUARD_REDIRECT', resource: 'auth', details: { reason: 'unauthenticated', attempted: ret } });
      navigate(`/login?returnTo=${encodeURIComponent(ret)}`, { replace: true });
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
      logAudit({ action: 'GUARD_DENY', resource: 'rbac', details: { role: user.role, requiredRoles, attempted: location.pathname } });
      navigate(getLandingPath(user), { replace: true });
      return;
    }

    if (requiredPermissions) {
      const hasPerm = requiredPermissions.every((perm) => can(perm));
      if (!hasPerm) {
        logAudit({ action: 'GUARD_DENY', resource: 'rbac', details: { role: user.role, requiredPermissions, attempted: location.pathname } });
        navigate(getLandingPath(user), { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname, location.search, requireMinistry, requireOrganization, requiredRoles, requiredPermissions, can]);

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
  if (requiredPermissions) {
    const hasPerm = requiredPermissions.every((perm) => can(perm));
    if (!hasPerm) return null;
  }

  return <>{children}</>;
}
