import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAuthState, handleLock, handleUnlock } from '../authHandler';
import { sessionCryptoStore } from '@vaultguard/crypto';
import { db } from '@vaultguard/db-local';

vi.mock('@vaultguard/db-local', () => ({
  db: {
    users: { toArray: vi.fn() },
    vaults: { toArray: vi.fn() },
  }
}));

const mockChromeRuntime = {
  sendMessage: vi.fn(() => Promise.resolve()),
};

(globalThis as any).chrome = {
  runtime: mockChromeRuntime,
  alarms: { clear: vi.fn() },
};

describe('authHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionCryptoStore.clearSensitiveMemory();
  });

  afterEach(() => {
    sessionCryptoStore.clearSensitiveMemory();
  });

  it('reports signed_out if no user exists', async () => {
    (db.users.toArray as any).mockResolvedValue([]);
    const state = await getAuthState();
    expect(state.state).toBe('signed_out');
    expect(state.locked).toBe(true);
  });

  it('reports authenticated_locked if user exists but memory is empty (simulating SW restart)', async () => {
    (db.users.toArray as any).mockResolvedValue([{ id: 'u1', email: 'test@example.com' }]);
    // We intentionally do not set master key in sessionCryptoStore
    const state = await getAuthState();
    expect(state.state).toBe('authenticated_locked');
    expect(state.locked).toBe(true);
  });

  it('reports authenticated_unlocked if user exists and memory has key', async () => {
    (db.users.toArray as any).mockResolvedValue([{ id: 'u1', email: 'test@example.com' }]);
    sessionCryptoStore.setMasterKey({} as CryptoKey); // Mock key
    const state = await getAuthState();
    expect(state.state).toBe('authenticated_unlocked');
    expect(state.locked).toBe(false);
  });

  it('broadcasts AUTH_STATE_CHANGED locked=true on lock', async () => {
    const res = await handleLock('req-1');
    expect(res.success).toBe(true);
    expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
      type: 'AUTH_STATE_CHANGED',
      locked: true,
    });
  });

  it('rejects unlock if no vault is synced', async () => {
    // Mock user but NO vault
    (db.users.toArray as any).mockResolvedValue([{ id: 'u1', masterKeySalt: 'salt' }]);
    (db.vaults.toArray as any).mockResolvedValue([]);
    
    vi.mock('@vaultguard/crypto', async (importOriginal) => {
      const actual: any = await importOriginal();
      return {
        ...actual,
        cryptoUtils: {
          deriveMasterKey: vi.fn().mockResolvedValue({}),
        }
      };
    });

    const { cryptoUtils } = await import('@vaultguard/crypto');
    (cryptoUtils.deriveMasterKey as any).mockResolvedValue({});

    const res = await handleUnlock('password123', 'req-2');
    expect(res.success).toBe(false);
    expect((res as any).error.code).toBe('ACCESS_DENIED');
  });

  it('broadcasts AUTH_STATE_CHANGED locked=false on successful unlock', async () => {
    // Mock user AND vault for successful unlock
    (db.users.toArray as any).mockResolvedValue([{ id: 'u1', masterKeySalt: 'salt' }]);
    (db.vaults.toArray as any).mockResolvedValue([{ 
      id: 'v1', 
      wrappedVaultKey: 'wrapped', 
      vaultKeyNonce: 'nonce' 
    }]);
    
    vi.mock('@vaultguard/crypto', async (importOriginal) => {
      const actual: any = await importOriginal();
      return {
        ...actual,
        cryptoUtils: {
          deriveMasterKey: vi.fn().mockResolvedValue({}),
          unwrapVaultKey: vi.fn().mockResolvedValue({}),
        }
      };
    });

    const { cryptoUtils } = await import('@vaultguard/crypto');
    (cryptoUtils.deriveMasterKey as any).mockResolvedValue({});
    (cryptoUtils.unwrapVaultKey as any).mockResolvedValue({});

    const res = await handleUnlock('password123', 'req-3');
    expect(res.success).toBe(true);
    expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
      type: 'AUTH_STATE_CHANGED',
      locked: false,
    });
  });
});
