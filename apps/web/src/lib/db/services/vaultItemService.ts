import { db } from '@vaultguard/db-local';
import { ItemType, PMAttachment, normalizeLoginWebsites } from '@vaultguard/models';
import { ITEM_REGISTRY } from '@vaultguard/ui';
import { cryptoUtils, sessionCryptoStore, base64ToBuffer, bufferToBase64 } from '@vaultguard/crypto';
import { adapterRegistry, ItemOperationContext } from '@vaultguard/db-local';
import { authService } from '@vaultguard/auth';
import { authorizationService } from '@vaultguard/permissions';
import { triggerDevSync } from '../../../store/useAuthStore';

export interface VaultItemListEntry {
  id: string;
  userId: string;
  vaultId: string;
  itemType: ItemType;
  titlePreview: string; // Decrypted title
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  hasAttachments: boolean;
}

export const vaultItemService = {
  getVaultKey(vaultId: string): CryptoKey {
    try {
      return sessionCryptoStore.getVaultKey(vaultId);
    } catch (error) {
      throw new Error(`Vault ${vaultId} is locked or missing key.`);
    }
  },

  async assertItemAccess(userId: string, vaultId: string, permission: string, itemId?: string): Promise<void> {
    const vault = await db.vaults.get(vaultId);
    if (!vault) throw new Error('Vault not found');

    if (vault.ownershipType === 'organization') {
      await authorizationService.assertCanPerform(userId, permission as any, {
        resourceType: 'item',
        resourceId: itemId,
        vaultId: vaultId,
        organizationId: vault.organizationId!
      });
    } else {
      if (vault.ownerUserId !== userId) throw new Error('Unauthorized access to personal vault');
    }
  },

  /**
   * One-time migration: pushes all local items that are not yet in Supabase.
   * Runs on web app startup after unlock. Safe to call repeatedly.
   */
  async pushAllToSupabase(_userId: string, vaultId: string): Promise<void> {
    try {
      // Only sync vaults that exist remotely. RLS remains the authority for access.
      const { data: remoteVault } = await (authService as any).supabase
        .from('vaults')
        .select('id')
        .eq('id', vaultId)
        .maybeSingle();
      if (!remoteVault) return;

      const vault = await db.vaults.get(vaultId);
      if (!vault) return;

      const key = this.getVaultKey(vaultId);
      const logins = await db.pm_logins.where('vaultId').equals(vaultId).toArray();
      const indices = await db.pm_item_index.where('vaultId').equals(vaultId).toArray();

      if (logins.length === 0) return;

      console.log(`[WebApp] Migrating ${logins.length} local items to Supabase...`);

      for (const login of logins) {
        const indexRecord = indices.find(i => i.itemId === login.id);

        // Decrypt payload to extract domain for item_indexes and backfill websites array
        let domain = 'unknown';
        let modified = false;
        let payloadStr = '';
        try {
          payloadStr = await cryptoUtils.decryptData(login.encryptedData, login.dataNonce, key);
          const payload = JSON.parse(payloadStr);
          const websites = normalizeLoginWebsites(payload);
          if (JSON.stringify(payload.websites || []) !== JSON.stringify(websites)) {
            payload.websites = websites;
            modified = true;
          }
          
          if (payload.websites && payload.websites.length > 0) {
            domain = payload.websites[0].url;
          } else if (payload.website) {
            domain = payload.website;
          }
          
          try { domain = new URL(domain.includes('://') ? domain : 'https://' + domain).hostname.replace(/^www\./, ''); } catch (e) {}

          // If we added websites array, re-encrypt before pushing
          if (modified) {
            const newPayloadStr = JSON.stringify(payload);
            const { ciphertextBase64, nonceBase64 } = await cryptoUtils.encryptData(newPayloadStr, key);
            login.encryptedData = ciphertextBase64;
            login.dataNonce = nonceBase64;
            // Also update local DB
            await db.pm_logins.update(login.id, { encryptedData: ciphertextBase64, dataNonce: nonceBase64 });
          }
        } catch (e) {}

        // Push encrypted item to Supabase
        await (authService as any).supabase.from('encrypted_items').upsert({
          id: login.id,
          vault_id: login.vaultId,
          item_type: 'login',
          encrypted_data: login.encryptedData,
          data_nonce: login.dataNonce,
          encryption_version: login.schemaVersion || 1,
          schema_version: login.schemaVersion || 1,
          record_version: 1,
          created_at: new Date(login.createdAt).toISOString(),
          updated_at: new Date(login.updatedAt).toISOString()
        });

        // Push index entry
        if (indexRecord) {
          await (authService as any).supabase.from('item_indexes').upsert({
            id: indexRecord.indexId,
            item_id: indexRecord.itemId,
            vault_id: indexRecord.vaultId,
            domain: domain,
            created_at: new Date(indexRecord.createdAt).toISOString()
          });
        }
      }

      console.log(`[WebApp] Migration complete â€” ${logins.length} items pushed to Supabase.`);
    } catch (err) {
      console.error('[WebApp] pushAllToSupabase failed', err);
    }
  },

  async runV2MigrationIfNeeded(userId: string, vaultId: string) {
    const legacyItems = await db.items.where('vaultId').equals(vaultId).toArray();
    if (legacyItems.length === 0) return; // Nothing to migrate or already migrated

    // We only migrate if we haven't already moved them. We can check if any index entries exist for this vault.
    const existingIndex = await db.pm_item_index.where('vaultId').equals(vaultId).first();
    if (existingIndex) return; // Assumed migrated

    console.log(`Migrating ${legacyItems.length} legacy items to V2...`);
    const key = this.getVaultKey(vaultId);
    const context: ItemOperationContext = { userId, vaultId, vaultKey: key };

    for (const item of legacyItems) {
      // Create login form payload from legacy item
      try {
        const jsonPayload = await cryptoUtils.decryptData(item.encryptedData, item.dataNonce, key);
        const payload = JSON.parse(jsonPayload);
        
        const loginForm = {
          title: item.title,
          ...payload,
          favorite: item.favorite
        };

        const adapter = adapterRegistry['login'];
        await adapter.create(loginForm, context);
      } catch (err) {
        console.error('Failed to migrate item', item.id, err);
      }
    }
    
    // Push to extension
    triggerDevSync();
  },

  async getAttachmentOwnerIds(userId: string): Promise<Set<string>> {
    const attachments = await db.pm_attachments.where('userId').equals(userId).toArray();
    const set = new Set<string>();
    for (const att of attachments) {
      set.add(att.ownerItemId);
    }
    return set;
  },

  async getListEntries(userId: string, vaultId?: string, abortSignal?: AbortSignal, onBatch?: (batch: VaultItemListEntry[]) => void): Promise<VaultItemListEntry[]> {
    if (vaultId) {
      await this.runV2MigrationIfNeeded(userId, vaultId);
    }

    let indexRecords = [];
    if (vaultId) {
      indexRecords = await db.pm_item_index.where('vaultId').equals(vaultId).toArray();
    } else {
      indexRecords = await db.pm_item_index.where('userId').equals(userId).toArray();
    }
    
    const userRecords = indexRecords.filter(r => r.userId === userId);
    const attachmentOwnerIds = await this.getAttachmentOwnerIds(userId);
    
    const entries: VaultItemListEntry[] = [];
    
    const BATCH_SIZE = 50;
    
    // Group by vaultId to reuse keys efficiently
    const byVault = new Map<string, typeof userRecords>();
    for (const record of userRecords) {
      if (!byVault.has(record.vaultId)) {
        byVault.set(record.vaultId, []);
      }
      byVault.get(record.vaultId)!.push(record);
    }

    for (const [vId, records] of byVault.entries()) {
      if (abortSignal?.aborted) throw new Error('Aborted');
      
      let key: CryptoKey | null = null;
      try {
        key = this.getVaultKey(vId);
      } catch (e) {
        console.warn('Skipping vault due to missing key', vId);
        continue;
      }

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        if (abortSignal?.aborted) throw new Error('Aborted');
        
        const batch = records.slice(i, i + BATCH_SIZE);
        const batchEntries: VaultItemListEntry[] = [];
        
        for (const record of batch) {
          try {
            const titlePreview = await cryptoUtils.decryptData(record.encryptedTitle, record.titleNonce, key!);
            batchEntries.push({
              id: record.itemId,
              userId: record.userId,
              vaultId: record.vaultId,
              itemType: record.itemType,
              titlePreview,
              favorite: record.favorite,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
              lastAccessedAt: record.lastAccessedAt,
              hasAttachments: attachmentOwnerIds.has(record.itemId)
            });
          } catch (e) {
            console.error('Failed to decrypt title for index', record.indexId);
          }
        }
        
        entries.push(...batchEntries);
        if (onBatch && batchEntries.length > 0) {
          onBatch(batchEntries);
        }
        
        // Yield to event loop to avoid freezing UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async deepSearchPayloads(userId: string, itemsToSearch: VaultItemListEntry[], query: string, abortSignal?: AbortSignal, onMatch?: (itemId: string) => void): Promise<string[]> {
    const matchedIds: string[] = [];
    const lowerQ = query.toLocaleLowerCase();
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < itemsToSearch.length; i += BATCH_SIZE) {
      if (abortSignal?.aborted) throw new Error('Aborted');
      
      const batch = itemsToSearch.slice(i, i + BATCH_SIZE);
      
      for (const item of batch) {
        if (abortSignal?.aborted) throw new Error('Aborted');
        
        try {
          const adapter = adapterRegistry[item.itemType];
          if (!adapter) continue;
          
          const record = await db.table(adapter.tableName).get(item.id);
          if (!record) continue;
          
          let key: CryptoKey | null = null;
          try {
             key = this.getVaultKey(item.vaultId);
          } catch (e) {
             continue; // Skip if locked
          }
          
          const context: ItemOperationContext = { userId, vaultId: item.vaultId, vaultKey: key! };
          const details = await adapter.fromEncryptedRecord(record, context);
          const payload = details.payload;
          
          const config = ITEM_REGISTRY[item.itemType];
          const searchableFields = config?.searchablePayloadFields || [];
          
          let isMatch = false;
          
          for (const field of searchableFields) {
            const val = payload[field];
            if (typeof val === 'string' && val.toLocaleLowerCase().includes(lowerQ)) {
              isMatch = true;
              break;
            }
          }
          
          // Also search commonFields if present
          if (!isMatch && Array.isArray(payload.commonFields)) {
            for (const f of payload.commonFields) {
              if (f.fieldType !== 'password' && typeof f.fieldValue === 'string') {
                if (f.fieldValue.toLocaleLowerCase().includes(lowerQ)) {
                  isMatch = true;
                  break;
                }
              }
            }
          }
          
          if (isMatch) {
            matchedIds.push(item.id);
            if (onMatch) onMatch(item.id);
          }
          
        } catch (err) {
          console.error('Deep search failed for item', item.id, err);
        }
      }
      // Yield
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return matchedIds;
  },

  async getItemDetails(userId: string, vaultId: string, itemId: string, itemType: ItemType): Promise<any> {
    await this.assertItemAccess(userId, vaultId, 'items.view', itemId);

    const adapter = adapterRegistry[itemType];
    if (!adapter) throw new Error(`Unknown item type: ${itemType}`);

    const record = await db.table(adapter.tableName).get(itemId);
    if (!record) throw new Error('Item not found');

    const key = this.getVaultKey(vaultId);
    const context: ItemOperationContext = { userId, vaultId, vaultKey: key };

    const details = await adapter.fromEncryptedRecord(record, context);

    // Update last accessed
    await this.updateItemAccess(userId, vaultId, itemId);

    // Fetch attachments if any
    const attachments = await db.pm_attachments.where('ownerItemId').equals(itemId).toArray();
    if (attachments.length > 0) {
      details.attachments = {};
      for (const att of attachments) {
        const metadataJson = await cryptoUtils.decryptData(att.encryptedMetadata, att.metadataNonce, key);
        const metadata = JSON.parse(metadataJson);
        details.attachments[metadata.fieldName] = {
          id: att.id,
          metadata
        };
      }
    }
    return details;
  },

  async downloadAttachment(userId: string, vaultId: string, attachmentId: string): Promise<{ blob: Blob, fileName: string, mimeType: string }> {
    const att = await db.pm_attachments.get(attachmentId);
    if (!att || att.vaultId !== vaultId) throw new Error('Attachment not found or unauthorized');

    // For attachments, we check attachments.download but also need to know it's an org vault
    const vault = await db.vaults.get(vaultId);
    if (!vault) throw new Error('Vault not found');
    if (vault.ownershipType === 'organization') {
      await authorizationService.assertCanPerform(userId, 'attachments.download', {
        resourceType: 'attachment',
        resourceId: attachmentId,
        vaultId,
        itemId: att.ownerItemId,
        organizationId: vault.organizationId!
      });
    } else {
      if (vault.ownerUserId !== userId) throw new Error('Unauthorized');
    }

    const vaultKey = this.getVaultKey(vaultId);
    const metadataJson = await cryptoUtils.decryptData(att.encryptedMetadata, att.metadataNonce, vaultKey);
    const metadata = JSON.parse(metadataJson);

    // Unwrap file key
    const wrappedKeyBuffer = base64ToBuffer(att.wrappedFileKey);
    const rawFileKey = await cryptoUtils.decryptBuffer(wrappedKeyBuffer, att.fileKeyNonce, vaultKey);
    const fileKey = await window.crypto.subtle.importKey('raw', rawFileKey, 'AES-GCM', true, ['encrypt', 'decrypt']);

    // Decrypt content
    const decryptedBuffer = await cryptoUtils.decryptBuffer(att.encryptedBlob, att.contentNonce, fileKey);

    return {
      blob: new Blob([decryptedBuffer], { type: metadata.mimeType }),
      fileName: metadata.fileName,
      mimeType: metadata.mimeType
    };
  },

  async createItem(userId: string, vaultId: string, itemType: ItemType, form: any): Promise<any> {
    await this.assertItemAccess(userId, vaultId, 'items.create');

    const adapter = adapterRegistry[itemType];
    const key = this.getVaultKey(vaultId);
    const context: ItemOperationContext = { userId, vaultId, vaultKey: key };

    const fileFields = this.extractFileFields(itemType, form);
    const item = await adapter.create(form, context);
    await this.processAttachments(userId, vaultId, item.id, itemType, fileFields);
    
    // Push to Supabase
    try {
      const record = await db.table(adapter.tableName).get(item.id);
      const indexRecord = await db.pm_item_index.where('itemId').equals(item.id).first();
      
      if (record && indexRecord) {
        // Push encrypted item
        await (authService as any).supabase.from('encrypted_items').upsert({
          id: record.id,
          vault_id: record.vaultId,
          item_type: itemType,
          encrypted_data: record.encryptedData,
          data_nonce: record.dataNonce,
          encryption_version: record.schemaVersion || 1,
          schema_version: record.schemaVersion || 1,
          record_version: 1,
          created_at: new Date(record.createdAt).toISOString(),
          updated_at: new Date(record.updatedAt).toISOString()
        });

        // Push item index (domain)
        // Extract domain from payload if login
        let domain = 'unknown';
        try {
           const payloadStr = await cryptoUtils.decryptData(record.encryptedData, record.dataNonce, key);
           const payload = JSON.parse(payloadStr);
           if (itemType === 'login') {
             const websites = payload.websites || [];
             if (websites.length > 0) domain = websites[0].url;
             else if (payload.website) domain = payload.website;
             // clean domain
             try { domain = new URL(domain.includes('://') ? domain : 'https://' + domain).hostname.replace(/^www\./, ''); } catch(e){}
           } else {
             domain = itemType;
           }
        } catch (e) {}

        await (authService as any).supabase.from('item_indexes').upsert({
          id: indexRecord.indexId,
          item_id: indexRecord.itemId,
          vault_id: indexRecord.vaultId,
          domain: domain,
          created_at: new Date(indexRecord.createdAt).toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to push created item to Supabase', err);
    }
    
    // Push to extension
    triggerDevSync();
    
    return item;
  },

  async updateItem(userId: string, vaultId: string, itemId: string, itemType: ItemType, form: any): Promise<any> {
    await this.assertItemAccess(userId, vaultId, 'items.edit', itemId);

    const adapter = adapterRegistry[itemType];
    const key = this.getVaultKey(vaultId);
    const context: ItemOperationContext = { userId, vaultId, vaultKey: key };
    
    const fileFields = this.extractFileFields(itemType, form);
    const item = await adapter.update(itemId, form, context);
    await this.processAttachments(userId, vaultId, item.id, itemType, fileFields);
    
    // Push to Supabase
    try {
      const record = await db.table(adapter.tableName).get(item.id);
      const indexRecord = await db.pm_item_index.where('itemId').equals(item.id).first();
      
      if (record && indexRecord) {
        await (authService as any).supabase.from('encrypted_items').upsert({
          id: record.id,
          vault_id: record.vaultId,
          item_type: itemType,
          encrypted_data: record.encryptedData,
          data_nonce: record.dataNonce,
          encryption_version: record.schemaVersion || 1,
          schema_version: record.schemaVersion || 1,
          record_version: 1,
          updated_at: new Date(record.updatedAt).toISOString()
        });

        let domain = 'unknown';
        try {
           const payloadStr = await cryptoUtils.decryptData(record.encryptedData, record.dataNonce, key);
           const payload = JSON.parse(payloadStr);
           if (itemType === 'login') {
             const websites = payload.websites || [];
             if (websites.length > 0) domain = websites[0].url;
             else if (payload.website) domain = payload.website;
             try { domain = new URL(domain.includes('://') ? domain : 'https://' + domain).hostname.replace(/^www\./, ''); } catch(e){}
           } else {
             domain = itemType;
           }
        } catch (e) {}

        await (authService as any).supabase.from('item_indexes').upsert({
          id: indexRecord.indexId,
          item_id: indexRecord.itemId,
          vault_id: indexRecord.vaultId,
          domain: domain
        });
      }
    } catch (err) {
      console.error('Failed to push updated item to Supabase', err);
    }
    
    // Push to extension
    triggerDevSync();
    
    return item;
  },

  extractFileFields(itemType: ItemType, form: any) {
    const fileFields: { name: string, file: File }[] = [];
    const config = ITEM_REGISTRY[itemType];
    if (config) {
      for (const field of config.fields) {
        if (field.type === 'file' && form[field.name] instanceof File) {
          fileFields.push({ name: field.name, file: form[field.name] });
          delete form[field.name]; // Remove from form so it doesn't get serialized in payload
        }
      }
    }
    return fileFields;
  },

  async processAttachments(userId: string, vaultId: string, itemId: string, itemType: ItemType, fileFields: { name: string, file: File }[]) {
    if (fileFields.length > 0) {
      const vault = await db.vaults.get(vaultId);
      if (vault?.ownershipType === 'organization') {
        await authorizationService.assertCanPerform(userId, 'attachments.upload', {
          resourceType: 'attachment',
          vaultId,
          itemId,
          organizationId: vault.organizationId!
        });
      }
    }

    for (const { name, file } of fileFields) {
      if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit');

      const allAttachments = await db.pm_attachments.where('userId').equals(userId).toArray();
      let totalSize = 0;
      for (const att of allAttachments) {
        totalSize += att.encryptedBlob.byteLength;
      }
      if (totalSize + file.size > 25 * 1024 * 1024) throw new Error('User quota of 25MB exceeded');

      const vaultKey = this.getVaultKey(vaultId);
      const fileKey = await cryptoUtils.generateFileKey();

      const arrayBuffer = await file.arrayBuffer();
      const { ciphertext, nonceBase64: contentNonce } = await cryptoUtils.encryptBuffer(arrayBuffer, fileKey);

      const rawFileKey = await window.crypto.subtle.exportKey('raw', fileKey);
      const { ciphertext: wrappedFileKeyBuffer, nonceBase64: fileKeyNonce } = await cryptoUtils.encryptBuffer(rawFileKey, vaultKey);
      const wrappedFileKey = bufferToBase64(wrappedFileKeyBuffer);

      const metadata = JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size, fieldName: name });
      const { ciphertextBase64: encryptedMetadata, nonceBase64: metadataNonce } = await cryptoUtils.encryptData(metadata, vaultKey);

      const att: PMAttachment = {
        id: crypto.randomUUID(),
        userId,
        vaultId,
        ownerItemId: itemId,
        ownerItemType: itemType,
        encryptedMetadata,
        metadataNonce,
        encryptedBlob: ciphertext,
        wrappedFileKey,
        fileKeyNonce,
        contentNonce,
        encryptionVersion: 'AES256GCM',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Delete existing attachment for this field if it exists
      const existingAtts = await db.pm_attachments.where('ownerItemId').equals(itemId).toArray();
      for (const existing of existingAtts) {
        const metaJson = await cryptoUtils.decryptData(existing.encryptedMetadata, existing.metadataNonce, vaultKey);
        const meta = JSON.parse(metaJson);
        if (meta.fieldName === name) {
          await db.pm_attachments.delete(existing.id);
        }
      }

      await db.pm_attachments.add(att);
    }
  },

  async deleteItem(userId: string, vaultId: string, itemId: string, itemType: ItemType): Promise<void> {
    await this.assertItemAccess(userId, vaultId, 'items.delete', itemId);

    const adapter = adapterRegistry[itemType];
    const key = this.getVaultKey(vaultId);
    const context: ItemOperationContext = { userId, vaultId, vaultKey: key };
    await adapter.delete(itemId, context);
    
    // Push to extension
    triggerDevSync();
  },

  async toggleFavorite(userId: string, vaultId: string, itemId: string, itemType: ItemType, favorite: boolean): Promise<void> {
    const adapter = adapterRegistry[itemType];
    
    await db.transaction('rw', [db.table(adapter.tableName), db.pm_item_index], async () => {
      const record = await db.table(adapter.tableName).get(itemId);
      if (!record || record.userId !== userId || record.vaultId !== vaultId) throw new Error('Unauthorized');
      
      await db.table(adapter.tableName).update(itemId, { favorite, updatedAt: Date.now() });
      
      const indexRecord = await db.pm_item_index.where('itemId').equals(itemId).first();
      if (indexRecord) {
        await db.pm_item_index.update(indexRecord.indexId, { favorite, updatedAt: Date.now() });
      }
    });
  },

  async updateItemAccess(userId: string, vaultId: string, itemId: string): Promise<void> {
    const indexRecord = await db.pm_item_index.where('itemId').equals(itemId).first();
    if (indexRecord && indexRecord.userId === userId && indexRecord.vaultId === vaultId) {
      await db.pm_item_index.update(indexRecord.indexId, { lastAccessedAt: Date.now() });
    }
  },

  async runLegacyItemRepair(userId: string) {
    const user = await db.users.get(userId);
    if (!user || !user.defaultVaultId) return;

    const allItems = await db.items.toArray(); // Need all items to find legacy ones without proper index or vault
    for (const item of allItems) {
      // Find items that somehow lack vaultId or don't have an index
      let needsRepair = false;
      let targetVaultId = item.vaultId;

      if (!item.vaultId) {
        needsRepair = true;
        targetVaultId = user.defaultVaultId;
      }

      const indexRecord = await db.pm_item_index.where('itemId').equals(item.id).first();
      if (!indexRecord) {
        needsRepair = true;
      }

      if (needsRepair) {
        try {
          console.log('Repairing item', item.id);
          // Just assign to default vault, we won't re-encrypt it here to avoid key mixing if it used a different key.
          // But since legacy items were encrypted with MasterKey or default VaultKey, it's safer to just set vaultId.
          if (!item.vaultId) {
             await db.items.update(item.id, { vaultId: targetVaultId });
          }
          await this.runV2MigrationIfNeeded(userId, targetVaultId);
        } catch (err) {
          console.error('Failed to repair item', item.id, err);
        }
      }
    }
  }
};



