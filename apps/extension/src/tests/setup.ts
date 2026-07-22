import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Define chrome globally if it doesn't exist so autoLock and other files don't crash
if (typeof (globalThis as any).chrome === 'undefined') {
  (globalThis as any).chrome = {
    alarms: {
      create: vi.fn(),
      clear: vi.fn(),
      onAlarm: { addListener: vi.fn() }
    }
  };
}
