import { User, Download, Upload, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/useAuthStore';
import { useState } from 'react';
import { authService } from '../lib/db/services/authService';
import { Loader2 } from 'lucide-react';

export function Settings() {
  const { user } = useAuthStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 12) {
      setPasswordError('New password must be at least 12 characters');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(user!.email, oldPassword, newPassword);
      setPasswordSuccess('Password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-sm">
              <label className="text-sm font-medium">Full Name</label>
              <Input defaultValue={user?.fullName || ''} readOnly />
            </div>
            <div className="grid gap-2 max-w-sm">
              <label className="text-sm font-medium">Email Address</label>
              <Input defaultValue={user?.email || ''} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Security</CardTitle>
            <CardDescription>Manage your master password and 2FA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border p-4 rounded-lg">
              <div>
                <h4 className="font-semibold">Master Password</h4>
                <p className="text-sm text-muted-foreground">Keep your account secure</p>
              </div>
              <Button variant="outline" onClick={() => setIsChangingPassword(!isChangingPassword)}>
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </Button>
            </div>

            {isChangingPassword && (
              <form onSubmit={handlePasswordChange} className="border p-4 rounded-lg bg-muted/20 space-y-4 animate-in fade-in slide-in-from-top-2">
                {passwordError && <div className="text-sm text-destructive font-medium">{passwordError}</div>}
                {passwordSuccess && <div className="text-sm text-green-600 dark:text-green-400 font-medium">{passwordSuccess}</div>}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save New Password
                </Button>
              </form>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border p-4 rounded-lg">
              <div>
                <h4 className="font-semibold">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" disabled>Enable 2FA</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Import & Export</CardTitle>
            <CardDescription>Move your data in and out of VaultGuard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border p-4 rounded-lg">
              <div>
                <h4 className="font-semibold">Import Data</h4>
                <p className="text-sm text-muted-foreground">Import from 1Password, Bitwarden, or CSV</p>
              </div>
              <Button variant="secondary" disabled>Import</Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border p-4 rounded-lg">
              <div>
                <h4 className="font-semibold">Export Vault</h4>
                <p className="text-sm text-muted-foreground">Download your encrypted vault as a backup</p>
              </div>
              <Button variant="secondary" disabled><Download className="w-4 h-4 mr-2" /> Export</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
