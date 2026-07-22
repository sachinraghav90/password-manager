import { create } from 'zustand';
import { useItemListStore } from './useItemListStore';
import { membershipService } from '../lib/db/services/membershipService';
import { OrganizationMembershipRole } from '@vaultguard/models';
import { useVaultStore } from './useVaultStore';
import { useAuthStore } from './useAuthStore';

export interface AccountContextState {
  mode: 'personal' | 'organization';
  activeOrganizationId: string | null;
  membershipRole: OrganizationMembershipRole | null;
  
  switchToPersonal: () => void;
  switchToOrganization: (userId: string, organizationId: string) => Promise<void>;
  clearContext: () => void;
}

export const useAccountStore = create<AccountContextState>((set) => ({
  mode: 'personal',
  activeOrganizationId: null,
  membershipRole: null,

  switchToPersonal: () => {
    const user = useAuthStore.getState().user;
    if (user?.accountType === 'managed') {
      console.warn('Managed users cannot switch to a personal context.');
      return;
    }

    // Clear decrypted UI state
    useItemListStore.getState()?.resetState?.();
    useVaultStore.getState()?.resetState?.();

    set({
      mode: 'personal',
      activeOrganizationId: null,
      membershipRole: null
    });
  },

  switchToOrganization: async (userId: string, organizationId: string) => {
    const current = useAccountStore.getState();

    // If we're already in this org context, do nothing — avoids wiping vault/item state on re-renders
    if (current.mode === 'organization' && current.activeOrganizationId === organizationId) {
      return;
    }

    // Validate active membership before switching
    const membership = await membershipService.assertActiveMembership(userId, organizationId);
    
    // Clear decrypted UI state to avoid leaks when ACTUALLY switching context
    useItemListStore.getState()?.resetState?.();
    useVaultStore.getState()?.resetState?.();

    set({
      mode: 'organization',
      activeOrganizationId: organizationId,
      membershipRole: membership.role
    });

    // Re-load vaults for the new org context
    await useVaultStore.getState().loadVaults();
  },

  clearContext: () => {
    useItemListStore.getState()?.resetState?.();
    useVaultStore.getState()?.resetState?.();
    set({
      mode: 'personal',
      activeOrganizationId: null,
      membershipRole: null
    });
  }
}));
