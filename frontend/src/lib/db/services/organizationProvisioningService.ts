import { db } from '../client';
import { Organization, OrganizationMembership, OrganizationSettings, OrganizationUsage } from '../schema';
import { auditService } from './auditService';
import { domainService } from './domainService';

export const organizationProvisioningService = {
  
  async assertExactlyOneActiveOrganizationAdmin(organizationId: string): Promise<void> {
    const admins = await db.organization_memberships
      .where({ organizationId })
      .filter(m => m.role === 'organization_admin' && m.status === 'active')
      .toArray();
      
    if (admins.length !== 1) {
      throw new Error(`Exactly one active organization_admin is required. Found: ${admins.length}`);
    }
    
    const org = await db.organizations.get(organizationId);
    if (!org) throw new Error('Organization not found');
    
    if (org.adminUserId !== admins[0].userId) {
      throw new Error('Organization adminUserId does not match the active admin membership.');
    }
  },

  // Self-service organization creation removed as per architecture change

  async provisionSuperAdminOrganization(
    superAdminUserId: string,
    name: string,
    domain: string,
    initialAdmin: { type: 'existing'; userId: string } | { type: 'new'; email: string; fullName: string; passwordHash: string; masterKeySalt: string; encryptionVersion: string },
    planId: string,
    billingState: 'active' | 'trial' | 'manual',
    seatLimit: number,
    storageLimitBytes?: number
  ): Promise<Organization> {
    return await db.transaction('rw', [
      db.organizations, 
      db.organization_memberships, 
      db.organization_settings, 
      db.organization_usage, 
      db.organization_domains,
      db.audit_events,
      db.plans,
      db.platform_role_assignments,
      db.users
    ], async () => {
      
      // Enforce Super Admin role
      const platformRole = await db.platform_role_assignments
        .where({ userId: superAdminUserId })
        .filter(r => r.role === 'super_admin' && r.status === 'active')
        .first();
        
      if (!platformRole) {
        throw new Error('Unauthorized: Super Admin privileges required to provision organizations manually');
      }

      const plan = await db.plans.get(planId);
      if (!plan || plan.accountType !== 'organization') {
        throw new Error('Invalid plan selected');
      }

      let adminUserId = '';

      if (initialAdmin.type === 'existing') {
        adminUserId = initialAdmin.userId;
        const user = await db.users.get(adminUserId);
        if (!user) throw new Error('Initial admin user not found');
      } else {
        const existingEmailUser = await db.users.where('email').equalsIgnoreCase(initialAdmin.email).first();
        if (existingEmailUser) {
          throw new Error('A user with this email already exists. Please select "Existing User" instead.');
        }
        adminUserId = crypto.randomUUID();
        await db.users.add({
          id: adminUserId,
          email: initialAdmin.email,
          fullName: initialAdmin.fullName,
          passwordHash: initialAdmin.passwordHash,
          masterKeySalt: initialAdmin.masterKeySalt,
          encryptionVersion: initialAdmin.encryptionVersion,
          emailVerified: true,
          mustChangePassword: true,
          accountType: 'managed',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      const normalizedDomain = domainService.normalizeDomain(domain);
      
      const orgId = crypto.randomUUID();
      const now = Date.now();

      const organization: Organization = {
        id: orgId,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        adminUserId: adminUserId,
        provisioningMode: 'super_admin_provisioned',
        provisioningStatus: 'ready',
        planId: plan.id,
        billingState,
        seatLimit,
        storageLimitBytes,
        status: 'active',
        createdByUserId: superAdminUserId,
        createdAt: now,
        updatedAt: now
      };

      await db.organizations.add(organization);

      // If user exists, create active admin, if not create invited admin (or pending state). 
      // For this implementation, we assume if user doesn't exist, they'll be sent a pending invite
      // For simplicity, we just create the membership in 'invited' state if pending.
      const membership: OrganizationMembership = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: adminUserId,
        role: 'organization_admin',
        status: 'active',
        joinedAt: now,
        createdAt: now,
        updatedAt: now
      };
      
      await db.organization_memberships.add(membership);

      const settings: OrganizationSettings = {
        organizationId: orgId,
        requireTwoFactor: false,
        restrictExport: false,
        joinPolicy: 'invite_only'
      };

      await db.organization_settings.add(settings);

      const usage: OrganizationUsage = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        periodStart: now,
        periodEnd: now + 1000 * 60 * 60 * 24 * 30, // 30 days roughly
        activeSeats: 1,
        totalSeats: seatLimit,
        vaultCount: 0,
        itemCount: 0,
        attachmentBytes: 0,
        lastActivityAt: now
      };

      await db.organization_usage.add(usage);

      await domainService.claimDomain(orgId, superAdminUserId, normalizedDomain);

      await auditService.logEvent({
        organizationId: orgId,
        actorUserId: superAdminUserId,
        eventType: 'organization_created_by_super_admin',
        targetId: orgId,
        targetType: 'organization'
      });
      
      await auditService.logEvent({
        organizationId: orgId,
        actorUserId: superAdminUserId,
        eventType: 'organization_admin_created',
        targetId: adminUserId,
        targetType: 'user'
      });
      
      await this.assertExactlyOneActiveOrganizationAdmin(orgId);

      return organization;
    });
  }
};
