import { db } from '../client';
import { OrganizationUsage } from '../schema';
import { membershipService } from './membershipService';
import { planService } from './planService';

export const organizationUsageService = {
  /**
   * Retrieves usage aggregate for an organization.
   * Validates membership access before returning data.
   */
  async getUsage(userId: string, organizationId: string): Promise<OrganizationUsage | undefined> {
    await membershipService.assertActiveMembership(userId, organizationId);
    
    return await db.organization_usage
      .where('organizationId')
      .equals(organizationId)
      .last();
  },

  async recalculateOrganizationUsage(organizationId: string): Promise<OrganizationUsage> {
    return await db.transaction('rw', [db.organizations, db.organization_memberships, db.organization_usage, db.vaults, db.pm_item_index, db.pm_attachments], async () => {
      const org = await db.organizations.get(organizationId);
      if (!org) throw new Error('Organization not found');

      const activeSeats = await planService.getActiveSeatCount(organizationId);

      const vaults = await db.vaults.where({ organizationId }).toArray();
      const vaultCount = vaults.length;
      
      const vaultIds = vaults.map(v => v.id);

      let itemCount = 0;
      let attachmentBytes = 0;

      for (const vId of vaultIds) {
        itemCount += await db.pm_item_index.where({ vaultId: vId }).count();
        const attachments = await db.pm_attachments.where({ vaultId: vId }).toArray();
        for (const att of attachments) {
          // Assuming size is roughly the buffer byte length for MVP reconciliation
          if (att.encryptedBlob) {
            attachmentBytes += att.encryptedBlob.byteLength;
          }
        }
      }

      const existingUsage = await db.organization_usage.where({ organizationId }).last();
      const now = Date.now();
      
      const usage: OrganizationUsage = existingUsage ? {
        ...existingUsage,
        activeSeats,
        vaultCount,
        itemCount,
        attachmentBytes,
        updatedAt: now
      } : {
        id: crypto.randomUUID(),
        organizationId,
        periodStart: now,
        periodEnd: now + 1000 * 60 * 60 * 24 * 30, // 30 days
        activeSeats,
        totalSeats: org.seatLimit,
        vaultCount,
        itemCount,
        attachmentBytes,
        createdAt: now,
        updatedAt: now
      };

      await db.organization_usage.put(usage);
      return usage;
    });
  }
};
