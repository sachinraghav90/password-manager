const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../src/lib/itemRegistry.ts');
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('searchablePayloadFields: string[];')) {
  content = content.replace('fields: RegistryField[];', 'fields: RegistryField[];\n  searchablePayloadFields: string[];');
}

// We will use a regex to find each block: `  type_name: { ... fields: [...] \n  },`
// And append `searchablePayloadFields: [...]` inside it.

const regex = /([a-z_]+):\s*{\s*type:\s*'[^']+',\s*displayName:\s*'[^']+',\s*category:\s*'[^']+',\s*icon:\s*[a-zA-Z]+,\s*fields:\s*\[([\s\S]*?)\]\s*}/g;

const excludeFields = new Set(['password', 'passwordValue', 'verificationNumber', 'pin', 'recoveryPhrase', 'privateKey', 'passphrase', 'adminPassword', 'licenseKey', 'baseStationPassword', 'wirelessNetworkPassword', 'attachedStrongPassword', 'number', 'credentialValue', 'routingNumber', 'accountNumber', 'iban', 'reminderAnswer', 'smtpPasswordValue']);

content = content.replace(regex, (match, key, fieldsStr) => {
  if (match.includes('searchablePayloadFields')) return match;
  
  const fieldNames = [];
  const fieldRegex = /name:\s*'([^']+)'/g;
  let m;
  while ((m = fieldRegex.exec(fieldsStr)) !== null) {
    const fName = m[1];
    if (!excludeFields.has(fName)) {
      fieldNames.push(`'${fName}'`);
    }
  }
  
  // Also add common search fields
  fieldNames.push(`'notes'`);
  
  return match.replace(/fields:\s*\[([\s\S]*?)\]\s*}/, `fields: [$1],\n    searchablePayloadFields: [${fieldNames.join(', ')}]\n  }`);
});

fs.writeFileSync(targetFile, content);
console.log('Updated itemRegistry.ts');
