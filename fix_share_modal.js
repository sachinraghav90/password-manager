const fs = require('fs');
const filePath = 'packages/ui/src/components/vault/ShareModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove illegal imports
content = content.replace(/import \{ db \} from '@vaultguard\/db-local';\r?\n?/g, '');
content = content.replace(/import \{ sharingPolicyService \} from '\.\.\/\.\.\/lib\/db\/services\/sharingPolicyService';\r?\n?/g, '');

// Update hook call
content = content.replace(/const \{ user \} = useAuthAdapter\(\);/g, 'const { user } = useAuthAdapter();\n  const { getSharingPolicy, searchOrgUsers, getUserTeams } = useVaultAdapter();');

// Replace sharingPolicyService
content = content.replace(/await sharingPolicyService\.getEffectiveItemPolicy/g, 'await getSharingPolicy');
content = content.replace(/await sharingPolicyService\.getEffectiveVaultPolicy/g, 'await getSharingPolicy');

// Replace db calls for teams
content = content.replace(
/const userMembership = await db\.organization_memberships\.where\('\[organizationId\+userId\]'\)\.equals\(\[organizationId, user!\.id\]\)\.first\(\);\s+if \(userMembership\) \{\s+const teamMemberships = await db\.organization_team_memberships\.where\('membershipId'\)\.equals\(userMembership\.id\)\.toArray\(\);\s+const teamIds = teamMemberships\.map\(tm => tm\.teamId\);\s+const teams = \[\];\s+for \(const tId of teamIds\) \{\s+const t = await db\.organization_teams\.get\(tId\);\s+if \(t\) teams\.push\(t\);\s+\}\s+setUserTeams\(teams\);\s+\}/g,
'const teams = await getUserTeams(organizationId, user!.id);\n            setUserTeams(teams);'
);

// Replace db calls for user search
content = content.replace(
/const memberships = await db\.organization_memberships\.where\('organizationId'\)\.equals\(organizationId\)\.toArray\(\);\s+const userIds = memberships\.map\(m => m\.userId\);\s+const results = \[\];\s+for \(const uid of userIds\) \{\s+if \(uid === user\?\.id\) continue;\s+const u = await db\.users\.get\(uid\);\s+if \(u && \(u\.email\.toLowerCase\(\)\.includes\(query\) \|\| u\.fullName\.toLowerCase\(\)\.includes\(query\)\)\) \{\s+results\.push\(u\);\s+\}\s+\}\s+setSearchResults\(results\);/g,
'const results = await searchOrgUsers(organizationId, query);\n        setSearchResults(results.filter(u => u.id !== user?.id));'
);

fs.writeFileSync(filePath, content);
console.log('Refactored ShareModal.tsx successfully');
