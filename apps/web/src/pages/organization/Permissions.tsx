import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { permissionProfileService } from '@vaultguard/permissions';
import { authorizationService } from '@vaultguard/permissions';
import { Button } from '../../components/ui/Button';
import { PermissionProfile, OrganizationPermission } from '@vaultguard/models';

const PERMISSION_CATEGORIES = {
  Organization: ['organization.view', 'organization.settings.view', 'organization.settings.edit'],
  Members: ['members.view', 'members.invite', 'members.suspend', 'members.reactivate', 'members.remove', 'members.assign_profile'],
  Permissions: ['permissions.view', 'permissions.create', 'permissions.edit', 'permissions.delete', 'permissions.assign'],
  Vaults: ['vaults.view', 'vaults.create', 'vaults.rename', 'vaults.delete', 'vaults.manage_access'],
  Items: ['items.view', 'items.create', 'items.edit', 'items.delete', 'items.move', 'items.share'],
  Attachments: ['attachments.upload', 'attachments.download', 'attachments.delete'],
  Audit: ['audit.view', 'usage.view', 'billing.view']
};

export const Permissions: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuthStore();
  
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as OrganizationPermission[] });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { allowed } = await authorizationService.canPerform(user!.id, 'permissions.view', {
        resourceType: 'permission_profile',
        organizationId: organizationId!
      });

      if (!allowed) {
        setError('You do not have permission to view profiles.');
        setProfiles([]);
        return;
      }

      const canManageDecision = await authorizationService.canPerform(user!.id, 'permissions.edit', {
        resourceType: 'permission_profile',
        organizationId: organizationId!
      });
      setCanManage(canManageDecision.allowed);

      const data = await permissionProfileService.getProfiles(organizationId!);
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) loadData();
  }, [organizationId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProfileId) {
        await permissionProfileService.updateProfile(organizationId!, user!.id, editingProfileId, formData.name, formData.description, formData.permissions);
      } else {
        await permissionProfileService.createProfile(organizationId!, user!.id, formData.name, formData.description, formData.permissions);
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await permissionProfileService.deleteProfile(organizationId!, user!.id, id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm as OrganizationPermission)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm as OrganizationPermission]
    }));
  };

  if (loading) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-500" />
            Roles & Permissions
          </h1>
          {canManage && !showForm && (
            <Button onClick={() => {
              setEditingProfileId(null);
              setFormData({ name: '', description: '', permissions: [] });
              setShowForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Profile
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {showForm ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">{editingProfileId ? 'Edit Profile' : 'New Profile'}</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Profile Name</label>
                  <input
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-300 border-b border-slate-700 pb-2">Permissions</h3>
                {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-md font-semibold text-slate-400 mb-2">{category}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {perms.map(perm => (
                        <label key={perm} className="flex items-center space-x-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(perm as OrganizationPermission)}
                            onChange={() => togglePermission(perm)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                          />
                          <span>{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Save Profile</Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid gap-4">
            {profiles.map(profile => (
              <div key={profile.id} className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex justify-between items-center hover:bg-slate-800/80 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-slate-200">{profile.name}</h3>
                    {profile.isSystem && (
                      <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">System</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{profile.description || 'No description'}</p>
                  <p className="text-xs text-slate-500 mt-2">{profile.permissions.length} permissions granted</p>
                </div>
                {canManage && !profile.isSystem && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setFormData({ name: profile.name, description: profile.description || '', permissions: profile.permissions });
                      setEditingProfileId(profile.id);
                      setShowForm(true);
                    }}>
                      <Edit className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(profile.id)}>
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {profiles.length === 0 && !error && (
              <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/50">
                No permission profiles defined yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
