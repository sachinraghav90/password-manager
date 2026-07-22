import { createContext, useContext } from 'react';
import { Settings } from '@vaultguard/models';

export interface SettingsAdapter {
  settings: Settings | null;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
}

export const SettingsAdapterContext = createContext<SettingsAdapter | null>(null);

export const useSettingsAdapter = () => {
  const ctx = useContext(SettingsAdapterContext);
  if (!ctx) throw new Error('Missing SettingsAdapter provider');
  return ctx;
};
