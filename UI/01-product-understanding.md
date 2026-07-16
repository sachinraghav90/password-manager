# Phase 1: Understand the Product

## 1. Product Summary
This application is a **premium password manager and identity security platform** tailored for individuals, families, security-conscious SMBs, and technical teams. It provides a secure, encrypted workspace to store, manage, and share passwords, passkeys, secure notes, developer secrets, and other sensitive information. The platform aims to differentiate itself through extreme clarity, transparent security, and low-friction workflows, avoiding the heavy complexity of enterprise IAM suites while offering more power than basic consumer managers.

## 2. Key User Personas
* **Individual User:** Wants a fast, beautiful app to autofill passwords and store personal documents safely. Values speed and "it just works" simplicity.
* **Family Organizer:** Needs to share streaming logins and secure notes with family members. Values intuitive sharing controls and recovery options.
* **Developer / Tech Lead:** Needs to store API keys, SSH keys, and environment variables. Values CLI/API access, formatting preservation, and fast copy actions.
* **Business Admin (SMB):** Needs to provision accounts, manage shared team vaults, and monitor security health. Values easy onboarding, RBAC (Role-Based Access Control), and audit logs.

## 3. Primary User Goals
* **Secure Storage:** Rest easy knowing all sensitive data is encrypted client-side with zero-knowledge architecture.
* **Frictionless Access:** Quickly retrieve credentials or secrets without breaking workflow.
* **Safe Collaboration:** Share credentials with team members or family without exposing them to unauthorized parties.
* **Security Posture:** Understand and improve personal or team security health (e.g., identifying weak/reused passwords).

## 4. Main User Journeys
* **Onboarding:** Account creation, master password setup, and secret key generation.
* **Data Migration:** Importing data from existing managers (1Password, LastPass, browsers).
* **Daily Usage:** Searching for an item, viewing details, and copying credentials/passwords.
* **Item Management:** Creating, editing, organizing (via vaults, folders, tags), and deleting items.
* **Collaboration:** Creating a shared vault and managing access for other users.

## 5. Core Entities (Derived from Schema)
* **Users & Profiles:** The core identity, handling authentication and encryption keys.
* **Vaults:** The primary container for items. Can be personal or shared.
* **Items (Credentials/Notes):** The actual sensitive data (e.g., Logins, Wireless Routers, Secure Notes). They belong to a Vault.
* **Categories & Folders:** Organizational tools within Vaults.
* **Fields (`PM_COMMON_FIELD_INFO`):** Dynamic, custom fields attached to items (Text, Password, URL, Email, Date, OTP, etc.).
* **Favorites:** Items starred for quick access.
* **Tags:** Flexible labels for cross-vault organization.

## 6. Schema Gaps & Recommendations
* **Gap:** Handling of Passkeys isn't explicitly detailed in the basic schema. 
  * **Recommendation:** Ensure the dynamic fields or core item table supports WebAuthn credential objects as first-class citizens.
* **Gap:** Audit logging/History.
  * **Recommendation:** Ensure a table exists for item history to support rollback and admin audit trails.
* **Gap:** Sharing permissions granular model.
  * **Recommendation:** Ensure Vaults have a robust User-Vault mapping table with role definitions (Viewer, Editor, Manager).
