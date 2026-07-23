import { ContextData, ExtensionResponse } from '@vaultguard/browser-api';
import { getAuthState } from './authHandler';

interface ActiveContext {
  type: 'personal' | 'organization';
  id: string;
  name: string;
}

let activeContext: ActiveContext = {
  type: 'personal',
  id: 'personal',
  name: 'Personal',
};

export async function handleGetContext(
  requestId: string
): Promise<ExtensionResponse<ContextData>> {
  const auth = await getAuthState();
  if (auth.locked) {
    return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
  }
  return { success: true, requestId, data: { ...activeContext } };
}

export async function handleSwitchContext(
  contextId: string,
  requestId: string
): Promise<ExtensionResponse<ContextData>> {
  const auth = await getAuthState();
  if (auth.locked) {
    return { success: false, requestId, error: { code: 'VAULT_LOCKED' } };
  }

  // TODO Phase 5: resolve real context from DB
  activeContext = {
    type: contextId === 'personal' ? 'personal' : 'organization',
    id: contextId,
    name: contextId === 'personal' ? 'Personal' : `Organization ${contextId}`,
  };

  return { success: true, requestId, data: { ...activeContext } };
}
