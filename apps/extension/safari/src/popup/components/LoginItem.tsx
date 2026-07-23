import { useState } from 'react';
import { SafePopupLoginMetadata } from '@vaultguard/browser-api';
import { sendToBackground } from '../../messaging/client';

interface LoginItemProps {
  item: SafePopupLoginMetadata;
  selected?: boolean;
}

export function LoginItem({ item, selected }: LoginItemProps) {
  const [copying, setCopying] = useState<string | null>(null);

  const handleCopyUsername = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.username) return;
    setCopying('username');
    try {
      await navigator.clipboard.writeText(item.username);
      // Let the background know (optional, just mimicking typical mediated approach)
      await sendToBackground({ type: 'COPY_LOGIN_FIELD', itemId: item.itemId, vaultId: item.vaultId, field: 'username' } as any);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    setTimeout(() => setCopying(null), 1500);
  };

  const handleCopyPassword = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying('password');
    try {
      // Fetch the secret securely
      const res = await sendToBackground<any>({ type: 'GET_LOGIN_SECRET', itemId: item.itemId, vaultId: item.vaultId } as any);
      if (res.success && res.data.password) {
        await navigator.clipboard.writeText(res.data.password);
        await sendToBackground({ type: 'COPY_LOGIN_FIELD', itemId: item.itemId, vaultId: item.vaultId, field: 'password' } as any);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
    setTimeout(() => setCopying(null), 1500);
  };

  const handleOpen = async () => {
    try {
      await sendToBackground({ type: 'OPEN_LOGIN_WEBSITE', itemId: item.itemId, vaultId: item.vaultId } as any);
    } catch (err) {
      console.error('Failed to open website', err);
    }
  };

  return (
    <div className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-md cursor-pointer transition-colors ${selected ? 'bg-secondary' : 'hover:bg-card'}`} onClick={handleOpen}>
      <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-sm font-semibold border border-border bg-[#15234b] text-white">
        {item.title.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-foreground truncate">{item.title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.username || item.website || 'No username'}</div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.username && (
          <button 
            className="w-7 h-7 rounded text-muted-foreground flex items-center justify-center transition-colors hover:bg-secondary hover:text-foreground" 
            title="Copy username" 
            onClick={handleCopyUsername}
          >
            {copying === 'username' ? (
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><path d="M11.5 4.5l-6 6-2.5-2.5" stroke="theme(colors.primary.DEFAULT)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" /><path d="M2 14c0-2.5 3-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" strokeWidth="1.3" /></svg>
            )}
          </button>
        )}
        <button 
          className="w-7 h-7 rounded text-muted-foreground flex items-center justify-center transition-colors hover:bg-secondary hover:text-foreground" 
          title="Copy password" 
          onClick={handleCopyPassword}
        >
          {copying === 'password' ? (
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><path d="M11.5 4.5l-6 6-2.5-2.5" stroke="theme(colors.primary.DEFAULT)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.3" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
