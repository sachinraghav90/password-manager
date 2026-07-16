import { db } from '../client';
import { SharePermission, ShareResourceType, ItemType } from '../schema';
import { sharingPolicyService } from './sharingPolicyService';
import { authorizationService } from './authorizationService';

export interface SharingResource {
  type: ShareResourceType;
  vaultId: string;
  itemId?: string;
  itemType?: ItemType;
}

export interface EffectiveSharingPolicy {
  organizationId: string;
  vaultId: string;
  itemId?: string;

  allowSharing: boolean;
  allowMemberInitiatedSharing: boolean;
  allowTeamTargets: boolean;
  allowDirectUserTargets: boolean;
  allowExternalTargets: boolean;
  requireAdminApproval: boolean;
  allowResharing: boolean;

  defaultPermission: SharePermission;

  resolvedFrom: 'organization' | 'vault' | 'item' | 'mixed';
  denialReasons: string[];
}

export const sharingPolicyResolver = {

  async resolveEffectiveSharingPolicy(
    actorUserId: string,
    organizationId: string,
    resource: SharingResource
  ): Promise<EffectiveSharingPolicy> {
    const denialReasons: string[] = [];
    
    // 1. Initial State (Platform Restrictions / Failsafe Defaults)
    const effective: EffectiveSharingPolicy = {
      organizationId,
      vaultId: resource.vaultId,
      itemId: resource.itemId,
      allowSharing: false,
      allowMemberInitiatedSharing: false,
      allowTeamTargets: false,
      allowDirectUserTargets: false,
      allowExternalTargets: false,
      requireAdminApproval: true,
      allowResharing: false,
      defaultPermission: 'view',
      resolvedFrom: 'organization',
      denialReasons
    };

    // 2. Organization Policy
    const orgPolicy = await sharingPolicyService.getOrganizationPolicy(organizationId);
    if (!orgPolicy) {
      denialReasons.push('No organization sharing policy defined. Defaulting to deny.');
      return effective; // Fast fail if org policy is totally missing (though we should auto-create defaults)
    }

    effective.allowSharing = resource.type === 'vault' ? orgPolicy.allowVaultSharing : orgPolicy.allowItemSharing;
    effective.allowMemberInitiatedSharing = orgPolicy.allowMemberSharing;
    effective.allowTeamTargets = orgPolicy.allowTeamSharing;
    effective.allowDirectUserTargets = orgPolicy.allowDirectUserSharing;
    effective.allowExternalTargets = orgPolicy.allowExternalSharing;
    effective.requireAdminApproval = orgPolicy.requireAdminApprovalForMemberShares; // Defaulting to member rule
    effective.allowResharing = orgPolicy.allowResharing;
    effective.defaultPermission = resource.type === 'vault' ? orgPolicy.defaultVaultSharePermission : orgPolicy.defaultItemSharePermission;

    if (!effective.allowSharing) {
      denialReasons.push(`Organization policy explicitly disables ${resource.type} sharing.`);
    }

    // 3. Vault Policy
    const vaultPolicy = await sharingPolicyService.getVaultPolicy(organizationId, resource.vaultId);
    if (vaultPolicy && vaultPolicy.mode !== 'inherit') {
      effective.resolvedFrom = 'vault';
      if (vaultPolicy.mode === 'disabled') {
        effective.allowSharing = false;
        denialReasons.push('Vault policy explicitly disables sharing.');
      } else { // 'override'
        // A child policy may be more restrictive than its parent, but must not become more permissive than a hard restriction.
        effective.allowSharing = effective.allowSharing && vaultPolicy.allowSharing;
        effective.allowMemberInitiatedSharing = effective.allowMemberInitiatedSharing && vaultPolicy.allowMemberInitiatedSharing;
        effective.allowTeamTargets = effective.allowTeamTargets && vaultPolicy.allowTeamTargets;
        effective.allowDirectUserTargets = effective.allowDirectUserTargets && vaultPolicy.allowDirectUserTargets;
        effective.allowExternalTargets = effective.allowExternalTargets && vaultPolicy.allowExternalTargets;
        effective.requireAdminApproval = effective.requireAdminApproval || vaultPolicy.requireAdminApproval;
        effective.allowResharing = effective.allowResharing && vaultPolicy.allowResharing;
        effective.defaultPermission = vaultPolicy.defaultPermission;
      }
    }

    // 4. Item Policy
    if (resource.type === 'item' && resource.itemId && vaultPolicy?.allowItemOverrides !== false) {
      const itemPolicy = await sharingPolicyService.getItemPolicy(organizationId, resource.itemId);
      if (itemPolicy && itemPolicy.mode !== 'inherit') {
        effective.resolvedFrom = effective.resolvedFrom === 'vault' ? 'mixed' : 'item';
        if (itemPolicy.mode === 'disabled') {
          effective.allowSharing = false;
          denialReasons.push('Item policy explicitly disables sharing.');
        } else {
          effective.allowSharing = effective.allowSharing && itemPolicy.allowSharing;
          effective.allowMemberInitiatedSharing = effective.allowMemberInitiatedSharing && itemPolicy.allowMemberInitiatedSharing;
          effective.allowTeamTargets = effective.allowTeamTargets && itemPolicy.allowTeamTargets;
          effective.allowDirectUserTargets = effective.allowDirectUserTargets && itemPolicy.allowDirectUserTargets;
          effective.allowExternalTargets = effective.allowExternalTargets && itemPolicy.allowExternalTargets;
          effective.requireAdminApproval = effective.requireAdminApproval || itemPolicy.requireAdminApproval;
          effective.allowResharing = effective.allowResharing && itemPolicy.allowResharing;
          effective.defaultPermission = itemPolicy.defaultPermission;
        }
      }
    }

    // 5. Actor RBAC & Roles
    const actorMembership = await db.organization_memberships.where({ userId: actorUserId, organizationId }).filter(m => m.status === 'active').first();
    if (!actorMembership) {
      effective.allowSharing = false;
      denialReasons.push('Actor is not an active member of the organization.');
      return effective;
    }

    if (actorMembership.role === 'organization_admin') {
      // Admins do not need AdminApproval for their own shares
      effective.requireAdminApproval = false;
      // Admins override "allowMemberInitiatedSharing" (they are not "members")
      effective.allowMemberInitiatedSharing = true; 
      
      if (!effective.allowSharing) {
        // Even Admins are blocked if the policy is hard-disabled
        // They must change the policy first.
      }
    } else {
      // It's a member. Check RBAC
      if (!effective.allowMemberInitiatedSharing) {
        effective.allowSharing = false;
        denialReasons.push('Organization policy blocks member-initiated sharing.');
      } else {
        const hasSharePerm = await authorizationService.hasPermission(actorUserId, organizationId, resource.type === 'vault' ? 'vaults.manage_access' : 'items.share');
        if (!hasSharePerm) {
          effective.allowSharing = false;
          denialReasons.push(`Member lacks required RBAC permission to share this ${resource.type}.`);
        }
      }
    }

    // Final Sanity Checks
    const vault = await db.vaults.get(resource.vaultId);
    if (!vault || vault.organizationId !== organizationId || vault.ownershipType !== 'organization') {
      effective.allowSharing = false;
      denialReasons.push('Resource does not belong to the organization.');
    }

    return effective;
  }
};
