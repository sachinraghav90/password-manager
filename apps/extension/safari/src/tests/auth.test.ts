import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleLock, handleUnlock, getAuthState } from '../background/handlers/authHandler';
import { db } from '@vaultguard/db-local';
import { sessionCryptoStore } from '@vaultguard/crypto';
import { resetAutoLockTimer } from '../background/autoLock';

// Mock the platform and chrome APIs
vi.mock('../platform', () => ({
  platform: {
    storage: {
      get: vi.fn().mockResolvedValue({ autoLockTimeout: 15 }),
      set: vi.fn(),
      remove: vi.fn(),
    },
    runtime: {
      id: 'test-extension-id'
    }
  },
}));

vi.mock('../background/autoLock', () => ({
  resetAutoLockTimer: vi.fn().mockResolvedValue(undefined),
  AUTO_LOCK_TIMEOUTS: {
    IMMEDIATELY: 0,
    FIFTEEN_MIN: 15,
    NEVER: -1
  }
}));

// Mock global chrome
(globalThis as any).chrome = {
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  }
};

describe('Authentication & Session Locking', () => {
  beforeEach(async () => {
    // Clear mocks and memory
    vi.clearAllMocks();
    sessionCryptoStore.clearSensitiveMemory();
    await db.users.clear();
    await db.vaults.clear();
  });

  it('State is signed_out when no user exists in DB', async () => {
    const authState = await getAuthState();
    expect(authState.state).toBe('signed_out');
    expect(authState.locked).toBe(true);
  });

  it('State is authenticated_locked on SW restart (user exists, but memory cleared)', async () => {
    // Add user to DB
    await db.users.add({
      id: 'user-123',
      fullName: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      passwordHash: 'dummy',
      masterKeySalt: 'fake-salt',
      encryptionVersion: 'v1',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Ensure session store is empty (like a SW restart)
    expect(sessionCryptoStore.hasMasterKey()).toBe(false);

    const authState = await getAuthState();
    expect(authState.state).toBe('authenticated_locked');
    expect(authState.locked).toBe(true);
  });

  it('Unlock fails with wrong password (cannot unwrap vault key)', async () => {
    await db.users.add({
      id: 'user-123',
      fullName: 'Test',
      email: 'test@example.com',
      emailVerified: true,
      passwordHash: 'dummy',
      masterKeySalt: 'ZmFrZS1zYWx0', // "fake-salt" in base64
      encryptionVersion: 'v1',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await db.vaults.add({
      id: 'vault-123',
      name: 'Primary',
      description: '',
      createdBy: 'user-123',
      ownershipType: 'personal',
      ownerUserId: 'user-123',
      organizationId: null,
      wrappedVaultKey: 'YmFkLWRhdGE=',
      vaultKeyNonce: 'YmFkLW5vbmNl',
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as any);

    const res = await handleUnlock('wrongpassword', 'req-1');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect((res as any).error.code).toBe('ACCESS_DENIED');
      expect((res as any).error.message).toBe('Incorrect master password');
    }

    // State remains locked
    const authState = await getAuthState();
    expect(authState.state).toBe('authenticated_locked');
    expect(sessionCryptoStore.hasMasterKey()).toBe(false);
  });

  it('Manual lock wipes memory and clears auto-lock alarm', async () => {
    // Simulate being unlocked first
    sessionCryptoStore.setMasterKey({} as CryptoKey);
    sessionCryptoStore.setVaultKey('v1', {} as CryptoKey);

    expect(sessionCryptoStore.hasMasterKey()).toBe(true);

    const res = await handleLock('req-2');
    expect(res.success).toBe(true);

    // Verify memory wiped
    expect(sessionCryptoStore.hasMasterKey()).toBe(false);
    expect(() => sessionCryptoStore.getVaultKey('v1')).toThrow();

    // Verify alarm cleared
    expect((globalThis as any).chrome.alarms.clear).toHaveBeenCalledWith('vaultguard-auto-lock');
  });

  it('Activity resets auto-lock timer', async () => {
    // When unlock is successful, it should call resetAutoLockTimer
    await db.users.add({
      id: 'user-123',
      fullName: 'Test',
      email: 'test@example.com',
      emailVerified: true,
      passwordHash: 'dummy',
      masterKeySalt: 'ZmFrZS1zYWx0', // "fake-salt" in base64
      encryptionVersion: 'v1',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Without a vault, it acts as a development fallback and just accepts the key for now
    const res = await handleUnlock('password', 'req-3');
    expect(res.success).toBe(true);
    expect(resetAutoLockTimer).toHaveBeenCalled();
  });
});
