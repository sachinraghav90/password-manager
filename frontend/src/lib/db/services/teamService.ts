import { db } from '../client';
import { OrganizationTeam, OrganizationTeamMembership } from '../schema';
import { auditService } from './auditService';
import { authorizationService } from './authorizationService';

export const teamService = {
  
  async createTeam(actorUserId: string, organizationId: string, name: string, description?: string): Promise<OrganizationTeam> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'teams.create');

    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Team name is required');

    // Check for duplicates
    const existing = await db.organization_teams.where({ organizationId }).filter(t => t.name.toLowerCase() === normalizedName.toLowerCase()).first();
    if (existing) {
      throw new Error('A team with this name already exists in the organization.');
    }

    const team: OrganizationTeam = {
      id: crypto.randomUUID(),
      organizationId,
      name: normalizedName,
      description: description?.trim(),
      createdByUserId: actorUserId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.transaction('rw', db.organization_teams, db.audit_events, async () => {
      await db.organization_teams.add(team);
      await auditService.logEvent(organizationId, actorUserId, 'team_created', 'team', team.id, { name: team.name });
    });

    return team;
  },

  async updateTeam(actorUserId: string, organizationId: string, teamId: string, name: string, description?: string): Promise<OrganizationTeam> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'teams.edit');

    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Team name is required');

    return await db.transaction('rw', db.organization_teams, db.audit_events, async () => {
      const team = await db.organization_teams.get(teamId);
      if (!team || team.organizationId !== organizationId) throw new Error('Team not found');

      const existing = await db.organization_teams.where({ organizationId }).filter(t => t.id !== teamId && t.name.toLowerCase() === normalizedName.toLowerCase()).first();
      if (existing) {
        throw new Error('A team with this name already exists in the organization.');
      }

      team.name = normalizedName;
      team.description = description?.trim();
      team.updatedAt = Date.now();

      await db.organization_teams.put(team);
      await auditService.logEvent(organizationId, actorUserId, 'team_updated', 'team', team.id, { name: team.name });
      return team;
    });
  },

  async deleteTeam(actorUserId: string, organizationId: string, teamId: string): Promise<void> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'teams.delete');

    await db.transaction('rw', db.organization_teams, db.organization_team_memberships, db.share_grants, db.share_requests, db.audit_events, async () => {
      const team = await db.organization_teams.get(teamId);
      if (!team || team.organizationId !== organizationId) throw new Error('Team not found');

      // Remove team members
      const links = await db.organization_team_memberships.where({ teamId }).toArray();
      for (const link of links) {
        await db.organization_team_memberships.delete(link.id);
      }

      // Mark associated sharing policies for review (requests and grants targeting this team)
      const grants = await db.share_grants.where({ organizationId }).filter(g => g.targetType === 'team' && g.targetTeamId === teamId).toArray();
      for (const grant of grants) {
        grant.status = 'revocation_pending';
        grant.updatedAt = Date.now();
        await db.share_grants.put(grant);
      }
      
      const requests = await db.share_requests.where({ organizationId }).filter(r => r.targetType === 'team' && r.targetTeamId === teamId && r.status === 'pending').toArray();
      for (const req of requests) {
        req.status = 'cancelled';
        req.updatedAt = Date.now();
        await db.share_requests.put(req);
      }

      await db.organization_teams.delete(teamId);
      await auditService.logEvent(organizationId, actorUserId, 'team_deleted', 'team', teamId, { name: team.name });
    });
  },

  async addTeamMember(actorUserId: string, organizationId: string, teamId: string, membershipId: string): Promise<void> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'teams.edit');

    await db.transaction('rw', db.organization_teams, db.organization_memberships, db.organization_team_memberships, db.audit_events, async () => {
      const team = await db.organization_teams.get(teamId);
      if (!team || team.organizationId !== organizationId) throw new Error('Team not found');

      const membership = await db.organization_memberships.get(membershipId);
      if (!membership || membership.organizationId !== organizationId) throw new Error('Membership not found');
      
      if (membership.status === 'suspended' || membership.status === 'removed') {
        throw new Error('Cannot add a suspended or removed member to a team');
      }

      const existing = await db.organization_team_memberships.where({ teamId, membershipId }).first();
      if (existing) return; // Already in team

      const link: OrganizationTeamMembership = {
        id: crypto.randomUUID(),
        organizationId,
        teamId,
        membershipId,
        createdAt: Date.now()
      };

      await db.organization_team_memberships.add(link);
      await auditService.logEvent(organizationId, actorUserId, 'team_member_added', 'team', teamId, { membershipId });
    });
  },

  async removeTeamMember(actorUserId: string, organizationId: string, teamId: string, membershipId: string): Promise<void> {
    await authorizationService.assertHasPermission(actorUserId, organizationId, 'teams.edit');

    await db.transaction('rw', db.organization_teams, db.organization_team_memberships, db.audit_events, async () => {
      const team = await db.organization_teams.get(teamId);
      if (!team || team.organizationId !== organizationId) throw new Error('Team not found');

      const link = await db.organization_team_memberships.where({ teamId, membershipId }).first();
      if (!link) return;

      await db.organization_team_memberships.delete(link.id);
      await auditService.logEvent(organizationId, actorUserId, 'team_member_removed', 'team', teamId, { membershipId });
    });
  }

};
