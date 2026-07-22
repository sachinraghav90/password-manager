import { useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter } from '../../adapters';
import { useState, useEffect } from 'react';

import { Loader2, Share2, Search, X, Users, User as UserIcon, ShieldAlert, Check } from 'lucide-react';
import { Button } from '../ui/Button';

type EffectivePolicy = { allowSharing: boolean; allowTeamTargets: boolean; allowDirectUserTargets: boolean; source?: string };

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  vaultId: string;
  itemId?: string; // If undefined, it means sharing the entire vault
}

export function ShareModal({ isOpen, onClose, organizationId, vaultId, itemId }: ShareModalProps) {
  const { user } = useAuthAdapter();
  const { getSharingPolicy, searchOrgUsers, getUserTeams } = useVaultAdapter();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<EffectivePolicy | null>(null);
  
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedTargets, setSelectedTargets] = useState<Array<{ id: string, type: 'team' | 'user', name: string }>>([]);

  useEffect(() => {
    if (!isOpen || !user || !organizationId || !vaultId) return;
    
    async function init() {
      setLoading(true);
      try {
        // 1. Get Effective Policy
        const effPolicy = itemId 
          ? await getSharingPolicy(organizationId, vaultId, itemId)
          : await getSharingPolicy(organizationId, vaultId);
        
        setPolicy(effPolicy);

        // 2. Load User's Teams
        if (effPolicy.allowSharing && effPolicy.allowTeamTargets) {
          const teams = await getUserTeams(organizationId, user!.id);
            setUserTeams(teams);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [isOpen, user, organizationId, vaultId, itemId]);

  // Debounced user search
  useEffect(() => {
    if (!policy?.allowDirectUserTargets || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.toLowerCase();
        // Since we don't have a backend, we'll scan users in the org
        const results = await searchOrgUsers(organizationId, query);
        setSearchResults(results.filter(u => u.id !== user?.id));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    
    return () => clearTimeout(handler);
  }, [searchQuery, policy, organizationId, user]);

  const toggleTarget = (id: string, type: 'team' | 'user', name: string) => {
    if (selectedTargets.find(t => t.id === id)) {
      setSelectedTargets(selectedTargets.filter(t => t.id !== id));
    } else {
      setSelectedTargets([...selectedTargets, { id, type, name }]);
    }
  };

  const handleShare = async () => {
    // In a real app, this would write to item_shares or vault_shares tables
    alert(`Successfully shared with ${selectedTargets.length} targets!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center">
            <Share2 className="w-5 h-5 mr-2 text-primary" />
            Share {itemId ? 'Item' : 'Vault'}
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !policy?.allowSharing ? (
            <div className="text-center py-8 space-y-4">
              <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="text-lg font-bold text-foreground">Sharing is Disabled</h3>
              <p className="text-muted-foreground">
                You do not have access to sharing. The administrator has explicitly denied sharing for this {itemId ? 'item' : 'vault'}.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Teams Selection */}
              {policy.allowTeamTargets && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                    <Users className="w-4 h-4 mr-2" /> Share Inside Team
                  </h3>
                  {userTeams.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded">
                      You are not a member of any teams.
                    </p>
                  ) : (
                    <div className="space-y-2 border border-border rounded-lg p-2 max-h-48 overflow-y-auto">
                      {userTeams.map(team => {
                        const isSelected = selectedTargets.some(t => t.id === team.id);
                        return (
                          <div 
                            key={team.id}
                            onClick={() => toggleTarget(team.id, 'team', team.name)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-sm">{team.name}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Direct User Selection */}
              {policy.allowDirectUserTargets && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" /> Share Outside Team
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search users by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  {!isSearching && searchResults.length > 0 && (
                    <div className="space-y-1 mt-2 border border-border rounded-lg p-1 max-h-48 overflow-y-auto bg-muted/10">
                      {searchResults.map(u => {
                        const isSelected = selectedTargets.some(t => t.id === u.id);
                        return (
                          <div 
                            key={u.id}
                            onClick={() => toggleTarget(u.id, 'user', u.email)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{u.fullName}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground italic text-center p-4">No users found.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {policy?.allowSharing ? 'Cancel' : 'Close'}
          </Button>
          {policy?.allowSharing && (
            <Button onClick={handleShare} disabled={selectedTargets.length === 0}>
              Share with {selectedTargets.length} target(s)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
