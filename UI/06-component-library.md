# Phase 6: Component Library

## 1. Layout Components
* **Sidebar:** Collapsible, active state highlighting, scrollable middle section (vaults/tags), fixed bottom section (settings).
* **Split Pane:** Resizable divider between List View (left, 30%) and Detail View (right, 70%).

## 2. Core UI Components
* **Button:** 
  * Variants: Primary, Secondary, Outline, Ghost, Danger.
  * States: Default, Hover, Active, Disabled, Loading.
* **Input Field:**
  * Types: Text, Password (with toggle), Search (with icon).
  * States: Default, Focus, Error, Disabled.
* **Icon Button:** Square, transparent background, icon centered. Used for copy actions.
* **Badge/Tag:** Small rounded pill for labels.
* **Avatar:** Circular user initial or image.

## 3. Domain Components
* **Item List Row:** Icon (site favicon or default), Title, Subtitle (username), Updated date. Hover state reveals quick-copy actions.
* **Detail Field Row:** Label, masked value. On hover, show "Copy" and "Reveal" icons.
* **Password Strength Meter:** Segmented progress bar (Red = Weak, Yellow = Fair, Green = Strong, Blue = Excellent) with label.
* **Category Selector:** Dropdown with icons representing Item Types (Login, Card, Note).

## 4. Overlays & Feedback
* **Command Palette:** Centered modal, blurred backdrop, large search input, scrollable results list.
* **Confirmation Dialog:** Standard modal for destructive actions (Delete Vault). Require typing vault name for extreme actions.
* **Toast Notification:** Bottom-right or Top-center. Success (green), Error (red), Info (blue). Auto-dismiss after 4s.

## 5. Accessibility Requirements
* All components must support `tabIndex` and visual focus rings.
* Dialogs must trap focus.
* Icons acting as buttons must have `aria-label`.
