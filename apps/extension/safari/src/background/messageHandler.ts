import { ExtensionEnvelope, ExtensionResponse, ExtensionErrorCode } from '@vaultguard/browser-api';
import { validateSender } from './senderValidator';
import { checkRateLimit, resetRateLimit } from './rateLimiter';
import { checkReplay } from './replayDetector';
import { handleGetAuthState, handleLock, handleUnlock } from './handlers/authHandler';
import { handleGetContext, handleSwitchContext } from './handlers/contextHandler';
import { handleGetMatchingLogins, handleGeneratePassword, handleGetPopupLogins, handleGetLoginSecret, handleCopyLoginField, handleOpenLoginWebsite, handleCreateItemInWeb } from './handlers/vaultHandler';
import { handleFillLogin, handleRequestInlineFill } from './handlers/autofillHandler';
import { handleSaveLogin, handleUpdateLogin } from './handlers/loginHandler';
import { resetAutoLockTimer } from './autoLock';
import { db } from '@vaultguard/db-local';
import { SupabaseSyncEngine } from '@vaultguard/sync-supabase';
import { handleLogin } from './handlers/authHandler';
import {
  handleGetInlineSuggestions,
  handleCreateSaveCandidate,
  handleGetSaveCandidateSummary, handleGetPendingSaveCandidate,
  handleSaveLoginCandidate,
  handleUpdateLoginCandidate,
  handleDismissSaveCandidate
} from './handlers/inlineHandler';

const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB hard limit

function err(requestId: string, code: ExtensionErrorCode, message?: string): ExtensionResponse {
  return { success: false, requestId, error: { code, message } };
}

/**
 * Central typed message router for the background service worker.
 * All security checks run before any handler is invoked.
 */
