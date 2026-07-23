/**
 * observer.ts
 * Manages MutationObservers to detect dynamically inserted forms and shadow roots.
 */

import { scanForForms } from './scanner';
import { setScannedFields } from './store';

let debounceTimer: number | null = null;
const DEBOUNCE_MS = 250;

const observers = new Set<MutationObserver>();

// Configuration: observe additions and specific attribute changes that affect visibility/classification
const OBSERVER_CONFIG: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['type', 'autocomplete', 'disabled', 'readonly', 'hidden', 'aria-hidden']
};

export function startFormObserver() {
  if (observers.size > 0) return; // Already started

  const mainObserver = new MutationObserver(handleMutations);
  mainObserver.observe(document.body, OBSERVER_CONFIG);
  observers.add(mainObserver);

  // Initial scan
  scheduleScan();
}

export function stopFormObserver() {
  observers.forEach(obs => obs.disconnect());
  observers.clear();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function handleMutations(mutations: MutationRecord[]) {
  let shouldScan = false;

  for (const mutation of mutations) {
    if (mutation.type === 'attributes') {
      shouldScan = true;
    } else if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldScan = true;

      // Check for newly attached open shadow roots
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          // Simple heuristic: check if this element has a shadow root
          if (el.shadowRoot) {
            attachShadowObserver(el.shadowRoot);
          }
          // Also, deep elements might have shadow roots, but traversing every added tree is expensive.
          // We rely on standard scanForForms which could do deep traversal, 
          // or we attach when custom elements are defined. 
          // For now, if the root itself is a shadow host, we attach.
        }
      });
    }
  }

  if (shouldScan) {
    scheduleScan();
  }
}

function attachShadowObserver(shadowRoot: ShadowRoot) {
  const obs = new MutationObserver(handleMutations);
  obs.observe(shadowRoot, OBSERVER_CONFIG);
  observers.add(obs);
}

function scheduleScan() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    performScan();
  }, DEBOUNCE_MS);
}

function performScan() {
  // Scan document body
  const forms = scanForForms(document.body);
  
  // Update global scanned fields list for OverlayManager
  const allFields = forms.flatMap(f => f.fields.map(field => field.element));
  setScannedFields(allFields);
  window.dispatchEvent(new CustomEvent('vg:fields_updated'));

  if (forms.length > 0) {
    // console.log(`Detected ${forms.length} forms on page.`);
  }
}
