import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useAccountStore } from '../../store/useAccountStore';
import { membershipService } from '../../lib/db/services/membershipService';

export function PersonalGuard() {
  const { user, isLocked } = useAuthStore();
  const { mode, switchToPersonal, switchToOrganization } = useAccountStore();
  const [redirectOrgId, setRedirectOrgId] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  
  useEffect(() => {
    async function checkAccess() {
      if (!user) return;

      // Already in org mode — nothing to do, avoid clearing vault state on re-renders
      if (mode === 'organization') return;
      
      if (user.accountType === 'managed') {
        const memberships = await membershipService.getUserActiveMemberships(user.id);
        if (memberships.length > 0) {
          const orgId = memberships[0].organizationId;
          await switchToOrganization(user.id, orgId);
          setRedirectOrgId(orgId);
          return;
        }
      }

      if (user.accountType === 'managed') {
        const memberships = await membershipService.getUserActiveMemberships(user.id);
        if (memberships.length > 0) {
          const orgId = memberships[0].organizationId;
          await switchToOrganization(user.id, orgId);
          setRedirectOrgId(orgId);
          return;
        } else {
          setIsUnauthorized(true);
          return;
        }
      }

      // Ensure we switch to personal context if we aren't in it
      if (mode !== 'personal') {
        switchToPersonal();
      }
    }
    
    checkAccess();
  // Only re-run when user changes, not on every mode change
  }, [user]);

  if (!user || isLocked) {
    return <Navigate to="/" replace />;
  }

  if (isUnauthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 p-8 text-center bg-background">
        <div className="text-3xl font-bold text-red-500 mb-2">Unauthorized</div>
        <p className="text-slate-400">Your organization account does not have access to any personal vaults or active organizations.</p>
      </div>
    );
  }

  if (redirectOrgId) {
    return <Navigate to={`/app/organization/${redirectOrgId}`} replace />;
  }

  return <Outlet />;
}
