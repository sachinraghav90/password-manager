import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Search, Key, Copy, Check, Star, Trash2, Plus, Share, Edit2, MoreVertical, ChevronDown, ChevronRight, Box, User as UserIcon, ArrowDownUp } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/PasswordInput';

import { NewItemModal } from '../components/vault/NewItemModal';
import { ShareModal } from '../components/vault/ShareModal';
import { useAuthStore } from '../store/useAuthStore';
import { useVaultStore } from '../store/useVaultStore';
import { useItemListStore } from '../store/useItemListStore';
import { useAccountStore } from '../store/useAccountStore';
import { VaultItemForm } from '../components/vault/VaultItemForm';
import { LoginItemModal } from '../components/vault/LoginItemModal';
import { SecureNoteModal } from '../components/vault/SecureNoteModal';
import { CreditCardModal } from '../components/vault/CreditCardModal';
import { IdentityModal } from '../components/vault/IdentityModal';
import { PasswordItemModal } from '../components/vault/PasswordItemModal';
import { DocumentItemModal } from '../components/vault/DocumentItemModal';
import { ApiCredentialModal } from '../components/vault/ApiCredentialModal';
import { BankAccountModal } from '../components/vault/BankAccountModal';
import { CryptoWalletModal } from '../components/vault/CryptoWalletModal';
import { DatabaseModal } from '../components/vault/DatabaseModal';
import { DrivingLicenseModal } from '../components/vault/DrivingLicenseModal';
import { EmailAccountModal } from '../components/vault/EmailAccountModal';
import { MedicalRecordModal } from '../components/vault/MedicalRecordModal';
import { MembershipModal } from '../components/vault/MembershipModal';
import { OutdoorLicenseModal } from '../components/vault/OutdoorLicenseModal';
import { PassportModal } from '../components/vault/PassportModal';
import { RewardModal } from '../components/vault/RewardModal';
import { ServerModal } from '../components/vault/ServerModal';
import { SoftwareLicenseModal } from '../components/vault/SoftwareLicenseModal';
import { SshKeyModal } from '../components/vault/SshKeyModal';
import { SsnModal } from '../components/vault/SsnModal';
import { WirelessRouterModal } from '../components/vault/WirelessRouterModal';
import { ITEM_REGISTRY } from '../lib/itemRegistry';
import { vaultItemService } from '../lib/db/services/vaultItemService';
import { ItemType } from '../lib/db/schema';

