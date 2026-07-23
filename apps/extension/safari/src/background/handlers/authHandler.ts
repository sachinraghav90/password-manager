import { AuthStateData, ExtensionResponse, ExtensionAuthState } from '@vaultguard/browser-api';
import { User, Vault } from '@vaultguard/models';
import { cryptoUtils, sessionCryptoStore } from '@vaultguard/crypto';
import { db } from '@vaultguard/db-local';
import { resetAutoLockTimer } from '../autoLock';
import { supabase } from '../supabase';
import { syncService } from '../services/SyncService';
import { persistSession, clearPersistedSession, restoreSession } from '../services/SessionPersistence';

export interface BackgroundAuthState {
  locked: boolean;
  state: ExtensionAuthState;
  accountId: string | null;
  email: string | null;
}

/**
 * Derives current state dynamically.
 * Service workers may suspend, causing memory to clear.
 * - If user exists in DB but memory is clear -> authenticated_locked
 * - If user exists and memory has master key -> authenticated_unlocked
 * - If no user -> signed_out
 */
export async function getAuthState(): Promise<BackgroundAuthState> {
  // If keys not in memory, try to restore from chrome.storage.session
  // (survives SW restarts within the same browser session)
  if (!sessionCryptoStore.hasMasterKey()) {
    await restoreSession();
  }

  const users = await db.users.toArray();
  const activeUser = users[0];

  if (!activeUser) {
    return {
      locked: true,
      state: 'signed_out',
      accountId: null,
      email: null,
    };
  }

  const hasKey = sessionCryptoStore.hasMasterKey();
  const state: ExtensionAuthState = hasKey ? 'authenticated_unlocked' : 'authenticated_locked';

  return {
    locked: !hasKey,
    state,
    accountId: activeUser.id,
    email: activeUser.email,
  };
}

export async function handleGetAuthState(
  requestId: string
): Promise<ExtensionResponse<AuthStateData>> {
  const state = await getAuthState();
  return {
    success: true,
    requestId,
    data: {
      state: state.state,
      accountId: state.accountId,
      email: state.email,
    },
  };
}

export async function handleLock(
  requestId: string
): Promise<ExtensionResponse<{ locked: true }>> {
  // Clear sensitive keys from memory immediately
  sessionCryptoStore.clearSensitiveMemory();
  
  // Clear from session storage so they don't get restored on next SW startup
  await clearPersistedSession();

  // Also clear alarms since we are now locked
  chrome.alarms?.clear('vaultguard-auto-lock');

  // Broadcast lock state to all extension pages (like the popup)
  chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', locked: true }).catch(() => {});

  return { success: true, requestId, data: { locked: true } };
}

export async function handleUnlock(
  masterPassword: string,
  requestId: string
): Promise<ExtensionResponse<{ locked: false }>> {
  try {
    const users = await db.users.toArray();
    const activeUser = users[0];

    if (!activeUser || !activeUser.masterKeySalt) {
      return {
        success: false,
        requestId,
        error: { code: 'ACCESS_DENIED', message: 'No registered user or salt found. Please sign in to the web vault.' },
      };
    }

    // Derive key using the real salt from the DB
    const masterKey = await cryptoUtils.deriveMasterKey(masterPassword, activeUser.masterKeySalt);

    const vaults = await db.vaults.toArray();
    const primaryVault = vaults[0];

    if (primaryVault && primaryVault.wrappedVaultKey && primaryVault.vaultKeyNonce) {
      try {
        const vaultKey = await cryptoUtils.unwrapVaultKey(
          primaryVault.wrappedVaultKey,
          primaryVault.vaultKeyNonce,
          masterKey
        );
        // Correct password!
        sessionCryptoStore.setMasterKey(masterKey);
        sessionCryptoStore.setVaultKey(primaryVault.id, vaultKey);
      } catch (err) {
        // Wrong password fails to unwrap
        return {
          success: false,
          requestId,
          error: { code: 'ACCESS_DENIED', message: 'Incorrect master password' },
        };
      }
    } else {
      // No vault exists to test password against, so we just set master key
      sessionCryptoStore.setMasterKey(masterKey);
    }

    // Restart the auto-lock timer since we just had activity
    await resetAutoLockTimer();

    // Persist keys to chrome.storage.session so they survive SW restarts
    await persistSession();

    // Re-sync items from Supabase in the background now that vault key is available
    if (activeUser) {
      await syncService.sync(activeUser.id);
    }

    // Broadcast unlock state to all extension pages
    chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', locked: false }).catch(() => {});

    return { success: true, requestId, data: { locked: false } };
  } catch (err) {
    return {
      success: false,
      requestId,
      error: { code: 'PENDING_CRYPTO', message: 'Key derivation failed' },
    };
  } finally {
    // Immediately overwrite masterPassword reference â€” do not cache or log it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    masterPassword = '';
  }
}

export async function handleLogin(
  email: string,
  accountPassword: string,
  requestId: string
): Promise<ExtensionResponse<{ locked: true }>> {
  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: accountPassword
    });

    if (authError || !authData.user) {
      return {
        success: false,
        requestId,
        error: { code: 'ACCESS_DENIED', message: authError?.message || 'Authentication failed' }
      };
    }

    // 2. Fetch Profile to get salt
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'Profile not found' } };
    }

    // 3. Fetch all RLS-authorized personal and organization vaults.
    // Organization vault keys are user-specific and resolved through vault_members.
    const accessibleVaults = await syncService.getAccessibleVaults(authData.user.id);

    // 4. Store in local DB for offline access
    await db.users.clear();
    await db.vaults.clear();
    const localUser: User = {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      emailVerified: true,
      passwordHash: '', // Unused securely locally
      masterKeySalt: profile.master_key_salt,
      encryptionVersion: profile.encryption_version,
      createdAt: new Date(profile.created_at).getTime(),
      updatedAt: new Date(profile.updated_at).getTime(),
    };
    await db.users.put(localUser);

    for (const vault of accessibleVaults) {
      await db.vaults.put(vault as unknown as Vault);
    }
    // Pull latest items from Supabase into local DB
    await syncService.sync(authData.user.id);

    // Broadcast that auth state changed (now locked instead of signed_out)
    chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', locked: true }).catch(() => {});

    return { success: true, requestId, data: { locked: true } };
  } catch (err: any) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    accountPassword = '';
  }
}


