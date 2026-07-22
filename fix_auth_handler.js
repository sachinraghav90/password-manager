const fs = require('fs');
const filePath = 'apps/extension/src/background/handlers/authHandler.ts';
let content = fs.readFileSync(filePath, 'utf8');

const newHandleLogin = 
export async function handleLogin(
  email: string,
  accountPassword: string,
  requestId: string
): Promise<ExtensionResponse<{ locked: true }>> {
  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: accountPassword
    });

    if (authError || !authData.user) {
      return {
        success: false,
        requestId,
        error: { code: 'ACCESS_DENIED', message: authError?.message || 'Authentication failed' }
      };
    }

    // 2. Fetch Profile to get salt
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'Profile not found' } };
    }

    // 3. Fetch Vault
    const { data: vaults, error: vaultsError } = await supabase
      .from('vaults')
      .select('*')
      .eq('ownership_type', 'personal')
      .eq('owner_user_id', authData.user.id);

    if (vaultsError || !vaults || vaults.length === 0) {
      return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: 'Vault not found' } };
    }

    const primaryVault = vaults[0];

    // 4. Store in local DB for offline access
    await db.users.clear();
    await db.vaults.clear();
    const localUser = {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      emailVerified: true,
      passwordHash: '',
      masterKeySalt: profile.master_key_salt,
      encryptionVersion: profile.encryption_version,
      createdAt: new Date(profile.created_at).getTime(),
      updatedAt: new Date(profile.updated_at).getTime(),
    };
    const localVault = {
      id: primaryVault.id,
      name: 'Personal',
      description: 'Your default personal vault',
      createdBy: profile.id,
      ownershipType: 'personal' as const,
      ownerUserId: profile.id,
      organizationId: null,
      wrappedVaultKey: primaryVault.wrapped_vault_key,
      vaultKeyNonce: primaryVault.vault_key_nonce,
      encryptionVersion: primaryVault.encryption_version,
      createdAt: new Date(primaryVault.created_at).getTime(),
      updatedAt: new Date(primaryVault.updated_at).getTime()
    };
    await db.users.put(localUser as User);
    await db.vaults.put(localVault as Vault);

    // Note: We DO NOT derive the master key here. The user is now authenticated but the vault remains locked.
    // They must explicitly call UNLOCK with their master password to decrypt.
    chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', locked: true }).catch(() => {});

    return { success: true, requestId, data: { locked: true } };
  } catch (err: any) {
    return { success: false, requestId, error: { code: 'ACCESS_DENIED', message: err.message } };
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    accountPassword = '';
  }
}
;

content = content.replace(/export async function handleLogin\([\s\S]*?\}\s*\}\s*$/m, newHandleLogin);
fs.writeFileSync(filePath, content);