export function VaultList() {
  const { user } = useAuthStore();
  const { mode, activeOrganizationId } = useAccountStore();
  const { activeVaultId, setActiveVault, vaults } = useVaultStore();
  const { vaultId: routeVaultId } = useParams<{ vaultId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isFavorites = location.pathname.includes('/favorites');
  const isRecent = location.pathname.includes('/recent');
  const effectiveVaultId = routeVaultId;

  const itemListStore = useItemListStore();

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (routeVaultId && routeVaultId !== activeVaultId) {
      setActiveVault(routeVaultId);
    } else if (!routeVaultId && activeVaultId) {
      setActiveVault(null);
    }
  }, [routeVaultId, activeVaultId, setActiveVault]);

  useEffect(() => {
    if (location.state?.autoFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      // Clear the state so it doesn't refocus on re-renders
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Set filters based on route context
  useEffect(() => {
    itemListStore.setFilters({
      vaultId: effectiveVaultId || null,
      favorites: isFavorites,
      recents: isRecent
    });
  }, [effectiveVaultId, isFavorites, isRecent]);

  // Load entries when user or routeVaultId changes
  useEffect(() => {
    if (user) {
      itemListStore.loadEntries(user.id, effectiveVaultId);
    }
  }, [user, effectiveVaultId]);

  // Handle Debounce for Search
  useEffect(() => {
    const handler = setTimeout(() => {
      itemListStore.setDebouncedSearchQuery(itemListStore.searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [itemListStore.searchQuery]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);

  // Handle auto-selecting an item (e.g. after creation)
  useEffect(() => {
    if (location.state?.selectedItemId && itemListStore.entries.length > 0) {
      const entry = itemListStore.entries.find(e => e.id === location.state.selectedItemId);
      if (entry) {
        setSelectedId(entry.id);
        setSelectedType(entry.itemType);
        
        // Clear the state so it doesn't re-select on route reload
        const newState = { ...location.state };
        delete newState.selectedItemId;
        window.history.replaceState(newState, '');
      }
    }
  }, [location.state, itemListStore.entries]);

  const [selectedItemDetails, setSelectedItemDetails] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch full details when an item is selected
  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      if (selectedId && selectedType && user) {
        const itemEntry = itemListStore.entries.find(i => i.id === selectedId);
        if (itemEntry) {
          try {
            const details = await vaultItemService.getItemDetails(user.id, itemEntry.vaultId, selectedId, selectedType);
            if (active) setSelectedItemDetails(details);
          } catch (err) {
            console.error(err);
          }
        }
      } else {
        if (active) setSelectedItemDetails(null);
      }
    };
    fetchDetails();
    return () => { active = false; };
  }, [selectedId, selectedType, user, itemListStore.entries]);

  // Compute final sorted & filtered list
  const displayItems = useMemo(() => {
    let result = itemListStore.entries;

    // Apply route/context filters
    if (itemListStore.filterVaultId) {
      result = result.filter(i => i.vaultId === itemListStore.filterVaultId);
    }
    if (itemListStore.filterFavorites) {
      result = result.filter(i => i.favorite);
    }
    if (itemListStore.filterRecents) {
      result = result.filter(i => i.lastAccessedAt);
    }
    if (itemListStore.filterHasAttachments) {
      result = result.filter(i => i.hasAttachments);
    }
    if (itemListStore.filterItemType) {
      result = result.filter(i => i.itemType === itemListStore.filterItemType);
    }

    // Apply search
    if (itemListStore.debouncedSearchQuery) {
      const q = itemListStore.debouncedSearchQuery.toLowerCase();
      result = result.filter(i => {
        if (i.titlePreview.toLowerCase().includes(q)) return true;
        // Check deep search results
        if (itemListStore.deepSearchMatchedIds.has(i.id)) return true;
        return false;
      });
    }

    // Apply Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (itemListStore.sortOption) {
        case 'title':
          cmp = a.titlePreview.localeCompare(b.titlePreview, undefined, { sensitivity: 'base', numeric: true });
          break;
        case 'createdAt':
          cmp = b.createdAt - a.createdAt;
          break;
        case 'updatedAt':
          cmp = b.updatedAt - a.updatedAt;
          break;
        case 'lastAccessedAt':
          cmp = (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0);
          break;
        case 'itemType':
          cmp = a.itemType.localeCompare(b.itemType);
          break;
        case 'vaultId':
          cmp = a.vaultId.localeCompare(b.vaultId);
          break;
      }
      if (cmp === 0) {
        // Stable tie-breaker
        cmp = a.id.localeCompare(b.id);
      }
      return cmp;
    });

    return result;
  }, [
    itemListStore.entries,
    itemListStore.filterVaultId,
    itemListStore.filterFavorites,
    itemListStore.filterRecents,
    itemListStore.filterHasAttachments,
    itemListStore.filterItemType,
    itemListStore.debouncedSearchQuery,
    itemListStore.deepSearchMatchedIds,
    itemListStore.sortOption
  ]);

  const handleCopy = (text: string | undefined, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async (form: any) => {
    if (!user) return;
    
    if (isEditing && selectedId && selectedType) {
      const itemEntry = itemListStore.entries.find(i => i.id === selectedId);
      if (itemEntry) {
        const updated = await vaultItemService.updateItem(user.id, itemEntry.vaultId, selectedId, selectedType, form);
        setIsEditing(false);
        setSelectedItemDetails(updated);
        await itemListStore.loadEntries(user.id, effectiveVaultId);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !selectedType || !user) return;
    const itemEntry = itemListStore.entries.find(i => i.id === selectedId);
    if (!itemEntry) return;

    if (confirm('Are you sure you want to delete this item?')) {
      await vaultItemService.deleteItem(user.id, itemEntry.vaultId, selectedId, selectedType);
      setSelectedId(null);
      setSelectedType(null);
      await itemListStore.loadEntries(user.id, effectiveVaultId);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedId || !selectedType || !user) return;
    const itemEntry = itemListStore.entries.find(i => i.id === selectedId);
    if (!itemEntry) return;
  
    try {
      const newFav = !itemEntry.favorite;
      await vaultItemService.toggleFavorite(user.id, itemEntry.vaultId, selectedId, selectedType, newFav);
      
      // Update local state instead of full refetch
      useItemListStore.setState((s) => ({
        entries: s.entries.map(it => it.id === selectedId ? { ...it, favorite: newFav } : it)
      }));
      // Update details to match
      setSelectedItemDetails({...selectedItemDetails, payload: {...selectedItemDetails.payload, favorite: newFav}});
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const triggerDeepSearch = () => {
    if (user && itemListStore.debouncedSearchQuery) {
      itemListStore.deepSearch(user.id);
    }
  };

  if (itemListStore.isLoading && itemListStore.entries.length === 0) {
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (itemListStore.error) {
    return <div className="flex h-full items-center justify-center text-destructive p-4">{itemListStore.error}</div>;
  }

  return (
    <div className="flex h-full animate-fade-in relative">
      <NewItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelectType={(type) => {
          setIsModalOpen(false);
          const route = mode === 'personal' ? '/app/personal/items/new' : `/app/organization/${activeOrganizationId}/items/new`;
          navigate(route, { state: { itemType: type, vaultId: effectiveVaultId } });
        }} 
      />
      {/* Left Pane: List */}
      <div className={`w-full md:w-64 lg:w-80 border-r border-border flex flex-col bg-background ${selectedId && !isEditing ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">{effectiveVaultId ? 'Vault Items' : 'All Items'}</h2>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                ref={searchInputRef}
                className="pl-9 bg-card" 
                placeholder="Search..." 
                value={itemListStore.searchQuery}
                onChange={e => itemListStore.setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative group">
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                 <ArrowDownUp className="w-4 h-4" />
              </Button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Sort By</div>
                <button className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 ${itemListStore.sortOption === 'title' ? 'text-primary font-medium' : ''}`} onClick={() => itemListStore.setSortOption('title')}>Title</button>
                <button className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 ${itemListStore.sortOption === 'updatedAt' ? 'text-primary font-medium' : ''}`} onClick={() => itemListStore.setSortOption('updatedAt')}>Recently Updated</button>
                <button className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 ${itemListStore.sortOption === 'lastAccessedAt' ? 'text-primary font-medium' : ''}`} onClick={() => itemListStore.setSortOption('lastAccessedAt')}>Recently Used</button>
                <button className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 ${itemListStore.sortOption === 'createdAt' ? 'text-primary font-medium' : ''}`} onClick={() => itemListStore.setSortOption('createdAt')}>Recently Created</button>
              </div>
            </div>
          </div>
          
          {itemListStore.debouncedSearchQuery && !itemListStore.isDeepSearching && (
             <Button variant="outline" size="sm" className="w-full text-xs" onClick={triggerDeepSearch}>
               Search inside items
             </Button>
          )}
          {itemListStore.isDeepSearching && (
             <div className="text-xs text-muted-foreground text-center animate-pulse">Deep searching...</div>
          )}
        </div>
        
        <div className="flex-1">
          {displayItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No items found.
            </div>
          ) : (
            <Virtuoso
              className="h-full w-full"
              data={displayItems}
              itemContent={(_, item) => {
                const config = ITEM_REGISTRY[item.itemType];
                const Icon = config?.icon || Key;
                const isDeepMatch = itemListStore.debouncedSearchQuery && itemListStore.deepSearchMatchedIds.has(item.id) && !item.titlePreview.toLowerCase().includes(itemListStore.debouncedSearchQuery.toLowerCase());
                
                return (
                  <div
                    onPointerDown={(e) => {
                      if (e.pointerType === 'mouse' && e.button !== 0) return;
                      setSelectedId(item.id); 
                      setSelectedType(item.itemType); 
                      setIsEditing(false);
                    }}
                    onClick={(e) => e.preventDefault()}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 ${selectedId === item.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className={`text-sm font-semibold truncate ${selectedId === item.id ? 'text-primary' : 'text-foreground'}`}>
                            {item.titlePreview}
                          </h3>
                          {item.favorite && <Star className="w-3 h-3 text-yellow-500 fill-current mt-1 flex-shrink-0" />}
                        </div>
                        <div className="flex justify-between items-center mt-0.5">
                           <p className="text-xs text-muted-foreground truncate">{config?.displayName || 'Unknown'}</p>
                           {isDeepMatch && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Match found inside item</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Right Pane: Detail / Form */}
      <div className={`flex-1 flex-col bg-card overflow-y-auto ${selectedId || isEditing ? 'flex' : 'hidden md:flex'}`}>
        
        {isEditing && selectedType && selectedItemDetails ? (
          selectedType === 'login' ? (
            <LoginItemModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'secure_note' ? (
            <SecureNoteModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'credit_card' ? (
            <CreditCardModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'identity' ? (
            <IdentityModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'password' ? (
            <PasswordItemModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'document' ? (
            <DocumentItemModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'api_credential' ? (
            <ApiCredentialModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'bank_account' ? (
            <BankAccountModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'crypto_wallet' ? (
            <CryptoWalletModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'database' ? (
            <DatabaseModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'driving_license' ? (
            <DrivingLicenseModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'email' ? (
            <EmailAccountModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'medical_record' ? (
            <MedicalRecordModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'membership' ? (
            <MembershipModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'outdoor_license' ? (
            <OutdoorLicenseModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'passport' ? (
            <PassportModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'rewards' ? (
            <RewardModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'software_license' ? (
            <SoftwareLicenseModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'wireless_router' ? (
            <WirelessRouterModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'server' ? (
            <ServerModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'ssn' ? (
            <SsnModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : selectedType === 'ssh_key' ? (
            <SshKeyModal isOpen={true} mode="edit" initialData={{...selectedItemDetails.payload, vaultId: selectedItemDetails.vaultId}} onSave={handleSave} onClose={() => setIsEditing(false)}/>
          ) : (
            <VaultItemForm itemType={selectedType} initialData={selectedItemDetails} onSubmit={handleSave} onCancel={() => setIsEditing(false)} />
          )
        ) : selectedItemDetails && selectedType ? (
          <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative animate-fade-in">
            {/* Top Toolbar */}
            <div className="h-14 flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-2 sm:py-0 border-b border-border shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
              <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
                <div className="flex items-center gap-1.5 hover:bg-secondary/50 px-2 py-1 rounded cursor-pointer max-w-[150px]">
                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <UserIcon className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="truncate">{user?.fullName || 'User'}</span>
                </div>
                <span className="text-muted-foreground/30 shrink-0">›</span>
                <div className="flex items-center gap-1.5 hover:bg-secondary/50 px-2 py-1 rounded cursor-pointer max-w-[150px]">
                  <div className="w-5 h-5 rounded bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                    <Box className="w-3 h-3" />
                  </div>
                  <span className="truncate">{vaults.find(v => v.id === selectedItemDetails.vaultId)?.name || 'Vault'}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 mt-2 sm:mt-0">
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-muted-foreground hover:text-yellow-500" onClick={handleToggleFavorite}>
                   {selectedItemDetails?.payload?.favorite ? <Star className="w-4 h-4 fill-current text-yellow-500" /> : <Star className="w-4 h-4" />}
                   <span className="hidden sm:inline">Favorite</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 h-8 hidden sm:flex text-muted-foreground hover:text-foreground" onClick={() => setIsShareModalOpen(true)}> 
                  <Share className="w-4 h-4" /> Share 
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}> 
                  <Edit2 className="w-4 h-4" /> Edit 
                </Button>
                <div className="relative group">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"> 
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2" onClick={handleDelete}>
                       <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
                {/* Mobile Back Button */}
                <Button variant="ghost" size="sm" className="md:hidden ml-auto h-8" onClick={() => setSelectedId(null)}>← Back</Button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-2xl mx-auto w-full">
                {(() => {
                  const config = ITEM_REGISTRY[selectedType];
                  const payload = selectedItemDetails.payload;
                  const title = payload.title || selectedItemDetails.title || 'Untitled';
                  
                  return (
                    <>
                      {/* Warning Banner */}
                      {selectedType === 'login' && payload?.password && payload.password.length < 10 && (
                        <div className="mb-8 rounded-xl bg-[#c54b38] text-white p-4 flex items-start justify-between shadow-sm">
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold flex items-center gap-2">
                              <ChevronDown className="w-4 h-4" /> Weak password
                            </div>
                            <p className="text-sm text-white/90 ml-6">This password is too easy to guess. Change your password to something stronger.</p>
                          </div>
                        </div>
                      )}

                      {/* Title Section */}
                      <div className="flex items-center gap-6 mb-10">
                        <div className="w-20 h-20 rounded-[1.25rem] bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold shrink-0">
                          {title.substring(0, 2).toUpperCase()}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">{title}</h1>
                      </div>

                      {/* Fields Card */}
                      <div className="bg-card border border-border shadow-sm overflow-hidden rounded-xl">
                        <div className="divide-y divide-border">
                          {config?.fields.map(field => {
                            const val = payload[field.name];
                            if (!val && !field.required) return null;
                            
                            return (
                              <div key={field.name} className="p-5 flex flex-col gap-1.5 group hover:bg-muted/50 transition-colors relative">
                                <label className="text-xs font-semibold text-primary/80">{field.label.toLowerCase()}</label>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    {field.type === 'textarea' ? (
                                      <div className="whitespace-pre-wrap text-sm text-foreground/90">{val || '-'}</div>
                                    ) : field.type === 'password' || (field.type === 'text' && field.sensitive) ? (
                                      <div className="flex items-center justify-between gap-4 w-full">
                                        <PasswordInput 
                                          value={val || ''} 
                                          readOnly 
                                          className="border-0 bg-transparent px-0 font-mono text-xl tracking-widest focus-visible:ring-0 shadow-none h-auto flex-1 truncate text-foreground/90" 
                                        />
                                        {val && val.length < 10 && field.type === 'password' && (
                                          <div className="flex items-center gap-2 shrink-0 pr-8">
                                            <span className="text-xs text-muted-foreground">Weak</span>
                                            <div className="w-3 h-3 rounded-full border-2 border-yellow-500 border-r-transparent rotate-45"></div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-foreground/90 font-medium truncate block">{val || '-'}</span>
                                    )}
                                  </div>
                                  
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(val, field.name)} className="h-8 w-8 p-0 bg-secondary/50 hover:bg-secondary text-foreground">
                                      {copiedField === field.name ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Common Fields */}
                          {Array.isArray(payload.commonFields) && payload.commonFields.map((f: any, idx: number) => (
                            f.fieldValue ? (
                              <div key={`common-${f.id || idx}`} className="p-5 flex flex-col gap-1.5 group hover:bg-muted/50 transition-colors relative">
                                <label className="text-xs font-semibold text-primary/80">{f.fieldLabel.toLowerCase()}</label>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    {f.fieldType === 'password' ? (
                                      <div className="flex items-center justify-between gap-4 w-full">
                                        <PasswordInput 
                                          value={f.fieldValue} 
                                          readOnly 
                                          className="border-0 bg-transparent px-0 font-mono text-xl tracking-widest focus-visible:ring-0 shadow-none h-auto flex-1 truncate text-foreground/90" 
                                        />
                                      </div>
                                    ) : f.fieldType === 'url' ? (
                                      <a href={f.fieldValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium truncate block">
                                        {f.fieldValue}
                                      </a>
                                    ) : (
                                      <span className="text-foreground/90 font-medium truncate block">{f.fieldValue}</span>
                                    )}
                                  </div>
                                  
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(f.fieldValue, `common-${idx}`)} className="h-8 w-8 p-0 bg-secondary/50 hover:bg-secondary text-foreground">
                                      {copiedField === `common-${idx}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                      
                      {/* Last Edited */}
                      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground/70 cursor-pointer hover:text-muted-foreground transition-colors mb-20">
                        <ChevronRight className="w-4 h-4" />
                        Last edited {new Date(itemListStore.entries.find(i => i.id === selectedId)?.updatedAt || Date.now()).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground hidden md:flex">
            <Key className="w-16 h-16 mb-4 opacity-20" />
            <p>Select an item to view details</p>
          </div>
        )}
      </div>
      {/* Share Modal */}
      {isShareModalOpen && activeOrganizationId && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          organizationId={activeOrganizationId}
          vaultId={selectedItemDetails?.vaultId}
          itemId={selectedId || undefined}
        />
      )}
    </div>
  );
}
