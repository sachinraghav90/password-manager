import { Vault, EncryptedItem } from '@vaultguard/models';

export interface VaultRepository {
  getVault(id: string): Promise<Vault | null>;
  getVaults(userId: string): Promise<Vault[]>;
  saveVault(vault: Vault): Promise<void>;
  deleteVault(id: string): Promise<void>;
}

export interface ItemRepository {
  getItem(id: string): Promise<EncryptedItem | null>;
  getItems(vaultId: string): Promise<EncryptedItem[]>;
  saveItem(item: EncryptedItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
}

export interface SyncChanges {
  vaults: Vault[];
  items: EncryptedItem[];
  deletedVaultIds: string[];
  deletedItemIds: string[];
}

export interface SyncRepository {
  pullChanges(sinceVersion: number): Promise<{ changes: SyncChanges; newVersion: number }>;
  pushChanges(changes: SyncChanges): Promise<void>;
  acknowledgeChanges(): Promise<void>;
}
