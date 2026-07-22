import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, FileText, CreditCard, Menu, X, Sun, Moon, LogOut, LayoutGrid, Star, ChevronDown, Plus, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useVaultStore } from '../../store/useVaultStore';
import { useAccountStore } from '../../store/useAccountStore';
import { ContextSwitcher } from './ContextSwitcher';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const { vaults, loadVaults } = useVaultStore();
  const { mode, activeOrganizationId, membershipRole } = useAccountStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadVaults();
      import('@vaultguard/db-local').then(({ db }) => {
        db.platform_role_assignments
          .where({ userId: user.id })
          .filter((r: any) => r.role === 'super_admin' && r.status === 'active')
          .first()
          .then((res: any) => setIsSuperAdmin(!!res))
          .catch(console.error);
      });
    }
  }, [user, loadVaults]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark')) 
      ? 'light' 
      : 'dark';
    setTheme(nextTheme, user?.id);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header (Full Width) */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card shrink-0 z-50">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 md:hidden">
            {sidebarOpen ? <X /> : <Menu />}
          </button>
          
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">VaultGuard</span>
          </div>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
             onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
             className="flex items-center gap-2 p-1 rounded-full hover:bg-accent transition-colors border border-transparent hover:border-border"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
               {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="font-semibold text-sm hidden md:block max-w-[120px] truncate">{user?.fullName || 'User'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block mr-1" />
          </button>
          
          {profileDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border py-1 z-50 overflow-hidden">
               <div className="px-4 py-3 text-xs text-muted-foreground border-b border-border truncate bg-muted/30">
                 {user?.email}
               </div>
               <button onClick={toggleTheme} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center justify-between">
                 <span>Theme</span>
                 {theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark')) ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>
               <NavLink to="/app/personal/settings" className="block px-4 py-2 text-sm hover:bg-accent" onClick={() => {setProfileDropdownOpen(false);}}>Settings</NavLink>
               {mode === 'organization' && activeOrganizationId && membershipRole === 'organization_admin' && (
                 <NavLink to={`/app/organization/${activeOrganizationId}/admin`} className="block px-4 py-2 text-sm text-indigo-500 font-medium hover:bg-indigo-500/10" onClick={() => {setProfileDropdownOpen(false);}}>
                   Admin Console
                 </NavLink>
               )}
               {isSuperAdmin && (
                 <NavLink to="/super-admin" className="block px-4 py-2 text-sm text-indigo-500 font-medium hover:bg-indigo-500/10" onClick={() => {setProfileDropdownOpen(false);}}>
                   Platform Administration
                 </NavLink>
               )}
               <div className="border-t border-border mt-1 pt-1">
                 <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
                   <LogOut className="w-4 h-4" /> Sign out
                 </button>
               </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`
          absolute inset-y-0 left-0 z-40 w-56 bg-card border-r border-border transform transition-transform duration-200 ease-in-out flex flex-col
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-4">
            
            <ContextSwitcher />

            <NavLink 
              to={mode === 'personal' ? '/app/personal' : `/app/organization/${activeOrganizationId}`} 
              end
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutGrid className="w-4 h-4" />
              {mode === 'personal' ? 'Dashboard' : 'Org Dashboard'}
            </NavLink>

            <NavLink 
              to={mode === 'personal' ? '/app/personal/all-items' : `/app/organization/${activeOrganizationId}/all-items`} 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setSidebarOpen(false)}
            >
              <FileText className="w-4 h-4" />
              All Items
            </NavLink>
            
            <NavLink 
              to={mode === 'personal' ? '/app/personal/favorites' : `/app/organization/${activeOrganizationId}/favorites`} 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Star className="w-4 h-4" />
              Favorites
            </NavLink>

            <div className="pt-6 pb-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vaults</span>
                <Plus 
                  className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(mode === 'personal' ? '/app/personal/vaults/new' : `/app/organization/${activeOrganizationId}/vaults/new`);
                    setSidebarOpen(false);
                  }}
                />
              </div>
            </div>
            
            {vaults
              .filter(v => {
                if (mode === 'personal') return v.ownershipType === 'personal';
                return v.ownershipType === 'organization' && v.organizationId === activeOrganizationId;
              })
              .map((vault) => (
              <NavLink 
                key={vault.id}
                to={mode === 'personal' ? `/app/personal/vaults/${vault.id}` : `/app/organization/${activeOrganizationId}/vaults/${vault.id}`}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Lock className={`w-4 h-4 ${vault.id === user?.defaultVaultId ? 'text-emerald-500' : 'text-blue-500'}`} />
                <span className="truncate">{vault.name}</span>
              </NavLink>
            ))}

            {vaults.filter(v => {
              if (mode === 'personal') return v.ownershipType === 'personal';
              return v.ownershipType === 'organization' && v.organizationId === activeOrganizationId;
            }).length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">
                No vaults created yet
              </div>
            )}
            
            {/* Administration section removed, moved to Admin Console in profile dropdown */}

            {mode === 'personal' && (
              <>
                <div className="pt-6 pb-2">
                  <span className="px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Categories</span>
                </div>
            
            <NavLink
              to="/app/personal/notes"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setSidebarOpen(false)}
            >
              <FileText className="w-4 h-4" />
              Secure Notes
            </NavLink>
            
            <NavLink
              to="/app/personal/cards"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setSidebarOpen(false)}
            >
              <CreditCard className="w-4 h-4" />
              Payment Cards
            </NavLink>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-8 relative min-w-0">
          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
