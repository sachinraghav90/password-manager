import { create } from 'zustand';
import { VaultItemListEntry, vaultItemService } from '../lib/db/services/vaultItemService';
import { ItemType } from '../lib/db/schema';

type SortOption = 'title' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'itemType' | 'vaultId';

interface ItemListState {
  entries: VaultItemListEntry[];
  deepSearchMatchedIds: Set<string>;
  
  isLoading: boolean;
  isDeepSearching: boolean;
  error: string | null;
  
  searchQuery: string;
  debouncedSearchQuery: string;
  sortOption: SortOption;
  
  // Filters
  filterVaultId: string | null;
  filterItemType: ItemType | null;
  filterFavorites: boolean;
  filterRecents: boolean;
  filterHasAttachments: boolean;
  
  // Abort controller for cancellation
  abortController: AbortController | null;
  
  // Actions
  setSearchQuery: (q: string) => void;
  setDebouncedSearchQuery: (q: string) => void;
  setSortOption: (s: SortOption) => void;
  
  setFilters: (filters: {
    vaultId?: string | null;
    itemType?: ItemType | null;
    favorites?: boolean;
    recents?: boolean;
    hasAttachments?: boolean;
  }) => void;
  
  loadEntries: (userId: string, vaultId?: string) => Promise<void>;
  deepSearch: (userId: string) => Promise<void>;
  
  clear: () => void;
}

export const useItemListStore = create<ItemListState>((set, get) => ({
  entries: [],
  deepSearchMatchedIds: new Set(),
  
  isLoading: false,
  isDeepSearching: false,
  error: null,
  
  searchQuery: '',
  debouncedSearchQuery: '',
  sortOption: 'title',
  
  filterVaultId: null,
  filterItemType: null,
  filterFavorites: false,
  filterRecents: false,
  filterHasAttachments: false,
  
  abortController: null,
  
  setSearchQuery: (q) => set({ searchQuery: q }),
  setDebouncedSearchQuery: (q) => set({ debouncedSearchQuery: q }),
  setSortOption: (s) => set({ sortOption: s }),
  
  setFilters: (filters) => set((state) => ({ ...state, ...filters })),
  
  loadEntries: async (userId, vaultId) => {
    // Cancel any ongoing load
    const currentAbort = get().abortController;
    if (currentAbort) currentAbort.abort();
    
    const ac = new AbortController();
    set({ isLoading: true, error: null, abortController: ac, entries: [], deepSearchMatchedIds: new Set() });
    
    try {
      const allEntries = await vaultItemService.getListEntries(userId, vaultId, ac.signal, (batch) => {
        // We can optionally do progressive rendering here if we want to show items as they load
        // But for now we just wait for the whole list or update in chunks
        set((state) => ({
          entries: [...state.entries, ...batch]
        }));
      });
      // The final sorted entries from the service (progressive rendering might mean we wait)
      set({ entries: allEntries, isLoading: false, abortController: null });
    } catch (err: any) {
      if (err.message !== 'Aborted') {
        set({ error: err.message, isLoading: false, abortController: null });
      }
    }
  },
  
  deepSearch: async (userId) => {
    const { debouncedSearchQuery, entries, filterVaultId, filterItemType, filterFavorites, filterRecents, filterHasAttachments } = get();
    if (!debouncedSearchQuery) {
      set({ deepSearchMatchedIds: new Set() });
      return;
    }
    
    const currentAbort = get().abortController;
    if (currentAbort) currentAbort.abort();
    
    const ac = new AbortController();
    set({ isDeepSearching: true, abortController: ac, deepSearchMatchedIds: new Set() });
    
    // First, find candidates based on current filters
    const candidates = entries.filter(item => {
      if (filterVaultId && item.vaultId !== filterVaultId) return false;
      if (filterItemType && item.itemType !== filterItemType) return false;
      if (filterFavorites && !item.favorite) return false;
      if (filterRecents && !item.lastAccessedAt) return false;
      if (filterHasAttachments && !item.hasAttachments) return false;
      return true;
    });
    
    try {
      await vaultItemService.deepSearchPayloads(userId, candidates, debouncedSearchQuery, ac.signal, (id) => {
        set((state) => {
          const newSet = new Set(state.deepSearchMatchedIds);
          newSet.add(id);
          return { deepSearchMatchedIds: newSet };
        });
      });
      
      set({ isDeepSearching: false, abortController: null });
    } catch (err: any) {
      if (err.message !== 'Aborted') {
        set({ isDeepSearching: false, abortController: null });
        console.error('Deep search error:', err);
      }
    }
  },
  
  clear: () => {
    const currentAbort = get().abortController;
    if (currentAbort) currentAbort.abort();
    
    set({
      entries: [],
      deepSearchMatchedIds: new Set(),
      searchQuery: '',
      debouncedSearchQuery: '',
      isLoading: false,
      isDeepSearching: false,
      error: null,
      abortController: null
    });
  }
}));
