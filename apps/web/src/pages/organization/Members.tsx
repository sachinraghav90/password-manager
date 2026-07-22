import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, MoreVertical, Shield, UserX, UserCheck, Key } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { membershipService } from '../../lib/db/services/membershipService';
import { organizationService } from '../../lib/db/services/organizationService';
import { permissionProfileService } from '@vaultguard/permissions';
import { authorizationService } from '@vaultguard/permissions';
import { db } from '@vaultguard/db-local';
import { Button } from '../../components/ui/Button';

export const Members: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [canViewMembers, setCanViewMembers] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [canAssignProfile, setCanAssignProfile] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [viewDec, inviteDec, assignDec, me] = await Promise.all([
        authorizationService.canPerform(user!.id, 'members.view', { resourceType: 'membership', organizationId: organizationId! }),
        authorizationService.canPerform(user!.id, 'members.invite', { resourceType: 'membership', organizationId: organizationId! }),
        authorizationService.canPerform(user!.id, 'members.assign_profile', { resourceType: 'membership', organizationId: organizationId! }),
        membershipService.getMembership(user!.id, organizationId!)
      ]);

      setCanViewMembers(viewDec.allowed);
      setCanInvite(inviteDec.allowed);
      setCanAssignProfile(assignDec.allowed);

      let allMemberships = [];
      if (viewDec.allowed) {
        allMemberships = await db.organization_memberships.where({ organizationId }).toArray();
        const profilesList = await permissionProfileService.getProfiles(organizationId!);
        setProfiles(profilesList);
      } else {
        if (me) allMemberships = [me];
      }
      
      const membersWithUsers = await Promise.all(
        allMemberships.map(async (m) => {
          const u = await db.users.get(m.userId);
          const p = m.permissionProfileId ? await db.permission_profiles.get(m.permissionProfileId) : null;
          return { ...m, user: u, profile: p };
        })
      );
      
      setMembers(membersWithUsers);
    } catch (err: any) {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId]);

  const handleAction = async (action: 'suspend' | 'reactivate' | 'remove' | 'transfer', targetId: string) => {
    try {
      setError('');
      if (action === 'suspend') await membershipService.suspendMember(organizationId!, user!.id, targetId);
      if (action === 'reactivate') await membershipService.reactivateMember(organizationId!, user!.id, targetId);
      if (action === 'remove') await membershipService.removeMember(organizationId!, user!.id, targetId);
      if (action === 'transfer') await organizationService.transferAdmin(organizationId!, user!.id, targetId);
      
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignProfile = async (membershipId: string, profileId: string) => {
    try {
      setError('');
      await membershipService.assignPermissionProfile(user!.id, organizationId!, membershipId, profileId || null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-500" />
            Members
          </h1>
          {canInvite && (
            <Button variant="outline" onClick={() => window.location.href = `/app/organization/${organizationId}/invitations`}>
              Manage Invitations
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {!canViewMembers && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/50 rounded-lg text-orange-400">
            Member directory access is not available for your role. Showing only your membership details.
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="p-4 text-sm font-semibold text-slate-300">Name / Email</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Role & Profile</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Status</th>
                {canViewMembers && <th className="p-4 text-sm font-semibold text-slate-300 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-200">
                      {m.user?.fullName || 'Unknown'} {m.userId === user?.id && <span className="text-xs text-indigo-400 ml-2">(You)</span>}
                    </div>
                    <div className="text-sm text-slate-500">{m.user?.email || 'No email'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        m.role === 'organization_admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {m.role === 'organization_admin' && <Shield className="w-3 h-3 mr-1" />}
                        {m.role === 'organization_admin' ? 'Admin' : 'Member'}
                      </span>
                      
                      {m.role !== 'organization_admin' && (
                        canAssignProfile && canViewMembers && m.userId !== user?.id ? (
                          <select
                            value={m.permissionProfileId || ''}
                            onChange={(e) => handleAssignProfile(m.id, e.target.value)}
                            className="bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 p-1 outline-none mt-1"
                          >
                            <option value="">No Profile (Denied)</option>
                            {profiles.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Key className="w-3 h-3" />
                            {m.profile ? m.profile.name : 'No Profile Assigned'}
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      m.status === 'active' ? 'bg-green-500/10 text-green-400' : 
                      m.status === 'suspended' ? 'bg-orange-500/10 text-orange-400' : 
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                  </td>
                  {canViewMembers && (
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {m.role !== 'organization_admin' && m.status === 'active' && m.userId !== user?.id && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleAction('transfer', m.userId)} title="Make Admin">
                              <Shield className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleAction('suspend', m.userId)} title="Suspend">
                              <UserX className="w-4 h-4 text-slate-400 hover:text-orange-400" />
                            </Button>
                          </>
                        )}
                        {m.status === 'suspended' && m.userId !== user?.id && (
                          <Button variant="ghost" size="sm" onClick={() => handleAction('reactivate', m.userId)} title="Reactivate">
                            <UserCheck className="w-4 h-4 text-slate-400 hover:text-green-400" />
                          </Button>
                        )}
                        {m.role !== 'organization_admin' && m.status !== 'removed' && m.userId !== user?.id && (
                          <Button variant="ghost" size="sm" onClick={() => handleAction('remove', m.userId)} title="Remove">
                            <MoreVertical className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
