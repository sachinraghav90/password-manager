import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ExtensionUIProvider } from '../adapters/ExtensionUIProvider';
import { useAuthAdapter, LoginView, UnlockView } from '@vaultguard/ui';
import { ExtensionAppView } from './components/ExtensionAppView';
import './popup.css';

function PopupContent() {
  const { authState, isLoading } = useAuthAdapter();

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[520px] bg-background">Connecting…</div>;
  }

  if (authState === 'signed_out') {
    return (
      <div className="p-4 bg-background min-h-[520px]">
        <LoginView />
      </div>
    );
  }

  if (authState === 'authenticated_locked') {
    return (
      <div className="p-4 bg-background min-h-[520px]">
        <UnlockView />
      </div>
    );
  }

  return <ExtensionAppView />;
}

function PopupApp() {
  return (
    <ExtensionUIProvider>
      <MemoryRouter>
        <div className="flex flex-col h-full w-full min-h-[520px] bg-background text-foreground overflow-hidden">
          <PopupContent />
        </div>
      </MemoryRouter>
    </ExtensionUIProvider>
  );
}

createRoot(document.getElementById('root')!).render(<PopupApp />);
