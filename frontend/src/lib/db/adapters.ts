import { db } from './client';
import { ItemType, BaseItemRecord, PMItemIndex } from './schema';
import { cryptoUtils } from '../crypto/cryptoService';

export interface ItemOperationContext {
  userId: string;
  vaultId: string;
  vaultKey: CryptoKey;
}

export abstract class ItemTypeAdapter<TForm, TRecord extends BaseItemRecord, TDecrypted> {
  abstract readonly type: ItemType;
  abstract readonly tableName: string;

  validate(_form: TForm): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  async toEncryptedRecord(form: TForm, context: ItemOperationContext, id: string): Promise<TRecord> {
    const payloadStr = JSON.stringify(form);
    const { ciphertextBase64, nonceBase64 } = await cryptoUtils.encryptData(payloadStr, context.vaultKey);
    
    return {
      id,
      userId: context.userId,
      vaultId: context.vaultId,
      favorite: (form as any).favorite || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      encryptedData: ciphertextBase64,
      dataNonce: nonceBase64,
      schemaVersion: 1
    } as unknown as TRecord;
  }

  async fromEncryptedRecord(record: TRecord, context: ItemOperationContext): Promise<TDecrypted> {
    const payloadStr = await cryptoUtils.decryptData(record.encryptedData, record.dataNonce, context.vaultKey);
    const form = JSON.parse(payloadStr) as TForm;
    return {
      ...record,
      payload: form
    } as unknown as TDecrypted;
  }

  async create(form: TForm, context: ItemOperationContext): Promise<TDecrypted> {
    this.validate(form);
    const id = crypto.randomUUID();
    const record = await this.toEncryptedRecord(form, context, id);
    
    const title = (form as any).title || 'Untitled';
    const { ciphertextBase64: encryptedTitle, nonceBase64: titleNonce } = await cryptoUtils.encryptData(title, context.vaultKey);
    
    const indexEntry: PMItemIndex = {
      indexId: crypto.randomUUID(),
      itemId: id,
      userId: context.userId,
      vaultId: context.vaultId,
      itemType: this.type,
      favorite: record.favorite,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      encryptedTitle,
      titleNonce,
      schemaVersion: 1
    };

    await db.transaction('rw', [db.table(this.tableName), db.pm_item_index], async () => {
      await db.table(this.tableName).add(record);
      await db.pm_item_index.add(indexEntry);
    });

    return this.fromEncryptedRecord(record, context);
  }

  async update(id: string, form: TForm, context: ItemOperationContext): Promise<TDecrypted> {
    this.validate(form);
    
    return await db.transaction('rw', [db.table(this.tableName), db.pm_item_index], async () => {
      const existing = await db.table(this.tableName).get(id) as TRecord;
      if (!existing) throw new Error('Item not found');
      if (existing.userId !== context.userId || existing.vaultId !== context.vaultId) {
        throw new Error('Unauthorized');
      }

      const updatedRecord = await this.toEncryptedRecord(form, context, id);
      updatedRecord.createdAt = existing.createdAt; // preserve creation
      
      await db.table(this.tableName).put(updatedRecord);

      // Update index
      const indexEntry = await db.pm_item_index.where('itemId').equals(id).first();
      if (indexEntry) {
        const title = (form as any).title || 'Untitled';
        const { ciphertextBase64: encryptedTitle, nonceBase64: titleNonce } = await cryptoUtils.encryptData(title, context.vaultKey);
        
        await db.pm_item_index.update(indexEntry.indexId, {
          favorite: updatedRecord.favorite,
          updatedAt: updatedRecord.updatedAt,
          encryptedTitle,
          titleNonce
        });
      }

      return this.fromEncryptedRecord(updatedRecord, context);
    });
  }

  async delete(id: string, context: ItemOperationContext): Promise<void> {
    await db.transaction('rw', [db.table(this.tableName), db.pm_item_index, db.pm_attachments], async () => {
      const existing = await db.table(this.tableName).get(id) as TRecord;
      if (!existing) return;
      if (existing.userId !== context.userId || existing.vaultId !== context.vaultId) {
        throw new Error('Unauthorized');
      }

      await db.table(this.tableName).delete(id);
      
      const indexEntry = await db.pm_item_index.where('itemId').equals(id).first();
      if (indexEntry) {
        await db.pm_item_index.delete(indexEntry.indexId);
      }

      const attachments = await db.pm_attachments.where('ownerItemId').equals(id).toArray();
      for (const att of attachments) {
        await db.pm_attachments.delete(att.id);
      }
    });
  }
}

// ----------------------------------------------------------------------------
// Type-Specific Adapters
// ----------------------------------------------------------------------------

