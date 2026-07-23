import { ExtensionResponse, InlinePageContext, InlineSuggestionsData, PageContext, SaveLoginInput } from '@vaultguard/browser-api';
import { candidateMemory } from '../services/CandidateMemory';
import { handleSaveLogin, handleUpdateLogin } from './loginHandler';
import { handleGetMatchingLogins, repository, ensureActiveUser, vaultService } from './vaultHandler';
import { handleFillLogin } from './autofillHandler';
import { handleGetAuthState } from './authHandler';

function inlineLog(requestId: string, stage: string, pageUrl: string, fields: Record<string, unknown>) {
  if (!(globalThis as any).__VAULTGUARD_DEV__) return;
  let pageHost = '';
  try { pageHost = new URL(pageUrl).hostname; } catch {}
  console.debug({ scope: 'inline-autofill', requestId, stage, pageHost, ...fields });
}

export async function handleGetInlineSuggestions(
  requestId: string,
  page: InlinePageContext,
  sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse<InlineSuggestionsData>> {
  if (
    sender.tab?.id !== page.tabId ||
    sender.frameId !== page.frameId ||
    (page.documentId && sender.documentId !== page.documentId)
  ) {
    return { success: false, requestId, error: { code: 'INVALID_CONTEXT', message: 'Page identity does not match sender.' } };
  }

  try {
    if (new URL(page.url).origin !== page.origin) {
      return { success: false, requestId, error: { code: 'INVALID_PAYLOAD', message: 'page.origin does not match page.url.' } };
    }
  } catch {
    return { success: false, requestId, error: { code: 'INVALID_PAYLOAD', message: 'Invalid page URL.' } };
  }

  const authState = await handleGetAuthState(requestId);
  if (!authState.success) return authState;
  if (authState.data?.state !== 'authenticated_unlocked') {
    inlineLog(requestId, 'auth', page.url, { status: 'VAULT_LOCKED', matchedCount: 0 });
    return { success: true, requestId, data: { status: 'VAULT_LOCKED', items: [] } };
  }

  const legacyPage: PageContext = {
    url: page.url,
    origin: page.origin,
    hostname: new URL(page.url).hostname,
    frameUrl: page.url,
    isTopFrame: page.frameId === 0
  };
  const matchesRes = await handleGetMatchingLogins(legacyPage, requestId);
  if (!matchesRes.success) return matchesRes;

  const items = (matchesRes.data || []).map((match: any) => ({
    itemId: match.itemId,
    vaultId: match.vaultId,
    vaultName: match.vaultName,
    title: match.title,
    username: match.username || '',
    website: match.website || '',
    matchScore: match.matchScore
  }));
  const status = items.length ? 'MATCHES_FOUND' : 'NO_MATCHES';
  inlineLog(requestId, 'response', page.url, {
    matchedCount: items.length,
    topMatchScore: items[0]?.matchScore || 0,
    status
  });
  return { success: true, requestId, data: { status, items } };
}
export async function handleRequestInlineFill(requestId: string, itemId: string, vaultId: string, page: PageContext): Promise<ExtensionResponse> {
  // We can reuse handleFillLogin
  // In a real implementation, we would pass the tabId from the sender, but for now we just call it
  // Wait, handleFillLogin expects tabId from the message. We'll handle this in messageHandler.ts
  return { success: false, requestId, error: { code: 'NOT_IMPLEMENTED', message: 'Handled in messageHandler directly' } };
}

export async function handleCreateSaveCandidate(requestId: string, candidate: Omit<SaveLoginInput, 'vaultId' | 'title' | 'url'>, page: PageContext): Promise<ExtensionResponse> {
  const matchesRes = await handleGetMatchingLogins(page, requestId);
  let action: 'SAVE' | 'UPDATE' | 'NONE' = 'SAVE';
  let matchedItemId: string | undefined = undefined;
  
  if (matchesRes.success && matchesRes.data && matchesRes.data.length > 0) {
    // We need to fetch the actual secrets to see if password matches exactly, 
    // but handleGetMatchingLogins doesn't return secrets.
    // For this implementation, we will just assume:
    // If username matches, it's an update. If both match (we don't know yet without full decrypt), 
    // we should ideally decrypt the best match to check.
    const bestMatch = matchesRes.data[0] as any;
    if (bestMatch.username === (candidate as any).username) {
      matchedItemId = bestMatch.itemId;
      try {
        const existing = await vaultService.getLoginCredentials(bestMatch.itemId);
        action = existing.password === (candidate as any).password ? 'NONE' : 'UPDATE';
      } catch {
        action = 'UPDATE';
      }
    }
  }

  if (action === ('NONE' as any)) {
    return { success: true, requestId, data: { action } };
  }

  const candidateId = candidateMemory.add(candidate, page);
  return { success: true, requestId, data: { action, candidateId, matchedItemId } };
}


export async function handleGetPendingSaveCandidate(requestId: string): Promise<ExtensionResponse> {
  const candidate = candidateMemory.latest();
  if (!candidate) return { success: true, requestId, data: { candidate: null } };
  return { success: true, requestId, data: { candidate: { candidateId: candidate.id, action: 'SAVE', hostname: candidate.page.hostname, username: (candidate.candidate as any).username } } };
}
export async function handleGetSaveCandidateSummary(requestId: string, candidateId: string): Promise<ExtensionResponse> {
  const candidateRecord = candidateMemory.get(candidateId);
  if (!candidateRecord) {
    return { success: false, requestId, error: { code: 'ITEM_NOT_FOUND', message: 'Candidate expired or not found' } };
  }

  return {
    success: true,
    requestId,
    data: {
      hostname: candidateRecord.page.hostname,
      username: (candidateRecord.candidate as any).username
    }
  };
}

export async function handleSaveLoginCandidate(requestId: string, candidateId: string, vaultId: string, title: string, username?: string): Promise<ExtensionResponse> {
  const candidateRecord = candidateMemory.get(candidateId);
  if (!candidateRecord) {
    return { success: false, requestId, error: { code: 'ITEM_NOT_FOUND', message: 'Candidate expired or not found' } };
  }

  await ensureActiveUser();
  if (!vaultId || vaultId === 'default') {
    vaultId = (await repository.getVaults())[0]?.id || '';
  }
  if (!vaultId) return { success: false, requestId, error: { code: 'VAULT_LOCKED', message: 'No accessible vault is available.' } };

  const payload = {
    ...candidateRecord.candidate,
    vaultId,
    title,
    url: candidateRecord.page.url,
    username: username !== undefined ? username : (candidateRecord.candidate as any).username
  } as SaveLoginInput;

  const res = await handleSaveLogin(payload, requestId);
  if (res.success) {
    candidateMemory.remove(candidateId);
  }
  return res;
}

export async function handleUpdateLoginCandidate(requestId: string, candidateId: string, itemId: string, vaultId: string): Promise<ExtensionResponse> {
  const candidateRecord = candidateMemory.get(candidateId);
  if (!candidateRecord) {
    return { success: false, requestId, error: { code: 'ITEM_NOT_FOUND', message: 'Candidate expired or not found' } };
  }

  const payload = {
    itemId,
    vaultId,
    password: candidateRecord.candidate.password
  };

  const res = await handleUpdateLogin(payload as any, requestId);
  if (res.success) {
    candidateMemory.remove(candidateId);
  }
  return res;
}

export async function handleDismissSaveCandidate(requestId: string, candidateId: string): Promise<ExtensionResponse> {
  candidateMemory.remove(candidateId);
  return { success: true, requestId, data: { dismissed: true } };
}


