const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk(path.join(__dirname, 'apps', 'web', 'src', 'lib', 'db', 'services'), (filePath) => {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace auditService.logEvent(orgId, actorId, action, details, ip, userAgent)
    // with auditService.logEvent({ organizationId: orgId, actorUserId: actorId, action, details, ipAddress: ip, userAgent })
    content = content.replace(/auditService\.logEvent\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+)(?:,\s*([^,]+))?(?:,\s*([^,)]+))?\)/g, (match, orgId, actorId, action, details, ip, ua) => {
      if (orgId.trim().startsWith('{')) return match; // already an object
      
      let res = `auditService.logEvent({\n      organizationId: ${orgId.trim()},\n      actorUserId: ${actorId.trim()},\n      action: ${action.trim()},\n      details: ${details.trim()}`;
      if (ip && ip.trim() !== 'undefined') res += `,\n      ipAddress: ${ip.trim()}`;
      if (ua && ua.trim() !== 'undefined') res += `,\n      userAgent: ${ua.trim()}`;
      res += `\n    })`;
      return res;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
