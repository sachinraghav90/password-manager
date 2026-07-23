import React, { useEffect, useState } from 'react';
import { ExtensionResponse } from '@vaultguard/browser-api';
import { sendToBackground } from '../../messaging/client';

interface SaveLoginOverlayProps {
  candidateId: string;
  action: 'SAVE' | 'UPDATE';
  itemId?: string;
  onClose: () => void;
}

export function SaveLoginOverlay({ candidateId, action, itemId, onClose }: SaveLoginOverlayProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ hostname: string, username: string } | null>(null);
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [vaultId, setVaultId] = useState('');
  const [vaults, setVaults] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Candidate Summary
    sendToBackground({ type: 'GET_SAVE_CANDIDATE_SUMMARY', candidateId }).then((res: ExtensionResponse<any>) => {
      setLoading(false);
      if (res.success && res.data) {
        setData(res.data as any);
        setTitle((res.data as any).hostname || (res.data as any).domain);
        setUsername((res.data as any).username || '');
      } else {
        onClose(); // Invalid candidate
      }
    });

    // 2. We need vaults. For simplicity, we can fetch AuthState to get vaults, but currently 
    // there isn't a direct message to just fetch vaults for content scripts safely. 
    // For this implementation, we will assume a "Default Vault" is passed or we just pass vaultId = 'default'.
    // Ideally, we add a GET_VAULTS message or return them in GET_SAVE_CANDIDATE_SUMMARY.
    // For now, we'll hardcode vaultId empty to let backend use default.
  }, [candidateId]);

  const handleSave = () => {
    const request = action === 'UPDATE' && itemId
      ? { type: 'UPDATE_LOGIN_CANDIDATE' as const, candidateId, itemId, vaultId: vaultId || 'default' }
      : { type: 'SAVE_LOGIN_CANDIDATE' as const, candidateId, vaultId: vaultId || 'default', title, username };
    void sendToBackground<any>(request).then(() => onClose()).catch(() => onClose());
  };

  const handleDismiss = () => {
    void sendToBackground<any>({ type: 'DISMISS_SAVE_CANDIDATE', candidateId }).finally(onClose);
  };

  if (loading || !data) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      width: '320px',
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#374151',
      zIndex: 2147483647,
      overflow: 'hidden',
      pointerEvents: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Save login
        </div>
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={handleDismiss}
            style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
          >
            Not now
          </button>
          <button 
            onClick={handleSave}
            style={{ flex: 1, padding: '8px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
