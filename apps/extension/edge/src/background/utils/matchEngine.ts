import { PageContext } from '@vaultguard/browser-api';

export type AutofillBehavior = 'fill_exact_host' | 'fill_anywhere' | 'never_fill';

export interface WebsiteEntry {
  url: string;
  autofillBehavior?: AutofillBehavior;
  /** Legacy persisted field. */
  autofill?: AutofillBehavior;
}

function asWebsiteEntry(value: unknown): WebsiteEntry | null {
  if (typeof value === 'string') {
    return value.trim() ? { url: value.trim(), autofillBehavior: 'fill_exact_host' } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.url !== 'string' || !candidate.url.trim()) return null;
  const behavior = candidate.autofillBehavior ?? candidate.autofill;
  const autofillBehavior: AutofillBehavior =
    behavior === 'fill_anywhere' || behavior === 'never_fill' || behavior === 'fill_exact_host'
      ? behavior
      : 'fill_exact_host';
  return { url: candidate.url.trim(), autofillBehavior };
}

/** Compatibility mapper for decrypted legacy and synced login payloads. */
export function normalizeWebsiteEntries(payload: Record<string, unknown>): WebsiteEntry[] {
  const values: unknown[] = [];
  for (const field of ['websiteEntries', 'websites', 'urls'] as const) {
    const candidate = payload[field];
    if (Array.isArray(candidate)) values.push(...candidate);
    else if (candidate != null) values.push(candidate);
  }
  if (payload.website != null) values.push(payload.website);

  // item_indexes.domain is explicit synced metadata, not a title fallback.
  for (const field of ['domain', 'websiteUrl', 'website_url'] as const) {
    const candidate = payload[field];
    if (typeof candidate === 'string' && candidate.trim()) {
      const raw = candidate.trim();
      values.push(raw.includes('://') ? raw : 'https://' + raw);
    }
  }

  const seen = new Set<string>();
  const entries: WebsiteEntry[] = [];
  for (const value of values) {
    const entry = asWebsiteEntry(value);
    if (!entry) continue;
    const key = entry.url + '\n' + entry.autofillBehavior;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  return entries;
}

export function normalizeUrl(urlStr: string): URL | null {
  try {
    const url = new URL(urlStr.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hostname = url.hostname.toLowerCase().replace(/\.+$/, '');
    url.username = '';
    url.password = '';
    return url;
  } catch {
    return null;
  }
}

export function calculateMatchScore(saved: WebsiteEntry, page: PageContext): number {
  const behavior = saved.autofillBehavior ?? saved.autofill ?? 'fill_exact_host';
  if (behavior === 'never_fill') return 0;

  const savedUrl = normalizeUrl(saved.url);
  const pageUrl = normalizeUrl(page.url);
  if (!savedUrl || !pageUrl) return 0;
  if (savedUrl.protocol === 'https:' && pageUrl.protocol === 'http:') return 0;

  const exactHostname = savedUrl.hostname === pageUrl.hostname;
  if (!exactHostname) return 0;

  if (exactHostname && savedUrl.origin === pageUrl.origin) {
    const savedPath = savedUrl.pathname.replace(/\/$/, '') || '/';
    const pagePath = pageUrl.pathname.replace(/\/$/, '') || '/';
    return savedPath === pagePath ? 100 : 95;
  }
  if (exactHostname) return 90;

  return 0;
}

export function getBestMatchScore(websites: WebsiteEntry[], page: PageContext): number {
  let bestScore = 0;
  for (const site of websites ?? []) {
    bestScore = Math.max(bestScore, calculateMatchScore(site, page));
  }
  return bestScore;
}




