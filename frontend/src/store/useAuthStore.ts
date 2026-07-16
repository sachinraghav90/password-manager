import { create } from 'zustand';
import { User } from '../lib/db/schema';
import { userService } from '../lib/db/services/userService';
import { authService } from '../lib/db/services/authService';
import { sessionCryptoStore } from '../lib/crypto/cryptoService';
import { useItemListStore } from './useItemListStore';

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
    localStorage.setItem('auth_user_id', user.id);
    set({ user, isAuthenticated: true, isLocked: false, isLoading: false });
  },

  unlock: (user: User) => {
    set({ user, isAuthenticated: true, isLocked: false, isLoading: false });
  },

  lock: () => {
    // Clear decrypted items securely from memory
    useItemListStore.getState().clear();
    set({ isAuthenticated: false, isLocked: true });
  },

  logout: () => {
    localStorage.removeItem('auth_user_id');
    authService.logout();
    useItemListStore.getState().clear();
    set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
  },

  restoreSession: async () => {
    const userId = localStorage.getItem('auth_user_id');
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
          useItemListStore.getState().clear();
        }
        set({ 
          user, 
          isAuthenticated: hasKeys, 
          isLocked: !hasKeys, 
          isLoading: false 
        });
      } else {
        localStorage.removeItem('auth_user_id');
        set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
      }
    } catch (e) {
      console.error("Failed to restore session", e);
      set({ user: null, isAuthenticated: false, isLocked: false, isLoading: false });
    }
  }
}));
