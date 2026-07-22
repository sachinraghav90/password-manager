import { createContext, useContext } from 'react';
import { ItemType } from '@vaultguard/models';

export type SortOption = 'title' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'itemType' | 'vaultId';

export interface ItemListAdapter {
  entries: any[];
  deepSearchMatchedIds: Set<string>;
  
  isLoading: boolean;
  isDeepSearching: boolean;
  error: string | null;
  
  searchQuery: string;
  debouncedSearchQuery: string;
  sortOption: SortOption;
  
  filterVaultId: string | null;
  filterItemType: ItemType | null;
  filterFavorites: boolean;
  filterRecents: boolean;
  filterHasAttachments: boolean;
  
  setSearchQuery: (q: string) => void;
  setDebouncedSearchQuery: (q: string) => void;
  setSortOption: (opt: SortOption) => void;
  setFilters: (filters: Partial<any>) => void;
  clearFilters: () => void;
  updateEntryLocal: (id: string, updates: Partial<any>) => void;
  loadItems: (userId: string, orgId: string | null) => Promise<void>;
  loadEntries: (userId: string, vaultId: string | null) => Promise<void>;
  deepSearch: (userId: string) => Promise<void>;
  resetState: () => void;
  
  getRecentItems: (userId: string, limit: number) => Promise<any[]>;
  
  getItemDetails: (userId: string, vaultId: string, itemId: string, itemType: string) => Promise<any>;
  updateItem: (userId: string, vaultId: string, itemId: string, itemType: string, form: any) => Promise<any>;
  deleteItem: (userId: string, vaultId: string, itemId: string, itemType: string) => Promise<void>;
  toggleFavorite: (userId: string, vaultId: string, itemId: string, itemType: string, isFav: boolean) => Promise<void>;
}

export const ItemListAdapterContext = createContext<ItemListAdapter | null>(null);

export const useItemListAdapter = () => {
  const ctx = useContext(ItemListAdapterContext);
  if (!ctx) throw new Error('Missing ItemListAdapter provider');
  return ctx;
};
