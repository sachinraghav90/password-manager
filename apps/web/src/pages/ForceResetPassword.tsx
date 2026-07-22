import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/PasswordInput';
import { authService } from '@vaultguard/auth';
import { ShieldCheck } from 'lucide-react';

export function ForceResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setError('Master Password must be at least 12 characters');
      return;
    }

    try {
      setLoading(true);
      await authService.resetInitialPassword(email, oldPassword, newPassword);
      navigate('/login?reset_success=true');
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(err.message || 'An unexpected error occurred during password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center text-foreground">Welcome to your new account</h2>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Your administrator created this account for you. Please set a new Master Password to continue.
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Temporary Password</label>
            <PasswordInput 
              placeholder="Enter your temporary password" 
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">New Master Password</label>
            <PasswordInput 
              placeholder="At least 12 characters" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
            <PasswordInput 
              placeholder="Re-enter your new password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full mt-6" isLoading={loading}>Set Password & Login</Button>
        </form>
      </div>
    </div>
  );
}
