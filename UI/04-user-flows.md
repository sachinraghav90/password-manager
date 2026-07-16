# Phase 4: User Flows

## 1. First-Time Onboarding
1. User enters email and verifies it.
2. User creates a strong Master Password.
3. System generates a Secret Key and enforces user to save it (Emergency Kit).
4. User enters the main app and sees the "Empty Dashboard" state with a clear CTA to "Add First Password" or "Import".

## 2. Saving the First Credential
1. User clicks the primary `+ New Item` button.
2. Selects item type (e.g., Login).
3. Fills in Title, Username, Password, URL.
4. Uses the inline Password Generator if creating a new account.
5. Clicks "Save".
6. Success toast appears; user is taken to the Item Detail view.

## 3. Searching and Using a Credential
1. User presses `Cmd+K`.
2. Command palette opens. User types "Github".
3. Results filter instantly. User uses arrow keys to select the Github login.
4. User hits `Enter` to open details, or `Cmd+C` on the highlighted item to instantly copy the password.

## 4. Importing Passwords
1. User goes to Settings > Import.
2. Selects source (e.g., 1Password CSV or Chrome CSV).
3. Uploads file.
4. System displays a preview table mapping columns (Name, URL, Username, Password).
5. User confirms mapping.
6. System encrypts and saves items in batches, showing a progress bar.
7. Completion screen shows number of items imported.

## Friction Points & Improvements
* **Friction:** Managing the Secret Key is terrifying for average users.
* **Improvement:** Provide a beautiful, printable "Emergency Kit" PDF. Don't let them proceed until they confirm they've saved it.
* **Friction:** Creating custom fields can be tedious.
* **Improvement:** Pre-populate common fields based on the item type (as defined in the `PM_WIRELESS_ROUTER` etc. schema) so users rarely need to create fields from scratch.
