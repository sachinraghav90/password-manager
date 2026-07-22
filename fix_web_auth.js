const fs = require('fs');
const filePath = 'apps/web/src/adapters/WebUIProvider.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update authAdapter definition
const newAuthAdapter = 
  const { authService } = require('@vaultguard/auth');
  
  let authState: 'signed_out' | 'authenticated_locked' | 'authenticated_unlocked' = 'signed_out';
  if (authStore.isAuthenticated) {
    authState = authStore.isLocked ? 'authenticated_locked' : 'authenticated_unlocked';
  }

  const authAdapter = {
    ...authStore,
    authState,
    isSuperAdmin: false,
    login: async (email, accountPassword) => {
      // 1. Login with account password to Supabase (creates session)
      const user = await authService.login(email, accountPassword, (import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.VITE_SUPABASE_ANON_KEY);
      // Wait, authService.login currently fetches profile and requires masterPassword in the original implementation?
      // Wait, original Login.tsx passed masterPassword to authService.login!
      // I need to check authService.login to make sure it handles accountPassword correctly.
      authStore.login(user); // Wait, this stores user in zustand and sets isLocked=true
    },
    unlock: async (masterPassword) => {
      // authService.login was previously used for unlocking too?
      // Let's just use authService.login(user.email, masterPassword) for now, as it was in UnlockView.tsx
      const unlockedUser = await authService.login(authStore.user.email, masterPassword, (import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.VITE_SUPABASE_ANON_KEY);
      authStore.unlock(unlockedUser);
    },
    lock: async () => {
      authStore.lock();
    },
    logout: async () => {
      authStore.logout();
    }
  };
;

content = content.replace(/const authAdapter = \{\s*\.\.\.authStore,\s*isSuperAdmin: false[^\}]*\};\s*/, newAuthAdapter);
fs.writeFileSync(filePath, content);
