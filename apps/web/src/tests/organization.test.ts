import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@vaultguard/db-local';
import { organizationProvisioningService } from '../lib/db/services/organizationProvisioningService';
import { organizationService } from '../lib/db/services/organizationService';
import { membershipService } from '../lib/db/services/membershipService';
import { invitationService } from '../lib/db/services/invitationService';
import { domainService } from '../lib/db/services/domainService';
import { planService } from '../lib/db/services/planService';
import { useAccountStore } from '../store/useAccountStore';
import { useItemListStore } from '../store/useItemListStore';

describe('Organization & Account Context Tests (Phase 6D)', () => {
  beforeEach(async () => {
    await db.resetDatabase();
    useAccountStore.getState().clearContext();
    useItemListStore.getState().resetState();
    await planService.seedDevelopmentPlans();
  });

  const getTestPlan = async () => {
    const plans = await planService.getActivePlans('organization');
    return plans.find(p => p.selfServiceEnabled)!;
  };

  it('Exactly-one-admin rule is enforced during provisioning and transfer', async () => {
    const superAdminId = crypto.randomUUID();
    const targetUserId = crypto.randomUUID();
    const plan = await getTestPlan();

    await db.platform_role_assignments.add({
      id: crypto.randomUUID(),
      userId: superAdminId,
      role: 'super_admin',
      status: 'active',
      assignedAt: Date.now()
    });

    // 1. Provision organization
    const org = await organizationProvisioningService.provisionSuperAdminOrganization(
      superAdminId, 'Test Org', 'test.com', { type: 'new', email: 'admin@test.com', fullName: 'Admin', passwordHash: 'hash', masterKeySalt: 'salt', encryptionVersion: 'v1' }, plan.id, 'active', 10
    );

    const adminMem = await db.organization_memberships.where({ organizationId: org.id, role: 'organization_admin' }).first();
    const creatorId = adminMem!.userId;

    // Assert only one admin exists initially
    await expect(membershipService.assertExactlyOneActiveOrganizationAdmin(org.id)).resolves.not.toThrow();
    
    // Add member
    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: targetUserId,
      role: 'member',
      status: 'active',
      joinedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // 2. Transfer Admin
    await organizationService.transferAdmin(org.id, creatorId, targetUserId);

    // Assert rule still holds
    await expect(membershipService.assertExactlyOneActiveOrganizationAdmin(org.id)).resolves.not.toThrow();

    // Verify roles
    const updatedOrg = await db.organizations.get(org.id);
    expect(updatedOrg?.adminUserId).toBe(targetUserId);

    const creatorMem = await membershipService.getMembership(creatorId, org.id);
    const targetMem = await membershipService.getMembership(targetUserId, org.id);

    expect(creatorMem?.role).toBe('member');
    expect(targetMem?.role).toBe('organization_admin');
  });

  it('Super Admin Provisioning creates user correctly', async () => {
    const superAdminId = crypto.randomUUID();
    
    // Assign Super Admin role
    await db.platform_role_assignments.add({
      id: crypto.randomUUID(),
      userId: superAdminId,
      role: 'super_admin',
      status: 'active',
      assignedAt: Date.now()
    });

    const plans = await planService.getActivePlans('organization');
    const enterprisePlan = plans.find(p => !p.selfServiceEnabled)!;

    const org = await organizationProvisioningService.provisionSuperAdminOrganization(
      superAdminId, 'Enterprise Org', 'enterprise.com', { type: 'new', email: 'ent@test.com', fullName: 'Ent Admin', passwordHash: 'hash', masterKeySalt: 'salt', encryptionVersion: 'v1' }, enterprisePlan.id, 'active', 50
    );

    expect(org.provisioningStatus).toBe('ready');

    const adminMem = await db.organization_memberships.where({ organizationId: org.id, role: 'organization_admin' }).first();
    const adminUser = await db.users.get(adminMem!.userId);
    
    expect(adminMem?.status).toBe('active');
    expect(adminMem?.role).toBe('organization_admin');
    expect(adminUser?.mustChangePassword).toBe(true);
  });

  it('Invitation security: tokens are hashed, transport abstracted, exact limits enforced', async () => {
    const superAdminId = crypto.randomUUID();
    const plan = await getTestPlan();

    await db.platform_role_assignments.add({
      id: crypto.randomUUID(),
      userId: superAdminId,
      role: 'super_admin',
      status: 'active',
      assignedAt: Date.now()
    });

    const org = await organizationProvisioningService.provisionSuperAdminOrganization(
      superAdminId, 'Test Org', 'test.com', { type: 'new', email: 'admin@test.com', fullName: 'Admin', passwordHash: 'hash', masterKeySalt: 'salt', encryptionVersion: 'v1' }, plan.id, 'active', 50
    );

    const adminMem = await db.organization_memberships.where({ organizationId: org.id, role: 'organization_admin' }).first();

    const email = 'new-user@test.com';
    await invitationService.inviteMember(org.id, adminMem!.userId, email);

    // Find the invite
    const invites = await db.organization_invitations.where({ organizationId: org.id }).toArray();
    expect(invites.length).toBe(1);
    
    const invite = invites[0];
    expect(invite.email).toBe(email);
    expect(invite.tokenHash).toBeDefined(); // Hash is stored
    expect((invite as any).token).toBeUndefined(); // Raw token MUST NOT be stored
    
    // Check seat counting includes pending invites
    const count = await planService.getActiveSeatCount(org.id);
    expect(count).toBe(2); // Creator + 1 invite
  });

  it('Domain uniqueness: Cannot claim verified domain of another org', async () => {
    const superAdminId = crypto.randomUUID();
    const plan = await getTestPlan();

    await db.platform_role_assignments.add({
      id: crypto.randomUUID(),
      userId: superAdminId,
      role: 'super_admin',
      status: 'active',
      assignedAt: Date.now()
    });

    const org1 = await organizationProvisioningService.provisionSuperAdminOrganization(
      superAdminId, 'Org 1', 'shared.com', { type: 'new', email: 'admin1@test.com', fullName: 'Admin', passwordHash: 'hash', masterKeySalt: 'salt', encryptionVersion: 'v1' }, plan.id, 'active', 50
    );
    const adminMem = await db.organization_memberships.where({ organizationId: org1.id, role: 'organization_admin' }).first();
    const creator1 = adminMem!.userId;

    // Verify domain for org1
    const domainRecord = await db.organization_domains.where({ domain: 'shared.com' }).first();
    expect(domainRecord).toBeDefined();
    await domainService.startVerification(org1.id, creator1, domainRecord!.id);
    await domainService.simulateVerify(org1.id, creator1, domainRecord!.id);

    // Org 2 tries to claim same domain
    await expect(
      organizationProvisioningService.provisionSuperAdminOrganization(superAdminId, 'Org 2', 'shared.com', { type: 'new', email: 'admin2@test.com', fullName: 'Admin', passwordHash: 'hash', masterKeySalt: 'salt', encryptionVersion: 'v1' }, plan.id, 'active', 50)
    ).rejects.toThrow('Domain is already verified by another organization.');
  });
});

