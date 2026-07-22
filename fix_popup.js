const fs = require('fs');
const filePath = 'apps/extension/src/popup/index.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const newPopup = 
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ExtensionUIProvider } from '../adapters/ExtensionUIProvider';
import { useAuthAdapter, LoginView, UnlockView } from '@vaultguard/ui';
import { UnlockedView } from './components/UnlockedView';
import { openExpandedPopup } from '../messaging/client';
import './popup.css';

function PopupHeader() {
  const { authState, isLocked } = useAuthAdapter();
  const locked = authState !== 'authenticated_unlocked';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-card border border-border rounded-lg flex items-center justify-center p-1.5 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <rect x="3" y="11" width="18" height="11" rx="2" fill="currentColor" className="text-primary" />
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground" />
            <circle cx="12" cy="16" r="2" fill="currentColor" className="text-primary-foreground" />
          </svg>
        </div>
        <span className="text-[15px] font-bold text-foreground tracking-tight">VaultGuard</span>
      </div>

      <div className="flex items-center gap-2">
        {authState !== 'signed_out' && (
          <div className={\lex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border \\}>
            <span className={\w-1.5 h-1.5 rounded-full shrink-0 \\} />
            {locked ? 'Locked' : 'Unlocked'}
          </div>
        )}
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground border border-border bg-secondary hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
          onClick={() => {
            openExpandedPopup();
            window.close();
          }}
          title="Open in larger window"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
            <path d="M3 8V3h5M13 8v5H8M13 3l-4 4M3 13l4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PopupContent() {
  const { authState, isLoading, lock } = useAuthAdapter();

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">Connecting…</div>;
  }

  if (authState === 'signed_out') {
    return <LoginView />;
  }

  if (authState === 'authenticated_locked') {
    return <UnlockView />;
  }

  return <UnlockedView onLock={lock} />;
}

function PopupApp() {
  return (
    <ExtensionUIProvider>
      <MemoryRouter>
        <div className="flex flex-col h-full w-full min-h-[520px] bg-background text-foreground overflow-hidden">
          <PopupHeader />
          <div className="flex-1 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <PopupContent />
          </div>
        </div>
      </MemoryRouter>
    </ExtensionUIProvider>
  );
}

createRoot(document.getElementById('root')!).render(<PopupApp />);
;

fs.writeFileSync(filePath, newPopup);
