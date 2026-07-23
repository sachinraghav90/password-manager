import { useState, useCallback } from 'react';
import { sendToBackground } from '../../messaging/client';

export function LockedView({ onUnlock, email: initialEmail }: { onUnlock: () => void, email?: string }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleUnlock = useCallback(async () => {
    if (!email) { setError('Enter your email address'); return; }
    if (!password) { setError('Enter your master password'); return; }
    setLoading(true);
    // Capture locally and clear react state immediately
    const pass = password;
    setPassword('');
    try {
      const res = await sendToBackground<{ locked: false }>({ type: 'UNLOCK', masterPassword: pass } as any);
      if (res.success) {
        onUnlock();
      } else {
        setError((res as any).error?.message || 'Access denied');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message || 'Error unlocking');
      setLoading(false);
    }
  }, [email, password, onUnlock]);

  return (
    <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4">
      <div className="mb-1">
        <div className="w-14 h-14 bg-card border border-border rounded-2xl flex items-center justify-center p-3">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-muted-foreground">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" fill="var(--muted)" className="fill-muted" />
            <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">Vault Locked</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Sign in to your account to continue</p>
      </div>

      <div className="w-full flex flex-col gap-1.5 mt-2">
        <label className="text-xs font-medium text-muted-foreground">Email address</label>
        <input
          type="email"
          className="w-full px-3 py-2.5 bg-card border border-border rounded-md text-foreground text-sm outline-none transition-colors focus:border-primary placeholder:text-muted-foreground mb-4"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={!!initialEmail || loading}
        />

        <label className="text-xs font-medium text-muted-foreground">Master Password</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            className={`w-full pl-3 pr-10 py-2.5 bg-card border rounded-md text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground ${error ? 'border-destructive' : 'border-border focus:border-primary'}`}
            placeholder="••••••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            autoFocus
          />
          <button 
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors" 
            onClick={() => setShow(s => !s)} 
            type="button"
          >
            {show
              ? <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" /><line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              : <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" /></svg>
            }
          </button>
        </div>
        {error && <div className="text-xs text-destructive mt-1">{error}</div>}
      </div>

      <button 
        className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md transition-all hover:opacity-90 active:scale-[0.98] mt-2" 
        onClick={handleUnlock} 
        disabled={loading}
      >
        {loading ? 'Unlocking…' : 'Unlock VaultGuard'}
      </button>

      <div className="mt-1">
        <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
          Use biometrics instead
        </button>
      </div>
    </div>
  );
}
