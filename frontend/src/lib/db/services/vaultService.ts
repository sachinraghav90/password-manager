import { db } from '../client';
import { Vault, VaultItem } from '../schema';
import { authorizationService } from './authorizationService';
import { cryptoUtils, sessionCryptoStore } from '../../crypto/cryptoService';

export const vaultService = {
  async getUserVaults(userId: string) {
    const personalVaults = await db.vaults.where('ownerUserId').equals(userId).toArray();

    const memberships = await db.organization_memberships.where('userId').equals(userId).toArray();
    const activeOrgIds = memberships.filter(m => m.status === 'active').map(m => m.organizationId);
    
    const orgVaults = [];
    for (const orgId of activeOrgIds) {
      const vaults = await db.vaults.where('organizationId').equals(orgId).toArray();
      orgVaults.push(...vaults);
    }

    const allVaults = [...personalVaults, ...orgVaults];
    const uniqueVaultsMap = new Map(allVaults.map(v => [v.id, v]));

    // Fallback for older vaults that might lack ownershipType fields
    const createdVaults = await db.vaults.where('createdBy').equals(userId).toArray();
    for (const cv of createdVaults) {
      if (!uniqueVaultsMap.has(cv.id)) {
        uniqueVaultsMap.set(cv.id, cv);
      }
    }

    return Array.from(uniqueVaultsMap.values());
  },

  async getVaultById(vaultId: string) {
    return await db.vaults.get(vaultId);
  },

  async createVault(userId: string, name: string, description: string = '', organizationId?: string): Promise<Vault> {
    const masterKey = sessionCryptoStore.getMasterKey();
    if (!masterKey) throw new Error('Master key not found in session.');

    const vaultKey = await cryptoUtils.generateVaultKey();
    const { wrappedKeyBase64, nonceBase64 } = await cryptoUtils.wrapVaultKey(vaultKey, masterKey);

    const vaultId = crypto.randomUUID();
    const newVault: Vault = {
      id: vaultId,
      name,
      description,
      createdBy: userId,
      ownershipType: organizationId ? 'organization' : 'personal',
      ownerUserId: organizationId ? null : userId,
      organizationId: organizationId || null,
      wrappedVaultKey: wrappedKeyBase64,
      vaultKeyNonce: nonceBase64,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.vaults.add(newVault);
    
    // Add the unwrapped key to session store immediately
    sessionCryptoStore.setVaultKey(vaultId, vaultKey);

    return newVault;
  },

  async getVaultItems(vaultId: string) {
    return await db.items.where('vaultId').equals(vaultId).toArray();
  },

  async deleteVault(userId: string, vaultId: string): Promise<void> {
    const vault = await this.getVaultById(vaultId);
    if (!vault) throw new Error('Vault not found');
    
    if (vault.ownershipType === 'organization') {
      await authorizationService.assertCanPerform(userId, 'vaults.delete', {
        resourceType: 'vault',
        resourceId: vaultId,
        organizationId: vault.organizationId!
      });
    } else {
      if (vault.ownerUserId !== userId) throw new Error('Cannot delete another user personal vault');
    }

    await db.vaults.delete(vaultId);
  },

  async renameVault(userId: string, vaultId: string, newName: string): Promise<void> {
    const vault = await this.getVaultById(vaultId);
    if (!vault) throw new Error('Vault not found');

    if (vault.ownershipType === 'organization') {
      await authorizationService.assertCanPerform(userId, 'vaults.rename', {
        resourceType: 'vault',
        resourceId: vaultId,
        organizationId: vault.organizationId!
      });
    } else {
      if (vault.ownerUserId !== userId) throw new Error('Cannot rename another user personal vault');
    }

    await db.vaults.update(vaultId, { name: newName, updatedAt: Date.now() });
  },

  // Stub for future encryption
  async addMockItem(vaultId: string, item: Omit<VaultItem, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>) {
    const newItem: VaultItem = {
      ...item,
      id: crypto.randomUUID(),
      vaultId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.items.add(newItem);
    return newItem;
  }
};
