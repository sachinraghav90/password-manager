/**
 * Verifies autofill requests and dispatches credentials to one browser document.
 */
import {
  ExtensionResponse,
  FillResultData,
  FillResultStatus,
  PageContext,
  RequestInlineFill
} from '@vaultguard/browser-api';
import { getAuthState } from './authHandler';
import { ensureActiveUser, vaultService } from './vaultHandler';

interface OverrideToken {
  itemId: string;
  tabId: number;
  frameId?: number;
  origin: string;
  expiresAt: number;
}
const overrideTokens = new Map<string, OverrideToken>();
const fillStatuses = new Set<FillResultStatus>([
  'FILLED_USERNAME_AND_PASSWORD',
  'FILLED_USERNAME_ONLY',
  'FILLED_PASSWORD_ONLY',
  'NO_ELIGIBLE_FORM',
  'STALE_DOCUMENT'
]);

async function dispatchFill(
  itemId: string,
  tabId: number,
  frameId: number,
  documentId: string | undefined,
  pageUrl: string,
  requestId: string,
  allowUrlMismatch = false
): Promise<ExtensionResponse<FillResultData>> {
  const url = new URL(pageUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'Cannot fill this page.' } };
  }

  const page: PageContext = {
    url: pageUrl,
    origin: url.origin,
    hostname: url.hostname,
    frameUrl: pageUrl,
    isTopFrame: frameId === 0
  };
  if (!allowUrlMismatch && await vaultService.getLoginMatchScore(itemId, page) <= 0) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'URL mismatch. Fill rejected.' } };
  }

  const creds = await vaultService.getLoginCredentials(itemId);
  try {
    // Frame ID is supported across Chromium versions; document identity was already verified above.
    const target = { frameId };
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_FILL',
      requestId,
      username: creds.username,
      password: creds.password
    }, target);

    if (!result || !fillStatuses.has(result.status)) {
      return { success: false, requestId, error: { code: 'INVALID_CONTEXT', message: 'Invalid fill result.' } };
    }
    if (result.status.startsWith('FILLED_')) {
      await vaultService.updateLastAccessedAt(itemId);
    }
    return { success: true, requestId, data: { status: result.status } };
  } finally {
    creds.username = undefined;
    creds.password = undefined;
  }
}

export async function handleRequestInlineFill(
  request: RequestInlineFill,
  sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse<FillResultData>> {
  const { requestId } = request;
  try {
    const auth = await getAuthState();
    if (auth.locked) return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
    await ensureActiveUser();
if (
      sender.tab?.id !== request.tabId ||
      sender.frameId !== request.frameId ||
      (request.documentId && sender.documentId !== request.documentId)
    ) {
      return { success: false, requestId, error: { code: 'INVALID_CONTEXT', message: 'Stale or mismatched document.' } };
    }

    return await dispatchFill(
      request.itemId,
      request.tabId,
      request.frameId,
      request.documentId,
      request.pageUrl,
      requestId
    );
  } catch (error: any) {
    return {
      success: false,
      requestId,
      error: { code: 'INVALID_CONTEXT', message: error?.message || 'Fill failed.' }
    };
  }
}

/** Legacy popup/programmatic fill entry point. */
export async function handleFillLogin(
  itemId: string,
  tabId: number,
  requestId: string,
  frameId = 0,
  overrideToken?: string
): Promise<ExtensionResponse<FillResultData>> {
  try {
    const auth = await getAuthState();
    if (auth.locked) return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
    await ensureActiveUser();
const tab = await chrome.tabs.get(tabId);
    if (!tab.url) {
      return { success: false, requestId, error: { code: 'INVALID_CONTEXT', message: 'No URL found for tab.' } };
    }

    const page: PageContext = {
      url: tab.url,
      origin: new URL(tab.url).origin,
      hostname: new URL(tab.url).hostname,
      isTopFrame: frameId === 0
    };
    const matches = await vaultService.getMatchingLogins(page);
    const score = matches.find(match => match.itemId === itemId)?.matchScore || 0;
    if (score <= 0 && overrideToken) {
      const token = overrideTokens.get(overrideToken);
      const valid = token &&
        token.expiresAt >= Date.now() &&
        token.itemId === itemId &&
        token.tabId === tabId &&
        token.frameId === frameId &&
        token.origin === new URL(tab.url).origin;
      if (!valid) {
        return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'Invalid override token.' } };
      }
      overrideTokens.delete(overrideToken);
    } else if (score <= 0) {
      return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'URL mismatch. Fill rejected.' } };
    }

    return await dispatchFill(itemId, tabId, frameId, undefined, tab.url, requestId, score <= 0);
  } catch (error: any) {
    return { success: false, requestId, error: { code: 'INVALID_CONTEXT', message: error?.message || 'Fill failed.' } };
  }
}

export function generateOverrideToken(itemId: string, tabId: number, origin: string, frameId = 0): string {
  const token = crypto.randomUUID();
  overrideTokens.set(token, { itemId, tabId, frameId, origin, expiresAt: Date.now() + 60_000 });
  return token;
}




