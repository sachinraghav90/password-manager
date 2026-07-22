import { db } from '@vaultguard/db-local';

export async function cleanupDuplicateUsers() {
  const users = await db.users.toArray();
  const emailMap = new Map<string, any[]>();
  
  for (const u of users) {
    const email = u.email.toLowerCase();
    if (!emailMap.has(email)) {
      emailMap.set(email, []);
    }
    emailMap.get(email)!.push(u);
  }

  for (const [email, duplicates] of emailMap.entries()) {
    if (duplicates.length > 1) {
      console.log(`Found duplicate users for ${email}. Merging...`);
      
      // Sort by creation time, oldest first
      duplicates.sort((a, b) => a.createdAt - b.createdAt);
      
      const originalUser = duplicates[0];
      
      // For all newer duplicate users, we need to remap their memberships and orgs to the original user
      for (let i = 1; i < duplicates.length; i++) {
        const duplicate = duplicates[i];
        
        // 1. Update Organization Admin assignments
        await db.organizations.where('adminUserId').equals(duplicate.id).modify({
          adminUserId: originalUser.id
        });
        
        // 2. Update Memberships
        await db.organization_memberships.where('userId').equals(duplicate.id).modify({
          userId: originalUser.id
        });
        
        // 3. Update Audit Events
        await db.audit_events.where('actorUserId').equals(duplicate.id).modify({
          actorUserId: originalUser.id
        });

        // 4. Delete the duplicate user
        await db.users.delete(duplicate.id);
        console.log(`Deleted duplicate user ${duplicate.id} and merged into ${originalUser.id}`);
      }
    }
  }
}
