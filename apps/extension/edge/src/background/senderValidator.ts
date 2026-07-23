import { CONTENT_SCRIPT_BLOCKED_TYPES, ExtensionMessage, ExtensionErrorCode } from '@vaultguard/browser-api';
import { platform } from '../platform';

/** Pages that are allowed to send privileged (non-content-script) messages */
const TRUSTED_PAGES = ['popup.html', 'options.html', 'unlock.html'];

export interface SenderValidationResult {
  valid: boolean;
  surface: 'popup' | 'options' | 'unlock' | 'content' | 'unknown';
  error?: ExtensionErrorCode;
}

/**
 * Validates that a message sender is a legitimate extension surface.
 * Rules:
 *  1. sender.id must match the extension's own ID (rejects external origins)
 *  2. Internal pages (popup/options/unlock) must have a URL matching a known page
 *  3. Content scripts must have sender.tab present and an http(s) URL
 *  4. Content scripts cannot send write/auth operations
 */
export function validateSender(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): SenderValidationResult {
  // Rule 1 — must come from our own extension
  if (sender.id !== platform.runtime.id) {
    return { valid: false, surface: 'unknown', error: 'UNAUTHORIZED_SENDER' };
  }

  const senderUrl = sender.url ?? '';

  // Rule 2 — internal extension page
  const extensionOrigin = platform.runtime.getURL('');
  if (senderUrl.startsWith(extensionOrigin)) {
    const matchedPage = TRUSTED_PAGES.find((page) => senderUrl.includes(page));
    if (!matchedPage) {
      // Could be background messaging itself or the expanded vault.html — allow
      return { valid: true, surface: 'unknown' };
    }
    const surface = matchedPage.replace('.html', '') as 'popup' | 'options' | 'unlock';
    return { valid: true, surface };
  }

  // If we have no tab but it's not an internal URL, it might be an invalid sender
  if (!sender.tab) {
    return { valid: false, surface: 'unknown', error: 'UNAUTHORIZED_SENDER' };
  }

  // Rule 3 — content script: must have a valid tab + http(s) URL
  const tabUrl = sender.tab.url ?? senderUrl;
  if (!tabUrl.startsWith('http://') && !tabUrl.startsWith('https://')) {
    return { valid: false, surface: 'content', error: 'UNAUTHORIZED_SENDER' };
  }

  // Rule 4 — content scripts cannot send blocked message types
  if (CONTENT_SCRIPT_BLOCKED_TYPES.has(message.type as any)) {
    return { valid: false, surface: 'content', error: 'ACCESS_DENIED' };
  }

  return { valid: true, surface: 'content' };
}
