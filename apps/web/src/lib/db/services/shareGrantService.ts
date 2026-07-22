import { db } from '@vaultguard/db-local';
import { ShareGrant, SharePermission, ShareResourceType, ItemType } from '@vaultguard/models';
import { auditService } from '@vaultguard/permissions';
import { authorizationService } from '@vaultguard/permissions';

export const shareGrantService = {
  
  async createShareGrant(
    createdByUserId: string,
    organizationId: string,
    resourceType: ShareResourceType,
    vaultId: string,
    itemId: string | undefined,
    itemType: ItemType | undefined,
    targetType: 'member' | 'team',
    targetId: string,
    permission: SharePermission,
    approvedByUserId?: string
  ): Promise<ShareGrant> {
    
    const grant: ShareGrant = {
      id: crypto.randomUUID(),
      organizationId,
      resourceType,
      vaultId,
      itemId,
      itemType,
      targetType,
      targetMemberId: targetType === 'member' ? targetId : undefined,
      targetTeamId: targetType === 'team' ? targetId : undefined,
      permission,
      createdByUserId,
      approvedByUserId,
      status: 'pending_crypto', // Explicit rule: no active grants in this phase
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.transaction('rw', db.share_grants, db.audit_events, async () => {
      await db.share_grants.add(grant);
      await auditService.logEvent({ organizationId, actorUserId: createdByUserId, eventType: 'share_grant_created_pending_crypto', metadata: { type: 'share_grant', id: grant.id } });
    });

    return grant;
  },

  async revokeGrant(actorUserId: string, organizationId: string, grantId: string): Promise<void> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'sharing.grants.revoke');

    await db.transaction('rw', db.share_grants, db.audit_events, async () => {
      const grant = await db.share_grants.get(grantId);
      if (!grant || grant.organizationId !== organizationId) throw new Error('Grant not found');
      
      // We set to revocation_pending because actual keys might need rotating.
      grant.status = 'revocation_pending';
      grant.revokedAt = Date.now();
      grant.updatedAt = Date.now();

      await db.share_grants.put(grant);
      await auditService.logEvent({ organizationId, actorUserId, eventType: 'share_grant_revocation_requested', metadata: { type: 'share_grant', id: grant.id } });
    });
  }

};
