import { StorageAdapter } from './StorageAdapter';
import { WebStorageAdapter } from './WebStorageAdapter';
import { ExtensionStorageAdapter } from './ExtensionStorageAdapter';

// Determine the environment and export the correct storage instance.
// For now, if we detect chrome.storage, we assume extension environment.
const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export const storage: StorageAdapter = isExtension 
  ? new ExtensionStorageAdapter() 
  : new WebStorageAdapter();
