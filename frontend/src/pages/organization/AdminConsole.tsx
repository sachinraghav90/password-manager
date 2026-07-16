import React from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { User, Users, Share2, Settings as SettingsIcon } from 'lucide-react';
import { useAccountStore } from '../../store/useAccountStore';

export const AdminConsole: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { membershipRole } = useAccountStore();

  if (membershipRole && membershipRole !== 'organization_admin') {
    return <Navigate to={`/app/organization/${organizationId}`} replace />;
  }

  const tabs = [
    {
      name: 'Users',
      path: `/app/organization/${organizationId}/admin/users`,
      icon: User
    },
    {
      name: 'Teams',
      path: `/app/organization/${organizationId}/admin/teams`,
      icon: Users
    },
    {
      name: 'Sharing',
      path: `/app/organization/${organizationId}/admin/sharing`,
      icon: Share2
    },
    {
      name: 'Settings',
      path: `/app/organization/${organizationId}/admin/settings`,
      icon: SettingsIcon
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden -m-4 md:-m-8">
      {/* Header / Tabs */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="pt-6 md:pt-8 pb-4">
            <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your organization's users, security, and settings.</p>
          </div>
          
          <div className="flex space-x-1 overflow-x-auto -mb-px hide-scrollbar">
            {tabs.map((tab) => (
              <NavLink
                key={tab.name}
                to={tab.path}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
