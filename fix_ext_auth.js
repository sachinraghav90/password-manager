const fs = require('fs');
const filePath = 'apps/extension/src/adapters/ExtensionUIProvider.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const newAuthAdapter = 
  const [authState, setAuthState] = useState<{
    state: 'signed_out' | 'authenticated_locked' | 'authenticated_unlocked';
    user: any | null;
    isLoading: boolean;
    isSuperAdmin: boolean;
  }>({
    state: 'signed_out',
    user: null,
    isLoading: true,
    isSuperAdmin: false
  });

  useEffect(() => {
    sendToBackground({ type: 'GET_AUTH_STATE' }).then((res: any) => {
      if (res.success) {
        setAuthState(s => ({
          ...s,
          state: res.data.state,
          user: res.data.email ? { email: res.data.email, fullName: res.data.email } : null,
          isLoading: false
        }));
      }
    });
    
    const listener = (msg: any) => {
      if (msg.type === 'AUTH_STATE_CHANGED') {
         sendToBackground({ type: 'GET_AUTH_STATE' }).then((res: any) => {
           if (res.success) {
             setAuthState(s => ({
               ...s,
               state: res.data.state,
               user: res.data.email ? { email: res.data.email, fullName: res.data.email } : null,
             }));
           }
         });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const authAdapter = {
    authState: authState.state,
    user: authState.user,
    isLoading: authState.isLoading,
    isSuperAdmin: authState.isSuperAdmin,
    login: async (email, accountPassword) => {
      const res = await sendToBackground({ type: 'LOGIN', email, masterPassword: accountPassword } as any);
      if (!res.success) throw new Error(res.error?.message || 'Login failed');
      // Background broadcasts AUTH_STATE_CHANGED
    },
    logout: async () => {
      const res = await sendToBackground({ type: 'LOGOUT' } as any);
      if (res && res.success) {
        setAuthState(s => ({ ...s, state: 'signed_out', user: null }));
      }
    },
    unlock: async (masterPassword) => {
      const res = await sendToBackground({ type: 'UNLOCK', masterPassword } as any);
      if (!res.success) throw new Error(res.error?.message || 'Unlock failed');
    },
    lock: async () => {
      await sendToBackground({ type: 'LOCK' });
    }
  };
;

content = content.replace(/const \[authState, setAuthState\] = useState\(\{[\s\S]*?lock:\s*\(\)\s*=>\s*\{[\s\S]*?\}\r?\n\s+\};\r?\n/g, newAuthAdapter);

fs.writeFileSync(filePath, content);
