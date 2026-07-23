import { ExtensionPlatform } from './ExtensionPlatform';

/** WebExtensions adapter for Safari. Uses browser.* when available and falls back to chrome.* in Safari's compatibility runtime. */
const api = () => {
  const value = (globalThis as any).browser ?? (globalThis as any).chrome;
  if (!value) throw new Error('UNSUPPORTED_CAPABILITY: WebExtensions API unavailable');
  return value;
};

const callbackOrPromise = <T>(invoke: (callback: (value: T) => void) => unknown): Promise<T> =>
  new Promise((resolve, reject) => {
    try { invoke(resolve); } catch (error) { reject(error); }
  });

export const SafariPlatformAdapter: ExtensionPlatform = {
  runtime: {
    sendMessage: (message) => Promise.resolve(api().runtime.sendMessage(message)),
    onMessage: { addListener: (callback) => api().runtime.onMessage.addListener(callback) },
    get id() { return api().runtime.id; },
    getURL: (path) => api().runtime.getURL(path),
    openOptionsPage: () => Promise.resolve(api().runtime.openOptionsPage()),
  },
  storage: {
    get: (keys) => Promise.resolve(api().storage.local.get(keys)),
    set: (items) => Promise.resolve(api().storage.local.set(items)),
    remove: (keys) => Promise.resolve(api().storage.local.remove(keys)),
  },
  tabs: { query: (queryInfo) => Promise.resolve(api().tabs.query(queryInfo)) },
  scripting: {
    executeScript: (injection) => Promise.resolve(api().scripting.executeScript(injection)),
  },
  commands: { onCommand: { addListener: (callback) => api().commands?.onCommand?.addListener(callback) } },
  contextMenus: { create: (props, callback) => api().contextMenus?.create(props, callback) },
  windows: {
    create: (options) => {
      const windows = api().windows;
      if (!windows?.create) return Promise.reject(new Error('UNSUPPORTED_CAPABILITY: windows.create'));
      return Promise.resolve(windows.create(options));
    },
  },
};

export { callbackOrPromise };