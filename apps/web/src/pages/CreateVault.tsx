import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronDown } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useVaultStore } from '../store/useVaultStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAccountStore } from '../store/useAccountStore';

export function CreateVault() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState('');
  
  const { createVault, isLoading, error: storeError } = useVaultStore();
  const { isLocked } = useAuthStore();
  const { mode, activeOrganizationId } = useAccountStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (!name.trim()) {
      setLocalError('Vault name is required');
      return;
    }
    
    if (isLocked) {
      navigate('/unlock');
      return;
    }

    try {
      const organizationId = mode === 'organization' && activeOrganizationId ? activeOrganizationId : undefined;
      const vault = await createVault({ 
        name: name.trim(), 
        description: description.trim(),
        organizationId 
      });
      
      if (mode === 'organization' && activeOrganizationId) {
        navigate(`/app/organization/${activeOrganizationId}/vaults/${vault.id}`);
      } else {
        navigate(`/app/personal/vaults/${vault.id}`);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to create vault');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const error = localError || storeError;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button onClick={handleCancel} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          &larr; Back
        </button>
      </div>
      
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create a new vault</h1>
        <p className="text-muted-foreground">
          Choose an icon, name, and description for your vault.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
              {error}
            </div>
          )}
          
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <button 
              type="button" 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              Change icon <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1.5">
                Vault Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-1.5">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this vault be used for?"
                rows={4}
                disabled={isLoading}
                className="w-full flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="w-full py-6 text-base" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="w-full py-6 text-base" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Vault'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
