import { ReactNode, useState, useEffect } from 'react';
import {
  AuthAdapterContext,
  VaultAdapterContext,
  SettingsAdapterContext,
  AccountAdapterContext,
  ItemListAdapterContext
} from '@vaultguard/ui';
import { sendToBackground } from '../messaging/client';

export function ExtensionUIProvider({ children }: { children: ReactNode }) {
  // A simple implementation of the AuthAdapter backed by IPC
  const [authState, setAuthState] = useState<{
    state: 'signed_out' | 'authenticated_locked' | 'authenticated_unlocked';
    user: any | null;
    isLoading: boolean;
    isSuperAdmin: boolean;
  }>({
    state: 'signed_out',
    user: null,
    isLoading: true,
    isSuperAdmin: false
  });

  useEffect(() => {
    sendToBackground({ type: 'GET_AUTH_STATE' }).then((res: any) => {
      if (res.success) {
        setAuthState(s => ({
          ...s,
          state: res.data.state,
          user: res.data.email ? { email: res.data.email, fullName: res.data.email } : null,
          isLoading: false
        }));
      }
    });
    
    const listener = (msg: any) => {
      if (msg.type === 'AUTH_STATE_CHANGED') {
         sendToBackground({ type: 'GET_AUTH_STATE' }).then((res: any) => {
           if (res.success) {
             setAuthState(s => ({
               ...s,
               state: res.data.state,
               user: res.data.email ? { email: res.data.email, fullName: res.data.email } : null,
             }));
           }
         });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const authAdapter = {
    authState: authState.state,
    user: authState.user,
    isLoading: authState.isLoading,
    isSuperAdmin: authState.isSuperAdmin,
    login: async (email: string, accountPassword: string) => {
      const res = await sendToBackground({ type: 'LOGIN', email, masterPassword: accountPassword } as any);
      if (!res.success) throw new Error((res as any).error?.message || 'Login failed');
    },
    logout: async () => {
      const res = await sendToBackground({ type: 'LOGOUT' } as any);
      if (res && res.success) {
        setAuthState(s => ({ ...s, state: 'signed_out', user: null }));
      }
    },
    unlock: async (masterPassword: string) => {
      const res = await sendToBackground({ type: 'UNLOCK', masterPassword } as any);
      if (!res.success) throw new Error((res as any).error?.message || 'Unlock failed');
    },
    lock: async () => {
      await sendToBackground({ type: 'LOCK' });
    }
  };

  // Dummy adapters for the rest, since the popup will mostly just show Locked/Unlocked views,
  // or a limited vault list. We can expand these as needed via IPC.
  const accountAdapter = {
    mode: 'personal' as const,
    activeOrganizationId: null,
    membershipRole: null,
    orgs: [],
    hasPersonal: true,
    switchToPersonal: () => {},
    switchToOrganization: async () => {},
    clearContext: () => {}
  };

  const settingsAdapter = {
    settings: null,
    theme: 'light' as const,
    setTheme: () => {},
    updateSettings: async () => {}
  };

  const vaultAdapter = {
    vaults: [],
    items: [],
    isLoading: false,
    loadVaults: async () => {},
    createVault: async () => ({} as any),
    updateVault: async () => {},
    deleteVault: async () => {},
    loadItems: async () => {},
    createItem: async () => ({} as any),
    updateItem: async () => {},
    deleteItem: async () => {},
    getSharingPolicy: async () => ({ allowSharing: false }),
    searchOrgUsers: async () => [],
    getUserTeams: async () => []
  };

  const itemListAdapter = {
    entries: [],
    deepSearchMatchedIds: new Set<string>(),
    isLoading: false,
    isDeepSearching: false,
    error: null,
    searchQuery: '',
    debouncedSearchQuery: '',
    sortOption: 'title' as const,
    filterVaultId: null,
    filterItemType: null,
    filterFavorites: false,
    filterRecents: false,
    filterHasAttachments: false,
    setSearchQuery: () => {},
    setSortOption: () => {},
    setFilters: () => {},
    clearFilters: () => {},
    loadItems: async () => {},
    resetState: () => {},
    getRecentItems: async () => [],
    getItemDetails: async () => null,
    updateItem: async () => null,
    deleteItem: async () => {},
    toggleFavorite: async () => {}
  };

  return (
    <AuthAdapterContext.Provider value={authAdapter as any}>
      <AccountAdapterContext.Provider value={accountAdapter as any}>
        <SettingsAdapterContext.Provider value={settingsAdapter as any}>
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
