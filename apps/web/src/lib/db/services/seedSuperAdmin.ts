import { db } from '@vaultguard/db-local';
import { authService } from '@vaultguard/auth';
import { planService } from './planService';

export async function seedSuperAdmin() {
  const email = 'superadmin@system.local';
  const password = 'SuperAdminPassword123!';
  
  const existingUser = await db.users.where('email').equalsIgnoreCase(email).first();
  if (existingUser) {
    // Already seeded. Do nothing.
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
