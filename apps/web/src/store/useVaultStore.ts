import { create } from 'zustand';
import { Vault } from '@vaultguard/models';
import { vaultService } from '../lib/db/services/vaultService';
import { useAuthStore } from './useAuthStore';

interface CreateVaultInput {
  name: string;
  description?: string;
  organizationId?: string;
}

export interface VaultState {
  vaults: Vault[];
  activeVaultId: string | null;
  isLoading: boolean;
  error: string | null;

  loadVaults: () => Promise<void>;
  createVault: (input: CreateVaultInput) => Promise<Vault>;
  setActiveVault: (vaultId: string | null) => void;
  renameVault: (vaultId: string, name: string) => Promise<void>;
  deleteVault: (vaultId: string) => Promise<void>;
  resetState: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  vaults: [],
  activeVaultId: null,
  isLoading: false,
  error: null,

  loadVaults: async () => {
    try {
      set({ isLoading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not authenticated');

      const userVaults = await vaultService.getUserVaults(user.id);
      
      // Unwrap keys and store them in the session crypto store
      try {
        const { sessionCryptoStore, cryptoUtils } = await import('@vaultguard/crypto');
        if (sessionCryptoStore.hasMasterKey()) {
          const masterKey = sessionCryptoStore.getMasterKey();
          for (const vault of userVaults) {
            try {
              if (vault.wrappedVaultKey && vault.vaultKeyNonce) {
                const vaultKey = await cryptoUtils.unwrapVaultKey(
                  vault.wrappedVaultKey, 
                  vault.vaultKeyNonce, 
                  masterKey
                );
                sessionCryptoStore.setVaultKey(vault.id, vaultKey);
              }
            } catch (err) {
              console.error(`Failed to unwrap key for vault ${vault.id}`, err);
            }
          }
        }
      } catch (e) {
        console.error("Error unwrapping vault keys:", e);
      }

      set({ vaults: userVaults });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load vaults' });
    } finally {
      set({ isLoading: false });
    }
  },

  createVault: async (input: CreateVaultInput) => {
    try {
      set({ isLoading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not authenticated');

      const newVault = await vaultService.createVault(
        user.id,
        input.name,
        input.description,
        input.organizationId
      );

      set((state) => ({ 
        vaults: [...state.vaults, newVault],
        activeVaultId: newVault.id 
      }));
      return newVault;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create vault' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveVault: (vaultId: string | null) => {
    set({ activeVaultId: vaultId });
  },

  renameVault: async (vaultId: string, name: string) => {
    console.log(vaultId, name);
  },

  deleteVault: async (vaultId: string) => {
    console.log(vaultId);
  },

  resetState: () => {
    set({
      vaults: [],
      activeVaultId: null,
      isLoading: false,
      error: null
    });
  }
}));
