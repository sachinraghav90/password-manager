import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../lib/db/client';
import { organizationUserService, OrganizationSeatUsage } from '../../lib/db/services/organizationUserService';
import { useAuthStore } from '../../store/useAuthStore';
import { User, OrganizationMembership } from '../../lib/db/schema';
import { Loader2, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function UsersList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<OrganizationSeatUsage | null>(null);
  
  const [users, setUsers] = useState<Array<{ user: User, membership: OrganizationMembership }>>([]);

  useEffect(() => {
    if (!organizationId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const u = await organizationUserService.getOrganizationSeatUsage(organizationId);
        setUsage(u);

        const memberships = await db.organization_memberships.where({ organizationId }).toArray();
        const userIds = memberships.map(m => m.userId);
        const usersData = await db.users.where('id').anyOf(userIds).toArray();
        
        const combined = memberships.map(m => ({
          membership: m,
          user: usersData.find(u => u.id === m.userId)!
        })).filter(x => x.user);
        
        setUsers(combined);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  const isAtLimit = usage && usage.seatsAvailable <= 0;
  const isNearLimit = usage && usage.seatsAvailable <= 2;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organization Users</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage users, seat limits, and administrative access.</p>
        </div>
        <Link 
          to={isAtLimit ? '#' : `/app/organization/${organizationId}/admin/users/new`} 
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            isAtLimit ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
          onClick={(e) => isAtLimit && e.preventDefault()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Link>
      </div>

      {/* Seat Usage Widget */}
      {usage && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Seat Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Limit</p>
              <p className="text-2xl font-bold text-foreground">{usage.seatLimit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seats Used</p>
              <p className="text-2xl font-bold text-foreground">{usage.seatsUsed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seats Available</p>
              <p className={`text-2xl font-bold ${usage.seatsAvailable === 0 ? 'text-destructive' : 'text-green-500'}`}>{usage.seatsAvailable}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
              <p className="text-2xl font-bold text-foreground">{usage.pendingInvitations}</p>
            </div>
          </div>

          {isAtLimit && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive flex items-center">
              <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              You have reached your organization's seat limit. You cannot create or invite any more users until you remove an existing user or upgrade your plan.
            </div>
          )}
          {!isAtLimit && isNearLimit && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-600 dark:text-yellow-400 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
              You are nearing your organization's seat limit. Only {usage.seatsAvailable} seat{usage.seatsAvailable === 1 ? '' : 's'} remaining.
            </div>
          )}
        </div>
      )}

      {/* User List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(({ user: u, membership }) => (
              <tr key={membership.id} className="hover:bg-accent/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-foreground font-medium">{u.fullName}</div>
                  <div className="text-xs">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${membership.role === 'organization_admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                    {membership.role.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    membership.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                    membership.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {membership.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {membership.joinedAt ? new Date(membership.joinedAt).toLocaleDateString() : 'Pending'}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/app/organization/${organizationId}/users/${membership.id}`} className="text-primary hover:text-primary/80 transition-colors">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
