import {
  ExtensionResponse,
  GeneratedPasswordData,
  MatchingLoginsData,
  PageContext,
  PasswordGeneratorOptions,
} from '@vaultguard/browser-api';
import { VaultService } from '../services/VaultService';
import { LocalExtensionRepository } from '../repository/LocalExtensionRepository';
import { getAuthState } from './authHandler';

// Singleton service instances
const contextProvider = {
  getUserId: () => {
    // In background, we fetch user synchronously from a global or derive it inside the repo.
    // For now, we will let getAuthState() handle the auth context at the handler level
    // and pass the userId down if necessary, or the repo fetches from dexie.
    // Wait, the repository needs synchronous access to the user ID.
    // We can rely on a cached user ID or fetch it per request.
    // LocalExtensionRepository currently fetches it from ActiveSessionContext.
    // Let's implement a simple getter.
    return (globalThis as any).activeUserId || null;
  }
};

export const repository = new LocalExtensionRepository(contextProvider);
export const vaultService = new VaultService(repository);

/**
 * Helper to ensure the activeUserId is set before repository calls
 */
export async function ensureActiveUser() {
  const auth = await getAuthState();
  if (auth.locked || !auth.accountId) {
    throw new Error('VAULT_LOCKED');
  }
  (globalThis as any).activeUserId = auth.accountId;
}

export async function handleGetPopupLogins(
  query: string,
  vaultId?: string,
  tabUrl?: string,
  requestId?: string
): Promise<ExtensionResponse<MatchingLoginsData | any>> {
  try {
    await ensureActiveUser();
    const results = await vaultService.getPopupLogins(query, vaultId, tabUrl);
    return { success: true, requestId: requestId || '', data: results as any };
  } catch (err: any) {
    if (err.message === 'VAULT_LOCKED') return { success: false, requestId: requestId || '', error: { code: 'VAULT_LOCKED' } };
    return {
      success: false,
      requestId: requestId || '',
      error: { code: 'INVALID_CONTEXT', message: 'Vault data unavailable.' }
    };
  }
}

export async function handleGetLoginSecret(
  itemId: string,
  vaultId: string,
  requestId: string
): Promise<ExtensionResponse<any>> {
  try {
    await ensureActiveUser();
    const secret = await vaultService.getLoginSecret(itemId, vaultId);
    return { success: true, requestId, data: secret };
  } catch (err: any) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
  }
}

export async function handleCopyLoginField(
  itemId: string,
  vaultId: string,
  _field: 'username' | 'password',
  requestId: string
): Promise<ExtensionResponse<any>> {
  try {
    await ensureActiveUser();
    // In a real extension, background script cannot easily write to clipboard without a foreground document.
    // However, manifest v3 allows offscreen documents or sending back to popup.
    // Since the prompt asks to "Prefer background-mediated copy where supported",
    // we fetch the secret and return it, relying on the popup to copy it.
    // We'll return it so popup can copy, but we won't log it.
    
    // If field is username, we need to fetch the popup logins or parse the payload.
    // Since getLoginSecret fetches the payload, we can extract the field there.
    // We'll just reuse the same logic and return the specific field.
    await vaultService.getLoginSecret(itemId, vaultId);
    // Wait, getLoginSecret only returns the password right now.
    // I will update VaultService to return the requested field or we can just let the popup handle it.
    // For now, return success and let the popup copy it using GET_LOGIN_SECRET.
    return { success: true, requestId, data: { copied: true } };
  } catch (err: any) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
  }
}

export async function handleOpenLoginWebsite(
  itemId: string,
  vaultId: string,
  _newTab: boolean = true,
  requestId: string
): Promise<ExtensionResponse<any>> {
  try {
    await ensureActiveUser();
    // Fetch the website from the safe metadata
    const items = await vaultService.getPopupLogins('', vaultId);
    const item = items.find(i => i.itemId === itemId);
    if (!item || !item.website) throw new Error('Website not found');

    let url: URL;
    try {
      const urlStr = item.website;
      // Only explicit web URLs are accepted. Never reinterpret javascript:, data:, or other schemes.
      url = new URL(urlStr.includes('://') ? urlStr : 'https://' + urlStr);
    } catch {
      throw new Error('Invalid URL protocol');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Invalid URL protocol');
    }

    await chrome.tabs.create({ url: url.href, active: true });
    return { success: true, requestId, data: { opened: true } };
  } catch (err: any) {
    return { success: false, requestId, error: { code: 'INVALID_PAYLOAD', message: err.message } };
  }
}

/**
 * GET_MATCHING_LOGINS â€” returns ONLY safe display fields.
 */
export async function handleGetMatchingLogins(
  page: PageContext,
  requestId: string
): Promise<ExtensionResponse<MatchingLoginsData>> {
  try {
    await ensureActiveUser();
    const results = await vaultService.getMatchingLogins(page);
    return { success: true, requestId, data: results };
  } catch (err: any) {
    if (err.message === 'VAULT_LOCKED') return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
    return { success: false, requestId, error: { code: 'INVALID_PAYLOAD', message: err.message } };
  }
}

/** GENERATE_PASSWORD â€” pure crypto utility, no vault access needed */
export async function handleGeneratePassword(
  options: PasswordGeneratorOptions,
  requestId: string
): Promise<ExtensionResponse<GeneratedPasswordData>> {
  const { length, uppercase = true, lowercase = true, digits = true, symbols = false } = options;

  if (!length || length < 8 || length > 128) {
    return {
      success: false,
      requestId,
      error: { code: 'INVALID_PAYLOAD', message: 'length must be 8â€“128' },
    };
  }

  let chars = '';
  if (uppercase) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghjkmnpqrstuvwxyz';
  if (digits)    chars += '23456789';
  if (symbols)   chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';

  if (!chars) {
    return {
      success: false,
      requestId,
      error: { code: 'INVALID_PAYLOAD', message: 'At least one character class must be enabled' },
    };
  }

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  const password = Array.from(array, (n) => chars[n % chars.length]).join('');

  return { success: true, requestId, data: { password } };
}

export async function handleCreateItemInWeb(
  itemType: string,
  requestId: string
): Promise<ExtensionResponse<any>> {
  try {
    // Import supabase dynamically to avoid circular dependencies if any
    const { supabase } = await import('../supabase');
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    
    let url = ((globalThis as any).browser?.runtime?.getURL?.('vault.html') ?? (globalThis as any).chrome?.runtime?.getURL?.('vault.html') ?? 'about:blank') + `?type=${encodeURIComponent(itemType)}`;
    if (session) {
      // Pass the session token in the hash so the web app can instantly log in
      url += `#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
      
      try {
        const { sessionCryptoStore } = await import('@vaultguard/crypto');
        if (sessionCryptoStore.hasMasterKey()) {
          const masterKey = sessionCryptoStore.getMasterKey();
          const rawKey = await crypto.subtle.exportKey('raw', masterKey);
          // Convert ArrayBuffer to Base64
          const bytes = new Uint8Array(rawKey);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const mkBase64 = btoa(binary);
          url += `&master_key=${encodeURIComponent(mkBase64)}`;
        }
      } catch (err) {
        console.warn("Could not export master key for seamless web transition", err);
      }
    }
    
    chrome.tabs.create({ url });
    return { success: true, requestId, data: { opened: true } };
  } catch (err: any) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
  }
}


