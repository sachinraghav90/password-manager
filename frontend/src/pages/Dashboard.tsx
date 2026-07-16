import { useState, useEffect, useMemo } from 'react';
import { Search, Clock, Star, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { NewItemModal } from '../components/vault/NewItemModal';
import { useAuthStore } from '../store/useAuthStore';
import { vaultItemService } from '../lib/db/services/vaultItemService';
import { useItemListStore } from '../store/useItemListStore';
import { useVaultStore } from '../store/useVaultStore';
import { useAccountStore } from '../store/useAccountStore';

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return location.state?.openNewItemModal || false;
  });
  const { user } = useAuthStore();
  const { mode, activeOrganizationId } = useAccountStore();
  const { vaults } = useVaultStore();
  const entries = useItemListStore(s => s.entries);
  const isLoading = useItemListStore(s => s.isLoading);
  const loadEntries = useItemListStore(s => s.loadEntries);
  const [weakCount, setWeakCount] = useState(0);

  const contextVaults = vaults.filter(v => mode === 'personal' ? v.ownershipType === 'personal' : v.organizationId === activeOrganizationId);
  const hasVaults = contextVaults.length > 0;

  useEffect(() => {
    if (location.state?.openNewItemModal) {
      window.history.replaceState({}, '');
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      loadEntries(user.id);
    }
  }, [user?.id, loadEntries]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      try {
        const allEntries = entries;

        // Security Analysis: check logins for weak passwords (< 8 chars)
        const loginEntries = allEntries.filter(e => e.itemType === 'login');
        let weakLogins = 0;
        
        // This could be optimized to not decrypt everything but we only do it on mount
        for (const entry of loginEntries) {
          try {
            const details = await vaultItemService.getItemDetails(user.id, entry.vaultId, entry.id, 'login');
            if (details.payload?.password && details.payload.password.length < 8) {
              weakLogins++;
            }
          } catch (e) {
            // ignore decryption errors for analysis
          }
        }
        setWeakCount(weakLogins);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    
    // Only run if we actually have entries loaded
    if (entries.length > 0 && !isLoading) {
      loadDashboardData();
    }
  }, [user, entries, isLoading]);

  const handleSelectType = (type: string) => {
    const route = mode === 'personal' ? '/app/personal/items/new' : `/app/organization/${activeOrganizationId}/items/new`;
    navigate(route, { state: { itemType: type } });
  };

  const recentItems = useMemo(() => {
    return entries
      .filter(i => i.lastAccessedAt != null)
      .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, 5);
  }, [entries]);

  const favoriteItems = useMemo(() => {
    return entries
      .filter(i => i.favorite)
      .slice(0, 5);
  }, [entries]);

  const securityScore = entries.length === 0 ? 100 : (weakCount === 0 ? 100 : Math.max(10, 100 - (weakCount * 15)));
  const securityColor = securityScore > 80 ? 'blue' : securityScore > 50 ? 'yellow' : 'red';
  
  const hasItems = entries.length > 0;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 relative">
      <NewItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelectType={handleSelectType} 
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Good morning, {user?.fullName?.split(' ')[0] || 'User'}</h1>
          <p className="text-muted-foreground mt-1">Here is your security overview for today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 w-full md:w-64 bg-card" 
              placeholder="Global Search" 
              onClick={() => {
                const route = mode === 'personal' ? '/app/personal/all-items' : `/app/organization/${activeOrganizationId}/all-items`;
                navigate(route, { state: { autoFocusSearch: true } });
              }}
            />
          </div>
          {hasVaults && (
            <Button onClick={() => setIsModalOpen(true)} className="shrink-0 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> New Item
            </Button>
          )}
        </div>
      </div>

      {/* Security Hero */}
      <Card className={`bg-gradient-to-br from-${securityColor}-50 to-${securityColor}-100 dark:from-${securityColor}-950/40 dark:to-${securityColor}-900/40 border-${securityColor}-100 dark:border-${securityColor}-900`}>
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
          <div className={`relative w-32 h-32 rounded-full border-8 border-${securityColor}-200 dark:border-${securityColor}-800 flex items-center justify-center flex-shrink-0`}>
            <span className={`text-4xl font-black text-${securityColor}-600 dark:text-${securityColor}-400`}>{securityScore}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-col">
              {hasItems ? (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">Your Security Score is {securityScore === 100 ? 'Good' : 'Needs Attention'}</h2>
                  <p className="text-muted-foreground mb-6">
                    {securityScore === 100 ? 'All your passwords look strong! Keep up the good work.' : `You have ${weakCount} weak passwords. We recommend updating them.`}
                  </p>
                  <div>
                    <Button variant="secondary" onClick={() => {
                      const route = mode === 'personal' ? '/app/personal/all-items' : `/app/organization/${activeOrganizationId}/all-items`;
                      navigate(route);
                    }}>Review Items</Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {hasVaults ? 'Your Vault is Empty' : 'No Vaults Created'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {hasVaults ? 'Start adding items to secure your digital life.' : 'Create a vault first to start securing your data.'}
                  </p>
                  <div>
                    {hasVaults ? (
                      <Button variant="secondary" onClick={() => {
                        const route = mode === 'personal' ? '/app/personal/items/new' : `/app/organization/${activeOrganizationId}/items/new`;
                        navigate(route);
                      }}>Create Item</Button>
                    ) : (
                      <Button variant="default" onClick={() => navigate(mode === 'personal' ? '/app/personal/vaults/new' : `/app/organization/${activeOrganizationId}/vaults/new`)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Vault
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recents */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Recently Used</h3>
          </div>
          <div className="space-y-3">
            {recentItems.length > 0 ? recentItems.map((item) => (
              <Card key={item.id} className="hover:bg-accent hover:border-accent cursor-pointer transition-colors" onClick={() => navigate(`/app/vaults/${item.vaultId}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-500 text-xs">
                      {item.titlePreview.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.titlePreview}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{item.itemType}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-sm text-muted-foreground p-2">No recent items</p>
            )}
          </div>
        </div>

        {/* Favorites */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Favorites</h3>
          </div>
          <div className="space-y-3">
            {favoriteItems.length > 0 ? favoriteItems.map((item) => (
              <Card key={item.id} className="hover:bg-accent hover:border-accent cursor-pointer transition-colors" onClick={() => navigate(`/app/vaults/${item.vaultId}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center font-bold text-blue-500 text-xs">
                       {item.titlePreview.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.titlePreview}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{item.itemType}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-sm text-muted-foreground p-2">No favorite items</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
