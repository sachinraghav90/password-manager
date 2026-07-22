/**
 * classifier.ts
 * Classifies an input field into a specific semantic role.
 */

export type FieldType = 'username' | 'email' | 'current-password' | 'new-password' | 'otp' | 'unknown-password' | 'unknown';

export function classifyField(element: HTMLInputElement): FieldType {
  const type = element.type.toLowerCase();
  const autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
  const name = (element.getAttribute('name') || '').toLowerCase();
  const id = (element.getAttribute('id') || '').toLowerCase();
  const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();

  // Try to find an associated label
  let labelText = '';
  if (element.labels && element.labels.length > 0) {
    labelText = Array.from(element.labels).map(l => l.textContent || '').join(' ').toLowerCase();
  } else if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      labelText = (label.textContent || '').toLowerCase();
    }
  }

  // Combine textual hints (name, id, placeholder, label)
  const hints = [name, id, placeholder, labelText].join(' ');

  // 1. Check Autocomplete first (highest priority)
  if (autocomplete.includes('username')) return 'username';
  if (autocomplete.includes('email')) return 'email';
  if (autocomplete.includes('current-password')) return 'current-password';
  if (autocomplete.includes('new-password')) return 'new-password';
  if (autocomplete.includes('one-time-code')) return 'otp';

  // 2. Check Type
  if (type === 'email') return 'email';
  
  // OTP heuristics
  if (hints.includes('otp') || hints.includes('one time') || hints.includes('verification code') || hints.includes('security code')) {
    // If it's a password field but has OTP hints, it might be an OTP field masking input.
    return 'otp';
  }

  // Password heuristics
  if (type === 'password') {
    if (hints.includes('new') || hints.includes('create') || hints.includes('confirm') || hints.includes('retype') || hints.includes('repeat')) return 'new-password';
    if (hints.includes('current') || hints.includes('old')) return 'current-password';
    
    // We do NOT guess based on field count here.
    return 'unknown-password';
  }

  // Username/Email heuristics
  if (hints.includes('email')) return 'email';
  if (hints.includes('username') || hints.includes('user name') || hints.includes('login') || hints.includes('account')) {
    return 'username';
  }

  return 'unknown';
}

