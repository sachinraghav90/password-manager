/**
 * autofill.ts
 * Receives decrypted credentials from the background and securely injects them into the DOM.
 */

import { ExecuteFillPayload, FillResultStatus } from '@vaultguard/browser-api';
import { scanForForms } from './forms/scanner';
import { isVisible, isInteractive } from './forms/visibility';


function setNativeValue(element: HTMLInputElement, value: string) {
  // Bypass React/Vue value setters by calling the native HTMLInputElement setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    // Fallback if native setter not found
    element.value = value;
  }
  
  // Dispatch native events to notify frameworks
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function handleAutofillMessage(payload: ExecuteFillPayload): FillResultStatus {

  const forms = scanForForms(document.body);
  
  // Prioritize forms: standard forms first, then orphans
  forms.sort((a, b) => {
    if (a.isStandardForm && !b.isStandardForm) return -1;
    if (!a.isStandardForm && b.isStandardForm) return 1;
    return 0;
  });

  let bestForm = forms.find(f => 
    f.fields.some(field => field.type === 'username' || field.type === 'email' || field.type === 'unknown-password' || field.type === 'current-password') &&
    !f.fields.some(field => field.type === 'new-password')
  );


  if (!bestForm) {
    const visible = Array.from(document.querySelectorAll('input')).filter(el => isVisible(el) && isInteractive(el));
    const passwords = visible.filter(el => el.type.toLowerCase() === 'password');
    const identifiers = visible.filter(el => ['text', 'email', 'tel'].includes(el.type.toLowerCase()));
    if (passwords.length === 1 && identifiers.length >= 1) {
      bestForm = { id: 'fallback-login', container: document.body, fields: [
        { element: identifiers[0], type: identifiers[0].type.toLowerCase() === 'email' ? 'email' : 'username' },
        { element: passwords[0], type: 'current-password' }
      ], isStandardForm: false };
    } else {
      return 'NO_ELIGIBLE_FORM';
    }
  }

  let filledUsername = false;
  let filledPassword = false;

  for (const field of bestForm.fields) {
    const el = field.element;
    
    // Late visibility re-check immediately before filling
    if (!isVisible(el) || !isInteractive(el)) {
      continue;
    }

    if ((field.type === 'username' || field.type === 'email') && payload.username) {
      setNativeValue(el, payload.username);
      filledUsername = true;
    } else if ((field.type === 'unknown-password' || field.type === 'current-password') && payload.password) {
      setNativeValue(el, payload.password);
      filledPassword = true;
    }
  }

  // Clear memory references explicitly (JavaScript doesn't guarantee memory zeroing, but we drop refs)
  payload.username = undefined;
  payload.password = undefined;

  if (filledUsername && filledPassword) return 'FILLED_USERNAME_AND_PASSWORD';
  if (filledUsername) return 'FILLED_USERNAME_ONLY';
  if (filledPassword) return 'FILLED_PASSWORD_ONLY';
  
  return 'NO_ELIGIBLE_FORM';
}

