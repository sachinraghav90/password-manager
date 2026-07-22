import { create } from 'zustand';
import { User } from '@vaultguard/models';
import { userService } from '../lib/db/services/userService';
import { authService } from '@vaultguard/auth';
import { sessionCryptoStore } from '@vaultguard/crypto';
import { useItemListStore } from './useItemListStore';
import { storage } from '@vaultguard/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean; // True when user session exists but memory keys are gone (e.g. reload)
  isLoading: boolean;
  
  login: (user: User) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
  unlock: (user: User) => void;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLocked: false,
  isLoading: true, // Start true for initial restore

  login: (user: User) => {
    storage.set('auth_user_id', user.id);
    set({ user, isAuthenticated: true, isLocked: false, isLoading: false });
    // Sync to Extension (Development)
    triggerDevSync(user);
  },

  unlock: (user: User) => {
    set({ user, isAuthenticated: true, isLocked: false, isLoading: false });
  },

  lock: () => {
    // Clear decrypted items securely from memory
    useItemListStore.getState()?.resetState?.();
    set({ isAuthenticated: false, isLocked: true });
  },

  logout: () => {
    storage.remove('auth_user_id');
    authService.logout();
    useItemListStore.getState()?.resetState?.();
    set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
  },

  restoreSession: async () => {
    // Check for seamless extension login passing
    const hash = window.location.hash;
    let userId = await storage.get('auth_user_id');

    if (hash && hash.includes('access_token=') && hash.includes('master_key=')) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const mkBase64 = params.get('master_key');
        
        // Let supabase process the token, then grab the session
        const { data } = await authService.supabase.auth.getSession();
        if (data.session && mkBase64) {
          userId = data.session.user.id;
          await storage.set('auth_user_id', userId);
          
          const binary = atob(mkBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const masterKey = await crypto.subtle.importKey(
            'raw',
            bytes,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          sessionCryptoStore.setMasterKey(masterKey);
          
          // Clear hash so it doesn't stay in URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.warn("Seamless login failed", err);
      }
    }

    if (!userId) {
      set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
      return;
    }

    try {
      const user = await userService.getProfile(userId);
      if (user) {
        // If we have a user but no keys in memory, the vault is locked.
        const hasKeys = sessionCryptoStore.hasMasterKey();
        if (!hasKeys) {
          useItemListStore.getState()?.resetState?.();
        }
        set({ 
          user, 
          isAuthenticated: hasKeys, 
          isLocked: !hasKeys, 
          isLoading: false 
        });

        // 5. Sync to Extension (Development)
        triggerDevSync(user);
      } else {
        storage.remove('auth_user_id');
        set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
      }
    } catch (e) {
      console.error("Failed to restore session", e);
      set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
    }
  }
}));

export async function triggerDevSync(user?: any) {
  try {
    const activeUser = user || useAuthStore.getState().user;
    if (!activeUser) return;
    const m = await import('@vaultguard/db-local');
    const vaults = await m.db.vaults.toArray();
    const logins = await m.db.pm_logins.toArray();
    const secure_notes = await m.db.pm_secure_notes.toArray();
    const credit_cards = await m.db.pm_credit_cards.toArray();
    const identities = await m.db.pm_identities.toArray();
    const item_index = await m.db.pm_item_index.toArray();
    
    console.log("Web App: Sending VG_DEV_SYNC", { user: activeUser, vaultsCount: vaults.length, loginsCount: logins.length });
    const send = () => window.postMessage({ 
      type: 'VG_DEV_SYNC', 
      user: activeUser, 
      vaults, 
      logins, 
      secure_notes, 
      credit_cards, 
      identities, 
      item_index 
    }, '*');
    
    send(); setTimeout(send, 500); setTimeout(send, 1500); setTimeout(send, 3000);
  } catch (e) {
    console.error("Web App sync error:", e);
  }
}
