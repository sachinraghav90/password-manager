import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ExtensionUIProvider } from '../adapters/ExtensionUIProvider';
import { useAuthAdapter, UnlockView, LoginView } from '@vaultguard/ui';
import '../index.css';

function OptionsContent() {
  const { authState, isLoading, lock } = useAuthAdapter();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading settings...</div>;
  }

  if (authState === 'signed_out') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md w-full p-4">
          <LoginView />
        </div>
      </div>
    );
  }

  if (authState === 'authenticated_locked') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md w-full p-4">
          <UnlockView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <aside className="w-64 border-r border-slate-800 p-4 flex flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="font-bold text-lg">Settings</h1>
        </div>
        
        <nav className="space-y-1 flex-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-blue-600/10 text-blue-500 rounded-lg">
            <span>General</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors">
            <span>Security</span>
          </a>
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <button 
            onClick={lock}
            className="flex w-full items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            Lock Vault
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-semibold">General Settings</h2>
        </header>

        <div className="max-w-2xl space-y-6">
          <section className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Auto-Lock</h3>
            <p className="text-sm text-slate-400 mb-4">Choose how quickly the vault locks after inactivity.</p>
            <select className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              <option value="0">Immediately</option>
              <option value="5">5 Minutes</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="never">Never (Not Recommended)</option>
            </select>
          </section>
        </div>
      </main>
    </div>
  );
}

function OptionsApp() {
  return (
    <ExtensionUIProvider>
      <MemoryRouter>
        <OptionsContent />
      </MemoryRouter>
    </ExtensionUIProvider>
  );
}

createRoot(document.getElementById('root')!).render(<OptionsApp />);
