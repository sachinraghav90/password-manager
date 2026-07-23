import { SaveLoginInput, PageContext } from '@vaultguard/browser-api';

export interface SaveCandidate {
  id: string;
  candidate: Omit<SaveLoginInput, 'vaultId' | 'title' | 'url'>;
  page: PageContext;
  timestamp: number;
}

const EXPIRY_MS = 120_000; // 120 seconds

export class CandidateMemory {
  private candidates = new Map<string, SaveCandidate>();

  constructor() {
    // Cleanup interval
    setInterval(() => this.cleanupExpired(), 10_000);
  }

  add(candidateData: Omit<SaveLoginInput, 'vaultId' | 'title' | 'url'>, page: PageContext): string {
    const id = crypto.randomUUID();
    this.candidates.set(id, {
      id,
      candidate: candidateData,
      page,
      timestamp: Date.now()
    });
    return id;
  }

  latest(): SaveCandidate | undefined {
    return Array.from(this.candidates.values()).sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  get(id: string): SaveCandidate | undefined {
    return this.candidates.get(id);
  }

  remove(id: string) {
    this.candidates.delete(id);
  }

  clearAll() {
    this.candidates.clear();
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, data] of this.candidates.entries()) {
      if (now - data.timestamp > EXPIRY_MS) {
        this.candidates.delete(id);
      }
    }
  }
}

export const candidateMemory = new CandidateMemory();
