export type ItemType =
  | 'login'
  | 'secure_note'
  | 'credit_card'
  | 'identity'
  | 'password'
  | 'document'
  | 'api_credential'
  | 'bank_account'
  | 'crypto_wallet'
  | 'database'
  | 'driving_license'
  | 'email'
  | 'medical_record'
  | 'membership'
  | 'outdoor_license'
  | 'passport'
  | 'rewards'
  | 'ssh_key'
  | 'server'
  | 'ssn'
  | 'software_license'
  | 'wireless_router';

export interface Device {
  deviceId: string;
  deviceName: string;
  platform: string;
  lastSeen: string;
  appVersion: string;
  revokedAt: string | null;
}

// ----------------------------------------------------------------------------
// ORGANIZATION & ACCOUNT MODELS
// ----------------------------------------------------------------------------

export type OrganizationPermission =
  | 'organization.view'
  | 'organization.settings.view'
  | 'organization.settings.edit'
  | 'members.view'
  | 'members.invite'
  | 'members.suspend'
  | 'members.reactivate'
  | 'members.remove'
  | 'members.assign_profile'
  | 'permissions.view'
  | 'permissions.create'
  | 'permissions.edit'
  | 'permissions.delete'
  | 'permissions.assign'
  | 'vaults.view'
  | 'vaults.create'
  | 'vaults.rename'
  | 'vaults.delete'
  | 'vaults.manage_access'
  | 'items.view'
  | 'items.create'
  | 'items.edit'
  | 'items.delete'
  | 'items.move'
  | 'items.share'
  | 'attachments.upload'
  | 'attachments.download'
  | 'attachments.delete'
  | 'audit.view'
  | 'usage.view'
  | 'billing.view'
  | 'teams.view'
  | 'teams.create'
  | 'teams.edit'
  | 'teams.delete'
  | 'sharing.policies.view'
  | 'sharing.policies.edit'
  | 'sharing.requests.view'
  | 'sharing.requests.create'
  | 'sharing.requests.approve'
  | 'sharing.requests.reject'
  | 'sharing.grants.view'
  | 'sharing.grants.revoke';

export interface PermissionProfile {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissions: OrganizationPermission[];
  isSystem?: boolean;
  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
}

export type PlatformRole = 'user' | 'super_admin';

export interface PlatformRoleAssignment {
  id: string;
  userId: string;
  role: PlatformRole;
  status: 'active' | 'suspended';
  assignedAt: number;
  assignedBy?: string;
}

export type OrganizationProvisioningMode = 'self_service' | 'super_admin_provisioned';
export type OrganizationBillingState = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'manual';
export type OrganizationStatus = 'active' | 'suspended' | 'deleted';
export type OrganizationProvisioningStatus = 'pending' | 'pending_admin_activation' | 'ready' | 'failed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  adminUserId: string;

  provisioningMode: OrganizationProvisioningMode;
  provisioningStatus: OrganizationProvisioningStatus;

  planId: string;
  subscriptionId?: string;
  billingState: OrganizationBillingState;
  
  seatLimit: number;
  storageLimitBytes?: number;

  status: OrganizationStatus;

  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
}

export type OrganizationMembershipRole = 'organization_admin' | 'member';

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
  permissionProfileId?: string | null;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  joinedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  tokenHash: string; // Store ONLY the hash, never the raw token
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: number;
  createdAt: number;
}

export type DomainVerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';
export type DomainVerificationMethod = 'dns_txt' | 'email' | 'manual';
export type DomainJoinPolicy = 'invite_only' | 'request_to_join' | 'auto_join_verified_domain';

export interface OrganizationDomain {
  id: string;
  organizationId: string;
  domain: string; // Normalized domain

  verificationStatus: DomainVerificationStatus;
  verificationMethod?: DomainVerificationMethod;

  verificationTokenHash?: string;
  verifiedAt?: number;

  createdAt: number;
  updatedAt: number;
}

export interface OrganizationUsage {
  id: string;
  organizationId: string;
  periodStart: number;
  periodEnd: number;
  activeSeats: number;
  totalSeats: number;
  vaultCount: number;
  itemCount: number;
  attachmentBytes: number;
  lastActivityAt?: number;
}

export interface OrganizationSettings {
  organizationId: string;
  requireTwoFactor: boolean;
  restrictExport: boolean;
  joinPolicy: DomainJoinPolicy;
}

