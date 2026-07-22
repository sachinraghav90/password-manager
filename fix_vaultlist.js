const fs = require('fs');
const filePath = 'packages/ui/src/views/VaultListView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace vaultItemService import
content = content.replace(/import \{ vaultItemService \} from '\.\.\/lib\/db\/services\/vaultItemService';\r?\n?/g, '');

// Update import to include useItemListAdapter
content = content.replace(
  /import \{ useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter \} from '\.\.\/adapters';/,
  "import { useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter, useItemListAdapter } from '../adapters';"
);

// Replace useItemListStore calls
content = content.replace(/const itemListStore = useItemListStore\(\);/g, 'const itemListStore = useItemListAdapter();');
content = content.replace(/useItemListStore\.setState\(\(s\) => \(\{\r?\n\s+debouncedSearchQuery: query\r?\n\s+\}\)\);/g, 'itemListStore.setSearchQuery(query);');

// Replace vaultItemService calls
content = content.replace(/await vaultItemService\.getItemDetails\(/g, 'await itemListStore.getItemDetails(');
content = content.replace(/await vaultItemService\.updateItem\(/g, 'await itemListStore.updateItem(');
content = content.replace(/await vaultItemService\.deleteItem\(/g, 'await itemListStore.deleteItem(');
content = content.replace(/await vaultItemService\.toggleFavorite\(/g, 'await itemListStore.toggleFavorite(');

fs.writeFileSync(filePath, content);
console.log('Refactored VaultListView.tsx successfully');
