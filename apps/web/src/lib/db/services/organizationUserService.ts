import { db } from '@vaultguard/db-local';
import { User, OrganizationMembership } from '@vaultguard/models';
import { auditService } from '@vaultguard/permissions';
import { authorizationService } from '@vaultguard/permissions';
import { cryptoUtils } from '@vaultguard/crypto';

export interface OrganizationSeatUsage {
  organizationId: string;
  seatLimit: number;
  seatsUsed: number;
  seatsAvailable: number;
  activeAdmins: number;
  activeMembers: number;
  suspendedMembers: number;
  pendingInvitations: number;
}

export const organizationUserService = {
  
  async getOrganizationSeatUsage(organizationId: string): Promise<OrganizationSeatUsage> {
    const org = await db.organizations.get(organizationId);
    if (!org) throw new Error('Organization not found');

    const memberships = await db.organization_memberships.where({ organizationId }).toArray();
    const activeAdmins = memberships.filter(m => m.role === 'organization_admin' && m.status === 'active').length;
    const activeMembers = memberships.filter(m => m.role === 'member' && m.status === 'active').length;
    const suspendedMembers = memberships.filter(m => m.status === 'suspended').length;
    
    // As per policy: pending invitations do not consume seats
    const invites = await db.organization_invitations.where({ organizationId }).filter(i => i.status === 'pending').toArray();

    const seatsUsed = activeAdmins + activeMembers + suspendedMembers;
    const seatsAvailable = Math.max(0, org.seatLimit - seatsUsed);

    return {
      organizationId,
      seatLimit: org.seatLimit,
      seatsUsed,
      seatsAvailable,
      activeAdmins,
      activeMembers,
      suspendedMembers,
      pendingInvitations: invites.length
    };
  },

  async assertSeatAvailable(organizationId: string): Promise<void> {
    const usage = await this.getOrganizationSeatUsage(organizationId);
    if (usage.seatsAvailable <= 0) {
      throw new Error('No seats are available for this organization. Remove an existing member or ask the platform administrator to increase the organization\'s plan limit.');
    }
  },

  async createOrganizationUser(
    actorUserId: string,
    organizationId: string,
    email: string,
    firstName: string,
    lastName: string,
    temporaryPasswordText: string, // Only used to generate the hash here
    permissionProfileId?: string,
    teamIds?: string[]
  ): Promise<{ user: User; membership: OrganizationMembership }> {
    
    // Authorization
    const memberships = await db.organization_memberships.where({ userId: actorUserId, organizationId }).toArray();
    const actorMembership = memberships.find(m => m.status === 'active' && m.role === 'organization_admin'); // Only admins can create users for now
    if (!actorMembership) {
      await authorizationService.assertHasPermission(actorUserId, organizationId, 'members.invite');
    }

    // Validation
    const org = await db.organizations.get(organizationId);
    if (!org || org.status !== 'active') throw new Error('Organization is not active');
    
    await this.assertSeatAvailable(organizationId);

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.users.where('email').equalsIgnoreCase(normalizedEmail).first();
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    // Cryptography setup for temporary credential
    const salt = cryptoUtils.generateSalt();
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(temporaryPasswordText + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const now = Date.now();

    const user: User = {
      id: userId,
      email: normalizedEmail,
      fullName: `${firstName} ${lastName}`.trim(),
      emailVerified: true, // Organization provisioned
      passwordHash,
      masterKeySalt: salt,
      encryptionVersion: 'PBKDF2-AES256GCM',
      mustChangePassword: true, // Forces first-login reset
      accountType: 'managed',
      createdAt: now,
      updatedAt: now
    };

    const membership: OrganizationMembership = {
      id: membershipId,
      organizationId,
      userId,
      role: 'member',
      permissionProfileId: permissionProfileId || null,
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await db.transaction('rw', db.users, db.organization_memberships, db.organization_team_memberships, db.audit_events, async () => {
      await db.users.add(user);
      await db.organization_memberships.add(membership);

      if (teamIds && teamIds.length > 0) {
        for (const teamId of teamIds) {
          await db.organization_team_memberships.add({
            id: crypto.randomUUID(),
            organizationId,
            teamId,
            membershipId,
            createdAt: now
          });
        }
      }

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_user_created',
        targetType: 'user',
        targetId: userId
      });
    });

    return { user, membership };
  },

  async suspendOrganizationUser(actorUserId: string, organizationId: string, membershipId: string) {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'members.suspend');
    
    await db.transaction('rw', db.organization_memberships, db.audit_events, async () => {
      const membership = await db.organization_memberships.get(membershipId);
      if (!membership || membership.organizationId !== organizationId) throw new Error('Membership not found');
      if (membership.role === 'organization_admin') {
         const admins = await db.organization_memberships.where({ organizationId }).filter(m => m.role === 'organization_admin' && m.status === 'active').toArray();
         if (admins.length <= 1 && admins[0].id === membershipId) {
             throw new Error('Cannot suspend the last active organization admin');
         }
      }
      
      membership.status = 'suspended';
      membership.updatedAt = Date.now();
      await db.organization_memberships.put(membership);

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_user_suspended',
        targetType: 'membership',
        targetId: membershipId
      });
    });
  },

  async reactivateOrganizationUser(actorUserId: string, organizationId: string, membershipId: string) {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'members.reactivate');
    
    await this.assertSeatAvailable(organizationId);

    await db.transaction('rw', db.organization_memberships, db.audit_events, async () => {
      const membership = await db.organization_memberships.get(membershipId);
      if (!membership || membership.organizationId !== organizationId) throw new Error('Membership not found');
      
      membership.status = 'active';
      membership.updatedAt = Date.now();
      await db.organization_memberships.put(membership);

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_user_reactivated',
        targetType: 'membership',
        targetId: membershipId
      });
    });
  },

  async removeOrganizationUser(actorUserId: string, organizationId: string, membershipId: string) {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'members.remove');
    
    await db.transaction('rw', db.organization_memberships, db.organization_team_memberships, db.audit_events, async () => {
      const membership = await db.organization_memberships.get(membershipId);
      if (!membership || membership.organizationId !== organizationId) throw new Error('Membership not found');
      if (membership.role === 'organization_admin') {
         const admins = await db.organization_memberships.where({ organizationId }).filter(m => m.role === 'organization_admin' && m.status === 'active' && m.id !== membershipId).toArray();
         if (admins.length === 0) {
             throw new Error('Cannot remove the last active organization admin');
         }
      }
      
      membership.status = 'removed';
      membership.permissionProfileId = null;
      membership.updatedAt = Date.now();
      await db.organization_memberships.put(membership);

      // Remove from all teams
      const teamLinks = await db.organization_team_memberships.where({ membershipId }).toArray();
      for (const link of teamLinks) {
        await db.organization_team_memberships.delete(link.id);
      }

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_user_removed',
        targetType: 'membership',
        targetId: membershipId
      });
    });
  },

  async resetTemporaryCredential(actorUserId: string, organizationId: string, membershipId: string, newTemporaryPasswordText: string) {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'members.assign_profile'); // Or maybe a specific reset permission, but using assign_profile or edit for now
    
    await db.transaction('rw', db.organization_memberships, db.users, db.audit_events, async () => {
      const membership = await db.organization_memberships.get(membershipId);
      if (!membership || membership.organizationId !== organizationId) throw new Error('Membership not found');
      
      const user = await db.users.get(membership.userId);
      if (!user) throw new Error('User not found');

      const salt = cryptoUtils.generateSalt();
      const enc = new TextEncoder();
      const passwordBuffer = enc.encode(newTemporaryPasswordText + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      user.passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      user.masterKeySalt = salt;
      user.mustChangePassword = true;
      user.updatedAt = Date.now();
      
      await db.users.put(user);

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_user_temporary_credential_reset',
        targetType: 'user',
        targetId: user.id
      });
    });
  }
};
