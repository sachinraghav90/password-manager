import { platform } from '../platform';
import { handleMessage } from './messageHandler';

console.log('VaultGuard background service worker started.');

platform.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  handleMessage(raw, sender, sendResponse);
  return true; // keep channel open for async responses
});
