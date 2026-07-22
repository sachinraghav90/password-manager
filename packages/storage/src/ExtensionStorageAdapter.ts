import { StorageAdapter } from './StorageAdapter';

export class ExtensionStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      // @ts-ignore - we'll implement browser abstraction later, for now we use chrome API directly here or use abstraction if it exists
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([key], (result: any) => {
          resolve((result[key] as string) || null);
        });
      } else {
        resolve(null);
      }
    });
  }

  async set(key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove([key], () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
