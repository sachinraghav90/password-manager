import { db } from '../client';
import { OrganizationDomain, DomainVerificationMethod } from '../schema';
import { auditService } from './auditService';

export interface DomainVerificationChallenge {
  domain: string;
  method: DomainVerificationMethod;
  challengeValue: string;
  expiresAt: number;
}

export interface DomainVerificationProvider {
  startVerification(organizationId: string, domain: string): Promise<DomainVerificationChallenge>;
  verifyDomain(organizationId: string, domain: string): Promise<boolean>;
}

export class SimulatedDomainProvider implements DomainVerificationProvider {
  async startVerification(organizationId: string, domain: string): Promise<DomainVerificationChallenge> {
    const org = await db.organizations.get(organizationId);
    if (!org) throw new Error('Organization not found');

    const challenge: DomainVerificationChallenge = {
      domain,
      method: 'dns_txt',
      challengeValue: `vaultguard-verification-${crypto.randomUUID()}`,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    };

    // Note: A real implementation would store a hashed challenge here.
    return challenge;
  }

  async verifyDomain(_organizationId: string, _domain: string): Promise<boolean> {
    // In our simulation, clicking "verify" succeeds automatically if the record is pending
    return true;
  }
}

export const domainService = {
  provider: new SimulatedDomainProvider(),

  normalizeDomain(rawDomain: string): string {
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

    // In a real app we'd also block common email providers (gmail.com, etc)
    return domain;
  },

  async claimDomain(organizationId: string, actorUserId: string, rawDomain: string): Promise<OrganizationDomain> {
    const domain = this.normalizeDomain(rawDomain);

    return await db.transaction('rw', [db.organization_domains, db.organizations, db.audit_events], async () => {
      const org = await db.organizations.get(organizationId);
      if (!org) throw new Error('Organization not found');

      // Check conflict
      const existing = await db.organization_domains.where('domain').equals(domain).toArray();
      const verifiedConflict = existing.find(d => d.verificationStatus === 'verified' && d.organizationId !== organizationId);
      
      if (verifiedConflict) {
        throw new Error('Domain is already verified by another organization.');
      }

      const domainRecord: OrganizationDomain = {
        id: crypto.randomUUID(),
        organizationId,
        domain,
        verificationStatus: 'unverified',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.organization_domains.add(domainRecord);

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_domain_added',
        targetId: domainRecord.id,
        targetType: 'domain'
      });

      return domainRecord;
    });
  },

  async startVerification(organizationId: string, actorUserId: string, domainId: string): Promise<DomainVerificationChallenge> {
    const domainRecord = await db.organization_domains.get(domainId);
    if (!domainRecord || domainRecord.organizationId !== organizationId) {
      throw new Error('Domain not found');
    }

    const challenge = await this.provider.startVerification(organizationId, domainRecord.domain);

    await db.transaction('rw', [db.organization_domains, db.audit_events], async () => {
      await db.organization_domains.update(domainId, {
        verificationStatus: 'pending',
        verificationMethod: challenge.method,
        updatedAt: Date.now()
      });

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: 'organization_domain_verification_started',
        targetId: domainId,
        targetType: 'domain'
      });
    });

    return challenge;
  },

  async simulateVerify(organizationId: string, actorUserId: string, domainId: string): Promise<boolean> {
    const domainRecord = await db.organization_domains.get(domainId);
    if (!domainRecord || domainRecord.organizationId !== organizationId) {
      throw new Error('Domain not found');
    }

    if (domainRecord.verificationStatus !== 'pending') {
      throw new Error('Verification must be started first');
    }

    const success = await this.provider.verifyDomain(organizationId, domainRecord.domain);

    await db.transaction('rw', [db.organization_domains, db.audit_events], async () => {
      await db.organization_domains.update(domainId, {
        verificationStatus: success ? 'verified' : 'failed',
        verifiedAt: success ? Date.now() : undefined,
        updatedAt: Date.now()
      });

      await auditService.logEvent({
        organizationId,
        actorUserId,
        eventType: success ? 'organization_domain_verified' : 'organization_domain_verification_failed',
        targetId: domainId,
        targetType: 'domain'
      });
    });

    return success;
  }
};
