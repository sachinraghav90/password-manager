import { db } from '@vaultguard/db-local';
import { PlatformRole, PlatformRoleAssignment } from '@vaultguard/models';

export const platformRoleService = {
  /**
   * Retrieves the platform role assignment for a given user.
   */
  async getRoleAssignment(userId: string): Promise<PlatformRoleAssignment | undefined> {
    return await db.platform_role_assignments
      .where('userId')
      .equals(userId)
      .first();
  },

  /**
   * Evaluates if a user is currently a super_admin.
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const assignment = await this.getRoleAssignment(userId);
    return assignment?.role === 'super_admin' && assignment?.status === 'active';
  },

  /**
   * Throws an error if the user is not a super_admin.
   */
  async assertSuperAdmin(userId: string): Promise<void> {
    const isSA = await this.isSuperAdmin(userId);
    if (!isSA) {
      throw new Error('Unauthorized: Super Admin access required');
    }
  },

  /**
   * NOTE: This should only be used by migration scripts or secure backend endpoints.
   * Modifying roles from the UI locally is purely for architecture demonstration.
   */
  async assignRole(userId: string, role: PlatformRole, assignedBy?: string): Promise<PlatformRoleAssignment> {
    // If an assignment exists, update it. Otherwise create it.
    let assignment = await this.getRoleAssignment(userId);
    
    if (assignment) {
      assignment.role = role;
      assignment.status = 'active';
      await db.platform_role_assignments.put(assignment);
    } else {
      assignment = {
        id: crypto.randomUUID(),
        userId,
        role,
        status: 'active',
        assignedAt: Date.now(),
        assignedBy
      };
      await db.platform_role_assignments.add(assignment);
    }
    
    return assignment;
  }
};
