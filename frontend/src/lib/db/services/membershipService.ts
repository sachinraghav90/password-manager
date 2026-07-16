import { db } from '../client';
import { OrganizationMembership } from '../schema';
import { authorizationService } from './authorizationService';

export const membershipService = {
  /**
   * Returns a specific membership record for a user in an organization.
   */
  async getMembership(userId: string, organizationId: string): Promise<OrganizationMembership | undefined> {
    return await db.organization_memberships
      .where('[organizationId+userId]')
      .equals([organizationId, userId])
      .first();
  },

  /**
   * Evaluates if a user has an active membership in the organization.
   */
  async hasActiveMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.getMembership(userId, organizationId);
    return membership !== undefined && membership.status === 'active';
  },

  /**
   * Asserts the user is an active member of the organization.
   */
  async assertActiveMembership(userId: string, organizationId: string): Promise<OrganizationMembership> {
    const membership = await this.getMembership(userId, organizationId);
    if (!membership || membership.status !== 'active') {
      throw new Error('Unauthorized: Active organization membership required');
    }
    return membership;
  },

  /**
   * Asserts the user is an active organization_admin.
   */
  async assertOrganizationAdmin(userId: string, organizationId: string): Promise<OrganizationMembership> {
    const membership = await this.assertActiveMembership(userId, organizationId);
    if (membership.role !== 'organization_admin') {
      throw new Error('Unauthorized: Organization admin privileges required');
    }
    return membership;
  },
  
  /**
   * Returns all active memberships for a user.
   */
  async getUserActiveMemberships(userId: string): Promise<OrganizationMembership[]> {
    const memberships = await db.organization_memberships
      .where('userId')
      .equals(userId)
      .toArray();
    
    return memberships.filter(m => m.status === 'active');
  },

  /**
   * Asserts exactly one active organization_admin
   */
  async assertExactlyOneActiveOrganizationAdmin(organizationId: string): Promise<void> {
    const admins = await db.organization_memberships
      .where({ organizationId })
      .filter((m: any) => m.role === 'organization_admin' && m.status === 'active')
      .toArray();
      
    if (admins.length !== 1) {
      throw new Error(`Exactly one active organization_admin is required. Found: ${admins.length}`);
    }
  },

  /**
   * Suspends an active member.
   */
  async suspendMember(organizationId: string, actorUserId: string, targetUserId: string): Promise<void> {
    await authorizationService.assertCanPerform(actorUserId, 'members.suspend', {
      resourceType: 'membership',
      organizationId,
    });

    await db.transaction('rw', [db.organization_memberships, db.organizations, db.audit_events], async () => {
      const membership = await this.getMembership(targetUserId, organizationId);
      if (!membership || membership.status !== 'active') {
        throw new Error('Only active members can be suspended');
      }

      if (membership.role === 'organization_admin') {
        throw new Error('The active organization admin cannot be suspended directly. Transfer admin ownership first.');
      }

      await db.organization_memberships.update(membership.id, {
        status: 'suspended',
        updatedAt: Date.now()
      });

      // Assert invariant
      await this.assertExactlyOneActiveOrganizationAdmin(organizationId);

      await db.audit_events.add({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId,
        eventType: 'member_suspended',
        targetId: targetUserId,
        targetType: 'user',
        createdAt: Date.now()
      });
    });
  },

  /**
   * Reactivates a suspended member.
   */
  async reactivateMember(organizationId: string, actorUserId: string, targetUserId: string): Promise<void> {
    await authorizationService.assertCanPerform(actorUserId, 'members.reactivate', {
      resourceType: 'membership',
      organizationId,
    });

    await db.transaction('rw', [db.organization_memberships, db.organizations, db.audit_events], async () => {
      const membership = await this.getMembership(targetUserId, organizationId);
      if (!membership || membership.status !== 'suspended') {
        throw new Error('Only suspended members can be reactivated');
      }

      await db.organization_memberships.update(membership.id, {
        status: 'active',
        updatedAt: Date.now()
      });

      await this.assertExactlyOneActiveOrganizationAdmin(organizationId);

      await db.audit_events.add({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId,
        eventType: 'member_reactivated',
        targetId: targetUserId,
        targetType: 'user',
        createdAt: Date.now()
      });
    });
  },

  /**
   * Removes a member (suspended or active).
   */
  async removeMember(organizationId: string, actorUserId: string, targetUserId: string): Promise<void> {
    await authorizationService.assertCanPerform(actorUserId, 'members.remove', {
      resourceType: 'membership',
      organizationId,
    });

    await db.transaction('rw', [db.organization_memberships, db.organizations, db.audit_events], async () => {
      const membership = await this.getMembership(targetUserId, organizationId);
      if (!membership || membership.status === 'removed') {
        throw new Error('Member already removed or does not exist');
      }

      if (membership.role === 'organization_admin') {
        throw new Error('The active organization admin cannot be removed directly. Transfer admin ownership first.');
      }

      await db.organization_memberships.update(membership.id, {
        status: 'removed',
        updatedAt: Date.now()
      });

      await this.assertExactlyOneActiveOrganizationAdmin(organizationId);

      await db.audit_events.add({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId,
        eventType: 'member_removed',
        targetId: targetUserId,
        targetType: 'user',
        createdAt: Date.now()
      });
    });
  },

  /**
   * Assigns a permission profile to a member.
   */
  async assignPermissionProfile(
    actorUserId: string,
    organizationId: string,
    membershipId: string,
    permissionProfileId: string | null
  ): Promise<void> {
    await authorizationService.assertCanPerform(actorUserId, 'members.assign_profile', {
      resourceType: 'membership',
      resourceId: membershipId,
      organizationId
    });

    await db.transaction('rw', [db.organization_memberships, db.permission_profiles, db.audit_events], async () => {
      const targetMembership = await db.organization_memberships.get(membershipId);
      if (!targetMembership || targetMembership.organizationId !== organizationId) {
        throw new Error('Membership not found in this organization');
      }

      if (targetMembership.userId === actorUserId) {
        throw new Error('You cannot modify your own permission profile assignment');
      }

      if (targetMembership.role === 'organization_admin') {
        throw new Error('Cannot assign permission profiles to the organization admin');
      }

      let requestedPermissions: string[] = [];
      if (permissionProfileId) {
        const profile = await db.permission_profiles.get(permissionProfileId);
        if (!profile || profile.organizationId !== organizationId) {
          throw new Error('Permission profile not found in this organization');
        }
        requestedPermissions = profile.permissions;
      }

      // Check for privilege escalation
      const { permissionProfileService } = await import('./permissionProfileService');
      await permissionProfileService.assertCanDelegatePermissions(actorUserId, organizationId, requestedPermissions as any);

      await db.organization_memberships.update(membershipId, {
        permissionProfileId: permissionProfileId,
        updatedAt: Date.now()
      });

      await db.audit_events.add({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId,
        eventType: permissionProfileId ? 'permission_profile_assigned' : 'permission_profile_unassigned',
        targetId: membershipId,
        targetType: 'membership',
        createdAt: Date.now(),
        metadata: { permissionProfileId: permissionProfileId || 'none' }
      });

      authorizationService.clearCache();
    });
  }
};
