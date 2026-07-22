import Dexie, { Table } from 'dexie';
import { User, Vault, Settings, VaultItem } from '@vaultguard/models';

export class VaultGuardDB extends Dexie {
  users!: Table<User, string>;
  vaults!: Table<Vault, string>;
  settings!: Table<Settings, string>;
  items!: Table<VaultItem, string>; // legacy items

  // Version 2+ Architecture
  pm_item_index!: Table<any, string>;
  pm_attachments!: Table<any, string>;
  pm_logins!: Table<any, string>;
  pm_secure_notes!: Table<any, string>;
  pm_credit_cards!: Table<any, string>;
  pm_identities!: Table<any, string>;
  pm_passwords!: Table<any, string>;
  pm_documents!: Table<any, string>;
  pm_api_credentials!: Table<any, string>;
  pm_bank_accounts!: Table<any, string>;
  pm_crypto_wallets!: Table<any, string>;
  pm_databases!: Table<any, string>;
  pm_driving_licenses!: Table<any, string>;
  pm_emails!: Table<any, string>;
  pm_medical_records!: Table<any, string>;
  pm_memberships!: Table<any, string>;
  pm_outdoor_licenses!: Table<any, string>;
  pm_passports!: Table<any, string>;
  pm_rewards!: Table<any, string>;
  pm_ssh_keys!: Table<any, string>;
  pm_servers!: Table<any, string>;
  pm_social_security_numbers!: Table<any, string>;
  pm_software_licenses!: Table<any, string>;
  pm_wireless_routers!: Table<any, string>;

  // Version 3 Architecture (Organizations & Account Types)
  platform_role_assignments!: Table<any, string>;
  organizations!: Table<any, string>;
  organization_memberships!: Table<any, string>;
  organization_invitations!: Table<any, string>;
  organization_usage!: Table<any, string>;
  organization_settings!: Table<any, string>;
  plans!: Table<any, string>;
  subscriptions!: Table<any, string>;
  audit_events!: Table<any, string>;
  organization_domains!: Table<any, string>;
  permission_profiles!: Table<any, string>;

  // Version 8 Architecture (Teams & Sharing Policies)
  organization_teams!: Table<any, string>;
  organization_team_memberships!: Table<any, string>;
  organization_sharing_policies!: Table<any, string>;
  vault_sharing_policies!: Table<any, string>;
  item_sharing_policies!: Table<any, string>;
  share_requests!: Table<any, string>;
  share_grants!: Table<any, string>;

  constructor() {
    super('VaultGuardDB');
    this.version(1).stores({
      users: 'id, email',
      vaults: 'id, createdBy',
      settings: 'userId',
      items: 'id, vaultId'
    });

    this.version(2).stores({
      pm_item_index: 'indexId, itemId, userId, vaultId, itemType, favorite, createdAt, updatedAt, lastAccessedAt',
      pm_attachments: 'id, userId, vaultId, ownerItemId, ownerItemType',
      
      pm_logins: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_secure_notes: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_credit_cards: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_identities: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_passwords: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_documents: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_api_credentials: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_bank_accounts: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_crypto_wallets: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_databases: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_driving_licenses: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_emails: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_medical_records: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_memberships: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_outdoor_licenses: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_passports: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_rewards: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_ssh_keys: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_servers: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_social_security_numbers: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_software_licenses: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt',
      pm_wireless_routers: 'id, userId, vaultId, [userId+vaultId], favorite, createdAt, updatedAt'
    });

    this.version(3).stores({
      platform_role_assignments: 'id, userId, role, status',
      organizations: 'id, adminUserId, status, createdAt',
      organization_memberships: 'id, organizationId, userId, role, status, [organizationId+userId]',
      organization_invitations: 'id, organizationId, email, status, expiresAt',
      organization_usage: 'id, organizationId, periodStart, periodEnd',
      organization_settings: 'organizationId',
      plans: 'id',
      subscriptions: 'id, organizationId, planId, status',
      audit_events: 'id, organizationId, actorUserId, eventType, createdAt'
    }).upgrade(async (trans) => {
      // Migrate all existing vaults to 'personal' ownership
      await trans.table('vaults').toCollection().modify((vault) => {
        if (!vault.ownershipType) {
          vault.ownershipType = 'personal';
          vault.ownerUserId = vault.createdBy;
          vault.organizationId = null;
        }
      });
    });

    this.version(4).stores({
      organization_domains: 'id, organizationId, domain, verificationStatus, [domain+verificationStatus+organizationId]',
      organizations: 'id, adminUserId, status, createdAt, provisioningStatus, billingState' // just extending schema fields internally
    }).upgrade(async (trans) => {
      // Idempotent migration for existing organizations
      await trans.table('organizations').toCollection().modify((org) => {
        if (!org.provisioningMode) {
          org.provisioningMode = 'super_admin_provisioned';
          org.provisioningStatus = 'ready';
          org.billingState = 'manual';
          org.seatLimit = 10; // Safe default
          org.createdByUserId = org.adminUserId;
          // Set planId as a fallback if undefined (though it should be fixed if missing)
          org.planId = org.planId || 'legacy-manual-plan';
        }
      });
      await trans.table('organization_settings').toCollection().modify((settings) => {
        if (!settings.joinPolicy) {
          settings.joinPolicy = 'invite_only';
        }
      });
    });


    this.version(5).stores({
      permission_profiles: 'id, organizationId, name, isSystem, createdAt, updatedAt, [organizationId+name]'
    }).upgrade(async (trans) => {
      // Version 5 migration: ensure no dangling permissionProfileIds on existing memberships
      await trans.table('organization_memberships').toCollection().modify((m) => {
        if (m.permissionProfileId === undefined) {
          m.permissionProfileId = null;
        }
      });
    });

    this.version(6).stores({
      users: 'id, email, mustChangePassword'
    }).upgrade(async (trans) => {
      // Migrate all existing organizations to super_admin_provisioned
      await trans.table('organizations').toCollection().modify((org) => {
        org.provisioningMode = 'super_admin_provisioned';
      });
    });

    this.version(7).stores({
      vaults: 'id, createdBy, ownerUserId, organizationId'
    }).upgrade(async (trans) => {
      // Ensure all old vaults have ownershipType
      await trans.table('vaults').toCollection().modify((vault) => {
        if (!vault.ownershipType) {
          vault.ownershipType = 'personal';
          vault.ownerUserId = vault.createdBy;
          vault.organizationId = null;
        }
      });
    });

    this.version(8).stores({
      organization_teams: 'id, organizationId, name, createdAt, [organizationId+name]',
      organization_team_memberships: 'id, organizationId, teamId, membershipId, [teamId+membershipId]',
      organization_sharing_policies: 'id, organizationId, [organizationId]',
      vault_sharing_policies: 'id, organizationId, vaultId, [organizationId+vaultId]',
      item_sharing_policies: 'id, organizationId, vaultId, itemId, itemType, [organizationId+itemId]',
      share_requests: 'id, organizationId, requestedByUserId, resourceType, vaultId, itemId, status, createdAt',
      share_grants: 'id, organizationId, resourceType, vaultId, itemId, targetType, status, createdAt'
    });
  }

  // Development utility to clear db
  async resetDatabase() {
    await this.transaction('rw', this.tables, async () => {
      for (const table of this.tables) {
        await table.clear();
      }
    });
  }
}

export const db = new VaultGuardDB();

// Expose to window for debugging/console cleanup
if (typeof window !== 'undefined') {
  (window as any).db = db;
}
