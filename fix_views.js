const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'packages/ui/src/views');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace imports
  content = content.replace(/import \{ useAuthStore \} from '\.\.\/store\/useAuthStore';?/g, '');
  content = content.replace(/import \{ useVaultStore \} from '\.\.\/store\/useVaultStore';?/g, '');
  content = content.replace(/import \{ useAccountStore \} from '\.\.\/store\/useAccountStore';?/g, '');
  content = content.replace(/import \{ useAppStore \} from '\.\.\/store\/useAppStore';?/g, '');
  content = content.replace(/import \{ useItemListStore \} from '\.\.\/store\/useItemListStore';?/g, '');
  
  // Add adapter imports at the top
  const adapterImports = "import { useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter } from '../adapters';\n";
  content = adapterImports + content;

  // Replace hook calls
  content = content.replace(/useAuthStore\(\)/g, 'useAuthAdapter()');
  content = content.replace(/useVaultStore\(\)/g, 'useVaultAdapter()');
  content = content.replace(/useAccountStore\(\)/g, 'useAccountAdapter()');
  content = content.replace(/useAppStore\(\)/g, 'useSettingsAdapter()');

  // Change function name
  content = content.replace(/export function Dashboard\(/g, 'export function DashboardView(');
  content = content.replace(/export function VaultList\(/g, 'export function VaultListView(');

  fs.writeFileSync(filePath, content);
}
console.log('Refactored views to use adapters.');
