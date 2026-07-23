import { ExtensionPlatform } from './ExtensionPlatform';

export const ChromiumAdapter: ExtensionPlatform = {
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
    onMessage: {
      addListener: (callback) => chrome.runtime.onMessage.addListener(callback),
    },
    get id() { return chrome.runtime.id; },
    getURL: (path) => chrome.runtime.getURL(path),
    openOptionsPage: () => new Promise<void>((resolve) => chrome.runtime.openOptionsPage(resolve)),
  },
  storage: {
    get: (keys) => chrome.storage.local.get(keys),
    set: (items) => chrome.storage.local.set(items),
    remove: (keys) => chrome.storage.local.remove(keys),
  },
  tabs: {
    query: (queryInfo) => chrome.tabs.query(queryInfo),
  },
  scripting: {
    executeScript: (injection) => chrome.scripting.executeScript(injection),
  },
  commands: {
    onCommand: {
      addListener: (callback) => chrome.commands.onCommand.addListener(callback),
    },
  },
  contextMenus: {
    create: (props, callback) => chrome.contextMenus.create(props, callback),
  },
  windows: {
    create: (options) =>
      new Promise((resolve) => chrome.windows.create(options, () => resolve())),
  },
};
