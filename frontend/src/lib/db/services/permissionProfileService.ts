import { db } from '../client';
import { PermissionProfile, OrganizationPermission } from '../schema';
import { authorizationService } from './authorizationService';
import { auditService } from './auditService';

export const permissionProfileService = {
  async getProfiles(organizationId: string): Promise<PermissionProfile[]> {
    return await db.permission_profiles.where({ organizationId }).toArray();
  },

  async getProfileById(organizationId: string, profileId: string): Promise<PermissionProfile | undefined> {
    const profile = await db.permission_profiles.get(profileId);
    if (profile && profile.organizationId === organizationId) {
      return profile;
    }
    return undefined;
  },

  async createProfile(
    organizationId: string,
    actorUserId: string,
    name: string,
    description: string | undefined,
    permissions: OrganizationPermission[],
    isSystem: boolean = false
  ): Promise<PermissionProfile> {
    await authorizationService.assertCanPerform(actorUserId, 'permissions.create', {
      resourceType: 'permission_profile',
      organizationId
    });

    await this.assertCanDelegatePermissions(actorUserId, organizationId, permissions);

    const existing = await db.permission_profiles.where({ organizationId, name }).first();
    if (existing) {
      throw new Error(`Profile with name '${name}' already exists.`);
    }

    const newProfile: PermissionProfile = {
      id: crypto.randomUUID(),
      organizationId,
      name,
      description,
      permissions,
      isSystem,
      createdByUserId: actorUserId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return await db.transaction('rw', db.permission_profiles, db.audit_events, async () => {
      await db.permission_profiles.add(newProfile);
      
      await auditService.logEvent({
        organizationId: organizationId,
        actorUserId: actorUserId,
        eventType: 'permission_profile_created',
        targetType: 'permission_profile',
        targetId: newProfile.id,
        metadata: { name }
      });
      
      return newProfile;
    });
  },

  async updateProfile(
    organizationId: string,
    actorUserId: string,
    profileId: string,
    name: string,
    description: string | undefined,
    permissions: OrganizationPermission[]
  ): Promise<PermissionProfile> {
    await authorizationService.assertCanPerform(actorUserId, 'permissions.edit', {
      resourceType: 'permission_profile',
      resourceId: profileId,
      organizationId
    });

    const profile = await this.getProfileById(organizationId, profileId);
    if (!profile) throw new Error('Profile not found.');
    if (profile.isSystem) throw new Error('Cannot edit system protected profiles.');

    await this.assertCanDelegatePermissions(actorUserId, organizationId, permissions);

    if (profile.name !== name) {
      const existing = await db.permission_profiles.where({ organizationId, name }).first();
      if (existing) {
        throw new Error(`Profile with name '${name}' already exists.`);
      }
    }

    return await db.transaction('rw', db.permission_profiles, db.audit_events, async () => {
      const updated = {
        ...profile,
        name,
        description,
        permissions,
        updatedAt: Date.now()
      };
      await db.permission_profiles.put(updated);
      
      await auditService.logEvent({
        organizationId: organizationId,
        actorUserId: actorUserId,
        eventType: 'permission_profile_updated',
        targetType: 'permission_profile',
        targetId: profileId,
        metadata: { name }
      });
      
      authorizationService.clearCache();
      return updated;
    });
  },

  async deleteProfile(
    organizationId: string,
    actorUserId: string,
    profileId: string
  ): Promise<void> {
    await authorizationService.assertCanPerform(actorUserId, 'permissions.delete', {
      resourceType: 'permission_profile',
      resourceId: profileId,
      organizationId
    });

    const profile = await this.getProfileById(organizationId, profileId);
    if (!profile) throw new Error('Profile not found.');
    if (profile.isSystem) throw new Error('Cannot delete system protected profiles.');

    return await db.transaction('rw', db.permission_profiles, db.organization_memberships, db.audit_events, async () => {
      const usersWithProfile = await db.organization_memberships.where({ permissionProfileId: profileId }).count();
      if (usersWithProfile > 0) {
        throw new Error('Cannot delete a profile that is currently assigned to members. Reassign them first.');
      }

      await db.permission_profiles.delete(profileId);
      
      await auditService.logEvent({
        organizationId: organizationId,
        actorUserId: actorUserId,
        eventType: 'permission_profile_deleted',
        targetType: 'permission_profile',
        targetId: profileId,
        metadata: { name: profile.name }
      });
      
      authorizationService.clearCache();
    });
  },

  /**
   * Prevents permission escalation.
   * A user cannot grant permissions they do not possess, unless they are the Organization Admin.
   */
  async assertCanDelegatePermissions(
    actorUserId: string,
    organizationId: string,
    requestedPermissions: OrganizationPermission[]
  ): Promise<void> {
    const membership = await db.organization_memberships.where({ organizationId, userId: actorUserId }).first();
    if (!membership) throw new Error('Membership required to delegate permissions.');
    
    // Org Admin can delegate anything
    if (membership.role === 'organization_admin') return;

    if (!membership.permissionProfileId) {
      throw new Error('Actor has no permissions to delegate.');
    }

    const actorProfile = await db.permission_profiles.get(membership.permissionProfileId);
    if (!actorProfile) throw new Error('Actor profile missing.');

    const actorPermissions = new Set(actorProfile.permissions);
    for (const reqPerm of requestedPermissions) {
      if (!actorPermissions.has(reqPerm)) {
        throw new Error(`Cannot grant permission you do not have: ${reqPerm}`);
      }
    }
  }
};
