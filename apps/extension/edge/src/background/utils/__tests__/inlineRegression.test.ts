import { describe, expect, it } from 'vitest';
import { PageContext } from '@vaultguard/browser-api';
import {
  calculateMatchScore,
  normalizeWebsiteEntries
} from '../matchEngine';

const page = (url: string): PageContext => {
  const parsed = new URL(url);
  return {
    url,
    origin: parsed.origin,
    hostname: parsed.hostname,
    isTopFrame: true
  };
};

describe('inline autofill regressions', () => {
  it('normalizes legacy website fields into canonical metadata', () => {
    expect(normalizeWebsiteEntries({ website: 'https://github.com/login' })).toEqual([
      { url: 'https://github.com/login', autofillBehavior: 'fill_exact_host' }
    ]);
    expect(normalizeWebsiteEntries({
      websites: [{ url: 'https://github.com', autofill: 'fill_anywhere' }]
    })[0].autofillBehavior).toBe('fill_anywhere');
    expect(normalizeWebsiteEntries({
      websiteEntries: [{ url: 'https://github.com', autofillBehavior: 'never_fill' }]
    })[0].autofillBehavior).toBe('never_fill');
    expect(normalizeWebsiteEntries({ title: 'GitHub Login' })).toEqual([]);
  });

  it('matches exact GitHub URL and root URL to its login path', () => {
    const saved = normalizeWebsiteEntries({ website: 'https://github.com' });
    expect(calculateMatchScore(saved[0], page('https://github.com/login'))).toBe(95);
    expect(calculateMatchScore(
      normalizeWebsiteEntries({ website: 'https://github.com/login' })[0],
      page('https://github.com/login/')
    )).toBe(100);
  });

  it('rejects lookalike domains, unsupported schemes, and never-fill entries', () => {
    const saved = normalizeWebsiteEntries({ website: 'https://github.com' })[0];
    expect(calculateMatchScore(saved, page('https://github.com.evil.example'))).toBe(0);
    expect(calculateMatchScore(saved, page('https://evilgithub.com'))).toBe(0);
    expect(calculateMatchScore(saved, page('ftp://github.com'))).toBe(0);
    expect(calculateMatchScore(
      normalizeWebsiteEntries({ websites: [{ url: 'https://github.com', autofillBehavior: 'never_fill' }] })[0],
      page('https://github.com')
    )).toBe(0);
  });

  it('normalizes uppercase hosts, trailing dots, and default ports', () => {
    const saved = normalizeWebsiteEntries({ website: 'HTTPS://GITHUB.COM:443' })[0];
    expect(calculateMatchScore(saved, page('https://github.com./login'))).toBe(95);
  });
});
