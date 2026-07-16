import { useAccountStore } from '../../../store/useAccountStore';
import { membershipService } from './membershipService';
import { platformRoleService } from './platformRoleService';

export const accountContextService = {
  /**
   * Asserts that the current request is operating within a Personal context.
   */
  assertPersonalMode(): void {
    const { mode } = useAccountStore.getState();
    if (mode !== 'personal') {
      throw new Error('Unauthorized: This action requires Personal context');
    }
  },

  /**
   * Asserts that the current request is operating within a specific Organization context.
   * Also re-validates the membership against the DB.
   */
  async assertOrganizationMode(userId: string, targetOrganizationId: string): Promise<void> {
    const { mode, activeOrganizationId } = useAccountStore.getState();
    if (mode !== 'organization' || activeOrganizationId !== targetOrganizationId) {
      throw new Error('Unauthorized: This action requires the correct Organization context');
    }

    // Double check active membership
    await membershipService.assertActiveMembership(userId, targetOrganizationId);
  },
  
  /**
   * Evaluates if the current context has Super Admin privileges.
   */
  async assertSuperAdminContext(userId: string): Promise<void> {
    await platformRoleService.assertSuperAdmin(userId);
  }
};
