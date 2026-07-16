import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MailCheck, ArrowRight, XCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { invitationService } from '../lib/db/services/invitationService';
import { Button } from '../components/ui/Button';

export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isLocked } = useAuthStore();
  
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No invitation token provided in the URL.');
      return;
    }

    if (!user || isLocked) {
      // For this MVP, if they aren't logged in, redirect to login with the return URL
      navigate(`/login?returnUrl=${encodeURIComponent(`/app/accept-invite?token=${token}`)}`);
      return;
    }

    const accept = async () => {
      try {
        await invitationService.acceptInvitation(token, user.id);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setError(err.message);
      }
    };

    accept();
  }, [token, user, isLocked, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
        
        {status === 'validating' && (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MailCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Validating Invitation...</h2>
            <p className="text-muted-foreground">Please wait while we verify your secure token.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <MailCheck className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Invitation Accepted!</h2>
            <p className="text-muted-foreground mb-8">You are now a member of the organization.</p>
            <Button onClick={() => navigate('/app/personal')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex justify-center items-center gap-2">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Invitation</h2>
            <p className="text-destructive mb-8">{error}</p>
            <Button onClick={() => navigate('/app/personal')} variant="outline" className="w-full text-foreground">
              Return to Dashboard
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};
