import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, Plus, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { domainService, DomainVerificationChallenge } from '../../lib/db/services/domainService';
import { db } from '@vaultguard/db-local';
import { Button } from '../../components/ui/Button';

export const Domains: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<DomainVerificationChallenge | null>(null);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const items = await db.organization_domains.where({ organizationId }).toArray();
      setDomains(items);
    } catch (err: any) {
      setError('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadDomains();
    }
  }, [organizationId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newDomain.trim()) return;

    try {
      setIsSubmitting(true);
      await domainService.claimDomain(organizationId!, user!.id, newDomain);
      setSuccess('Domain added successfully');
      setNewDomain('');
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartVerification = async (domainId: string) => {
    try {
      setError('');
      setSuccess('');
      const chal = await domainService.startVerification(organizationId!, user!.id, domainId);
      setChallenge(chal);
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSimulateVerify = async (domainId: string) => {
    try {
      setError('');
      setSuccess('');
      const result = await domainService.simulateVerify(organizationId!, user!.id, domainId);
      if (result) {
        setSuccess('Domain verified successfully');
        setChallenge(null);
      } else {
        setError('Verification failed');
      }
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-8">
          <Globe className="w-6 h-6 text-indigo-500" />
          Manage Domains
        </h1>

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">{error}</div>}
        {success && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500">{success}</div>}

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8">
          <h2 className="text-lg font-medium text-slate-200 mb-4">Add a Domain</h2>
          <form onSubmit={handleAddDomain} className="flex gap-4">
            <input
              type="text"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              placeholder="acme.com"
              required
            />
            <Button type="submit" isLoading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Domain
            </Button>
          </form>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="p-4 text-sm font-semibold text-slate-300">Domain</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">No domains added.</td>
                </tr>
              ) : (
                domains.map(d => (
                  <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-800/80">
                    <td className="p-4 text-slate-200 font-mono text-sm">{d.domain}</td>
                    <td className="p-4">
                      {d.verificationStatus === 'verified' && (
                        <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Verified
                        </span>
                      )}
                      {d.verificationStatus === 'unverified' && (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-sm">
                          <XCircle className="w-4 h-4" /> Unverified
                        </span>
                      )}
                      {d.verificationStatus === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
                          <ShieldCheck className="w-4 h-4" /> Pending
                        </span>
                      )}
                      {d.verificationStatus === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="w-4 h-4" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {d.verificationStatus === 'unverified' || d.verificationStatus === 'failed' ? (
                        <Button variant="outline" size="sm" onClick={() => handleStartVerification(d.id)}>
                          Start Verification
                        </Button>
                      ) : d.verificationStatus === 'pending' ? (
                        <Button variant="outline" size="sm" onClick={() => handleSimulateVerify(d.id)}>
                          Verify Now (Simulated)
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {challenge && (
          <div className="mt-8 p-6 bg-slate-900 border border-indigo-500/30 rounded-xl">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Verification Instructions</h3>
            <p className="text-sm text-slate-400 mb-4">
              Add the following TXT record to your DNS settings for <span className="font-mono text-indigo-400">{challenge.domain}</span>
            </p>
            <div className="bg-black/50 p-4 rounded-lg font-mono text-sm text-slate-300 break-all">
              {challenge.challengeValue}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              In this development environment, clicking "Verify Now" will automatically simulate DNS propagation and succeed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
