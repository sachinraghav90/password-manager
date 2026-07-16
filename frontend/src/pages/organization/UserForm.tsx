import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { organizationUserService } from '../../lib/db/services/organizationUserService';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { cryptoUtils } from '../../lib/crypto/cryptoService';

export function UserForm() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Generate temp password using secure random
      const randArray = new Uint8Array(16);
      crypto.getRandomValues(randArray);
      const tempPass = Array.from(randArray).map(b => b.toString(16).padStart(2, '0')).join('') + 'A1!'; // ensure complexity
      
      // 2. Create the user
      await organizationUserService.createOrganizationUser(
        user.id,
        organizationId,
        email,
        firstName,
        lastName,
        tempPass
      );

      // 3. Display the password ONCE
      setTempPassword(tempPass);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      setLoading(false);
    }
  };

    if (tempPassword) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-card border border-border rounded-lg shadow-xl">
        <div className="text-center space-y-6">
          <ShieldAlert className="w-16 h-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">User Created Successfully</h2>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded text-left">
            <h3 className="text-yellow-600 dark:text-yellow-400 font-semibold mb-2">DEVELOPMENT-ONLY DELIVERY SIMULATION</h3>
            <p className="text-muted-foreground text-sm mb-4">
              In a production environment, this would be emailed to the user securely. 
              Since this is a simulated local environment, you must copy this temporary password now and share it with the user out-of-band.
            </p>
            <p className="text-destructive font-bold text-sm mb-2">
              This password will never be shown again. It is NOT stored anywhere in the database in plaintext.
            </p>
            <div className="bg-background p-4 rounded font-mono text-xl text-center select-all cursor-pointer">
              {tempPassword}
            </div>
          </div>

          <button
            onClick={() => navigate(`/app/organization/${organizationId}/admin/users`)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded transition-colors"
          >
            I have copied the password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <Link to={`/app/organization/${organizationId}/admin/users`} className="text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Create New User</h1>
        <p className="text-muted-foreground mt-1 text-sm">Provision a new user account within this organization.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">First Name</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Last Name</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          />
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Link
            to={`/app/organization/${organizationId}/users`}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