export async function handleMessage(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void
): Promise<boolean> {
  // â”€â”€ 1. Payload size guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let jsonSize: number;
  try {
    jsonSize = JSON.stringify(raw).length;
  } catch {
    sendResponse(err('unknown', 'INVALID_PAYLOAD', 'Cannot serialize message'));
    return false;
  }
  if (jsonSize > MAX_PAYLOAD_BYTES) {
    sendResponse(err('unknown', 'OVERSIZED_PAYLOAD', `Max ${MAX_PAYLOAD_BYTES} bytes`));
    return false;
  }

  // â”€â”€ 2. Envelope shape check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const envelope = raw as Partial<ExtensionEnvelope>;
  if (
    typeof envelope?.id !== 'string' ||
    !envelope.id ||
    typeof envelope?.sentAt !== 'number' ||
    !envelope?.payload?.type
  ) {
    sendResponse(err('unknown', 'INVALID_PAYLOAD', 'Malformed envelope'));
    return false;
  }

  const { id: requestId, sentAt, payload } = envelope as ExtensionEnvelope;

  // â”€â”€ 3. Replay detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!checkReplay(requestId, sentAt)) {
    sendResponse(err(requestId, 'REPLAY_DETECTED'));
    return false;
  }

  // â”€â”€ 4. Sender validation (skip for TRIGGER_SYNC and LOGIN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (payload.type !== 'TRIGGER_SYNC' && payload.type !== 'LOGIN') {
    const senderCheck = validateSender(payload, sender);
    if (!senderCheck.valid) {
      sendResponse(err(requestId, senderCheck.error ?? 'UNAUTHORIZED_SENDER'));
      return false;
    }
  }

  const senderId = sender.id ?? 'unknown';

  // â”€â”€ 5. Rate limiting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!checkRateLimit(payload.type, senderId)) {
    sendResponse(err(requestId, 'RATE_LIMITED', `${payload.type} rate limit exceeded`));
    return false;
  }

  // â”€â”€ 6. Auto-Lock Reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Any valid incoming message resets the inactivity timer (except GET_AUTH_STATE which might be polling)
  if (payload.type !== 'GET_AUTH_STATE') {
    resetAutoLockTimer().catch(console.error);
  }

  // â”€â”€ 7. Route to handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let response: ExtensionResponse;

  switch (payload.type) {
    case 'GET_AUTH_STATE':
      response = await handleGetAuthState(requestId);
      break;

    case 'LOCK':
      response = await handleLock(requestId);
      break;

    case 'UNLOCK': {
      if (typeof payload.masterPassword !== 'string' || !payload.masterPassword) {
        response = err(requestId, 'INVALID_PAYLOAD', 'masterPassword is required');
        break;
      }
      response = await handleUnlock(payload.masterPassword, requestId);
      if (response.success) resetRateLimit('UNLOCK', senderId);
      break;
    }

    case 'GET_CONTEXT':
      response = await handleGetContext(requestId);
      break;

    case 'GET_CONTENT_CONTEXT':
      if (sender.tab?.id === undefined || sender.frameId === undefined) {
        response = err(requestId, 'INVALID_CONTEXT', 'Content-script identity unavailable');
        break;
      }
      response = {
        success: true,
        requestId,
        data: {
          tabId: sender.tab.id,
          frameId: sender.frameId,
          documentId: sender.documentId
        }
      };
      break;

    case 'SWITCH_CONTEXT': {
      if (typeof payload.contextId !== 'string' || !payload.contextId) {
        response = err(requestId, 'INVALID_PAYLOAD', 'contextId is required');
        break;
      }
      response = await handleSwitchContext(payload.contextId, requestId);
      break;
    }

    case 'GET_MATCHING_LOGINS': {
      let validPage = false;
      try {
        const parsed = new URL(payload.page?.url || '');
        validPage = ['http:', 'https:'].includes(parsed.protocol) &&
          parsed.hostname === payload.page?.hostname;
      } catch {}
      if (!validPage) {
        response = err(requestId, 'INVALID_PAYLOAD', 'page.url and page.hostname are required');
        break;
      }
      response = await handleGetMatchingLogins(payload.page, requestId);
      break;
    }

    case 'FILL_LOGIN': {
      if (typeof payload.tabId !== 'number' || payload.tabId <= 0) {
        response = err(requestId, 'INVALID_PAYLOAD', 'tabId must be a positive integer');
        break;
      }
      response = await handleFillLogin(payload.itemId, payload.tabId, requestId, payload.frameId, payload.overrideToken);
      break;
    }

    case 'GENERATE_PASSWORD': {
      if (!payload.options || typeof payload.options.length !== 'number') {
        response = err(requestId, 'INVALID_PAYLOAD', 'options.length is required');
        break;
      }
      response = await handleGeneratePassword(payload.options, requestId);
      break;
    }

    case 'SAVE_LOGIN': {
      if (!payload.payload) {
        response = err(requestId, 'INVALID_PAYLOAD', 'payload is required');
        break;
      }
      response = await handleSaveLogin(payload.payload, requestId);
      break;
    }

    case 'UPDATE_LOGIN': {
      if (!payload.payload?.itemId) {
        response = err(requestId, 'INVALID_PAYLOAD', 'payload.itemId is required');
        break;
      }
      response = await handleUpdateLogin(payload.payload, requestId);
      break;
    }

    case 'GET_POPUP_LOGINS': {
      response = await handleGetPopupLogins(payload.query, payload.vaultId, payload.tabUrl, requestId);
      break;
    }

    case 'GET_LOGIN_SECRET': {
      if (!payload.itemId || !payload.vaultId) {
        response = err(requestId, 'INVALID_PAYLOAD', 'itemId and vaultId required');
        break;
      }
      response = await handleGetLoginSecret(payload.itemId, payload.vaultId, requestId);
      break;
    }

    case 'COPY_LOGIN_FIELD': {
      if (!payload.itemId || !payload.vaultId || !payload.field) {
        response = err(requestId, 'INVALID_PAYLOAD', 'itemId, vaultId, field required');
        break;
      }
      response = await handleCopyLoginField(payload.itemId, payload.vaultId, payload.field, requestId);
      break;
    }

    case 'CREATE_ITEM_IN_WEB': {
      if (!payload.itemType) {
        response = err(requestId, 'INVALID_PAYLOAD', 'itemType required');
        break;
      }
      response = await handleCreateItemInWeb(payload.itemType, requestId);
      break;
    }

    case 'OPEN_LOGIN_WEBSITE': {
      if (!payload.itemId || !payload.vaultId) {
        response = err(requestId, 'INVALID_PAYLOAD', 'itemId and vaultId required');
        break;
      }
      response = await handleOpenLoginWebsite(payload.itemId, payload.vaultId, payload.newTab, requestId);
      break;
    }

      case 'GET_INLINE_SUGGESTIONS':
        if (
          payload.requestId !== requestId ||
          !payload.page ||
          typeof payload.page.tabId !== 'number' ||
          typeof payload.page.frameId !== 'number'
        ) {
          response = err(requestId, 'INVALID_PAYLOAD', 'Invalid inline suggestions request');
          break;
        }
        response = await handleGetInlineSuggestions(requestId, payload.page, sender);
        break;

      case 'REQUEST_INLINE_FILL':
        if (
          payload.requestId !== requestId ||
          !payload.itemId ||
          typeof payload.tabId !== 'number' ||
          typeof payload.frameId !== 'number' ||
          !payload.pageUrl
        ) {
          response = err(requestId, 'INVALID_PAYLOAD', 'Invalid inline fill request');
          break;
        }
        response = await handleRequestInlineFill(payload, sender);
        break;

      case 'CREATE_SAVE_CANDIDATE':
        if (!payload.candidate || !payload.page) { response = err(requestId, 'INVALID_PAYLOAD', 'candidate, page required'); break; }
        response = await handleCreateSaveCandidate(requestId, payload.candidate, payload.page);
        break;

      case 'GET_PENDING_SAVE_CANDIDATE': response = await handleGetPendingSaveCandidate(requestId); break;
      case 'GET_SAVE_CANDIDATE_SUMMARY':
        if (!payload.candidateId) { response = err(requestId, 'INVALID_PAYLOAD', 'candidateId required'); break; }
        response = await handleGetSaveCandidateSummary(requestId, payload.candidateId);
        break;

      case 'SAVE_LOGIN_CANDIDATE':
        if (!payload.candidateId || !payload.vaultId || !payload.title) { response = err(requestId, 'INVALID_PAYLOAD', 'candidateId, vaultId, title required'); break; }
        response = await handleSaveLoginCandidate(requestId, payload.candidateId, payload.vaultId, payload.title, payload.username);
        break;

      case 'UPDATE_LOGIN_CANDIDATE':
        if (!payload.candidateId || !payload.itemId || !payload.vaultId) { response = err(requestId, 'INVALID_PAYLOAD', 'candidateId, itemId, vaultId required'); break; }
        response = await handleUpdateLoginCandidate(requestId, payload.candidateId, payload.itemId, payload.vaultId);
        break;

      case 'DISMISS_SAVE_CANDIDATE':
        if (!payload.candidateId) { response = err(requestId, 'INVALID_PAYLOAD', 'candidateId required'); break; }
        response = await handleDismissSaveCandidate(requestId, payload.candidateId);
        break;

      case 'DEV_SYNC': {
      try {
        if (!payload.user) {
          response = err(requestId, 'INVALID_PAYLOAD', 'user required for DEV_SYNC');
          break;
        }
        
        await db.transaction('rw', [db.users, db.vaults, db.pm_logins, db.pm_secure_notes, db.pm_credit_cards, db.pm_identities, db.pm_item_index], async () => {
          // Save user
          await db.users.put(payload.user);
          
          // Save vaults
          if (payload.vaults && Array.isArray(payload.vaults)) {
            for (const vault of payload.vaults) {
              await db.vaults.put(vault);
            }
          }
          
          // Save logins
          if (payload.logins && Array.isArray(payload.logins)) {
            for (const login of payload.logins) await db.pm_logins.put(login);
          }

          // Save secure notes
          if (payload.secure_notes && Array.isArray(payload.secure_notes)) {
            for (const note of payload.secure_notes) await db.pm_secure_notes.put(note);
          }

          // Save credit cards
          if (payload.credit_cards && Array.isArray(payload.credit_cards)) {
            for (const card of payload.credit_cards) await db.pm_credit_cards.put(card);
          }

          // Save identities
          if (payload.identities && Array.isArray(payload.identities)) {
            for (const identity of payload.identities) await db.pm_identities.put(identity);
          }
          
          // Save index
          if (payload.item_index && Array.isArray(payload.item_index)) {
            for (const index of payload.item_index) await db.pm_item_index.put(index);
          }
        });
        
        response = { success: true, requestId, data: { synced: true } };
      } catch (err: any) {
        response = { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
      }
      break;
    }

    case 'TRIGGER_SYNC': {
      try {
        const syncEngine = new SupabaseSyncEngine(
          (import.meta as any).env.VITE_SUPABASE_URL,
          (import.meta as any).env.VITE_SUPABASE_ANON_KEY
        );
        const { changes } = await syncEngine.pullChanges(0);
        
        // Save to local DB so extension can use them
        const authResponse = await handleGetAuthState(requestId);
        const userId = authResponse.success && authResponse.data ? authResponse.data.accountId : null;
        if (userId) {
          await db.transaction('rw', [db.vaults, db.pm_logins, db.pm_item_index], async () => {
            // Save vaults
            for (const v of changes.vaults) {
              const existing = await db.vaults.get(v.id);
              if (!existing) {
                await db.vaults.put({
                  id: v.id,
                  ownerUserId: userId,
                  wrappedVaultKey: (v as any).wrapped_vault_key || (v as any).wrappedVaultKey,
                  vaultKeyNonce: (v as any).vault_key_nonce || (v as any).vaultKeyNonce,
                  ownershipType: 'personal',
                  organizationId: null,
                  createdBy: userId,
                  encryptionVersion: 1,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                } as any);
              }
            }
            // Save items
            for (const rawItem of changes.items) {
              const item = rawItem as any;
              if (item.item_type === 'login' || item.type === 'login') {
                const existing = await db.pm_item_index.where('itemId').equals(item.id).first();
                if (!existing) {
                  await db.pm_item_index.put({
                    itemId: item.id,
                    userId: userId,
                    vaultId: item.vault_id || item.vaultId,
                    itemType: 'login',
                    encryptedTitle: item.encrypted_title || item.title,
                    titleNonce: item.title_nonce || item.titleNonce,
                    favorite: false,
                    lastAccessedAt: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  });
                  await db.pm_logins.put({
                    id: item.id,
                    userId: userId,
                    vaultId: item.vault_id || item.vaultId,
                    favorite: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    encryptedData: item.encrypted_data || item.encryptedData,
                    dataNonce: item.data_nonce || item.dataNonce,
                    schemaVersion: 1
                  });
                }
              }
            }
          });
        }
        
        response = { success: true, requestId, data: { changesCount: changes.items.length } };
      } catch (err: any) {
        response = { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
      }
      break;
    }

    case 'LOGIN': {
      response = await handleLogin(payload.email, payload.masterPassword, requestId);
      break;
    }

    default: {
      const _exhaustive: never = payload;
      void _exhaustive;
      response = err(requestId, 'UNKNOWN_MESSAGE_TYPE');
    }
  }

  sendResponse(response);
  return false;
}