import { LoginFormState, LoginPayload } from '../models/loginTypes';
import { PMLogin } from './schema';

export class LoginAdapter extends ItemTypeAdapter<LoginFormState, PMLogin, PMLogin & { payload: LoginPayload }> {
  type: ItemType = 'login';
  tableName = 'pm_logins';

  validate(form: LoginFormState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!form.title?.trim()) errors.push('Title is required');
    // website URLs validation
    for (const w of form.websites || []) {
      if (w.url && !/^https?:\/\/.+/.test(w.url)) {
        errors.push(`Website URL "${w.url}" must start with http:// or https://`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Strips the 'favorite' field from the form before encryption
   * so only the payload fields enter encryptedData.
   */
  protected payloadFromForm(form: LoginFormState): LoginPayload {
    const { favorite: _fav, ...payload } = form;
    return payload;
  }

  async toEncryptedRecord(form: LoginFormState, context: ItemOperationContext, id: string): Promise<PMLogin> {
    const payload: LoginPayload = this.payloadFromForm(form);
    const payloadStr = JSON.stringify(payload);
    const { ciphertextBase64, nonceBase64 } = await cryptoUtils.encryptData(payloadStr, context.vaultKey);

    return {
      id,
      userId: context.userId,
      vaultId: context.vaultId,
      favorite: form.favorite || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      encryptedData: ciphertextBase64,
      dataNonce: nonceBase64,
      schemaVersion: 1,
    };
  }

  async fromEncryptedRecord(record: PMLogin, context: ItemOperationContext): Promise<PMLogin & { payload: LoginPayload }> {
    const payloadStr = await cryptoUtils.decryptData(record.encryptedData, record.dataNonce, context.vaultKey);
    const payload = JSON.parse(payloadStr) as LoginPayload;
    return { ...record, payload };
  }
}
export class SecureNoteAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'secure_note'; tableName = 'pm_secure_notes'; }
export class CreditCardAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'credit_card'; tableName = 'pm_credit_cards'; }
export class IdentityAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'identity'; tableName = 'pm_identities'; }
export class PasswordAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'password'; tableName = 'pm_passwords'; }
export class DocumentAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'document'; tableName = 'pm_documents'; }
export class ApiCredentialAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'api_credential'; tableName = 'pm_api_credentials'; }
export class BankAccountAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'bank_account'; tableName = 'pm_bank_accounts'; }
export class CryptoWalletAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'crypto_wallet'; tableName = 'pm_crypto_wallets'; }
export class DatabaseAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'database'; tableName = 'pm_databases'; }
export class DrivingLicenseAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'driving_license'; tableName = 'pm_driving_licenses'; }
export class EmailAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'email'; tableName = 'pm_emails'; }
export class MedicalRecordAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'medical_record'; tableName = 'pm_medical_records'; }
export class MembershipAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'membership'; tableName = 'pm_memberships'; }
export class OutdoorLicenseAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'outdoor_license'; tableName = 'pm_outdoor_licenses'; }
export class PassportAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'passport'; tableName = 'pm_passports'; }
export class RewardsAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'rewards'; tableName = 'pm_rewards'; }
export class SshKeyAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'ssh_key'; tableName = 'pm_ssh_keys'; }
export class ServerAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'server'; tableName = 'pm_servers'; }
export class SocialSecurityAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'ssn'; tableName = 'pm_social_security_numbers'; }
export class SoftwareLicenseAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'software_license'; tableName = 'pm_software_licenses'; }
export class WirelessRouterAdapter extends ItemTypeAdapter<any, any, any> { type: ItemType = 'wireless_router'; tableName = 'pm_wireless_routers'; }

export const adapterRegistry: Record<ItemType, ItemTypeAdapter<any, any, any>> = {
  login: new LoginAdapter(),
  secure_note: new SecureNoteAdapter(),
  credit_card: new CreditCardAdapter(),
  identity: new IdentityAdapter(),
  password: new PasswordAdapter(),
  document: new DocumentAdapter(),
  api_credential: new ApiCredentialAdapter(),
  bank_account: new BankAccountAdapter(),
  crypto_wallet: new CryptoWalletAdapter(),
  database: new DatabaseAdapter(),
  driving_license: new DrivingLicenseAdapter(),
  email: new EmailAdapter(),
  medical_record: new MedicalRecordAdapter(),
  membership: new MembershipAdapter(),
  outdoor_license: new OutdoorLicenseAdapter(),
  passport: new PassportAdapter(),
  rewards: new RewardsAdapter(),
  ssh_key: new SshKeyAdapter(),
  server: new ServerAdapter(),
  ssn: new SocialSecurityAdapter(),
  software_license: new SoftwareLicenseAdapter(),
  wireless_router: new WirelessRouterAdapter(),
};
