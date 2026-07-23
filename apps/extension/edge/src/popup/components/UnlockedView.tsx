import { useState, useEffect } from 'react';
import { SafePopupLoginMetadata } from '@vaultguard/browser-api';
import { sendToBackground } from '../../messaging/client';
import { SearchBar } from './SearchBar';
import { LoginItem } from './LoginItem';
import { Settings, Lock } from 'lucide-react'; // use lucide icons if available, otherwise just use standard svgs. I'll stick to svgs to avoid dependency issues since I didn't check lucide.

export function UnlockedView({ onLock }: { onLock: () => void }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<SafePopupLoginMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get current tab URL for context scoring
  const [tabUrl, setTabUrl] = useState<string>('');

  useEffect(() => {
    if (chrome?.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) setTabUrl(tabs[0].url);
      });
    }
  }, []);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch items
  useEffect(() => {
    setLoading(true);
    sendToBackground<any>({ type: 'GET_POPUP_LOGINS', query: debouncedQuery, tabUrl } as any)
      .then(res => {
        if (res.success && res.data) {
          setItems(res.data);
          setSelectedIndex(0);
        }
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, tabUrl]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLock = async () => {
    const res = await sendToBackground({ type: 'LOCK' });
    if (res.success) onLock();
    else showToast('❌ Lock failed');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        // Default action: Open website
        sendToBackground({ 
          type: 'OPEN_LOGIN_WEBSITE', 
          itemId: items[selectedIndex].itemId, 
          vaultId: items[selectedIndex].vaultId 
        } as any).catch(console.error);
      }
    } else if (e.key === 'Escape') {
      window.close();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <SearchBar value={query} onChange={setQuery} onKeyDown={handleKeyDown} />
      
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{query ? 'Search Results' : 'Suggested for you'}</span>
      </div>
      
      <div className="flex flex-col px-2 gap-0.5 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-5 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-5 text-center text-muted-foreground text-sm">
            No logins found.
          </div>
        ) : (
          items.map((item, idx) => (
            <LoginItem key={item.itemId} item={item} selected={idx === selectedIndex} />
          ))
        )}
      </div>
      
      {toast && (
        <div className="mx-4 my-2 px-3 py-2 bg-success/10 border border-success/20 rounded-md text-xs text-success font-mono animate-slide-in-bottom">
          {toast}
        </div>
      )}
      
      <div className="flex items-center p-2 border-t border-border bg-card gap-1 shrink-0">
        <button 
          className="flex-1 flex flex-col items-center gap-1 p-2 rounded-md text-muted-foreground text-[10px] font-medium transition-colors hover:bg-secondary hover:text-foreground" 
          onClick={() => chrome.runtime.openOptionsPage()} 
          title="Settings"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]"><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          Settings
        </button>
        <button 
          className="flex-1 flex flex-col items-center gap-1 p-2 rounded-md text-muted-foreground text-[10px] font-medium transition-colors hover:bg-secondary hover:text-destructive" 
          onClick={handleLock} 
          title="Lock vault"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]"><rect x="4" y="9" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Lock
        </button>
      </div>
    </div>
  );
}
