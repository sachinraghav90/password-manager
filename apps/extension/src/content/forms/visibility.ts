/**
 * visibility.ts
 * Determines if a field is visible, interactive, and relevant.
 */

export function isVisible(element: HTMLElement): boolean {
  // 1. Detached nodes or zero-area
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // 2. Hidden attributes
  if (element.hasAttribute('hidden')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  // 3. Computed styles (Walking up is partially handled by computed style of element, 
  // but let's check basic properties).
  const style = window.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  
  // Note: We don't fail strictly on opacity: 0 alone, because fields might animate in.
  // But if it's opacity 0 AND pointer-events: none, it's effectively hidden/disabled.
  if (style.opacity === '0' && style.pointerEvents === 'none') {
    return false;
  }

  // 4. Check ancestors for display:none or visibility:hidden just in case
  // (getComputedStyle usually reflects ancestor display:none, but just to be safe for visibility).
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') return false;
    
    // We only need to check inline style or simple properties if we want to avoid 
    // heavy getComputedStyle in a loop. But let's be rigorous if needed:
    const pStyle = window.getComputedStyle(current);
    if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return false;
    
    current = current.parentElement;
  }

  return true;
}

export function isInteractive(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
  if (element.disabled) return false;
  if ('readOnly' in element && (element as any).readOnly) return false;
  return true;
}

export function isValidField(element: HTMLInputElement): boolean {
  // Types we ignore entirely
  const ignoredTypes = ['hidden', 'submit', 'button', 'image', 'reset', 'file', 'checkbox', 'radio', 'color', 'range'];
  if (ignoredTypes.includes(element.type.toLowerCase())) {
    return false;
  }
  
  return isVisible(element) && isInteractive(element);
}
