import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFillLogin, generateOverrideToken } from '../autofillHandler';
import { getAuthState } from '../authHandler';
import { vaultService } from '../vaultHandler';

// Mock dependencies
vi.mock('../authHandler');
vi.mock('../vaultHandler');

const mockChromeTabs = {
  get: vi.fn(),
  sendMessage: vi.fn(),
};

(globalThis as any).chrome = {
  tabs: mockChromeTabs,
};

describe('autofillHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getAuthState as any).mockResolvedValue({ locked: false });
    
    mockChromeTabs.get.mockResolvedValue({ url: 'https://example.com/login' });
    mockChromeTabs.sendMessage.mockResolvedValue({ status: 'FILLED_USERNAME_AND_PASSWORD' });

    (vaultService.getMatchingLogins as any).mockResolvedValue([
      { itemId: 'item-1', matchScore: 100 }
    ]);
    (vaultService.getLoginCredentials as any).mockResolvedValue({
      username: 'testuser',
      password: 'testpassword'
    });
  });

  it('rejects if vault is locked', async () => {
    (getAuthState as any).mockResolvedValue({ locked: true });
    const res = await handleFillLogin('item-1', 1, 'req-1');
    expect(res.success).toBe(false);
    expect((res as any).error.code).toBe('VAULT_LOCKED');
  });

  it('rejects privileged origins', async () => {
    mockChromeTabs.get.mockResolvedValue({ url: 'chrome://settings' });
    const res = await handleFillLogin('item-1', 1, 'req-1');
    expect(res.success).toBe(false);
    expect((res as any).error.code).toBe('ACCESS_DENIED');
  });

  it('rejects if URL mismatch and no override token', async () => {
    (vaultService.getMatchingLogins as any).mockResolvedValue([]); // No match
    const res = await handleFillLogin('item-1', 1, 'req-1');
    expect(res.success).toBe(false);
    expect((res as any).error.code).toBe('ACCESS_DENIED');
  });

  it('accepts mismatch if valid override token provided', async () => {
    (vaultService.getMatchingLogins as any).mockResolvedValue([]); // No match
    const token = generateOverrideToken('item-1', 1, 'https://example.com', 0);
    const res = await handleFillLogin('item-1', 1, 'req-1', 0, token);
    expect(res.success).toBe(true);
    expect((res as any).data.status).toBe('FILLED_USERNAME_AND_PASSWORD');
  });

  it('rejects mismatch if override token is for different tab', async () => {
    (vaultService.getMatchingLogins as any).mockResolvedValue([]); // No match
    const token = generateOverrideToken('item-1', 2, 'https://example.com', 0);
    const res = await handleFillLogin('item-1', 1, 'req-1', 0, token);
    expect(res.success).toBe(false);
    expect((res as any).error.code).toBe('ACCESS_DENIED');
  });

  it('dispatches EXECUTE_FILL safely without leaking DOM attributes', async () => {
    const res = await handleFillLogin('item-1', 1, 'req-1');
    expect(res.success).toBe(true);
    expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(
      1,
      {
        type: 'EXECUTE_FILL',
        requestId: 'req-1',
        username: 'testuser',
        password: 'testpassword'
      },
      { frameId: 0 }
    );
  });
});
