import { db } from '../client';
import { User, Vault, Settings } from '../schema';
import { cryptoUtils, sessionCryptoStore } from '../../crypto/cryptoService';

function generateUUID() {
  return crypto.randomUUID();
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
  async register(fullName: string, email: string, masterPassword: string) {
    const existing = await db.users.where('email').equalsIgnoreCase(email).first();
    if (existing) {
      throw new Error('Email already registered');
    }

    // 1. Cryptography Setup
    const salt = cryptoUtils.generateSalt();
    const masterKey = await cryptoUtils.deriveMasterKey(masterPassword, salt);
    
    // Fast validation check
    const passwordHash = await hashPassword(masterPassword, salt);
    
    // Generate Vault and Vault Key
    const userId = generateUUID();
    const vaultId = generateUUID();
    
    const vaultKey = await cryptoUtils.generateVaultKey();
    const { wrappedKeyBase64, nonceBase64 } = await cryptoUtils.wrapVaultKey(vaultKey, masterKey);

    // 2. Database Entities
    const user: User = {
      id: userId,
      fullName,
      email: email.toLowerCase(),
      emailVerified: true,
      passwordHash,
      masterKeySalt: salt,
      encryptionVersion: 'PBKDF2-AES256GCM',
      accountType: 'personal',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      defaultVaultId: vaultId
    };

    const defaultVault: Vault = {
      id: vaultId,
      name: 'Personal',
      description: 'Your default personal vault',
      createdBy: userId,
      ownershipType: 'personal',
      ownerUserId: userId,
      organizationId: null,
      wrappedVaultKey: wrappedKeyBase64,
      vaultKeyNonce: nonceBase64,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const defaultSettings: Settings = {
      userId,
      theme: 'system',
      autoLockTime: 15
    };

    // 3. Persist to DB
    await db.transaction('rw', db.users, db.vaults, db.settings, async () => {
      await db.users.add(user);
      await db.vaults.add(defaultVault);
      await db.settings.add(defaultSettings);
    });

    // 4. Cache Keys in Memory
    sessionCryptoStore.setMasterKey(masterKey);
    sessionCryptoStore.setVaultKey(vaultId, vaultKey);

    return user;
  },

  async login(email: string, masterPassword: string) {
    const user = await db.users.where('email').equalsIgnoreCase(email).first();
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.encryptionVersion || user.encryptionVersion !== 'PBKDF2-AES256GCM') {
      throw new Error('Account uses an outdated data format from a previous version. Please create a new account or clear your browser data.');
    }

    // 1. MVP Fast Validation Check
    const hash = await hashPassword(masterPassword, user.masterKeySalt);
    if (hash !== user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    if (user.mustChangePassword) {
      throw new Error('MUST_CHANGE_PASSWORD');
    }

    // 2. Derive Master Key
    const masterKey = await cryptoUtils.deriveMasterKey(masterPassword, user.masterKeySalt);

    // 3. Unwrap Default Vault Key if it exists
    if (user.defaultVaultId) {
      const defaultVault = await db.vaults.get(user.defaultVaultId);
      if (defaultVault) {
        const vaultKey = await cryptoUtils.unwrapVaultKey(
          defaultVault.wrappedVaultKey, 
          defaultVault.vaultKeyNonce, 
          masterKey
        );
        sessionCryptoStore.setVaultKey(user.defaultVaultId, vaultKey);
      }
    }

    // 4. Cache Keys in Memory
    sessionCryptoStore.setMasterKey(masterKey);

    return user;
  },

  logout() {
    sessionCryptoStore.clearSensitiveMemory();
  },

  async resetInitialPassword(email: string, oldPassword: string, newPassword: string) {
    const user = await db.users.where('email').equalsIgnoreCase(email).first();
    if (!user) throw new Error('User not found');
    if (!user.mustChangePassword) throw new Error('Password reset not required');
    
    const hash = await hashPassword(oldPassword, user.masterKeySalt);
    if (hash !== user.passwordHash) throw new Error('Invalid credentials');
    
    const newSalt = cryptoUtils.generateSalt();
    const newPasswordHash = await hashPassword(newPassword, newSalt);
    
    await db.users.update(user.id, {
      passwordHash: newPasswordHash,
      masterKeySalt: newSalt,
      mustChangePassword: false,
      updatedAt: Date.now()
    });
    
    // We do NOT create a personal vault for them here, as per requirements.
    // The user simply updates their password. 
  },

  async changePassword(email: string, oldPassword: string, newPassword: string) {
    const user = await db.users.where('email').equalsIgnoreCase(email).first();
    if (!user) throw new Error('User not found');
    
    const hash = await hashPassword(oldPassword, user.masterKeySalt);
    if (hash !== user.passwordHash) throw new Error('Invalid old password');
    
    // Derive old master key to unwrap the vault keys
    const oldMasterKey = await cryptoUtils.deriveMasterKey(oldPassword, user.masterKeySalt);
    
    // Generate new salt and hash for new password
    const newSalt = cryptoUtils.generateSalt();
    const newMasterKey = await cryptoUtils.deriveMasterKey(newPassword, newSalt);
    const newPasswordHash = await hashPassword(newPassword, newSalt);
    
    await db.transaction('rw', db.users, db.vaults, async () => {
      await db.users.update(user.id, {
        passwordHash: newPasswordHash,
        masterKeySalt: newSalt,
        updatedAt: Date.now()
      });
      
      // Re-wrap default vault key if it exists
      if (user.defaultVaultId) {
        const defaultVault = await db.vaults.get(user.defaultVaultId);
        if (defaultVault) {
           const vaultKey = await cryptoUtils.unwrapVaultKey(defaultVault.wrappedVaultKey, defaultVault.vaultKeyNonce, oldMasterKey);
           const { wrappedKeyBase64, nonceBase64 } = await cryptoUtils.wrapVaultKey(vaultKey, newMasterKey);
           
           await db.vaults.update(defaultVault.id, {
              wrappedVaultKey: wrappedKeyBase64,
              vaultKeyNonce: nonceBase64,
              updatedAt: Date.now()
           });
        }
      }
    });

    // Update session if currently logged in
    sessionCryptoStore.setMasterKey(newMasterKey);
  }
};
