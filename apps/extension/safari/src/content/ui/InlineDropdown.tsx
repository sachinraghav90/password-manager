import React, { useEffect, useState } from 'react';
import {
  ContentContextData,
  ExtensionError,
  InlineSuggestion,
  InlineSuggestionsStatus,
  FillResultData
} from '@vaultguard/browser-api';
import { sendToBackground } from '../../messaging/client';

interface InlineDropdownProps {
  targetField: HTMLInputElement;
  onClose: () => void;
  autoFillFirst?: boolean;
}

function requestId(): string {
  return crypto.randomUUID();
}

const statusText: Record<Exclude<InlineSuggestionsStatus, 'MATCHES_FOUND'>, string> = {
  NO_MATCHES: 'No details saved',
  VAULT_LOCKED: 'Unlock VaultGuard to view logins',
  SYNC_UNAVAILABLE: 'Vault sync is unavailable',
  AUTOFILL_DISABLED: 'Autofill is disabled for this site',
  DECRYPTION_FAILED: 'Saved logins could not be decrypted'
};

export function InlineDropdown({ onClose, autoFillFirst = false }: InlineDropdownProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InlineSuggestion[]>([]);
  const [status, setStatus] = useState<InlineSuggestionsStatus>('NO_MATCHES');
  const [error, setError] = useState<ExtensionError | null>(null);
  const [context, setContext] = useState<ContentContextData | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const identity = await sendToBackground<ContentContextData>({ type: 'GET_CONTENT_CONTEXT' });
      if (!active) return;
      if (!identity.success) {
        setError(identity.error);
        setLoading(false);
        return;
      }
      setContext(identity.data);

      const id = requestId();
      const response = await sendToBackground<import('@vaultguard/browser-api').InlineSuggestionsData>({
        type: 'GET_INLINE_SUGGESTIONS',
        requestId: id,
        page: {
          url: window.location.href,
          origin: window.location.origin,
          tabId: identity.data.tabId,
          frameId: identity.data.frameId,
          documentId: identity.data.documentId
        }
      });
      if (!active) return;
      setLoading(false);
      if (!response.success) {
        setError(response.error);
        return;
      }
      setStatus(response.data.status);
      setItems(response.data.items);
      if (autoFillFirst && response.data.status === 'MATCHES_FOUND' && response.data.items[0]) {
        const selected = response.data.items[0];
        const fill = await sendToBackground<FillResultData>({ type: 'REQUEST_INLINE_FILL', requestId: requestId(), itemId: selected.itemId, tabId: identity.data.tabId, frameId: identity.data.frameId, pageUrl: window.location.href, documentId: identity.data.documentId });
        if (fill.success && fill.data.status.startsWith('FILLED_')) onClose();
      }
    })().catch(() => {
      if (active) {
        setError({ code: 'INVALID_CONTEXT', message: 'VaultGuard background is unavailable.' });
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const handleFill = async (itemId: string) => {
    if (!context) return;
    const id = requestId();
    const response = await sendToBackground<FillResultData>({
      type: 'REQUEST_INLINE_FILL',
      requestId: id,
      itemId,
      tabId: context.tabId,
      frameId: context.frameId,
      pageUrl: window.location.href,
      documentId: context.documentId
    });
    if (!response.success) {
      setError(response.error);
      return;
    }
    if (response.data.status === 'FILLED_USERNAME_AND_PASSWORD' ||
        response.data.status === 'FILLED_USERNAME_ONLY' ||
        response.data.status === 'FILLED_PASSWORD_ONLY') {
      onClose();
      return;
    }
    setError({
      code: 'INVALID_CONTEXT',
      message: response.data.status === 'STALE_DOCUMENT'
        ? 'This page changed. Open the VaultGuard icon again.'
        : 'No eligible login fields were found.'
    });
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      width: '260px',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#374151'
    }}>
      <div style={{ padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: '12px', color: '#6b7280' }}>
        VaultGuard
      </div>

      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#b91c1c' }}>
            {error.message || 'VaultGuard could not load suggestions'}
          </div>
        ) : status !== 'MATCHES_FOUND' ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
            {statusText[status]}
          </div>
        ) : (
          items.map((item, index) => (
            <button
              type="button"
              key={item.itemId}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 0,
                borderBottom: index < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                background: 'transparent',
                textAlign: 'left'
              }}
              onMouseDown={(event) => {
                // Keep the field/overlay alive long enough for the fill IPC request.
                event.preventDefault();
              }}
              onClick={() => void handleFill(item.itemId)}
            >
              <span style={{ fontWeight: 500, color: '#111827' }}>{item.title}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.username || 'No username'}</span>
              {item.vaultName && (
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{item.vaultName}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}





