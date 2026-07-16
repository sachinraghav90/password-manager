import { db } from '../client';
import { authService } from './authService';
import { planService } from './planService';

export async function seedSuperAdmin() {
  const email = 'superadmin@system.local';
  const password = 'SuperAdminPassword123!';
  
  const existingUser = await db.users.where('email').equalsIgnoreCase(email).first();
  if (existingUser) {
    // FORCE RESET PASSWORD IF LOCKED OUT
    const { cryptoUtils } = await import('../../crypto/cryptoService');
    const newSalt = cryptoUtils.generateSalt();
    
    // Hash new password
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(password + newSalt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const newPasswordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    await db.users.update(existingUser.id, {
      passwordHash: newPasswordHash,
      masterKeySalt: newSalt,
      mustChangePassword: false,
      accountType: 'personal',
      updatedAt: Date.now()
    });
    console.log('Force reset super admin password to default');
    return;
  }

  // Register the user
  const user = await authService.register('Super Admin', email, password);
  
  // Assign Super Admin role
  await db.platform_role_assignments.add({
    id: crypto.randomUUID(),
    userId: user.id,
    role: 'super_admin',
    status: 'active',
    assignedAt: Date.now()
  });

  // Seed plans while we're at it
  await planService.seedDevelopmentPlans();

  console.log(`Successfully seeded super admin: ${email} / ${password}`);
}
