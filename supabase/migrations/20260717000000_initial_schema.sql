-- ==========================================
-- VaultGuard Initial Supabase Schema & RLS
-- ==========================================

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  master_key_salt TEXT NOT NULL, -- Base64 encoded 16-byte salt
  encryption_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Vaults Table
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id),
  organization_id UUID, -- For future organization support
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('personal', 'organization')),
  wrapped_vault_key TEXT NOT NULL, -- Base64 encoded ciphertext
  vault_key_nonce TEXT NOT NULL, -- Base64 encoded nonce
  encryption_version INT NOT NULL DEFAULT 1,
  schema_version INT NOT NULL DEFAULT 1,
  record_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Vault Members Table
CREATE TABLE vault_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wrapped_vault_key TEXT NOT NULL, -- Specific to this user if shared
  vault_key_nonce TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vault_id, user_id)
);

-- 4. Encrypted Items Table
CREATE TABLE encrypted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  data_nonce TEXT NOT NULL,
  encryption_version INT NOT NULL DEFAULT 1,
  schema_version INT NOT NULL DEFAULT 1,
  record_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. Devices Table (For device management)
CREATE TABLE devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Item Indexes (Optional table for non-secret metadata indexing, e.g., domains)
CREATE TABLE item_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES encrypted_items(id) ON DELETE CASCADE,
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- E.g. normalized domain 'google.com' (metadata leakage)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Critical Requirement: Service-role keys are never used by the extension or web client.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_indexes ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile and profiles of shared vault members
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Vaults: Personal Vault Access
CREATE POLICY "Users can access their own personal vaults" ON vaults
  FOR ALL USING (ownership_type = 'personal' AND owner_user_id = auth.uid());

-- Vaults: Organization/Shared Vault Access
CREATE POLICY "Users can access shared vaults they are members of" ON vaults
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vault_members vm 
      WHERE vm.vault_id = vaults.id AND vm.user_id = auth.uid()
    )
  );

-- Vault Members: Read Access
CREATE POLICY "Users can view members of their vaults" ON vault_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM vault_members vm 
      WHERE vm.vault_id = vault_members.vault_id AND vm.user_id = auth.uid()
    )
  );

-- Encrypted Items: Access via Vault Membership or Ownership
CREATE POLICY "Users can access items in their vaults" ON encrypted_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vaults v 
      WHERE v.id = encrypted_items.vault_id AND (
        (v.ownership_type = 'personal' AND v.owner_user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM vault_members vm 
          WHERE vm.vault_id = v.id AND vm.user_id = auth.uid()
        )
      )
    )
  );

-- Devices: User can manage their own devices
CREATE POLICY "Users can manage their devices" ON devices
  FOR ALL USING (user_id = auth.uid());

-- Item Indexes: Access mirrors Encrypted Items
CREATE POLICY "Users can access indexes for their items" ON item_indexes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vaults v 
      WHERE v.id = item_indexes.vault_id AND (
        (v.ownership_type = 'personal' AND v.owner_user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM vault_members vm 
          WHERE vm.vault_id = v.id AND vm.user_id = auth.uid()
        )
      )
    )
  );


CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);