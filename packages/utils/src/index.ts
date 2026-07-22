/**
 * Normalize a domain string for consistency
 */
export function normalizeDomain(rawDomain: string): string {
  let domain = rawDomain.trim().toLowerCase();
  
  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '');
  
  // Remove paths
  domain = domain.split('/')[0];
  
  // Remove trailing dot
  if (domain.endsWith('.')) {
    domain = domain.slice(0, -1);
  }

  if (domain === 'localhost' || domain.match(/^[0-9.]+$/) || domain.includes('@')) {
    throw new Error('Invalid domain format');
  }

  return domain;
}
