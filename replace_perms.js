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
      const targets = ['authorizationService', 'permissionProfileService', 'auditService'];
      
      targets.forEach(target => {
        if (content.includes(target) && (content.includes('/' + target) || content.includes('.'))) {
          // match import { ...target... } from '.../target';
          const regex = new RegExp(`import \\{.*?${target}.*?\\} from '[\\.\\/]+(lib\\/)?db\\/services\\/${target}';`, 'g');
          if (regex.test(content)) {
             content = content.replace(regex, `import { ${target} } from '@vaultguard/permissions';`);
             changed = true;
          }
          // also catch things like: import { authorizationService } from './authorizationService';
          const regex2 = new RegExp(`import \\{.*?${target}.*?\\} from '\\.\\/${target}';`, 'g');
          if (regex2.test(content)) {
             content = content.replace(regex2, `import { ${target} } from '@vaultguard/permissions';`);
             changed = true;
          }
        }
      });

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}
replaceInDir(path.join(__dirname, 'apps/web/src'));
replaceInDir(path.join(__dirname, 'packages/permissions/src'));
