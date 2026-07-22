const fs = require('fs');
const filePath = 'packages/ui/src/views/DashboardView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import \{ vaultItemService \} from '\.\.\/lib\/db\/services\/vaultItemService';\r?\n?/g, '');
content = content.replace(/import \{ useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter \} from '\.\.\/adapters';/, "import { useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter, useItemListAdapter } from '../adapters';");
content = content.replace(/const recentItems = await vaultItemService\.getRecentItems\(user\.id, 5\);/g, 'const itemListStore = useItemListAdapter();\n        const recentItems = await itemListStore.getRecentItems(user.id, 5);');

fs.writeFileSync(filePath, content);
