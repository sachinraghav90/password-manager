# Phase 10: Implementation Blueprint

## 1. Prioritized Screen Build Order (MVP)
1. **Base Layout & Routing:** Setup Sidebar, Routing shell, Dark/Light mode context.
2. **Authentication:** Sign In / Sign Up (UI only first, then integrate auth/crypto).
3. **Vault List & Detail (Read-Only):** Build the core 2-pane layout with mock data to perfect the UI.
4. **Item Editor (CRUD):** Build the dynamic form builder based on `PM_COMMON_FIELD_INFO`.
5. **Dashboard:** Implement the entry screen with stats and recents.
6. **Command Palette:** The global search overlay.
7. **Settings:** Profile, Security preferences.

## 2. Component Build Order
To avoid blocking page development, build these foundation components first:
1. Typography & CSS Variables (Tokens).
2. Buttons & Icon Buttons.
3. Form Inputs (Text, Password, Dropdowns).
4. Data Display (Item List Row, Field Row with Copy).
5. Overlays (Modal, Drawer, Toast).

## 3. Risks and Open Questions
* **Crypto Integration:** Ensure the UI layer handles asynchronous decryption smoothly without freezing the main thread. Use skeleton loaders during decryption phases.
* **Dynamic Fields:** The schema allows highly dynamic fields. The UI must be robust enough to render arbitrary field combinations gracefully without layout breakage.
* **Performance:** Rendering large lists of vault items. Ensure virtualization (e.g., `react-window`) is implemented if lists exceed 500 items.

## 4. Recommended Next Step
**Prompt Antigravity to:**
> "Initialize the frontend project using Vite + React + TypeScript. Setup the Tailwind CSS configuration (or Vanilla CSS architecture) based on the Design System tokens defined in `UI/05-design-system.md`. Build the core layout shell (Sidebar + Main Content Area) and a dummy Vault List View to establish the structural foundation."
