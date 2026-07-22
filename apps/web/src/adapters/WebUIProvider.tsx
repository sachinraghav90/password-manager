import { ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import {
  AuthAdapterContext,
  VaultAdapterContext,
  SettingsAdapterContext,
  AccountAdapterContext,
  ItemListAdapterContext
} from '@vaultguard/ui';

import { useAuthStore } from '../store/useAuthStore';
import { useVaultStore } from '../store/useVaultStore';
import { useAppStore } from '../store/useAppStore';
import { useAccountStore } from '../store/useAccountStore';
import { useItemListStore } from '../store/useItemListStore';
import { db } from '@vaultguard/db-local';
import { sharingPolicyService } from '../lib/db/services/sharingPolicyService';
import { authService } from '@vaultguard/auth';

export function WebUIProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();
  const vaultStore = useVaultStore();
  const appStore = useAppStore();
  const accountStore = useAccountStore();
  const itemListStore = useItemListStore();

  const [userOrgs, setUserOrgs] = useState<Array<{ id: string, name: string, role: string }>>([]);

  useEffect(() => {
    if (!authStore.user) {
      setUserOrgs([]);
      return;
    }
    
    // We can fetch from local DB, but realistically in the web app, 
    // the user's memberships should dictate this.
    // For now, let's query the local DB for memberships:
    const loadOrgs = async () => {
      try {
        const memberships = await db.organization_memberships.where('userId').equals(authStore.user!.id).toArray();
        const results = [];
        for (const m of memberships) {
          const org = await db.organizations.get(m.organizationId);
          if (org) {
            results.push({ id: org.id, name: org.name, role: m.role });
          }
        }
        setUserOrgs(results);
      } catch (err) {
        console.error("Failed to load user orgs", err);
      }
    };
    
    loadOrgs();
  }, [authStore.user]);

  const accountAdapter = useMemo(() => ({
    ...accountStore,
    orgs: userOrgs,
    hasPersonal: authStore.user?.accountType !== 'managed'
  }), [accountStore, userOrgs, authStore.user?.accountType]);

  // We map the Zustand stores directly to the adapter interfaces.
  // In a more complex scenario, we would implement facade classes, but here
  // the stores have exactly the methods needed since we extracted them from these stores.

  const vaultAdapter = useMemo(() => ({
    ...vaultStore,
    getSharingPolicy: async (orgId: string, vaultId: string, itemId?: string) => {
      return itemId 
        ? await sharingPolicyService.getEffectiveItemPolicy(orgId, vaultId, itemId)
        : await sharingPolicyService.getEffectiveVaultPolicy(orgId, vaultId);
    },
    searchOrgUsers: async (orgId: string, query: string) => {
      const memberships = await db.organization_memberships.where('organizationId').equals(orgId).toArray();
      const userIds = memberships.map((m: any) => m.userId);
      const results = [];
      for (const uid of userIds) {
        const u = await db.users.get(uid);
        if (u && (u.email.toLowerCase().includes(query.toLowerCase()) || u.fullName.toLowerCase().includes(query.toLowerCase()))) {
          results.push(u);
        }
      }
      return results;
    },
    getUserTeams: async (orgId: string, userId: string) => {
      const userMembership = await db.organization_memberships.where('[organizationId+userId]').equals([orgId, userId]).first();
      if (!userMembership) return [];
      const teamMemberships = await db.organization_team_memberships.where('membershipId').equals(userMembership.id).toArray();
      const teams = [];
      for (const tm of teamMemberships) {
        const t = await db.organization_teams.get(tm.teamId);
        if (t) teams.push(t);
      }
      return teams;
    }
  }), [vaultStore]);

  let authState: 'signed_out' | 'authenticated_locked' | 'authenticated_unlocked' = 'signed_out';
  if (authStore.isAuthenticated) {
    authState = authStore.isLocked ? 'authenticated_locked' : 'authenticated_unlocked';
  }

  const authAdapter = useMemo(() => ({
    ...authStore,
    authState,
    isSuperAdmin: false, // Handled in layout or specific hook if needed
    login: async (email: string, accountPassword: string) => {
      // NOTE: In the web app, authService.login currently fetches profile and derives keys.
      // This will need to be refactored eventually, but for now we just pass it through.
      const user = await authService.login(email, accountPassword, (import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.VITE_SUPABASE_ANON_KEY);
      authStore.login(user);
    },
    unlock: async (masterPassword: string) => {
      if (!authStore.user) throw new Error("Not logged in");
      const unlockedUser = await authService.login(authStore.user.email, masterPassword, (import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.VITE_SUPABASE_ANON_KEY);
      authStore.unlock(unlockedUser);
    },
    lock: async () => {
      authStore.lock();
    },
    logout: async () => {
      authStore.logout();
    }
  }), [authStore, authState]);

  const loadItems = useCallback(async (_userId: string, orgId: string | null) => {
    await useItemListStore.getState().loadEntries(userId, orgId || undefined);

    // One-time migration: push existing local items to Supabase so the extension can sync them
    const { vaultItemService } = await import('../lib/db/services/vaultItemService');
    const { db } = await import('@vaultguard/db-local');
    const vaults = orgId
      ? await db.vaults.where('organizationId').equals(orgId).toArray()
      : await db.vaults.where('ownerUserId').equals(userId).toArray();
    for (const vault of vaults) {
      await vaultItemService.pushAllToSupabase(userId, vault.id);
    }
  }, []);

  const getRecentItems = useCallback(async (userId: string, limit: number) => {
    return useItemListStore.getState().entries.filter(i => i.lastAccessedAt).sort((a,b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0)).slice(0, limit);
  }, []);

  const getItemDetails = useCallback(async (userId: string, vaultId: string, itemId: string, itemType: string) => {
    const { vaultItemService } = await import('../lib/db/services/vaultItemService');
    return await vaultItemService.getItemDetails(userId, vaultId, itemId, itemType as any);
  }, []);

  const updateItem = useCallback(async (userId: string, vaultId: string, itemId: string, itemType: string, form: any) => {
    const { vaultItemService } = await import('../lib/db/services/vaultItemService');
    return await vaultItemService.updateItem(userId, vaultId, itemId, itemType as any, form);
  }, []);

  const deleteItem = useCallback(async (userId: string, vaultId: string, itemId: string, itemType: string) => {
    const { vaultItemService } = await import('../lib/db/services/vaultItemService');
    return await vaultItemService.deleteItem(userId, vaultId, itemId, itemType as any);
  }, []);

  const toggleFavorite = useCallback(async (userId: string, vaultId: string, itemId: string, itemType: string, isFav: boolean) => {
    const { vaultItemService } = await import('../lib/db/services/vaultItemService');
    return await vaultItemService.toggleFavorite(userId, vaultId, itemId, itemType as any, isFav);
  }, []);

  const itemListAdapter = useMemo(() => ({
    ...itemListStore,
    loadItems,
    getRecentItems,
    getItemDetails,
    updateItem,
    deleteItem,
    toggleFavorite
  }), [itemListStore, loadItems, getRecentItems, getItemDetails, updateItem, deleteItem, toggleFavorite]);

  return (
    <AuthAdapterContext.Provider value={authAdapter as any}>
      <AccountAdapterContext.Provider value={accountAdapter as any}>
        <SettingsAdapterContext.Provider value={appStore as any}>
          <VaultAdapterContext.Provider value={vaultAdapter as any}>
            <ItemListAdapterContext.Provider value={itemListAdapter as any}>
              {children}
            </ItemListAdapterContext.Provider>
          </VaultAdapterContext.Provider>
        </SettingsAdapterContext.Provider>
      </AccountAdapterContext.Provider>
    </AuthAdapterContext.Provider>
  );
}

