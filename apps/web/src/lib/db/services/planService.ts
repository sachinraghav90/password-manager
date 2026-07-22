import { db } from '@vaultguard/db-local';
import { Plan } from '@vaultguard/models';

export const planService = {
  /**
   * Retrieves all active plans suitable for self-service or super-admin provisioning.
   */
  async getActivePlans(accountType: 'personal' | 'organization'): Promise<Plan[]> {
    return await db.plans.filter((p: Plan) => p.status === 'active' && p.accountType === accountType).toArray();
  },

  /**
   * Retrieves all plans (for Super Admin management)
   */
  async getAllPlans(): Promise<Plan[]> {
    return await db.plans.toArray();
  },

  /**
   * Create a new plan
   */
  async createPlan(planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    const newPlan: Plan = {
      ...planData,
      id: `plan_${crypto.randomUUID()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.plans.add(newPlan);
    return newPlan;
  },

  /**
   * Update an existing plan
   */
  async updatePlan(id: string, updates: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await db.plans.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },


  async seedDevelopmentPlans(): Promise<void> {
    const existing = await this.getAllPlans();
    if (existing.length === 0) {
      await this.createPlan({
        name: 'Free Personal',
        accountType: 'personal',
        selfServiceEnabled: true,
        status: 'active',
        seatLimit: 1,
        priceMonthly: 0,
        currency: 'USD',
        featureFlags: ['unlimited_items', 'cross_device_sync']
      });
      await this.createPlan({
        name: 'Pro Personal',
        accountType: 'personal',
        selfServiceEnabled: true,
        status: 'active',
        seatLimit: 1,
        priceMonthly: 499,
        currency: 'USD',
        featureFlags: ['unlimited_items', 'cross_device_sync', 'priority_support', '2fa']
      });
      await this.createPlan({
        name: 'Free Organization',
        accountType: 'organization',
        selfServiceEnabled: true,
        status: 'active',
        priceMonthly: 0,
        currency: 'USD',
        seatLimit: 2,
        featureFlags: ['unlimited_items', 'shared_vaults']
      });
      await this.createPlan({
        name: 'Pro Organization',
        accountType: 'organization',
        selfServiceEnabled: true,
        status: 'active',
        seatLimit: 100,
        priceMonthly: 999,
        currency: 'USD',
        featureFlags: ['unlimited_items', 'shared_vaults', 'rbac', 'sso']
      });
    }
  },


  /**
   * Reconciles current active seats. (Moved logic here from usage to enforce seat limits)
   */
  async getActiveSeatCount(organizationId: string): Promise<number> {
    const membersCount = await db.organization_memberships
      .where({ organizationId })
      .filter((m: any) => m.status === 'active' || m.status === 'invited')
      .count();
      
    const invitesCount = await db.organization_invitations
      .where({ organizationId })
      .filter((i: any) => i.status === 'pending' && i.expiresAt > Date.now())
      .count();
      
    return membersCount + invitesCount;
  },

  async assertSeatAvailable(organizationId: string): Promise<void> {
    const org = await db.organizations.get(organizationId);
    if (!org) throw new Error('Organization not found');
    
    if (org.seatLimit === undefined) return; // unlimited
    
    const count = await this.getActiveSeatCount(organizationId);
    if (count >= org.seatLimit) {
      throw new Error(`Seat limit of ${org.seatLimit} reached.`);
    }
  },

  async assertOrganizationPlanActive(organizationId: string): Promise<void> {
    const org = await db.organizations.get(organizationId);
    if (!org) throw new Error('Organization not found');

    if (org.status === 'suspended') {
      throw new Error('Organization is suspended');
    }

    if (org.provisioningStatus !== 'ready') {
      throw new Error('Organization provisioning is incomplete or failed');
    }

    if (['past_due', 'cancelled', 'suspended'].includes(org.billingState)) {
      throw new Error('Organization billing state is invalid for this operation');
    }
  },

};
