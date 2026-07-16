import { db } from '../client';
import { OrganizationSharingPolicy, VaultSharingPolicy, ItemSharingPolicy, SharePermission, SharingPolicyMode, ItemType } from '../schema';
import { auditService } from './auditService';
import { authorizationService } from './authorizationService';

export const sharingPolicyService = {
  
  async getOrganizationPolicy(organizationId: string): Promise<OrganizationSharingPolicy | undefined> {
    return await db.organization_sharing_policies.where({ organizationId }).first();
  },

  async updateOrganizationPolicy(actorUserId: string, organizationId: string, updates: Partial<Omit<OrganizationSharingPolicy, 'id' | 'organizationId' | 'createdAt'>>): Promise<OrganizationSharingPolicy> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'sharing.policies.edit');

    return await db.transaction('rw', db.organization_sharing_policies, db.audit_events, async () => {
      let policy = await db.organization_sharing_policies.where({ organizationId }).first();
      
      if (!policy) {
        policy = {
          id: crypto.randomUUID(),
          organizationId,
          allowMemberSharing: false,
          allowVaultSharing: true,
          allowItemSharing: true,
          allowTeamSharing: true,
          allowDirectUserSharing: true,
          allowExternalSharing: false,
          requireAdminApprovalForMemberShares: true,
          requireAdminApprovalForExternalShares: true,
          allowResharing: false,
          defaultVaultSharePermission: 'view',
          defaultItemSharePermission: 'view',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...updates
        };
        await db.organization_sharing_policies.add(policy);
      } else {
        Object.assign(policy, updates);
        policy.updatedAt = Date.now();
        await db.organization_sharing_policies.put(policy);
      }

      await auditService.logEvent(organizationId, actorUserId, 'organization_sharing_policy_updated', 'organization_sharing_policy', policy.id);
      return policy;
    });
  },

  async getVaultPolicy(organizationId: string, vaultId: string): Promise<VaultSharingPolicy | undefined> {
    return await db.vault_sharing_policies.where({ organizationId }).filter(p => p.vaultId === vaultId).first();
  },

  async updateVaultPolicy(
    actorUserId: string, 
    organizationId: string, 
    vaultId: string, 
    updates: {
      mode: SharingPolicyMode;
      allowSharing?: boolean;
      allowMemberInitiatedSharing?: boolean;
      allowItemOverrides?: boolean;
      allowTeamTargets?: boolean;
      allowDirectUserTargets?: boolean;
      allowExternalTargets?: boolean;
      requireAdminApproval?: boolean;
      allowResharing?: boolean;
      defaultPermission?: SharePermission;
    }
  ): Promise<VaultSharingPolicy> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'sharing.policies.edit');

    const vault = await db.vaults.get(vaultId);
    if (!vault || vault.organizationId !== organizationId || vault.ownershipType !== 'organization') {
      throw new Error('Only organization vaults can have sharing policies');
    }

    return await db.transaction('rw', db.vault_sharing_policies, db.audit_events, async () => {
      let policy = await db.vault_sharing_policies.where({ organizationId }).filter(p => p.vaultId === vaultId).first();
      
      if (!policy) {
        policy = {
          id: crypto.randomUUID(),
          organizationId,
          vaultId,
          mode: updates.mode,
          allowSharing: updates.allowSharing ?? true,
          allowMemberInitiatedSharing: updates.allowMemberInitiatedSharing ?? false,
          allowItemOverrides: updates.allowItemOverrides ?? true,
          allowTeamTargets: updates.allowTeamTargets ?? true,
          allowDirectUserTargets: updates.allowDirectUserTargets ?? true,
          allowExternalTargets: updates.allowExternalTargets ?? false,
          requireAdminApproval: updates.requireAdminApproval ?? true,
          allowResharing: updates.allowResharing ?? false,
          defaultPermission: updates.defaultPermission ?? 'view',
          createdByUserId: actorUserId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.vault_sharing_policies.add(policy);
      } else {
        Object.assign(policy, updates);
        policy.updatedAt = Date.now();
        await db.vault_sharing_policies.put(policy);
      }

      await auditService.logEvent(organizationId, actorUserId, 'vault_sharing_policy_updated', 'vault_sharing_policy', policy.id, { vaultId });
      return policy;
    });
  },

  async getItemPolicy(organizationId: string, itemId: string): Promise<ItemSharingPolicy | undefined> {
    return await db.item_sharing_policies.where({ organizationId }).filter(p => p.itemId === itemId).first();
  },

  async updateItemPolicy(
    actorUserId: string, 
    organizationId: string, 
    vaultId: string,
    itemId: string,
    itemType: ItemType,
    updates: {
      mode: SharingPolicyMode;
      allowSharing?: boolean;
      allowMemberInitiatedSharing?: boolean;
      allowTeamTargets?: boolean;
      allowDirectUserTargets?: boolean;
      allowExternalTargets?: boolean;
      requireAdminApproval?: boolean;
      allowResharing?: boolean;
      defaultPermission?: SharePermission;
    }
  ): Promise<ItemSharingPolicy> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'sharing.policies.edit');

    const vault = await db.vaults.get(vaultId);
    if (!vault || vault.organizationId !== organizationId || vault.ownershipType !== 'organization') {
      throw new Error('Only items in organization vaults can have sharing policies');
    }

    return await db.transaction('rw', db.item_sharing_policies, db.audit_events, async () => {
      let policy = await db.item_sharing_policies.where({ organizationId }).filter(p => p.itemId === itemId).first();
      
      if (!policy) {
        policy = {
          id: crypto.randomUUID(),
          organizationId,
          vaultId,
          itemId,
          itemType,
          mode: updates.mode,
          allowSharing: updates.allowSharing ?? true,
          allowMemberInitiatedSharing: updates.allowMemberInitiatedSharing ?? false,
          allowTeamTargets: updates.allowTeamTargets ?? true,
          allowDirectUserTargets: updates.allowDirectUserTargets ?? true,
          allowExternalTargets: updates.allowExternalTargets ?? false,
          requireAdminApproval: updates.requireAdminApproval ?? true,
          allowResharing: updates.allowResharing ?? false,
          defaultPermission: updates.defaultPermission ?? 'view',
          createdByUserId: actorUserId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.item_sharing_policies.add(policy);
      } else {
        Object.assign(policy, updates);
        policy.updatedAt = Date.now();
        await db.item_sharing_policies.put(policy);
      }

      // We do not log item titles or decrypted data in audit events
      await auditService.logEvent(organizationId, actorUserId, 'item_sharing_policy_updated', 'item_sharing_policy', policy.id, { itemId, vaultId });
      return policy;
    });
  },

  async getEffectiveVaultPolicy(organizationId: string, vaultId: string): Promise<{ allowSharing: boolean; allowTeamTargets: boolean; allowDirectUserTargets: boolean; source: 'vault' | 'default' }> {
    const vaultPolicy = await this.getVaultPolicy(organizationId, vaultId);
    if (vaultPolicy && vaultPolicy.mode === 'override') {
      return {
        allowSharing: vaultPolicy.allowSharing,
        allowTeamTargets: vaultPolicy.allowTeamTargets,
        allowDirectUserTargets: vaultPolicy.allowDirectUserTargets,
        source: 'vault'
      };
    }
    
    return {
      allowSharing: true,
      allowTeamTargets: true,
      allowDirectUserTargets: true,
      source: 'default'
    };
  },

  async getEffectiveItemPolicy(organizationId: string, vaultId: string, itemId: string): Promise<{ allowSharing: boolean; allowTeamTargets: boolean; allowDirectUserTargets: boolean; source: 'item' | 'vault' | 'default' }> {
    const itemPolicy = await this.getItemPolicy(organizationId, itemId);
    if (itemPolicy && itemPolicy.mode === 'override') {
      return {
        allowSharing: itemPolicy.allowSharing,
        allowTeamTargets: itemPolicy.allowTeamTargets,
        allowDirectUserTargets: itemPolicy.allowDirectUserTargets,
        source: 'item'
      };
    }
    
    const vaultPolicy = await this.getVaultPolicy(organizationId, vaultId);
    if (vaultPolicy && vaultPolicy.mode === 'override') {
      return {
        allowSharing: vaultPolicy.allowSharing,
        allowTeamTargets: vaultPolicy.allowTeamTargets,
        allowDirectUserTargets: vaultPolicy.allowDirectUserTargets,
        source: 'vault'
      };
    }
    
    return {
      allowSharing: true,
      allowTeamTargets: true,
      allowDirectUserTargets: true,
      source: 'default'
    };
  }

};
