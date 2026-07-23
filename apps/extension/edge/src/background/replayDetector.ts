/**
 * Replay detector — rejects messages whose ID has already been processed,
 * or whose sentAt timestamp is more than 30 seconds old.
 */
const SEEN_IDS = new Set<string>();
const MAX_AGE_MS = 30_000; // 30 seconds
const MAX_CACHE_SIZE = 1000;

export function checkReplay(id: string, sentAt: number): boolean {
  const now = Date.now();

  // Reject stale messages
  if (now - sentAt > MAX_AGE_MS) return false;

  // Reject already-seen IDs
  if (SEEN_IDS.has(id)) return false;

  // Prevent unbounded memory growth
  if (SEEN_IDS.size >= MAX_CACHE_SIZE) {
    // Clear oldest half (Set preserves insertion order)
    const iter = SEEN_IDS.values();
    for (let i = 0; i < MAX_CACHE_SIZE / 2; i++) {
      SEEN_IDS.delete(iter.next().value!);
    }
  }

  SEEN_IDS.add(id);
  return true;
}
