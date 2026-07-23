import { createRoot } from 'react-dom/client';
import { useState, useEffect, useCallback } from 'react';
import { sendToBackground } from '../messaging/client';
import { AuthStateData } from '@vaultguard/browser-api';
import '../popup/popup.css'; // Share styling with popup

function Unlock() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    sendToBackground<AuthStateData>({ type: 'GET_AUTH_STATE' })
      .then(res => {
        if (res.success && res.data.email) {
          setEmail(res.data.email);
          setInitialEmail(res.data.email);
        }
      })
      .catch(console.error);
  }, []);

  const handleUnlock = useCallback(async () => {
    if (!email) { setError('Enter your email address'); return; }
    if (!password) { setError('Enter your master password'); return; }
    try {
      setLoading(true);
      const pass = password;
      setPassword('');

      const res = await sendToBackground<{ locked: false }>({ type: 'UNLOCK', masterPassword: pass });
      if (res.success) {
        window.close(); // Close the window on success
      } else {
        setError((res as any).error?.message || 'Access denied');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to reach background');
      setLoading(false);
    }
  }, [password]);

  return (
    <div className="popup-root">
      <div className="popup-header">
        <div className="popup-brand">
          <span className="brand-name">VaultGuard</span>
        </div>
      </div>
      <div className="popup-body" style={{ justifyContent: 'center', padding: '0 20px' }}>
        <div className="locked-view" style={{ flex: 'none', background: 'var(--card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
          <h2 className="locked-title">Vault Locked</h2>
          <p className="locked-subtitle" style={{marginBottom: 16}}>Sign in to your account to continue</p>
          
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', textAlign: 'left', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>Email address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!!initialEmail || loading}
              style={{ marginBottom: 16 }}
            />

            <label className="form-label" style={{ display: 'block', textAlign: 'left', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>Master Password</label>
            <div className="password-wrap">
              <input
                type={show ? 'text' : 'password'}
                className={`form-input ${error ? 'form-input--error' : ''}`}
                placeholder="Master Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                autoFocus
              />
              <button className="pw-toggle" onClick={() => setShow(s => !s)} type="button">
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>

          <button className="btn-primary" onClick={handleUnlock} disabled={loading} style={{marginTop: 12}}>
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Unlock />);
