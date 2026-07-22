const fs = require('fs');
const filePath = 'packages/ui/src/views/LoginView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace imports
content = content.replace(/import \{ authService \} from '@vaultguard\/auth';\r?\n?/g, '');
content = content.replace(/import \{ useAuthStore \} from '\.\.\/store\/useAuthStore';\r?\n?/g, "import { useAuthAdapter } from '../adapters';\n");

// Replace component name
content = content.replace(/export function Login\(/g, 'export function LoginView(');

// Replace hook usages
content = content.replace(/const \{ login \} = useAuthStore\(\);/g, 'const { login } = useAuthAdapter();');

// Remove console.log
content = content.replace(/console\.log\('Web App VITE_SUPABASE_URL:', import\.meta\.env\.VITE_SUPABASE_URL\);\r?\n?/g, '');

// Refactor handleLogin
content = content.replace(
/const user = await authService\.login\([\s\S]*?\);\s*login\(user\);\s*navigate\('\/app'\);/g,
"await login(email, password);\n      setPassword(''); // clear password immediately\n      // AuthLayout handles redirect"
);

// Update placeholders and labels since it is the account password now
content = content.replace(/Master Password/g, 'Account Password');
content = content.replace(/Enter your master password/g, 'Enter your account password');

fs.writeFileSync(filePath, content);
