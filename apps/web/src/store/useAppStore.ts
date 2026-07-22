import { create } from 'zustand';
import { userService } from '../lib/db/services/userService';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme, userId?: string) => Promise<void>;
  loadSettings: (userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',

  setTheme: async (theme: Theme, userId?: string) => {
    set({ theme });
    
    // Apply theme immediately
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
    if (isDark) {
      root.classList.add('dark');
    }

    // Persist to DB if user is logged in
    if (userId) {
      await userService.updateSettings(userId, { theme });
    } else {
      localStorage.setItem('local_theme_pref', theme);
    }
  },

  loadSettings: async (userId: string) => {
    try {
      const settings = await userService.getSettings(userId);
      if (settings) {
        get().setTheme(settings.theme);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }
}));
