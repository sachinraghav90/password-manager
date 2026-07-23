import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetPopupLogins, handleOpenLoginWebsite } from '../vaultHandler';
import { getAuthState } from '../authHandler';
import { vaultService } from '../vaultHandler';

// Mock dependencies
vi.mock('../authHandler', () => ({
  getAuthState: vi.fn(),
}));

// Override vaultService methods for testing without mocking the whole module
describe('vaultHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).activeUserId = undefined;
    (globalThis as any).chrome = {
      tabs: {
        create: vi.fn()
      }
    };
  });

  describe('handleGetPopupLogins', () => {
    it('rejects if vault is locked', async () => {
      vi.mocked(getAuthState).mockResolvedValue({ locked: true, state: 'authenticated_locked', accountId: null, email: null });
      const res = await handleGetPopupLogins('', undefined, undefined, 'req1');
      expect(res.success).toBe(false);
      if (!res.success) expect((res as any).error.code).toBe('VAULT_LOCKED');
    });

    it('returns filtered results without passwords', async () => {
      vi.mocked(getAuthState).mockResolvedValue({ locked: false, state: 'authenticated_unlocked', accountId: 'user1', email: 'test@example.com' });
      vaultService.getPopupLogins = vi.fn().mockResolvedValue([
        { itemId: '1', title: 'Test', username: 'user', website: 'test.com', vaultId: 'v1', favorite: false, matchScore: 10 }
      ]);
      
      const res = await handleGetPopupLogins('test', undefined, undefined, 'req1');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].password).toBeUndefined(); // no password in list
        expect(res.data[0].title).toBe('Test');
      }
    });
  });

  describe('handleOpenLoginWebsite', () => {
    it('blocks javascript: URLs', async () => {
      vi.mocked(getAuthState).mockResolvedValue({ locked: false, state: 'authenticated_unlocked', accountId: 'user1', email: 'test@example.com' });
      vaultService.getPopupLogins = vi.fn().mockResolvedValue([
        { itemId: '1', title: 'Test', username: 'user', website: 'javascript:alert(1)', vaultId: 'v1', favorite: false, matchScore: 10 }
      ]);

      const res = await handleOpenLoginWebsite('1', 'v1', true, 'req1');
      expect(res.success).toBe(false);
      if (!res.success) expect((res as any).error.message).toMatch(/Invalid URL protocol/);
    });

    it('opens valid https: URLs', async () => {
      vi.mocked(getAuthState).mockResolvedValue({ locked: false, state: 'authenticated_unlocked', accountId: 'user1', email: 'test@example.com' });
      vaultService.getPopupLogins = vi.fn().mockResolvedValue([
        { itemId: '1', title: 'Test', username: 'user', website: 'https://github.com', vaultId: 'v1', favorite: false, matchScore: 10 }
      ]);

      const res = await handleOpenLoginWebsite('1', 'v1', true, 'req1');
      expect(res.success).toBe(true);
      expect((globalThis as any).chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://github.com/', active: true });
    });
  });
});
