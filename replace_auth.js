const fs = require('fs');
const path = require('path');

function replaceInDir(currentDir) {
  fs.readdirSync(currentDir).forEach(file => {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      if (content.includes('authService') && content.includes('/db/services/authService')) {
        content = content.replace(/import \{.*?\} from '[\.\/]+(lib\/)?db\/services\/authService';/g, "import { authService } from '@vaultguard/auth';");
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}
replaceInDir(path.join(__dirname, 'apps/web/src'));
