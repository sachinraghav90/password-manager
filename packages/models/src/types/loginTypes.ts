// Domain model for Login items â€” strictly mapped from PM_LOGIN + PM_COMMON_FIELD_INFO schema

export type AutofillBehavior =
  | 'fill_anywhere'     // Fill anywhere on this website (default)
  | 'fill_exact_host'  // Only fill on this exact host
  | 'never_fill';       // Never fill on this website

export interface WebsiteEntry {
  id: string;           // client-side stable key for React key prop
  url: string;
  autofillBehavior?: AutofillBehavior;
  /** Legacy compatibility field. */
  autofill?: AutofillBehavior;
}

/** Converts persisted legacy website fields to the canonical in-memory shape. */
export function normalizeLoginWebsites(payload: Record<string, any>): WebsiteEntry[] {
  const values: any[] = [];
  for (const field of ['websiteEntries', 'websites', 'urls']) {
    const value = payload[field];
    if (Array.isArray(value)) values.push(...value);
    else if (value != null) values.push(value);
  }
  if (payload.website != null) values.push(payload.website);

  return values.flatMap((value): WebsiteEntry[] => {
    if (typeof value === 'string') {
      return value.trim()
        ? [{ id: crypto.randomUUID(), url: value.trim(), autofillBehavior: 'fill_exact_host' }]
        : [];
    }
    if (!value || typeof value.url !== 'string' || !value.url.trim()) return [];
    const behavior = value.autofillBehavior ?? value.autofill;
    return [{
      id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
      url: value.url.trim(),
      autofillBehavior:
        behavior === 'fill_anywhere' || behavior === 'never_fill' || behavior === 'fill_exact_host'
          ? behavior
          : 'fill_exact_host'
    }];
  });
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
 * LoginFormState â€” the React form state for a Login item.
 * Every field maps directly to a PM_LOGIN or PM_COMMON_FIELD_INFO schema entry.
 * No extra fields allowed.
 */
export interface LoginFormState {
  title: string;              // Always required â€” stored in pm_item_index (encrypted)
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
 * LoginPayload â€” the shape that gets JSON-stringified and AES-GCM encrypted
 * before being stored in pm_logins.encryptedData.
 * This is the decrypted domain model.
 */
export type LoginPayload = Omit<LoginFormState, 'favorite'>;

export const defaultLoginFormState = (): LoginFormState => ({
  title: 'Login',
  username: '',
  password: '',
  websites: [{ id: crypto.randomUUID(), url: '', autofillBehavior: 'fill_anywhere' }],
  notes: '',
  location: '',
  tags: [],
  commonFields: [],
  favorite: false,
});