export interface Plan {
  id: string;
  name: string;
  status: 'active' | 'archived';
  accountType: 'personal' | 'organization';
  selfServiceEnabled: boolean;
  trialDays?: number;
  seatLimit: number;
  storageLimitBytes?: number;
  featureFlags: string[];
  priceMonthly: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export interface AuditEvent {
  id: string;
  organizationId?: string;
  actorUserId?: string;
  eventType: string;
  targetType?: string;
  targetId?: string;
  createdAt: number;
  metadata?: Record<string, string | number | boolean>;
}


export interface User {
  id: string; // UUID
  fullName: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string; // Used for local login validation MVP
  masterKeySalt: string; // Used for deriving the Master Key
  encryptionVersion: string; // e.g. 'PBKDF2-AES256GCM'
  mustChangePassword?: boolean;
  accountType?: 'personal' | 'managed';
  createdAt: number;
  updatedAt: number;
  defaultVaultId?: string;
}

export type VaultOwnershipType = 'personal' | 'organization';

export interface BaseVault {
  id: string; // UUID
  name?: string; // Plaintext name (if metadata leakage is allowed, else store in encrypted payload)
  description?: string;
  createdBy: string; // User ID
  wrappedVaultKey: string; // Base64 encoded encrypted vault key
  vaultKeyNonce: string; // Base64 encoded nonce/IV used for wrapping the vault key
  createdAt: number;
  updatedAt: number;
  encryptionVersion: number;
  schemaVersion?: number;
  recordVersion?: number;
}

export interface PersonalVault extends BaseVault {
  ownershipType: 'personal';
  ownerUserId: string;
  organizationId: null;
}

export interface OrganizationVault extends BaseVault {
  ownershipType: 'organization';
  ownerUserId: null;
  organizationId: string;
}

export type Vault = PersonalVault | OrganizationVault;

export interface Settings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  autoLockTime: number; // in minutes
}

// ----------------------------------------------------------------------------
// MVP V1 Item Table (Do not delete until V3 Migration is complete)
// ----------------------------------------------------------------------------
export interface VaultItem {
  id: string; // UUID
  vaultId: string; // UUID of parent vault
  type: ItemType;
  title?: string; // Optional metadata leakage for search
  websiteUrl?: string; // Optional metadata leakage for search/favicon
  favorite?: boolean;
  encryptedData: string; // Base64 ciphertext of VaultItemPayload JSON
  dataNonce: string; // Base64 IV used for encryption
  encryptionVersion: number; // e.g. 1
  schemaVersion: number; // e.g. 1
  recordVersion: number; // For optimistic concurrency
  createdAt: number; // Assuming JS timestamps, can be string if mapping from PG
  updatedAt: number;
  deletedAt?: number | null; // Tombstone support
}

export interface VaultItemPayload {
  username?: string;
  password?: string;
  notes?: string;
  totpSecret?: string;
  customFields?: Array<{ name: string; value: string }>;
}

export interface DecryptedVaultItem extends Omit<VaultItem, 'encryptedData' | 'dataNonce' | 'encryptionVersion'> {
  payload: VaultItemPayload;
}

// ----------------------------------------------------------------------------
// NEW ARCHITECTURE (Version 2+)
// ----------------------------------------------------------------------------

export interface PMItemIndex {
  indexId: string;
  itemId: string;
  userId: string;
  vaultId: string;
  itemType: ItemType;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  encryptedTitle: string; // The title encrypted with Vault Key
  titleNonce: string;
  safePreview?: string;
  schemaVersion: number;
}

export interface PMAttachment {
  id: string;
  userId: string;
  vaultId: string;
  ownerItemId: string;
  ownerItemType: ItemType;
  encryptedMetadata: string; // Contains fileName, mimeType, size
  metadataNonce: string;
  encryptedBlob: ArrayBuffer;
  wrappedFileKey: string;
  fileKeyNonce: string;
  contentNonce: string;
  encryptionVersion: string;
  createdAt: number;
  updatedAt: number;
}

// Base type for all 22 actual item tables
export interface BaseItemRecord {
  id: string;
  userId: string;
  vaultId: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  encryptedData: string;
  dataNonce: string;
  schemaVersion: number;
}

