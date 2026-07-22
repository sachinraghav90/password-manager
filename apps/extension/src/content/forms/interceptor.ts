import { scanForForms } from './scanner';
import { PageContext } from '@vaultguard/browser-api';
import { sendToBackground } from '../../messaging/client';

export function startFormInterceptor() {
  document.addEventListener('submit', handleFormSubmit, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);
}

export function stopFormInterceptor() {
  document.removeEventListener('submit', handleFormSubmit, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeydown, true);
}

function captureForm(form: HTMLFormElement | HTMLElement) {
  // Wait a tick to allow the page to navigate or submit
  {
    // Find fields in this specific form/container
    const entities = scanForForms(form);
    
    // Fallback to body scan if no fields found in the exact container
    const formsToAnalyze = entities.length > 0 ? entities : scanForForms(document.body);

    for (const entity of formsToAnalyze) {
      let username = '';
      let password = '';
      
      for (const field of entity.fields) {
        if (field.type === 'username' || field.type === 'email') username = field.element.value;
        if (field.type === 'current-password' || field.type === 'new-password' || field.type === 'unknown-password') {
          password = field.element.value;
        }
      }

      if (password && password.length > 0) {
        // We found a password submission candidate
        const page: PageContext = {
          url: window.location.href,
          origin: window.location.origin,
          hostname: window.location.hostname,
          isTopFrame: window.top === window
        };

        // Send to background safely
        void sendToBackground<any>({ type: 'CREATE_SAVE_CANDIDATE', candidate: { username, password }, page })
          .then(res => {
            if (res.success && res.data?.action !== 'NONE' && res.data?.candidateId) {
              setTimeout(() => window.dispatchEvent(new CustomEvent('vg:save_candidate', { detail: { candidateId: res.data.candidateId, action: res.data.action, itemId: res.data.matchedItemId } })), 1000);
            }
          }).catch(() => { /* stale extension context */ });
        
        break; // Only capture one form
      }
    }
  }
}

function handleFormSubmit(e: SubmitEvent) {
  if (e.target instanceof HTMLFormElement) {
    captureForm(e.target);
  }
}

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const button = target.closest('button, input[type="submit"]');
  if (button) {
    // Treat clicks on buttons in login contexts as potential submits for SPAs
    const form = button.closest('form');
    if (form) {
      captureForm(form);
    } else {
      // Find the closest logical container
      captureForm(button.parentElement || document.body);
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement) {
      const form = target.closest('form');
      if (form) {
        captureForm(form);
      } else {
        captureForm(target.parentElement || document.body);
      }
    }
  }
}
