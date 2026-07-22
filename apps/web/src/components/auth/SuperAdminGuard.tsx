import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { platformRoleService } from '../../lib/db/services/platformRoleService';

export function SuperAdminGuard() {
  const { user, isLocked } = useAuthStore();
  const [isSA, setIsSA] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function check() {
      if (user) {
        try {
          const res = await platformRoleService.isSuperAdmin(user.id);
          if (active) setIsSA(res);
        } catch {
          if (active) setIsSA(false);
        }
      } else {
        if (active) setIsSA(false);
      }
    }
    check();
    return () => { active = false; };
  }, [user]);

  if (!user || isLocked) {
    return <Navigate to="/" replace />;
  }

  if (isSA === null) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!isSA) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
