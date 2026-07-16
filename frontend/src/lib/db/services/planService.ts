import { db } from '../client';
import { Plan } from '../schema';

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
