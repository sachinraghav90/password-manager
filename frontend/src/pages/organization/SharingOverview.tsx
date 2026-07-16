import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/db/client';
import { sharingPolicyService, PolicyState } from '../../lib/db/services/sharingPolicyService';
import { vaultItemService, VaultItemListEntry } from '../../lib/db/services/vaultItemService';
import { useAuthStore } from '../../store/useAuthStore';
import { Vault } from '../../lib/db/schema';
import { Loader2, Share2, ChevronDown, ChevronRight, ShieldAlert, Check } from 'lucide-react';

export function SharingOverview() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultPolicies, setVaultPolicies] = useState<Record<string, PolicyState>>({});
  const [itemPolicies, setItemPolicies] = useState<Record<string, PolicyState>>({});
  
  const [expandedVaults, setExpandedVaults] = useState<Set<string>>(new Set());
  const [vaultItems, setVaultItems] = useState<Record<string, VaultItemListEntry[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    if (!organizationId || !user) return;
    try {
      const orgVaults = await db.vaults.where('organizationId').equals(organizationId).toArray();
      setVaults(orgVaults);
      
      const vPolicies: Record<string, PolicyState> = {};
      for (const v of orgVaults) {
        const policy = await sharingPolicyService.getVaultPolicy(organizationId, v.id);
        if (policy && policy.mode === 'override') {
          if (!policy.allowSharing) vPolicies[v.id] = 'deny';
          else if (policy.allowTeamTargets && !policy.allowDirectUserTargets) vPolicies[v.id] = 'team_only';
          else if (policy.allowTeamTargets && policy.allowDirectUserTargets) vPolicies[v.id] = 'all';
        }
      }
      setVaultPolicies(vPolicies);
      
      // Load all item policies for this org
      const iPolicies = await db.item_sharing_policies.where('organizationId').equals(organizationId).toArray();
      const iPolicyMap: Record<string, PolicyState> = {};
      for (const p of iPolicies) {
        if (p.mode === 'override') {
          if (!p.allowSharing) iPolicyMap[p.itemId] = 'deny';
          else if (p.allowTeamTargets && !p.allowDirectUserTargets) iPolicyMap[p.itemId] = 'team_only';
          else if (p.allowTeamTargets && p.allowDirectUserTargets) iPolicyMap[p.itemId] = 'all';
        }
      }
      setItemPolicies(iPolicyMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId, user]);

  const toggleVault = async (vaultId: string) => {
    const next = new Set(expandedVaults);
    if (next.has(vaultId)) {
      next.delete(vaultId);
      setExpandedVaults(next);
    } else {
      next.add(vaultId);
      setExpandedVaults(next);
      
      if (!vaultItems[vaultId] && user) {
        setLoadingItems(prev => ({ ...prev, [vaultId]: true }));
        try {
          const items = await vaultItemService.getListEntries(user.id, vaultId);
          setVaultItems(prev => ({ ...prev, [vaultId]: items }));
        } catch (err) {
          console.error("Failed to load items. You might not have the vault key.", err);
        } finally {
          setLoadingItems(prev => ({ ...prev, [vaultId]: false }));
        }
      }
    }
  };

  const handleVaultPolicyChange = async (vaultId: string, state: PolicyState) => {
    if (!user || !organizationId) return;
    try {
      await sharingPolicyService.setVaultPolicy(user.id, organizationId, vaultId, state);
      setVaultPolicies(prev => ({ ...prev, [vaultId]: state }));
    } catch (err) {
      console.error(err);
      alert("Failed to update vault policy");
    }
  };

  const handleItemPolicyChange = async (vaultId: string, itemId: string, itemType: string, state: PolicyState | null) => {
    if (!user || !organizationId) return;
    try {
      await sharingPolicyService.setItemPolicy(user.id, organizationId, vaultId, itemId, itemType as any, state);
      setItemPolicies(prev => {
        const next = { ...prev };
        if (state === null) delete next[itemId];
        else next[itemId] = state;
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update item policy");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <Share2 className="w-6 h-6 mr-3 text-primary" />
          Sharing Policies
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Configure sharing capabilities for vaults and individual items.</p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 font-semibold text-sm text-muted-foreground">
          <div className="col-span-5">Resource</div>
          <div className="col-span-2 text-center text-destructive">Deny</div>
          <div className="col-span-2 text-center text-blue-500">Allow Inside Team</div>
          <div className="col-span-3 text-center text-emerald-500">Allow Outside Team</div>
        </div>

        {vaults.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No vaults found in this organization.</div>
        )}

        {vaults.map(vault => {
          const vPolicy = vaultPolicies[vault.id] || 'all'; // Default all if not explicitly set in DB (or inherited from org)
          const isExpanded = expandedVaults.has(vault.id);
          const items = vaultItems[vault.id];
          const isLoadingItems = loadingItems[vault.id];

          return (
            <div key={vault.id} className="border-b border-border last:border-b-0">
              {/* Vault Row */}
              <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                <div 
                  className="col-span-5 flex items-center cursor-pointer select-none font-medium text-foreground"
                  onClick={() => toggleVault(vault.id)}
                >
                  <button className="p-1 mr-2 hover:bg-muted rounded text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {vault.name}
                </div>
                
                {/* Vault Policy Controls */}
                <div className="col-span-2 flex justify-center">
                  <PolicyRadio 
                    selected={vPolicy === 'deny'} 
                    onChange={() => handleVaultPolicyChange(vault.id, 'deny')} 
                    borderColor="#ef4444"
                    fillColor="#ef4444"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <PolicyRadio 
                    selected={vPolicy === 'team_only'} 
                    onChange={() => handleVaultPolicyChange(vault.id, 'team_only')} 
                    borderColor="#3b82f6"
                    fillColor="#3b82f6"
                  />
                </div>
                <div className="col-span-3 flex justify-center">
                  <PolicyRadio 
                    selected={vPolicy === 'all'} 
                    onChange={() => handleVaultPolicyChange(vault.id, 'all')} 
                    borderColor="#10b981"
                    fillColor="#10b981"
                  />
                </div>
              </div>

              {/* Items List */}
              {isExpanded && (
                <div className="bg-muted/10 border-t border-border">
                  {isLoadingItems && (
                    <div className="p-4 text-center text-muted-foreground flex justify-center items-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading items...
                    </div>
                  )}
                  
                  {!isLoadingItems && items?.length === 0 && (
                    <div className="p-4 pl-14 text-sm text-muted-foreground italic">
                      No items in this vault.
                    </div>
                  )}

                  {!isLoadingItems && items?.map(item => {
                    const iPolicy = itemPolicies[item.id]; // explicit override
                    const effectivePolicy = iPolicy || vPolicy; // if not configured individually, default with vault settings
                    const isConfiguredIndividually = !!iPolicy;

                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-4 p-3 pl-14 items-center border-t border-border/50 text-sm hover:bg-muted/30">
                        <div className="col-span-5 text-foreground flex items-center">
                          <span className="truncate">{item.titlePreview}</span>
                          {!isConfiguredIndividually && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
                              Inherited
                            </span>
                          )}
                        </div>

                        {/* Item Policy Controls */}
                        <div className="col-span-2 flex justify-center">
                          <PolicyRadio 
                            selected={effectivePolicy === 'deny'} 
                            onChange={() => handleItemPolicyChange(vault.id, item.id, item.itemType, effectivePolicy === 'deny' && isConfiguredIndividually ? null : 'deny')} 
                            borderColor="#ef4444"
                            fillColor="#ef4444"
                            isInherited={!isConfiguredIndividually}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <PolicyRadio 
                            selected={effectivePolicy === 'team_only'} 
                            onChange={() => handleItemPolicyChange(vault.id, item.id, item.itemType, effectivePolicy === 'team_only' && isConfiguredIndividually ? null : 'team_only')} 
                            borderColor="#3b82f6"
                            fillColor="#3b82f6"
                            isInherited={!isConfiguredIndividually}
                          />
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <PolicyRadio 
                            selected={effectivePolicy === 'all'} 
                            onChange={() => handleItemPolicyChange(vault.id, item.id, item.itemType, effectivePolicy === 'all' && isConfiguredIndividually ? null : 'all')} 
                            borderColor="#10b981"
                            fillColor="#10b981"
                            isInherited={!isConfiguredIndividually}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PolicyRadio({ 
  selected, 
  onChange, 
  borderColor,
  fillColor,
  isInherited = false 
}: { 
  selected: boolean, 
  onChange: () => void, 
  borderColor: string,
  fillColor: string,
  isInherited?: boolean 
}) {
  return (
    <button
      onClick={onChange}
      title={isInherited ? "Inheriting from Vault (Click to override)" : "Click to select or deselect"}
      style={{ borderColor: selected ? borderColor : '#9ca3af' }}
      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
        selected ? 'shadow-md' : 'opacity-60 hover:opacity-100'
      }`}
    >
      {selected && (
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: isInherited ? '#9ca3af' : fillColor }}
        />
      )}
    </button>
  );
}
