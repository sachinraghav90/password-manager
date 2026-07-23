import { ExtensionPlatform } from './ExtensionPlatform';

/** Edge WebExtension adapter: prefer the standards namespace, retain Chromium fallback. */
const api: any = (globalThis as any).browser ?? (globalThis as any).chrome;
const call = (fn: any, ...args: any[]) => {
  const result = fn(...args);
  return result && typeof result.then === 'function' ? result : Promise.resolve(result);
};

export const EdgePlatformAdapter: ExtensionPlatform = {
  runtime: {
    sendMessage: (message) => call(api.runtime.sendMessage.bind(api.runtime), message),
    onMessage: { addListener: (callback) => api.runtime.onMessage.addListener(callback) },
    get id() { return api.runtime.id; },
    getURL: (path) => api.runtime.getURL(path),
    openOptionsPage: () => call(api.runtime.openOptionsPage.bind(api.runtime)),
  },
  storage: {
    get: (keys) => call(api.storage.local.get.bind(api.storage.local), keys),
    set: (items) => call(api.storage.local.set.bind(api.storage.local), items),
    remove: (keys) => call(api.storage.local.remove.bind(api.storage.local), keys),
  },
  tabs: { query: (queryInfo) => call(api.tabs.query.bind(api.tabs), queryInfo) },
  scripting: { executeScript: (injection) => call(api.scripting.executeScript.bind(api.scripting), injection) },
  commands: { onCommand: { addListener: (callback) => api.commands?.onCommand?.addListener(callback) } },
  contextMenus: { create: (props, callback) => api.contextMenus?.create(props, callback) },
  windows: { create: (options) => call(api.windows.create.bind(api.windows), options).then(() => undefined) },
};