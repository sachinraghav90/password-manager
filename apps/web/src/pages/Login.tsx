import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { authService } from '@vaultguard/auth';
import { useAuthStore } from '../store/useAuthStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  console.log('Web App VITE_SUPABASE_URL:', (import.meta as any).env.VITE_SUPABASE_URL);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    try {
      setLoading(true);
      const user = await authService.login(
        email, 
        password,
        (import.meta as any).env.VITE_SUPABASE_URL,
        (import.meta as any).env.VITE_SUPABASE_ANON_KEY
      );
      login(user);
      navigate('/app');
    } catch (err: any) {
      if (err.message === 'MUST_CHANGE_PASSWORD') {
        navigate(`/force-reset-password?email=${encodeURIComponent(email)}`);
        return;
      }
      console.error("Login error:", err);
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Sign in to your account</h2>
      
      {error && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleLogin}>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
          <Input 
            type="email" 
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-foreground">Master Password</label>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">Forgot?</a>
          </div>
          <PasswordInput 
            placeholder="Enter your master password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" isLoading={loading}>Sign In</Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
