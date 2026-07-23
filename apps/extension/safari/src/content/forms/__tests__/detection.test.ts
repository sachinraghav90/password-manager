import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { scanForForms, resetScannerStateForTests } from '../scanner';
import { classifyField } from '../classifier';
import { isVisible, isValidField } from '../visibility';

// Polyfill minimal JSDOM features if needed, though Vitest with environment: 'jsdom' provides most of it.
// We must mock getBoundingClientRect for visibility checks since JSDOM returns 0s by default.

describe('Form Detection Engine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetScannerStateForTests();

    // Mock getBoundingClientRect on HTMLElement prototype for JSDOM
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('hidden') || this.getAttribute('aria-hidden') === 'true') {
        return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} };
      }
      return { width: 100, height: 20, top: 0, left: 0, bottom: 20, right: 100, x: 0, y: 0, toJSON: () => {} };
    });
    
    // Mock getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((elem: Element) => {
      const e = elem as HTMLElement;
      return {
        display: e.style.display || 'block',
        visibility: e.style.visibility || 'visible',
        opacity: e.style.opacity || '1',
        pointerEvents: e.style.pointerEvents || 'auto',
      } as CSSStyleDeclaration;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility & Validity', () => {
    it('ignores hidden fields via attributes', () => {
      document.body.innerHTML = `<input type="text" hidden id="test" />`;
      const input = document.getElementById('test') as HTMLInputElement;
      expect(isVisible(input)).toBe(false);
    });

    it('ignores aria-hidden fields', () => {
      document.body.innerHTML = `<input type="text" aria-hidden="true" id="test" />`;
      const input = document.getElementById('test') as HTMLInputElement;
      expect(isVisible(input)).toBe(false);
    });

    it('ignores disabled and readonly fields', () => {
      document.body.innerHTML = `
        <input type="text" disabled id="disabled" />
        <input type="text" readonly id="readonly" />
      `;
      expect(isValidField(document.getElementById('disabled') as HTMLInputElement)).toBe(false);
      expect(isValidField(document.getElementById('readonly') as HTMLInputElement)).toBe(false);
    });

    it('ignores checkbox and submit inputs', () => {
      document.body.innerHTML = `
        <input type="checkbox" id="check" />
        <input type="submit" id="submit" />
      `;
      expect(isValidField(document.getElementById('check') as HTMLInputElement)).toBe(false);
      expect(isValidField(document.getElementById('submit') as HTMLInputElement)).toBe(false);
    });
  });

  describe('Classifier', () => {
    it('classifies username by autocomplete', () => {
      document.body.innerHTML = `<input type="text" autocomplete="username" id="test" />`;
      expect(classifyField(document.getElementById('test') as HTMLInputElement)).toBe('username');
    });

    it('classifies current-password by autocomplete', () => {
      document.body.innerHTML = `<input type="password" autocomplete="current-password" id="test" />`;
      expect(classifyField(document.getElementById('test') as HTMLInputElement)).toBe('current-password');
    });

    it('classifies OTP by hints', () => {
      document.body.innerHTML = `<input type="text" name="security code" id="test" />`;
      expect(classifyField(document.getElementById('test') as HTMLInputElement)).toBe('otp');
    });

    it('classifies new-password by hints', () => {
      document.body.innerHTML = `<input type="password" id="new-password" />`;
      expect(classifyField((document.getElementById('test') || document.getElementById('new-password')) as HTMLInputElement)).toBe('new-password');
    });
    
    it('does not guess confirm password by count, sets unknown-password', () => {
      document.body.innerHTML = `<input type="password" id="test" />`;
      expect(classifyField(document.getElementById('test') as HTMLInputElement)).toBe('unknown-password');
    });
  });

  describe('Scanner', () => {
    it('detects standard login forms', () => {
      document.body.innerHTML = `
        <form id="login">
          <input type="text" name="username" />
          <input type="password" name="password" />
        </form>
      `;
      const entities = scanForForms(document.body);
      expect(entities.length).toBe(1);
      expect(entities[0].isStandardForm).toBe(true);
      expect(entities[0].fields.length).toBe(2);
      expect(entities[0].fields[0].type).toBe('username');
      expect(entities[0].fields[1].type).toBe('unknown-password');
    });

    it('groups orphans by container heuristic', () => {
      document.body.innerHTML = `
        <div class="auth-modal">
          <input type="email" id="email" />
          <input type="password" id="pass" />
          <button type="submit">Log in</button>
        </div>
      `;
      const entities = scanForForms(document.body);
      expect(entities.length).toBe(1);
      expect(entities[0].isStandardForm).toBe(false);
      expect(entities[0].fields.length).toBe(2);
      expect(entities[0].container.className).toBe('auth-modal');
    });

    it('deduplicates detected fields', () => {
      document.body.innerHTML = `
        <form id="dup">
          <input type="text" name="username" />
        </form>
      `;
      const entities1 = scanForForms(document.body);
      expect(entities1.length).toBe(1);
      const entities2 = scanForForms(document.body);
      // Because we persist processedFields state, a second scan shouldn't double-process the inputs
      expect(entities2.length).toBe(0);
    });
  });
});
