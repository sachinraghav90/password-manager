import { createContext, useContext } from 'react';
import { User } from '@vaultguard/models';

export type AuthState = 'signed_out' | 'authenticated_locked' | 'authenticated_unlocked';

export interface AuthAdapter {
  authState: AuthState;
  user: User | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  
  login(email: string, accountPassword: string): Promise<void>;
  unlock(masterPassword: string): Promise<void>;
  lock(): Promise<void>;
  logout(): Promise<void>;
}

export const AuthAdapterContext = createContext<AuthAdapter | null>(null);

export const useAuthAdapter = () => {
  const ctx = useContext(AuthAdapterContext);
  if (!ctx) throw new Error('Missing AuthAdapter provider');
  return ctx;
};
