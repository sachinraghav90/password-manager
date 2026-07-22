import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, ChevronDown, Check } from 'lucide-react';
import { useAccountAdapter } from '../../adapters';
import { useAuthAdapter } from '../../adapters';

export function ContextSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { mode, activeOrganizationId, orgs, hasPersonal, switchToPersonal, switchToOrganization } = useAccountAdapter();
  const { user } = useAuthAdapter();
  const navigate = useNavigate();



  const activeOrg = activeOrganizationId ? orgs.find(o => o.id === activeOrganizationId) : null;

  const handleSelectPersonal = () => {
    switchToPersonal();
    setIsOpen(false);
    navigate('/app/personal');
  };

  const handleSelectOrg = async (orgId: string) => {
    if (!user) return;
    try {
      await switchToOrganization(user.id, orgId);
      setIsOpen(false);
      navigate(`/app/organization/${orgId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to switch context");
    }
  };

  const activeLabel = mode === 'personal' ? 'Personal Account' : (activeOrg?.name || 'Organization');
  const activeIcon = mode === 'personal' ? <User className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-emerald-500" />;

  return (
    <div className="relative mb-4 px-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-accent/50 hover:bg-accent rounded-lg border border-border transition-colors text-left"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 bg-background p-1.5 rounded-md border border-border shadow-sm">
            {activeIcon}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{activeLabel}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {mode === 'personal' ? 'Personal' : activeOrg?.role.replace('_', ' ')}
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-3 right-3 mt-1 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border py-1 z-50">
            
            <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Account
            </div>
            
            {hasPersonal && (
              <button 
                onClick={handleSelectPersonal}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent ${mode === 'personal' ? 'bg-accent/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-primary" />
                  <span>Personal Account</span>
                </div>
                {mode === 'personal' && <Check className="w-4 h-4 text-primary" />}
              </button>
            )}

            {orgs.length > 0 && (
              <>
                <div className="border-t border-border mt-1 mb-1" />
                <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Organizations
                </div>
                
                {orgs.map(org => (
                  <button 
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent ${activeOrganizationId === org.id ? 'bg-accent/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span className="truncate max-w-[120px] text-left">{org.name}</span>
                    </div>
                    {activeOrganizationId === org.id && <Check className="w-4 h-4 text-emerald-500" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
