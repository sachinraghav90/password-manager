import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '@vaultguard/db-local';
import { teamService } from '../../lib/db/services/teamService';
import { useAuthStore } from '../../store/useAuthStore';
import { OrganizationTeam, OrganizationTeamMembership } from '@vaultguard/models';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export function TeamsList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [teams, setTeams] = useState<OrganizationTeam[]>([]);
  const [teamMemberships, setTeamMemberships] = useState<OrganizationTeamMembership[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  const loadData = async () => {
    if (!organizationId) return;
    try {
      const t = await db.organization_teams.where({ organizationId }).toArray();
      const tm = await db.organization_team_memberships.where({ organizationId }).toArray();
      setTeams(t);
      setTeamMemberships(tm);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationId) return;
    setActionLoading(true);
    setError(null);
    try {
      await teamService.createTeam(user.id, organizationId, newTeamName, newTeamDescription);
      setIsCreating(false);
      setNewTeamName('');
      setNewTeamDescription('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!user || !organizationId) return;
    if (!confirm('Are you sure you want to delete this team? Any share grants to this team will be marked for revocation review.')) return;
    
    setActionLoading(true);
    try {
      await teamService.deleteTeam(user.id, organizationId, teamId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground text-sm mt-1">Group users together to simplify sharing policies.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 rounded-md transition-colors bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm">
          {error}
        </div>
      )}

      {isCreating && (
        <form onSubmit={handleCreateTeam} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Create New Team</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Team Name</label>
            <input
              type="text"
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Description (Optional)</label>
            <input
              type="text"
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Team
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => {
          const membersCount = teamMemberships.filter(tm => tm.teamId === team.id).length;
          return (
            <div key={team.id} className="bg-card border border-border rounded-lg p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-foreground">{team.name}</h3>
                <div className="flex space-x-2">
                  <button onClick={() => handleDeleteTeam(team.id)} disabled={actionLoading} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {team.description && <p className="text-sm text-muted-foreground mb-4 flex-1">{team.description}</p>}
              <div className="mt-auto flex justify-between items-center text-sm border-t border-border pt-4 mt-4">
                <span className="text-muted-foreground">{membersCount} member{membersCount !== 1 ? 's' : ''}</span>
                <span className="text-primary cursor-pointer hover:text-primary/80 transition-colors">Manage Members</span>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No teams created yet.
          </div>
        )}
      </div>
    </div>
  );
}
