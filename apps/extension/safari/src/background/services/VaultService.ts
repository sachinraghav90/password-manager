import { ExtensionVaultRepository } from '../repository/ExtensionVaultRepository';
import { db } from '@vaultguard/db-local';
import { cryptoUtils, sessionCryptoStore } from '@vaultguard/crypto';
import { SafePopupLoginMetadata, LoginSecretData, PageContext, MatchingLoginResult } from '@vaultguard/browser-api';
import { getBestMatchScore, normalizeWebsiteEntries } from '../utils/matchEngine';

export class VaultService {
  constructor(private repository: ExtensionVaultRepository) {}

  /**
   * Fetches the unwrapped vault key.
   */
  private async getVaultKey(vaultId: string): Promise<CryptoKey> {
    const vaults = await this.repository.getVaults();
    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) {
      throw new Error(`Vault not found or unauthorized: ${vaultId}`);
    }

    const masterKey = sessionCryptoStore.getMasterKey();
    if (!masterKey) {
      throw new Error('Vault is locked');
    }

    // Unwrap the key using the master key.
    return await cryptoUtils.unwrapVaultKey(
      vault.wrappedVaultKey,
      vault.vaultKeyNonce,
      masterKey
    );
  }

  /**
   * Returns metadata for all logins matching the query, debounced/limited.
   * Does NOT return passwords.
   */
  async getPopupLogins(query: string, vaultId?: string, tabUrl?: string): Promise<SafePopupLoginMetadata[]> {
    const indexRecords = await this.repository.getLoginIndex();
    const vaults = await this.repository.getVaults();
    
    // Create a map of decrypted vault keys
    const vaultKeys = new Map<string, CryptoKey>();
    for (const v of vaults) {
      try {
        const key = await this.getVaultKey(v.id);
        vaultKeys.set(v.id, key);
      } catch (e) {
        // Skip vaults that can't be decrypted (e.g. pending_crypto)
      }
    }

    let results: SafePopupLoginMetadata[] = [];
    
    // Process index to decrypt titles
    for (const record of indexRecords) {
      if (vaultId && record.vaultId !== vaultId) continue;
      
      const key = vaultKeys.get(record.vaultId);
      if (!key) continue;

      try {
        let title = '';
        if ((record as any).unencryptedName) {
           title = (record as any).unencryptedName;
        } else if (record.titleNonce) {
           title = await cryptoUtils.decryptData(record.encryptedTitle, record.titleNonce, key);
        } else {
           // Item synced from Supabase: encryptedTitle is just the raw domain
           title = record.encryptedTitle || 'Untitled';
        }
        
        let matchScore = 0;
        const q = query.toLowerCase();
        
        if (q && title.toLowerCase().includes(q)) matchScore += 10;
        if (q && !title.toLowerCase().includes(q)) continue; // Filter out non-matching if query exists

        // If no query but there's a tabUrl, match against tabUrl
        // We'd need the website/username to do full matching, which means decrypting the full payload.
        const loginRecord = await this.repository.getEncryptedLogin(record.id);
        const payloadStr = await cryptoUtils.decryptData(loginRecord.encryptedData, loginRecord.dataNonce, key);
        const payload = JSON.parse(payloadStr);

        if (q && payload.username?.toLowerCase().includes(q)) matchScore += 5;
        if (q && payload.website?.toLowerCase().includes(q)) matchScore += 5;

        // If there's a tabUrl, score it using matchEngine
        if (tabUrl) {
          // Construct a mock PageContext for the tabUrl
          const mockPage: PageContext = { url: tabUrl, hostname: '', origin: '', isTopFrame: true };
          
          const websites = normalizeWebsiteEntries({ ...payload, domain: (record as any).domain });
          const engineScore = getBestMatchScore(websites, mockPage);
          if (engineScore > 0) {
             matchScore += engineScore;
          }
        }

        // If we have a query and NO fields matched, skip
        if (q && matchScore === 0) continue;

        results.push({
          itemId: record.id,
          vaultId: record.vaultId,
          vaultName: vaults.find(v => v.id === record.vaultId)?.name || 'Unknown Vault',
          title,
          username: payload.username || '',
          website: normalizeWebsiteEntries({ ...payload, domain: (record as any).domain })[0]?.url || '',
          notes: payload.notes || '',
          favorite: record.favorite,
          matchScore,
          itemType: (record as any).itemType || 'login'
        });
      } catch {
        if ((globalThis as any).__VAULTGUARD_DEV__) {
          console.debug({ scope: 'inline-autofill', stage: 'popup-decrypt', errorCode: 'DECRYPTION_FAILED' });
        }
      }
    }

    // Removed STATS injection

    // Sort by match score descending, then favorites, then alphabetical
    results.sort((a, b) => {
      if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

    // Limit to 50 results to prevent massive IPC payloads
    return results.slice(0, 50);
  }

  /**
   * Fetches the password for a specific item.
   */
  async getLoginSecret(itemId: string, vaultId: string): Promise<LoginSecretData> {
    const key = await this.getVaultKey(vaultId);
    const loginRecord = await this.repository.getEncryptedLogin(itemId);
    const payloadStr = await cryptoUtils.decryptData(loginRecord.encryptedData, loginRecord.dataNonce, key);
    const payload = JSON.parse(payloadStr);
    
    return { password: payload.password };
  }

  async createLogin(vaultId: string, title: string, username: string, password: string, url: string): Promise<string> {
    const key = await this.getVaultKey(vaultId);
    const id = crypto.randomUUID();
    const now = Date.now();
    const payload = JSON.stringify({ title, username, password, websites: [{ url, autofillBehavior: 'fill_anywhere' }] });
    const encrypted = await cryptoUtils.encryptData(payload, key);
    await this.repository.createEncryptedLogin({ id, vaultId, encryptedData: encrypted.ciphertextBase64, dataNonce: encrypted.nonceBase64 });
    const userId = (globalThis as any).activeUserId;
    await db.pm_item_index.put({ indexId: crypto.randomUUID(), itemId: id, userId, vaultId, itemType: 'login', favorite: false, encryptedTitle: title, titleNonce: '', domain: new URL(url).hostname, createdAt: now, updatedAt: now, schemaVersion: 1 });
    return id;
  }

  async updateLastAccessedAt(itemId: string): Promise<void> {
    await this.repository.updateLastAccessedAt(itemId);
  }

  async getLoginCredentials(itemId: string): Promise<{ username?: string; password?: string }> {
    const record = await this.repository.getEncryptedLogin(itemId);
    const key = await this.getVaultKey(record.vaultId);
    const payloadStr = await cryptoUtils.decryptData(record.encryptedData, record.dataNonce, key);
    const payload = JSON.parse(payloadStr);

    return { 
      username: payload.username, 
      password: payload.password 
    };
  }

  /** Re-checks one selected login without decrypting unrelated items. */
  async getLoginMatchScore(itemId: string, page: PageContext): Promise<number> {
    const index = (await this.repository.getLoginIndex()).find(
      record => record.id === itemId && (!record.itemType || record.itemType === 'login')
    );
    if (!index || index.deletedAt || index.pendingCrypto) return 0;
    const key = await this.getVaultKey(index.vaultId);
    const loginRecord = await this.repository.getEncryptedLogin(itemId);
    const payloadStr = await cryptoUtils.decryptData(loginRecord.encryptedData, loginRecord.dataNonce, key);
    const payload = JSON.parse(payloadStr);
    return getBestMatchScore(
      normalizeWebsiteEntries({ ...payload, domain: index.domain }),
      page
    );
  }

  /**
   * Returns logins that match a specific page context (used by autofill/content script)
   */
  async getMatchingLogins(page: PageContext): Promise<MatchingLoginResult[]> {
    const indexRecords = await this.repository.getLoginIndex();
    const vaults = await this.repository.getVaults();
    
    const vaultKeys = new Map<string, CryptoKey>();
    for (const v of vaults) {
      try {
        const key = await this.getVaultKey(v.id);
        vaultKeys.set(v.id, key);
      } catch (e) {
        // Skip
      }
    }

    let results: MatchingLoginResult[] = [];
    
    for (const record of indexRecords) {
      const key = vaultKeys.get(record.vaultId);
      if (!key) continue;

      try {
        const loginRecord = await this.repository.getEncryptedLogin(record.id);
        const payloadStr = await cryptoUtils.decryptData(loginRecord.encryptedData, loginRecord.dataNonce, key);
        const payload = JSON.parse(payloadStr);

        const websites = normalizeWebsiteEntries({ ...payload, domain: (record as any).domain });
        const matchScore = getBestMatchScore(websites, page);

        // Note: We deliberately do NOT fall back to encryptedTitle for matchability.
        // Matchability must be derived entirely from the normalized `websites` array in the decrypted payload.
        
        if (matchScore > 0) {
          let title = payload.title || payload.name || '';
          if (!title) {
            // Try to decrypt from index. If titleNonce is empty (synced from Supabase), use raw value as plain text.
            if (record.titleNonce) {
              try { title = await cryptoUtils.decryptData(record.encryptedTitle, record.titleNonce, key); } catch (e) { title = record.encryptedTitle; }
            } else {
              title = record.encryptedTitle || 'Untitled';
            }
          }
          results.push({
            itemId: record.id,
            vaultId: record.vaultId,
            vaultName: vaults.find(v => v.id === record.vaultId)?.name,
            title,
            username: payload.username || '',
            matchScore,
            website: websites[0]?.url || '',
            favorite: record.favorite,
            lastAccessedAt: record.lastAccessedAt || 0
          });
        }
      } catch {
        if ((globalThis as any).__VAULTGUARD_DEV__) {
          console.debug({ scope: 'inline-autofill', stage: 'suggestion-decrypt', errorCode: 'DECRYPTION_FAILED' });
        }
      }
    }

    results.sort((a: any, b: any) =>
      b.matchScore - a.matchScore ||
      Number(b.favorite) - Number(a.favorite) ||
      (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0) ||
      a.title.localeCompare(b.title)
    );
    return results;
  }
}




