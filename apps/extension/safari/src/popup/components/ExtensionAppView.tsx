import { useState, useEffect, useRef } from 'react';
import { SafePopupLoginMetadata } from '@vaultguard/browser-api';
import { sendToBackground, openExpandedPopup } from '../../messaging/client';
import { useAuthAdapter, ITEM_REGISTRY } from '@vaultguard/ui';
import { ItemType } from '@vaultguard/models';

export function ExtensionAppView() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<SafePopupLoginMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SafePopupLoginMetadata | null>(null);
  const [tabUrl, setTabUrl] = useState<string>('');
  const [copying, setCopying] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [syncTriggered, setSyncTriggered] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (chrome?.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) setTabUrl(tabs[0].url);
      });
    }
    
    // Removed TRIGGER_SYNC as VG_DEV_SYNC handles syncing natively.
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    sendToBackground<any>({ type: 'GET_POPUP_LOGINS', query: debouncedQuery, tabUrl } as any)
      .then(res => {
        if (res.success && res.data) {
          setItems(res.data);
          if (res.data.length > 0 && !selectedItem) {
            setSelectedItem(res.data[0]);
          } else if (res.data.length === 0) {
            setSelectedItem(null);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, tabUrl, syncTriggered]); // Re-run when sync triggered

  const handleCopy = async (field: 'username' | 'password', id: string, vaultId: string) => {
    try {
      setCopying(field);
      const res = await sendToBackground<{ password?: string }>({ 
        type: 'GET_LOGIN_SECRET', 
        itemId: id, 
        vaultId 
      } as any);

      if (res.success && res.data?.password) {
        if (field === 'password') {
          await navigator.clipboard.writeText(res.data.password);
        }
      }
      setTimeout(() => setCopying(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
      setCopying(null);
    }
  };

  const openWebsite = (id: string, vaultId: string) => {
    sendToBackground({
      type: 'OPEN_LOGIN_WEBSITE',
      itemId: id,
      vaultId,
      newTab: true
    } as any);
  };

  const handleCreateNew = (type: ItemType) => {
    sendToBackground({
      type: 'CREATE_ITEM_IN_WEB',
      itemType: type
    } as any);
    setShowAddMenu(false);
  };

  // Group items by vault
  const groupedItems = items.reduce((acc, item) => {
    const vName = item.vaultName || 'Unknown Vault';
    if (!acc[vName]) acc[vName] = [];
    acc[vName].push(item);
    return acc;
  }, {} as Record<string, SafePopupLoginMetadata[]>);

  return (
    <div className="flex h-[600px] w-[800px] bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* LEFT PANEL - Vaults & Items */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-semibold text-lg text-gray-800">VaultGuard</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => openExpandedPopup()}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Pop out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <div className="relative" ref={addMenuRef}>
              <button 
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {showAddMenu && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  {Object.values(ITEM_REGISTRY).map((def) => {
                    const Icon = def.icon;
                    return (
                      <button
                        key={def.type}
                        onClick={() => handleCreateNew(def.type)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3"
                      >
                        <Icon className="w-4 h-4 text-gray-500" />
                        {def.displayName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search..."
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : Object.keys(groupedItems).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm">No items found.</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedItems).map(([vaultName, vaultItems]) => (
                <div key={vaultName} className="mb-4">
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {vaultName}
                  </div>
                  <ul className="px-2">
                    {vaultItems.map((item) => {
                      const isSelected = selectedItem?.itemId === item.itemId;
                      return (
                        <li key={item.itemId}>
                          <button
                            onClick={() => setSelectedItem(item)}
                            className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-3 transition-colors ${
                              isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                              isSelected ? 'bg-blue-200 text-blue-800' : 'text-gray-600'
                            }`}>
                              {item.title.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden flex-1">
                              <div className="font-medium text-sm truncate">{item.title}</div>
                              {item.itemType === 'secure_note' ? (
                                <div className={`text-xs truncate ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                                  Secure Note
                                </div>
                              ) : (
                                <div className={`text-xs truncate ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                                  {item.username || item.website || 'No username'}
                                </div>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Item Details */}
      <div className="flex-1 bg-white flex flex-col h-full border-l border-gray-200">
        {selectedItem ? (
          <>
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700 flex-shrink-0">
                  {selectedItem.title.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">{selectedItem.title}</h2>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    {selectedItem.vaultName} 
                    <span className="text-gray-300">•</span> 
                    {selectedItem.itemType === 'secure_note' ? 'Secure Note' : 'Login'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-md flex items-center gap-2 border border-transparent hover:border-gray-200 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div className="max-w-2xl">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {selectedItem.itemType === 'secure_note' ? (
                    <div className="p-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</div>
                      <div className="text-gray-900 whitespace-pre-wrap font-mono text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                        {selectedItem.notes || 'No notes available.'}
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedItem.username && (
                        <div className="p-4 flex justify-between items-center group">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</div>
                            <div className="text-gray-900">{selectedItem.username}</div>
                          </div>
                          <button 
                            onClick={() => handleCopy('username', selectedItem.itemId, selectedItem.vaultId)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy username"
                          >
                            {copying === 'username' ? (
                              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      
                      <div className="p-4 flex justify-between items-center group">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</div>
                          <div className="text-gray-900 font-mono tracking-widest">••••••••••••</div>
                        </div>
                        <button 
                          onClick={() => handleCopy('password', selectedItem.itemId, selectedItem.vaultId)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy password"
                        >
                          {copying === 'password' ? (
                            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {selectedItem.website && (
                        <div className="p-4 flex justify-between items-center group">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Website</div>
                            <a href={selectedItem.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {selectedItem.website}
                            </a>
                          </div>
                          <button 
                            onClick={() => openWebsite(selectedItem.itemId, selectedItem.vaultId)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Open website"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {selectedItem.notes && (
                        <div className="p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</div>
                          <div className="text-gray-700 whitespace-pre-wrap text-sm">
                            {selectedItem.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 bg-gray-50">
            <svg className="w-16 h-16 mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-500">No item selected</p>
            <p className="text-sm mt-1">Select an item from the sidebar to view its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
