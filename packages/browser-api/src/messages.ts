import type {
  PageContext,
  PasswordGeneratorOptions,
  SaveLoginInput,
  UpdateLoginInput,
  MatchingLoginResult,
  InlinePageContext,
} from './domain';

// â”€â”€â”€ Error codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ExtensionErrorCode =
  | 'UNKNOWN_MESSAGE_TYPE'
  | 'INVALID_PAYLOAD'
  | 'UNAUTHORIZED_SENDER'
  | 'VAULT_LOCKED'
  | 'NOT_IMPLEMENTED'
  | 'ACCESS_DENIED'
  | 'INVALID_CONTEXT'
  | 'ITEM_NOT_FOUND'
  | 'ORGANIZATION_SUSPENDED'
  | 'PENDING_CRYPTO'
  | 'RATE_LIMITED'
  | 'REPLAY_DETECTED'
  | 'OVERSIZED_PAYLOAD'
  | 'SYNC_UNAVAILABLE'
  | 'DECRYPTION_FAILED'
  | 'AUTOFILL_DISABLED';

export interface ExtensionError {
  code: ExtensionErrorCode;
  message?: string;
}

// â”€â”€â”€ Request messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ExtensionMessage =
  // Auth
  | { type: 'GET_AUTH_STATE' }
  | { type: 'LOCK' }
  /**
   * masterPassword must be zeroed/cleared by the background immediately after
   * key derivation. It is NEVER logged, echoed, or stored.
   */
  | { type: 'GET_CONTENT_CONTEXT' }
  | { type: 'UNLOCK'; masterPassword: string }
  // Context
  | { type: 'GET_CONTEXT' }
  | { type: 'SWITCH_CONTEXT'; contextId: string }
  // Vault queries
  | { type: 'GET_MATCHING_LOGINS'; page: PageContext }
  // Actions (credential filling â€” NOT implemented in Phase 4)
  | { type: 'FILL_LOGIN'; itemId: string; tabId: number; frameId?: number; requestId: string; overrideToken?: string }
  // Password generator
  | { type: 'GENERATE_PASSWORD'; options: PasswordGeneratorOptions }
  // Write operations (internal surfaces only â€” not content scripts)
  | { type: 'SAVE_LOGIN'; payload: SaveLoginInput }
  | { type: 'UPDATE_LOGIN'; payload: UpdateLoginInput }
  // Popup Data (Phase 7)
  | { type: 'GET_POPUP_LOGINS'; query: string; vaultId?: string; tabUrl?: string }
  | { type: 'GET_LOGIN_SECRET'; itemId: string; vaultId: string }
  | { type: 'COPY_LOGIN_FIELD'; itemId: string; vaultId: string; field: 'username' | 'password' }
  | { type: 'OPEN_LOGIN_WEBSITE'; itemId: string; vaultId: string; newTab?: boolean }
  | { type: 'CREATE_ITEM_IN_WEB'; itemType: string }
  | { type: 'TRIGGER_SYNC' }
  // Inline Autofill & Save Login (Phase 8/9)
  | GetInlineSuggestionsRequest
  | RequestInlineFill
  | { type: 'CREATE_SAVE_CANDIDATE'; candidate: Omit<SaveLoginInput, 'vaultId' | 'title' | 'url'>; page: PageContext }
  | { type: 'GET_SAVE_CANDIDATE_SUMMARY'; candidateId: string }
  | { type: 'GET_PENDING_SAVE_CANDIDATE' }
  | { type: 'SAVE_LOGIN_CANDIDATE'; candidateId: string; vaultId: string; title: string; username?: string }
  | { type: 'UPDATE_LOGIN_CANDIDATE'; candidateId: string; itemId: string; vaultId: string }
  | { type: 'DISMISS_SAVE_CANDIDATE'; candidateId: string }
  | { type: 'DEV_SYNC'; user: any; vaults: any[]; logins: any[]; secure_notes: any[]; credit_cards: any[]; identities: any[]; item_index: any[] }
  | { type: 'LOGIN'; email: string; masterPassword: string };

// â”€â”€â”€ Envelope â€” wraps every message with a correlation ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ExtensionEnvelope {
  /** UUID for correlating async request/response pairs */
  id: string;
  payload: ExtensionMessage;
  /** ISO timestamp of when the message was created (used for replay detection) */
  sentAt: number;
}

// â”€â”€â”€ Responses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ExtensionResponse<T = unknown> =
  | { success: true; data: T; requestId: string }
  | { success: false; error: ExtensionError; requestId: string };

// â”€â”€â”€ Typed response data shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ExtensionAuthState =
  | 'signed_out'
  | 'authenticated_locked'
  | 'authenticated_unlocked';

export interface AuthStateData {
  state: ExtensionAuthState;
  accountId: string | null;
  email: string | null;
}

export interface ContextData {
  type: 'personal' | 'organization';
  id: string;
  name: string;
}

export interface GeneratedPasswordData {
  password: string;
}

export interface GetInlineSuggestionsRequest {
  type: 'GET_INLINE_SUGGESTIONS';
  requestId: string;
  page: InlinePageContext;
}

export interface RequestInlineFill {
  type: 'REQUEST_INLINE_FILL';
  requestId: string;
  itemId: string;
  tabId: number;
  frameId: number;
  pageUrl: string;
  documentId?: string;
}

export interface InlineSuggestion {
  itemId: string;
  title: string;
  username: string;
  website: string;
  vaultId: string;
  vaultName?: string;
  matchScore: number;
}

export type InlineSuggestionsStatus =
  | 'MATCHES_FOUND'
  | 'NO_MATCHES'
  | 'VAULT_LOCKED'
  | 'SYNC_UNAVAILABLE'
  | 'AUTOFILL_DISABLED'
  | 'DECRYPTION_FAILED';

export interface InlineSuggestionsData {
  status: InlineSuggestionsStatus;
  items: InlineSuggestion[];
}

export interface ContentContextData {
  tabId: number;
  frameId: number;
  documentId?: string;
}

export interface SafePopupLoginMetadata {
  itemId: string;
  vaultId: string;
  vaultName?: string;
  title: string;
  username: string;
  website: string;
  favorite: boolean;
  matchScore: number;
  itemType?: string;
  notes?: string;
}

export type PopupLoginsData = SafePopupLoginMetadata[];

export interface LoginSecretData {
  password?: string;
}

export type MatchingLoginsData = MatchingLoginResult[];

export type FillResultStatus =
  | 'FILLED_USERNAME_AND_PASSWORD'
  | 'FILLED_USERNAME_ONLY'
  | 'FILLED_PASSWORD_ONLY'
  | 'NO_ELIGIBLE_FORM'
  | 'STALE_DOCUMENT';

export interface FillResultData {
  status: FillResultStatus;
}

export interface ExecuteFillPayload {
  type: 'EXECUTE_FILL';
  username?: string;
  password?: string;
  requestId: string;
}

// â”€â”€â”€ Allowed surfaces (for sender validation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ExtensionSurface = 'popup' | 'options' | 'unlock' | 'content' | 'background';

/** Messages content scripts are NOT permitted to send */
export const CONTENT_SCRIPT_BLOCKED_TYPES = new Set<ExtensionMessage['type']>([
  'UNLOCK',
  'LOCK',
  'SAVE_LOGIN',
  'UPDATE_LOGIN',
  'SWITCH_CONTEXT',
  'FILL_LOGIN',
  'GET_POPUP_LOGINS',
  'GET_LOGIN_SECRET',
  'COPY_LOGIN_FIELD',
  'OPEN_LOGIN_WEBSITE'
]);

