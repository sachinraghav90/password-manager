import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { InlineDropdown } from './InlineDropdown';
import { SaveLoginOverlay } from './SaveLoginOverlay';
import { getScannedFields } from '../forms/store';
import { sendToBackground } from '../../messaging/client';
import { AuthStateData } from '@vaultguard/browser-api';

interface FieldPosition {
  element: HTMLInputElement;
  rect: DOMRect;
}

interface OverlayManagerState {
  fields: FieldPosition[];
  activeField: HTMLInputElement | null;
  saveCandidateId: string | null;
}

export function OverlayManager() {
  const [fields, setFields] = useState<FieldPosition[]>([]);
  const [activeField, setActiveField] = useState<HTMLInputElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saveCandidate, setSaveCandidate] = useState<{ id: string, action: 'SAVE' | 'UPDATE', itemId?: string } | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshAuth = async () => {
      try {
        const response = await sendToBackground<AuthStateData>({ type: 'GET_AUTH_STATE' });
        if (active && response.success) setVaultUnlocked(response.data.state === 'authenticated_unlocked');
      } catch {
        if (active) setVaultUnlocked(false);
      }
    };
    void refreshAuth();
    window.addEventListener('focus', refreshAuth);
    return () => { active = false; window.removeEventListener('focus', refreshAuth); };
  }, []);

  // Sync positions from DOM
  const updatePositions = useCallback(() => {
    // We get the elements from a global store that the scanner updates
    const currentFields = getScannedFields() || [];
    setFields(currentFields.map((el: HTMLInputElement) => ({
      element: el,
      rect: el.getBoundingClientRect()
    })));
  }, []);

  useEffect(() => {
    updatePositions();
    
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    
    // Custom event to trigger update from scanner
    window.addEventListener('vg:fields_updated', updatePositions);
    window.addEventListener('vg:save_candidate', (e: any) => {
      setSaveCandidate({
        id: e.detail.candidateId,
        action: e.detail.action,
        itemId: e.detail.itemId
      });
    });

    // Observe layout changes
    const observer = new MutationObserver(updatePositions);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('vg:fields_updated', updatePositions);
      window.removeEventListener('vg:save_candidate', () => {});
      observer.disconnect();
    };
  }, [updatePositions]);

  // Document focus tracking
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement) {
        const type = target.type.toLowerCase();
        const recognized = fields.some(f => f.element === target) || ['text', 'email', 'tel', 'password'].includes(type);
        if (recognized) {
          setActiveField(target);
          setDropdownOpen(true);
          return;
        }
      }
      setActiveField(null);
      setDropdownOpen(false);
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [fields]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2147483647 }}>
      {fields.map((field, idx) => {
        const isActive = activeField === field.element;
        // Position icon at the right edge of the input field
        const iconSize = 24;
        const padding = 8;
        const top = field.rect.top + (field.rect.height - iconSize) / 2;
        const left = field.rect.left + field.rect.width - iconSize - padding;

        // Skip rendering if field is invisible or too small
        if (field.rect.width === 0 || field.rect.height === 0) return null;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top,
              left,
              width: iconSize,
              height: iconSize,
              pointerEvents: 'auto',
              cursor: 'pointer',
              opacity: isActive ? 1 : 0.6,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
              // Check domain has logins and show tooltip logic here
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.opacity = '0.6';
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveField(field.element);
              setDropdownOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ background: '#fff', borderRadius: '4px' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              {vaultUnlocked ? <path d="M7 11V7a5 5 0 0 1 10 0"></path> : <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>}
            </svg>
            
            {isActive && dropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px' }}>
                <InlineDropdown 
                  targetField={field.element} 
                  onClose={() => setDropdownOpen(false)}
                  autoFillFirst 
                />
              </div>
            )}
          </div>
        );
      })}

      {saveCandidate && (
        <SaveLoginOverlay 
          candidateId={saveCandidate.id}
          action={saveCandidate.action}
          itemId={saveCandidate.itemId}
          onClose={() => setSaveCandidate(null)} 
        />
      )}
    </div>
  );
}

// Global injection point
let root: Root | null = null;
export function injectOverlayManager() {
  if (root) return;

  const container = document.createElement('div');
  container.id = 'vaultguard-overlay-root';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '2147483647';
  
  // Safe insertion
  if (document.body) {
    document.body.appendChild(container);
  } else {
    document.documentElement.appendChild(container);
  }

  const shadow = container.attachShadow({ mode: 'closed' });
  const reactRoot = document.createElement('div');
  shadow.appendChild(reactRoot);

  root = createRoot(reactRoot);
  root.render(<OverlayManager />);
}
