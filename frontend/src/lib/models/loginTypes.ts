// Domain model for Login items — strictly mapped from PM_LOGIN + PM_COMMON_FIELD_INFO schema

export type AutofillBehavior =
  | 'fill_anywhere'     // Fill anywhere on this website (default)
  | 'fill_exact_host'  // Only fill on this exact host
  | 'never_fill';       // Never fill on this website

export interface WebsiteEntry {
  id: string;           // client-side stable key for React key prop
  url: string;
  autofill: AutofillBehavior;
}

export type CommonFieldType =
  | 'text'
  | 'url'
  | 'email'
  | 'address'
  | 'date'
  | 'otp'
  | 'password'
  | 'phone'
  | 'sign_in_with'
  | 'section';

export const COMMON_FIELD_LABELS: Record<CommonFieldType, string> = {
  text: 'Text',
  url: 'URL',
  email: 'Email',
  address: 'Address',
  date: 'Date',
  otp: 'One-Time Password',
  password: 'Password',
  phone: 'Phone',
  sign_in_with: 'Sign in with',
  section: 'Section',
};

export const SIGN_IN_WITH_PROVIDERS = ['Google', 'Facebook', 'Microsoft', 'GitHub'] as const;
export type SignInProvider = typeof SIGN_IN_WITH_PROVIDERS[number];

export interface CommonFieldEntry {
  id: string;                 // client-side stable key
  fieldType: CommonFieldType;
  fieldLabel: string;         // user-editable label
  fieldValue: string;         // the actual value
}

/**
 * LoginFormState — the React form state for a Login item.
 * Every field maps directly to a PM_LOGIN or PM_COMMON_FIELD_INFO schema entry.
 * No extra fields allowed.
 */
export interface LoginFormState {
  title: string;              // Always required — stored in pm_item_index (encrypted)
  username: string;           // PM_LOGIN.USERNAME
  password: string;           // PM_LOGIN.PASSWORD
  websites: WebsiteEntry[];   // PM_LOGIN.website & url (repeatable)
  notes: string;              // PM_LOGIN.notes
  location: string;           // PM_LOGIN.location
  tags: string[];             // PM_LOGIN.tags
  commonFields: CommonFieldEntry[]; // PM_COMMON_FIELD_INFO additions via "Add More"
  favorite: boolean;
}

/**
 * LoginPayload — the shape that gets JSON-stringified and AES-GCM encrypted
 * before being stored in pm_logins.encryptedData.
 * This is the decrypted domain model.
 */
export type LoginPayload = Omit<LoginFormState, 'favorite'>;

export const defaultLoginFormState = (): LoginFormState => ({
  title: 'Login',
  username: '',
  password: '',
  websites: [{ id: crypto.randomUUID(), url: '', autofill: 'fill_anywhere' }],
  notes: '',
  location: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
