import { ItemType } from '@vaultguard/models';
import { 
  Key, FileText, CreditCard, User, Lock, File, Code, Building, 
  Bitcoin, Database, Car, Mail, Heart, Award, Map, Plane, 
  Gift, Terminal, Server, Shield, Laptop, Wifi
} from 'lucide-react';

export type FieldType = 'text' | 'password' | 'textarea' | 'url' | 'email' | 'date' | 'monthYear' | 'file' | 'phone';

export interface RegistryField {
  name: string;
  label: string;
  type: FieldType;
  sensitive: boolean;
  required?: boolean;
}

export interface ItemRegistryConfig {
  type: ItemType;
  displayName: string;
  category: 'Logins' | 'Financial' | 'Identities' | 'Infrastructure' | 'Personal';
  icon: React.ElementType;
  fields: RegistryField[];
  searchablePayloadFields: string[];
}

export const ITEM_REGISTRY: Record<ItemType, ItemRegistryConfig> = {
  login: {
    type: 'login',
    displayName: 'Login',
    category: 'Logins',
    icon: Key,
    fields: [
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'password', label: 'Password', type: 'password', sensitive: true, required: true },
      { name: 'websiteUrl', label: 'Website URL', type: 'url', sensitive: false },
      { name: 'notes', label: 'Notes', type: 'textarea', sensitive: true },
      { name: 'location', label: 'Location', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['username', 'websiteUrl', 'notes', 'location', 'notes']
  },
  secure_note: {
    type: 'secure_note',
    displayName: 'Secure Note',
    category: 'Personal',
    icon: FileText,
    fields: [
      { name: 'notes', label: 'Notes', type: 'textarea', sensitive: true, required: true }
    ],
    searchablePayloadFields: ['notes', 'notes']
  },
  credit_card: {
    type: 'credit_card',
    displayName: 'Credit Card',
    category: 'Financial',
    icon: CreditCard,
    fields: [
      { name: 'cardholderName', label: 'Cardholder Name', type: 'text', sensitive: false },
      { name: 'type', label: 'Type', type: 'text', sensitive: false },
      { name: 'issuingBank', label: 'Issuing Bank', type: 'text', sensitive: false },
      { name: 'cardNumber', label: 'Card Number', type: 'text', sensitive: true, required: true },
      { name: 'expiry', label: 'Expiry Date', type: 'monthYear', sensitive: false },
      { name: 'verificationNumber', label: 'CVV / Security Code', type: 'password', sensitive: true },
      { name: 'validFrom', label: 'Valid From', type: 'monthYear', sensitive: false },
      { name: 'phone', label: 'Phone', type: 'text', sensitive: false },
      { name: 'website', label: 'Website', type: 'url', sensitive: false }
    ],
    searchablePayloadFields: ['cardholderName', 'type', 'issuingBank', 'cardNumber', 'expiry', 'validFrom', 'phone', 'website', 'notes']
  },
  identity: {
    type: 'identity',
    displayName: 'Identity',
    category: 'Identities',
    icon: User,
    fields: [
      { name: 'firstName', label: 'First Name', type: 'text', sensitive: false },
      { name: 'initial', label: 'Initial', type: 'text', sensitive: false },
      { name: 'lastName', label: 'Last Name', type: 'text', sensitive: false },
      { name: 'gender', label: 'Gender', type: 'text', sensitive: false },
      { name: 'birthDate', label: 'Birth Date', type: 'date', sensitive: false },
      { name: 'occupation', label: 'Occupation', type: 'text', sensitive: false },
      { name: 'company', label: 'Company', type: 'text', sensitive: false },
      { name: 'department', label: 'Department', type: 'text', sensitive: false },
      { name: 'jobTitle', label: 'Job Title', type: 'text', sensitive: false },
      { name: 'address', label: 'Address', type: 'textarea', sensitive: false },
      { name: 'defaultPhone', label: 'Default Phone', type: 'text', sensitive: false },
      { name: 'homePhone', label: 'Home Phone', type: 'text', sensitive: false },
      { name: 'cellPhone', label: 'Cell Phone', type: 'text', sensitive: false },
      { name: 'businessPhone', label: 'Business Phone', type: 'text', sensitive: false },
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'reminderQuestion', label: 'Reminder Question', type: 'text', sensitive: false },
      { name: 'reminderAnswer', label: 'Reminder Answer', type: 'password', sensitive: true },
      { name: 'email', label: 'Email', type: 'email', sensitive: false },
      { name: 'website', label: 'Website', type: 'url', sensitive: false },
      { name: 'icq', label: 'ICQ', type: 'text', sensitive: false },
      { name: 'skype', label: 'Skype', type: 'text', sensitive: false },
      { name: 'aolAim', label: 'AOL/AIM', type: 'text', sensitive: false },
      { name: 'yahoo', label: 'Yahoo', type: 'text', sensitive: false },
      { name: 'msn', label: 'MSN', type: 'text', sensitive: false },
      { name: 'forumSignature', label: 'Forum Signature', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['firstName', 'initial', 'lastName', 'gender', 'birthDate', 'occupation', 'company', 'department', 'jobTitle', 'address', 'defaultPhone', 'homePhone', 'cellPhone', 'businessPhone', 'username', 'reminderQuestion', 'email', 'website', 'icq', 'skype', 'aolAim', 'yahoo', 'msn', 'forumSignature', 'notes']
  },
  password: {
    type: 'password',
    displayName: 'Password',
    category: 'Logins',
    icon: Lock,
    fields: [
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'passwordValue', label: 'Password', type: 'password', sensitive: true, required: true },
      { name: 'website', label: 'Website & URL', type: 'url', sensitive: false }
    ],
    searchablePayloadFields: ['username', 'website', 'notes']
  },
  document: {
    type: 'document',
    displayName: 'Document',
    category: 'Personal',
    icon: File,
    fields: [
      { name: 'files', label: 'Files', type: 'file', sensitive: false }
    ],
    searchablePayloadFields: ['files', 'notes']
  },
  api_credential: {
    type: 'api_credential',
    displayName: 'API Credential',
    category: 'Infrastructure',
    icon: Code,
    fields: [
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'credentialValue', label: 'Credential', type: 'password', sensitive: true },
      { name: 'type', label: 'Type', type: 'text', sensitive: false },
      { name: 'filename', label: 'Filename', type: 'text', sensitive: false },
      { name: 'validatesFrom', label: 'Valid From', type: 'date', sensitive: false },
      { name: 'expires', label: 'Expires', type: 'date', sensitive: false },
      { name: 'hostName', label: 'Host Name', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['username', 'type', 'filename', 'validatesFrom', 'expires', 'hostName', 'notes']
  },
  bank_account: {
    type: 'bank_account',
    displayName: 'Bank Account',
    category: 'Financial',
    icon: Building,
    fields: [
      { name: 'bankName', label: 'Bank Name', type: 'text', sensitive: false },
      { name: 'nameOnAccount', label: 'Name on Account', type: 'text', sensitive: false },
      { name: 'type', label: 'Type', type: 'text', sensitive: false },
      { name: 'routingNumber', label: 'Routing Number', type: 'text', sensitive: true },
      { name: 'accountNumber', label: 'Account Number', type: 'text', sensitive: true },
      { name: 'swift', label: 'SWIFT', type: 'text', sensitive: false },
      { name: 'iban', label: 'IBAN', type: 'text', sensitive: true },
      { name: 'pin', label: 'PIN', type: 'password', sensitive: true },
      { name: 'phone', label: 'Phone', type: 'text', sensitive: false },
      { name: 'address', label: 'Address', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['bankName', 'nameOnAccount', 'type', 'swift', 'phone', 'address', 'notes']
  },
  crypto_wallet: {
    type: 'crypto_wallet',
    displayName: 'Crypto Wallet',
    category: 'Financial',
    icon: Bitcoin,
    fields: [
      { name: 'recoveryPhrase', label: 'Recovery Phrase', type: 'password', sensitive: true },
      { name: 'passwordValue', label: 'Password', type: 'password', sensitive: true },
      { name: 'walletAddress', label: 'Wallet Address', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['walletAddress', 'notes']
  },
  database: {
    type: 'database',
    displayName: 'Database',
    category: 'Infrastructure',
    icon: Database,
    fields: [
      { name: 'type', label: 'Type', type: 'text', sensitive: false },
      { name: 'server', label: 'Server', type: 'text', sensitive: false },
      { name: 'port', label: 'Port', type: 'text', sensitive: false },
      { name: 'databaseName', label: 'Database', type: 'text', sensitive: false },
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'passwordValue', label: 'Password', type: 'password', sensitive: true },
      { name: 'sid', label: 'SID', type: 'text', sensitive: false },
      { name: 'alias', label: 'Alias', type: 'text', sensitive: false },
      { name: 'connectionOptions', label: 'Connection Options', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['type', 'server', 'port', 'databaseName', 'username', 'sid', 'alias', 'connectionOptions', 'notes']
  },
  driving_license: {
    type: 'driving_license',
    displayName: 'Driver License',
    category: 'Identities',
    icon: Car,
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', sensitive: false },
      { name: 'address', label: 'Address', type: 'text', sensitive: false },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', sensitive: false },
      { name: 'gender', label: 'Gender', type: 'text', sensitive: false },
      { name: 'height', label: 'Height', type: 'text', sensitive: false },
      { name: 'number', label: 'Number', type: 'text', sensitive: true },
      { name: 'licenseClass', label: 'License Class', type: 'text', sensitive: false },
      { name: 'conditions', label: 'Conditions/Restrictions', type: 'text', sensitive: false },
      { name: 'state', label: 'State', type: 'text', sensitive: false },
      { name: 'country', label: 'Country', type: 'text', sensitive: false },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date', sensitive: false }
    ],
    searchablePayloadFields: ['fullName', 'address', 'dateOfBirth', 'gender', 'height', 'licenseClass', 'conditions', 'state', 'country', 'expiryDate', 'notes']
  },
  email: {
    type: 'email',
    displayName: 'Email Account',
    category: 'Logins',
    icon: Mail,
    fields: [
      { name: 'type', label: 'Type', type: 'text', sensitive: false },
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'server', label: 'Server', type: 'text', sensitive: false },
      { name: 'port', label: 'Port Number', type: 'text', sensitive: false },
      { name: 'passwordValue', label: 'Password', type: 'password', sensitive: true },
      { name: 'security', label: 'Security', type: 'text', sensitive: false },
      { name: 'authMethod', label: 'Auth Method', type: 'text', sensitive: false },
      { name: 'smtpServer', label: 'SMTP Server', type: 'text', sensitive: false },
      { name: 'smtpPort', label: 'SMTP Port', type: 'text', sensitive: false },
      { name: 'smtpUsername', label: 'SMTP Username', type: 'text', sensitive: false },
      { name: 'smtpPasswordValue', label: 'SMTP Password', type: 'password', sensitive: true },
      { name: 'smtpSecurity', label: 'SMTP Security', type: 'text', sensitive: false },
      { name: 'smtpAuthMethod', label: 'SMTP Auth Method', type: 'text', sensitive: false },
      { name: 'provider', label: 'Provider', type: 'text', sensitive: false },
      { name: 'providerWebsite', label: 'Provider Website', type: 'text', sensitive: false },
      { name: 'providerPhone', label: 'Provider Phone', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['type', 'username', 'server', 'port', 'security', 'authMethod', 'smtpServer', 'smtpPort', 'smtpUsername', 'smtpSecurity', 'smtpAuthMethod', 'provider', 'providerWebsite', 'providerPhone', 'notes']
  },
  medical_record: {
    type: 'medical_record',
    displayName: 'Medical Record',
    category: 'Personal',
    icon: Heart,
    fields: [
      { name: 'date', label: 'Date', type: 'date', sensitive: false },
      { name: 'location', label: 'Location', type: 'text', sensitive: false },
      { name: 'healthcareProfessional', label: 'Healthcare Professional', type: 'text', sensitive: false },
      { name: 'patient', label: 'Patient', type: 'text', sensitive: false },
      { name: 'reasonForVisit', label: 'Reason for Visit', type: 'text', sensitive: false },
      { name: 'medicationName', label: 'Medication Name', type: 'text', sensitive: false },
      { name: 'dosage', label: 'Dosage', type: 'text', sensitive: false },
      { name: 'medicationNotes', label: 'Medication Notes', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['date', 'location', 'healthcareProfessional', 'patient', 'reasonForVisit', 'medicationName', 'dosage', 'medicationNotes', 'notes']
  },
  membership: {
    type: 'membership',
    displayName: 'Membership',
    category: 'Identities',
    icon: Award,
    fields: [
      { name: 'groupName', label: 'Group', type: 'text', sensitive: false },
      { name: 'website', label: 'Website', type: 'text', sensitive: false },
      { name: 'telephone', label: 'Telephone', type: 'text', sensitive: false },
      { name: 'memberName', label: 'Member Name', type: 'text', sensitive: false },
      { name: 'memberSince', label: 'Member Since', type: 'date', sensitive: false },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date', sensitive: false },
      { name: 'memberId', label: 'Member ID', type: 'text', sensitive: false },
      { name: 'pin', label: 'PIN', type: 'password', sensitive: true }
    ],
    searchablePayloadFields: ['groupName', 'website', 'telephone', 'memberName', 'memberSince', 'expiryDate', 'memberId', 'notes']
  },
  outdoor_license: {
    type: 'outdoor_license',
    displayName: 'Outdoor License',
    category: 'Identities',
    icon: Map,
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', sensitive: false },
      { name: 'validFrom', label: 'Valid From', type: 'date', sensitive: false },
      { name: 'expire', label: 'Expire', type: 'date', sensitive: false },
      { name: 'approvedWildlife', label: 'Approved Wildlife', type: 'text', sensitive: false },
      { name: 'maximumQuota', label: 'Maximum Quota', type: 'text', sensitive: false },
      { name: 'state', label: 'State', type: 'text', sensitive: false },
      { name: 'country', label: 'Country', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['fullName', 'validFrom', 'expire', 'approvedWildlife', 'maximumQuota', 'state', 'country', 'notes']
  },
  passport: {
    type: 'passport',
    displayName: 'Passport',
    category: 'Identities',
    icon: Plane,
    fields: [
      { name: 'type', label: 'Type', type: 'text', sensitive: false },
      { name: 'issuingCountry', label: 'Issuing Country', type: 'text', sensitive: false },
      { name: 'number', label: 'Number', type: 'text', sensitive: true, required: true },
      { name: 'fullName', label: 'Full Name', type: 'text', sensitive: false },
      { name: 'gender', label: 'Gender', type: 'text', sensitive: false },
      { name: 'nationality', label: 'Nationality', type: 'text', sensitive: false },
      { name: 'issuingAuthority', label: 'Issuing Authority', type: 'text', sensitive: false },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', sensitive: false },
      { name: 'placeOfBirth', label: 'Place of Birth', type: 'text', sensitive: false },
      { name: 'issuedOn', label: 'Issued On', type: 'date', sensitive: false },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date', sensitive: false }
    ],
    searchablePayloadFields: ['type', 'issuingCountry', 'fullName', 'gender', 'nationality', 'issuingAuthority', 'dateOfBirth', 'placeOfBirth', 'issuedOn', 'expiryDate', 'notes']
  },
  rewards: {
    type: 'rewards',
    displayName: 'Reward Program',
    category: 'Financial',
    icon: Gift,
    fields: [
      { name: 'companyName', label: 'Company Name', type: 'text', sensitive: false },
      { name: 'memberName', label: 'Member Name', type: 'text', sensitive: false },
      { name: 'memberId', label: 'Member ID', type: 'text', sensitive: true, required: true },
      { name: 'pin', label: 'PIN', type: 'password', sensitive: true },
      { name: 'memberSince', label: 'Member Since', type: 'date', sensitive: false },
      { name: 'customerServicePhone', label: 'Customer Service Phone', type: 'text', sensitive: false },
      { name: 'phoneForReservations', label: 'Phone For Reservations', type: 'text', sensitive: false },
      { name: 'website', label: 'Website', type: 'url', sensitive: false }
    ],
    searchablePayloadFields: ['companyName', 'memberName', 'memberId', 'memberSince', 'customerServicePhone', 'phoneForReservations', 'website', 'notes']
  },
  ssh_key: {
    type: 'ssh_key',
    displayName: 'SSH Key',
    category: 'Infrastructure',
    icon: Terminal,
    fields: [
      { name: 'hostname', label: 'Hostname', type: 'text', sensitive: false },
      { name: 'privateKey', label: 'Private Key', type: 'textarea', sensitive: true, required: true },
      { name: 'publicKey', label: 'Public Key', type: 'textarea', sensitive: false },
      { name: 'passphrase', label: 'Passphrase', type: 'password', sensitive: true }
    ],
    searchablePayloadFields: ['hostname', 'publicKey', 'notes']
  },
  server: {
    type: 'server',
    displayName: 'Server',
    category: 'Infrastructure',
    icon: Server,
    fields: [
      { name: 'url', label: 'URL', type: 'url', sensitive: false },
      { name: 'username', label: 'Username', type: 'text', sensitive: false },
      { name: 'password', label: 'Password', type: 'password', sensitive: true },
      
      { name: 'adminConsoleUrl', label: 'Admin Console URL', type: 'url', sensitive: false },
      { name: 'adminConsoleUsername', label: 'Admin Console Username', type: 'text', sensitive: false },
      { name: 'adminPassword', label: 'Admin Password', type: 'password', sensitive: true },

      { name: 'hostingProviderName', label: 'Hosting Provider Name', type: 'text', sensitive: false },
      { name: 'hostingProviderWebsite', label: 'Hosting Provider Website', type: 'url', sensitive: false },
      { name: 'supportUrl', label: 'Support URL', type: 'url', sensitive: false },
      { name: 'supportPhone', label: 'Support Phone', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['url', 'username', 'adminConsoleUrl', 'adminConsoleUsername', 'hostingProviderName', 'hostingProviderWebsite', 'supportUrl', 'supportPhone', 'notes']
  },
  ssn: {
    type: 'ssn',
    displayName: 'Social Security Number',
    category: 'Identities',
    icon: Shield,
    fields: [
      { name: 'name', label: 'Name', type: 'text', sensitive: false },
      { name: 'number', label: 'Number', type: 'password', sensitive: true, required: true }
    ],
    searchablePayloadFields: ['name', 'notes']
  },
  software_license: {
    type: 'software_license',
    displayName: 'Software License',
    category: 'Infrastructure',
    icon: Laptop,
    fields: [
      { name: 'version', label: 'Version', type: 'text', sensitive: false },
      { name: 'licenseKey', label: 'License Key', type: 'password', sensitive: true },
      
      { name: 'licensedTo', label: 'Licensed To', type: 'text', sensitive: false },
      { name: 'registeredEmail', label: 'Registered Email', type: 'email', sensitive: false },
      { name: 'company', label: 'Company', type: 'text', sensitive: false },
      
      { name: 'downloadPage', label: 'Download Page', type: 'url', sensitive: false },
      { name: 'publisher', label: 'Publisher', type: 'text', sensitive: false },
      { name: 'website', label: 'Website', type: 'url', sensitive: false },
      { name: 'supportEmail', label: 'Support Email', type: 'email', sensitive: false },
      { name: 'retailPrice', label: 'Retail Price', type: 'text', sensitive: false },
      
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date', sensitive: false },
      { name: 'orderNumber', label: 'Order Number', type: 'text', sensitive: false },
      { name: 'orderTotal', label: 'Order Total', type: 'text', sensitive: false }
    ],
    searchablePayloadFields: ['version', 'licensedTo', 'registeredEmail', 'company', 'downloadPage', 'publisher', 'website', 'supportEmail', 'retailPrice', 'purchaseDate', 'orderNumber', 'orderTotal', 'notes']
  },
  wireless_router: {
    type: 'wireless_router',
    displayName: 'Wireless Router',
    category: 'Infrastructure',
    icon: Wifi,
    fields: [
      { name: 'baseStationName', label: 'Base Station Name', type: 'text', sensitive: false },
      { name: 'baseStationPassword', label: 'Base Station Password', type: 'password', sensitive: true },
      { name: 'serverAddress', label: 'Server / IP Address', type: 'text', sensitive: false },
      { name: 'airportId', label: 'AirPort ID', type: 'text', sensitive: false },
      { name: 'networkName', label: 'Network Name', type: 'text', sensitive: false },
      { name: 'wirelessSecurity', label: 'Wireless Security', type: 'text', sensitive: false },
      { name: 'wirelessNetworkPassword', label: 'Wireless Network Password', type: 'password', sensitive: true },
      { name: 'attachedStrongPassword', label: 'Attached Strong Password', type: 'password', sensitive: true }
    ],
    searchablePayloadFields: ['baseStationName', 'serverAddress', 'airportId', 'networkName', 'wirelessSecurity', 'notes']
  }
};
