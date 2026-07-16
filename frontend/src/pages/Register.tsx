import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { authService } from '../lib/db/services/authService';
import { useAuthStore } from '../store/useAuthStore';

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!fullName || !email || !password) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Master password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      const user = await authService.register(fullName, email, password);
      login(user);
      // ProtectedRoute will auto-redirect to /app
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Create your account</h2>
      
      {error && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleRegister}>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
          <Input 
            type="text" 
            placeholder="John Doe" 
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            disabled={loading}
          />
        </div>
        
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
          <label className="block text-sm font-medium text-foreground mb-1">Master Password</label>
          <PasswordInput 
            placeholder="Create a strong master password" 
            showStrength 
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Make it long but memorable. This is the only way to decrypt your vault.
          </p>
        </div>

        <Button type="submit" className="w-full" isLoading={loading}>Create Account</Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
