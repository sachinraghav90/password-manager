import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useAccountStore } from '../../store/useAccountStore';
import { membershipService } from '../../lib/db/services/membershipService';

import { db } from '../../lib/db/client';

export function OrganizationGuard() {
  const { user, isLocked } = useAuthStore();
  const { mode, activeOrganizationId, switchToOrganization } = useAccountStore();
  const { organizationId } = useParams<{ organizationId: string }>();
  
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!user || !organizationId) {
        if (active) setIsAuthorized(false);
        return;
      }
      
      try {
        await membershipService.assertActiveMembership(user.id, organizationId);
        
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Org not found');
        
        if (org.status === 'suspended') {
          if (active) {
            setIsAuthorized(false);
            setSuspendReason('suspended_org');
          }
          return;
        }

        if (org.provisioningStatus !== 'ready') {
          if (active) {
            setIsAuthorized(false);
            setSuspendReason('pending_activation');
          }
          return;
        }

        if (active) {
          setIsAuthorized(true);
          // If the URL is accessed directly, sync the store
          if (mode !== 'organization' || activeOrganizationId !== organizationId) {
            await switchToOrganization(user.id, organizationId);
          }
        }
      } catch {
        if (active) setIsAuthorized(false);
      }
    }
    
    check();
    return () => { active = false; };
  }, [user, organizationId, mode, activeOrganizationId, switchToOrganization]);

  if (!user || isLocked) {
    return <Navigate to="/" replace />;
  }

  if (isAuthorized === null) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!isAuthorized) {
    if (suspendReason === 'suspended_org') {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4 p-8 text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">Organization Suspended</div>
          <p className="text-slate-400">This organization is currently suspended. Please contact your administrator or platform support.</p>
          <a href="/app/personal" className="text-primary hover:underline mt-4">Return to Personal Vault</a>
        </div>
      );
    }
    if (suspendReason === 'pending_activation') {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4 p-8 text-center">
          <div className="text-3xl font-bold text-yellow-500 mb-2">Pending Activation</div>
          <p className="text-slate-400">This organization is pending administrator activation.</p>
          <a href="/app/personal" className="text-primary hover:underline mt-4">Return to Personal Vault</a>
        </div>
      );
    }

    // If they aren't authorized for this org (e.g. member suspended)
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 p-8 text-center">
        <div className="text-3xl font-bold text-red-500 mb-2">Unauthorized</div>
        <p className="text-slate-400">You do not have access to this organization.</p>
        {user.accountType !== 'managed' && (
          <a href="/app/personal" className="text-primary hover:underline mt-4">Return to Personal Vault</a>
        )}
      </div>
    );
  }

  return <Outlet />;
}
