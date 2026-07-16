# Phase 9: Accessibility (A11y)

Accessibility is non-negotiable for a premium product, especially a security tool.

## 1. Keyboard Navigation
* Complete operability via keyboard. Users must be able to navigate the sidebar, list view, and trigger copy actions without a mouse.
* **Focus Management:** Active focus must have a clear, high-contrast ring (e.g., 2px solid Electric Blue with 2px offset).
* Arrow keys should navigate the item list up and down.

## 2. Screen Readers
* Semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, `<aside>`).
* Hidden text for masked passwords: When a password is masked as `••••••••`, the screen reader should announce "Password, hidden" rather than trying to read bullets.
* `aria-live="polite"` regions for toast notifications and search results updates.

## 3. Visual Requirements
* **Contrast:** Minimum 4.5:1 contrast ratio for normal text, 3:1 for large text and UI components.
* **Color Independence:** Do not rely solely on color to convey meaning. Error states must have an icon AND red color.
* **High Contrast Theme:** Support system-level high contrast modes.

## 4. Reduced Motion
* Respect `prefers-reduced-motion` media query. If true, disable structural transitions and fast-fade elements instead.
