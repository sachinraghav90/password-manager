import { db } from '@vaultguard/db-local';

export const userService = {
  async getProfile(userId: string) {
    return await db.users.get(userId);
  },
  
  async getSettings(userId: string) {
    return await db.settings.get(userId);
  },

  async updateSettings(userId: string, updates: Partial<{ theme: 'light' | 'dark' | 'system', autoLockTime: number }>) {
    await db.settings.update(userId, updates);
    return await db.settings.get(userId);
  }
};
