import { platform } from '../platform';
import { getAuthState, handleLock } from './handlers/authHandler';

// Constants for auto-lock timeouts (in minutes)
export const AUTO_LOCK_TIMEOUTS = {
  IMMEDIATELY: 0,
  ONE_MIN: 1,
  FIVE_MIN: 5,
  FIFTEEN_MIN: 15,
  THIRTY_MIN: 30,
  ONE_HOUR: 60,
  NEVER: -1,
};

const DEFAULT_TIMEOUT = AUTO_LOCK_TIMEOUTS.FIFTEEN_MIN;
const ALARM_NAME = 'vaultguard-auto-lock';

/**
 * Gets the configured auto-lock timeout from storage, or the default.
 */
async function getTimeoutSetting(): Promise<number> {
  const data = await platform.storage.get('autoLockTimeout');
  if (typeof data.autoLockTimeout === 'number') {
    return data.autoLockTimeout;
  }
  return DEFAULT_TIMEOUT;
}

/**
 * Resets the auto-lock timer based on the current configuration.
 * Called whenever there is user activity (e.g., messaging the background).
 */
export async function resetAutoLockTimer(): Promise<void> {
  const auth = await getAuthState();
  
  // Don't set alarms if we're not unlocked
  if (auth.locked) {
    chrome.alarms?.clear(ALARM_NAME);
    return;
  }

  const timeoutMinutes = await getTimeoutSetting();

  if (timeoutMinutes === AUTO_LOCK_TIMEOUTS.NEVER) {
    chrome.alarms?.clear(ALARM_NAME);
    return;
  }

  if (timeoutMinutes === AUTO_LOCK_TIMEOUTS.IMMEDIATELY) {
    // If set to immediately, lock right away (edge case, but handled)
    handleLock('internal-auto-lock');
    return;
  }

  // Create or update the alarm
  chrome.alarms?.create(ALARM_NAME, { delayInMinutes: timeoutMinutes });
}

/**
 * Listens for the auto-lock alarm to trigger.
 */
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      console.log('Auto-lock timeout reached. Locking vault.');
      handleLock('internal-auto-lock');
    }
  });
}
