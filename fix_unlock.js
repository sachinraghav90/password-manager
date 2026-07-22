const fs = require('fs');
const filePath = 'packages/ui/src/views/UnlockView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace imports
content = content.replace(/import \{ useAuthStore \} from '\.\.\/store\/useAuthStore';\r?\n?/g, "import { useAuthAdapter } from '../adapters';\n");

// Replace component name
content = content.replace(/export function Unlock\(/g, 'export function UnlockView(');

// Replace hook usages
content = content.replace(/const \{ user, unlock \} = useAuthStore\(\);/g, 'const { user, unlock } = useAuthAdapter();');

// Refactor handleUnlock to await unlock and clear password immediately
content = content.replace(
/try \{\s+setLoading\(true\);\s+await unlock\(user, password\);\s+navigate\('\/app'\);\s+\}/g,
"try {\n      setLoading(true);\n      await unlock(password);\n      setPassword(''); // clear password immediately\n      navigate('/app');\n    }"
);

fs.writeFileSync(filePath, content);
