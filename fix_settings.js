const fs = require('fs');
const filePath = 'packages/ui/src/views/SettingsView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace imports
content = content.replace(/import \{ useAuthStore \} from '\.\.\/store\/useAuthStore';?/g, '');
content = content.replace(/import \{ useAppStore \} from '\.\.\/store\/useAppStore';?/g, '');
content = content.replace(/import \{ userService \} from '\.\.\/lib\/db\/services\/userService';?/g, '');

const adapterImports = "import { useAuthAdapter, useSettingsAdapter } from '../adapters';\n";
content = adapterImports + content;

// Replace hook calls
content = content.replace(/useAuthStore\(\)/g, 'useAuthAdapter()');
content = content.replace(/useAppStore\(\)/g, 'useSettingsAdapter()');

// Replace function name
content = content.replace(/export function Settings\(/g, 'export function SettingsView(');

// Replace userService call with SettingsAdapter call
content = content.replace(/await userService\.updateSettings\(user\.id, \{\r?\n\s+autofill:\r?\n\s+newMode\r?\n\s+\}\);/g, 'await updateSettings({ autofill: newMode });');

fs.writeFileSync(filePath, content);
