import { ExtensionResponse, SaveLoginInput, UpdateLoginInput } from '@vaultguard/browser-api';
import { getAuthState } from './authHandler';
import { ensureActiveUser, vaultService } from './vaultHandler';

/** FILL_LOGIN — Phase 4 stub. Credential delivery to content scripts implemented in Phase 5. */
export async function handleFillLogin(
  itemId: string,
  tabId: number,
  frameId: number | undefined,
  requestId: string
): Promise<ExtensionResponse<null>> {
  const auth = await getAuthState();
  if (auth.locked) {
    return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
  }

  if (!itemId || typeof tabId !== 'number' || tabId <= 0) {
    return {
      success: false,
      requestId,
      error: { code: 'INVALID_PAYLOAD', message: 'itemId and tabId are required' },
    };
  }

  // TODO Phase 5: decrypt credentials from vault, inject via scripting API into tabId/frameId
  void frameId;

  return {
    success: false,
    requestId,
    error: { code: 'NOT_IMPLEMENTED', message: 'FILL_LOGIN will be implemented in Phase 5' },
  };
}

/** SAVE_LOGIN — Phase 4 stub. Encryption + persistence in Phase 5. */
export async function handleSaveLogin(
  payload: SaveLoginInput,
  requestId: string
): Promise<ExtensionResponse<{ itemId: string }>> {
  const auth = await getAuthState();
  if (auth.locked) {
    return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
  }

  if (!payload?.title || !payload?.url || !payload?.vaultId) {
    return {
      success: false,
      requestId,
      error: { code: 'INVALID_PAYLOAD', message: 'title, url and vaultId are required' },
    };
  }

  await ensureActiveUser();
  const itemId = await vaultService.createLogin(payload.vaultId, payload.title, payload.username || '', payload.password || '', payload.url);
  return { success: true, requestId, data: { itemId } };
}

/** UPDATE_LOGIN — Phase 4 stub. */
export async function handleUpdateLogin(
  payload: UpdateLoginInput,
  requestId: string
): Promise<ExtensionResponse<{ itemId: string }>> {
  const auth = await getAuthState();
  if (auth.locked) {
    return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
  }

  if (!payload?.itemId) {
    return {
      success: false,
      requestId,
      error: { code: 'INVALID_PAYLOAD', message: 'itemId is required' },
    };
  }

  // TODO Phase 5: encrypt updated fields and persist via @vaultguard/db-local
  return {
    success: false,
    requestId,
    error: { code: 'NOT_IMPLEMENTED', message: 'UPDATE_LOGIN will be implemented in Phase 5' },
  };
}
