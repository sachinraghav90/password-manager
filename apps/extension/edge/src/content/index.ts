import { startFormObserver, stopFormObserver } from './forms/observer';
import { startFormInterceptor, stopFormInterceptor } from './forms/interceptor';
import { injectOverlayManager } from './ui/OverlayManager';
import { sendToBackground } from '../messaging/client';

console.log('VaultGuard content script loaded.');

// Start the form detection observer and interceptor
startFormObserver();
startFormInterceptor();
injectOverlayManager();
setTimeout(() => {
  void sendToBackground<any>({ type: 'GET_PENDING_SAVE_CANDIDATE' }).then(response => {
    const candidate = response.success ? response.data?.candidate : null;
    if (candidate) window.dispatchEvent(new CustomEvent('vg:save_candidate', { detail: candidate }));
  }).catch(() => {});
}, 250);

// Optional: cleanup on pagehide (modern alternative to unload)
window.addEventListener('pagehide', () => {
  stopFormObserver();
});

import { handleAutofillMessage } from './autofill';
import { ExecuteFillPayload } from '@vaultguard/browser-api';

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === 'EXECUTE_FILL') {
    // Only accept EXECUTE_FILL if it came from the background script via chrome.runtime.onMessage, 
    // wait, background sends directly to chrome.runtime.onMessage in content scripts.
  }

  if (event.data.type === 'VG_DEV_SYNC') {
    const envelope = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
      sentAt: Date.now(),
      payload: {
        type: 'DEV_SYNC',
        user: event.data.user,
        vaults: event.data.vaults,
        logins: event.data.logins,
        secure_notes: event.data.secure_notes,
        credit_cards: event.data.credit_cards,
        identities: event.data.identities,
        item_index: event.data.item_index
      }
    };
    console.log("Content Script: Forwarding VG_DEV_SYNC to background...", envelope);
    chrome.runtime.sendMessage(envelope)
      .then(res => {
        console.log("Background response:", res);
        window.postMessage({ type: 'VG_DEV_SYNC_REPLY', success: true, res }, '*');
      })
      .catch(err => {
        console.error("VaultGuard sync error:", err);
        window.postMessage({ type: 'VG_DEV_SYNC_REPLY', success: false, error: err.message }, '*');
      });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXECUTE_FILL') {
    const status = handleAutofillMessage(message as ExecuteFillPayload);
    sendResponse({ status });
  }
  return true;
});
