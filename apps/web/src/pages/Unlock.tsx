import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/PasswordInput';
import { authService } from '@vaultguard/auth';
import { useAuthStore } from '../store/useAuthStore';
import { Lock } from 'lucide-react';

export function Unlock() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isLocked, unlock, logout } = useAuthStore();

  if (!isLocked || !user) {
    return <Navigate to="/app" replace />;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your master password');
      return;
    }

    try {
      setLoading(true);
      const unlockedUser = await authService.login(user.email, password);
      unlock(unlockedUser);
    } catch (err: any) {
      console.error("Unlock error:", err);
      setError(err.message || 'An unexpected error occurred during unlock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Vault Locked</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back, {user.fullName.split(' ')[0]}. Enter your master password to decrypt your vault.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleUnlock}>
            <div>
              <PasswordInput 
                placeholder="Master Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" isLoading={loading}>Unlock Vault</Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={logout}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
