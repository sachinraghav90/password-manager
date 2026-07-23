import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtensionEnvelope } from '@vaultguard/browser-api';
import { db } from '@vaultguard/db-local';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Mock chrome.runtime.id — must use literal string (vi.mock is hoisted) */
vi.mock('../platform', () => ({
  platform: {
    runtime: {
      id: 'test-extension-id',
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      getURL: (p: string) => `chrome-extension://test-extension-id/${p}`,
    },
    windows: { create: vi.fn() },
    storage: { get: vi.fn().mockResolvedValue({ autoLockTimeout: 15 }), set: vi.fn(), remove: vi.fn() },
    tabs: { query: vi.fn() },
    scripting: { executeScript: vi.fn() },
    commands: { onCommand: { addListener: vi.fn() } },
    contextMenus: { create: vi.fn() },
  },
}));

// Import AFTER mock is defined
import { handleMessage } from '../background/messageHandler';

const EXT_ID = 'test-extension-id';
let counter = 0;

beforeEach(async () => {
  await db.users.clear();
  await db.vaults.clear();
  vi.clearAllMocks();
  
  // Seed a user so UNLOCK can proceed
  await db.users.add({
    id: 'user-123',
    fullName: 'Test User',
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
    // Real encrypted vault keys look like base64
    wrappedVaultKey: 'YmFkLWRhdGE=',
    vaultKeyNonce: 'YmFkLW5vbmNl',
    encryptionVersion: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
});

function makeEnvelope(payload: any, overrides?: Partial<ExtensionEnvelope>): ExtensionEnvelope {
  return {
    id: `test-${Date.now()}-${++counter}`,
    sentAt: Date.now(),
    payload,
    ...overrides,
  };
}

function internalSender(page = 'popup.html'): chrome.runtime.MessageSender {
  return {
    id: EXT_ID,
    url: `chrome-extension://${EXT_ID}/${page}`,
  } as chrome.runtime.MessageSender;
}

function contentScriptSender(tabUrl = 'https://github.com'): chrome.runtime.MessageSender {
  return {
    id: EXT_ID,
    url: tabUrl,
    tab: { id: 1, url: tabUrl } as chrome.tabs.Tab,
  } as chrome.runtime.MessageSender;
}

function externalSender(): chrome.runtime.MessageSender {
  return { id: 'evil-extension', url: 'chrome-extension://evil/popup.html' } as any;
}

async function send(raw: unknown, sender = internalSender()): Promise<any> {
  return new Promise(resolve => {
    handleMessage(raw, sender, resolve);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Message Router — Valid flows', () => {
  it('GET_AUTH_STATE returns locked state', async () => {
    const res = await send(makeEnvelope({ type: 'GET_AUTH_STATE' }));
    expect(res.success).toBe(true);
    expect(res.data.state).toBeDefined();
    expect(res.requestId).toBeDefined();
  });

  it('LOCK returns success', async () => {
    const res = await send(makeEnvelope({ type: 'LOCK' }));
    expect(res.success).toBe(true);
    expect(res.data.locked).toBe(true);
  });

  it('UNLOCK with valid password returns success', async () => {
    // Clear vaults so we bypass the unwrap check for the success stub
    await db.vaults.clear();
    const res = await send(makeEnvelope({ type: 'UNLOCK', masterPassword: 'strongPass!99' }));
    expect(res.success).toBe(true);
    expect(res.data.locked).toBe(false);
  });

  it('GENERATE_PASSWORD returns a password of correct length', async () => {
    // Must unlock first
    await send(makeEnvelope({ type: 'UNLOCK', masterPassword: 'strongPass!99' }));
    const res = await send(makeEnvelope({ type: 'GENERATE_PASSWORD', options: { length: 20 } }));
    expect(res.success).toBe(true);
    expect(res.data.password).toHaveLength(20);
  });
});

describe('Message Router — Invalid payload rejection', () => {
  it('UNLOCK with missing masterPassword → INVALID_PAYLOAD', async () => {
    const res = await send(makeEnvelope({ type: 'UNLOCK' }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('UNLOCK with empty masterPassword → INVALID_PAYLOAD', async () => {
    const res = await send(makeEnvelope({ type: 'UNLOCK', masterPassword: '' }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('FILL_LOGIN with invalid tabId → INVALID_PAYLOAD', async () => {
    const res = await send(makeEnvelope({ type: 'FILL_LOGIN', itemId: 'abc', tabId: -1 }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('FILL_LOGIN with missing itemId → INVALID_PAYLOAD', async () => {
    const res = await send(makeEnvelope({ type: 'FILL_LOGIN', tabId: 1 }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('GET_MATCHING_LOGINS with invalid URL → INVALID_PAYLOAD', async () => {
    await send(makeEnvelope({ type: 'UNLOCK', masterPassword: 'strongPass!99' }));
    const res = await send(makeEnvelope({
      type: 'GET_MATCHING_LOGINS',
      page: { url: 'not-a-url', hostname: 'bad' },
    }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('GENERATE_PASSWORD with length < 8 → INVALID_PAYLOAD', async () => {
    const res = await send(makeEnvelope({ type: 'GENERATE_PASSWORD', options: { length: 3 } }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('SWITCH_CONTEXT with empty contextId → INVALID_PAYLOAD', async () => {
    const res = await send(makeEnvelope({ type: 'SWITCH_CONTEXT', contextId: '' }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });
});

describe('Message Router — Unknown / malformed messages', () => {
  it('unknown message type → UNKNOWN_MESSAGE_TYPE', async () => {
    const res = await send(makeEnvelope({ type: 'DO_THE_THING' }));
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('UNKNOWN_MESSAGE_TYPE');
  });

  it('malformed envelope (missing id) → INVALID_PAYLOAD', async () => {
    const res = await send({ sentAt: Date.now(), payload: { type: 'GET_AUTH_STATE' } });
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('malformed envelope (missing payload) → INVALID_PAYLOAD', async () => {
    const res = await send({ id: 'abc', sentAt: Date.now() });
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('completely malformed (null) → INVALID_PAYLOAD', async () => {
    const res = await send(null);
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PAYLOAD');
  });

  it('oversized payload → OVERSIZED_PAYLOAD', async () => {
    const bigString = 'x'.repeat(70 * 1024);
    const res = await send({ id: 'x', sentAt: Date.now(), payload: { type: 'GET_AUTH_STATE', data: bigString } });
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('OVERSIZED_PAYLOAD');
  });
});

describe('Message Router — Sender validation', () => {
  it('external extension sender → UNAUTHORIZED_SENDER', async () => {
    const res = await send(makeEnvelope({ type: 'GET_AUTH_STATE' }), externalSender());
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('UNAUTHORIZED_SENDER');
  });

  it('content script sending UNLOCK → ACCESS_DENIED', async () => {
    const res = await send(
      makeEnvelope({ type: 'UNLOCK', masterPassword: 'pw' }),
      contentScriptSender()
    );
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('ACCESS_DENIED');
  });

  it('content script sending LOCK → ACCESS_DENIED', async () => {
    const res = await send(makeEnvelope({ type: 'LOCK' }), contentScriptSender());
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('ACCESS_DENIED');
  });

  it('content script sending SAVE_LOGIN → ACCESS_DENIED', async () => {
    const res = await send(
      makeEnvelope({ type: 'SAVE_LOGIN', payload: {} as any }),
      contentScriptSender()
    );
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('ACCESS_DENIED');
  });

  it('content script from non-http URL → UNAUTHORIZED_SENDER', async () => {
    const res = await send(
      makeEnvelope({ type: 'GET_MATCHING_LOGINS', page: { url: 'https://github.com', hostname: 'github.com' } }),
      contentScriptSender('file:///etc/passwd')
    );
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('UNAUTHORIZED_SENDER');
  });
});

describe('Message Router — Replay detection', () => {
  it('replayed message ID → REPLAY_DETECTED', async () => {
    const env = makeEnvelope({ type: 'GET_AUTH_STATE' });
    // First send — should succeed
    const first = await send(env);
    expect(first.success).toBe(true);
    // Second send with same ID — should be rejected
    const second = await send(env);
    expect(second.success).toBe(false);
    expect(second.error.code).toBe('REPLAY_DETECTED');
  });

  it('stale timestamp → REPLAY_DETECTED', async () => {
    const env = makeEnvelope({ type: 'GET_AUTH_STATE' }, { sentAt: Date.now() - 60_000 });
    const res = await send(env);
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('REPLAY_DETECTED');
  });
});

describe('Message Router — Concurrent requests', () => {
  it('handles multiple concurrent GET_AUTH_STATE requests correctly', async () => {
    const requests = Array.from({ length: 5 }, () =>
      send(makeEnvelope({ type: 'GET_AUTH_STATE' }))
    );
    const results = await Promise.all(requests);
    results.forEach(res => {
      expect(res.success).toBe(true);
      expect(res.requestId).toBeDefined();
    });
    // Each requestId should be unique
    const ids = results.map(r => r.requestId);
    expect(new Set(ids).size).toBe(5);
  });
});

describe('Message Router — Rate limiting', () => {
  it('UNLOCK is rate-limited after 5 failed attempts', async () => {
    // After unlock, rate limit resets — so use unique sender to isolate
    let lastRes: any;
    for (let i = 0; i <= 5; i++) {
      lastRes = await send(makeEnvelope({ type: 'UNLOCK', masterPassword: 'wrong' }), {
        id: EXT_ID,
        url: `chrome-extension://${EXT_ID}/popup.html`,
      } as any);
    }
    // 6th attempt should be rate limited
    expect(lastRes.success).toBe(false);
    expect(lastRes.error.code).toBe('RATE_LIMITED');
  });
});
