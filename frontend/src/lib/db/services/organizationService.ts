import { db } from '../client';
import { Organization, AuditEvent } from '../schema';
import { membershipService } from './membershipService';

export const organizationService = {
  /**
   * Transfers admin ownership from the current admin to another active member.
   * Enforces that exactly one admin exists.
   */
  async transferAdmin(organizationId: string, currentAdminUserId: string, targetMemberUserId: string): Promise<void> {
    await db.transaction('rw', [db.organizations, db.organization_memberships, db.audit_events], async (trans) => {
      const org = await trans.table('organizations').get(organizationId);
      if (!org) throw new Error('Organization not found');

      if (org.adminUserId !== currentAdminUserId) {
        throw new Error('Only the current admin can transfer ownership');
      }

      const currentAdminMembership = await trans.table('organization_memberships')
        .where('[organizationId+userId]')
        .equals([organizationId, currentAdminUserId])
        .first();

      const targetMembership = await trans.table('organization_memberships')
        .where('[organizationId+userId]')
        .equals([organizationId, targetMemberUserId])
        .first();

      if (!currentAdminMembership || currentAdminMembership.role !== 'organization_admin' || currentAdminMembership.status !== 'active') {
        throw new Error('Current user is not the active admin');
      }

      if (!targetMembership || targetMembership.status !== 'active') {
        throw new Error('Target user is not an active member of this organization');
      }

      const now = Date.now();

      // Perform transfer
      org.adminUserId = targetMemberUserId;
      org.updatedAt = now;

      currentAdminMembership.role = 'member';
      currentAdminMembership.updatedAt = now;

      targetMembership.role = 'organization_admin';
      targetMembership.updatedAt = now;

      const auditEvent: AuditEvent = {
        id: crypto.randomUUID(),
        organizationId,
        actorUserId: currentAdminUserId,
        eventType: 'admin_transferred',
        targetId: targetMemberUserId,
        createdAt: now
      };

      await trans.table('organizations').put(org);
      await trans.table('organization_memberships').put(currentAdminMembership);
      await trans.table('organization_memberships').put(targetMembership);
      await trans.table('audit_events').add(auditEvent);

      await membershipService.assertExactlyOneActiveOrganizationAdmin(organizationId);
    });
  },

  /**
   * Gets an organization if the user has access to it.
   */
  async getOrganization(userId: string, organizationId: string): Promise<Organization> {
    await membershipService.assertActiveMembership(userId, organizationId);
    
    const org = await db.organizations.get(organizationId);
    if (!org) throw new Error('Organization not found');
    
    return org;
  },

  async suspendOrganization(superAdminUserId: string, organizationId: string): Promise<void> {
    await db.transaction('rw', [db.organizations, db.platform_role_assignments, db.audit_events], async () => {
      const platformRole = await db.platform_role_assignments
        .where({ userId: superAdminUserId })
        .filter(r => r.role === 'super_admin' && r.status === 'active')
        .first();
        
      if (!platformRole) throw new Error('Unauthorized: Super Admin required');

      const org = await db.organizations.get(organizationId);
      if (!org) throw new Error('Organization not found');

      if (org.status === 'suspended') throw new Error('Organization already suspended');

      await db.organizations.update(organizationId, {
        status: 'suspended',
        updatedAt: Date.now()
      });

      await db.audit_events.add({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId: superAdminUserId,
        eventType: 'organization_suspended',
        targetId: organizationId,
        targetType: 'organization',
        createdAt: Date.now()
      });
    });
  },

  async reactivateOrganization(superAdminUserId: string, organizationId: string): Promise<void> {
    await db.transaction('rw', [db.organizations, db.platform_role_assignments, db.audit_events], async () => {
      const platformRole = await db.platform_role_assignments
        .where({ userId: superAdminUserId })
        .filter(r => r.role === 'super_admin' && r.status === 'active')
        .first();
        
      if (!platformRole) throw new Error('Unauthorized: Super Admin required');

      const org = await db.organizations.get(organizationId);
      if (!org) throw new Error('Organization not found');

      if (org.status !== 'suspended') throw new Error('Organization is not suspended');

      await db.organizations.update(organizationId, {
        status: 'active',
        updatedAt: Date.now()
      });

      await db.audit_events.add({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId: superAdminUserId,
        eventType: 'organization_reactivated',
        targetId: organizationId,
        targetType: 'organization',
        createdAt: Date.now()
      });
    });
  }
};
