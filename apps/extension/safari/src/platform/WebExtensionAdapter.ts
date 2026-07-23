import { ExtensionPlatform } from './ExtensionPlatform';
import { ChromiumAdapter } from './ChromiumAdapter';

/**
 * WebExtension adapter for Safari (and Firefox).
 * Safari Web Extensions support the chrome.* namespace since Safari 14.
 * Override only where APIs actually differ.
 */
export const WebExtensionAdapter: ExtensionPlatform = {
  ...ChromiumAdapter,

  // Safari-specific overrides go here when needed
  // e.g., safari.extension.* APIs for older Safari versions
};
