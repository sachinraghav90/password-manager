import { createContext, useContext } from 'react';
import { OrganizationMembershipRole } from '@vaultguard/models';

export interface AccountAdapter {
  mode: 'personal' | 'organization';
  activeOrganizationId: string | null;
  membershipRole: OrganizationMembershipRole | null;
  
  orgs: Array<{ id: string, name: string, role: string }>;
  hasPersonal: boolean;
  
  switchToPersonal: () => void;
  switchToOrganization: (userId: string, organizationId: string) => Promise<void>;
  clearContext: () => void;
}

export const AccountAdapterContext = createContext<AccountAdapter | null>(null);

export const useAccountAdapter = () => {
  const ctx = useContext(AccountAdapterContext);
  if (!ctx) throw new Error('Missing AccountAdapter provider');
  return ctx;
};
