import { useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter } from '../../adapters';
import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PasswordInput } from '../ui/PasswordInput';
import { ItemType } from '@vaultguard/models';
import { ITEM_REGISTRY } from '../../lib/itemRegistry';
import { Card, CardContent } from '../ui/Card';
import { Download } from 'lucide-react';



interface VaultItemFormProps {
  itemType: ItemType;
  initialData?: any;
  onSubmit: (form: any, vaultId: string) => Promise<void>;
  onCancel: () => void;
  hideVaultSelector?: boolean;
}

export function VaultItemForm({ itemType, initialData, onSubmit, onCancel, hideVaultSelector = false }: VaultItemFormProps) {
  const config = ITEM_REGISTRY[itemType];
  const { vaults, activeVaultId } = useVaultAdapter();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [title, setTitle] = useState('');
  const [selectedVaultId, setSelectedVaultId] = useState<string>(
    initialData?.vaultId || activeVaultId || vaults[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.payload?.title || initialData.title || ''); // support title from index or payload
      setFormData(initialData.payload || {});
    } else {
      setTitle('');
      setFormData({});
    }
    setError('');
  }, [initialData, itemType]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [name]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Title is required');
      return;
    }
    if (!selectedVaultId) {
      setError('Vault selection is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      // Merge title into payload
      await onSubmit({ ...formData, title }, selectedVaultId);
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!config) return <div>Invalid item type</div>;

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <config.icon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {initialData ? `Edit ${config.displayName}` : `New ${config.displayName}`}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Title *</label>
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder={`e.g. My ${config.displayName}`} 
            autoFocus 
          />
        </div>

        {!hideVaultSelector && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Vault *</label>
            <select 
              value={selectedVaultId}
              onChange={(e) => setSelectedVaultId(e.target.value)}
              disabled={!!initialData}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select Vault</option>
              {vaults.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        <Card>
          <CardContent className="p-4 space-y-4">
            {config.fields.map(field => {
              const value = formData[field.name] || '';
              return (
                <div key={field.name} className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={value instanceof File ? '' : value}
                      onChange={e => handleChange(field.name, e.target.value)}
                      required={field.required}
                    />
                  ) : field.type === 'password' || (field.type === 'text' && field.sensitive) ? (
                    <PasswordInput 
                      value={value instanceof File ? '' : value} 
                      onChange={e => handleChange(field.name, e.target.value)} 
                      required={field.required}
                    />
                  ) : field.type === 'file' ? (
                    <div className="flex flex-col gap-2">
                      {initialData && initialData.attachments && initialData.attachments[field.name] && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border">
                          <span className="text-sm font-medium truncate">
                            {initialData.attachments[field.name].metadata.fileName}
                          </span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // We could implement download here, but in edit form it might be confusing
                              // the detail view is better for downloads.
                              window.alert('Download is available in the item detail view.');
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      <Input 
                        type="file"
                        ref={el => fileInputRefs.current[field.name] = el}
                        onChange={e => handleFileChange(field.name, e.target.files?.[0] || null)}
                        required={field.required && !formData[field.name] && (!initialData?.attachments || !initialData.attachments[field.name])}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                  ) : (
                    <Input 
                      type={field.type === 'text' ? 'text' : field.type}
                      value={value instanceof File ? '' : value} 
                      onChange={e => handleChange(field.name, e.target.value)} 
                      required={field.required}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-4 border-t border-border">
          <Button type="submit" isLoading={isSubmitting}>Save Item</Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
