/**
 * SessionPersistence.ts
 *
 * Bitwarden-style MV3 key persistence: stores cryptographic keys in
 * chrome.storage.session so they survive service worker restarts within
 * the same browser session but are automatically cleared when the browser closes.
 *
 * Keys are stored as raw exported bytes — chrome.storage.session is never
 * written to disk, so this is safe for session-scoped key material.
 */

import { sessionCryptoStore, cryptoUtils } from '@vaultguard/crypto';
import { db } from '@vaultguard/db-local';

const SESSION_KEY = 'vg_session_v1';

interface PersistedSession {
  masterKeyBytes: number[];      // Raw exported master key bytes
  vaultKeys: { vaultId: string; keyBytes: number[] }[];
}

/** Save current in-memory keys to chrome.storage.session */
export async function persistSession(): Promise<void> {
  try {
    if (!sessionCryptoStore.hasMasterKey()) return;

    const masterKey = sessionCryptoStore.getMasterKey();
    const masterKeyBuffer = await crypto.subtle.exportKey('raw', masterKey);
    const masterKeyBytes = Array.from(new Uint8Array(masterKeyBuffer));

    // Export all vault keys
    const vaults = await db.vaults.toArray();
    const vaultKeyEntries: { vaultId: string; keyBytes: number[] }[] = [];

    for (const vault of vaults) {
      try {
        const vaultKey = sessionCryptoStore.getVaultKey(vault.id);
        const vaultKeyBuffer = await crypto.subtle.exportKey('raw', vaultKey);
        vaultKeyEntries.push({
          vaultId: vault.id,
          keyBytes: Array.from(new Uint8Array(vaultKeyBuffer))
        });
      } catch {
        // Vault key not in memory, skip
      }
    }

    const session: PersistedSession = { masterKeyBytes, vaultKeys: vaultKeyEntries };
    const sessionArea = chrome.storage?.session;
    if (!sessionArea) return;
    await sessionArea.set({ [SESSION_KEY]: session });
  } catch (err) {
    console.error('[SessionPersistence] Failed to persist session:', err);
  }
}

/** Restore keys from chrome.storage.session into the in-memory store */
export async function restoreSession(): Promise<boolean> {
  try {
    const sessionArea = chrome.storage?.session;
    if (!sessionArea) return false;
    const result = await sessionArea.get(SESSION_KEY);
    const session: PersistedSession | undefined = result[SESSION_KEY];

    if (!session || !session.masterKeyBytes || session.masterKeyBytes.length === 0) {
      return false;
    }

    // Re-import master key (AES-GCM, derived from PBKDF2)
    const masterKeyBuffer = new Uint8Array(session.masterKeyBytes).buffer;
    const masterKey = await crypto.subtle.importKey(
      'raw',
      masterKeyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    sessionCryptoStore.setMasterKey(masterKey);

    // Re-import vault keys
    for (const entry of (session.vaultKeys || [])) {
      const vaultKeyBuffer = new Uint8Array(entry.keyBytes).buffer;
      const vaultKey = await crypto.subtle.importKey(
        'raw',
        vaultKeyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      sessionCryptoStore.setVaultKey(entry.vaultId, vaultKey);
    }

    console.log('[SessionPersistence] Session restored successfully.');
    return true;
  } catch (err) {
    console.error('[SessionPersistence] Failed to restore session:', err);
    return false;
  }
}

/** Clear the persisted session (called on lock/logout) */
export async function clearPersistedSession(): Promise<void> {
  try {
    const sessionArea = chrome.storage?.session;
    if (!sessionArea) return;
    await sessionArea.remove(SESSION_KEY);
  } catch (err) {
    console.error('[SessionPersistence] Failed to clear session:', err);
  }
}
