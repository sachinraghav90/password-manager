# Phase 8: Responsive Strategy

The application must feel native on all devices. We cannot simply shrink a 3-pane desktop layout down to a mobile screen.

## Breakpoints & Layouts

* **Desktop & Large Displays (> 1024px):**
  * 3-Pane Layout: Sidebar (Nav) | Middle Pane (Item List) | Right Pane (Item Detail).
  * Max-width constraints on the detail pane text to maintain readability (max 800px).

* **Tablet (768px - 1024px):**
  * 2-Pane Layout.
  * Sidebar collapses to icon-only mode.
  * Middle Pane (List) and Right Pane (Detail) share the remaining width.

* **Mobile (< 768px):**
  * 1-Pane Layout (Stack navigation).
  * **Navigation:** Sidebar disappears. Replaced by a Bottom Tab Bar (Home, Vaults, Search, Settings).
  * **Flow:** Tapping a Vault opens the List View full screen. Tapping an Item pushes the Detail View onto the stack.
  * **Actions:** Floating Action Button (FAB) in the bottom right for "+ Add Item".

## Component Adaptations
* **Modals:** On desktop, they are centered dialogs. On mobile, they become bottom-sheet drag-up panels to be easily reachable by thumbs.
* **Tables:** Settings tables switch to stacked card layouts on mobile.
* **Hover States:** Since hover doesn't exist on touch devices, secondary actions (like "Copy" or "Edit") must be permanently visible or accessible via a clearly marked `...` (more options) menu on mobile.