// We define identical records for all 22 tables. They all share BaseItemRecord structure.
export interface PMLogin extends BaseItemRecord {}
export interface PMSecureNote extends BaseItemRecord {}
export interface PMCreditCard extends BaseItemRecord {}
export interface PMIdentity extends BaseItemRecord {}
export interface PMPassword extends BaseItemRecord {}
export interface PMDocument extends BaseItemRecord {}
export interface PMApiCredential extends BaseItemRecord {}
export interface PMBankAccount extends BaseItemRecord {}
export interface PMCryptoWallet extends BaseItemRecord {}
export interface PMDatabase extends BaseItemRecord {}
export interface PMDrivingLicense extends BaseItemRecord {}
export interface PMEmail extends BaseItemRecord {}
export interface PMMedicalRecord extends BaseItemRecord {}
export interface PMMembership extends BaseItemRecord {}
export interface PMOutdoorLicense extends BaseItemRecord {}
export interface PMPassport extends BaseItemRecord {}
export interface PMReward extends BaseItemRecord {}
export interface PMSshKey extends BaseItemRecord {}
export interface PMServer extends BaseItemRecord {}
export interface PMSocialSecurityNumber extends BaseItemRecord {}
export interface PMSoftwareLicense extends BaseItemRecord {}
export interface PMWirelessRouter extends BaseItemRecord {}

// ----------------------------------------------------------------------------
// ORGANIZATION TEAMS (Version 8+)
// ----------------------------------------------------------------------------

export interface OrganizationTeam {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationTeamMembership {
  id: string;
  organizationId: string;
  teamId: string;
  membershipId: string;
  createdAt: number;
}

// ----------------------------------------------------------------------------
// HIERARCHICAL SHARING POLICIES (Version 8+)
// ----------------------------------------------------------------------------

export type SharePermission = 'view' | 'edit' | 'manage';
export type SharingPolicyMode = 'inherit' | 'override' | 'disabled';

export interface OrganizationSharingPolicy {
  id: string;
  organizationId: string;

  allowMemberSharing: boolean;
  allowVaultSharing: boolean;
  allowItemSharing: boolean;
  allowTeamSharing: boolean;
  allowDirectUserSharing: boolean;
  allowExternalSharing: boolean;

  requireAdminApprovalForMemberShares: boolean;
  requireAdminApprovalForExternalShares: boolean;

  allowResharing: boolean;

  defaultVaultSharePermission: SharePermission;
  defaultItemSharePermission: SharePermission;

  createdAt: number;
  updatedAt: number;
}

export interface VaultSharingPolicy {
  id: string;
  organizationId: string;
  vaultId: string;

  mode: SharingPolicyMode;

  allowSharing: boolean;
  allowMemberInitiatedSharing: boolean;
  allowItemOverrides: boolean;
  allowTeamTargets: boolean;
  allowDirectUserTargets: boolean;
  allowExternalTargets: boolean;
  requireAdminApproval: boolean;
  allowResharing: boolean;

  defaultPermission: SharePermission;

  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ItemSharingPolicy {
  id: string;
  organizationId: string;
  vaultId: string;
  itemId: string;
  itemType: ItemType;

  mode: SharingPolicyMode;

  allowSharing: boolean;
  allowMemberInitiatedSharing: boolean;
  allowTeamTargets: boolean;
  allowDirectUserTargets: boolean;
  allowExternalTargets: boolean;
  requireAdminApproval: boolean;
  allowResharing: boolean;

  defaultPermission: SharePermission;

  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
}

// ----------------------------------------------------------------------------
// SHARING REQUESTS & GRANTS (Version 8+)
// ----------------------------------------------------------------------------

export type ShareResourceType = 'vault' | 'item';
export type ShareTargetType = 'member' | 'team' | 'external_email';

export type ShareRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

export interface ShareRequest {
  id: string;
  organizationId: string;

  resourceType: ShareResourceType;
  vaultId: string;
  itemId?: string;
  itemType?: ItemType;

  requestedByUserId: string;

  targetType: ShareTargetType;
  targetMemberId?: string;
  targetTeamId?: string;
  targetExternalEmailEncrypted?: string;
  targetExternalEmailNonce?: string;

  requestedPermission: SharePermission;

  status: ShareRequestStatus;

  policySnapshotVersion: number;

  approvedByUserId?: string;
  approvedAt?: number;

  rejectedByUserId?: string;
  rejectedAt?: number;

  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export type ShareGrantStatus = 'pending_crypto' | 'active' | 'revocation_pending' | 'revoked' | 'failed';

export interface ShareGrant {
  id: string;
  organizationId: string;

  resourceType: ShareResourceType;
  vaultId: string;
  itemId?: string;
  itemType?: ItemType;

  targetType: 'member' | 'team';
  targetMemberId?: string;
  targetTeamId?: string;

  permission: SharePermission;

  createdByUserId: string;
  approvedByUserId?: string;

  status: ShareGrantStatus;

  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
}

export type EncryptedItem = VaultItem;
