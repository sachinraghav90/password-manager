import { db } from '@vaultguard/db-local';
import { supabase } from '../supabase';

export interface AccessibleVaultRow {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  ownershipType: 'personal' | 'organization';
  ownerUserId: string | null;
  organizationId: string | null;
  wrappedVaultKey: string;
  vaultKeyNonce: string;
  encryptionVersion: number;
  createdAt: number;
  updatedAt: number;
  syncedAccess: true;
}

export class SyncService {
  /**
   * Returns only vaults Supabase exposes under the authenticated user's RLS
   * policies. Shared vault keys come from that user's vault_members row.
   */
  async getAccessibleVaults(userId: string): Promise<AccessibleVaultRow[]> {
    const { data: rows, error } = await supabase
      .from('vaults')
      .select('*')
      .is('deleted_at', null);

    if (error) throw error;

    const accessible: AccessibleVaultRow[] = [];
    for (const vault of rows || []) {
      if (
        vault.ownership_type === 'personal' &&
        vault.owner_user_id === userId
      ) {
        accessible.push({
          id: vault.id,
          name: 'Personal',
          description: 'Your default personal vault',
          createdBy: userId,
          ownershipType: 'personal',
          ownerUserId: userId,
          organizationId: vault.organization_id || null,
          wrappedVaultKey: vault.wrapped_vault_key,
          vaultKeyNonce: vault.vault_key_nonce,
          encryptionVersion: vault.encryption_version,
          createdAt: new Date(vault.created_at).getTime(),
          updatedAt: new Date(vault.updated_at).getTime(),
        syncedAccess: true
      });
        continue;
      }

      if (vault.ownership_type !== 'organization') continue;

      const { data: membership, error: membershipError } = await supabase
        .from('vault_members')
        .select('wrapped_vault_key, vault_key_nonce, role')
        .eq('vault_id', vault.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (membershipError || !membership) continue;

      accessible.push({
        id: vault.id,
        name: vault.name || 'Organization vault',
        description: vault.description || '',
        createdBy: vault.owner_user_id || userId,
        ownershipType: 'organization',
        ownerUserId: vault.owner_user_id || null,
        organizationId: vault.organization_id || null,
        wrappedVaultKey: membership.wrapped_vault_key,
        vaultKeyNonce: membership.vault_key_nonce,
        encryptionVersion: vault.encryption_version,
        createdAt: new Date(vault.created_at).getTime(),
        updatedAt: new Date(vault.updated_at).getTime(),
        syncedAccess: true
      });
    }

    return accessible;
  }

  /**
   * Syncs all accessible vaults and login indexes from Supabase to Dexie.
   * Authorization remains enforced by Supabase RLS and vault membership.
   */
  async sync(userId: string): Promise<void> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) return;

      const vaults = await this.getAccessibleVaults(userId);
      if (vaults.length === 0) return;

      const remoteByVault = new Map<string, { vault: AccessibleVaultRow; items: any[]; indices: any[] }>();
      for (const vault of vaults) {
        const [{ data: items, error: itemError }, { data: indices, error: indexError }] =
          await Promise.all([
            supabase.from('encrypted_items').select('*').eq('vault_id', vault.id).is('deleted_at', null),
            supabase.from('item_indexes').select('*').eq('vault_id', vault.id)
          ]);
        if (itemError || indexError || !items || !indices) continue;
        remoteByVault.set(vault.id, { vault, items, indices });
      }

      await db.users.put({
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        emailVerified: true,
        passwordHash: '',
        masterKeySalt: profile.master_key_salt,
        encryptionVersion: profile.encryption_version,
        createdAt: new Date(profile.created_at).getTime(),
        updatedAt: new Date(profile.updated_at).getTime()
      });

      await db.transaction(
        'rw',
        [db.vaults, db.pm_item_index, db.pm_logins, db.pm_secure_notes, db.pm_credit_cards, db.pm_identities],
        async () => {
          for (const { vault } of remoteByVault.values()) {
            await db.vaults.put(vault as any);
            const oldLogins = await db.pm_logins.where('vaultId').equals(vault.id).primaryKeys();
            await db.pm_logins.bulkDelete(oldLogins);
            const oldIndices = await db.pm_item_index.where('vaultId').equals(vault.id).primaryKeys();
            await db.pm_item_index.bulkDelete(oldIndices);

            for (const item of remoteByVault.get(vault.id)!.items) {
              if (item.item_type !== 'login') continue;
              await db.pm_logins.put({
                id: item.id,
                userId,
                vaultId: item.vault_id,
                favorite: false,
                createdAt: new Date(item.created_at).getTime(),
                updatedAt: new Date(item.updated_at).getTime(),
                encryptedData: item.encrypted_data,
                dataNonce: item.data_nonce,
                schemaVersion: item.schema_version
              });
            }

            for (const index of remoteByVault.get(vault.id)!.indices) {
              const item = remoteByVault.get(vault.id)!.items.find(candidate => candidate.id === index.item_id);
              if (!item) continue;
              await db.pm_item_index.put({
                indexId: index.id,
                itemId: index.item_id,
                userId,
                vaultId: index.vault_id,
                itemType: item.item_type,
                favorite: false,
                encryptedTitle: index.domain,
                titleNonce: '',
                createdAt: new Date(index.created_at).getTime(),
                updatedAt: new Date(index.created_at).getTime(),
                schemaVersion: 1
              });
            }
          }
        }
      );
    } catch {
      // Sync failures are surfaced by the caller as unavailable data; never log secrets.
    }
  }
}

export const syncService = new SyncService();






