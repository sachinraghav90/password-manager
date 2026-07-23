import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@vaultguard/db-local';
import { LocalExtensionRepository } from '../LocalExtensionRepository';
import { ActiveSessionContext, EncryptedLoginRecord } from '../ExtensionVaultRepository';

describe('LocalExtensionRepository', () => {
  let repository: LocalExtensionRepository;
  const mockUserId = 'user-123';
  const mockVaultId = 'vault-456';

  const mockContext: ActiveSessionContext = {
    getUserId: vi.fn().mockReturnValue(mockUserId),
  };

  beforeAll(async () => {
    // Make sure Dexie is ready
    await db.open();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });

    vi.clearAllMocks();
    repository = new LocalExtensionRepository(mockContext);
  });

  describe('getVaults', () => {
    it('returns only vaults belonging to the active user', async () => {
      await db.vaults.bulkAdd([
        { id: 'v1', createdBy: mockUserId, ownerUserId: mockUserId, ownershipType: 'personal', name: 'V1', description: '', wrappedVaultKey: 'key', vaultKeyNonce: 'nonce', createdAt: 0, updatedAt: 0, organizationId: null },
        { id: 'v2', createdBy: 'other-user', ownerUserId: 'other-user', ownershipType: 'personal', name: 'V2', description: '', wrappedVaultKey: 'key', vaultKeyNonce: 'nonce', createdAt: 0, updatedAt: 0, organizationId: null }
      ] as any[]);

      const vaults = await repository.getVaults();
      expect(vaults).toHaveLength(1);
      expect(vaults[0].id).toBe('v1');
      expect(vaults[0].ownershipType).toBe('personal');
    });
  });

  describe('getLoginIndex', () => {
    it('returns index entries scoped to user and type login', async () => {
      await db.pm_item_index.bulkAdd([
        { indexId: 'i1', itemId: 'item1', userId: mockUserId, vaultId: mockVaultId, itemType: 'login', favorite: true, createdAt: 0, updatedAt: 0, encryptedTitle: 'enc', titleNonce: 'nonce', schemaVersion: 1 },
        { indexId: 'i2', itemId: 'item2', userId: mockUserId, vaultId: mockVaultId, itemType: 'secure_note', favorite: false, createdAt: 0, updatedAt: 0, encryptedTitle: 'enc', titleNonce: 'nonce', schemaVersion: 1 },
        { indexId: 'i3', itemId: 'item3', userId: 'other-user', vaultId: mockVaultId, itemType: 'login', favorite: false, createdAt: 0, updatedAt: 0, encryptedTitle: 'enc', titleNonce: 'nonce', schemaVersion: 1 }
      ]);

      const index = await repository.getLoginIndex();
      expect(index).toHaveLength(1);
      expect(index[0].id).toBe('item1');
      expect(index[0].favorite).toBe(true);
    });
  });

  describe('getEncryptedLogin', () => {
    it('fetches a single encrypted login if authorized', async () => {
      await db.pm_logins.add({
        id: 'item1', userId: mockUserId, vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'enc-data', dataNonce: 'enc-nonce', schemaVersion: 1
      });

      const record = await repository.getEncryptedLogin('item1');
      expect(record.encryptedData).toBe('enc-data');
    });

    it('throws if unauthorized', async () => {
      await db.pm_logins.add({
        id: 'item1', userId: 'other-user', vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'enc-data', dataNonce: 'enc-nonce', schemaVersion: 1
      });

      await expect(repository.getEncryptedLogin('item1')).rejects.toThrow('Login record not found or unauthorized');
    });
  });

  describe('getEncryptedLogins (batch)', () => {
    it('fetches multiple records securely', async () => {
      await db.pm_logins.bulkAdd([
        { id: 'item1', userId: mockUserId, vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'data1', dataNonce: 'nonce1', schemaVersion: 1 },
        { id: 'item2', userId: mockUserId, vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'data2', dataNonce: 'nonce2', schemaVersion: 1 },
        { id: 'item3', userId: 'other-user', vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'data3', dataNonce: 'nonce3', schemaVersion: 1 },
      ]);

      const records = await repository.getEncryptedLogins(['item1', 'item2', 'item3']);
      expect(records).toHaveLength(2);
      expect(records.map(r => r.id).sort()).toEqual(['item1', 'item2']);
    });
  });

  describe('getVaultItems', () => {
    it('fetches all items for a specific vault for the current user', async () => {
      await db.pm_logins.bulkAdd([
        { id: 'item1', userId: mockUserId, vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'data1', dataNonce: 'nonce1', schemaVersion: 1 },
        { id: 'item2', userId: mockUserId, vaultId: 'other-vault', favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'data2', dataNonce: 'nonce2', schemaVersion: 1 },
      ]);

      const records = await repository.getVaultItems(mockVaultId);
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('item1');
    });
  });

  describe('createEncryptedLogin', () => {
    it('creates a new record within a transaction', async () => {
      const record: EncryptedLoginRecord = {
        id: 'new-item',
        vaultId: mockVaultId,
        encryptedData: 'new-data',
        dataNonce: 'new-nonce'
      };

      await repository.createEncryptedLogin(record);

      const saved = await db.pm_logins.get('new-item');
      expect(saved).toBeDefined();
      expect(saved?.userId).toBe(mockUserId);
      expect(saved?.encryptedData).toBe('new-data');
    });
  });

  describe('updateEncryptedLogin', () => {
    it('updates an existing record if authorized', async () => {
      await db.pm_logins.add({
        id: 'item1', userId: mockUserId, vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'old-data', dataNonce: 'old-nonce', schemaVersion: 1
      });

      await repository.updateEncryptedLogin({
        id: 'item1',
        vaultId: mockVaultId,
        encryptedData: 'new-data',
        dataNonce: 'new-nonce'
      });

      const saved = await db.pm_logins.get('item1');
      expect(saved?.encryptedData).toBe('new-data');
    });

    it('throws if trying to update someone elses record', async () => {
      await db.pm_logins.add({
        id: 'item1', userId: 'other-user', vaultId: mockVaultId, favorite: false, createdAt: 0, updatedAt: 0, encryptedData: 'old-data', dataNonce: 'old-nonce', schemaVersion: 1
      });

      await expect(repository.updateEncryptedLogin({
        id: 'item1',
        vaultId: mockVaultId,
        encryptedData: 'new-data',
        dataNonce: 'new-nonce'
      })).rejects.toThrow();
    });
  });

  describe('updateLastAccessedAt', () => {
    it('updates lastAccessedAt in the index', async () => {
      await db.pm_item_index.add({
        indexId: 'idx1', itemId: 'item1', userId: mockUserId, vaultId: mockVaultId, itemType: 'login', favorite: true, createdAt: 0, updatedAt: 0, encryptedTitle: 'enc', titleNonce: 'nonce', schemaVersion: 1
      });

      await repository.updateLastAccessedAt('item1');

      const saved = await db.pm_item_index.where('itemId').equals('item1').first();
      expect(saved?.lastAccessedAt).toBeGreaterThan(0);
    });
  });
});
