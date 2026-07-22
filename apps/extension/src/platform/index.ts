import { ChromiumAdapter } from './ChromiumAdapter';
import { WebExtensionAdapter } from './WebExtensionAdapter';
import { ExtensionPlatform } from './ExtensionPlatform';

// Basic platform detection
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const platform: ExtensionPlatform = isSafari ? WebExtensionAdapter : ChromiumAdapter;
export * from './ExtensionPlatform';
