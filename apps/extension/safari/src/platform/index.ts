import { SafariPlatformAdapter } from './SafariPlatformAdapter';
import { ExtensionPlatform } from './ExtensionPlatform';

export const platform: ExtensionPlatform = SafariPlatformAdapter;
export { SafariPlatformAdapter } from './SafariPlatformAdapter';
export * from './ExtensionPlatform';