# Phase 2: Information Architecture

## 1. Core Structure & Site Map
The application relies on a persistent left-hand sidebar for global navigation, with a main content area that often splits into a two-pane list/detail view for item management.

```text
App Root
├── Welcome / Auth (Sign In, Sign Up, Recovery)
└── App Workspace
    ├── Global Search Bar (Top or Command Palette)
    ├── Sidebar Navigation
    │   ├── Home / Dashboard
    │   ├── Favorites
    │   ├── Vaults
    │   │   ├── Personal Vault
    │   │   ├── Team Vault
    │   │   └── [+] Create Vault
    │   ├── Categories
    │   │   ├── All Items
    │   │   ├── Logins
    │   │   ├── Secure Notes
    │   │   ├── Credit Cards
    │   │   └── Developer Secrets
    │   ├── Security Health
    │   └── Tools
    │       └── Password Generator
    └── Settings / Profile (Bottom of Sidebar)
        ├── Account Settings
        ├── Security Preferences
        ├── Import / Export
        └── Admin Console (if Business Admin)
```

## 2. Dashboard Organization
The Home/Dashboard acts as the starting point. It is not just a list of all items; it provides actionable insights:
* **Top:** Global search and quick "Add Item" action.
* **Hero:** Security Health summary (e.g., "Your security score is 85/100").
* **Recent:** Quick access to the last 5 accessed items.
* **Favorites:** Prominent display of pinned items.

## 3. Vault & Item Organization
* **Vaults:** Top-level security boundaries. Users select a Vault to scope the list view.
* **List View:** Displays items within the selected context (Vault or Category). Sortable by Title, Updated Date, Created Date.
* **Detail Pane:** When an item is selected, the right pane shows all fields, dynamic common fields, tags, and actions (Copy, Edit, Delete).

## 4. Search and Filtering
* **Global Command Palette:** Invoked via `Ctrl/Cmd + K`. Searches across all metadata (Title, URL, Username) globally.
* **Contextual Filter:** A filter bar above the List View to narrow down the current context.

## 5. Empty States & Error States
* **Empty States:** Highly visual, guiding the user to the primary action (e.g., "This vault is empty. [Create your first Login]").
* **Error States:** Friendly, non-alarming error messages. In case of decryption failures, explain clearly without exposing technical stack traces.
