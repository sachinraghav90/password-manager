import { createContext, useContext } from 'react';
import { Vault, VaultItem } from '@vaultguard/models';

export interface VaultAdapter {
  vaults: Vault[];
  items: VaultItem[];
  isLoading: boolean;
  activeVaultId?: string | null;
  setActiveVault: (id: string | null | undefined) => void;
  
  loadVaults: () => Promise<void>;
  createVault: (name: string, description?: string) => Promise<Vault>;
  updateVault: (id: string, updates: Partial<Vault>) => Promise<void>;
  deleteVault: (id: string) => Promise<void>;
  
  loadItems: (vaultId: string) => Promise<void>;
  createItem: (item: Partial<VaultItem>) => Promise<VaultItem>;
  updateItem: (id: string, updates: Partial<VaultItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  getSharingPolicy: (orgId: string, vaultId: string, itemId?: string) => Promise<any>;
  searchOrgUsers: (orgId: string, query: string) => Promise<any[]>;
  getUserTeams: (orgId: string, userId: string) => Promise<any[]>;
}

export const VaultAdapterContext = createContext<VaultAdapter | null>(null);

export const useVaultAdapter = () => {
  const ctx = useContext(VaultAdapterContext);
  if (!ctx) throw new Error('Missing VaultAdapter provider');
  return ctx;
};
