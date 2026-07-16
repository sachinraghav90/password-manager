import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db/client';
import { authorizationService } from '../lib/db/services/authorizationService';
import { permissionProfileService } from '../lib/db/services/permissionProfileService';

describe('Authorization Service RBAC', () => {
  beforeEach(async () => {
    await db.resetDatabase();
  });

  it('evaluates fixed roles and personal boundaries correctly', async () => {
    const orgId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    
    // Setup org
    await db.organizations.add({
      id: orgId,
      adminUserId: adminId,
      name: 'Test Org',
      slug: 'test-org',
      provisioningMode: 'super_admin_provisioned',
      provisioningStatus: 'ready',
      status: 'active',
      planId: 'plan',
      billingState: 'manual',
      seatLimit: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUserId: adminId
    });

    // Admin member
    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: adminId,
      role: 'organization_admin',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Ordinary member
    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: memberId,
      role: 'member',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Admin should have access automatically
    let res = await authorizationService.canPerform(adminId, 'vaults.view', {
      resourceType: 'organization',
      organizationId: orgId
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe('allowed');

    // Admin cannot access personal vault
    res = await authorizationService.canPerform(adminId, 'vaults.view', {
      resourceType: 'vault',
      organizationId: orgId,
      ownershipType: 'personal'
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('personal_resource_denied');

    // Member with no profile gets default deny
    res = await authorizationService.canPerform(memberId, 'members.view', {
      resourceType: 'organization',
      organizationId: orgId
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('permission_profile_missing');

    // Create and assign a Viewer profile to member
    const profile = await permissionProfileService.createProfile(orgId, adminId, 'Viewer', 'Viewer access', ['vaults.view']);
    await db.organization_memberships.where({ organizationId: orgId, userId: memberId }).modify({ permissionProfileId: profile.id });

    // Try again
    res = await authorizationService.canPerform(memberId, 'vaults.view', {
      resourceType: 'organization',
      organizationId: orgId
    });
    expect(res.allowed).toBe(true);

    // But not edit
    res = await authorizationService.canPerform(memberId, 'vaults.edit' as any, {
      resourceType: 'organization',
      organizationId: orgId
    });
    expect(res.allowed).toBe(false);
  });

  it('prevents privilege escalation', async () => {
    const orgId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    const managerId = crypto.randomUUID();

    await db.organizations.add({
      id: orgId,
      adminUserId: adminId,
      name: 'Test Org',
      slug: 'test-org',
      provisioningMode: 'super_admin_provisioned',
      provisioningStatus: 'ready',
      status: 'active',
      planId: 'plan',
      billingState: 'manual',
      seatLimit: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUserId: adminId
    });

    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: adminId,
      role: 'organization_admin',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Create manager with limited permissions
    const managerProfile = await permissionProfileService.createProfile(orgId, adminId, 'Manager', '', ['permissions.create']);
    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: managerId,
      role: 'member',
      status: 'active',
      permissionProfileId: managerProfile.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Manager tries to create a profile granting vaults.delete
    await expect(permissionProfileService.createProfile(orgId, managerId, 'Escalated', '', ['vaults.delete']))
      .rejects.toThrow('Cannot grant permission you do not have: vaults.delete');
  });

  it('suspension drops all access', async () => {
    const orgId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    const memberId = crypto.randomUUID();

    await db.organizations.add({
      id: orgId,
      adminUserId: adminId,
      name: 'Test Org',
      slug: 'test-org',
      provisioningMode: 'super_admin_provisioned',
      provisioningStatus: 'ready',
      status: 'active',
      planId: 'plan',
      billingState: 'manual',
      seatLimit: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUserId: adminId
    });

    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: adminId,
      role: 'organization_admin',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const profile = await permissionProfileService.createProfile(orgId, adminId, 'Viewer', '', ['vaults.view']);
    
    await db.organization_memberships.add({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: memberId,
      role: 'member',
      status: 'suspended',
      permissionProfileId: profile.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const res = await authorizationService.canPerform(memberId, 'vaults.view', {
      resourceType: 'organization',
      organizationId: orgId
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('membership_inactive');
  });
});
