/**
 * ArrayBuffer / Base64 Utilities
 */
export function bufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Cryptographic Constants
 */
const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;

export const cryptoUtils = {
  generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
    return bufferToBase64(salt.buffer);
  },

  generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  },

  /**
   * Derive the Master Key from a password and salt using PBKDF2.
   */
  async deriveMasterKey(password: string, saltBase64: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(password);
    const saltBuffer = base64ToBuffer(saltBase64);

    const importedPassword = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      importedPassword,
      { name: 'AES-GCM', length: 256 },
      true, // exportable so we can pass it to web app seamlessly
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Generate a random AES-GCM Vault Key.
   */
  async generateVaultKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // must be exportable so we can wrap it
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypt (wrap) the Vault Key using the Master Key.
   */
  async wrapVaultKey(vaultKey: CryptoKey, masterKey: CryptoKey): Promise<{ wrappedKeyBase64: string, nonceBase64: string }> {
    const rawVaultKey = await crypto.subtle.exportKey('raw', vaultKey);
    const iv = this.generateIV();

    const wrappedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      masterKey,
      rawVaultKey
    );

    return {
      wrappedKeyBase64: bufferToBase64(wrappedBuffer),
      nonceBase64: bufferToBase64(iv.buffer)
    };
  },

  /**
   * Decrypt (unwrap) the Vault Key using the Master Key.
   */
  async unwrapVaultKey(wrappedKeyBase64: string, nonceBase64: string, masterKey: CryptoKey): Promise<CryptoKey> {
    const wrappedBuffer = base64ToBuffer(wrappedKeyBase64);
    const iv = new Uint8Array(base64ToBuffer(nonceBase64));

    const rawVaultKeyBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      masterKey,
      wrappedBuffer
    );

    return await crypto.subtle.importKey(
      'raw',
      rawVaultKeyBuffer,
      { name: 'AES-GCM', length: 256 },
      true, // keep it exportable internally if needed
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypt arbitrary string data using a key (e.g., Vault Key).
   */
  async encryptData(plaintext: string, key: CryptoKey): Promise<{ ciphertextBase64: string, nonceBase64: string }> {
    const enc = new TextEncoder();
    const iv = this.generateIV();
    
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      enc.encode(plaintext)
    );

    return {
      ciphertextBase64: bufferToBase64(ciphertextBuffer),
      nonceBase64: bufferToBase64(iv.buffer)
    };
  },

  /**
   * Decrypt arbitrary string data using a key.
   */
  async decryptData(ciphertextBase64: string, nonceBase64: string, key: CryptoKey): Promise<string> {
    const dec = new TextDecoder();
    const iv = new Uint8Array(base64ToBuffer(nonceBase64));
    const ciphertextBuffer = base64ToBuffer(ciphertextBase64);

    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      ciphertextBuffer
    );

    return dec.decode(plaintextBuffer);
  },

  /**
   * Generate a random AES-GCM File Key for attachments.
   */
  async generateFileKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // must be exportable
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypt arbitrary ArrayBuffer using a key (e.g. File Key).
   */
  async encryptBuffer(plaintextBuffer: ArrayBuffer, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, nonceBase64: string }> {
    const iv = this.generateIV();
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      plaintextBuffer
    );

    return {
      ciphertext,
      nonceBase64: bufferToBase64(iv.buffer)
    };
  },

  /**
   * Decrypt arbitrary ArrayBuffer using a key.
   */
  async decryptBuffer(ciphertextBuffer: ArrayBuffer, nonceBase64: string, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = new Uint8Array(base64ToBuffer(nonceBase64));

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      ciphertextBuffer
    );
  }
};

/**
 * Memory-only session cache for sensitive keys.
 * NEVER serialize or store these in localStorage/IndexedDB.
 */
class SessionCryptoStore {
  private masterKey: CryptoKey | null = null;
  private vaultKeys: Map<string, CryptoKey> = new Map(); // vaultId -> CryptoKey

  setMasterKey(key: CryptoKey) {
    this.masterKey = key;
  }

  hasMasterKey(): boolean {
    return this.masterKey !== null;
  }

  getMasterKey(): CryptoKey {
    if (!this.masterKey) throw new Error('Master key not in memory. Session locked.');
    return this.masterKey;
  }

  setVaultKey(vaultId: string, key: CryptoKey) {
    this.vaultKeys.set(vaultId, key);
  }

  getVaultKey(vaultId: string): CryptoKey {
    const key = this.vaultKeys.get(vaultId);
    if (!key) throw new Error(`Vault key for ${vaultId} not in memory.`);
    return key;
  }

  clearSensitiveMemory() {
    this.masterKey = null;
    this.vaultKeys.clear();
  }
}

export const sessionCryptoStore = new SessionCryptoStore();
