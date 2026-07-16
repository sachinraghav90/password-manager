import { db } from '../client';
import { AuditEvent } from '../schema';

export const auditService = {
  /**
   * Logs an audit event to the database.
   * Can be passed a dexie transaction explicitly if being called from within a transaction.
   */
  async logEvent(
    event: Omit<AuditEvent, 'id' | 'createdAt'>,
    transaction?: any
  ): Promise<void> {
    const auditRecord: AuditEvent = {
      id: crypto.randomUUID(),
      ...event,
      createdAt: Date.now()
    };

    if (transaction) {
      await transaction.table('audit_events').add(auditRecord);
    } else {
      await db.audit_events.add(auditRecord);
    }
  },

  async getOrganizationEvents(organizationId: string): Promise<AuditEvent[]> {
    return await db.audit_events
      .where('organizationId')
      .equals(organizationId)
      .sortBy('createdAt');
  }
};
