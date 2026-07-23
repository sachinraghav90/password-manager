import { db } from '@vaultguard/db-local';
import {
  ExtensionVaultRepository,
  EncryptedVaultMetadata,
  EncryptedLoginIndexEntry,
  EncryptedLoginRecord,
  ActiveSessionContext
} from './ExtensionVaultRepository';

export class LocalExtensionRepository implements ExtensionVaultRepository {
  constructor(private context: ActiveSessionContext) {}

  private getUserId(): string {
    const userId = this.context.getUserId();
    if (!userId) throw new Error('Unauthorized: No active user session');
    return userId;
  }

  async getVaults(): Promise<EncryptedVaultMetadata[]> {
    const userId = this.getUserId();
    const memberships = await db.organization_memberships
      .where('userId').equals(userId).toArray();
    const activeOrganizationIds = new Set(
      memberships.filter(m => m.status === 'active').map(m => m.organizationId)
    );
    const vaults = (await db.vaults.toArray()).filter(v =>
      v.ownerUserId === userId ||
      v.createdBy === userId ||
      (v.ownershipType === 'organization' && (v as any).syncedAccess === true) ||
      (v.organizationId && activeOrganizationIds.has(v.organizationId))
    );
    return vaults.map(v => ({
      id: v.id,
      name: (v as any).name || 'Unknown Vault',
      wrappedVaultKey: v.wrappedVaultKey,
      vaultKeyNonce: v.vaultKeyNonce,
      ownershipType: (v as any).ownershipType || 'personal',
      organizationId: (v as any).organizationId || null
    }));
  }

  async getLoginIndex(): Promise<(EncryptedLoginIndexEntry & { unencryptedName?: string; itemType?: string })[]> {
    const userId = this.getUserId();
    const indexRecords = (await db.pm_item_index.where('userId').equals(userId).toArray())
      .filter(r => (r.itemType || r.type) === 'login')
      .filter(r => !r.deletedAt && !r.deleted_at && !r.pendingCrypto && !r.pending_crypto);

    return indexRecords.map(r => ({
      id: r.itemId || r.id,
      vaultId: r.vaultId,
      encryptedTitle: r.encryptedTitle,
      titleNonce: r.titleNonce,
      lastAccessedAt: r.lastAccessedAt,
      favorite: r.favorite,
      unencryptedName: r.name, // Legacy records
      itemType: r.itemType || r.type,
      domain: r.domain,
      deletedAt: r.deletedAt || r.deleted_at,
      pendingCrypto: r.pendingCrypto || r.pending_crypto
    }));
  }

  async getEncryptedLogin(id: string): Promise<EncryptedLoginRecord> {
    const userId = this.getUserId();
    
    const record = await db.pm_logins.get(id);

    if (!record || record.userId !== userId) {
      throw new Error('Login record not found or unauthorized');
    }

    return {
      id: record.id,
      vaultId: record.vaultId,
      encryptedData: record.encryptedData,
      dataNonce: record.dataNonce
    };
  }

  async getEncryptedLogins(ids: string[]): Promise<EncryptedLoginRecord[]> {
    if (ids.length === 0) return [];
    const userId = this.getUserId();
    const records = await db.pm_logins.bulkGet(ids);
    
    return records
      .filter(record => record !== undefined && record.userId === userId)
      .map(record => ({
        id: record.id,
        vaultId: record.vaultId,
        encryptedData: record.encryptedData,
        dataNonce: record.dataNonce
      }));
  }

  async getVaultItems(vaultId: string): Promise<EncryptedLoginRecord[]> {
    const userId = this.getUserId();
    const records = await db.pm_logins
      .where('[userId+vaultId]')
      .equals([userId, vaultId])
      .toArray();

    return records.map(record => ({
      id: record.id,
      vaultId: record.vaultId,
      encryptedData: record.encryptedData,
      dataNonce: record.dataNonce
    }));
  }

  async createEncryptedLogin(record: EncryptedLoginRecord): Promise<void> {
    const userId = this.getUserId();
    
    await db.transaction('rw', [db.pm_logins], async () => {
      await db.pm_logins.add({
        id: record.id,
        userId: userId,
        vaultId: record.vaultId,
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptedData: record.encryptedData,
        dataNonce: record.dataNonce,
        schemaVersion: 1
      });
    });
  }

  async updateEncryptedLogin(record: EncryptedLoginRecord): Promise<void> {
    const userId = this.getUserId();

    await db.transaction('rw', [db.pm_logins], async () => {
      const existing = await db.pm_logins.get(record.id);
      if (!existing || existing.userId !== userId) {
        throw new Error('Login record not found or unauthorized');
      }

      await db.pm_logins.update(record.id, {
        encryptedData: record.encryptedData,
        dataNonce: record.dataNonce,
        updatedAt: Date.now()
      });
    });
  }

  async updateLastAccessedAt(id: string): Promise<void> {
    const userId = this.getUserId();
    
    await db.transaction('rw', [db.pm_item_index], async () => {
      const indexEntry = await db.pm_item_index.where('itemId').equals(id).first();
      if (indexEntry && indexEntry.userId === userId) {
        await db.pm_item_index.update(indexEntry.indexId, {
          lastAccessedAt: Date.now()
        });
      }
    });
  }
}




