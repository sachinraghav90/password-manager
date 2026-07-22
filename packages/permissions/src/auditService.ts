import { db } from '@vaultguard/db-local';
import { AuditEvent } from '@vaultguard/models';

export const auditService = {
  /**
   * Logs an audit event to the database.
   * Can be passed a dexie transaction explicitly if being called from within a transaction.
   */
  async logEvent(
    eventOrOrgId: Omit<AuditEvent, 'id' | 'createdAt'> | string,
    actorUserIdOrTransaction?: any,
    action?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    let event: Omit<AuditEvent, 'id' | 'createdAt'>;
    let transaction: any;

    if (typeof eventOrOrgId === 'string') {
      const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
      
      let targetType = undefined;
      let targetId = undefined;
      if (details && typeof details === 'object' && 'type' in details && 'id' in details) {
        targetType = details.type;
        targetId = details.id;
      }
      
      event = {
        organizationId: eventOrOrgId,
        actorUserId: actorUserIdOrTransaction as string,
        eventType: action as string,
        targetType,
        targetId,
        metadata: {
          details: detailsStr,
          ...(ipAddress && { ipAddress }),
          ...(userAgent && { userAgent })
        }
      };
    } else {
      event = eventOrOrgId as Omit<AuditEvent, 'id' | 'createdAt'>;
      transaction = actorUserIdOrTransaction;
    }

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
