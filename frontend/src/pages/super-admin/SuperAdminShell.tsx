import { Outlet, NavLink } from 'react-router-dom';
import { ShieldAlert, Users, Building2, CreditCard, Activity, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function SuperAdminShell() {
  const { logout } = useAuthStore();

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-red-950/20 shrink-0 z-50">
        <div className="flex items-center gap-2 text-red-500">
          <ShieldAlert className="w-6 h-6" />
          <span className="font-bold text-lg tracking-tight">Super Admin Console</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md">
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 bg-card border-r border-border flex flex-col">
          <nav className="flex-1 px-3 space-y-1 py-4">
            <NavLink 
              to="/super-admin/users" 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
            >
              <Users className="w-4 h-4" /> Users
            </NavLink>
            <NavLink 
              to="/super-admin/organizations" 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
            >
              <Building2 className="w-4 h-4" /> Organizations
            </NavLink>
            <NavLink 
              to="/super-admin/plans" 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
            >
              <CreditCard className="w-4 h-4" /> Plans
            </NavLink>
            <NavLink 
              to="/super-admin/usage" 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
            >
              <Activity className="w-4 h-4" /> Usage Metadata
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 overflow-auto bg-background p-4 md:p-8 relative min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
