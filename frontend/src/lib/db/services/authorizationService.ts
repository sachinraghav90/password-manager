import { db } from '../client';
import { OrganizationPermission } from '../schema';
import { auditService } from './auditService';

export type AuthorizationResourceType =
  | 'organization'
  | 'membership'
  | 'permission_profile'
  | 'vault'
  | 'item'
  | 'attachment'
  | 'audit_event'
  | 'usage'
  | 'billing';

export interface AuthorizationResource {
  resourceType: AuthorizationResourceType;
  resourceId?: string;

  organizationId: string;
  vaultId?: string;
  itemId?: string;

  ownerUserId?: string | null;
  ownershipType?: 'personal' | 'organization';

  requiredShareGrantId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason:
    | 'allowed'
    | 'unauthenticated'
    | 'membership_missing'
    | 'membership_inactive'
    | 'organization_inactive'
    | 'permission_profile_missing'
    | 'permission_missing'
    | 'resource_not_found'
    | 'resource_outside_organization'
    | 'personal_resource_denied'
    | 'sharing_grant_missing'
    | 'cryptographic_access_missing'
    | 'platform_role_denied';
}

export class AuthorizationError extends Error {
  code: AuthorizationDecision['reason'];
  constructor(message: string, code: AuthorizationDecision['reason']) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

class AuthorizationService {
  /**
   * Internal cache for short-lived authorization decisions.
   * Key format: `${actorUserId}:${organizationId}:${permission}:${resourceType}:${resourceId || '*'}`
   */
  private cache = new Map<string, { decision: AuthorizationDecision; timestamp: number }>();
  private CACHE_TTL_MS = 5000; // 5 seconds for short-lived UI requests

  private getCacheKey(actorUserId: string, permission: OrganizationPermission, resource: AuthorizationResource): string {
    return `${actorUserId}:${resource.organizationId}:${permission}:${resource.resourceType}:${resource.resourceId || '*'}`;
  }

  clearCache() {
    this.cache.clear();
  }

  async canPerform(
    actorUserId: string,
    permission: OrganizationPermission,
    resource: AuthorizationResource
  ): Promise<AuthorizationDecision> {
    if (!actorUserId) return { allowed: false, reason: 'unauthenticated' };

    // Personal resources strictly denied in Org RBAC
    if (resource.ownershipType === 'personal') {
      return { allowed: false, reason: 'personal_resource_denied' };
    }

    const cacheKey = this.getCacheKey(actorUserId, permission, resource);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.decision;
    }

    const decision = await this.evaluateAccess(actorUserId, permission, resource);
    
    // Save to cache
    this.cache.set(cacheKey, { decision, timestamp: Date.now() });

    // Audit failed mutations (only if it's an action, skip pure views)
    if (!decision.allowed && !permission.endsWith('.view')) {
      await auditService.logEvent({
        organizationId: resource.organizationId,
        actorUserId: actorUserId,
        eventType: `authorization_denied_${permission.replace('.', '_')}`,
        targetType: resource.resourceType,
        targetId: resource.resourceId,
        metadata: { reason: decision.reason, permission }
      });
    }

    return decision;
  }

  private async evaluateAccess(
    actorUserId: string,
    permission: OrganizationPermission,
    resource: AuthorizationResource
  ): Promise<AuthorizationDecision> {
    // 1. Fetch organization
    const org = await db.organizations.get(resource.organizationId);
    if (!org) return { allowed: false, reason: 'resource_not_found' };
    if (org.status !== 'active' || org.provisioningStatus !== 'ready') {
      return { allowed: false, reason: 'organization_inactive' };
    }

    // 2. Fetch membership
    const membership = await db.organization_memberships.where({
      organizationId: resource.organizationId,
      userId: actorUserId
    }).first();
    if (!membership) return { allowed: false, reason: 'membership_missing' };
    if (membership.status !== 'active') return { allowed: false, reason: 'membership_inactive' };

    // 3. Organization Admin always has administrative permissions
    if (membership.role === 'organization_admin') {
      // Admin gets all permissions by default except for specific constraints (like cryptographic access later)
      // For now, any RBAC request by admin is allowed.
      return { allowed: true, reason: 'allowed' };
    }

    // 4. Fetch profile for member
    if (!membership.permissionProfileId) {
      return { allowed: false, reason: 'permission_profile_missing' };
    }

    const profile = await db.permission_profiles.get(membership.permissionProfileId);
    if (!profile) return { allowed: false, reason: 'permission_profile_missing' };

    // 5. Evaluate exact permission
    if (!profile.permissions.includes(permission)) {
      return { allowed: false, reason: 'permission_missing' };
    }

    // 6. Validate Resource (basic isolation check)
    // In a real app we'd load the vault/item and verify its organizationId matches
    if (resource.vaultId) {
      const vault = await db.vaults.get(resource.vaultId);
      if (!vault) return { allowed: false, reason: 'resource_not_found' };
      if (vault.ownershipType === 'personal') return { allowed: false, reason: 'personal_resource_denied' };
      if (vault.organizationId !== resource.organizationId) return { allowed: false, reason: 'resource_outside_organization' };
    }

    return { allowed: true, reason: 'allowed' };
  }

  async assertCanPerform(
    actorUserId: string,
    permission: OrganizationPermission,
    resource: AuthorizationResource
  ): Promise<void> {
    const decision = await this.canPerform(actorUserId, permission, resource);
    if (!decision.allowed) {
      throw new AuthorizationError(`Access Denied: ${decision.reason}`, decision.reason);
    }
  }

  async assertPlatformPermission(
    actorUserId: string,
    _platformPermission: string // e.g. 'platform.organizations.manage'
  ): Promise<void> {
    const roleAssignment = await db.platform_role_assignments.where({ userId: actorUserId }).first();
    if (!roleAssignment || roleAssignment.role !== 'super_admin' || roleAssignment.status !== 'active') {
      throw new AuthorizationError('Super Admin privileges required', 'platform_role_denied');
    }
  }

  async assertSuperAdmin(userId: string): Promise<void> {
    const assignment = await db.platform_role_assignments
      .where({ userId })
      .filter(a => a.role === 'super_admin' && a.status === 'active')
      .first();

    if (!assignment) {
      throw new AuthorizationError('Super Admin access required', 'platform_role_denied');
    }
  }
}

export const authorizationService = new AuthorizationService();
