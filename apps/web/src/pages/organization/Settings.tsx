import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings as SettingsIcon, Save } from 'lucide-react';

import { db } from '@vaultguard/db-local';
import { Button } from '../../components/ui/Button';

export const Settings: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [settings, setSettings] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await db.organization_settings.get(organizationId!);
        const o = await db.organizations.get(organizationId!);
        setSettings(s);
        setOrg(o);
      } catch (err: any) {
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    if (organizationId) load();
  }, [organizationId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      setIsSaving(true);
      await db.organization_settings.put(settings);
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-8">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Organization Settings
        </h1>

        {error && <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">{error}</div>}
        {success && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">{success}</div>}

        <form onSubmit={handleSave} className="bg-card rounded-xl border border-border p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">General Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Organization Name</label>
                <input
                  type="text"
                  value={org?.name || ''}
                  disabled
                  className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground disabled:opacity-70"
                />
                <p className="text-xs text-muted-foreground mt-1">Contact support to change your organization name.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Security Policies</h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.requireTwoFactor || false}
                  onChange={e => setSettings({...settings, requireTwoFactor: e.target.checked})}
                  className="w-5 h-5 rounded border-input text-primary focus:ring-primary bg-background"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Require Two-Factor Authentication</div>
                  <div className="text-xs text-muted-foreground">All members must enable 2FA to access organization vaults.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.restrictExport || false}
                  onChange={e => setSettings({...settings, restrictExport: e.target.checked})}
                  className="w-5 h-5 rounded border-input text-primary focus:ring-primary bg-background"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Restrict Export</div>
                  <div className="text-xs text-muted-foreground">Prevent members from exporting organization vault items.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Domain Join Policy</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">When users sign up with a verified domain:</label>
                <select
                  value={settings?.joinPolicy || 'invite_only'}
                  onChange={e => setSettings({...settings, joinPolicy: e.target.value})}
                  className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all mb-4"
                >
                  <option value="invite_only">Do nothing (Invite Only)</option>
                  <option value="request_to_join">Allow them to request to join</option>
                  <option value="auto_join_verified_domain">Automatically join as member</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Allowed Domains</label>
                <input
                  type="text"
                  value={(settings?.allowedDomains || []).join(', ')}
                  onChange={e => {
                    const domains = e.target.value.split(',').map(d => d.trim()).filter(Boolean);
                    setSettings({...settings, allowedDomains: domains});
                  }}
                  placeholder="e.g. yourcompany.com, partner.com"
                  className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated list of domains that can automatically join.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border mt-4">
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
