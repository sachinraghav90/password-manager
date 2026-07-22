import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '@vaultguard/db-local';
import { organizationUserService } from '../../lib/db/services/organizationUserService';
import { useAuthStore } from '../../store/useAuthStore';
import { User, OrganizationMembership } from '@vaultguard/models';
import { Loader2, ArrowLeft, AlertTriangle, Trash2, PauseCircle, PlayCircle, KeyRound, ShieldAlert } from 'lucide-react';

export function UserDetails() {
  const { organizationId, membershipId } = useParams<{ organizationId: string, membershipId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(null);
  
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !membershipId) return;
    
    const loadData = async () => {
      try {
        const m = await db.organization_memberships.get(membershipId);
        if (m && m.organizationId === organizationId) {
          setMembership(m);
          const u = await db.users.get(m.userId);
          setUser(u || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, membershipId]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!user || !membership || !currentUser) return <div className="p-8 text-red-500">User not found</div>;

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this user? They will lose access immediately.')) return;
    setActionLoading(true);
    try {
      await organizationUserService.suspendOrganizationUser(currentUser.id, organizationId!, membershipId!);
      setMembership({ ...membership, status: 'suspended' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      await organizationUserService.reactivateOrganizationUser(currentUser.id, organizationId!, membershipId!);
      setMembership({ ...membership, status: 'active' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to permanently remove this user from the organization?')) return;
    setActionLoading(true);
    try {
      await organizationUserService.removeOrganizationUser(currentUser.id, organizationId!, membershipId!);
      navigate(`/app/organization/${organizationId}/admin/users`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('This will invalidate their current login password and force them to set a new one. Continue?')) return;
    setActionLoading(true);
    try {
      const randArray = new Uint8Array(16);
      crypto.getRandomValues(randArray);
      const tempPass = Array.from(randArray).map(b => b.toString(16).padStart(2, '0')).join('') + 'A1!';
      
      await organizationUserService.resetTemporaryCredential(currentUser.id, organizationId!, membershipId!, tempPass);
      setTempPassword(tempPass);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (tempPassword) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-card border border-border rounded-lg shadow-xl">
        <div className="text-center space-y-6">
          <ShieldAlert className="w-16 h-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Password Reset Successful</h2>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded text-left">
            <h3 className="text-yellow-600 dark:text-yellow-400 font-semibold mb-2">DEVELOPMENT-ONLY DELIVERY SIMULATION</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Share this temporary password with the user. They will be forced to change it on their next login.
            </p>
            <div className="bg-background p-4 rounded font-mono text-xl text-center select-all cursor-pointer">
              {tempPassword}
            </div>
          </div>

          <button
            onClick={() => setTempPassword(null)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <Link to={`/app/organization/${organizationId}/admin/users`} className="text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Users
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user.fullName}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${
            membership.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
            membership.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
            'bg-destructive/10 text-destructive'
          }`}>
            {membership.status.toUpperCase()}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive flex items-center">
          <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Membership Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                <dd className="mt-1 text-sm text-foreground">{membership.role.replace('_', ' ').toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Joined</dt>
                <dd className="mt-1 text-sm text-foreground">{membership.joinedAt ? new Date(membership.joinedAt).toLocaleString() : 'N/A'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleResetPassword}
                disabled={actionLoading || membership.status === 'removed'}
                className="w-full flex items-center justify-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4 mr-2" /> Reset Password
              </button>
              
              {membership.status === 'active' && (
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded transition-colors disabled:opacity-50"
                >
                  <PauseCircle className="w-4 h-4 mr-2" /> Suspend User
                </button>
              )}

              {membership.status === 'suspended' && (
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded transition-colors disabled:opacity-50"
                >
                  <PlayCircle className="w-4 h-4 mr-2" /> Reactivate User
                </button>
              )}

              {membership.status !== 'removed' && (
                <button
                  onClick={handleRemove}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove from Org
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
