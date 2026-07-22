export interface EncryptedVaultMetadata {
  id: string;
  name?: string;
  wrappedVaultKey: string;
  vaultKeyNonce: string;
  ownershipType: 'personal' | 'organization';
  organizationId?: string | null;
}

export interface EncryptedLoginIndexEntry {
  id: string;          // From pm_item_index.itemId
  vaultId: string;
  encryptedTitle: string;
  titleNonce: string;
  lastAccessedAt?: number;
  favorite: boolean;
  itemType?: string;
  domain?: string;
  deletedAt?: number | string | null;
  pendingCrypto?: boolean;
}

export interface EncryptedLoginRecord {
  id: string;          // From pm_logins.id
  vaultId: string;
  encryptedData: string;
  dataNonce: string;
}

/**
 * ExtensionVaultRepository represents a storage layer for the browser extension.
 * It strictly deals with raw ciphertext and relies on an external context provider
 * (such as a Session or Auth manager) to determine the active user implicitly.
 */
export interface ExtensionVaultRepository {
  getVaults(): Promise<EncryptedVaultMetadata[]>;
  getLoginIndex(): Promise<EncryptedLoginIndexEntry[]>;
  getEncryptedLogin(id: string): Promise<EncryptedLoginRecord>;
  getEncryptedLogins(ids: string[]): Promise<EncryptedLoginRecord[]>;
  getVaultItems(vaultId: string): Promise<EncryptedLoginRecord[]>;
  createEncryptedLogin(record: EncryptedLoginRecord): Promise<void>;
  updateEncryptedLogin(record: EncryptedLoginRecord): Promise<void>;
  updateLastAccessedAt(id: string): Promise<void>;
}

export interface ActiveSessionContext {
  getUserId(): string | null;
}
