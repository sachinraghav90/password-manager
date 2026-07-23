import { describe, it, expect } from 'vitest';
import { calculateMatchScore, normalizeUrl } from '../matchEngine';
import { WebsiteEntry } from '@vaultguard/models';
import { PageContext } from '@vaultguard/browser-api';

function createSaved(url: string, autofill: WebsiteEntry['autofill'] = 'fill_anywhere'): WebsiteEntry {
  return { id: '1', url, autofill };
}

function createPage(urlStr: string): PageContext {
  const url = normalizeUrl(urlStr) || new URL('https://invalid.com');
  return {
    url: urlStr,
    hostname: url.hostname,
    origin: url.origin,
    isTopFrame: true
  };
}

describe('matchEngine', () => {
  describe('normalizeUrl', () => {
    it('strips credentials', () => {
      const url = normalizeUrl('https://user:pass@example.com');
      expect(url?.username).toBe('');
      expect(url?.password).toBe('');
      expect(url?.hostname).toBe('example.com');
    });

    it('handles trailing dots', () => {
      const url = normalizeUrl('https://example.com.');
      expect(url?.hostname).toBe('example.com');
    });

    it('normalizes default ports natively', () => {
      const httpUrl = normalizeUrl('http://example.com:80');
      expect(httpUrl?.port).toBe('');
      const httpsUrl = normalizeUrl('https://example.com:443');
      expect(httpsUrl?.port).toBe('');
    });

    it('keeps non-default ports', () => {
      const url = normalizeUrl('https://example.com:8443');
      expect(url?.port).toBe('8443');
    });

    it('rejects URLs without an explicit protocol', () => {
      const url = normalizeUrl('example.com');
      expect(url).toBeNull();
    });

    it('handles punycode/IDN automatically', () => {
      const url1 = normalizeUrl('https://xn--mnchen-3ya.de');
      const url2 = normalizeUrl('https://xn--mnchen-3ya.de');
      expect(url1?.hostname).toBe(url2?.hostname);
    });
  });

  describe('calculateMatchScore', () => {
    it('returns 0 for never_fill', () => {
      const score = calculateMatchScore(createSaved('bank.com', 'never_fill'), createPage('https://bank.com'));
      expect(score).toBe(0);
    });

    it('scores 100 for exact origin match', () => {
      const score = calculateMatchScore(createSaved('https://bank.com'), createPage('https://bank.com'));
      expect(score).toBe(100);
    });

    it('scores 90 for exact hostname but protocol upgrade (http -> https)', () => {
      const score = calculateMatchScore(createSaved('http://bank.com'), createPage('https://bank.com'));
      expect(score).toBe(90);
    });

    it('scores 0 for protocol downgrade (https -> http)', () => {
      const score = calculateMatchScore(createSaved('https://bank.com'), createPage('http://bank.com'));
      expect(score).toBe(0);
    });

    it('scores 90 for exact hostname but different explicit port', () => {
      const score = calculateMatchScore(createSaved('https://bank.com:8443'), createPage('https://bank.com:9443'));
      expect(score).toBe(90);
    });

    it('handles localhost and IP addresses safely as exact match', () => {
      expect(calculateMatchScore(createSaved('http://127.0.0.1'), createPage('http://127.0.0.1'))).toBe(100);
      expect(calculateMatchScore(createSaved('http://127.0.0.1'), createPage('http://127.0.0.2'))).toBe(0);
      expect(calculateMatchScore(createSaved('http://localhost'), createPage('http://localhost'))).toBe(100);
      
      // IPv6 literal
      expect(calculateMatchScore(createSaved('http://[::1]'), createPage('http://[::1]'))).toBe(100);
    });

    it('rejects subdomain phishing attempts natively (exact match constraint)', () => {
      expect(calculateMatchScore(createSaved('bank.com'), createPage('https://bank.com.evil.example'))).toBe(0);
      expect(calculateMatchScore(createSaved('bank.com'), createPage('https://evilbank.com'))).toBe(0);
      expect(calculateMatchScore(createSaved('bank.com'), createPage('https://login.bank.com'))).toBe(0); // 0 because PSL is disabled
    });

    it('handles uppercase hosts by native normalization', () => {
      expect(calculateMatchScore(createSaved('HTTPS://BANK.COM'), createPage('https://bank.com'))).toBe(100);
    });
  });
});


