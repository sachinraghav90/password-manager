export interface SiteExclusions {
  neverFill: boolean;
  neverSave: boolean;
}

export class ExclusionService {
  private memoryCache = new Map<string, SiteExclusions>();

  async getExclusions(domain: string): Promise<SiteExclusions> {
    if (this.memoryCache.has(domain)) {
      return this.memoryCache.get(domain)!;
    }

    const key = `exclusion_${domain}`;
    const result = await chrome.storage.local.get(key);
    
    const exclusions: SiteExclusions = result[key] || { neverFill: false, neverSave: false };
    this.memoryCache.set(domain, exclusions);
    
    return exclusions;
  }

  async setExclusion(domain: string, type: keyof SiteExclusions, value: boolean) {
    const current = await this.getExclusions(domain);
    const updated = { ...current, [type]: value };
    
    const key = `exclusion_${domain}`;
    await chrome.storage.local.set({ [key]: updated });
    this.memoryCache.set(domain, updated);
  }
}

export const exclusionService = new ExclusionService();
