import { db } from '../client';
import { OrganizationInvitation, OrganizationMembership } from '../schema';
import { authorizationService } from './authorizationService';
import { auditService } from './auditService';
import { planService } from './planService';

export interface InvitationMessage {
  toEmail: string;
  organizationName: string;
  inviteLink: string;
}

export interface InvitationTransport {
  sendInvitation(input: InvitationMessage): Promise<void>;
}

export class LocalInvitationTransport implements InvitationTransport {
  async sendInvitation(input: InvitationMessage): Promise<void> {
    console.log(`[Development simulation — no email was sent] Invitation sent to ${input.toEmail}`);
    console.log(`Link: ${input.inviteLink}`);
    // A simulated in-app inbox could also be populated here if needed
  }
}

export const invitationService = {
  transport: new LocalInvitationTransport(),

  async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  },

  async inviteMember(organizationId: string, inviterUserId: string, emailRaw: string): Promise<void> {
    await authorizationService.assertCanPerform(inviterUserId, 'members.invite', {
      resourceType: 'membership',
      organizationId
    });

    const email = this.normalizeEmail(emailRaw);

    await planService.assertOrganizationPlanActive(organizationId);
    await planService.assertSeatAvailable(organizationId);

    const token = this.generateSecureToken();
    const tokenHash = await this.hashToken(token);

    await db.transaction('rw', [db.organization_invitations, db.organization_memberships, db.organizations, db.audit_events, db.users], async () => {
      // Check duplicate pending invite
      const existingInvites = await db.organization_invitations
        .where({ organizationId })
        .filter(i => i.email === email && i.status === 'pending' && i.expiresAt > Date.now())
        .toArray();
      
      if (existingInvites.length > 0) {
        throw new Error('A valid invitation already exists for this email.');
      }

      // Check if user is already a member
      const user = await db.users.where('email').equals(email).first();
      if (user) {
        const existingMember = await db.organization_memberships
          .where('[organizationId+userId]')
          .equals([organizationId, user.id])
          .first();

        if (existingMember && ['active', 'invited'].includes(existingMember.status)) {
          throw new Error('User is already an active or invited member.');
        }
      }

      const invite: OrganizationInvitation = {
        id: crypto.randomUUID(),
        organizationId,
        email,
        tokenHash,
        status: 'pending',
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        createdAt: Date.now()
      };

      await db.organization_invitations.add(invite);

      await auditService.logEvent({
        organizationId,
        actorUserId: inviterUserId,
        eventType: 'invitation_created',
        targetId: invite.id,
        targetType: 'invitation'
      });

      const org = await db.organizations.get(organizationId);

      // The raw token is sent to the transport and NEVER persisted to DB
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      await this.transport.sendInvitation({
        toEmail: email,
        organizationName: org?.name || 'Organization',
        inviteLink: `${origin}/app/accept-invite?token=${token}`
      });
    });
  },

  async acceptInvitation(token: string, acceptingUserId: string): Promise<void> {
    const tokenHash = await this.hashToken(token);

    await db.transaction('rw', [db.organization_invitations, db.organization_memberships, db.organizations, db.audit_events, db.users], async () => {
      const invite = await db.organization_invitations.where('tokenHash').equals(tokenHash).first();
      
      if (!invite || invite.status !== 'pending' || invite.expiresAt < Date.now()) {
        throw new Error('This invitation is invalid, expired, revoked, or no longer available.');
      }

      const user = await db.users.get(acceptingUserId);
      if (!user || user.email !== invite.email) {
        throw new Error('This invitation was sent to a different email address.');
      }

      await planService.assertOrganizationPlanActive(invite.organizationId);
      await planService.assertSeatAvailable(invite.organizationId);

      // Prevent duplicate
      const existingMember = await db.organization_memberships
        .where('[organizationId+userId]')
        .equals([invite.organizationId, user.id])
        .first();

      if (existingMember && ['active', 'invited'].includes(existingMember.status)) {
        throw new Error('You are already an active member of this organization.');
      }

      if (existingMember) {
        await db.organization_memberships.update(existingMember.id, {
          status: 'active',
          role: 'member', // ensure exactly one admin invariant
          updatedAt: Date.now()
        });
      } else {
        const membership: OrganizationMembership = {
          id: crypto.randomUUID(),
          organizationId: invite.organizationId,
          userId: user.id,
          role: 'member', // Invites are always members first
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.organization_memberships.add(membership);
      }

      await db.organization_invitations.update(invite.id, {
        status: 'accepted'
      });

      await auditService.logEvent({
        organizationId: invite.organizationId,
        actorUserId: user.id,
        eventType: 'invitation_accepted',
        targetId: invite.id,
        targetType: 'invitation'
      });
    });
  },

  async revokeInvitation(invitationId: string, revokerUserId: string): Promise<void> {
    const inviteInfo = await db.organization_invitations.get(invitationId);
    if (!inviteInfo) throw new Error('Invitation not found');

    await authorizationService.assertCanPerform(revokerUserId, 'members.invite', {
      resourceType: 'membership',
      organizationId: inviteInfo.organizationId
    });

    await db.transaction('rw', [db.organization_invitations, db.audit_events], async () => {
      const invite = await db.organization_invitations.get(invitationId);
      if (!invite) throw new Error('Invitation not found');

      if (invite.status !== 'pending') {
        throw new Error('Only pending invitations can be revoked');
      }

      await db.organization_invitations.update(invitationId, {
        status: 'revoked'
      });

      await auditService.logEvent({
        organizationId: invite.organizationId,
        actorUserId: revokerUserId,
        eventType: 'invitation_revoked',
        targetId: invite.id,
        targetType: 'invitation'
      });
    });
  },

  async resendInvitation(invitationId: string, inviterUserId: string): Promise<void> {
    const inviteInfo = await db.organization_invitations.get(invitationId);
    if (!inviteInfo) throw new Error('Invitation not found');

    await authorizationService.assertCanPerform(inviterUserId, 'members.invite', {
      resourceType: 'membership',
      organizationId: inviteInfo.organizationId
    });

    await db.transaction('rw', [db.organization_invitations, db.organizations, db.audit_events], async () => {
      const invite = await db.organization_invitations.get(invitationId);
      if (!invite) throw new Error('Invitation not found');

      if (invite.status !== 'pending' && invite.status !== 'expired') {
        throw new Error('Cannot resend an accepted or revoked invitation');
      }

      const token = this.generateSecureToken();
      const tokenHash = await this.hashToken(token);

      await db.organization_invitations.update(invitationId, {
        tokenHash,
        status: 'pending',
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7
      });

      await auditService.logEvent({
        organizationId: invite.organizationId,
        actorUserId: inviterUserId,
        eventType: 'invitation_resent',
        targetId: invite.id,
        targetType: 'invitation'
      });

      const org = await db.organizations.get(invite.organizationId);

      await this.transport.sendInvitation({
        toEmail: invite.email,
        organizationName: org?.name || 'Organization',
        inviteLink: `${window.location.origin}/app/accept-invite?token=${token}`
      });
    });
  }
};
