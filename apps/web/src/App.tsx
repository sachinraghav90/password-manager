import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout, AppLayout } from '@vaultguard/ui';
import { WebUIProvider } from './adapters';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { VaultList } from './pages/VaultList';
import { Settings } from './pages/Settings';
import { Unlock } from './pages/Unlock';
import { CreateVault } from './pages/CreateVault';
import { CreateItem } from './pages/CreateItem';
import { Settings as OrgSettings } from './pages/organization/Settings';
import { Members } from './pages/organization/Members';
import { Invitations } from './pages/organization/Invitations';
import { Domains } from './pages/organization/Domains';
import { Permissions } from './pages/organization/Permissions';
import { AcceptInvite } from './pages/AcceptInvite';
import { AdminConsole } from './pages/organization/AdminConsole';
import { UsersList } from './pages/organization/UsersList';
import { UserForm } from './pages/organization/UserForm';
import { UserDetails } from './pages/organization/UserDetails';
import { TeamsList } from './pages/organization/TeamsList';
import { SharingOverview } from './pages/organization/SharingOverview';
import { useAuthStore } from './store/useAuthStore';
import { useAppStore } from './store/useAppStore';

import { BaseAppRedirect } from './components/auth/BaseAppRedirect';
import { PersonalGuard } from './components/auth/PersonalGuard';
import { OrganizationGuard } from './components/auth/OrganizationGuard';
import { OrgAdminGuard } from './components/auth/OrgAdminGuard';
import { SuperAdminGuard } from './components/auth/SuperAdminGuard';
import { ForceResetPassword } from './pages/ForceResetPassword';
import { SuperAdminShell } from './pages/super-admin/SuperAdminShell';
import { SuperAdminOrganizations } from './pages/super-admin/SuperAdminOrganizations';
import { SuperAdminUsers } from './pages/super-admin/SuperAdminUsers';
import { ProvisionOrganization } from './pages/super-admin/ProvisionOrganization';
import { Plans } from './pages/super-admin/Plans';

function App() {
  const { restoreSession, user } = useAuthStore();
  const { loadSettings } = useAppStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (user) {
      loadSettings(user.id);
    }
  }, [user, loadSettings]);

  return (
    <WebUIProvider>
      <BrowserRouter>
        <Routes>
        {/* Public Marketing Route */}
        <Route path="/" element={<Welcome />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        {/* Unlock Route */}
        <Route path="/unlock" element={<Unlock />} />

        {/* Force Reset Password Route */}
        <Route path="/force-reset-password" element={<ForceResetPassword />} />

        {/* App Shell Routes */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            
            {/* Base Redirect */}
            <Route index element={<BaseAppRedirect />} />

            {/* Accept Invite Route (Accessible if authenticated) */}
            <Route path="accept-invite" element={<AcceptInvite />} />

            {/* Personal Context Routes */}
            <Route path="personal" element={<PersonalGuard />}>
              <Route index element={<Dashboard />} />
              <Route path="vaults/new" element={<CreateVault />} />
              <Route path="items/new" element={<CreateItem />} />
              <Route path="vaults/:vaultId" element={<VaultList />} />
              <Route path="all-items" element={<VaultList />} />
              <Route path="favorites" element={<VaultList />} />
              <Route path="recent" element={<VaultList />} />
              <Route path="notes" element={<VaultList />} />
              <Route path="cards" element={<VaultList />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* General Organization Routes (outside specific org context) */}
            <Route path="organizations/new" element={<Navigate to="/app/personal" replace />} />

            {/* Organization Context Routes */}
            <Route path="organization/:organizationId" element={<OrganizationGuard />}>
              <Route index element={<Dashboard />} />
              <Route path="vaults/new" element={<CreateVault />} />
              <Route path="items/new" element={<CreateItem />} />
              <Route path="vaults/:vaultId" element={<VaultList />} />
              <Route path="all-items" element={<VaultList />} />
              <Route path="favorites" element={<VaultList />} />
              <Route path="recent" element={<VaultList />} />
              <Route path="notes" element={<VaultList />} />
              <Route path="cards" element={<VaultList />} />
              {/* Admin Console */}
              <Route path="admin" element={<OrgAdminGuard />}>
                <Route element={<AdminConsole />}>
                  <Route index element={<Navigate to="users" replace />} />
                  <Route path="settings" element={<OrgSettings />} />
                  <Route path="users" element={<UsersList />} />
                  <Route path="users/new" element={<UserForm />} />
                  <Route path="users/:membershipId" element={<UserDetails />} />
                  <Route path="teams" element={<TeamsList />} />
                  <Route path="sharing" element={<SharingOverview />} />
                </Route>
              </Route>
              
              <Route path="members" element={<Members />} />
              <Route path="invitations" element={<Invitations />} />
              <Route path="domains" element={<Domains />} />
              <Route path="permissions" element={<Permissions />} />
            </Route>

          </Route>
        </Route>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<SuperAdminGuard />}>
          <Route element={<SuperAdminShell />}>
            <Route index element={<Navigate to="organizations" replace />} />
            <Route path="users" element={<SuperAdminUsers />} />
            <Route path="organizations" element={<SuperAdminOrganizations />} />
            <Route path="organizations/new" element={<ProvisionOrganization />} />
            <Route path="plans" element={<Plans />} />
            <Route path="usage" element={<div className="p-8">Usage Dashboard Placeholder</div>} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WebUIProvider>
  );
}

export default App;
