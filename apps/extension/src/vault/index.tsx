import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ExtensionUIProvider } from '../adapters/ExtensionUIProvider';
import { useAuthAdapter, UnlockView, LoginView } from '@vaultguard/ui';
import { ExtensionAppView } from '../popup/components/ExtensionAppView';
import '../index.css';

function VaultContent() {
  const { authState, isLoading } = useAuthAdapter();

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-screen bg-[#1c1c1e]">Connecting…</div>;
  }

  if (authState === 'signed_out') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md w-full p-4">
          <LoginView />
        </div>
      </div>
    );
  }

  if (authState === 'authenticated_locked') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md w-full p-4">
          <UnlockView />
        </div>
      </div>
    );
  }

  return <ExtensionAppView />;
}

function VaultApp() {
  return (
    <ExtensionUIProvider>
      <MemoryRouter>
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
          <VaultContent />
        </div>
      </MemoryRouter>
    </ExtensionUIProvider>
  );
}

createRoot(document.getElementById('root')!).render(<VaultApp />);
