// ─── Domain primitives ──────────────────────────────────────────────────────

/** Context about the current browser page (sent by content script) */
export interface PageContext {
  url: string;
  origin: string;
  hostname: string;
  frameUrl?: string;
  isTopFrame: boolean;
}

/** Browser identity bound to a specific content-script document. */
export interface InlinePageContext {
  url: string;
  origin: string;
  tabId: number;
  frameId: number;
  documentId?: string;
}


/** Minimal safe result for GET_MATCHING_LOGINS — NO credentials included */
export interface MatchingLoginResult {
  itemId: string;
  title: string;

  vaultId: string;
  vaultName?: string;
  matchScore: number;
  favorite?: boolean;
  lastAccessedAt?: number;
  /** Display username (safe to show, not a secret) */
  username?: string;
  /** Display icon / website domain only */
  website?: string;
  icon?: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase?: boolean;
  lowercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
}

export interface SaveLoginInput {
  title: string;
  username: string;
  /** Caller holds plain password only at call time; background clears after encryption */
  password: string;
  url: string;
  vaultId: string;
}

export interface UpdateLoginInput {
  itemId: string;
  title?: string;
  username?: string;
  /** Same lifecycle rule as SaveLoginInput.password */
  password?: string;
  url?: string;
}
