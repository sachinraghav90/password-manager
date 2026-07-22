import { db } from '@vaultguard/db-local';
import { User, Vault, Settings } from '@vaultguard/models';
import { cryptoUtils, sessionCryptoStore } from '@vaultguard/crypto';
import { SupabaseSyncEngine } from '@vaultguard/sync-supabase';
import { createClient } from '@supabase/supabase-js';

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
  async register(fullName: string, email: string, masterPassword: string, supabaseUrl?: string, supabaseKey?: string) {
    const existing = await db.users.where('email').equalsIgnoreCase(email).first();
    if (existing) {
      throw new Error('Email already registered');
    }

    const url = supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || 'https://missing.supabase.co';
    const key = supabaseKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'missing';
    const supabase = createClient(url, key);

    // 1. Authenticate with Supabase Auth
    let authData;
    const { data: supaAuthData, error: supaAuthError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: masterPassword,
    });
    
    if (supaAuthError) {
      throw new Error(`Registration failed: ${supaAuthError.message}`);
    }
    
    authData = supaAuthData;

    // 2. Cryptography Setup
    const salt = cryptoUtils.generateSalt();
    const masterKey = await cryptoUtils.deriveMasterKey(masterPassword, salt);
    
    // Fast validation check
    const passwordHash = await hashPassword(masterPassword, salt);
    
    // Generate Vault and Vault Key
    const userId = authData.user!.id;
    const vaultId = generateUUID();
    
    const vaultKey = await cryptoUtils.generateVaultKey();
    const { wrappedKeyBase64, nonceBase64 } = await cryptoUtils.wrapVaultKey(vaultKey, masterKey);

    // 3. Create profile in Supabase
    await supabase.from('profiles').insert({
      id: userId,
      full_name: fullName,
      email: email.toLowerCase(),
      master_key_salt: salt,
      encryption_version: 'PBKDF2-AES256GCM'
    });

    // 4. Create Vault in Supabase
    await supabase.from('vaults').insert({
      id: vaultId,
      owner_user_id: userId,
      ownership_type: 'personal',
      wrapped_vault_key: wrappedKeyBase64,
      vault_key_nonce: nonceBase64,
      encryption_version: 1
    });

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
      encryptionVersion: 1,
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

    // 5. Sync to Extension (Development)
    try { window.postMessage({ type: 'VG_DEV_SYNC', user, vault: defaultVault }, '*'); } catch (e) {}

    return user;
  },

  async login(email: string, masterPassword: string, supabaseUrl?: string, supabaseKey?: string) {
    const localUser = await db.users.where('email').equalsIgnoreCase(email).first();
    let profile = null;
    let userId = '';

    const url = supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || 'https://missing.supabase.co';
    const key = supabaseKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'missing';
    const supabase = createClient(url, key);

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: masterPassword
    });

    if (authError) {
      // ── LAZY MIGRATION TRIGGER ──
      // If Supabase login failed (e.g. Invalid Login Credentials) BUT user exists locally with correct password
      if (localUser && authError.message.toLowerCase().includes('invalid login credentials')) {
        const localHash = await hashPassword(masterPassword, localUser.masterKeySalt);
        if (localHash === localUser.passwordHash) {
          // Password is correct locally! We must migrate them to Supabase!
          console.log('Migrating local user to Supabase...');
          
          // 1. Sign them up on Supabase
          const { data: supaAuthData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: masterPassword
          });
          
          if (signUpError) throw new Error('Migration failed during sign up: ' + signUpError.message);
          
          userId = supaAuthData.user!.id;

          // 2. Insert Profile
          await supabase.from('profiles').insert({
            id: userId,
            full_name: localUser.fullName,
            email: localUser.email,
            master_key_salt: localUser.masterKeySalt,
            encryption_version: localUser.encryptionVersion
          });

          // 3. Migrate Vaults and Items
          const localVaults = await db.vaults.where('createdBy').equals(localUser.id).toArray();
          const localItems = await db.items.toArray(); // Assume all for now

          const _syncEngine = new SupabaseSyncEngine(url, key);

          // We'll construct a massive push manually or use pushChanges when implemented.
          // For now, insert directly to supabase since we have the client here.
          for (const v of localVaults) {
            await supabase.from('vaults').insert({
              id: v.id,
              owner_user_id: userId,
              ownership_type: v.ownershipType || 'personal',
              wrapped_vault_key: v.wrappedVaultKey,
              vault_key_nonce: v.vaultKeyNonce,
              encryption_version: 1
            });
          }

          for (const i of localItems) {
            await supabase.from('encrypted_items').insert({
              id: i.id,
              vault_id: i.vaultId,
              item_type: i.type,
              encrypted_data: i.encryptedData,
              data_nonce: i.dataNonce,
              encryption_version: 1
            });
          }
          
          // Update local DB to map new userId
          localUser.id = userId;
          await db.users.put(localUser);

          profile = { id: userId, master_key_salt: localUser.masterKeySalt };
        } else {
          throw new Error('Invalid email or password');
        }
      } else {
        throw new Error(authError.message);
      }
    } else {
      userId = authData.user!.id;
      // Fetch Profile
      const { data: prof, error: profError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profError) {
        if (profError.code === 'PGRST116' && localUser) {
          // Half-migrated state detected! User exists in Auth but has no profile/vaults.
          console.log('Half-migrated state detected. Resuming migration...');
          
          await supabase.from('profiles').insert({
            id: userId,
            full_name: localUser.fullName,
            email: localUser.email,
            master_key_salt: localUser.masterKeySalt,
            encryption_version: localUser.encryptionVersion
          });

          const localVaults = await db.vaults.where('createdBy').equals(localUser.id).toArray();
          const localItems = await db.items.toArray();

          for (const v of localVaults) {
            await supabase.from('vaults').insert({
              id: v.id,
              owner_user_id: userId,
              ownership_type: v.ownershipType || 'personal',
              wrapped_vault_key: v.wrappedVaultKey,
              vault_key_nonce: v.vaultKeyNonce,
              encryption_version: 1
            });
          }

          for (const i of localItems) {
            await supabase.from('encrypted_items').insert({
              id: i.id,
              vault_id: i.vaultId,
              item_type: i.type,
              encrypted_data: i.encryptedData,
              data_nonce: i.dataNonce,
              encryption_version: 1
            });
          }
          
          localUser.id = userId;
          await db.users.put(localUser);
          profile = { id: userId, master_key_salt: localUser.masterKeySalt };
        } else {
          throw profError;
        }
      } else {
        profile = prof;
      }
    }

    if (!profile) throw new Error('Profile missing');

    // 2. Derive Master Key
    const masterKey = await cryptoUtils.deriveMasterKey(masterPassword, profile.master_key_salt);

    // 3. Update / Sync Local DB with Cloud
    if (localUser && localUser.id !== userId) {
      const oldId = localUser.id;
      try {
        const vaultsCreated = await db.vaults.where('createdBy').equals(oldId).toArray();
        for (const v of vaultsCreated) { v.createdBy = userId; v.ownerUserId = userId; await db.vaults.put(v); }

        const vaultsOwned = await db.vaults.filter(v => v.ownerUserId === oldId).toArray();
        for (const v of vaultsOwned) { v.ownerUserId = userId; await db.vaults.put(v); }

        const orgsAdmin = await db.organizations.where('adminUserId').equals(oldId).toArray();
        for (const o of orgsAdmin) { o.adminUserId = userId; o.createdByUserId = userId; await db.organizations.put(o); }

        const orgsCreated = await db.organizations.filter(o => o.createdByUserId === oldId).toArray();
        for (const o of orgsCreated) { o.createdByUserId = userId; await db.organizations.put(o); }

        const memberships = await db.organization_memberships.where('userId').equals(oldId).toArray();
        for (const m of memberships) { m.userId = userId; await db.organization_memberships.put(m); }

        const roles = await db.platform_role_assignments.where('userId').equals(oldId).toArray();
        for (const r of roles) { r.userId = userId; await db.platform_role_assignments.put(r); }
        
        const oldSettings = await db.settings.get(oldId);
        if (oldSettings) {
          oldSettings.userId = userId;
          await db.settings.put(oldSettings);
          await db.settings.delete(oldId);
        }

        await db.users.delete(oldId);
      } catch (err) {
        console.error('Failed to cascade local ID change', err);
      }
    }

    const localUserUpdated: User = {
      ...localUser,
      id: userId,
      fullName: profile.full_name || localUser?.fullName || 'User',
      email: email,
      emailVerified: true,
      passwordHash: '', // Clear it!
      masterKeySalt: profile.master_key_salt,
      encryptionVersion: profile.encryption_version,
      createdAt: localUser?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await db.users.put(localUserUpdated);

    // Fetch primary vault (let RLS filter by ownership and access)
    const { data: vaults, error: vaultsError } = await supabase.from('vaults').select('*');
    if (vaultsError) console.error('Error fetching vaults:', vaultsError);

    // Only unwrap and cache if they actually have a personal vault
    if (vaults && vaults.length > 0) {
      const primaryVault = vaults[0];
      
      // 4. Unwrap Vault Key
      let vaultKey;
      try {
        vaultKey = await cryptoUtils.unwrapVaultKey(primaryVault.wrapped_vault_key, primaryVault.vault_key_nonce, masterKey);
        // 5. Cache Keys
        sessionCryptoStore.setVaultKey(primaryVault.id, vaultKey);
      } catch (err) {
        console.error('Failed to decrypt primary vault key');
      }
    }

    sessionCryptoStore.setMasterKey(masterKey);

    return localUserUpdated;
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
