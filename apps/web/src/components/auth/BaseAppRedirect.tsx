import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { membershipService } from '../../lib/db/services/membershipService';

export function BaseAppRedirect() {
  const { user } = useAuthStore();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    async function determineRoute() {
      if (!user) return;
      if ((user.accountType as string) === 'super_admin') {
        setRedirectPath('/app/super-admin');
        return;
      }
      if (user.accountType === 'managed') {
        const memberships = await membershipService.getUserActiveMemberships(user.id);
        if (memberships.length > 0) {
          setRedirectPath(`/app/organization/${memberships[0].organizationId}`);
          return;
        }
      }
      setRedirectPath('/app/personal');
    }
    determineRoute();
  }, [user]);

  if (!redirectPath) {
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  return <Navigate to={redirectPath} replace />;
}
