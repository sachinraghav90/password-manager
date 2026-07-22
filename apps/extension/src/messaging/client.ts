import { ExtensionEnvelope, ExtensionMessage, ExtensionResponse } from '@vaultguard/browser-api';
import { platform } from '../platform';

let _counter = 0;

/** Generates a lightweight correlation ID without external deps */
function generateId(): string {
  _counter = (_counter + 1) % 1_000_000;
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${_counter}`;
}

/**
 * Type-safe wrapper for sending messages to the background service worker.
 * Automatically wraps in ExtensionEnvelope and returns typed response.
 */
export async function sendToBackground<T = unknown>(
  message: ExtensionMessage
): Promise<ExtensionResponse<T>> {
  const requestId = 'requestId' in message && typeof message.requestId === 'string'
    ? message.requestId
    : generateId();
  const envelope: ExtensionEnvelope = {
    id: requestId,
    payload: message,
    sentAt: Date.now(),
  };
  const response = await platform.runtime.sendMessage(envelope);
  return response as ExtensionResponse<T>;
}

/**
 * Opens the popup as a resizable window via the platform abstraction.
 * Compatible with Chrome, Edge, and Safari.
 */
export function openExpandedPopup(): Promise<void> {
  const promise = platform.windows.create({
    url: platform.runtime.getURL('vault.html'),
    type: 'popup',
    width: 800,
    height: 600,
    focused: true,
  });
  setTimeout(() => window.close(), 200);
  return promise;
}

export function openOptionsPage(): Promise<void> {
  return platform.runtime.openOptionsPage();
}

