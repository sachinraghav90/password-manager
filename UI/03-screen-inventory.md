# Phase 3: Screen Inventory

## 1. Authentication & Onboarding
* **Welcome Screen:** High-end marketing feel, entry point to login or signup.
* **Sign Up:** Multi-step wizard. Master password creation, secret key generation, PDF download of emergency kit. 
* **Sign In:** Clean, focused form. Master password input + MFA if enabled.
* **Password Recovery:** Flow to handle forgotten passwords using emergency kit/recovery codes.

## 2. Core Application
* **Dashboard (Home):** Overviews, quick actions, recents, favorites.
* **Vault List View:** The core 2-pane interface. Left pane: list of items. Right pane: blank placeholder.
* **Vault Detail View:** Right pane populated with item details.
* **Item Editor (Create/Edit):** Form view for editing an item. Supports dynamic fields (adding passwords, text, OTP, dates). Includes auto-save or explicit save.
* **Secure Note Detail/Editor:** Optimized for long-form encrypted text. Markdown support recommended.

## 3. Tools & Features
* **Password Generator:** Modal or dedicated screen. Sliders for length, toggles for symbols/numbers, real-time password strength meter.
* **Security Health (Watchtower):** Dashboard showing weak, reused, and compromised passwords.
* **Search Results Overlay:** Command palette interface (`Cmd+K`) floating over the app.

## 4. Settings & Management
* **Settings - Profile:** User details, avatar.
* **Settings - Security:** Auto-lock timer, MFA setup, change master password.
* **Settings - Import/Export:** CSV upload wizard with column mapping. Encrypted JSON export.
* **Notifications:** Toast container for ephemeral alerts, dedicated panel for system messages.

## 5. Future Expansion Screens
* **Admin Console:** User provisioning, group management, policy enforcement.
* **Billing:** Subscription management, invoice history.
* **Family Management:** Adding family members, account recovery delegation.
