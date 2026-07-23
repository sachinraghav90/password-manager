import 'fake-indexeddb/auto';
import { vi } from 'vitest';

const runtime = {
  id: 'safari-test',
  sendMessage: vi.fn().mockResolvedValue(undefined),
  onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  getURL: (path: string) => `safari-web-extension://safari-test/${path}`,
  openOptionsPage: vi.fn().mockResolvedValue(undefined),
};
const storageArea = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
};
const storage = { local: storageArea, session: storageArea };
const alarms = {
  create: vi.fn(),
  clear: vi.fn().mockResolvedValue(true),
  onAlarm: { addListener: vi.fn() },
};
(globalThis as any).chrome = {
  runtime,
  storage,
  alarms,
  tabs: { query: vi.fn().mockResolvedValue([]) },
  scripting: { executeScript: vi.fn().mockResolvedValue([]) },
  windows: { create: vi.fn().mockResolvedValue(undefined) },
  commands: { onCommand: { addListener: vi.fn() } },
  contextMenus: { create: vi.fn() },
};
(globalThis as any).browser = (globalThis as any).chrome;