import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, RefreshCw, XCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { invitationService } from '../../lib/db/services/invitationService';
import { db } from '../../lib/db/client';
import { Button } from '../../components/ui/Button';

export const Invitations: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const items = await db.organization_invitations
        .where({ organizationId })
        .filter(i => i.status === 'pending')
        .toArray();
      setInvitations(items);
    } catch (err: any) {
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadInvitations();
    }
  }, [organizationId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) return;

    try {
      setIsSubmitting(true);
      await invitationService.inviteMember(organizationId!, user!.id, email);
      setSuccess('Invitation sent successfully');
      setEmail('');
      await loadInvitations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (action: 'resend' | 'revoke', invitationId: string) => {
    try {
      setError('');
      setSuccess('');
      if (action === 'resend') {
        await invitationService.resendInvitation(invitationId, user!.id);
        setSuccess('Invitation resent');
      }
      if (action === 'revoke') {
        await invitationService.revokeInvitation(invitationId, user!.id);
        setSuccess('Invitation revoked');
      }
      await loadInvitations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mb-8">
          <Mail className="w-6 h-6 text-indigo-500" />
          Manage Invitations
        </h1>

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">{error}</div>}
        {success && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500">{success}</div>}

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8">
          <h2 className="text-lg font-medium text-slate-200 mb-4">Send an Invitation</h2>
          <form onSubmit={handleInvite} className="flex gap-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              placeholder="user@example.com"
              required
            />
            <Button type="submit" isLoading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Send Invite
            </Button>
          </form>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="p-4 text-sm font-semibold text-slate-300">Email Address</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Expires In</th>
                <th className="p-4 text-sm font-semibold text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No pending invitations.</td>
                </tr>
              ) : (
                invitations.map(i => {
                  const daysLeft = Math.ceil((i.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={i.id} className="border-b border-slate-700/50 hover:bg-slate-800/80">
                      <td className="p-4 text-slate-200">{i.email}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                          Pending
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{daysLeft > 0 ? `${daysLeft} days` : 'Expired'}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleAction('resend', i.id)} title="Resend">
                            <RefreshCw className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAction('revoke', i.id)} title="Revoke">
                            <XCircle className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
