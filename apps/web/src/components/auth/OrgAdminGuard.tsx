import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAccountStore } from '../../store/useAccountStore';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '@vaultguard/db-local';

export function OrgAdminGuard() {
  const { membershipRole } = useAccountStore();
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (user) {
      db.platform_role_assignments
        .where({ userId: user.id })
        .filter(r => r.role === 'super_admin' && r.status === 'active')
        .first()
        .then(res => {
          if (active) setIsSuperAdmin(!!res);
        })
        .catch(() => {
          if (active) setIsSuperAdmin(false);
        });
    } else {
      setIsSuperAdmin(false);
    }
    return () => { active = false; };
  }, [user]);

  if (isSuperAdmin === null) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  // Super admins have their own console
  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  if (membershipRole !== 'organization_admin') {
    return <Navigate to={`/app/organization/${organizationId}`} replace />;
  }

  return <Outlet />;
}
