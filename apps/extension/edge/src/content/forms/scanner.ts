/**
 * scanner.ts
 * Scans the DOM for login/registration/OTP forms.
 */

import { isValidField } from './visibility';
import { classifyField, FieldType } from './classifier';

export interface FormField {
  element: HTMLInputElement;
  type: FieldType;
}

export interface FormEntity {
  id: string; // Unique ID for deduplication
  container: HTMLElement;
  fields: FormField[];
  isStandardForm: boolean;
}


/**
 * Main scanner function. Scans a root element (usually document.body or a shadowRoot).
 */
export function scanForForms(root: HTMLElement | Document | ShadowRoot): FormEntity[] {
  // Every scan is authoritative. Cached WeakSets made fill-time rescans return no forms.
  const detectedForms = new WeakMap<HTMLElement, FormEntity>();
  const processedFields = new WeakSet<HTMLInputElement>();
  const newEntities: FormEntity[] = [];
  
  // 1. Scan standard <form> tags
  const formElements = root.querySelectorAll('form');
  formElements.forEach(form => {
    if (detectedForms.has(form)) return; // Already processed
    
    const inputs = Array.from(form.querySelectorAll('input'));
    const validFields: FormField[] = [];
    
    for (const input of inputs) {
      if (processedFields.has(input)) continue;
      if (isValidField(input)) {
        const type = classifyField(input);
        if (type !== 'unknown') {
          validFields.push({ element: input, type });
          processedFields.add(input);
        }
      }
    }

    if (validFields.length > 0) {
      const entity: FormEntity = {
        id: crypto.randomUUID(),
        container: form,
        fields: validFields,
        isStandardForm: true
      };
      detectedForms.set(form, entity);
      newEntities.push(entity);
    }
  });

  // 2. Scan orphan inputs
  const orphanInputs = Array.from(root.querySelectorAll('input')).filter(input => !processedFields.has(input));
  const validOrphans = orphanInputs.filter(input => isValidField(input));

  // Group orphans by bounded containers
  const orphanGroups = new Map<HTMLElement, FormField[]>();
  
  for (const input of validOrphans) {
    const type = classifyField(input);
    if (type === 'unknown') continue;
    
    const container = findBoundedContainer(input);
    if (!orphanGroups.has(container)) {
      orphanGroups.set(container, []);
    }
    orphanGroups.get(container)!.push({ element: input, type });
    processedFields.add(input);
  }

  for (const [container, fields] of orphanGroups.entries()) {
    if (detectedForms.has(container)) {
      // If we somehow already have an entity for this container, just append fields (unlikely if strictly orphans)
      const entity = detectedForms.get(container)!;
      entity.fields.push(...fields);
    } else {
      const entity: FormEntity = {
        id: crypto.randomUUID(),
        container,
        fields,
        isStandardForm: false
      };
      detectedForms.set(container, entity);
      newEntities.push(entity);
    }
  }

  return newEntities;
}

/**
 * Finds a bounded container for an orphan field.
 * Looks for common UI structural boundaries (e.g., a card, a modal, or the nearest element wrapping a submit button).
 */
function findBoundedContainer(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element.parentElement;
  
  while (current && current !== document.body && current !== document.documentElement) {
    // If it's a semantic block container or has a submit button inside, treat it as the boundary.
    const hasSubmitButton = current.querySelector('button[type="submit"], input[type="submit"]');
    
    // Some heuristics for a "form container"
    const tagName = current.tagName.toLowerCase();
    const isSection = ['section', 'main', 'article', 'dialog'].includes(tagName);
    const hasFormLikeClass = current.className.includes && (current.className.includes('form') || current.className.includes('modal') || current.className.includes('auth'));
    
    // Stop at the first significant container that also groups fields
    if (isSection || hasFormLikeClass || hasSubmitButton) {
      return current;
    }
    
    current = current.parentElement;
  }
  
  // Fallback to body or highest element if no boundary found
  return element.parentElement || document.body;
}

export function resetScannerStateForTests() {
  // Only used for isolated testing
}

